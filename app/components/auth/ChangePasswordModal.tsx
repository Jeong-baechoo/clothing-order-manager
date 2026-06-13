'use client';

// 비밀번호 변경 모달 (specs/001-b2b-order-module). 헤더 버튼에서 열림.
import React, { useState } from 'react';
import { changePassword } from '../../lib/auth';

export default function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [pw, setPw] = useState('');
    const [pw2, setPw2] = useState('');
    const [msg, setMsg] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    if (!open) return null;

    const close = () => { setPw(''); setPw2(''); setMsg(null); onClose(); };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMsg(null);
        if (pw.length < 6) { setMsg('비밀번호는 6자 이상이어야 합니다.'); return; }
        if (pw !== pw2) { setMsg('비밀번호가 일치하지 않습니다.'); return; }
        setBusy(true);
        const r = await changePassword(pw);
        setBusy(false);
        if (r.success) { setMsg('비밀번호가 변경되었습니다.'); setPw(''); setPw2(''); }
        else setMsg(`변경 실패: ${r.error ?? ''}`);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-500/60" onClick={close} />
            <form onSubmit={submit} className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-6 space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">비밀번호 변경</h3>
                    <button type="button" onClick={close} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="새 비밀번호 (6자 이상)" autoComplete="new-password"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm" />
                <input type="password" value={pw2} onChange={e => setPw2(e.target.value)} placeholder="새 비밀번호 확인" autoComplete="new-password"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm" />
                {msg && <p className="text-xs text-gray-600 dark:text-gray-300">{msg}</p>}
                <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={close} className="px-4 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">닫기</button>
                    <button type="submit" disabled={busy} className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">{busy ? '변경 중…' : '변경'}</button>
                </div>
            </form>
        </div>
    );
}
