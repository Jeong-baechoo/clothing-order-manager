-- 020: products.code 컬럼 추가 (사용자 편집용 제품 코드)
-- 배경: 지금까지 화면의 "제품 코드"는 products.id(기본키) 그 자체였다.
--       id는 order_items / buyer_products / product_inventory 가 FK로 참조하므로 바꿀 수 없다.
-- 방침(A안): 내부 식별자(id, PK)는 그대로 두고, 표시·수정 가능한 code 컬럼을 분리한다.

-- 1) code 컬럼 추가 (표시·편집용, null 허용)
alter table products add column if not exists code text;

-- 2) 기존 제품 백필: code = id (기존 화면 표시값과 동일하게 유지 → 연속성)
update products set code = id where code is null;

-- 3) 중복 코드 입력 방지 (null 은 예외 허용)
create unique index if not exists products_code_unique on products (code) where code is not null;
