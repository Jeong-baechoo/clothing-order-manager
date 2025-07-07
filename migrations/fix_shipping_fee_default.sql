-- 배송비 기본값을 0으로 변경 (자동 계산 로직에 맞춤)
ALTER TABLE orders 
ALTER COLUMN shipping_fee SET DEFAULT 0;

-- 기존 주문들의 배송비 수정 (총 금액 기준)
UPDATE orders
SET shipping_fee = CASE 
  WHEN total_price < 100000 THEN 3500
  ELSE 0
END
WHERE shipping_fee IS NULL OR shipping_fee != CASE 
  WHEN total_price < 100000 THEN 3500
  ELSE 0
END;