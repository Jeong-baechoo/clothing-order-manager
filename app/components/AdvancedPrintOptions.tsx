'use client';

import React, { useRef, useState } from 'react';
import { Order } from '../models/orderTypes';
import { generateHTMLPDF } from '../utils/pdf-utils-html';

interface AdvancedPrintOptionsProps {
  order: Order;
  children: React.ReactNode;
}

export default function AdvancedPrintOptions({ order, children }: AdvancedPrintOptionsProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async (preview: boolean = false) => {
    setIsGenerating(true);

    try {
      await generateHTMLPDF(order, preview);
      if (!preview) {
        alert('PDF가 성공적으로 생성되었습니다!');
      }
    } catch (error) {
      console.error('PDF 생성 오류:', error);
      alert(`PDF 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* 인보이스 컨테이너 */}
      <div
        ref={printRef}
        className="bg-white print:m-0 print:p-0 justify-center items-center flex p-7 shadow-lg border print:shadow-none print:border-0 print:bg-transparent print:overflow-hidden"
      >
        {children}
      </div>

      {/* PDF 생성 버튼 영역 - 인쇄시 숨겨짐 */}
      <div className="print:hidden mt-8 p-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            PDF 다운로드
          </h3>
          <p className="text-gray-600 mb-6">
            고품질 PDF 파일로 인보이스를 저장하세요. 인쇄와 보관에 최적화되어 있습니다.
          </p>

          <div className="flex flex-col md:flex-row gap-3">
            <button
              onClick={() => generatePDF(true)}
              disabled={isGenerating}
              className={`
                w-full md:w-auto px-6 py-3 rounded-lg font-medium transition-all duration-200
                flex items-center justify-center space-x-2
                ${isGenerating
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gray-600 hover:bg-gray-700 active:bg-gray-800 shadow-sm hover:shadow-md'
                }
                text-white
              `}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>미리보기</span>
            </button>

            <button
              onClick={() => generatePDF(false)}
              disabled={isGenerating}
              className={`
                w-full md:w-auto px-8 py-3 rounded-lg font-medium transition-all duration-200
                flex items-center justify-center space-x-2
                ${isGenerating
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
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>PDF 다운로드</span>
                </>
              )}
            </button>
          </div>

          {/* 도움말 정보 */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-2 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              도움말
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• PDF 생성 전에 미리보기로 확인하세요</li>
              <li>• 생성된 PDF는 다운로드 폴더에 저장됩니다</li>
              <li>• 파일명: 고객명_주문서.pdf</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
