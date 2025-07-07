-- 주문 항목 테이블에 비고 필드 추가
ALTER TABLE order_items
ADD COLUMN remarks TEXT DEFAULT '';

-- 기존 데이터에 대해 기본값 설정
UPDATE order_items
SET remarks = ''
WHERE remarks IS NULL;