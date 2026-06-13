# 계정 수동 발급 가이드 (MVP)

- 관련: [spec.md](./spec.md), [plan.md](./plan.md)
- 방식: 클라이언트 사이드 Supabase Auth + **Supabase 대시보드 수동 발급** (서버 발급 라우트는 후속)

> 핵심: RLS는 JWT의 **`app_metadata`** 만 신뢰한다(`role`, `buyer_id`). `user_metadata`는 사용자가 바꿀 수 있어 권한에 쓰지 않는다. `app_metadata`는 대시보드 또는 service_role API로만 설정 가능하다.

---

## 1. 관리자 계정 발급

1. Supabase 대시보드 → **Authentication → Users → Add user**
   - Email / Password 입력 (이메일 인증 off 또는 confirm)
2. 생성된 유저 → **app_metadata** 편집:
   ```json
   { "role": "admin" }
   ```
3. 끝. 이 계정으로 `/login` → `/b2b/orders`(관리자 영역) 접근 가능.

## 2. 발주처 계정 발급 — 앱에서 자동 (권장)

관리자 화면 `/b2b/buyers`에서 **이름 · 로그인 이메일 · 임시 비밀번호**를 입력하고 "추가"하면,
서버 라우트 `/api/b2b/create-buyer`가 service_role로 (1) buyers 행 (2) Auth 유저 + `app_metadata.buyer_id`
(3) `buyers.auth_user_id` 연결을 한 번에 처리한다. **대시보드 수동 작업 불필요.**

**사전 요구: 서버 환경변수 `SUPABASE_SERVICE_ROLE_KEY`** (브라우저 노출 금지 — `NEXT_PUBLIC_` 접두사 절대 X)
- 값: Supabase 대시보드 → Settings → API → `service_role` (secret)
- 로컬: `.env.local`에 `SUPABASE_SERVICE_ROLE_KEY=...` 추가
- 배포: Vercel → Settings → Environment Variables에 추가

발급 후 임시 비밀번호를 발주처에 전달 → 첫 로그인 후 변경 안내. 로그인하면 `/portal`로 진입, 자기 배정 제품만 노출.

> (대안) 서버 키를 쓰기 어려우면 대시보드에서 §1과 같은 방식으로 유저를 만들고 `app_metadata: { "buyer_id": "<buyers.id>" }` 설정 + `buyers.auth_user_id` 연결로도 가능하다.

## 3. 검증 체크리스트

- [ ] 관리자 로그인 → `/b2b/*` 접근 OK, `/portal` 접근 시 관리자 홈으로 리다이렉트
- [ ] 발주처 로그인 → `/portal` 접근 OK, `/b2b/*` 접근 시 포털로 리다이렉트
- [ ] 발주처 A 로그인 → `get_my_catalog()`가 A 배정 제품만 반환 (B 제품 안 보임)
- [ ] 역할 미설정 계정 로그인 → "역할이 설정되지 않았습니다" 안내

## 4. 구현 메모

발주처 계정 인앱 발급은 구현됨:
- 서버 라우트: `app/api/b2b/create-buyer/route.ts` (관리자 검증 + service_role 발급, 실패 시 buyers 행 롤백)
- 데이터레이어: `app/lib/b2b.ts` `createBuyerAccount()` (관리자 세션 토큰 첨부)
- 화면: `/b2b/buyers` (이름·이메일·임시비번 → 추가)

관리자 계정은 드물어 §1대로 대시보드에서 수동 발급한다(전용 발급 UI는 두지 않음).
