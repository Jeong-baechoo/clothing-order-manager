'use client';

// 발주처 포털 — ECOUNT 스타일 (좌측 메뉴 + 발주 정보 + 발주 품목 그리드 + 상품 추가 모달)
// 하이브리드: 메인은 빈 품목 그리드, '상품 추가' 모달 안에서 색상×사이즈 매트릭스로 일괄 입력.
// 기존 데이터/함수만 사용. 색상→사이즈 일관, 가격 비노출.

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import RequireRole from '../components/auth/RequireRole';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import PurchaseOrderDetailModal from '../components/b2b/PurchaseOrderDetailModal';
import { getMyCatalog, placePurchaseOrder, getPurchaseOrders, cancelMyPurchaseOrder, hidePurchaseOrder } from '../lib/b2b';
import { getSessionInfo } from '../lib/auth';
import { buyerOrderStatusMap, compareVariant, variantColorRank, type CatalogRow, type PurchaseOrder, type PurchaseOrderStatus } from '../models/orderTypes';

// 규격 표기: 색상 → 사이즈 순 (예: "블랙 / L")
const specOf = (size?: string, color?: string) => [color, size].filter(Boolean).join(' / ');

// 사이즈 정렬 (S→M→L→XL…)
const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', 'XXXL', '3XL', '4XL', 'FREE', 'F'];
const sortSizes = (arr: string[]) => [...arr].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a.toUpperCase()), ib = SIZE_ORDER.indexOf(b.toUpperCase());
    if (ia < 0 && ib < 0) return a.localeCompare(b);
    if (ia < 0) return 1; if (ib < 0) return -1; return ia - ib;
});

// 제품 단위로 묶어 사이즈×색상 매트릭스 구성
interface CatalogGroup {
    productId: string; productName: string;
    sizes: string[]; colors: string[];
    cell: Record<string, CatalogRow>; totalStock: number;
}

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

const ORDER_STATUSES: PurchaseOrderStatus[] = ['requested', 'confirmed', 'shipped', 'done', 'canceled'];

type View = 'create' | 'history';

function PortalInner() {
    const [catalog, setCatalog] = useState<CatalogRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [qty, setQty] = useState<Record<string, number>>({});
    const [note, setNote] = useState('');
    const [search, setSearch] = useState('');
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [range, setRange] = useState<DateRange>('3m');
    const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | 'all'>('all');
    const [showHidden, setShowHidden] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [zeroWarn, setZeroWarn] = useState(false);
    const [ordCollapsed, setOrdCollapsed] = useState<Record<string, boolean>>({}); // 발주 내역 주문별 접기
    const [detailOrder, setDetailOrder] = useState<PurchaseOrder | null>(null);
    const [cancelTarget, setCancelTarget] = useState<PurchaseOrder | null>(null);
    const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);
    const [view, setView] = useState<View>('create');
    const [pickerOpen, setPickerOpen] = useState(false);
    const [buyerEmail, setBuyerEmail] = useState('');
    const [lineRemarks, setLineRemarks] = useState<Record<string, string>>({}); // 품목별 비고
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({}); // 모달 상품 접기
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
        getSessionInfo().then(s => setBuyerEmail(s?.email ?? ''));
    }, [loadOrders]);

    // 검색은 제품 단위로: 이름/코드 매칭 또는 변형(사이즈·색상) 매칭 시 그 제품 전체를 매트릭스로 표시
    const groups = useMemo<CatalogGroup[]>(() => {
        const q = search.trim().toLowerCase();
        const byProduct = new Map<string, CatalogRow[]>();
        for (const r of catalog) {
            const arr = byProduct.get(r.productId) ?? [];
            arr.push(r); byProduct.set(r.productId, arr);
        }
        const out: CatalogGroup[] = [];
        for (const [pid, rows] of byProduct) {
            if (q && !(rows[0].productName.toLowerCase().includes(q) || pid.toLowerCase().includes(q)
                || rows.some(r => r.size.toLowerCase().includes(q) || r.color.toLowerCase().includes(q)))) continue;
            const sizes = sortSizes([...new Set(rows.map(r => r.size))]);
            const colors = [...new Set(rows.map(r => r.color))].sort((a, b) => variantColorRank(a) - variantColorRank(b) || a.localeCompare(b, 'ko'));
            const cell: Record<string, CatalogRow> = {};
            let totalStock = 0;
            for (const r of rows) { cell[`${r.size}|${r.color}`] = r; totalStock += r.stockQty; }
            out.push({ productId: pid, productName: rows[0].productName, sizes, colors, cell, totalStock });
        }
        return out;
    }, [catalog, search]);

    const setItemQty = (invId: string, value: number, max: number) => {
        const q = Math.max(0, Math.min(max, Math.floor(value) || 0));
        setQty(prev => ({ ...prev, [invId]: q }));
    };

    // 변형 선택(체크): 선택 시 수량 1로 담고, 수량 조절은 발주 품목 그리드에서. 품절은 제외.
    const selectCells = (rows: { inventoryId: string; stockQty: number }[]) => {
        setQty(prev => {
            const next = { ...prev };
            for (const r of rows) if (r.stockQty > 0 && !(next[r.inventoryId] > 0)) next[r.inventoryId] = 1;
            return next;
        });
    };
    const clearCells = (rows: { inventoryId: string }[]) => {
        setQty(prev => {
            const next = { ...prev };
            for (const r of rows) delete next[r.inventoryId];
            return next;
        });
    };

    // 담긴 품목 = qty 에 키가 있는 것(수량 0이어도 유지). 실제 제거는 ✕ 버튼(clearCells).
    const cart = useMemo(() =>
        catalog.filter(r => r.inventoryId in qty)
            .map(r => ({ row: r, q: qty[r.inventoryId] }))
            .sort((a, b) => compareVariant(a.row, b.row)),
        [catalog, qty]);
    const cartUnits = cart.reduce((s, x) => s + x.q, 0);
    const zeroItems = cart.filter(x => x.q <= 0);

    // 신청하기: 수량 0 품목이 있으면 모달로 차단, 없으면 확인 다이얼로그
    const handleSubmitClick = () => {
        if (cart.length === 0) return;
        if (zeroItems.length > 0) { setZeroWarn(true); return; }
        setConfirmOpen(true);
    };

    const doSubmit = async () => {
        setConfirmOpen(false);
        setSubmitting(true);
        const r = await placePurchaseOrder(
            cart.map(x => ({ inventoryId: x.row.inventoryId, quantity: x.q, remarks: lineRemarks[x.row.inventoryId] })),
            note.trim() || undefined);
        setSubmitting(false);
        if (!r.success) { showToast('error', '발주 신청에 실패했습니다. 재고를 확인해주세요.'); return; }
        showToast('success', '발주가 신청되었습니다.');
        setQty({}); setNote(''); setLineRemarks({}); loadOrders();
    };

    const doCancel = async () => {
        if (!cancelTarget) return;
        const target = cancelTarget;
        setCancelTarget(null);
        const r = await cancelMyPurchaseOrder(target.id);
        if (!r.success) { showToast('error', '발주 취소에 실패했습니다. 이미 접수되었을 수 있습니다.'); loadOrders(); return; }
        showToast('success', '발주가 취소되었습니다.');
        loadOrders();
    };

    const hiddenCount = orders.filter(o => o.buyerHidden).length;

    const filteredOrders = useMemo(() => {
        // 숨김 보기: 숨겨둔 발주만. 그 외: 숨김 제외 + 상태/기간 필터.
        if (showHidden) return orders.filter(o => o.buyerHidden);
        let list = orders.filter(o => !o.buyerHidden);
        if (statusFilter !== 'all') list = list.filter(o => o.status === statusFilter);
        if (range !== 'all') {
            const now = new Date();
            const cutoff = new Date(now);
            if (range === '3m') cutoff.setMonth(now.getMonth() - 3);
            else if (range === '1m') cutoff.setMonth(now.getMonth() - 1);
            else if (range === '1w') cutoff.setDate(now.getDate() - 7);
            else if (range === 'today') cutoff.setHours(0, 0, 0, 0);
            list = list.filter(o => o.createdAt && new Date(o.createdAt) >= cutoff);
        }
        return list;
    }, [orders, range, statusFilter, showHidden]);

    const doHide = async (o: PurchaseOrder, hidden: boolean) => {
        const r = await hidePurchaseOrder(o.id, hidden);
        if (!r.success) { showToast('error', hidden ? '숨김에 실패했습니다.' : '숨김 해제에 실패했습니다.'); return; }
        showToast('success', hidden ? '내 목록에서 숨겼습니다.' : '숨김을 해제했습니다.');
        loadOrders();
    };

    const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const NAV: { k: View; label: string }[] = [{ k: 'create', label: '발주서 작성' }, { k: 'history', label: '발주 내역' }];

    // 변형 선택 리스트 (모달 내부) — 상품 그룹 + 변형 1행씩(규격/재고/체크). 폭 꽉 채움·유연폭·임의 변형수 대응.
    const isSel = (id: string) => (qty[id] || 0) > 0;
    const renderMatrix = () => (
        loading ? (
            <div className="py-16 text-center text-slate-400 text-sm">상품을 불러오는 중…</div>
        ) : groups.length === 0 ? (
            <div className="px-3 py-12 text-center text-slate-400 text-sm">
                {catalog.length === 0 ? '배정된 제품이 없습니다. 관리자에게 문의하세요.' : '검색 결과가 없습니다.'}
            </div>
        ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {groups.map(g => {
                    const allCells = Object.values(g.cell);
                    const orderable = allCells.filter(r => r.stockQty > 0);
                    const selectedCount = allCells.filter(r => isSel(r.inventoryId)).length;
                    const allSelected = orderable.length > 0 && orderable.every(r => isSel(r.inventoryId));
                    // 색상 → 사이즈 순 변형 목록
                    const variants = g.colors.flatMap(c => g.sizes.map(s => g.cell[`${s}|${c}`]).filter(Boolean)) as CatalogRow[];
                    const stockText = (st: number) => st === 0
                        ? <span className="text-red-500 font-medium">품절</span>
                        : <span className={st <= 10 ? 'text-amber-600' : 'text-slate-400 dark:text-slate-500'}>재고 {st.toLocaleString()}</span>;
                    const isCol = !!collapsed[g.productId];
                    return (
                        <div key={g.productId} className="p-4">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                                <button onClick={() => setCollapsed(p => ({ ...p, [g.productId]: !p[g.productId] }))}
                                    className="flex items-center gap-2 text-left min-w-0">
                                    <span className={`text-slate-400 text-[10px] w-3 shrink-0 transition-transform duration-300 ${isCol ? '' : 'rotate-90'}`}>▶</span>
                                    <span className="font-semibold text-[15px] text-slate-900 dark:text-slate-100 truncate">{g.productName}</span>
                                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400 shrink-0">{g.productId}</span>
                                </button>
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-200">가용 {g.totalStock.toLocaleString()}</span>
                                {selectedCount > 0 && <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-medium dark:bg-blue-900/30 dark:text-blue-200">선택 {selectedCount}</span>}
                                <button onClick={() => allSelected ? clearCells(allCells) : selectCells(allCells)}
                                    className="ml-auto h-7 px-3 text-xs rounded-md border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 whitespace-nowrap">
                                    {allSelected ? '전체 해제' : '전체 선택'}
                                </button>
                            </div>
                            {/* 스르륵 접힘 — grid-template-rows 0fr↔1fr 트랜지션 */}
                            <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${isCol ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
                                <div className="overflow-hidden">
                                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 mt-2.5">
                                        {variants.map(row => {
                                            const soldOut = row.stockQty === 0;
                                            const sel = isSel(row.inventoryId);
                                            return (
                                                <label key={row.inventoryId}
                                                    className={`flex items-center gap-3 px-3 py-2 text-sm ${soldOut ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40'} ${sel ? 'bg-blue-50/60 dark:bg-blue-900/20' : ''}`}>
                                                    <input type="checkbox" disabled={soldOut} checked={sel}
                                                        onChange={() => setItemQty(row.inventoryId, sel ? 0 : 1, row.stockQty)}
                                                        className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-30" />
                                                    <span className="flex-1 min-w-0 text-slate-700 dark:text-slate-200 truncate">{specOf(row.size, row.color)}</span>
                                                    <span className="text-xs shrink-0">{stockText(row.stockQty)}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        )
    );

    return (
        <>
            {/* 토스트 */}
            {toast && (
                <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-lg shadow-lg text-sm text-white ${toast.kind === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.msg}
                </div>
            )}

            <div className="max-w-6xl mx-auto flex gap-5 px-1 pb-28">
                {/* 좌측 메뉴 */}
                <aside className="w-44 shrink-0 hidden md:block">
                    <nav className="sticky top-[4.75rem] space-y-0.5">
                        <p className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">발주 메뉴</p>
                        {NAV.map(it => (
                            <button key={it.k} onClick={() => setView(it.k)}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${view === it.k
                                    ? 'bg-blue-50 text-blue-700 font-semibold dark:bg-blue-900/30 dark:text-blue-200'
                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                                {it.label}
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* 메인 */}
                <main className="flex-1 min-w-0 space-y-4">
                    {/* 타이틀 바 */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">{view === 'create' ? '발주서 작성' : '발주 내역'}</h1>
                        {view === 'create' && <span className="px-2.5 py-0.5 text-xs font-semibold rounded bg-blue-600 text-white">발주서</span>}
                        {view === 'create' && (
                            <div className="ml-auto flex items-center gap-1 text-xs">
                                {STEPS.map((s, i) => (
                                    <React.Fragment key={s}>
                                        <span className={`px-2.5 py-1 rounded-md font-medium ${i === 0
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}>{s}</span>
                                        {i < STEPS.length - 1 && <span className="text-slate-300 dark:text-slate-600">→</span>}
                                    </React.Fragment>
                                ))}
                            </div>
                        )}
                    </div>

                    {view === 'create' ? (
                        <>
                            {/* 발주 정보 */}
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-2 text-sm">
                                    <div className="flex"><span className="w-20 shrink-0 text-slate-400">발주처</span><span className="text-slate-700 dark:text-slate-200 font-medium truncate">{buyerEmail || '—'}</span></div>
                                    <div className="flex"><span className="w-20 shrink-0 text-slate-400">발주일자</span><span className="text-slate-700 dark:text-slate-200">{today}</span></div>
                                </div>
                            </div>

                            {/* 발주 품목 그리드 */}
                            <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-700">
                                    <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm">
                                        발주 품목 <span className="text-blue-600">{cart.length}</span>
                                        {cart.length > 0 && <>
                                            <span className="text-slate-300 dark:text-slate-600 mx-1.5">·</span>
                                            총 <span className="text-blue-600">{cartUnits.toLocaleString()}</span>개
                                        </>}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {cart.length > 0 && <button onClick={() => { setQty({}); setLineRemarks({}); }} className="text-xs text-slate-400 hover:text-red-600">비우기</button>}
                                        <button onClick={() => setPickerOpen(true)}
                                            className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700">+ 상품 추가</button>
                                    </div>
                                </div>
                                {cart.length === 0 ? (
                                    <div className="py-14 text-center">
                                        <p className="text-sm text-slate-400">담은 품목이 없습니다.</p>
                                        <button onClick={() => setPickerOpen(true)} className="mt-2 text-sm text-blue-600 hover:underline">+ 상품 추가로 품목을 담아주세요</button>
                                    </div>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-300 text-left">
                                            <tr>
                                                <th className="px-3 py-2 font-medium">상품</th><th className="font-medium">규격</th>
                                                <th className="text-center w-20 font-medium">가용재고</th>
                                                <th className="text-center w-36 font-medium">수량</th>
                                                <th className="font-medium w-48">비고</th>
                                                <th className="w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cart.map((x, i) => (
                                                <tr key={x.row.inventoryId} className="border-t border-slate-100 dark:border-slate-800 align-middle">
                                                    <td className="px-3 py-1.5 text-slate-900 dark:text-slate-100">{x.row.productName}</td>
                                                    <td className="text-slate-600 dark:text-slate-300">{specOf(x.row.size, x.row.color)}</td>
                                                    <td className="text-center">
                                                        <span className={x.row.stockQty <= 10 ? 'text-amber-600' : 'text-slate-500 dark:text-slate-400'}>{x.row.stockQty.toLocaleString()}</span>
                                                    </td>
                                                    <td className="py-1">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button type="button" disabled={x.q <= 0} onClick={() => setItemQty(x.row.inventoryId, x.q - 1, x.row.stockQty)}
                                                                className="w-6 h-6 rounded border border-slate-300 dark:border-slate-600 text-slate-500 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700">−</button>
                                                            <input type="number" min="0" max={x.row.stockQty} value={x.q}
                                                                data-qty-idx={i}
                                                                onChange={e => setItemQty(x.row.inventoryId, parseInt(e.target.value), x.row.stockQty)}
                                                                onKeyDown={e => {
                                                                    if (e.key === 'Enter') {
                                                                        e.preventDefault();
                                                                        const next = document.querySelector<HTMLInputElement>(`input[data-qty-idx="${i + 1}"]`);
                                                                        if (next) { next.focus(); next.select(); }
                                                                        else (e.target as HTMLInputElement).blur();
                                                                    }
                                                                }}
                                                                className="w-12 h-7 px-1 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded text-center" />
                                                            <button type="button" disabled={x.q >= x.row.stockQty} onClick={() => setItemQty(x.row.inventoryId, x.q + 1, x.row.stockQty)}
                                                                className="w-6 h-6 rounded border border-slate-300 dark:border-slate-600 text-slate-500 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700">+</button>
                                                        </div>
                                                    </td>
                                                    <td className="pr-2 py-1">
                                                        <input value={lineRemarks[x.row.inventoryId] ?? ''}
                                                            onChange={e => setLineRemarks(p => ({ ...p, [x.row.inventoryId]: e.target.value }))}
                                                            placeholder="비고(선택)"
                                                            className="w-full h-7 px-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded text-sm" />
                                                    </td>
                                                    <td className="text-center">
                                                        <button onClick={() => { clearCells([{ inventoryId: x.row.inventoryId }]); setLineRemarks(p => { const n = { ...p }; delete n[x.row.inventoryId]; return n; }); }} className="text-slate-300 hover:text-red-600" title="품목 삭제">✕</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 font-semibold text-slate-700 dark:text-slate-200">
                                                <td colSpan={3} className="px-3 py-2 text-right">합계</td>
                                                <td className="text-center">{cartUnits.toLocaleString()}개</td>
                                                <td colSpan={2}></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                )}
                            </section>
                        </>
                    ) : (
                        /* 발주 내역 */
                        <section>
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                <div className="flex gap-1">
                                    {RANGES.map(r => (
                                        <button key={r.key} onClick={() => setRange(r.key)}
                                            className={`px-3 py-1 text-xs rounded ${range === r.key ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                                            {r.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    <button onClick={() => { setShowHidden(false); setStatusFilter('all'); }}
                                        className={`px-3 py-1 text-xs rounded ${!showHidden && statusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>전체</button>
                                    {ORDER_STATUSES.map(s => (
                                        <button key={s} onClick={() => { setShowHidden(false); setStatusFilter(s); }}
                                            className={`px-3 py-1 text-xs rounded ${!showHidden && statusFilter === s ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                                            {buyerOrderStatusMap[s]}
                                        </button>
                                    ))}
                                    {(hiddenCount > 0 || showHidden) && (
                                        <button onClick={() => setShowHidden(h => !h)}
                                            className={`px-3 py-1 text-xs rounded border ${showHidden ? 'bg-slate-700 text-white border-slate-700' : 'border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                                            숨긴 발주 {hiddenCount}
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                {filteredOrders.map(o => (
                                    <div key={o.id} role="button" tabIndex={0}
                                        onClick={() => setDetailOrder(o)}
                                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetailOrder(o); } }}
                                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition cursor-pointer">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <button
                                                    onClick={e => { e.stopPropagation(); setOrdCollapsed(p => ({ ...p, [o.id]: !p[o.id] })); }}
                                                    onKeyDown={e => e.stopPropagation()}
                                                    title={ordCollapsed[o.id] ? '펼치기' : '접기'} aria-label="접기/펼치기"
                                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs leading-none">
                                                    <span className={`inline-block transition-transform ${ordCollapsed[o.id] ? '' : 'rotate-90'}`}>▶</span>
                                                </button>
                                                <span className="font-mono text-slate-500">{o.poNo}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-slate-400">{o.createdAt ? o.createdAt.slice(0, 10) : ''}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[o.status]}`}>{buyerOrderStatusMap[o.status]}</span>
                                                {o.status === 'requested' && (
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setCancelTarget(o); }}
                                                        onKeyDown={e => e.stopPropagation()}
                                                        className="text-xs px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-red-600 hover:border-red-300 dark:hover:border-red-700 transition-colors">
                                                        발주 취소
                                                    </button>
                                                )}
                                                {o.status === 'canceled' && (
                                                    <button
                                                        onClick={e => { e.stopPropagation(); doHide(o, !o.buyerHidden); }}
                                                        onKeyDown={e => e.stopPropagation()}
                                                        className="text-xs px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-500 transition-colors">
                                                        {o.buyerHidden ? '숨김 해제' : '숨기기'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {ordCollapsed[o.id] ? (
                                            <div className="mt-1 text-xs text-slate-400">
                                                {(o.items ?? []).length}품목 · {(o.items ?? []).reduce((s, it) => s + it.quantity, 0)}개
                                            </div>
                                        ) : (
                                            <table className="w-full mt-2 text-xs table-fixed">
                                                <colgroup>
                                                    <col className="w-[34%]" />
                                                    <col className="w-[16%]" />
                                                    <col className="w-[14%]" />
                                                    <col className="w-[12%]" />
                                                    <col className="w-[24%]" />
                                                </colgroup>
                                                <thead>
                                                    <tr className="text-slate-400 text-left border-b border-slate-100 dark:border-slate-700">
                                                        <th className="font-normal py-1 pr-2">품목</th>
                                                        <th className="font-normal py-1 pr-2">컬러</th>
                                                        <th className="font-normal py-1 pr-2">사이즈</th>
                                                        <th className="font-normal py-1 pr-2 text-right">수량</th>
                                                        <th className="font-normal py-1">비고</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {[...(o.items ?? [])].sort(compareVariant).map(it => (
                                                        <tr key={it.id} className="text-slate-700 dark:text-slate-300 border-b border-slate-50 dark:border-slate-800/60 last:border-0">
                                                            <td className="py-1 pr-2 truncate">{it.productName}</td>
                                                            <td className="py-1 pr-2 truncate">{it.color}</td>
                                                            <td className="py-1 pr-2 truncate">{it.size}</td>
                                                            <td className="py-1 pr-2 text-right">{it.quantity}</td>
                                                            <td className="py-1 text-slate-500 truncate">{it.remarks || '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                ))}
                                {filteredOrders.length === 0 && (
                                    <div className="text-center py-10">
                                        <p className="text-slate-400 text-sm">발주 내역이 없습니다.</p>
                                        <button onClick={() => setView('create')} className="mt-2 text-sm text-blue-600 hover:underline">상품을 담아 첫 발주를 시작해보세요 →</button>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}
                </main>
            </div>

            {/* 상품 추가 모달 (매트릭스) */}
            {pickerOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4" onClick={() => setPickerOpen(false)}>
                    <div className="bg-white dark:bg-slate-800 w-full sm:max-w-3xl sm:rounded-xl shadow-xl max-h-[92vh] sm:max-h-[88vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                            <span className="font-semibold text-slate-800 dark:text-slate-100 shrink-0">상품 선택</span>
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="상품명 · 규격 · 코드 검색"
                                className="flex-1 min-w-0 px-3 py-1.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-md text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none" />
                            <button onClick={() => setPickerOpen(false)} className="shrink-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xl leading-none">×</button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {renderMatrix()}
                        </div>
                        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-700">
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                                선택 <strong className="text-slate-800 dark:text-slate-100">{cart.length}</strong>건 <span className="text-slate-400">· 수량은 발주 품목에서 조절</span>
                            </span>
                            <button onClick={() => setPickerOpen(false)}
                                className="px-5 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700">담기 완료</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 하단 고정 신청 바 (작성 화면) */}
            {view === 'create' && (
                <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-700 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
                    <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
                        <div className="text-sm whitespace-nowrap">
                            <span className="text-slate-500">선택</span> <strong className="text-slate-900 dark:text-slate-100">{cart.length}</strong>건
                            <span className="text-slate-300 mx-1">·</span>
                            <strong className="text-slate-900 dark:text-slate-100">{cartUnits.toLocaleString()}</strong>개
                        </div>
                        <input value={note} onChange={e => setNote(e.target.value)} placeholder="주문메모(선택)"
                            className="flex-1 min-w-0 px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-md text-sm" />
                        <button onClick={handleSubmitClick} disabled={submitting || cart.length === 0}
                            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium whitespace-nowrap">
                            {submitting ? '신청 중…' : '신청하기'}
                        </button>
                    </div>
                </div>
            )}

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

            <ConfirmDialog
                isOpen={!!cancelTarget}
                variant="danger"
                title="발주 취소"
                message={`${cancelTarget?.poNo ?? ''} 발주를 취소할까요? 신청 단계에서만 취소되며, 되돌릴 수 없습니다.`}
                confirmText="발주 취소"
                cancelText="닫기"
                onConfirm={doCancel}
                onCancel={() => setCancelTarget(null)}
            />

            {zeroWarn && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setZeroWarn(false)}>
                    <div className="absolute inset-0 bg-black/50" />
                    <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-sm w-full p-5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600 dark:text-red-300 text-xl font-bold">!</div>
                            <div className="min-w-0">
                                <h3 className="font-semibold text-slate-900 dark:text-slate-100">발주 신청할 수 없습니다</h3>
                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">수량이 0인 품목이 있습니다. 수량을 입력하거나 해당 품목을 삭제(✕)한 뒤 다시 신청해주세요.</p>
                                <ul className="mt-2 text-sm text-slate-500 dark:text-slate-400 space-y-0.5 max-h-40 overflow-y-auto">
                                    {zeroItems.map(x => <li key={x.row.inventoryId}>· {x.row.productName} {specOf(x.row.size, x.row.color)}</li>)}
                                </ul>
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button onClick={() => setZeroWarn(false)} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">확인</button>
                        </div>
                    </div>
                </div>
            )}

            <PurchaseOrderDetailModal order={detailOrder} onClose={() => setDetailOrder(null)} />
        </>
    );
}

export default function PortalPage() {
    return <RequireRole role="buyer"><PortalInner /></RequireRole>;
}
