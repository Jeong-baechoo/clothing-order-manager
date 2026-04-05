-- 복수 프린팅 설정을 JSON으로 저장하는 컬럼 추가
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS printing_configs TEXT DEFAULT NULL;
