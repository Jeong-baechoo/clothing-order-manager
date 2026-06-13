'use client';

// 관리자 — 제품 발주처 배정 + 변형(사이즈·색상) 재고 관리 (T4.2, T4.3)
// 기존 /companies(제품관리)는 건드리지 않고 별도 페이지로 운영.

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import RequireRole from '../../components/auth/RequireRole';
import {
    getAdminProducts, getBuyers, setProductBuyer,
    getInventory, upsertInventory, deleteInventory,
    type AdminProduct,
} from '../../lib/b2b';
import type { Buyer, ProductInventory } from '../../models/orderTypes';

function InventoryInner() {
    const [products, setProducts] = useState<AdminProduct[]>([]);
    const [buyers, setBuyers] = useState<Buyer[]>([]);
    const [selected, setSelected] = useState<AdminProduct | null>(null);
    const [inv, setInv] = useState<ProductInventory[]>([]);
    const [form, setForm] = useState({ size: '', color: '', stockQty: '', remarks: '' });

    const loadProducts = useCallback(() => { getAdminProducts().then(setProducts); }, []);
    useEffect(() => { loadProducts(); getBuyers().then(setBuyers); }, [loadProducts]);

    const loadInv = useCallback((productId: string) => { getInventory(productId).then(setInv); }, []);
    useEffect(() => { if (selected) loadInv(selected.id); else setInv([]); }, [selected, loadInv]);

    const buyerName = (id: string | null) => id ? (buyers.find(b => b.id === id)?.name ?? '(알 수 없음)') : '미배정';

    const handleAssign = async (buyerId: string) => {
        if (!selected) return;
        await setProductBuyer(selected.id, buyerId || null);
        loadProducts();
        setSelected({ ...selected, buyerId: buyerId || null });
    };

    const handleAddInv = async () => {
        if (!selected || !form.size.trim() || !form.color.trim()) return;
        const ok = await upsertInventory({
            productId: selected.id, size: form.size.trim(), color: form.color.trim(),
            stockQty: Math.max(0, parseInt(form.stockQty) || 0), remarks: form.remarks.trim() || undefined,
        });
        if (ok) { setForm({ size: '', color: '', stockQty: '', remarks: '' }); loadInv(selected.id); }
    };

    return (
        <div className="max-w-5xl mx-auto p-6">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">제품 배정 · 재고</h1>
                <nav className="text-sm space-x-3">
                    <Link href="/b2b/buyers" className="text-blue-600 hover:underline">발주처</Link>
                    <Link href="/b2b/orders" className="text-blue-600 hover:underline">발주 접수</Link>
                </nav>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* 제품 목록 */}
                <div className="col-span-1 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-300">제품</div>
                    <ul className="max-h-[28rem] overflow-y-auto">
                        {products.map(p => (
                            <li key={p.id}>
                                <button onClick={() => setSelected(p)}
                                    className={`w-full text-left px-3 py-2 text-sm border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 ${selected?.id === p.id ? 'bg-blue-50 dark:bg-gray-700' : ''}`}>
                                    <span className="text-gray-900 dark:text-gray-100">{p.name}</span>
                                    <span className="block text-xs text-gray-400">{buyerName(p.buyerId)}</span>
                                </button>
                            </li>
                        ))}
                        {products.length === 0 && <li className="px-3 py-6 text-center text-gray-400 text-sm">제품 없음</li>}
                    </ul>
                </div>

                {/* 선택 제품 상세 */}
                <div className="col-span-2">
                    {!selected ? (
                        <div className="h-full flex items-center justify-center text-gray-400 text-sm">제품을 선택하세요.</div>
                    ) : (
                        <div className="space-y-5">
                            <div>
                                <h2 className="font-semibold text-gray-900 dark:text-gray-100">{selected.name}</h2>
                                <div className="mt-2 flex items-center gap-2 text-sm">
                                    <span className="text-gray-500">발주처 배정</span>
                                    <select value={selected.buyerId ?? ''} onChange={e => handleAssign(e.target.value)}
                                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded">
                                        <option value="">미배정 (고객주문용)</option>
                                        {buyers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* 재고 추가 */}
                            <div className="flex gap-2 items-end">
                                <input value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} placeholder="사이즈"
                                    className="w-20 px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm" />
                                <input value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} placeholder="색상"
                                    className="w-24 px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm" />
                                <input value={form.stockQty} onChange={e => setForm({ ...form, stockQty: e.target.value })} placeholder="수량" type="number" min="0"
                                    className="w-20 px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm" />
                                <input value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} placeholder="비고"
                                    className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm" />
                                <button onClick={handleAddInv}
                                    className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700">저장</button>
                            </div>

                            {/* 재고 목록 */}
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500">
                                        <th className="py-2">사이즈</th><th>색상</th><th>재고</th><th>비고</th><th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inv.map(v => (
                                        <tr key={v.id} className="border-b border-gray-100 dark:border-gray-800">
                                            <td className="py-2 text-gray-900 dark:text-gray-100">{v.size}</td>
                                            <td className="text-gray-700 dark:text-gray-300">{v.color}</td>
                                            <td>
                                                <input type="number" min="0" defaultValue={v.stockQty}
                                                    onBlur={async e => {
                                                        const q = Math.max(0, parseInt(e.target.value) || 0);
                                                        if (q !== v.stockQty) { await upsertInventory({ productId: v.productId, size: v.size, color: v.color, stockQty: q, remarks: v.remarks }); loadInv(selected.id); }
                                                    }}
                                                    className="w-16 px-1 py-0.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-center" />
                                            </td>
                                            <td className="text-gray-500">{v.remarks ?? ''}</td>
                                            <td className="text-right">
                                                <button onClick={async () => { await deleteInventory(v.id); loadInv(selected.id); }}
                                                    className="text-xs text-gray-400 hover:text-red-600">삭제</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {inv.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-gray-400">변형 재고 없음</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function InventoryPage() {
    return <RequireRole role="admin" title="제품·재고"><InventoryInner /></RequireRole>;
}
