'use client';

// 관리자 — 들어온 발주 처리 (작업 큐형). T4.4, T4.5
// 기본 화면은 '처리 대기'(신청·확정·출고). 신청건이 위로 오는 FIFO 큐로, 지금 할 일을 먼저 보여준다.
// 접수(확정) 시 재고가 원자적으로 차감되며, 부족하면 RPC가 거부 → 사용자에게 안내.

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import RequireRole from '../../components/auth/RequireRole';
import B2bTabs from '../../components/b2b/B2bTabs';
import {
    getPurchaseOrders, getBuyers,
    confirmPurchaseOrder, advancePurchaseOrder, cancelPurchaseOrder,
} from '../../lib/b2b';
import { purchaseOrderStatusMap, type Buyer, type PurchaseOrder, type PurchaseOrderStatus } from '../../models/orderTypes';

const statusColor: Record<PurchaseOrderStatus, string> = {
    requested: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
    confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
    shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
    done: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
    canceled: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};

// 처리 단계 순서 (큐 정렬용) — 신청이 가장 먼저
const STATUS_ORDER: Record<PurchaseOrderStatus, number> = { requested: 0, confirmed: 1, shipped: 2, done: 3, canceled: 4 };
const PENDING: PurchaseOrderStatus[] = ['requested', 'confirmed', 'shipped'];

type View = 'pending' | 'done' | 'canceled' | 'all';

function errMsg(e: unknown): string {
    if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
    return '알 수 없는 오류';
}

function fmtDate(s?: string): string {
    if (!s) return '';
    const d = new Date(s);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function OrdersInner() {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [buyers, setBuyers] = useState<Buyer[]>([]);
    const [busy, setBusy] = useState<string | null>(null);
    const [view, setView] = useState<View>('pending');

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

    const countOf = (s: PurchaseOrderStatus) => orders.filter(o => o.status === s).length;
    const pendingCount = orders.filter(o => PENDING.includes(o.status)).length;
    const requestedCount = countOf('requested');

    const VIEWS: { key: View; label: string; count: number }[] = [
        { key: 'pending', label: '처리 대기', count: pendingCount },
        { key: 'done', label: '완료', count: countOf('done') },
        { key: 'canceled', label: '취소', count: countOf('canceled') },
        { key: 'all', label: '전체', count: orders.length },
    ];

    const filteredOrders = useMemo(() => {
        let list: PurchaseOrder[];
        if (view === 'pending') list = orders.filter(o => PENDING.includes(o.status));
        else if (view === 'done') list = orders.filter(o => o.status === 'done');
        else if (view === 'canceled') list = orders.filter(o => o.status === 'canceled');
        else list = orders;
        // 처리 대기: 단계순(신청→확정→출고) + 같은 단계는 오래된 순(FIFO). 그 외: 최신순.
        return [...list].sort((a, b) => {
            const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
            if (s !== 0) return s;
            const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return view === 'pending' ? da - db : db - da;
        });
    }, [orders, view]);

    const emptyMsg = view === 'pending' ? '처리할 발주가 없습니다. 🎉'
        : view === 'done' ? '완료된 발주가 없습니다.'
        : view === 'canceled' ? '취소된 발주가 없습니다.'
        : '들어온 발주가 없습니다.';

    return (
        <div className="max-w-4xl mx-auto p-6">
            <B2bTabs title="발주 접수" right={
                requestedCount > 0
                    ? <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200">접수 대기 {requestedCount}건</span>
                    : <span className="text-sm text-gray-400">접수 대기 없음</span>
            } />

            {/* 작업 큐 뷰 전환 (세그먼트) */}
            <div className="inline-flex p-0.5 mb-4 rounded-lg bg-gray-100 dark:bg-gray-800">
                {VIEWS.map(v => (
                    <button key={v.key} onClick={() => setView(v.key)}
                        className={`px-3.5 py-1.5 text-sm rounded-md transition-colors ${view === v.key
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm font-medium'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}>
                        {v.label}
                        <span className={`ml-1.5 text-xs ${view === v.key ? 'text-blue-600' : 'text-gray-400'}`}>{v.count}</span>
                    </button>
                ))}
            </div>

            <div className="space-y-3">
                {filteredOrders.map(o => {
                    const needsAction = o.status === 'requested';
                    return (
                        <div key={o.id}
                            className={`border rounded-lg p-4 bg-white dark:bg-gray-800 ${needsAction
                                ? 'border-gray-200 dark:border-gray-700 border-l-4 border-l-yellow-400'
                                : 'border-gray-200 dark:border-gray-700'}`}>
                            <div className="flex items-center justify-between">
                                <div className="min-w-0">
                                    <span className="font-mono text-sm text-gray-500">{o.poNo}</span>
                                    <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{buyerName(o.buyerId)}</span>
                                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${statusColor[o.status]}`}>
                                        {purchaseOrderStatusMap[o.status]}
                                    </span>
                                    <div className="text-xs text-gray-400 mt-0.5">
                                        {fmtDate(o.createdAt)} · {(o.items ?? []).length}품목 {(o.items ?? []).reduce((s, it) => s + it.quantity, 0)}개
                                    </div>
                                </div>
                                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 shrink-0">
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
                    );
                })}
                {filteredOrders.length === 0 && <p className="text-center text-gray-400 py-12">{emptyMsg}</p>}
            </div>
        </div>
    );
}

export default function B2bOrdersPage() {
    return <RequireRole role="admin" title="발주 접수"><OrdersInner /></RequireRole>;
}
