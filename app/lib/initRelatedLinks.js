'use client';

import { supabase } from './supabase';

// 관련 링크 테이블 초기화 함수
export async function initRelatedLinksTable() {
  try {
    // 테이블이 존재하는지 확인
    const { error: checkError } = await supabase
      .from('related_links')
      .select('id')
      .limit(1);

    // 테이블이 없는 경우 (에러 코드 42P01은 "relation does not exist" 오류)
    if (checkError && checkError.code === '42P01') {
      console.log('관련 링크 테이블이 존재하지 않습니다. 테이블을 생성합니다...');

      // SQL을 사용하여 테이블 생성
      const { error: createError } = await supabase.rpc('create_related_links_table');

      if (createError) {
        console.error('테이블 생성 오류:', createError);
        return false;
      }

      console.log('관련 링크 테이블이 성공적으로 생성되었습니다.');

      // 초기 데이터 추가
      const initialLinks = [
        {
          title: '카카오 채널',
          url: 'https://center-pf.kakao.com/_jyPxeG/chats',
          description: '카카오 고객 채널'
        },
        {
          title: '네이버 스마트스토어',
          url: 'https://smartstore.naver.com/jkartworks',
          description: '네이버 쇼핑몰'
        },
        {
          title: 'MJ소프트 온라인 CS',
          url: 'https://ord.mjsoft.co/onlinecs3n/index.php',
          description: '고객 서비스 시스템'
        },
        {
          title: '커스텀 빌리지',
          url: 'https://www.customvillage.co.kr/product/list.html?cate_no=98',
          description: '커스텀 제품 쇼핑몰'
        },
        {
          title: 'MOOTO',
          url: 'https://mooto.com/',
          description: '스포츠 의류 브랜드'
        },
        {
          title: 'PLUS82MALL',
          url: 'https://www.plus82mall.co.kr/',
          description: '의류 쇼핑몰'
        },
        {
          title: 'ECOUNT',
          url: 'https://c-portal.ecount.com/',
          description: '회계 관리 시스템'
        },
        {
          title: 'BECANVAS',
          url: 'https://becanvas.co.kr/',
          description: '캔버스 제품 쇼핑몰'
        },
        {
          title: 'MCN ORDER',
          url: 'https://www.mcnorder.com/',
          description: '주문 관리 시스템'
        },
        {
          title: 'CN INSIDER',
          url: 'https://www.cninsider.co.kr/mall/#/homePage',
          description: '구매대행 서비스'
        }
      ];

      const { error: insertError } = await supabase
        .from('related_links')
        .insert(initialLinks);

      if (insertError) {
        console.error('초기 데이터 추가 오류:', insertError);
      } else {
        console.log('초기 관련 링크 데이터가 성공적으로 추가되었습니다.');
      }
    } else if (checkError) {
      console.error('테이블 확인 중 오류 발생:', checkError);
      return false;
    } else {
      console.log('관련 링크 테이블이 이미 존재합니다.');
    }

    return true;
  } catch (error) {
    console.error('관련 링크 테이블 초기화 오류:', error);
    return false;
  }
}

// SQL 함수 생성 (Supabase에서 실행할 수 있도록)
export async function createRelatedLinksTableFunction() {
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION create_related_links_table()
    RETURNS void AS $$
    BEGIN
      CREATE TABLE IF NOT EXISTS related_links (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    END;
    $$ LANGUAGE plpgsql;
  `;

  const { error } = await supabase.rpc('exec_sql', { sql: createFunctionSQL });

  if (error) {
    console.error('SQL 함수 생성 오류:', error);
    return false;
  }

  return true;
}

// 테이블 초기화 실행
export async function ensureRelatedLinksTable() {
  // SQL 함수 생성 시도
  await createRelatedLinksTableFunction();

  // 테이블 초기화
  return await initRelatedLinksTable();
}
