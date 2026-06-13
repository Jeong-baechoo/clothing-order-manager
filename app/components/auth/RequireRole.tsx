'use client';

// 역할 기반 클라이언트 라우트 가드 (specs/001-b2b-order-module)
// 상단 헤더는 AppChrome(Navbar / PortalHeader)이 담당하고, 여기선 인증/권한만 검사한다.

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSessionInfo, homePathForRole, type Role } from '../../lib/auth';

interface Props {
    role: Exclude<Role, null>;
    children: React.ReactNode;
    title?: string; // (미사용) 기존 호출 호환용
}

export default function RequireRole({ role, children }: Props) {
    const router = useRouter();
    const [ok, setOk] = useState(false);

    useEffect(() => {
        let active = true;
        getSessionInfo().then(info => {
            if (!active) return;
            if (!info) { router.replace('/login'); return; }
            if (info.role !== role) { router.replace(homePathForRole(info.role)); return; }
            setOk(true);
        });
        return () => { active = false; };
    }, [role, router]);

    if (!ok) {
        return <div className="p-12 text-center text-gray-500 dark:text-gray-400">확인 중…</div>;
    }
    return <>{children}</>;
}
