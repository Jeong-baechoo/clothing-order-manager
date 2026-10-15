-- 주문 테이블에 입금일 / 작업일 컬럼 추가
-- paid_at  : 대기중 → 그 외 상태로 처음 바뀐 날짜(KST). D-day(입금일 + 5일) 기준. 대기중으로 되돌리면 NULL.
--            기존 주문은 NULL → 화면에서 주문일로 대체 계산.
-- work_date: 주문 폼에서 지정하는 작업일. 작업 캘린더에 표시.
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS paid_at DATE,
ADD COLUMN IF NOT EXISTS work_date DATE;
