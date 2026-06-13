'use client';

// 발주처 포털 — 레퍼런스 스타일 + UX 개선 (기존 데이터/함수만 사용, 신규 기능·DB 추가 없음)
// 개선: 인라인 토스트 · 하단 고정 주문바 · 수량 −/+ · 선택행 하이라이트 · 라인 삭제/비우기 · 발주 확인 다이얼로그 · 로딩 상태

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import RequireRole from '../components/auth/RequireRole';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import PurchaseOrderDetailModal from '../components/b2b/PurchaseOrderDetailModal';
import { getMyCatalog, placePurchaseOrder, getPurchaseOrders } from '../lib/b2b';
import { buyerOrderStatusMap, type CatalogRow, type PurchaseOrder, type PurchaseOrderStatus } from '../models/orderTypes';

const specOf = (size?: string, color?: string) => `${size ?? ''}${color ? ` / ${color}` : ''}`;

const statusBadge: Record<PurchaseOrderStatus, string> = {
    requested: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
    confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
    shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
    done: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
    canceled: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};

// 발주처 진행상태 단계 안내 (수주처 '확정/출고' → 발주처 '접수/배송/도착')
const STEPS = ['작성', '신청', '접수', '배송', '도착'];

type DateRange = 'all' | '3m' | '1m' | '1w' | 'today';
const RANGES: { key: DateRange; label: string }[] = [
    { key: 'all', label: '전체' }, { key: '3m', label: '3개월' },
    { key: '1m', label: '1개월' }, { key: '1w', label: '1주' }, { key: 'today', label: '오늘' },
];

function PortalInner() {
    const [catalog, setCatalog] = useState<CatalogRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [qty, setQty] = useState<Record<string, number>>({});
    const [note, setNote] = useState('');
    const [search, setSearch] = useState('');
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [range, setRange] = useState<DateRange>('3m');
    const [submitting, setSubmitting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [detailOrder, setDetailOrder] = useState<PurchaseOrder | null>(null);
    const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showToast = useCallback((kind: 'success' | 'error', msg: string) => {
        setToast({ kind, msg });
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 3000);
    }, []);
    useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

    const loadOrders = useCallback(() => { getPurchaseOrders().then(setOrders); }, []);
    useEffect(() => {
        getMyCatalog().then(c => { setCatalog(c); setLoading(false); });
        loadOrders();
    }, [loadOrders]);

    const filteredCatalog = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return catalog;
        return catalog.filter(r =>
            r.productName.toLowerCase().includes(q) || r.size.toLowerCase().includes(q) ||
            r.color.toLowerCase().includes(q) || r.productId.toLowerCase().includes(q));
    }, [catalog, search]);

    const setItemQty = (invId: string, value: number, max: number) => {
        const q = Math.max(0, Math.min(max, Math.floor(value) || 0));
        setQty(prev => ({ ...prev, [invId]: q }));
    };

    const cart = useMemo(() =>
        catalog.map(r => ({ row: r, q: qty[r.inventoryId] || 0 })).filter(x => x.q > 0),
        [catalog, qty]);
    const cartUnits = cart.reduce((s, x) => s + x.q, 0);

    const doSubmit = async () => {
        setConfirmOpen(false);
        setSubmitting(true);
        const r = await placePurchaseOrder(cart.map(x => ({ inventoryId: x.row.inventoryId, quantity: x.q })), note.trim() || undefined);
        setSubmitting(false);
        if (!r.success) { showToast('error', '발주 신청에 실패했습니다. 재고를 확인해주세요.'); return; }
        showToast('success', '발주가 신청되었습니다.');
        setQty({}); setNote(''); loadOrders();
    };

    const filteredOrders = useMemo(() => {
        if (range === 'all') return orders;
        const now = new Date();
        const cutoff = new Date(now);
        if (range === '3m') cutoff.setMonth(now.getMonth() - 3);
        else if (range === '1m') cutoff.setMonth(now.getMonth() - 1);
        else if (range === '1w') cutoff.setDate(now.getDate() - 7);
        else if (range === 'today') cutoff.setHours(0, 0, 0, 0);
        return orders.filter(o => o.createdAt && new Date(o.createdAt) >= cutoff);
    }, [orders, range]);

    return (
        <div className="max-w-5xl mx-auto space-y-5 pb-28">
            {/* 토스트 */}
            {toast && (
                <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-lg shadow-lg text-sm text-white ${toast.kind === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.msg}
                </div>
            )}

            {/* 헤더 + 진행 안내 */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">발주</h1>
                <div className="flex items-center text-xs text-gray-400">
                    {STEPS.map((s, i) => (
                        <React.Fragment key={s}>
                            <span className={i === 0 ? 'text-blue-600 font-medium' : ''}>{s}</span>
                            {i < STEPS.length - 1 && <span className="mx-1">›</span>}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* 주문등록 */}
            <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <span className="font-semibold text-gray-700 dark:text-gray-200">상품</span>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="상품명 · 규격 · 코드 검색"
                        className="w-64 px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm" />
                </div>
                <div className="max-h-[26rem] overflow-y-auto">
                    {loading ? (
                        <div className="py-16 text-center text-gray-400 text-sm">상품을 불러오는 중…</div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200">
                                <tr className="text-left">
                                    <th className="px-3 py-2">관리코드</th><th>상품명</th><th>규격</th>
                                    <th className="text-center">가용재고</th><th className="text-center w-36">수량</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCatalog.map(r => {
                                    const q = qty[r.inventoryId] || 0;
                                    const soldOut = r.stockQty === 0;
                                    return (
                                        <tr key={r.inventoryId} className={`border-t border-gray-100 dark:border-gray-800 ${q > 0 ? 'bg-blue-50/70 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                            <td className="px-3 py-2 font-mono text-xs text-gray-400">{r.productId}</td>
                                            <td className="text-gray-900 dark:text-gray-100">{r.productName}</td>
                                            <td className="text-gray-700 dark:text-gray-300">{specOf(r.size, r.color)}</td>
                                            <td className={`text-center ${soldOut ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>{soldOut ? '품절' : r.stockQty}</td>
                                            <td className="py-1">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button type="button" disabled={soldOut || q <= 0} onClick={() => setItemQty(r.inventoryId, q - 1, r.stockQty)}
                                                        className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 text-gray-500 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700">−</button>
                                                    <input type="number" min="0" max={r.stockQty} disabled={soldOut} value={q || ''}
                                                        onChange={e => setItemQty(r.inventoryId, parseInt(e.target.value), r.stockQty)}
                                                        className="w-12 px-1 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-center disabled:bg-gray-100 dark:disabled:bg-gray-800" />
                                                    <button type="button" disabled={soldOut || q >= r.stockQty} onClick={() => setItemQty(r.inventoryId, q + 1, r.stockQty)}
                                                        className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 text-gray-500 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700">+</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredCatalog.length === 0 && (
                                    <tr><td colSpan={5} className="px-3 py-12 text-center text-gray-400">
                                        {catalog.length === 0 ? '배정된 제품이 없습니다.' : '검색 결과가 없습니다.'}
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </section>

            {/* 장바구니 */}
            <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <span className="font-semibold text-gray-700 dark:text-gray-200">담은 상품 <span className="text-blue-600">{cart.length}</span></span>
                    {cart.length > 0 && (
                        <button onClick={() => setQty({})} className="text-xs text-gray-400 hover:text-red-600">비우기</button>
                    )}
                </div>
                <table className="w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 text-left">
                        <tr>
                            <th className="px-3 py-2 w-12">번호</th><th>상품</th><th>규격</th>
                            <th className="text-center">수량</th><th className="w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {cart.map((x, i) => (
                            <tr key={x.row.inventoryId} className="border-t border-gray-100 dark:border-gray-800">
                                <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                                <td className="text-gray-900 dark:text-gray-100">{x.row.productName}</td>
                                <td className="text-gray-700 dark:text-gray-300">{specOf(x.row.size, x.row.color)}</td>
                                <td className="text-center text-gray-700 dark:text-gray-300">{x.q}</td>
                                <td className="text-center">
                                    <button onClick={() => setItemQty(x.row.inventoryId, 0, x.row.stockQty)} className="text-gray-300 hover:text-red-600" title="삭제">✕</button>
                                </td>
                            </tr>
                        ))}
                        {cart.length === 0 && (
                            <tr><td colSpan={5} className="px-3 py-8 text-center text-gray-400">위에서 수량을 입력하면 여기에 담깁니다.</td></tr>
                        )}
                    </tbody>
                </table>
            </section>

            {/* 주문내역 */}
            <section>
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">주문내역</h2>
                    <div className="flex gap-1">
                        {RANGES.map(r => (
                            <button key={r.key} onClick={() => setRange(r.key)}
                                className={`px-3 py-1 text-xs rounded ${range === r.key ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                                {r.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="space-y-2">
                    {filteredOrders.map(o => (
                        <div key={o.id} role="button" tabIndex={0}
                            onClick={() => setDetailOrder(o)}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetailOrder(o); } }}
                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm shadow-sm hover:border-blue-300 dark:hover:border-blue-700 hover:shadow transition cursor-pointer">
                            <div className="flex justify-between items-center">
                                <span className="font-mono text-gray-500">{o.poNo}</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-gray-400">{o.createdAt ? o.createdAt.slice(0, 10) : ''}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[o.status]}`}>{buyerOrderStatusMap[o.status]}</span>
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">{o.totalPrice.toLocaleString()}원</span>
                                </div>
                            </div>
                            <div className="text-gray-600 dark:text-gray-300 mt-1.5">
                                {(o.items ?? []).map(it => `${it.productName} ${specOf(it.size, it.color)}×${it.quantity}`).join(', ')}
                            </div>
                        </div>
                    ))}
                    {filteredOrders.length === 0 && <p className="text-center text-gray-400 py-6">해당 기간 발주 내역이 없습니다.</p>}
                </div>
            </section>

            {/* 하단 고정 주문바 */}
            <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-gray-800/95 backdrop-blur border-t border-gray-200 dark:border-gray-700 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
                    <div className="text-sm whitespace-nowrap">
                        <span className="text-gray-500">선택</span> <strong className="text-gray-900 dark:text-gray-100">{cart.length}</strong>건
                        <span className="text-gray-300 mx-1">·</span>
                        <strong className="text-gray-900 dark:text-gray-100">{cartUnits}</strong>개
                    </div>
                    <input value={note} onChange={e => setNote(e.target.value)} placeholder="주문메모(선택)"
                        className="flex-1 min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm" />
                    <button onClick={() => setConfirmOpen(true)} disabled={submitting || cart.length === 0}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium whitespace-nowrap">
                        {submitting ? '신청 중…' : '신청하기'}
                    </button>
                </div>
            </div>

            <ConfirmDialog
                isOpen={confirmOpen}
                variant="primary"
                title="발주 신청"
                message={`${cart.length}건 (총 ${cartUnits}개)를 발주 신청하시겠습니까?`}
                confirmText="신청하기"
                cancelText="취소"
                onConfirm={doSubmit}
                onCancel={() => setConfirmOpen(false)}
            />

            <PurchaseOrderDetailModal order={detailOrder} onClose={() => setDetailOrder(null)} />
        </div>
    );
}

export default function PortalPage() {
    return <RequireRole role="buyer"><PortalInner /></RequireRole>;
}
