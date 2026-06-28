-- 018: B2B 발주 — 취소 보강(완료→취소 재고복원) + 영구 삭제 RPC (관리자 전용)
-- spec: specs/001-b2b-order-module/  (010~017 이후 적용)
-- ⚠️ DRAFT — 라이브 적용은 사용자 동의 후.
-- 주의: 모든 함수는 security definer(=RLS 우회)이므로 내부에서 관리자 권한을 직접 검증한다.

-- (1) 취소 + 재고 복원 — 011 버전에서 'done'(완료)도 복원 대상에 포함하도록 보강.
--     완료 발주를 취소로 되돌릴 때 차감됐던 재고를 '발주 없던 것처럼' 원복한다. (US-8 확장)
create or replace function cancel_purchase_order(p_po uuid)
returns void language plpgsql security definer as $$
declare cur text; r record; begin
  if not is_admin() then raise exception '권한이 없습니다 (관리자 전용)'; end if;
  select status into cur from purchase_orders where id = p_po;
  if cur = 'canceled' then return; end if;
  if cur in ('confirmed','shipped','done') then       -- 차감됐던 단계는 모두 복원
    for r in select inventory_id, quantity from purchase_order_items
             where po_id = p_po and inventory_id is not null loop
      update product_inventory set stock_qty = stock_qty + r.quantity, updated_at = now()
        where id = r.inventory_id;
    end loop;
  end if;
  update purchase_orders set status = 'canceled' where id = p_po;
end $$;

-- (2) 영구 삭제 — '취소(canceled)' 상태만 삭제. 취소 시 재고는 이미 복원됐으므로 여기선 손대지 않는다.
--     purchase_order_items 는 FK on delete cascade 로 함께 삭제된다.
--     흐름: (활성 발주는 먼저 '취소' → 재고 복원) → '삭제'로 기록 제거.
create or replace function delete_purchase_order(p_po uuid)
returns void language plpgsql security definer as $$
declare cur text; begin
  if not is_admin() then raise exception '권한이 없습니다 (관리자 전용)'; end if;
  select status into cur from purchase_orders where id = p_po;
  if cur is null then raise exception '발주를 찾을 수 없습니다'; end if;
  if cur <> 'canceled' then
    raise exception '취소된 발주만 삭제할 수 있습니다 (먼저 취소하세요)'; end if;
  delete from purchase_orders where id = p_po;  -- 라인은 cascade 로 함께 삭제
end $$;

-- (3) 취소 → 신청(requested) 복구. 관리자 전용.
--     신청/취소 모두 재고 차감이 없는 단계이므로 재고는 건드리지 않고 상태만 되돌린다.
--     접수 이력(confirmed_at)은 초기화해 신청 단계로 깨끗이 되돌린다.
create or replace function restore_purchase_order(p_po uuid)
returns void language plpgsql security definer as $$
declare cur text; begin
  if not is_admin() then raise exception '권한이 없습니다 (관리자 전용)'; end if;
  select status into cur from purchase_orders where id = p_po;
  if cur is null then raise exception '발주를 찾을 수 없습니다'; end if;
  if cur <> 'canceled' then
    raise exception '취소된 발주만 신청으로 되돌릴 수 있습니다'; end if;
  update purchase_orders set status = 'requested', confirmed_at = null where id = p_po;
end $$;

grant execute on function delete_purchase_order(uuid) to authenticated;
grant execute on function restore_purchase_order(uuid) to authenticated;