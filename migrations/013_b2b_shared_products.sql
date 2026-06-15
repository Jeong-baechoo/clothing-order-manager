-- 013: B2B 제품 다중 발주처 배정 (M:N) + 공유 재고
-- spec: specs/002-b2b-shared-catalog/
-- ⚠️ DRAFT — 라이브 적용은 사용자 명시 동의 후. 적용 순서: (기존) 010 → 011 → 012 → 013
-- 재고는 공유 풀: product_inventory 변경 없음. 배정만 M:N으로 확장.
-- 롤백: buyer_products 는 drop, get_my_catalog/place_purchase_order 는 011 버전으로 복원하면 구모델 복귀
--       (products.buyer_id 칼럼을 보존하므로 데이터 손실 없음).

-- =====================================================================
-- 1) M:N 조인 테이블
-- =====================================================================
create table if not exists buyer_products (
  buyer_id   uuid not null references buyers(id) on delete cascade,
  product_id text not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (buyer_id, product_id)
);
create index if not exists idx_buyer_products_product on buyer_products(product_id);
create index if not exists idx_buyer_products_buyer   on buyer_products(buyer_id);

-- =====================================================================
-- 2) 기존 단일 배정(products.buyer_id) → 조인테이블 이관 (1회, 멱등)
-- =====================================================================
insert into buyer_products (buyer_id, product_id)
  select buyer_id, id from products where buyer_id is not null
  on conflict do nothing;
-- 이후 products.buyer_id 는 신규 로직에서 사용하지 않음 (호환 위해 잔존, 후속 마이그레이션에서 drop 가능)

-- =====================================================================
-- 3) 카탈로그 RPC — buyer_products 기준 (공유 재고 그대로)
-- =====================================================================
create or replace function get_my_catalog()
returns table (product_id text, product_name text, default_price int, wholesale_price int,
               inventory_id uuid, size text, color text, stock_qty int, remarks text)
language sql security definer stable as $$
  select p.id, p.name, p.default_price, p.wholesale_price,
         pi.id, pi.size, pi.color, pi.stock_qty, pi.remarks
  from products p
  join buyer_products bp on bp.product_id = p.id and bp.buyer_id = current_buyer_id()
  join product_inventory pi on pi.product_id = p.id
  order by p.name, pi.size, pi.color
$$;

-- =====================================================================
-- 4) 발주 신청 — 소유권 판정만 buyer_products 기준으로 변경 (나머지 011과 동일)
-- =====================================================================
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
    -- 이 변형이 해당 발주처에 배정된 제품인지 확인 (M:N 소유권 검증)
    perform 1 from product_inventory pi join products p on p.id = pi.product_id
      where pi.id = r.inventory_id
        and (is_admin() or exists (
              select 1 from buyer_products bp where bp.product_id = p.id and bp.buyer_id = v_buyer));
    if not found then raise exception '접근할 수 없는 변형입니다 (%)', r.inventory_id; end if;
    -- 신청 시 소프트 체크: 현재고 초과 신청 차단 (예약/차감은 하지 않음 — 공유 풀)
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

-- confirm / advance / cancel _purchase_order : 변경 없음 (공유 재고 — 011 그대로)

-- =====================================================================
-- 5) RLS — buyer_products (배정은 관리자만, 발주처는 자기 배정 읽기만)
-- =====================================================================
alter table buyer_products enable row level security;
grant select, insert, delete on buyer_products to authenticated;

drop policy if exists bp_admin_all  on buyer_products;
drop policy if exists bp_buyer_read on buyer_products;
create policy bp_admin_all  on buyer_products for all
  using (is_admin()) with check (is_admin());
create policy bp_buyer_read on buyer_products for select
  using (buyer_id = current_buyer_id());
