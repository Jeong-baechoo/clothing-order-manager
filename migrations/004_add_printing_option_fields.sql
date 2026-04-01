-- 새 프린팅 옵션 필드 추가 (기존 컬럼 유지)
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS printing_option TEXT DEFAULT NULL;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS small_print_count INTEGER DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS medium_print_count INTEGER DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS large_print_count INTEGER DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS extra_large_print_count INTEGER DEFAULT 0;