# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

의류 주문 관리 시스템으로, Next.js 15와 Supabase를 기반으로 구축되었습니다. 주문 관리, 회사/제품 관리, 매출 분석 기능을 제공합니다.

## 개발 명령어

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 린트 실행
npm run lint

# 빌드 캐시 정리
npm run clean
```

## 아키텍처 구조

### 데이터 흐름
1. **클라이언트 → Supabase 직접 연결**: 모든 데이터 작업은 `app/lib/supabase.js`를 통해 클라이언트에서 직접 수행
2. **타입 변환**: Supabase (snake_case) ↔ 애플리케이션 (camelCase) 자동 변환
3. **상태 관리**: React hooks 기반, 별도의 상태 관리 라이브러리 없음

### 주요 모듈 구조

- **`app/lib/supabase.js`**: Supabase 클라이언트 및 모든 데이터베이스 작업 함수
  - 환경 변수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - 자동 타임스탬프 비활성화 설정 포함
  
- **`app/models/orderTypes.ts`**: 비즈니스 로직 타입 정의
  - Order, OrderItem, Product, Company 인터페이스
  - 상태 매핑 및 유틸리티 함수

- **`app/components/`**: 기능별로 분류된 컴포넌트
  - `common/`: 재사용 가능한 공통 컴포넌트
  - `order/`: 주문 CRUD 관련 컴포넌트
  - `companies/`: 회사/제품 관리 컴포넌트

### 데이터베이스 스키마 특징

1. **정규화된 구조**: 
   - products 테이블로 제품 정보 중앙 관리
   - order_items에서 product_id로 참조

2. **레거시 호환성**:
   - order_items의 product_name 필드 유지 (기존 데이터 호환)
   - 신규 주문은 product_id 사용 권장

3. **관계 구조**:
   - orders → order_items → products → companies

### PDF 생성 전략

환경 변수 `NEXT_PUBLIC_PDF_GENERATOR`로 제어:
- `legacy`: html2pdf.js 사용 (기본값)
- 기타: jsPDF 사용

## 개발 시 주의사항

1. **타입 안전성**: TypeScript strict 모드 활성화 상태
2. **클라이언트 전용 코드**: Supabase 작업은 모두 클라이언트 사이드에서 실행
3. **환경 변수**: 모든 환경 변수는 `NEXT_PUBLIC_` 접두사 필요
4. **날짜 처리**: 한국 시간대(KST) 기준으로 처리
5. **정렬 로직**: 주문 항목은 제품명 → 색상 → 사이즈 순으로 자동 정렬