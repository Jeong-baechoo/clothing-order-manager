'use client';

import React, { useState, useEffect } from 'react';
import { Order } from '../../models/orderTypes';
import { isBrowser } from '../../utils/pdf-utils';
import { generateHTMLPDF, generateInvoiceJPEG } from '../../utils/pdf-utils-html';

interface AdvancedPrintOptionsProps {
  order: Order;
  children: React.ReactNode;
}

export default function AdvancedPrintOptions({ order, children }: AdvancedPrintOptionsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClientSide, setIsClientSide] = useState(false);

  // Check if we're on the client side
  useEffect(() => {
    setIsClientSide(isBrowser());
  }, []);
  // HTML 기반 PDF 생성
  const generatePDF = async () => {
    if (!isClientSide) {
      alert('PDF 생성 모듈이 아직 로드되지 않았습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    setIsGenerating(true);

    try {
      console.log('HTML 기반 PDF 생성 시작');
      
      // HTML 기반 PDF 생성
      await generateHTMLPDF(order, false);
      
      console.log('PDF 생성 성공');
      alert('PDF가 성공적으로 생성되었습니다!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      console.error('PDF 생성 중 오류:', error);
      alert(`PDF 생성 중 오류가 발생했습니다: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // JPEG 이미지 생성
  const generateJPEG = async () => {
    if (!isClientSide) {
      alert('이미지 생성 모듈이 아직 로드되지 않았습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    setIsGenerating(true);

    try {
      console.log('JPEG 이미지 생성 시작');
      
      // JPEG 이미지 생성
      await generateInvoiceJPEG(order, false);
      
      console.log('JPEG 생성 성공');
      alert('JPEG 이미지가 성공적으로 생성되었습니다!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      console.error('JPEG 생성 중 오류:', error);
      alert(`JPEG 생성 중 오류가 발생했습니다: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  }; return (
    <div>
      {/* 인보이스 미리보기 영역 */}
      <div className="invoice-container bg-white max-w-4xl mx-auto">
        {children}
      </div>

      {/* PDF 생성 버튼 영역 - 인쇄시 숨겨짐 */}
      <div className="print:hidden mt-8 max-w-4xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            파일 다운로드
          </h3>          <p className="text-gray-600 mb-6">
            견적서를 PDF 또는 JPEG 형식으로 다운로드하세요. 품목이 많을 경우 JPEG를 권장합니다.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={generatePDF}
              disabled={isGenerating || !isClientSide}
              className={`
                w-full px-6 py-3 rounded-lg font-medium transition-all duration-200
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
                  <span>생성 중...</span>
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

            <button
              onClick={generateJPEG}
              disabled={isGenerating || !isClientSide}
              className={`
                w-full px-6 py-3 rounded-lg font-medium transition-all duration-200
                flex items-center justify-center space-x-2
                ${isGenerating || !isClientSide
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 active:bg-green-800 shadow-sm hover:shadow-md'
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
                  <span>생성 중...</span>
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>JPEG 다운로드</span>
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
              다운로드 정보
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <h5 className="font-medium text-gray-700 mb-1">PDF</h5>
                <ul className="space-y-1">
                  <li>• 고품질 문서 형식</li>
                  <li>• 인쇄 최적화</li>
                  <li>• 적은 품목에 적합</li>
                  <li>• 파일명: {order.customerName}_주문서.pdf</li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium text-gray-700 mb-1">JPEG</h5>
                <ul className="space-y-1">
                  <li>• 고해상도 이미지 형식</li>
                  <li>• 많은 품목에도 안정적</li>
                  <li>• 빠른 생성 속도</li>
                  <li>• 파일명: {order.customerName}_견적서.jpg</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
