-- 016: 발주 신청 시 품목별 비고(remarks) 저장
-- purchase_order_items.remarks 컬럼은 이미 존재(010). place_purchase_order 가 p_items 의 remarks를
-- 받아 저장하도록만 보강. 로직(소유권·재고 검증·단가)은 013과 동일.
-- 적용 순서: … 013 → 014 → 015 → 016

create or replace function place_purchase_order(p_items jsonb, p_note text default null, p_buyer uuid default null)
returns uuid language plpgsql security definer as $$
declare v_buyer uuid; v_po uuid; r record; v_price int; v_total int := 0; begin
  v_buyer := coalesce(current_buyer_id(), case when is_admin() then p_buyer end);
  if v_buyer is null then raise exception '발주처 컨텍스트가 없습니다'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception '발주 항목이 비어 있습니다'; end if;

  insert into purchase_orders(po_no, buyer_id, status, note)
    values (next_po_no(), v_buyer, 'requested', p_note) returning id into v_po;

  for r in select * from jsonb_to_recordset(p_items) as x(inventory_id uuid, quantity int, remarks text) loop
    if r.quantity is null or r.quantity <= 0 then raise exception '수량이 올바르지 않습니다'; end if;
    -- 이 변형이 해당 발주처에 배정된 제품인지 확인 (M:N 소유권 검증)
    perform 1 from product_inventory pi join products p on p.id = pi.product_id
      where pi.id = r.inventory_id
        and (is_admin() or exists (
              select 1 from buyer_products bp where bp.product_id = p.id and bp.buyer_id = v_buyer));
    if not found then raise exception '접근할 수 없는 변형입니다 (%)', r.inventory_id; end if;
    if r.quantity > (select stock_qty from product_inventory where id = r.inventory_id) then
      raise exception '신청 수량이 현재 재고를 초과합니다 (%)', r.inventory_id; end if;

    select coalesce(nullif(p.wholesale_price, 0), p.default_price, 0) into v_price
      from product_inventory pi join products p on p.id = pi.product_id where pi.id = r.inventory_id;
    insert into purchase_order_items(po_id, inventory_id, product_id, product_name, size, color, quantity, unit_price, remarks)
      select v_po, pi.id, pi.product_id, p.name, pi.size, pi.color, r.quantity, v_price, nullif(btrim(coalesce(r.remarks, '')), '')
      from product_inventory pi join products p on p.id = pi.product_id where pi.id = r.inventory_id;
    v_total := v_total + v_price * r.quantity;
  end loop;

  update purchase_orders set total_price = v_total where id = v_po;
  return v_po;
end $$;
