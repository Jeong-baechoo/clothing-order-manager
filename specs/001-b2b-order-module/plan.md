# B2B 발주 모듈 — 기술 설계 (Plan)

- 상태: Draft v1
- 작성일: 2026-06-13
- 관련 문서: [spec.md](./spec.md) (요구사항), [tasks.md](./tasks.md) (작업 분해)

> 이 문서는 **어떻게(How)**를 다룬다. 요구사항 ID(FR-n, US-n)는 spec.md 참조.

---

## 1. 아키텍처 개요

- 스택: Next.js 15 (App Router) + Supabase(PostgreSQL). 클라이언트 anon key 직결, 별도 백엔드 없음.
- **별도 모듈**: 기존 `app/orders`, `app/companies`(제품관리), 고객주문/프린팅 코드는 변경 최소화. 발주 기능은 새 라우트·새 데이터레이어 함수로 추가.
- **신뢰 경계 = RLS**: anon key가 브라우저에 노출되므로, 발주처 격리는 반드시 DB의 Row Level Security로 강제한다. UI 가드는 보조일 뿐이다.

```
[관리자 영역 - 기존]                     [발주처 포털 - 신규 /portal]
 /orders  (고객주문, 변경X)               로그인(발주처 계정)
 /companies (제품/공급처/카테고리)         └ 내 카탈로그(배정 제품 + 재고)
   └ + 재고 탭 (신규)                       └ 발주 신청
 /b2b/buyers   (발주처·계정 관리, 신규)     └ 내 발주 내역
 /b2b/orders   (들어온 발주 접수, 신규)
        │                                        │
        └──────────── Supabase (RLS로 분리) ─────┘
```

## 2. 데이터 모델

### 2.1 신규/변경 DDL

```sql
-- companies(공급처)는 변경하지 않는다. 발주처는 별도 엔티티.

-- 발주처
create table buyers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  login_email   text unique not null,        -- 관리자가 발급
  auth_user_id  uuid unique,                  -- references auth.users(id); 발주처당 1계정 (FR-2)
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- 제품 → 발주처 전용 배정 (FR-3). 전용이라 단일 FK로 충분.
alter table products add column buyer_id uuid references buyers(id) on delete set null;
create index idx_products_buyer_id on products(buyer_id);
-- buyer_id null = 기존 고객주문용 / 값 있음 = 그 발주처 전용 발주상품

-- 변형(사이즈·색상)별 재고 (FR-4)
create table product_inventory (
  id          uuid primary key default gen_random_uuid(),
  product_id  text not null references products(id) on delete cascade,
  size        text not null,
  color       text not null,
  stock_qty   integer not null default 0 check (stock_qty >= 0),
  remarks     text,
  updated_at  timestamptz not null default now(),
  unique (product_id, size, color)
);
create index idx_inventory_product on product_inventory(product_id);

-- 발주 헤더 (FR-5)
create table purchase_orders (
  id          uuid primary key default gen_random_uuid(),
  po_no       text unique,                    -- 표시용 번호 PO-YYMM-NNN (서버 채번)
  buyer_id    uuid not null references buyers(id),
  status      text not null default 'requested'
                check (status in ('requested','confirmed','shipped','done','canceled')),
  total_price integer not null default 0,
  note        text,
  created_at  timestamptz not null default now(),
  confirmed_at timestamptz
);
create index idx_po_buyer on purchase_orders(buyer_id, created_at desc);

-- 발주 라인 (FR-6). 완성품이라 프린팅 필드 없음.
create table purchase_order_items (
  id            uuid primary key default gen_random_uuid(),
  po_id         uuid not null references purchase_orders(id) on delete cascade,
  inventory_id  uuid references product_inventory(id),  -- 어느 변형
  product_id    text,                                   -- 스냅샷(참조 보존)
  product_name  text,                                   -- 발주 시점 제품명 스냅샷
  size          text,
  color         text,
  quantity      integer not null check (quantity > 0),
  unit_price    integer not null,                       -- 발주 시점 도매가 스냅샷
  remarks       text
);
create index idx_poi_po on purchase_order_items(po_id);
```

### 2.2 ERD (텍스트)

```
buyers 1───N products(.buyer_id)           products 1───N product_inventory
buyers 1───N purchase_orders 1───N purchase_order_items ──1 product_inventory
companies(공급처) ──N products(.company_id)   ← 기존, 변경 없음 (어디서 사오나)
```
제품은 `company_id`(어디서 사오나·기존)와 `buyer_id`(누구한테 파나·신규) 두 축을 직교로 가진다.

### 2.3 가격/재고 스냅샷 원칙
- 발주 라인은 발주 시점의 `product_name`, `unit_price`(도매가), `size`/`color`를 스냅샷한다 → 이후 제품 개명·도매가 변경·배정 해제가 과거 발주에 소급되지 않음.

## 3. 핵심 로직 — RPC (PL/pgSQL)

> 다단계 쓰기(검증+차감+생성)는 클라이언트에서 나눠 하지 않고 **RPC 단일 트랜잭션**으로 처리한다. (기존 updateOrder 비원자성·주문번호 race 교훈 반영)

### 3.1 발주 번호 채번
```sql
create table po_counters (period_key text primary key, last_seq int not null default 0);

create function next_po_no() returns text language plpgsql security definer as $$
declare pk text; n int; begin
  pk := to_char(now() at time zone 'Asia/Seoul', 'YYMM');
  insert into po_counters(period_key, last_seq) values (pk, 1)
    on conflict (period_key) do update set last_seq = po_counters.last_seq + 1
    returning last_seq into n;
  return 'PO-' || pk || '-' || lpad(n::text, 3, '0');
end $$;
```

### 3.2 발주 신청 (차감 없음) — FR-6 전제
```sql
-- p_items: [{ inventory_id, quantity }]
create function place_purchase_order(p_buyer uuid, p_items jsonb, p_note text default null)
returns uuid language plpgsql security definer as $$
declare v_po uuid; r record; v_price int; v_total int := 0; begin
  insert into purchase_orders(po_no, buyer_id, status, note)
    values (next_po_no(), p_buyer, 'requested', p_note) returning id into v_po;

  for r in select * from jsonb_to_recordset(p_items) as x(inventory_id uuid, quantity int) loop
    -- 신청 시 소프트 체크: 현재고 초과 신청 차단 (예약/차감은 안 함)
    if r.quantity > (select stock_qty from product_inventory where id = r.inventory_id) then
      raise exception '신청 수량이 현재 재고를 초과합니다 (inventory %)', r.inventory_id;
    end if;
    select default_or_wholesale_price(pi.product_id) into v_price  -- 도매가 우선
      from product_inventory pi where pi.id = r.inventory_id;
    insert into purchase_order_items(po_id, inventory_id, product_id, product_name, size, color, quantity, unit_price)
      select v_po, pi.id, pi.product_id, p.name, pi.size, pi.color, r.quantity, v_price
      from product_inventory pi join products p on p.id = pi.product_id where pi.id = r.inventory_id;
    v_total := v_total + v_price * r.quantity;
  end loop;

  update purchase_orders set total_price = v_total where id = v_po;
  return v_po;
end $$;
-- default_or_wholesale_price: products.wholesale_price>0 면 그것, 아니면 default_price (헬퍼)
```

### 3.3 발주 접수(확정) = 원자적 재고 차감 — FR-7, FR-8
```sql
create function confirm_purchase_order(p_po uuid)
returns void language plpgsql security definer as $$
declare r record; begin
  if (select status from purchase_orders where id = p_po) <> 'requested' then
    raise exception '신청 상태의 발주만 접수할 수 있습니다';
  end if;
  -- 1) 전 라인 재검증 (하나라도 부족하면 예외 → 전체 롤백, 부분차감 없음)
  for r in select inventory_id, quantity from purchase_order_items where po_id = p_po loop
    if (select stock_qty from product_inventory where id = r.inventory_id) < r.quantity then
      raise exception '재고 부족으로 접수 불가 (inventory %)', r.inventory_id;
    end if;
  end loop;
  -- 2) 차감 + 상태 확정 (단일 트랜잭션)
  for r in select inventory_id, quantity from purchase_order_items where po_id = p_po loop
    update product_inventory set stock_qty = stock_qty - r.quantity, updated_at = now()
      where id = r.inventory_id;
  end loop;
  update purchase_orders set status = 'confirmed', confirmed_at = now() where id = p_po;
end $$;
```

### 3.4 상태 진행 / 취소 + 복원 — FR-9
```sql
create function advance_purchase_order(p_po uuid, p_to text)
returns void language plpgsql security definer as $$
declare cur text; begin
  select status into cur from purchase_orders where id = p_po;
  -- 허용 전이: confirmed→shipped→done
  if (cur,p_to) not in (('confirmed','shipped'),('shipped','done')) then
    raise exception '허용되지 않는 상태 전이: % → %', cur, p_to; end if;
  update purchase_orders set status = p_to where id = p_po;
end $$;

create function cancel_purchase_order(p_po uuid)
returns void language plpgsql security definer as $$
declare cur text; r record; begin
  select status into cur from purchase_orders where id = p_po;
  if cur in ('confirmed','shipped') then       -- 이미 차감된 경우만 복원
    for r in select inventory_id, quantity from purchase_order_items where po_id = p_po loop
      update product_inventory set stock_qty = stock_qty + r.quantity where id = r.inventory_id;
    end loop;
  end if;
  update purchase_orders set status = 'canceled' where id = p_po;
end $$;
```

## 4. 인증 & RLS

### 4.1 인증 모델
- Supabase Auth 도입. **관리자 계정**과 **발주처 계정**을 구분.
- 발주처 로그인 시 JWT `app_metadata`에 `buyer_id`(와 `role:'buyer'`)를, 관리자는 `role:'admin'`을 심는다(Auth Hook / DB 트리거로 buyers.auth_user_id 매핑).

```sql
create function current_buyer_id() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims',true)::json->'app_metadata'->>'buyer_id','')::uuid $$;
create function is_admin() returns boolean language sql stable as $$
  select coalesce(current_setting('request.jwt.claims',true)::json->'app_metadata'->>'role','') = 'admin' $$;
```

### 4.2 RLS 정책 (FR-10, FR-11, US-9)
```sql
alter table buyers enable row level security;
alter table product_inventory enable row level security;
alter table purchase_orders enable row level security;
alter table purchase_order_items enable row level security;
-- products 는 기존 고객주문 흐름이 anon으로 읽으므로 RLS 적용은 신중히(아래 5.4 참조)

-- 발주처: 자기 제품 재고만 / 관리자: 전체
create policy inv_read on product_inventory for select to authenticated using (
  is_admin() or exists(
    select 1 from products p where p.id = product_inventory.product_id
      and p.buyer_id = current_buyer_id()));
create policy inv_admin_write on product_inventory for all to authenticated
  using (is_admin()) with check (is_admin());

-- 발주: 발주처는 자기 것 조회/생성 / 관리자 전체
create policy po_buyer on purchase_orders for select to authenticated
  using (is_admin() or buyer_id = current_buyer_id());
create policy po_admin on purchase_orders for all to authenticated
  using (is_admin()) with check (is_admin());
-- 발주 생성은 RPC(security definer)로만 → 발주처 직접 insert 정책은 두지 않음(권장)
```
> 발주 생성/접수/취소는 모두 `security definer` RPC로만 수행하고, RPC 내부에서 `current_buyer_id()`로 소유권을 검증한다. 직접 테이블 insert/update 정책은 최소화한다.

## 5. 화면 / 라우팅

| 영역 | 라우트 | 내용 | 신규/변경 |
|------|--------|------|-----------|
| 관리자 | `/companies` 제품관리 | 제품에 **발주처 배정** + **재고(변형) 탭** | 기존 화면에 추가 |
| 관리자 | `/b2b/buyers` | 발주처 등록·계정 발급·활성토글 | 신규 |
| 관리자 | `/b2b/orders` | 들어온 발주 목록 → 접수/출고/완료/취소 | 신규 |
| 발주처 | `/portal` | 로그인 후 내 카탈로그(재고) → 발주 → 내 발주내역 | 신규 |
| 공통 | 미들웨어/레이아웃 | 역할별 라우트 가드(관리자/발주처/미로그인) | 신규 |

## 6. 기존 코드 재사용 맵
- `app/lib/supabase.js`: Supabase 클라이언트 재사용. 발주용 함수는 새 파일 `app/lib/b2b.js`(또는 ts)로 분리.
- 제품/카테고리 CRUD(`getProducts` 647-682 등) 재사용. `addProduct`에 `buyer_id` 옵션만 추가.
- 사이즈 정렬 로직(`supabase.js:71` sizeOrder) 재고 변형 정렬에 재사용.
- 타입: `app/models/orderTypes.ts`에 Buyer/Inventory/PurchaseOrder 타입 추가(기존 타입 변경 없음).

## 7. 마이그레이션 전략 (게이트)
1. 모든 DDL/RPC/RLS는 `migrations/010_b2b_*.sql`로 코드화하여 리포에 커밋.
2. **라이브 적용은 사용자 명시 동의 후** Supabase SQL Editor에서 순서대로 실행(메모리 원칙 준수).
3. RLS를 켜는 순간 익명 접근이 막히므로, **Auth 도입(관리자·발주처 로그인)과 RLS 활성화를 같은 적용 단위로** 묶는다.
4. 기존 `products`/`orders`에는 파괴적 변경 없음(컬럼 추가 `buyer_id`만, nullable).

## 8. 리스크 & 대응
| 리스크 | 대응 |
|--------|------|
| RLS만 켜고 인증 없으면 앱 먹통 | Auth + RLS 동시 적용 |
| 동시 접수 시 초과판매 | 접수 RPC 단일 트랜잭션 재검증+차감 |
| products에 RLS 적용 시 기존 고객주문 화면 깨짐 | products는 RLS 보류 또는 admin/anon 허용 + buyer 전용 뷰로 분리(5.4 후속 결정) |
| 발주처 계정↔buyer 매핑 누락 | buyers.auth_user_id 유니크 + Auth Hook 검증 |
