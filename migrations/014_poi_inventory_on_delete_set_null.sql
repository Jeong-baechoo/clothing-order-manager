-- 014: 발주 라인의 변형 참조를 on delete set null 로 완화
-- spec: specs/001-b2b-order-module / 002-b2b-shared-catalog
-- 배경: purchase_order_items 는 제품명·사이즈·색상·수량·단가를 스냅샷으로 보존(010:55)하므로
--       발주 이력은 product_inventory 행이 없어도 온전하다. 따라서 발주된 적 있는 구형 변형도
--       삭제할 수 있도록 FK를 set null 로 바꾼다. (삭제 시 inventory_id 만 null, 스냅샷은 유지)
-- 적용 순서: 010 → 011 → 012 → 013 → 014

alter table purchase_order_items
  drop constraint if exists purchase_order_items_inventory_id_fkey,
  add  constraint purchase_order_items_inventory_id_fkey
    foreign key (inventory_id) references product_inventory(id) on delete set null;
