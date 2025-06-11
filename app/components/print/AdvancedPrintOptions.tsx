'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Order } from '../../models/orderTypes';
import { isBrowser, loadHtml2Pdf, getDefaultPdfOptions } from '../../utils/pdf-utils';

interface AdvancedPrintOptionsProps {
  order: Order;
  children: React.ReactNode;
}

export default function AdvancedPrintOptions({ order, children }: AdvancedPrintOptionsProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClientSide, setIsClientSide] = useState(false);

  // Check if we're on the client side
  useEffect(() => {
    setIsClientSide(isBrowser());
  }, []);
  // html2pdf.js를 사용한 최적화된 PDF 생성
  const generatePDF = async () => {
    if (!printRef.current) {
      alert('인보이스 컨테이너를 찾을 수 없습니다.');
      return;
    }

    if (!isClientSide) {
      alert('PDF 생성 모듈이 아직 로드되지 않았습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    setIsGenerating(true);

    try {
      // 콘텐츠 렌더링 확인
      console.log('PDF 생성 시작: 내용 확인', {
        childrenCount: printRef.current.childNodes.length,
        innerHtml: printRef.current.innerHTML.substring(0, 100) + '...',
        width: printRef.current.offsetWidth,
        height: printRef.current.offsetHeight
      });

      // 이미지 로딩 대기
      const images = printRef.current.querySelectorAll('img');
      console.log(`이미지 ${images.length}개 발견, 로딩 대기 중...`);

      const imagePromises = Array.from(images).map((img) => {
        // 로그 추가
        console.log('이미지 처리중:', img.src, '완료 상태:', img.complete);

        return new Promise((resolve) => {
          if (img.complete) {
            console.log('이미지 이미 로드됨:', img.src);
            resolve(img);
          } else {
            img.onload = () => {
              console.log('이미지 로드 완료:', img.src);
              resolve(img);
            };
            img.onerror = () => {
              console.error('이미지 로드 오류:', img.src);
              resolve(img); // 오류가 있어도 계속 진행
            };
          }
        });
      });

      // 모든 이미지 로딩 완료 대기
      await Promise.all(imagePromises);
      console.log('모든 이미지 로딩 완료');
      // 잠시 대기하여 렌더링 완료 보장
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('추가 렌더링 시간 대기 완료');
      // html2pdf 모듈 로드
      const html2pdfLib = await loadHtml2Pdf();
      if (!html2pdfLib) {
        throw new Error('PDF 생성 모듈을 로드할 수 없습니다.');
      }
      // 기본 PDF 옵션 가져오기
      const options = getDefaultPdfOptions(order.id.toString());

      // PDF 옵션에 로그 추가
      console.log('PDF 옵션 구성 완료', options);

      // 실제 PDF 생성 시작
      console.log('PDF 생성 시작: html2pdf 호출');
      try {
        // html2pdf 생성
        const worker = html2pdfLib()
          .set(options) // 옵션 설정
          .from(printRef.current);

        console.log('PDF 생성 중: Worker 준비 완료');

        // PDF 생성 및 저장
        await worker.save();
        console.log('PDF 생성 성공');

        // 성공 메시지
        alert('PDF가 성공적으로 생성되었습니다!');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
        console.error('PDF 생성 중 오류:', error);
        alert(`PDF 생성 중 오류가 발생했습니다: ${errorMessage}`);
      }
    } catch (error) {
      console.error('PDF 생성 중 오류:', error);
      alert('PDF 생성 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsGenerating(false);
    }
  }; return (
    <div>
      {/* 인보이스 컨테이너 - PDF로 변환될 영역 */}
      <div
        ref={printRef}
        className="invoice-container bg-white p-8 max-w-4xl mx-auto"
        style={{
          // PDF 출력에 최적화된 스타일
          fontFamily: 'Arial, sans-serif',
          lineHeight: '1.5',
          color: '#000000',
          display: 'block', // 반드시 화면에 표시되도록 설정
          visibility: 'visible', // 반드시 보이도록 설정
          position: 'relative', // stacking context 조정
          zIndex: 1, // 레이어 순서 보장
          minHeight: '500px' // 최소 높이 설정
        }}
      >
        {children}
      </div>

      {/* PDF 생성 버튼 영역 - 인쇄시 숨겨짐 */}
      <div className="print:hidden mt-8 max-w-4xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            PDF 다운로드
          </h3>          <p className="text-gray-600 mb-6">
            고품질 PDF 파일로 인보이스를 저장하세요. 인쇄와 보관에 최적화되어 있습니다.
          </p>

          <button
            onClick={generatePDF}
            disabled={isGenerating || !isClientSide}
            className={`
              w-full md:w-auto px-8 py-3 rounded-lg font-medium transition-all duration-200
              flex items-center justify-center space-x-2
              ${isGenerating || !isClientSide
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-sm hover:shadow-md'
              }
              text-white
            `}
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>PDF 생성 중...</span>
              </>
            ) : !isClientSide ? (
              <>
                <svg className="animate-pulse -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" stroke="currentColor" />
                </svg>
                <span>모듈 로드 중...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>PDF 다운로드</span>
              </>
            )}
          </button>

          {/* 도움말 정보 */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-2 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              PDF 생성 정보
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Caelum 로고가 포함된 고품질 PDF로 생성됩니다</li>
              <li>• A4 용지 크기에 최적화되어 있습니다</li>
              <li>• 파일명: Invoice_{order.id}.pdf</li>
              <li>• 이미지 품질: 고해상도 (98% 품질)</li>
              <li>• 모든 브라우저에서 호환됩니다</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
