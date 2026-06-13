'use client';

// 관리자 — 발주처 관리 (specs/001-b2b-order-module, T4.1)
// 발주처 등록 / 활성토글. 계정(로그인)은 대시보드 수동 발급(provisioning.md) — 여기서 buyer.id를 복사해 app_metadata에 사용.

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import RequireRole from '../../components/auth/RequireRole';
import { getBuyers, setBuyerActive, createBuyerAccount } from '../../lib/b2b';
import type { Buyer } from '../../models/orderTypes';

function BuyersInner() {
    const [buyers, setBuyers] = useState<Buyer[]>([]);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [saving, setSaving] = useState(false);

    const load = () => { getBuyers().then(setBuyers); };
    useEffect(() => { load(); }, []);

    const handleAdd = async () => {
        if (!name.trim() || !email.trim() || password.length < 6) {
            alert('이름·이메일·비밀번호(6자 이상)를 입력하세요.');
            return;
        }
        setSaving(true);
        const r = await createBuyerAccount({ name: name.trim(), email: email.trim(), password });
        setSaving(false);
        if (r.success) {
            alert(`발주처 계정이 생성되었습니다.\n이메일: ${email.trim()}\n임시 비밀번호: ${password}\n(발주처에 전달 후 변경 안내)`);
            setName(''); setEmail(''); setPassword(''); load();
        } else {
            alert(`발급 실패: ${r.error ?? ''}`);
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-6">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">발주처 관리</h1>
                <nav className="text-sm space-x-3">
                    <Link href="/b2b/orders" className="text-blue-600 hover:underline">발주 접수</Link>
                    <Link href="/b2b/inventory" className="text-blue-600 hover:underline">제품·재고</Link>
                </nav>
            </div>

            <div className="flex gap-2 mb-3">
                <input value={name} onChange={e => setName(e.target.value)} placeholder="발주처 이름"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md" />
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="로그인 이메일" type="email"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md" />
                <input value={password} onChange={e => setPassword(e.target.value)} placeholder="임시 비밀번호" type="text"
                    className="w-36 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md" />
                <button onClick={handleAdd} disabled={saving}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-60">추가</button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                추가하면 로그인 계정까지 자동 발급됩니다. 임시 비밀번호를 발주처에 전달하고 첫 로그인 후 변경하도록 안내하세요.
                (서버에 <code className="mx-1 px-1 bg-gray-100 dark:bg-gray-700 rounded">SUPABASE_SERVICE_ROLE_KEY</code> 설정 필요)
            </p>

            <table className="w-full text-sm border-collapse">
                <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500">
                        <th className="py-2">이름</th><th>로그인 이메일</th><th>ID (app_metadata용)</th><th>상태</th><th></th>
                    </tr>
                </thead>
                <tbody>
                    {buyers.map(b => (
                        <tr key={b.id} className="border-b border-gray-100 dark:border-gray-800">
                            <td className="py-2 text-gray-900 dark:text-gray-100">{b.name}</td>
                            <td className="text-gray-700 dark:text-gray-300">{b.loginEmail}</td>
                            <td className="text-gray-400 font-mono text-xs">{b.id}</td>
                            <td>{b.active
                                ? <span className="text-green-600">활성</span>
                                : <span className="text-gray-400">비활성</span>}</td>
                            <td className="text-right">
                                <button onClick={async () => { await setBuyerActive(b.id, !b.active); load(); }}
                                    className="text-xs text-gray-500 hover:text-blue-600">
                                    {b.active ? '비활성화' : '활성화'}
                                </button>
                            </td>
                        </tr>
                    ))}
                    {buyers.length === 0 && (
                        <tr><td colSpan={5} className="py-6 text-center text-gray-400">등록된 발주처가 없습니다.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default function BuyersPage() {
    return <RequireRole role="admin" title="발주처 관리"><BuyersInner /></RequireRole>;
}
