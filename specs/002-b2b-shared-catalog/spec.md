# 002 — B2B 제품 다중 발주처 배정 (M:N) + 공유 재고

상태: **설계(DRAFT)** · 선행: `001-b2b-order-module`(010~012 적용 완료 전제)

## 배경 / 문제
현재 배정은 `products.buyer_id` **단일 FK** → 한 제품은 발주처 **1곳에만** 배정 가능.
같은 제품을 여러 발주처가 발주하려면 제품을 복제해야 하는데, 재고·수정·집계가 분산되어 부정확.

## 목표
- 한 제품을 **여러 발주처**에 배정 가능 (M:N)
- 재고는 **공유 풀**: 제품당 `product_inventory` 1세트. 어느 발주처가 발주하든 같은 재고에서 차감(선착순).
- 기존 단일 배정 데이터는 **무손실 이관**. 기존 고객주문 흐름(`buyer_id is null`)은 영향 없음.

## 비목표 (이번 범위 아님)
- 발주처별 재고 분리(allocation) — 필요해지면 별도 설계(`product_inventory`에 buyer 차원 추가).
- 발주처별 차등 단가 — 현행 `wholesale_price` 스냅샷 유지.

## 모델 변경
```
buyer_products (buyer_id, product_id)   -- 신규 조인테이블, PK 복합
products.buyer_id                        -- deprecated (이관 후 미사용, 호환 위해 잔존)
product_inventory                        -- 변경 없음 (공유 재고)
```

배정 의미:
- 제품에 `buyer_products` 행이 **하나도 없음** = 미배정(고객주문용)
- 행이 N개 = 그 N개 발주처가 해당 제품을 발주 가능

## 동작(RPC) 변경
- `get_my_catalog`: `products.buyer_id = me` → `buyer_products`로 조인
- `place_purchase_order` 소유권 판정: `p.buyer_id = me` → `exists(buyer_products bp where bp.product_id=p.id and bp.buyer_id=me)`
- `confirm/cancel/advance_purchase_order`: **변경 없음** (공유 재고라 product_inventory 직접 차감/복원 그대로 — 선착순은 confirm의 실시간 재검증으로 보장)

## 동시성 (공유 재고)
- 신청(request) 시점: 차감 없음, 현재고 초과만 소프트 차단
- 접수(confirm) 시점: 전 라인 실시간 재검증 후 원자적 차감 → **먼저 접수한 발주가 재고 확보**, 부족하면 두 번째 접수는 거부(전체 롤백)
- 이 의미가 "공유 풀"의 정확한 동작. (기존 011 로직 그대로 성립)

## 데이터레이어 변경 (app/lib/b2b.ts)
- 제거/대체: `setProductBuyer`, `assignProductsToBuyer`(단일 buyer_id 기반)
- 신규:
  - `getBuyerProductMap(): Record<productId, buyerId[]>` — 제품별 배정 발주처 목록
  - `addBuyerProducts(buyerId, productIds[])` — 조인행 삽입(upsert, on conflict do nothing)
  - `removeBuyerProducts(buyerId, productIds[])` — 조인행 삭제
- `getAdminProducts`: `buyerId`(단일) → 화면은 `getBuyerProductMap`으로 다중 배정 표시

## UI 변경 (app/b2b/inventory)
- 체크박스 의미: "선택 발주처에 배정" → **추가/삭제만** (다른 발주처에서 뺏지 않음 → **재배정 경고 제거**)
- "현재 배정" 컬럼: 단일 → **여러 발주처 배지**(선택 발주처 포함 여부 강조)
- 저장: diff → `addBuyerProducts` + `removeBuyerProducts` (선택 발주처 한정)

## 적용 순서 / 리스크
- 마이그레이션 **013** (테이블 + 이관 + RPC 교체 + RLS) — 라이브 적용은 사용자 동의 후
- ⚠️ 코드가 `buyer_products`를 쓰므로 **013 적용 전 배포 시 B2B 화면 깨짐** → 마이그레이션과 배포를 함께
- 롤백: 013은 `buyer_id` 칼럼을 보존하므로, RPC만 011 버전으로 되돌리면 구모델로 복귀 가능
