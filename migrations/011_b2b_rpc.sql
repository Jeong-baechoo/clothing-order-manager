-- 011: B2B 발주 모듈 — 비즈니스 RPC (단일 트랜잭션)
-- spec: specs/001-b2b-order-module/  (적용 순서 010 → 011 → 012)
-- ⚠️ DRAFT — 라이브 적용은 사용자 동의 후.
-- 주의: 모든 함수는 security definer(=RLS 우회)이므로 내부에서 권한을 직접 검증한다.

-- 발주번호 채번 (PO-YYMM-NNN, 월별 시퀀스)
create or replace function next_po_no() returns text language plpgsql security definer as $$
declare pk text; n int; begin
  pk := to_char(now() at time zone 'Asia/Seoul', 'YYMM');
  insert into po_counters(period_key, last_seq) values (pk, 1)
    on conflict (period_key) do update set last_seq = po_counters.last_seq + 1
    returning last_seq into n;
  return 'PO-' || pk || '-' || lpad(n::text, 3, '0');
end $$;

-- 발주처 카탈로그: 자기 배정 제품 + 변형 재고 (products 직접 노출 없이 함수로 제공)
create or replace function get_my_catalog()
returns table (product_id text, product_name text, default_price int, wholesale_price int,
               inventory_id uuid, size text, color text, stock_qty int, remarks text)
language sql security definer stable as $$
  select p.id, p.name, p.default_price, p.wholesale_price,
         pi.id, pi.size, pi.color, pi.stock_qty, pi.remarks
  from products p
  join product_inventory pi on pi.product_id = p.id
  where p.buyer_id = current_buyer_id()
  order by p.name, pi.size, pi.color
$$;

-- 발주 신청 (재고 차감 X). buyer는 자기 것만, admin은 p_buyer로 대행 가능. (US-5, FR-6)
-- p_items: [{ "inventory_id": uuid, "quantity": int }]
create or replace function place_purchase_order(p_items jsonb, p_note text default null, p_buyer uuid default null)
returns uuid language plpgsql security definer as $$
declare v_buyer uuid; v_po uuid; r record; v_price int; v_total int := 0; begin
  v_buyer := coalesce(current_buyer_id(), case when is_admin() then p_buyer end);
  if v_buyer is null then raise exception '발주처 컨텍스트가 없습니다'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception '발주 항목이 비어 있습니다'; end if;

  insert into purchase_orders(po_no, buyer_id, status, note)
    values (next_po_no(), v_buyer, 'requested', p_note) returning id into v_po;

  for r in select * from jsonb_to_recordset(p_items) as x(inventory_id uuid, quantity int) loop
    if r.quantity is null or r.quantity <= 0 then raise exception '수량이 올바르지 않습니다'; end if;
    -- 이 변형이 해당 발주처의 제품인지 확인 (소유권 검증)
    perform 1 from product_inventory pi join products p on p.id = pi.product_id
      where pi.id = r.inventory_id and (is_admin() or p.buyer_id = v_buyer);
    if not found then raise exception '접근할 수 없는 변형입니다 (%)', r.inventory_id; end if;
    -- 신청 시 소프트 체크: 현재고 초과 신청 차단 (예약/차감은 하지 않음)
    if r.quantity > (select stock_qty from product_inventory where id = r.inventory_id) then
      raise exception '신청 수량이 현재 재고를 초과합니다 (%)', r.inventory_id; end if;

    select coalesce(nullif(p.wholesale_price, 0), p.default_price, 0) into v_price
      from product_inventory pi join products p on p.id = pi.product_id where pi.id = r.inventory_id;
    insert into purchase_order_items(po_id, inventory_id, product_id, product_name, size, color, quantity, unit_price)
      select v_po, pi.id, pi.product_id, p.name, pi.size, pi.color, r.quantity, v_price
      from product_inventory pi join products p on p.id = pi.product_id where pi.id = r.inventory_id;
    v_total := v_total + v_price * r.quantity;
  end loop;

  update purchase_orders set total_price = v_total where id = v_po;
  return v_po;
end $$;

-- 발주 접수(확정) = 원자적 재고 검증 + 차감. 관리자 전용. (US-6, FR-7, FR-8)
create or replace function confirm_purchase_order(p_po uuid)
returns void language plpgsql security definer as $$
declare r record; begin
  if not is_admin() then raise exception '권한이 없습니다 (관리자 전용)'; end if;
  if (select status from purchase_orders where id = p_po) is distinct from 'requested' then
    raise exception '신청 상태의 발주만 접수할 수 있습니다'; end if;
  -- 1) 전 라인 재검증 (하나라도 부족하면 예외 → 전체 롤백, 부분 차감 없음)
  for r in select inventory_id, quantity from purchase_order_items where po_id = p_po loop
    if (select stock_qty from product_inventory where id = r.inventory_id) < r.quantity then
      raise exception '재고 부족으로 접수 불가 (%)', r.inventory_id; end if;
  end loop;
  -- 2) 차감 + 상태 확정 (단일 트랜잭션)
  for r in select inventory_id, quantity from purchase_order_items where po_id = p_po loop
    update product_inventory set stock_qty = stock_qty - r.quantity, updated_at = now()
      where id = r.inventory_id;
  end loop;
  update purchase_orders set status = 'confirmed', confirmed_at = now() where id = p_po;
end $$;

-- 상태 진행 confirmed → shipped → done. 관리자 전용. (US-7)
create or replace function advance_purchase_order(p_po uuid, p_to text)
returns void language plpgsql security definer as $$
declare cur text; begin
  if not is_admin() then raise exception '권한이 없습니다 (관리자 전용)'; end if;
  select status into cur from purchase_orders where id = p_po;
  if (cur, p_to) not in (('confirmed','shipped'), ('shipped','done')) then
    raise exception '허용되지 않는 상태 전이: % → %', cur, p_to; end if;
  update purchase_orders set status = p_to where id = p_po;
end $$;

-- 취소 + (이미 차감됐던 경우) 재고 복원. 관리자 전용. (US-8, FR-9)
create or replace function cancel_purchase_order(p_po uuid)
returns void language plpgsql security definer as $$
declare cur text; r record; begin
  if not is_admin() then raise exception '권한이 없습니다 (관리자 전용)'; end if;
  select status into cur from purchase_orders where id = p_po;
  if cur = 'canceled' then return; end if;
  if cur in ('confirmed','shipped') then            -- 차감됐던 단계만 복원
    for r in select inventory_id, quantity from purchase_order_items where po_id = p_po loop
      update product_inventory set stock_qty = stock_qty + r.quantity, updated_at = now()
        where id = r.inventory_id;
    end loop;
  end if;
  update purchase_orders set status = 'canceled' where id = p_po;
end $$;
