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

// =============================================================================
// 제품 ↔ 발주처 다중 배정 (buyer_products M:N) — 013 적용 전제. 재고는 공유 풀.
// =============================================================================

// 제품별 배정 발주처 목록: productId → buyerId[]
export async function getBuyerProductMap(): Promise<Record<string, string[]>> {
    const { data, error } = await supabase.from('buyer_products').select('buyer_id, product_id');
    if (error) { console.error('배정 맵 조회 오류:', error); return {}; }
    const out: Record<string, string[]> = {};
    for (const r of (data as { buyer_id: string; product_id: string }[])) {
        (out[r.product_id] ??= []).push(r.buyer_id);
    }
    return out;
}

// 선택 발주처에 제품들을 배정(추가). 이미 있으면 무시. (다른 발주처 배정은 건드리지 않음)
export async function addBuyerProducts(buyerId: string, productIds: string[]): Promise<boolean> {
    if (productIds.length === 0) return true;
    const rows = productIds.map(pid => ({ buyer_id: buyerId, product_id: pid }));
    const { error } = await supabase.from('buyer_products')
        .upsert(rows, { onConflict: 'buyer_id,product_id', ignoreDuplicates: true });
    if (error) { console.error('배정 추가 오류:', error); return false; }
    return true;
}

// 선택 발주처에서 제품들 배정 해제(삭제). 다른 발주처 배정은 유지.
export async function removeBuyerProducts(buyerId: string, productIds: string[]): Promise<boolean> {
    if (productIds.length === 0) return true;
    const { error } = await supabase.from('buyer_products')
        .delete().eq('buyer_id', buyerId).in('product_id', productIds);
    if (error) { console.error('배정 삭제 오류:', error); return false; }
    return true;
}

// 관리자용 제품 목록 (카테고리 + 회사 포함). 배정은 getBuyerProductMap 으로 별도 조회(M:N).
type NamedRel = { name: string } | { name: string }[] | null;
const relName = (r: NamedRel): string | null => (Array.isArray(r) ? r[0]?.name : r?.name) ?? null;
export interface AdminProduct {
    id: string; name: string;
    categoryId: string | null; categoryName: string | null;
    companyId: string | null; companyName: string | null;
}
interface AdminProductRow { id: string; name: string; category_id: string | null; categories: NamedRel; company_id: string | null; companies: NamedRel; }
export async function getAdminProducts(): Promise<AdminProduct[]> {
    const { data, error } = await supabase.from('products')
        .select('id, name, category_id, categories(name), company_id, companies(name)').order('name');
    if (error) { console.error('제품 목록 조회 오류:', error); return []; }
    return (data as AdminProductRow[]).map(r => ({
        id: r.id, name: r.name,
        categoryId: r.category_id, categoryName: relName(r.categories),
        companyId: r.company_id, companyName: relName(r.companies),
    }));
}

// 카테고리 목록 (정렬순). 일괄 배정 필터용.
export interface CategoryOption { id: string; name: string; }
export async function getCategories(): Promise<CategoryOption[]> {
    const { data, error } = await supabase.from('categories').select('id, name').order('sort_order');
    if (error) { console.error('카테고리 조회 오류:', error); return []; }
    return (data as { id: string; name: string }[]).map(r => ({ id: r.id, name: r.name }));
}

// 회사(사입처) 목록. 일괄 배정 필터용.
export interface CompanyOption { id: string; name: string; }
export async function getCompanyOptions(): Promise<CompanyOption[]> {
    const { data, error } = await supabase.from('companies').select('id, name').order('name');
    if (error) { console.error('회사 조회 오류:', error); return []; }
    return (data as { id: string; name: string }[]).map(r => ({ id: r.id, name: r.name }));
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

// 전 제품 재고 요약 (읽기 전용, 단일 쿼리). 제품목록에서 품절/부족을 한눈에 보기 위함.
// 반환: productId → { total: 총재고, variants: 변형 수, zero: 재고0 변형 수 }
export interface StockSummary { total: number; variants: number; zero: number; }
export async function getInventorySummary(): Promise<Record<string, StockSummary>> {
    const { data, error } = await supabase
        .from('product_inventory').select('product_id, stock_qty');
    if (error) { console.error('재고 요약 조회 오류:', error); return {}; }
    const out: Record<string, StockSummary> = {};
    for (const r of (data as { product_id: string; stock_qty: number }[])) {
        const s = out[r.product_id] ?? { total: 0, variants: 0, zero: 0 };
        s.total += r.stock_qty;
        s.variants += 1;
        if (r.stock_qty === 0) s.zero += 1;
        out[r.product_id] = s;
    }
    return out;
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

// 전체 변형에서 실제 사용된 사이즈·색상 값 수집 (읽기 전용). 매트릭스 입력의 '칩' 후보로 사용 → 오타/중복 방지.
export async function getDistinctVariantValues(): Promise<{ sizes: string[]; colors: string[] }> {
    const { data, error } = await supabase.from('product_inventory').select('size, color');
    if (error) { console.error('변형값 수집 오류:', error); return { sizes: [], colors: [] }; }
    const sizes = new Set<string>(), colors = new Set<string>();
    for (const r of (data as { size: string; color: string }[])) { sizes.add(r.size); colors.add(r.color); }
    return { sizes: [...sizes], colors: [...colors] };
}

// 변형 재고 일괄 upsert (매트릭스 입력용). (product_id,size,color) 충돌 시 수량/비고 갱신.
export async function upsertInventoryBatch(rows: {
    productId: string; size: string; color: string; stockQty: number; remarks?: string;
}[]): Promise<boolean> {
    if (rows.length === 0) return true;
    const payload = rows.map(r => ({
        product_id: r.productId, size: r.size, color: r.color,
        stock_qty: Math.max(0, r.stockQty), remarks: r.remarks ?? null, updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from('product_inventory').upsert(payload, { onConflict: 'product_id,size,color' });
    if (error) { console.error('재고 일괄 저장 오류:', error); return false; }
    return true;
}

export async function deleteInventory(inventoryId: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.from('product_inventory').delete().eq('id', inventoryId);
    if (error) {
        console.error('재고 삭제 오류:', error.code, error.message, error.details);
        // 23503 = foreign_key_violation: 발주 내역(purchase_order_items)이 이 변형을 참조 중
        const msg = error.code === '23503'
            ? '이 변형은 발주 내역에서 사용 중이라 삭제할 수 없습니다. 대신 재고를 0으로 두세요.'
            : (error.message || '삭제에 실패했습니다.');
        return { success: false, error: msg };
    }
    return { success: true };
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
    items: { inventoryId: string; quantity: number; remarks?: string }[],
    note?: string,
): Promise<{ success: boolean; poId?: string; error?: unknown }> {
    const { data, error } = await supabase.rpc('place_purchase_order', {
        p_items: items.map(i => ({ inventory_id: i.inventoryId, quantity: i.quantity, remarks: i.remarks ?? null })),
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

// 발주처 본인 발주 취소 — 신청(requested) 상태만 (cancel_my_purchase_order RPC)
export async function cancelMyPurchaseOrder(poId: string): Promise<{ success: boolean; error?: unknown }> {
    const { error } = await supabase.rpc('cancel_my_purchase_order', { p_po: poId });
    if (error) { console.error('발주 취소 오류:', error); return { success: false, error }; }
    return { success: true };
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
