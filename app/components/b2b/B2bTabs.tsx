'use client';

// 관리자 B2B 영역 공통 서브 네비 — 현재 위치 강조 (발주처/제품·재고/발주 접수)

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
    { href: '/b2b/orders', label: '발주 접수' },
    { href: '/b2b/inventory', label: '제품 · 재고' },
    { href: '/b2b/buyers', label: '발주처' },
];

export default function B2bTabs({ title, right }: { title: string; right?: React.ReactNode }) {
    const pathname = usePathname();
    return (
        <div className="mb-5">
            <div className="flex items-center justify-between gap-2 mb-3">
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
                {right}
            </div>
            <nav className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
                {TABS.map(t => {
                    const active = pathname === t.href;
                    return (
                        <Link key={t.href} href={t.href}
                            className={`px-3 py-2 text-sm -mb-px border-b-2 transition-colors ${active
                                ? 'border-blue-600 text-blue-600 font-medium'
                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}>
                            {t.label}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
