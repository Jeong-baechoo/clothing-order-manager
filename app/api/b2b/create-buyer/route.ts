// 발주처 계정 인앱 발급 (서버 전용) — specs/001-b2b-order-module
// service_role 키로 (1)buyers 행 (2)Auth 유저+app_metadata.buyer_id (3)auth_user_id 연결을 한 번에 처리.
// ⚠️ 이 파일은 서버(라우트 핸들러)에서만 실행된다. service_role 키는 절대 클라이언트로 노출되지 않는다.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !anonKey || !serviceKey) {
        return NextResponse.json(
            { error: '서버 환경변수가 설정되지 않았습니다 (SUPABASE_SERVICE_ROLE_KEY).' },
            { status: 500 },
        );
    }

    // 1) 호출자가 관리자인지 검증 (세션 토큰 → app_metadata.role)
    const token = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!token) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });

    const authClient = createClient(url, anonKey);
    const { data: userData, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userData.user) {
        return NextResponse.json({ error: '유효하지 않은 세션입니다.' }, { status: 401 });
    }
    const role = (userData.user.app_metadata as { role?: string } | null)?.role;
    if (role !== 'admin') {
        return NextResponse.json({ error: '관리자만 발급할 수 있습니다.' }, { status: 403 });
    }

    // 2) 입력 검증
    let body: { name?: string; email?: string; password?: string };
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 }); }

    const name = (body.name ?? '').trim();
    const email = (body.email ?? '').trim();
    const password = body.password ?? '';
    if (!name || !email || password.length < 6) {
        return NextResponse.json(
            { error: '이름·이메일·비밀번호(6자 이상)를 확인하세요.' },
            { status: 400 },
        );
    }

    const admin = createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    // 3) buyers 행 생성
    const { data: buyer, error: buyerErr } = await admin
        .from('buyers')
        .insert({ name, login_email: email })
        .select('id')
        .single();
    if (buyerErr || !buyer) {
        return NextResponse.json({ error: `발주처 생성 실패: ${buyerErr?.message ?? '오류'}` }, { status: 400 });
    }
    const buyerId: string = buyer.id;

    // 4) Auth 유저 생성 + app_metadata.buyer_id
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: { buyer_id: buyerId },
    });
    if (createErr || !created.user) {
        // 롤백: 방금 만든 buyers 행 제거
        await admin.from('buyers').delete().eq('id', buyerId);
        return NextResponse.json({ error: `계정 생성 실패: ${createErr?.message ?? '오류'}` }, { status: 400 });
    }

    // 5) buyers.auth_user_id 연결
    await admin.from('buyers').update({ auth_user_id: created.user.id }).eq('id', buyerId);

    return NextResponse.json({ success: true, buyerId });
}
