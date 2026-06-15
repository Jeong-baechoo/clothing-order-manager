-- 017: 발주처 본인 발주 취소 (신청 상태만)
-- 발주처는 자기 발주를 '신청(requested)' 단계에서만 취소 가능.
-- 접수(confirmed) 이후는 재고가 차감되어 처리 중이므로 관리자(cancel_purchase_order)만 취소.
-- 적용 순서: … 015 → 016 → 017

create or replace function cancel_my_purchase_order(p_po uuid)
returns void language plpgsql security definer as $$
declare v_buyer uuid; cur text; begin
  v_buyer := current_buyer_id();
  if v_buyer is null then raise exception '발주처 컨텍스트가 없습니다'; end if;

  select status into cur from purchase_orders where id = p_po and buyer_id = v_buyer;
  if cur is null then raise exception '발주를 찾을 수 없습니다'; end if;
  if cur <> 'requested' then
    raise exception '신청 상태의 발주만 취소할 수 있습니다 (접수 후에는 관리자에게 문의)';
  end if;

  -- 신청 단계는 재고 차감 전이므로 상태만 변경 (재고 복원 불필요)
  update purchase_orders set status = 'canceled' where id = p_po and buyer_id = v_buyer;
end $$;

grant execute on function cancel_my_purchase_order(uuid) to authenticated;
