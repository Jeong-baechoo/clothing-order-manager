-- 019: B2B 발주 — 당사자별 숨김(soft hide). 하드 삭제(018) 폐기.
-- spec: specs/001-b2b-order-module/  (018 이후 적용)
-- ⚠️ DRAFT — 라이브 적용은 사용자 동의 후.
-- 배경: 발주는 거래 원장이므로 물리 삭제하지 않는다. 대신 관리자/발주처가
--       '취소된' 발주를 각자 자기 목록에서만 숨길 수 있게 한다(기록은 보존, 상대방엔 영향 없음).

-- 당사자별 숨김 플래그
alter table purchase_orders add column if not exists admin_hidden boolean not null default false;
alter table purchase_orders add column if not exists buyer_hidden boolean not null default false;

-- 숨김 토글 — 취소(canceled) 발주만. 관리자→admin_hidden, 발주처(소유자)→buyer_hidden.
create or replace function hide_purchase_order(p_po uuid, p_hidden boolean)
returns void language plpgsql security definer as $$
declare cur text; v_buyer uuid; begin
  select status, buyer_id into cur, v_buyer from purchase_orders where id = p_po;
  if cur is null then raise exception '발주를 찾을 수 없습니다'; end if;
  if cur <> 'canceled' then raise exception '취소된 발주만 숨길 수 있습니다'; end if;
  if is_admin() then
    update purchase_orders set admin_hidden = p_hidden where id = p_po;
  elsif v_buyer = current_buyer_id() then
    update purchase_orders set buyer_hidden = p_hidden where id = p_po;
  else
    raise exception '권한이 없습니다';
  end if;
end $$;

-- 복구(취소→신청) 시 양쪽 숨김도 해제해 다시 활성 발주로 보이게 한다. (018의 restore 갱신)
create or replace function restore_purchase_order(p_po uuid)
returns void language plpgsql security definer as $$
declare cur text; begin
  if not is_admin() then raise exception '권한이 없습니다 (관리자 전용)'; end if;
  select status into cur from purchase_orders where id = p_po;
  if cur is null then raise exception '발주를 찾을 수 없습니다'; end if;
  if cur <> 'canceled' then raise exception '취소된 발주만 신청으로 되돌릴 수 있습니다'; end if;
  update purchase_orders
    set status = 'requested', confirmed_at = null, admin_hidden = false, buyer_hidden = false
    where id = p_po;
end $$;

-- 하드 삭제 폐기 (018에서 만든 함수 제거)
drop function if exists delete_purchase_order(uuid);

grant execute on function hide_purchase_order(uuid, boolean) to authenticated;
grant execute on function restore_purchase_order(uuid) to authenticated;