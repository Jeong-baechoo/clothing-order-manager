'use client';

// 관리자 — 발주처 카탈로그 관리 (발주처 중심 일괄 배정 + 변형 매트릭스). T4.2, T4.3 / spec 002
// ① 발주처를 먼저 고르고 → 제품/카테고리를 체크박스로 한 번에 배정 (제품 단위 반복 제거)
// ② 변형 재고는 행별 매트릭스 모달로 입력 (공유 재고 — 제품당 1세트)
// 배정은 buyer_products(M:N): 한 제품을 여러 발주처에 배정 가능. 기존 /companies(제품관리)는 무변경.

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import RequireRole from '../../components/auth/RequireRole';
import B2bTabs from '../../components/b2b/B2bTabs';
import VariantEditorModal from '../../components/b2b/VariantEditorModal';
import {
    getAdminProducts, getBuyers, getCategories, getCompanyOptions, getInventorySummary,
    getBuyerProductMap, addBuyerProducts, removeBuyerProducts,
    type AdminProduct, type StockSummary, type CategoryOption, type CompanyOption,
} from '../../lib/b2b';
import type { Buyer } from '../../models/orderTypes';

function InventoryInner() {
    const [products, setProducts] = useState<AdminProduct[]>([]);
    const [buyers, setBuyers] = useState<Buyer[]>([]);
    const [categories, setCategories] = useState<CategoryOption[]>([]);
    const [companies, setCompanies] = useState<CompanyOption[]>([]);
    const [summary, setSummary] = useState<Record<string, StockSummary>>({});
    const [buyerMap, setBuyerMap] = useState<Record<string, string[]>>({}); // productId → buyerId[]

    const [buyerId, setBuyerId] = useState('');           // 선택된 발주처
    const [checked, setChecked] = useState<Set<string>>(new Set()); // 이 발주처에 배정할 제품(편집중)
    const [search, setSearch] = useState('');
    const [catFilter, setCatFilter] = useState('');
    const [companyFilter, setCompanyFilter] = useState('');
    const [editing, setEditing] = useState<AdminProduct | null>(null);
    const [saving, setSaving] = useState(false);

    const loadProducts = useCallback(() => getAdminProducts().then(setProducts), []);
    const loadSummary = useCallback(() => getInventorySummary().then(setSummary), []);
    const loadMap = useCallback(() => getBuyerProductMap().then(setBuyerMap), []);
    useEffect(() => {
        loadProducts(); loadSummary(); loadMap();
        getBuyers().then(setBuyers);
        getCategories().then(setCategories);
        getCompanyOptions().then(setCompanies);
    }, [loadProducts, loadSummary, loadMap]);

    // 발주처 선택/배정변경 시 체크 상태를 '현재 그 발주처에 배정된 제품'으로 초기화
    const resetChecked = useCallback((bid: string, map: Record<string, string[]>) => {
        setChecked(new Set(Object.keys(map).filter(pid => map[pid].includes(bid))));
    }, []);
    useEffect(() => { if (buyerId) resetChecked(buyerId, buyerMap); else setChecked(new Set()); }, [buyerId, buyerMap, resetChecked]);

    const buyerName = (id: string) => buyers.find(b => b.id === id)?.name ?? '(알 수 없음)';

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return products.filter(p =>
            (!catFilter || p.categoryId === catFilter) &&
            (!companyFilter || p.companyId === companyFilter) &&
            (!q || p.name.toLowerCase().includes(q)));
    }, [products, search, catFilter, companyFilter]);

    // 원래 배정 집합 vs 현재 체크 → 변경분 계산
    const original = useMemo(
        () => new Set(Object.keys(buyerMap).filter(pid => buyerMap[pid].includes(buyerId))),
        [buyerMap, buyerId]);
    const toAssign = useMemo(() => [...checked].filter(id => !original.has(id)), [checked, original]);
    const toUnassign = useMemo(() => [...original].filter(id => !checked.has(id)), [original, checked]);
    const pendingCount = toAssign.length + toUnassign.length;

    // 선택 발주처 요약 (배정/발주가능/숨김)
    const assignedIds = [...original];
    const hiddenCount = assignedIds.filter(id => !summary[id]).length; // 변형 미등록 = 포털에 안 보임
    const visibleCount = assignedIds.length - hiddenCount;

    const toggle = (id: string) => setChecked(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });
    const bulkAll = (on: boolean) => setChecked(prev => {
        const next = new Set(prev);
        for (const p of filtered) { if (on) next.add(p.id); else next.delete(p.id); }
        return next;
    });

    const save = async () => {
        setSaving(true);
        const ok1 = await addBuyerProducts(buyerId, toAssign);
        const ok2 = await removeBuyerProducts(buyerId, toUnassign);
        setSaving(false);
        if (!ok1 || !ok2) { alert('배정 저장에 실패했습니다.'); return; }
        await loadMap();
    };

    const stockBadge = (id: string) => {
        const s = summary[id];
        if (!s) return null;
        return s.zero > 0
            ? <span className="px-1.5 py-0.5 rounded text-[11px] bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">품절 {s.zero}</span>
            : <span className="text-[11px] text-gray-400">{s.total.toLocaleString()}개</span>;
    };

    return (
        <div className="max-w-5xl mx-auto p-6">
            <B2bTabs title="발주처 카탈로그" />

            {/* 발주처 선택 + 요약 */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
                <select value={buyerId} onChange={e => setBuyerId(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm font-medium">
                    <option value="">발주처 선택…</option>
                    {buyers.map(b => <option key={b.id} value={b.id}>{b.name}{b.active ? '' : ' (비활성)'}</option>)}
                </select>
                {buyerId && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        배정 <b className="text-gray-800 dark:text-gray-200">{assignedIds.length}</b> ·
                        발주가능 <b className="text-green-600">{visibleCount}</b>
                        {hiddenCount > 0 && <> · <span className="text-amber-600">숨김 {hiddenCount}⚠</span></>}
                    </div>
                )}
            </div>

            {!buyerId ? (
                <div className="min-h-[12rem] flex items-center justify-center text-gray-400 text-sm border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                    발주처를 선택하면 배정할 제품을 고를 수 있습니다.
                </div>
            ) : (
                <>
                    {/* 도구막대 */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}
                            className="px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm">
                            <option value="">전체 사입처</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                            className="px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm">
                            <option value="">전체 카테고리</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="제품 검색…"
                            className="px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm flex-1 min-w-[8rem]" />
                        <button onClick={() => bulkAll(true)}
                            className="px-2.5 py-1.5 text-sm rounded border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                            {catFilter || companyFilter ? '필터된 항목 전체 선택' : '보이는 항목 전체 선택'} ({filtered.length})
                        </button>
                        <button onClick={() => bulkAll(false)}
                            className="px-2.5 py-1.5 text-sm rounded border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                            선택 해제
                        </button>
                    </div>

                    {/* 변경 저장 바 */}
                    <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {pendingCount === 0 ? '변경 없음'
                                : <>변경 <b className="text-blue-600">{pendingCount}</b>건 (배정 +{toAssign.length} · 해제 −{toUnassign.length})</>}
                        </span>
                        <div className="flex gap-2">
                            <button onClick={() => resetChecked(buyerId, buyerMap)} disabled={pendingCount === 0}
                                className="px-3 py-1.5 text-sm rounded border border-gray-200 dark:border-gray-600 text-gray-500 disabled:opacity-40">되돌리기</button>
                            <button onClick={save} disabled={pendingCount === 0 || saving}
                                className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-40">
                                {saving ? '저장 중…' : '변경 저장'}
                            </button>
                        </div>
                    </div>

                    {/* 제품 목록 */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500 bg-gray-50 dark:bg-gray-800">
                                    <th className="py-2.5 px-3 w-10"></th><th className="px-2">제품</th>
                                    <th className="px-2">사입처</th><th className="px-2">카테고리</th><th className="px-2">재고</th>
                                    <th className="px-2">현재 배정</th><th className="px-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(p => {
                                    const isChecked = checked.has(p.id);
                                    const assignedTo = buyerMap[p.id] ?? [];
                                    const others = assignedTo.filter(bid => bid !== buyerId);
                                    const hiddenWarn = isChecked && !summary[p.id];
                                    return (
                                        <tr key={p.id} className={`border-b border-gray-100 dark:border-gray-800 last:border-0 ${isChecked ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                            <td className="py-2 px-3">
                                                <input type="checkbox" checked={isChecked} onChange={() => toggle(p.id)}
                                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                            </td>
                                            <td className="px-2 text-gray-900 dark:text-gray-100">
                                                {p.name}
                                                {hiddenWarn && <span className="ml-1.5 text-[11px] text-amber-600">⚠ 변형 미등록 → 발주처에 안 보임</span>}
                                            </td>
                                            <td className="px-2 text-gray-500">{p.companyName ?? '—'}</td>
                                            <td className="px-2 text-gray-500">{p.categoryName ?? '—'}</td>
                                            <td className="px-2">{stockBadge(p.id) ?? <span className="text-[11px] text-gray-300 dark:text-gray-600">미등록</span>}</td>
                                            <td className="px-2">
                                                <div className="flex flex-wrap gap-1 items-center">
                                                    {assignedTo.includes(buyerId) && <span className="text-[11px] text-green-600">이 발주처</span>}
                                                    {others.map(bid => (
                                                        <span key={bid} className="px-1.5 py-0.5 rounded text-[11px] bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">{buyerName(bid)}</span>
                                                    ))}
                                                    {assignedTo.length === 0 && <span className="text-[11px] text-gray-300 dark:text-gray-600">미배정</span>}
                                                </div>
                                            </td>
                                            <td className="px-3 text-right">
                                                <button onClick={() => setEditing(p)}
                                                    className="text-xs text-blue-600 hover:underline">변형 편집</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filtered.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-gray-400">{search || catFilter || companyFilter ? '해당 제품 없음' : '제품 없음'}</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {editing && (
                <VariantEditorModal
                    product={editing} allProducts={products}
                    onClose={() => setEditing(null)}
                    onSaved={loadSummary}
                />
            )}
        </div>
    );
}

export default function InventoryPage() {
    return <RequireRole role="admin" title="제품·재고"><InventoryInner /></RequireRole>;
}
