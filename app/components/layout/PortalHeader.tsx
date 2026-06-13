'use client';

// 발주처 포털 상단 헤더 (specs/001-b2b-order-module)
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from '../../lib/auth';
import ChangePasswordModal from '../auth/ChangePasswordModal';

export default function PortalHeader({ email }: { email?: string }) {
    const router = useRouter();
    const [pwOpen, setPwOpen] = useState(false);
    return (
        <header className="sticky top-0 z-20 bg-white/90 dark:bg-gray-800/90 backdrop-blur border-b border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-800 dark:text-white">발주 시스템</span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200">발주처</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 text-sm">
                    {email && <span className="text-gray-500 dark:text-gray-400 hidden md:inline">{email}</span>}
                    <button
                        type="button"
                        onClick={() => setPwOpen(true)}
                        className="px-2 py-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-300 transition-colors"
                    >
                        비밀번호 변경
                    </button>
                    <button
                        type="button"
                        onClick={async () => { await signOut(); router.replace('/login'); }}
                        className="px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        로그아웃
                    </button>
                </div>
            </div>
            <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
        </header>
    );
}
