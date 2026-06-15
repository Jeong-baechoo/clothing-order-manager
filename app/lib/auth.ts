'use client';

// B2B 인증 헬퍼 (클라이언트 사이드 Supabase Auth)
// specs/001-b2b-order-module/  — 계정은 대시보드 수동 발급(provisioning.md)
// RLS는 JWT app_metadata 의 role / buyer_id 를 사용한다(user_metadata는 신뢰하지 않음).

import { supabase } from './supabase';

export type Role = 'admin' | 'buyer' | null;

export interface SessionInfo {
    userId: string;
    email?: string;
    role: Role;
    buyerId: string | null;
}

interface AppMetadata { role?: string; buyer_id?: string }

export async function getSessionInfo(): Promise<SessionInfo | null> {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) return null;
    const meta = (session.user.app_metadata ?? {}) as AppMetadata;
    const role: Role = meta.role === 'admin' ? 'admin' : (meta.buyer_id ? 'buyer' : null);
    return {
        userId: session.user.id,
        email: session.user.email ?? undefined,
        role,
        buyerId: meta.buyer_id ?? null,
    };
}

export async function signIn(email: string, password: string): Promise<{ success: boolean; error?: unknown }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { console.error('로그인 오류:', error); return { success: false, error }; }
    return { success: true };
}

export async function signOut(): Promise<void> {
    // scope:'local' — 서버 호출 없이 로컬 세션만 정리(네트워크 지연/실패로 로그아웃이 막히지 않게).
    try { await supabase.auth.signOut({ scope: 'local' }); }
    catch (e) { console.error('로그아웃 오류:', e); }
}

// 로그인한 본인의 비밀번호 변경 (현재 세션 기준)
export async function changePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { console.error('비밀번호 변경 오류:', error); return { success: false, error: error.message }; }
    return { success: true };
}

// 역할별 기본 진입 경로
export function homePathForRole(role: Role): string {
    if (role === 'admin') return '/';        // 관리자는 기존 홈으로 (네비에서 발주(B2B) 이동)
    if (role === 'buyer') return '/portal';
    return '/login';
}
