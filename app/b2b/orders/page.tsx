'use client';

// 관리자 — 들어온 발주 접수/출고/완료/취소 (T4.4, T4.5)
// 접수(확정) 시 재고가 원자적으로 차감되며, 부족하면 RPC가 거부 → 사용자에게 안내.

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import RequireRole from '../../components/auth/RequireRole';
import {
    getPurchaseOrders, getBuyers,
    confirmPurchaseOrder, advancePurchaseOrder, cancelPurchaseOrder,
} from '../../lib/b2b';
import { purchaseOrderStatusMap, type Buyer, type PurchaseOrder, type PurchaseOrderStatus } from '../../models/orderTypes';

const statusColor: Record<PurchaseOrderStatus, string> = {
    requested: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    shipped: 'bg-purple-100 text-purple-800',
    done: 'bg-green-100 text-green-800',
    canceled: 'bg-gray-100 text-gray-500',
};

function errMsg(e: unknown): string {
    if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
    return '알 수 없는 오류';
}

function OrdersInner() {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [buyers, setBuyers] = useState<Buyer[]>([]);
    const [busy, setBusy] = useState<string | null>(null);

    const load = useCallback(() => { getPurchaseOrders().then(setOrders); }, []);
    useEffect(() => { load(); getBuyers().then(setBuyers); }, [load]);

    const buyerName = (id: string) => buyers.find(b => b.id === id)?.name ?? id;

    const run = async (poId: string, fn: () => Promise<{ success: boolean; error?: unknown }>, okMsg?: string) => {
        setBusy(poId);
        const r = await fn();
        setBusy(null);
        if (!r.success) { alert(`처리 실패: ${errMsg(r.error)}`); return; }
        if (okMsg) alert(okMsg);
        load();
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">발주 접수</h1>
                <nav className="text-sm space-x-3">
                    <Link href="/b2b/buyers" className="text-blue-600 hover:underline">발주처</Link>
                    <Link href="/b2b/inventory" className="text-blue-600 hover:underline">제품·재고</Link>
                </nav>
            </div>

            <div className="space-y-3">
                {orders.map(o => (
                    <div key={o.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="font-mono text-sm text-gray-500">{o.poNo}</span>
                                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{buyerName(o.buyerId)}</span>
                                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${statusColor[o.status]}`}>
                                    {purchaseOrderStatusMap[o.status]}
                                </span>
                            </div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {o.totalPrice.toLocaleString()}원
                            </div>
                        </div>

                        <ul className="mt-2 text-sm text-gray-600 dark:text-gray-300 space-y-0.5">
                            {(o.items ?? []).map(it => (
                                <li key={it.id}>
                                    {it.productName} · {it.size}/{it.color} × {it.quantity}
                                    <span className="text-gray-400"> ({it.unitPrice.toLocaleString()}원)</span>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-3 flex gap-2 justify-end">
                            {o.status === 'requested' && (
                                <button disabled={busy === o.id} onClick={() => run(o.id, () => confirmPurchaseOrder(o.id), '접수되었습니다 (재고 차감).')}
                                    className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-60">접수(재고차감)</button>
                            )}
                            {o.status === 'confirmed' && (
                                <button disabled={busy === o.id} onClick={() => run(o.id, () => advancePurchaseOrder(o.id, 'shipped'))}
                                    className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-60">출고</button>
                            )}
                            {o.status === 'shipped' && (
                                <button disabled={busy === o.id} onClick={() => run(o.id, () => advancePurchaseOrder(o.id, 'done'))}
                                    className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-60">완료</button>
                            )}
                            {o.status !== 'done' && o.status !== 'canceled' && (
                                <button disabled={busy === o.id} onClick={() => { if (confirm('이 발주를 취소할까요? 차감된 재고는 복원됩니다.')) run(o.id, () => cancelPurchaseOrder(o.id)); }}
                                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60">취소</button>
                            )}
                        </div>
                    </div>
                ))}
                {orders.length === 0 && <p className="text-center text-gray-400 py-10">들어온 발주가 없습니다.</p>}
            </div>
        </div>
    );
}

export default function B2bOrdersPage() {
    return <RequireRole role="admin" title="발주 접수"><OrdersInner /></RequireRole>;
}
