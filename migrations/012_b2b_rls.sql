-- 012: B2B 발주 모듈 — RLS & 권한
-- spec: specs/001-b2b-order-module/  (적용 순서 010 → 011 → 012)
-- ⚠️ DRAFT — RLS를 켜는 순간 익명(anon) 접근이 막힌다.
--    반드시 Auth(관리자 + 발주처 로그인) 도입과 "같은 적용 단위"로 실행할 것. (tasks T2.5)

-- RPC 실행 권한 (로그인 사용자만)
grant execute on function get_my_catalog() to authenticated;
grant execute on function place_purchase_order(jsonb, text, uuid) to authenticated;
grant execute on function confirm_purchase_order(uuid) to authenticated;
grant execute on function advance_purchase_order(uuid, text) to authenticated;
grant execute on function cancel_purchase_order(uuid) to authenticated;

-- buyers: 관리자 전체, 발주처는 자기 행만 조회
alter table buyers enable row level security;
create policy buyers_admin on buyers for all to authenticated
  using (is_admin()) with check (is_admin());
create policy buyers_self_read on buyers for select to authenticated
  using (id = current_buyer_id());

-- product_inventory: 관리자 전체, 발주처는 자기 배정 제품의 재고만 조회 (US-9, FR-10)
alter table product_inventory enable row level security;
create policy inv_admin on product_inventory for all to authenticated
  using (is_admin()) with check (is_admin());
create policy inv_buyer_read on product_inventory for select to authenticated
  using (exists (
    select 1 from products p
    where p.id = product_inventory.product_id and p.buyer_id = current_buyer_id()
  ));

-- purchase_orders: 관리자 전체, 발주처는 자기 발주만 조회 (생성은 RPC로만)
alter table purchase_orders enable row level security;
create policy po_admin on purchase_orders for all to authenticated
  using (is_admin()) with check (is_admin());
create policy po_buyer_read on purchase_orders for select to authenticated
  using (buyer_id = current_buyer_id());

-- purchase_order_items: 위와 동일 기준 (부모 발주 소유권)
alter table purchase_order_items enable row level security;
create policy poi_admin on purchase_order_items for all to authenticated
  using (is_admin()) with check (is_admin());
create policy poi_buyer_read on purchase_order_items for select to authenticated
  using (exists (
    select 1 from purchase_orders o
    where o.id = purchase_order_items.po_id and o.buyer_id = current_buyer_id()
  ));

-- ── products 테이블 RLS 관련 결정 (후속) ──
-- 발주처 카탈로그는 get_my_catalog()(security definer)로 제공하므로, 발주처가 products를
-- 직접 select 할 필요는 없다. 다만 현재 고객주문 흐름이 anon으로 products를 직접 읽으므로,
-- products에 RLS를 켜는 것은 "관리자 인증으로 기존 화면 이전"이 끝난 뒤(별도 단계)에 한다.
-- 그 전까지 발주처가 anon이 아닌 authenticated 역할로만 접속하도록 보장하고,
-- 발주처 포털은 절대 products를 직접 select 하지 않는다(get_my_catalog만 사용).
