-- 010: B2B 발주 모듈 — 스키마 (테이블 + 인증 헬퍼)
-- spec: specs/001-b2b-order-module/
-- ⚠️ DRAFT — 라이브 적용은 사용자 명시 동의 후. RLS(012)는 Auth 도입과 같은 적용 단위로 실행할 것.
-- 적용 순서: 010 → 011 → 012

-- companies(공급처)는 변경하지 않는다. 발주처는 별도 엔티티.

-- 발주처 (FR-1, FR-2)
create table if not exists buyers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  login_email   text unique not null,                       -- 관리자가 발급
  auth_user_id  uuid unique references auth.users(id) on delete set null,  -- 발주처당 1계정
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- 제품 → 발주처 전용 배정 (FR-3). 전용이라 단일 FK로 충분.
alter table products add column if not exists buyer_id uuid references buyers(id) on delete set null;
create index if not exists idx_products_buyer_id on products(buyer_id);
-- buyer_id null = 기존 고객주문용 / 값 있음 = 그 발주처 전용 발주상품

-- 변형(사이즈·색상)별 재고 (FR-4)
create table if not exists product_inventory (
  id          uuid primary key default gen_random_uuid(),
  product_id  text not null references products(id) on delete cascade,
  size        text not null,
  color       text not null,
  stock_qty   integer not null default 0 check (stock_qty >= 0),
  remarks     text,
  updated_at  timestamptz not null default now(),
  unique (product_id, size, color)
);
create index if not exists idx_inventory_product on product_inventory(product_id);

-- 발주 헤더 (FR-5)
create table if not exists purchase_orders (
  id           uuid primary key default gen_random_uuid(),
  po_no        text unique,                                 -- PO-YYMM-NNN (서버 채번)
  buyer_id     uuid not null references buyers(id),
  status       text not null default 'requested'
                 check (status in ('requested','confirmed','shipped','done','canceled')),
  total_price  integer not null default 0,
  note         text,
  created_at   timestamptz not null default now(),
  confirmed_at timestamptz
);
create index if not exists idx_po_buyer on purchase_orders(buyer_id, created_at desc);

-- 발주 라인 (FR-6). 완성품이라 프린팅 필드 없음. 발주 시점 스냅샷 보존.
create table if not exists purchase_order_items (
  id            uuid primary key default gen_random_uuid(),
  po_id         uuid not null references purchase_orders(id) on delete cascade,
  inventory_id  uuid references product_inventory(id),
  product_id    text,
  product_name  text,
  size          text,
  color         text,
  quantity      integer not null check (quantity > 0),
  unit_price    integer not null,                           -- 도매가 스냅샷
  remarks       text
);
create index if not exists idx_poi_po on purchase_order_items(po_id);

-- 발주번호 채번 카운터 (월별)
create table if not exists po_counters (
  period_key text primary key,
  last_seq   int not null default 0
);

-- ── 인증 헬퍼 (RPC 011 / RLS 012 가 공용으로 사용) ──
-- 로그인한 발주처의 id (JWT app_metadata.buyer_id)
create or replace function current_buyer_id() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json
           ->'app_metadata'->>'buyer_id', '')::uuid
$$;

-- 관리자 여부 (JWT app_metadata.role = 'admin')
create or replace function is_admin() returns boolean language sql stable as $$
  select coalesce(current_setting('request.jwt.claims', true)::json
           ->'app_metadata'->>'role', '') = 'admin'
$$;
