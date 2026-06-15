'use client';

// 변형(사이즈×색상) 재고 매트릭스 편집 모달
// ② 매트릭스 입력: 사이즈/색상을 '칩'으로 클릭 → 격자로 재고 입력 (오타·중복 방지, 행 노가다 제거)
//    칩 후보 = 기본값 ∪ DB에 실제 쓰인 값(학습) ∪ 현재 제품의 기존 변형. 새 값만 직접 추가.
// ③ 변형 구성 복사: 다른 제품의 사이즈·색상 구성을 불러와 시작점으로 사용

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    getInventory, getDistinctVariantValues, upsertInventory, upsertInventoryBatch, deleteInventory,
    type AdminProduct,
} from '../../lib/b2b';
import type { ProductInventory } from '../../models/orderTypes';

const DEFAULT_SIZES = ['S', 'M', 'L', 'XL', '2XL', 'FREE'];
const DEFAULT_COLORS = ['블랙', '화이트', '그레이', '네이비', '베이지'];
const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', 'XXXL', '3XL', '4XL', 'FREE', 'F'];

function sortSizes(arr: string[]): string[] {
    return [...arr].sort((a, b) => {
        const ia = SIZE_ORDER.indexOf(a.toUpperCase()), ib = SIZE_ORDER.indexOf(b.toUpperCase());
        if (ia < 0 && ib < 0) return a.localeCompare(b);
        if (ia < 0) return 1;
        if (ib < 0) return -1;
        return ia - ib;
    });
}
const sizeRank = (s: string) => { const i = SIZE_ORDER.indexOf(s.toUpperCase()); return i < 0 ? 999 : i; };
const uniq = (arr: string[]) => Array.from(new Set(arr));
// 대소문자 무시 중복 제거. 앞에 오는 값(우선순위 높음)의 표기를 채택 → 'S'/'s'를 하나로.
const dedupCI = (arr: string[]) => {
    const seen = new Set<string>(); const out: string[] = [];
    for (const v of arr) { const k = v.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push(v); } }
    return out;
};

export default function VariantEditorModal({ product, allProducts, onClose, onSaved }: {
    product: AdminProduct;
    allProducts: AdminProduct[];
    onClose: () => void;
    onSaved: () => void;
}) {
    const [inv, setInv] = useState<ProductInventory[]>([]);
    const [learned, setLearned] = useState<{ sizes: string[]; colors: string[] }>({ sizes: [], colors: [] });
    const [selSizes, setSelSizes] = useState<string[]>([]);
    const [selColors, setSelColors] = useState<string[]>([]);
    const [qty, setQty] = useState<Record<string, string>>({});
    const [customSize, setCustomSize] = useState('');
    const [customColor, setCustomColor] = useState('');
    const [copyFrom, setCopyFrom] = useState('');
    const [saving, setSaving] = useState(false);

    const load = useCallback(() => {
        getInventory(product.id).then(rows => {
            setInv(rows);
            // 기존 변형을 격자에 미리 채움 → 열면 바로 편집 가능
            setSelSizes(sortSizes(uniq(rows.map(r => r.size))));
            setSelColors(uniq(rows.map(r => r.color)));
            const q: Record<string, string> = {};
            for (const r of rows) q[`${r.size}|${r.color}`] = String(r.stockQty);
            setQty(q);
        });
    }, [product.id]);
    useEffect(() => { load(); getDistinctVariantValues().then(setLearned); }, [load]);

    // 칩 후보: 현재선택(=DB 실제값) → 학습 → 기본 순으로 우선. 대소문자 무시 중복 제거('S'/'s' 통합).
    const candSizes = useMemo(() => sortSizes(dedupCI([...selSizes, ...learned.sizes, ...DEFAULT_SIZES])), [learned.sizes, selSizes]);
    const candColors = useMemo(() => dedupCI([...selColors, ...learned.colors, ...DEFAULT_COLORS]), [learned.colors, selColors]);

    const toggleSize = (s: string) => setSelSizes(prev => prev.includes(s) ? prev.filter(x => x !== s) : sortSizes([...prev, s]));
    const toggleColor = (c: string) => setSelColors(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
    const addCustom = (kind: 'size' | 'color') => {
        const v = (kind === 'size' ? customSize : customColor).trim();
        if (!v) return;
        if (kind === 'size') { setSelSizes(prev => prev.includes(v) ? prev : sortSizes([...prev, v])); setCustomSize(''); }
        else { setSelColors(prev => prev.includes(v) ? prev : [...prev, v]); setCustomColor(''); }
    };

    const handleCopyFrom = async (srcId: string) => {
        setCopyFrom(srcId);
        if (!srcId) return;
        const src = await getInventory(srcId);
        setSelSizes(sortSizes(uniq(src.map(v => v.size))));
        setSelColors(uniq(src.map(v => v.color)));
        // 재고는 0으로 시작 (구성만 복사)
        setQty(prev => {
            const next = { ...prev };
            for (const s of src.map(v => v.size)) for (const c of src.map(v => v.color)) next[`${s}|${c}`] ??= '0';
            return next;
        });
    };

    const setCell = (key: string, val: string) => setQty(prev => ({ ...prev, [key]: val.replace(/[^0-9]/g, '') }));

    const hasMatrix = selSizes.length > 0 && selColors.length > 0;
    const saveMatrix = async () => {
        if (!hasMatrix) return;
        setSaving(true);
        const rows = selSizes.flatMap(s => selColors.map(c => ({
            productId: product.id, size: s, color: c, stockQty: parseInt(qty[`${s}|${c}`]) || 0,
        })));
        const ok = await upsertInventoryBatch(rows);
        setSaving(false);
        if (ok) { setCopyFrom(''); load(); onSaved(); }
        else alert('재고 저장에 실패했습니다.');
    };

    const totalStock = inv.reduce((s, v) => s + v.stockQty, 0);
    const otherProducts = allProducts.filter(p => p.id !== product.id);

    // 색상 → 사이즈 정렬: 매트릭스 색상 행 / 현재 변형 목록
    const displayColors = useMemo(() => [...selColors].sort((a, b) => a.localeCompare(b, 'ko')), [selColors]);
    const invSorted = useMemo(() => [...inv].sort((a, b) =>
        a.color.localeCompare(b.color, 'ko') || sizeRank(a.size) - sizeRank(b.size) || a.size.localeCompare(b.size)), [inv]);

    const chip = (label: string, on: boolean, onClick: () => void) => (
        <button key={label} onClick={onClick}
            className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${on
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-blue-400'}`}>
            {label}
        </button>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                {/* 헤더 */}
                <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-5 py-3 flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold text-gray-900 dark:text-gray-100">{product.name}</h2>
                        <span className="text-xs text-gray-400">변형 {inv.length}개 · 총재고 {totalStock.toLocaleString()}개</span>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xl leading-none">×</button>
                </div>

                <div className="p-5 space-y-5">
                    {/* 칩 선택 + 매트릭스 */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">변형 선택 → 격자로 재고 입력</h3>
                            {otherProducts.length > 0 && (
                                <select value={copyFrom} onChange={e => handleCopyFrom(e.target.value)}
                                    className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded">
                                    <option value="">구성 복사…</option>
                                    {otherProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            )}
                        </div>

                        {/* 색상 칩 (1행) */}
                        <div>
                            <span className="block text-[11px] text-gray-400 mb-1.5">색상</span>
                            <div className="flex flex-wrap gap-1.5 items-center">
                                {candColors.map(c => chip(c, selColors.includes(c), () => toggleColor(c)))}
                                <span className="inline-flex items-center gap-1">
                                    <input value={customColor} onChange={e => setCustomColor(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom('color'); } }}
                                        placeholder="직접추가" className="w-20 px-2 py-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-xs" />
                                    <button onClick={() => addCustom('color')} className="text-gray-400 hover:text-blue-600 text-sm">+</button>
                                </span>
                            </div>
                        </div>

                        {/* 사이즈 칩 (2행) */}
                        <div>
                            <span className="block text-[11px] text-gray-400 mb-1.5">사이즈</span>
                            <div className="flex flex-wrap gap-1.5 items-center">
                                {candSizes.map(s => chip(s, selSizes.includes(s), () => toggleSize(s)))}
                                <span className="inline-flex items-center gap-1">
                                    <input value={customSize} onChange={e => setCustomSize(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom('size'); } }}
                                        placeholder="직접추가" className="w-20 px-2 py-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-xs" />
                                    <button onClick={() => addCustom('size')} className="text-gray-400 hover:text-blue-600 text-sm">+</button>
                                </span>
                            </div>
                        </div>

                        {/* 격자 */}
                        {hasMatrix ? (
                            <div className="overflow-x-auto pt-1">
                                <table className="text-sm border-collapse">
                                    <thead>
                                        <tr>
                                            <th className="p-1.5 text-left text-gray-400 text-xs">색상 \ 사이즈</th>
                                            {selSizes.map(s => <th key={s} className="p-1.5 text-center text-gray-600 dark:text-gray-300 font-medium">{s}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayColors.map(c => (
                                            <tr key={c}>
                                                <td className="p-1.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">{c}</td>
                                                {selSizes.map(s => (
                                                    <td key={s} className="p-1">
                                                        <input value={qty[`${s}|${c}`] ?? '0'} onChange={e => setCell(`${s}|${c}`, e.target.value)}
                                                            inputMode="numeric"
                                                            className="w-14 px-1 py-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-center" />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="mt-3 flex justify-end">
                                    <button onClick={saveMatrix} disabled={saving}
                                        className="px-4 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-60">
                                        {saving ? '저장 중…' : `${selSizes.length * selColors.length}개 변형 저장`}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 pt-1">사이즈와 색상을 하나 이상 선택하면 격자가 나타납니다.</p>
                        )}
                    </div>

                    {/* 현재 변형 목록 (정밀 수정·삭제) */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">현재 변형 ({inv.length})</h3>
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500 bg-gray-50 dark:bg-gray-800">
                                        <th className="py-2 px-3">색상</th><th className="px-2">사이즈</th><th className="px-2">재고</th><th className="px-2">비고</th><th className="px-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invSorted.map(v => (
                                        <tr key={v.id} className={`border-b border-gray-100 dark:border-gray-800 last:border-0 ${v.stockQty === 0 ? 'bg-red-50/60 dark:bg-red-900/10' : ''}`}>
                                            <td className="py-2 px-3 text-gray-900 dark:text-gray-100">{v.color}</td>
                                            <td className="px-2 text-gray-700 dark:text-gray-300">{v.size}</td>
                                            <td className="px-2">
                                                <input type="number" min="0" defaultValue={v.stockQty}
                                                    onBlur={async e => {
                                                        const q = Math.max(0, parseInt(e.target.value) || 0);
                                                        if (q !== v.stockQty) { await upsertInventory({ productId: v.productId, size: v.size, color: v.color, stockQty: q, remarks: v.remarks }); load(); onSaved(); }
                                                    }}
                                                    className={`w-16 px-1 py-0.5 border rounded text-center dark:bg-gray-700 dark:text-gray-100 ${v.stockQty === 0 ? 'border-red-300 text-red-600 dark:border-red-700' : 'border-gray-200 dark:border-gray-600'}`} />
                                                {v.stockQty === 0 && <span className="ml-1.5 text-[11px] text-red-600">품절</span>}
                                            </td>
                                            <td className="px-2 text-gray-500">{v.remarks ?? ''}</td>
                                            <td className="px-3 text-right">
                                                <button onClick={async () => {
                                                    const r = await deleteInventory(v.id);
                                                    if (!r.success) { alert(r.error); return; }
                                                    load(); onSaved();
                                                }}
                                                    className="text-xs text-gray-400 hover:text-red-600">삭제</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {inv.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-gray-400">변형 없음 — 위에서 사이즈·색상을 골라 등록하세요.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
