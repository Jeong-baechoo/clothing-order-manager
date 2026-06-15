'use client';

// 로그인 페이지 (관리자·발주처 공용) — 라이트=하늘색 방사형 / 다크=#201D2C→#090909 방사형 (OS 다크모드 자동)

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, getSessionInfo, homePathForRole } from '../lib/auth';

const SAVED_EMAIL_KEY = 'login-email';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [remember, setRemember] = useState(true);

    // 로그인 정보 저장: 저장해둔 이메일이 있으면 미리 채움 (자동 로그인은 하지 않음)
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const saved = window.localStorage.getItem(SAVED_EMAIL_KEY);
        if (saved) { setEmail(saved); setRemember(true); }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        if (typeof window !== 'undefined') {
            if (remember) window.localStorage.setItem(SAVED_EMAIL_KEY, email.trim());
            else window.localStorage.removeItem(SAVED_EMAIL_KEY);
        }
        const result = await signIn(email.trim(), password);
        if (!result.success) {
            setError('로그인에 실패했습니다. 이메일/비밀번호를 확인해주세요.');
            setLoading(false);
            return;
        }
        const info = await getSessionInfo();
        if (!info?.role) {
            setError('계정에 역할이 설정되지 않았습니다. 관리자에게 문의하세요.');
            setLoading(false);
            return;
        }
        router.replace(homePathForRole(info.role));
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-slate-50 dark:bg-[#090909]">
            {/* 라이트=하늘색 위→아래 선형 / 다크=#201D2C→#090909 방사형 */}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,#dbeafe_0%,transparent_55%)] dark:bg-[radial-gradient(ellipse_60%_50%_at_center,#201D2C_0%,#090909_72%)]" />

            <div className="relative min-h-screen flex flex-col items-center justify-center px-4">
                <div className="w-full max-w-sm">
                    {/* 브랜드 — SVG 배너(흰색). 라이트는 brightness-0으로 검정, 다크는 흰색 유지 */}
                    <div className="mb-8 flex justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/images/caelum-login.svg" alt="CAELUM 온라인 수발주 통합관리 시스템"
                            className="w-full max-w-full brightness-0 dark:brightness-100" />
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* 이메일 */}
                        <div className="flex items-center gap-2.5 border-b border-slate-300 dark:border-slate-600 focus-within:border-blue-500 dark:focus-within:border-blue-400 py-2 transition-colors">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75l9.75 6 9.75-6M2.25 6.75v10.5a1.5 1.5 0 001.5 1.5h16.5a1.5 1.5 0 001.5-1.5V6.75m-19.5 0a1.5 1.5 0 011.5-1.5h16.5a1.5 1.5 0 011.5 1.5" />
                            </svg>
                            <input
                                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username"
                                placeholder="이메일"
                                className="flex-1 bg-transparent outline-none text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            />
                        </div>

                        {/* 비밀번호 */}
                        <div className="flex items-center gap-2.5 border-b border-slate-300 dark:border-slate-600 focus-within:border-blue-500 dark:focus-within:border-blue-400 py-2 transition-colors">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 00-9 0v3.75m-1.5 0h12a1.5 1.5 0 011.5 1.5v6a1.5 1.5 0 01-1.5 1.5H6a1.5 1.5 0 01-1.5-1.5v-6a1.5 1.5 0 011.5-1.5z" />
                            </svg>
                            <input
                                type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"
                                placeholder="비밀번호"
                                className="flex-1 bg-transparent outline-none text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            />
                        </div>

                        {/* 저장 */}
                        <label className="flex items-center justify-end gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer select-none">
                            <input
                                type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
                                className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-500 dark:bg-slate-800 text-blue-600 focus:ring-blue-500"
                            />
                            저장 (이메일)
                        </label>

                        {error && <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>}

                        <button
                            type="submit" disabled={loading}
                            className="w-full py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-500 disabled:opacity-60 transition-colors font-semibold text-sm shadow-sm"
                        >
                            {loading ? '로그인 중…' : '로그인'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
