'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { DefectLog } from '../models/orderTypes';
import { getDefectLogs, addDefectLog, deleteDefectLog } from '../lib/supabase';
import ProductSelectionModal from '../components/order/ProductSelectionModal';

// KST 기준 오늘 날짜 (YYYY-MM-DD)
const kstToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });

// 담당자 목록 (고정)
const STAFF = ['김건호', '김창현', '장민경'];

interface Draft {
    logDate: string;
    productId?: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    remarks: string;
    personInCharge: string;
}

const emptyDraft = (): Draft => ({
    logDate: kstToday(),
    productId: undefined,
    productName: '',
    unitPrice: 0,
    quantity: 0,
    remarks: '',
    personInCharge: '',
});

export default function LossPage() {
    const [logs, setLogs] = useState<DefectLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [draft, setDraft] = useState<Draft>(emptyDraft());
    const [showProductModal, setShowProductModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const loadLogs = useCallback(async () => {
        setLoading(true);
        const data = await getDefectLogs();
        setLogs(data);
        setLoading(false);
    }, []);

    useEffect(() => { loadLogs(); }, [loadLogs]);

    // 월 필터 옵션 (기록에 존재하는 달)
    const monthOptions = useMemo(
        () => Array.from(new Set(logs.map(l => l.logDate.slice(0, 7)))).sort((a, b) => b.localeCompare(a)),
        [logs]
    );

    const filteredLogs = useMemo(
        () => logs.filter(l => selectedMonth === 'all' || l.logDate.startsWith(selectedMonth)),
        [logs, selectedMonth]
    );

    // 선택 기간 요약
    const summary = useMemo(() => {
        let quantity = 0;
        let loss = 0;
        for (const l of filteredLogs) {
            quantity += l.quantity;
            loss += l.unitPrice * l.quantity;
        }
        return { quantity, loss };
    }, [filteredLogs]);

    const draftAmount = draft.unitPrice * draft.quantity;

    const handleProductSelect = (product: { id: string; name: string; default_price: number; wholesale_price?: number }) => {
        setDraft(prev => ({
            ...prev,
            productId: product.id,
            productName: product.name,
            // 단가는 도매가(원가) 기준. 없으면 0으로 두고 직접 입력.
            unitPrice: product.wholesale_price && product.wholesale_price > 0 ? product.wholesale_price : prev.unitPrice,
        }));
        setShowProductModal(false);
    };

    const handleAdd = async () => {
        if (submitting) return;
        if (!draft.productId || !draft.productName) {
            alert('품목을 선택해주세요.');
            return;
        }
        if (draft.quantity <= 0) {
            alert('수량을 1개 이상 입력해주세요.');
            return;
        }
        setSubmitting(true);
        try {
            const created = await addDefectLog({
                logDate: draft.logDate,
                productId: draft.productId,
                productName: draft.productName,
                unitPrice: draft.unitPrice,
                quantity: draft.quantity,
                remarks: draft.remarks || undefined,
                personInCharge: draft.personInCharge || undefined,
            });
            if (created) {
                setLogs(prev => [created, ...prev]);
                // 날짜·담당자는 유지해 연속 입력 편의, 나머지는 초기화
                setDraft(prev => ({
                    ...emptyDraft(),
                    logDate: prev.logDate,
                    personInCharge: prev.personInCharge,
                }));
            } else {
                alert('불량 기록 추가에 실패했습니다.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('이 불량 기록을 삭제하시겠습니까?')) return;
        const ok = await deleteDefectLog(id);
        if (ok) {
            setLogs(prev => prev.filter(l => l.id !== id));
        } else {
            alert('삭제에 실패했습니다.');
        }
    };

    const inputCls = 'w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md text-sm';

    return (
        <div className="w-full py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">로스 관리</h1>
                <Link href="/analytics" className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm">
                    분석에서 로스 반영 보기 &rarr;
                </Link>
            </div>

            {/* 월 필터 + 요약 */}
            <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <label htmlFor="loss-month" className="text-sm font-medium text-gray-700 dark:text-gray-300">기간:</label>
                    <select
                        id="loss-month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    >
                        <option value="all">전체 기간</option>
                        {monthOptions.map(m => (
                            <option key={m} value={m}>
                                {new Date(m + '-01').toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                    총 불량 <span className="font-semibold text-gray-900 dark:text-white">{summary.quantity.toLocaleString()}</span>개
                    <span className="mx-2 text-gray-300 dark:text-gray-600">·</span>
                    총 손실 <span className="font-semibold text-red-600 dark:text-red-400">{summary.loss.toLocaleString()}원</span>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">날짜</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">품목명</th>
                                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">단가(도매가)</th>
                                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">수량</th>
                                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">금액</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">비고</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">담당자</th>
                                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">관리</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {/* 상단 고정 입력행 */}
                            <tr className="bg-indigo-50/60 dark:bg-gray-700/40">
                                <td className="px-3 py-2 align-middle">
                                    <input
                                        type="date"
                                        value={draft.logDate}
                                        onChange={(e) => setDraft({ ...draft, logDate: e.target.value })}
                                        className={inputCls}
                                    />
                                </td>
                                <td className="px-3 py-2 align-middle">
                                    <button
                                        type="button"
                                        onClick={() => setShowProductModal(true)}
                                        className={`w-full p-2 border rounded-md text-sm text-left truncate ${draft.productName
                                            ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                                            : 'border-dashed border-gray-400 dark:border-gray-500 text-gray-400 dark:text-gray-400'}`}
                                        title={draft.productName || '품목 선택'}
                                    >
                                        {draft.productName || '품목 선택 ▸'}
                                    </button>
                                </td>
                                <td className="px-3 py-2 align-middle">
                                    <input
                                        type="number"
                                        min={0}
                                        value={draft.unitPrice || ''}
                                        onChange={(e) => setDraft({ ...draft, unitPrice: parseInt(e.target.value) || 0 })}
                                        placeholder="자동"
                                        className={`${inputCls} text-right`}
                                    />
                                </td>
                                <td className="px-3 py-2 align-middle">
                                    <input
                                        type="number"
                                        min={0}
                                        value={draft.quantity || ''}
                                        onChange={(e) => setDraft({ ...draft, quantity: parseInt(e.target.value) || 0 })}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
                                        placeholder="0"
                                        className={`${inputCls} text-right w-20`}
                                    />
                                </td>
                                <td className="px-3 py-2 align-middle text-right text-sm font-medium text-red-600 dark:text-red-400 whitespace-nowrap">
                                    {draftAmount.toLocaleString()}원
                                </td>
                                <td className="px-3 py-2 align-middle">
                                    <input
                                        type="text"
                                        value={draft.remarks}
                                        onChange={(e) => setDraft({ ...draft, remarks: e.target.value })}
                                        placeholder="비고"
                                        className={inputCls}
                                    />
                                </td>
                                <td className="px-3 py-2 align-middle">
                                    <select
                                        value={draft.personInCharge}
                                        onChange={(e) => setDraft({ ...draft, personInCharge: e.target.value })}
                                        className={inputCls}
                                    >
                                        <option value="">담당자</option>
                                        {STAFF.map(name => (
                                            <option key={name} value={name}>{name}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-3 py-2 align-middle text-center">
                                    <button
                                        type="button"
                                        onClick={handleAdd}
                                        disabled={submitting}
                                        className="px-3 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
                                    >
                                        + 추가
                                    </button>
                                </td>
                            </tr>

                            {/* 기록 목록 */}
                            {loading ? (
                                <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">불러오는 중...</td></tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">기록이 없습니다. 위 입력행에서 추가하세요.</td></tr>
                            ) : (
                                filteredLogs.map(l => (
                                    <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{l.logDate}</td>
                                        <td className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-white">{l.productName}</td>
                                        <td className="px-3 py-3 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-300">{l.unitPrice.toLocaleString()}원</td>
                                        <td className="px-3 py-3 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-300">{l.quantity.toLocaleString()}</td>
                                        <td className="px-3 py-3 whitespace-nowrap text-right text-sm font-medium text-red-600 dark:text-red-400">{(l.unitPrice * l.quantity).toLocaleString()}원</td>
                                        <td className="px-3 py-3 text-sm text-gray-500 dark:text-gray-300">{l.remarks || '-'}</td>
                                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{l.personInCharge || '-'}</td>
                                        <td className="px-3 py-3 whitespace-nowrap text-center">
                                            <button onClick={() => handleDelete(l.id)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm px-2">삭제</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ProductSelectionModal
                isOpen={showProductModal}
                onClose={() => setShowProductModal(false)}
                onSelect={handleProductSelect}
            />
        </div>
    );
}
