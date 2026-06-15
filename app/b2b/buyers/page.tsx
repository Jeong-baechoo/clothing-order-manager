'use client';

// 관리자 — 발주처 관리 (specs/001-b2b-order-module, T4.1)
// 발주처 등록 시 로그인 계정까지 자동 발급 / 활성토글.

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import RequireRole from '../../components/auth/RequireRole';
import B2bTabs from '../../components/b2b/B2bTabs';
import { getBuyers, setBuyerActive, createBuyerAccount, getBuyerProductMap } from '../../lib/b2b';
import type { Buyer } from '../../models/orderTypes';

function BuyersInner() {
    const [buyers, setBuyers] = useState<Buyer[]>([]);
    const [productCounts, setProductCounts] = useState<Record<string, number>>({});
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showToast = useCallback((kind: 'success' | 'error', msg: string) => {
        setToast({ kind, msg });
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 3500);
    }, []);
    useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

    const load = () => { getBuyers().then(setBuyers); };
    const loadCounts = () => {
        getBuyerProductMap().then(map => {
            const c: Record<string, number> = {};
            for (const pid in map) for (const bid of map[pid]) c[bid] = (c[bid] ?? 0) + 1;
            setProductCounts(c);
        });
    };
    useEffect(() => { load(); loadCounts(); }, []);

    // 활성 발주처 먼저, 그다음 이름순
    const sortedBuyers = useMemo(
        () => [...buyers].sort((a, b) => (a.active === b.active ? a.name.localeCompare(b.name) : a.active ? -1 : 1)),
        [buyers]);

    const canSubmit = name.trim() && email.trim() && password.length >= 6;

    const handleAdd = async () => {
        if (!canSubmit) { showToast('error', '이름·이메일·비밀번호(6자 이상)를 입력하세요.'); return; }
        setSaving(true);
        const r = await createBuyerAccount({ name: name.trim(), email: email.trim(), password });
        setSaving(false);
        if (r.success) {
            showToast('success', `'${name.trim()}' 계정이 생성되었습니다. 임시 비밀번호: ${password}`);
            setName(''); setEmail(''); setPassword(''); load();
        } else {
            showToast('error', `발급 실패: ${r.error ?? ''}`);
        }
    };

    const copyId = async (id: string) => {
        try {
            await navigator.clipboard.writeText(id);
            setCopiedId(id);
            setTimeout(() => setCopiedId(c => (c === id ? null : c)), 1500);
        } catch { /* clipboard 미지원 무시 */ }
    };

    const activeCount = buyers.filter(b => b.active).length;

    return (
        <div className="max-w-3xl mx-auto p-6">
            {toast && (
                <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-lg shadow-lg text-sm text-white ${toast.kind === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.msg}
                </div>
            )}

            <B2bTabs title="발주처 관리" right={
                <span className="text-sm text-gray-400">총 {buyers.length}곳 · 활성 {activeCount}</span>
            } />

            {/* 발주처 등록 카드 */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-5 bg-white dark:bg-gray-800">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">발주처 등록 (로그인 계정 자동 발급)</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block">
                        <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">발주처 이름</span>
                        <input value={name} onChange={e => setName(e.target.value)} placeholder="예: 케룸상사"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm" />
                    </label>
                    <label className="block">
                        <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">로그인 이메일</span>
                        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="buyer@example.com" type="email" autoComplete="off"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm" />
                    </label>
                    <label className="block">
                        <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">임시 비밀번호 (6자 이상)</span>
                        <input value={password} onChange={e => setPassword(e.target.value)} placeholder="발주처에 전달 후 변경 안내" type="text" autoComplete="off"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm" />
                    </label>
                    <div className="flex items-end">
                        <button onClick={handleAdd} disabled={saving || !canSubmit}
                            className="w-full px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
                            {saving ? '발급 중…' : '발주처 추가'}
                        </button>
                    </div>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
                    임시 비밀번호를 발주처에 전달하고 첫 로그인 후 변경하도록 안내하세요.
                    (서버에 <code className="mx-0.5 px-1 bg-gray-100 dark:bg-gray-700 rounded">SUPABASE_SERVICE_ROLE_KEY</code> 설정 필요)
                </p>
            </div>

            {/* 발주처 목록 카드 */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500 bg-gray-50 dark:bg-gray-800">
                            <th className="py-2.5 px-4">이름</th><th className="px-2">로그인 이메일</th>
                            <th className="px-2">배정 제품</th><th className="px-2">ID</th><th className="px-2">상태</th><th className="px-4"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedBuyers.map(b => (
                            <tr key={b.id} className={`border-b border-gray-100 dark:border-gray-800 last:border-0 ${b.active ? '' : 'opacity-50'}`}>
                                <td className="py-2.5 px-4 font-medium text-gray-900 dark:text-gray-100">{b.name}</td>
                                <td className="px-2 text-gray-700 dark:text-gray-300">{b.loginEmail}</td>
                                <td className="px-2 text-gray-500">
                                    {productCounts[b.id]
                                        ? <span className="text-gray-700 dark:text-gray-300">{productCounts[b.id]}개</span>
                                        : <span className="text-gray-300 dark:text-gray-600">없음</span>}
                                </td>
                                <td className="px-2">
                                    <button onClick={() => copyId(b.id)}
                                        title="ID 복사 (app_metadata용)"
                                        className="font-mono text-xs text-gray-400 hover:text-blue-600 inline-flex items-center gap-1">
                                        {copiedId === b.id ? '복사됨 ✓' : `${b.id.slice(0, 8)}… ⧉`}
                                    </button>
                                </td>
                                <td className="px-2">
                                    {b.active
                                        ? <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">활성</span>
                                        : <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">비활성</span>}
                                </td>
                                <td className="px-4 text-right">
                                    <button onClick={async () => { await setBuyerActive(b.id, !b.active); load(); }}
                                        className="text-xs text-gray-500 hover:text-blue-600">
                                        {b.active ? '비활성화' : '활성화'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {buyers.length === 0 && (
                            <tr><td colSpan={6} className="py-10 text-center text-gray-400">등록된 발주처가 없습니다.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function BuyersPage() {
    return <RequireRole role="admin" title="발주처 관리"><BuyersInner /></RequireRole>;
}
