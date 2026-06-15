-- 015: 발주처 카탈로그 정렬을 색상 → 사이즈 순으로 통일
-- 배경: CLAUDE.md 규칙(제품명 → 색상 → 사이즈)과 달리 get_my_catalog 가 사이즈를 색상보다 먼저
--       정렬(013)하고 있었음. 색상 1차 · 사이즈 2차로 맞춘다. (포털은 클라이언트에서도 색상 정렬)
-- 적용 순서: … 013 → 014 → 015. 로직 변경 없이 order by 만 교체(안전).

create or replace function get_my_catalog()
returns table (product_id text, product_name text, default_price int, wholesale_price int,
               inventory_id uuid, size text, color text, stock_qty int, remarks text)
language sql security definer stable as $$
  select p.id, p.name, p.default_price, p.wholesale_price,
         pi.id, pi.size, pi.color, pi.stock_qty, pi.remarks
  from products p
  join buyer_products bp on bp.product_id = p.id and bp.buyer_id = current_buyer_id()
  join product_inventory pi on pi.product_id = p.id
  order by p.name, pi.color, pi.size
$$;
