-- 총 금액이 100,000원 미만인 주문의 배송비를 3,500원으로 업데이트
UPDATE orders
SET shipping_fee = 3500
WHERE total_price < 100000 
AND shipping_fee = 0;

-- 총 금액이 100,000원 이상인 주문의 배송비를 0원으로 업데이트
UPDATE orders
SET shipping_fee = 0
WHERE total_price >= 100000;

-- 업데이트된 주문 확인
SELECT id, customer_name, total_price, shipping_fee
FROM orders
ORDER BY order_date DESC
LIMIT 10;