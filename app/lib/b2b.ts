'use client';

// B2B 발주 모듈 데이터레이어 (specs/001-b2b-order-module)
// 기존 app/lib/supabase.js 의 클라이언트를 재사용하되, 발주 관련 함수는 여기로 분리한다.
// snake_case(DB) ↔ camelCase(앱) 변환은 기존 컨벤션을 따른다.

import { supabase } from './supabase';
import type {
    Buyer,
    ProductInventory,
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseOrderStatus,
    CatalogRow,
} from '../models/orderTypes';

// ===== DB 행(raw) 타입 =====
interface BuyerRow { id: string; name: string; login_email: string; auth_user_id: string | null; active: boolean; created_at: string; }
interface InventoryRow { id: string; product_id: string; size: string; color: string; stock_qty: number; remarks: string | null; }
interface POItemRow { id: string; inventory_id: string | null; product_id: string | null; product_name: string | null; size: string | null; color: string | null; quantity: number; unit_price: number; remarks: string | null; }
interface PORow { id: string; po_no: string | null; buyer_id: string; status: PurchaseOrderStatus; total_price: number; note: string | null; created_at: string; confirmed_at: string | null; items?: POItemRow[]; }
interface CatalogRowRaw { product_id: string; product_name: string; default_price: number; wholesale_price: number; inventory_id: string; size: string; color: string; stock_qty: number; remarks: string | null; }

// ===== 매퍼 =====
const toBuyer = (r: BuyerRow): Buyer => ({
    id: r.id, name: r.name, loginEmail: r.login_email,
    authUserId: r.auth_user_id, active: r.active, createdAt: r.created_at,
});
const toInventory = (r: InventoryRow): ProductInventory => ({
    id: r.id, productId: r.product_id, size: r.size, color: r.color,
    stockQty: r.stock_qty, remarks: r.remarks ?? undefined,
});
const toPoItem = (r: POItemRow): PurchaseOrderItem => ({
    id: r.id, inventoryId: r.inventory_id ?? undefined, productId: r.product_id ?? undefined,
    productName: r.product_name ?? undefined, size: r.size ?? undefined, color: r.color ?? undefined,
    quantity: r.quantity, unitPrice: r.unit_price, remarks: r.remarks ?? undefined,
});
const toPurchaseOrder = (r: PORow): PurchaseOrder => ({
    id: r.id, poNo: r.po_no ?? undefined, buyerId: r.buyer_id, status: r.status,
    totalPrice: r.total_price, note: r.note ?? undefined, createdAt: r.created_at,
    confirmedAt: r.confirmed_at, items: (r.items ?? []).map(toPoItem),
});
const toCatalogRow = (r: CatalogRowRaw): CatalogRow => ({
    productId: r.product_id, productName: r.product_name, defaultPrice: r.default_price,
    wholesalePrice: r.wholesale_price, inventoryId: r.inventory_id, size: r.size,
    color: r.color, stockQty: r.stock_qty, remarks: r.remarks ?? undefined,
});

// =============================================================================
// 발주처(buyers) — 관리자
// =============================================================================
export async function getBuyers(): Promise<Buyer[]> {
    const { data, error } = await supabase.from('buyers').select('*').order('name');
    if (error) { console.error('발주처 목록 조회 오류:', error); return []; }
    return (data as BuyerRow[]).map(toBuyer);
}

// 발주처 행만 생성(계정 없음) — 직접 사용은 지양. 계정까지 발급하려면 createBuyerAccount 사용.
export async function addBuyer(input: { name: string; loginEmail: string }): Promise<Buyer | null> {
    const { data, error } = await supabase
        .from('buyers')
        .insert({ name: input.name, login_email: input.loginEmail })
        .select().single();
    if (error) { console.error('발주처 추가 오류:', error); return null; }
    return toBuyer(data as BuyerRow);
}

// 발주처 + 로그인 계정을 한 번에 발급 (서버 라우트 /api/b2b/create-buyer 호출).
// 관리자 세션 토큰을 첨부하고, 서버에서 service_role로 buyers·auth 유저·연결을 처리한다.
export async function createBuyerAccount(input: {
    name: string; email: string; password: string;
}): Promise<{ success: boolean; error?: string }> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return { success: false, error: '로그인이 필요합니다.' };

    const res = await fetch('/api/b2b/create-buyer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(input),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) return { success: false, error: json.error ?? '계정 생성에 실패했습니다.' };
    return { success: true };
}

export async function setBuyerActive(buyerId: string, active: boolean): Promise<boolean> {
    const { error } = await supabase.from('buyers').update({ active }).eq('id', buyerId);
    if (error) { console.error('발주처 상태 변경 오류:', error); return false; }
    return true;
}

// 제품 → 발주처 전용 배정 (products.buyer_id). buyerId=null 이면 배정 해제(고객주문용으로 환원)
export async function setProductBuyer(productId: string, buyerId: string | null): Promise<boolean> {
    const { error } = await supabase.from('products').update({ buyer_id: buyerId }).eq('id', productId);
    if (error) { console.error('제품 발주처 배정 오류:', error); return false; }
    return true;
}

// 관리자용 제품 목록 (배정 상태 포함). 기존 getProducts(supabase.js)는 buyer_id를 안 가져오므로 별도 제공.
export interface AdminProduct { id: string; name: string; buyerId: string | null; }
export async function getAdminProducts(): Promise<AdminProduct[]> {
    const { data, error } = await supabase.from('products').select('id, name, buyer_id').order('name');
    if (error) { console.error('제품 목록 조회 오류:', error); return []; }
    return (data as { id: string; name: string; buyer_id: string | null }[])
        .map(r => ({ id: r.id, name: r.name, buyerId: r.buyer_id }));
}

// =============================================================================
// 변형 재고(product_inventory) — 관리자
// =============================================================================
export async function getInventory(productId: string): Promise<ProductInventory[]> {
    const { data, error } = await supabase
        .from('product_inventory').select('*').eq('product_id', productId);
    if (error) { console.error('재고 조회 오류:', error); return []; }
    return (data as InventoryRow[]).map(toInventory);
}

// (product_id, size, color) 기준 upsert. 같은 변형이면 수량/비고만 갱신.
export async function upsertInventory(input: {
    productId: string; size: string; color: string; stockQty: number; remarks?: string;
}): Promise<ProductInventory | null> {
    const { data, error } = await supabase
        .from('product_inventory')
        .upsert({
            product_id: input.productId, size: input.size, color: input.color,
            stock_qty: input.stockQty, remarks: input.remarks ?? null, updated_at: new Date().toISOString(),
        }, { onConflict: 'product_id,size,color' })
        .select().single();
    if (error) { console.error('재고 저장 오류:', error); return null; }
    return toInventory(data as InventoryRow);
}

export async function deleteInventory(inventoryId: string): Promise<boolean> {
    const { error } = await supabase.from('product_inventory').delete().eq('id', inventoryId);
    if (error) { console.error('재고 삭제 오류:', error); return false; }
    return true;
}

// =============================================================================
// 발주처 카탈로그 (발주처 포털) — get_my_catalog RPC (RLS로 자기 것만)
// =============================================================================
export async function getMyCatalog(): Promise<CatalogRow[]> {
    const { data, error } = await supabase.rpc('get_my_catalog');
    if (error) { console.error('카탈로그 조회 오류:', error); return []; }
    return (data as CatalogRowRaw[]).map(toCatalogRow);
}

// =============================================================================
// 발주(purchase orders)
// =============================================================================

// 발주 신청 (발주처). 재고 차감은 관리자 접수 시점.
export async function placePurchaseOrder(
    items: { inventoryId: string; quantity: number }[],
    note?: string,
): Promise<{ success: boolean; poId?: string; error?: unknown }> {
    const { data, error } = await supabase.rpc('place_purchase_order', {
        p_items: items.map(i => ({ inventory_id: i.inventoryId, quantity: i.quantity })),
        p_note: note ?? null,
    });
    if (error) { console.error('발주 신청 오류:', error); return { success: false, error }; }
    return { success: true, poId: data as string };
}

// 발주 목록 (RLS: 관리자는 전체, 발주처는 자기 것). 라인 포함.
export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
    const { data, error } = await supabase
        .from('purchase_orders')
        .select('*, items:purchase_order_items(*)')
        .order('created_at', { ascending: false });
    if (error) { console.error('발주 목록 조회 오류:', error); return []; }
    return (data as PORow[]).map(toPurchaseOrder);
}

// 발주 접수(확정) — 원자적 재고 차감 (관리자)
export async function confirmPurchaseOrder(poId: string): Promise<{ success: boolean; error?: unknown }> {
    const { error } = await supabase.rpc('confirm_purchase_order', { p_po: poId });
    if (error) { console.error('발주 접수 오류:', error); return { success: false, error }; }
    return { success: true };
}

// 상태 진행 confirmed→shipped→done (관리자)
export async function advancePurchaseOrder(poId: string, to: PurchaseOrderStatus): Promise<{ success: boolean; error?: unknown }> {
    const { error } = await supabase.rpc('advance_purchase_order', { p_po: poId, p_to: to });
    if (error) { console.error('발주 상태 변경 오류:', error); return { success: false, error }; }
    return { success: true };
}

// 발주 취소 + 재고 복원 (관리자)
export async function cancelPurchaseOrder(poId: string): Promise<{ success: boolean; error?: unknown }> {
    const { error } = await supabase.rpc('cancel_purchase_order', { p_po: poId });
    if (error) { console.error('발주 취소 오류:', error); return { success: false, error }; }
    return { success: true };
}
