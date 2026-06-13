# B2B 발주 모듈 — 작업 분해 (Tasks)

- 상태: Draft v1
- 작성일: 2026-06-13
- 관련: [spec.md](./spec.md), [plan.md](./plan.md)

> 범례: `[ ]` 미착수 · `[~]` 진행중 · `[x]` 완료 / `🔒DB` = 라이브 DB 적용 단계(**사용자 동의 후**) / `(FR-n)` 충족 요구사항

각 작업은 가능한 한 독립적으로 검증 가능하도록 잘게 나눴다. 단계는 위에서 아래로 의존한다.

---

## Phase 0 — 스펙 확정 & 준비
- [x] T0.1 spec / plan / tasks 작성
- [ ] T0.2 spec.md "미해결 질문 Q1~Q3" 확정 (po_no 규칙, 관리자 인증 동시 도입, 포털 URL)
- [ ] T0.3 사용자 스펙 리뷰 & 승인 (SDD 게이트 — 승인 전 구현 착수 금지)

## Phase 1 — 데이터 계층 (스키마 · RPC · RLS 코드화)
> 산출물은 모두 `migrations/010_b2b_*.sql` 파일. 작성=리포 커밋, 적용=별도(🔒DB).
- [x] T1.1 `migrations/010_b2b_schema.sql` — buyers / products.buyer_id / product_inventory / purchase_orders / purchase_order_items DDL + 인증헬퍼 (FR-1~6)
- [x] T1.2 `migrations/011_b2b_rpc.sql` — next_po_no / get_my_catalog / place / confirm / advance / cancel (FR-7~9)
- [x] T1.3 `migrations/012_b2b_rls.sql` — current_buyer_id / is_admin / 각 테이블 RLS 정책 + grant (FR-10,11)
- [x] T1.4 DDL 셀프 검토: FK 타입(products.id=text) 일치, 인덱스, check 제약, RPC 권한검증(security definer) 확인
- [ ] 🔒DB T1.5 (동의 후) Supabase에 010~012 순서대로 적용 + 검증 쿼리

## Phase 2 — 인증 토대
- [x] T2.1 역할 설계(app_metadata.role/buyer_id) + 발급 가이드 `provisioning.md`
- [x] T2.2 클레임 주입 = 대시보드 수동 app_metadata 발급(provisioning.md) — MVP 방식(옵션 2)
- [x] T2.3 `app/lib/auth.ts` 세션/역할 헬퍼 + `RequireRole.tsx` 클라이언트 가드(미들웨어 대신 client-side, 옵션 A)
- [x] T2.4 로그인 페이지 `app/login/page.tsx`(관리자·발주처 공용, 역할별 분기)
- [x] T2.6 발주처 계정 인앱 발급(수동→자동): 서버 라우트 `app/api/b2b/create-buyer/route.ts` + `b2b.ts createBuyerAccount()` + `/b2b/buyers` 폼. **서버 env `SUPABASE_SERVICE_ROLE_KEY` 필요**
- [x] T2.7 영역 분리/가드 `AppChrome`: 내부화면(/,/orders,/companies,/analytics,/b2b/*) **관리자 전용**, /portal 발주처, /login 공개. Navbar에 B2B링크+로그아웃. (발주처가 관리자 네비/URL 접근 차단)
- [ ] T2.8 (후속) 기존 테이블 RLS: orders/products/companies/categories에 admin 전용 RLS — UI가드는 됐으나 raw API 차단은 RLS 필요(🔒DB)
- [x] T2.9 발주처 비밀번호 변경: `ChangePassword.tsx`(auth.updateUser) + `/portal` 하단 섹션
- [ ] 🔒DB T2.5 (동의 후) RLS 활성화는 T2 인증과 **같은 적용 단위**로

## Phase 3 — 데이터레이어 함수 & 타입
- [x] T3.1 `app/models/orderTypes.ts`에 Buyer / ProductInventory / PurchaseOrder / PurchaseOrderItem / CatalogRow 타입 추가(기존 타입 변경 없음)
- [x] T3.2 `app/lib/b2b.ts` 신규: 발주처 CRUD, 재고 CRUD, 발주 RPC 호출(place/confirm/advance/cancel), 카탈로그 조회
- [x] T3.3 제품↔발주처 배정: `b2b.ts setProductBuyer()`로 처리(기존 supabase.js 무변경) — tsc/lint 통과

## Phase 4 — 관리자 화면
- [x] T4.1 `/b2b/buyers` 발주처 등록·목록·활성토글 (US-1)
- [x] T4.2 발주처 배정 UI — **별도 `/b2b/inventory` 페이지**에서 처리(기존 `/companies` 무변경, plan 대비 변경점) (US-2)
- [x] T4.3 `/b2b/inventory` 변형 재고 CRUD: 사이즈·색상·수량·비고 (US-3)
- [x] T4.4 `/b2b/orders` 발주 목록 + 접수/출고/완료/취소 (US-6,7,8)
- [x] T4.5 접수 RPC 예외(재고 부족) → alert 메시지 처리

## Phase 5 — 발주처 포털
- [x] T5.1 `/portal` + 발주처 전용 가드(RequireRole role=buyer)
- [x] T5.2 내 카탈로그: 배정 제품 + 변형 재고 표시(품절 표시) (US-4)
- [x] T5.3 발주 작성: 변형별 수량 담기 + 현재고 초과 입력 차단 (US-5)
- [x] T5.4 발주 신청 제출 → place_purchase_order 호출
- [x] T5.5 내 발주 내역 + 상태 표시

## Phase 6 — 검증 & 마무리
- [ ] T6.1 격리 테스트: 발주처 A가 B의 제품/재고/발주 접근 불가 확인 (US-9)
- [ ] T6.2 동시성 테스트: 같은 재고 동시 신청 → 접수 순서대로 차감/부족거부 (엣지)
- [ ] T6.3 취소→복원, 상태 전이 제약 테스트
- [ ] T6.4 기존 고객주문/프린팅 흐름 회귀 확인(영향 없음)
- [ ] T6.5 README/운영 메모: 발주처 계정 발급 절차

---

## 의존성 요약
- Phase 1(스키마/RPC/RLS 코드) → Phase 3(함수) → Phase 4·5(화면)
- Phase 2(인증) + T1.5(RLS 적용)은 **같은 적용 단위**(🔒DB 동의 후 동시)
- MVP 최소 경로: T1.1~T1.4 → T3.1~T3.2 → T4.3(재고) → T5.2~T5.4(발주) → T4.4(접수) → 🔒DB 적용

## DB 적용 게이트 (🔒DB)
T1.5, T2.5 등 라이브 DB 변경은 **사용자 명시 동의 후** Supabase SQL Editor에서 수행한다. 그 전까지 모든 산출물은 파일(마이그레이션/코드)로만 존재하며 실 DB에 영향 없음.
