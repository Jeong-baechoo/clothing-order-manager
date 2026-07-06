-- 021: 불량(로스) 기록 테이블
-- 배경: 불량 제품은 도매가(원가)만큼 손실. 제품에 wholesale_price가 이미 있으므로
--       불량 수량만 기록하면 손실 = 단가(도매가 스냅샷) × 수량 으로 자동 계산된다.
-- 분석 페이지에서 이 손실을 순마진에서 차감하고 제품별 로스 통계를 낸다.

create table if not exists defect_logs (
  id               uuid primary key default gen_random_uuid(),
  log_date         date not null,
  product_id       text references products(id) on delete set null, -- 제품 삭제돼도 기록 보존
  product_name     text not null,                                   -- 품목명 스냅샷
  unit_price       integer not null default 0,                      -- 단가(도매가 스냅샷)
  quantity         integer not null default 0 check (quantity >= 0),
  remarks          text,
  person_in_charge text,
  created_at       timestamptz not null default now()
);

create index if not exists idx_defect_logs_date on defect_logs(log_date);
create index if not exists idx_defect_logs_product on defect_logs(product_id);

-- 금액(손실)은 unit_price * quantity 로 앱에서 파생(저장하지 않음).
