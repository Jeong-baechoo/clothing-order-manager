-- orders 테이블에 shipping_fee 필드 추가
ALTER TABLE orders 
ADD COLUMN shipping_fee INTEGER DEFAULT 3500;

-- 기존 배송비 데이터 마이그레이션
-- 1. 현재 배송비로 저장된 order_items를 찾아 orders.shipping_fee로 이동
UPDATE orders o
SET shipping_fee = COALESCE(
  (SELECT SUM(oi.price) 
   FROM order_items oi 
   WHERE oi.order_id = o.id 
   AND oi.product_id = 'SHIPPING'),
  0
)
WHERE EXISTS (
  SELECT 1 
  FROM order_items oi 
  WHERE oi.order_id = o.id 
  AND oi.product_id = 'SHIPPING'
);

-- 2. 마이그레이션 완료 후 SHIPPING 항목 삭제
DELETE FROM order_items 
WHERE product_id = 'SHIPPING';

-- 3. products 테이블에서 배송비 제품 삭제 (선택사항)
DELETE FROM products 
WHERE id = 'SHIPPING';

-- 4. View 생성: 주문 요약 정보 (선택사항)
CREATE OR REPLACE VIEW order_summary AS
SELECT 
  o.*,
  COALESCE(SUM(oi.quantity * oi.price), 0) as subtotal,
  o.shipping_fee,
  COALESCE(SUM(oi.quantity * oi.price), 0) + o.shipping_fee as calculated_total
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.customer_name, o.phone, o.address, o.status, 
         o.order_date, o.payment_method, o.total_price, o.created_at, 
         o.updated_at, o.shipping_fee;

-- 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_orders_shipping_fee ON orders(shipping_fee);