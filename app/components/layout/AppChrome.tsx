'use client';

// 라우트 영역별 네비/가드 (specs/001-b2b-order-module)
// - /login          : 공개. 네비 없음.
// - /portal*        : 발주처 영역. 관리자 네비 없음(포털 자체 RequireRole이 인증 처리).
// - 그 외(/, /orders, /companies, /analytics, /b2b/*) : 관리자 영역. 관리자만 접근, 관리자 네비 표시.

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Navbar from './Navbar';
import PortalHeader from './PortalHeader';
import { getSessionInfo, homePathForRole, type Role } from '../../lib/auth';

const PUBLIC_PREFIXES = ['/login'];
const BUYER_PREFIXES = ['/portal'];

const matches = (pathname: string, prefixes: string[]) =>
    prefixes.some(p => pathname === p || pathname.startsWith(p + '/'));

export default function AppChrome({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [status, setStatus] = useState<'loading' | 'ok'>('loading');
    const [role, setRole] = useState<Role>(null);
    const [email, setEmail] = useState<string>('');

    const isPublic = matches(pathname, PUBLIC_PREFIXES);
    const isBuyerArea = matches(pathname, BUYER_PREFIXES);
    const isAdminArea = !isPublic && !isBuyerArea;

    useEffect(() => {
        if (isPublic) { setStatus('ok'); return; }
        let active = true;
        getSessionInfo().then(info => {
            if (!active) return;
            setRole(info?.role ?? null);
            setEmail(info?.email ?? '');
            // 관리자 영역인데 관리자가 아니면 차단(로그인/자기 홈으로)
            if (isAdminArea && info?.role !== 'admin') {
                router.replace(info ? homePathForRole(info.role) : '/login');
                return;
            }
            setStatus('ok');
        });
        return () => { active = false; };
    }, [pathname, isPublic, isAdminArea, router]);

    // 로그인 페이지: 전체화면, 래핑 없음
    if (isPublic) return <>{children}</>;

    if (status !== 'ok') {
        return <div className="p-12 text-center text-gray-500 dark:text-gray-400">확인 중…</div>;
    }

    return (
        <>
            {isAdminArea && role === 'admin' && <Navbar />}
            {isBuyerArea && role === 'buyer' && <PortalHeader email={email} />}
            <main className="container mx-auto px-4 py-8 relative">{children}</main>
        </>
    );
}
