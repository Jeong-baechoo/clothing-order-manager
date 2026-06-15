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
        <header className="sticky top-0 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-b border-gray-200 dark:border-gray-800">
            <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-slate-800 dark:bg-slate-700 flex items-center justify-center text-white text-sm font-bold tracking-tight">C</div>
                    <div className="flex flex-col leading-tight">
                        <span className="text-[15px] font-bold text-slate-900 dark:text-white tracking-tight">CAELUM 발주</span>
                        <span className="text-[10px] text-slate-400 -mt-0.5 hidden sm:block">온라인 수발주 시스템</span>
                    </div>
                    <span className="ml-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200">발주처</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 text-sm">
                    {email && <span className="text-slate-500 dark:text-slate-400 hidden md:inline mr-1">{email}</span>}
                    <button
                        type="button"
                        onClick={() => setPwOpen(true)}
                        className="px-2.5 py-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        비밀번호 변경
                    </button>
                    <button
                        type="button"
                        onClick={async () => { await signOut(); router.replace('/login'); }}
                        className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        로그아웃
                    </button>
                </div>
            </div>
            <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
        </header>
    );
}
