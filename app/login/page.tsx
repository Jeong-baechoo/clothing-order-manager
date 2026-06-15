'use client';

// 로그인 페이지 (관리자·발주처 공용). 로그인 후 역할에 따라 분기. (specs/001-b2b-order-module)

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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl shadow p-8 space-y-5"
            >
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 text-center">로그인</h1>

                <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">이메일</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="username"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-1 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">비밀번호</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-1 focus:ring-blue-500"
                    />
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 select-none cursor-pointer">
                    <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    로그인 정보 저장 (이메일 기억)
                </label>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60 transition-colors font-medium"
                >
                    {loading ? '로그인 중…' : '로그인'}
                </button>
            </form>
        </div>
    );
}
