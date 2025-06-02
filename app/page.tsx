'use client';

import Link from "next/link";
import { useState } from 'react';
import OrderFormModal from './components/OrderFormModal';
import { Order } from './models/orderTypes';
import { addOrder } from './lib/supabase';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmitOrder = async (orderData: Partial<Order>) => {
    try {
      const newOrder: Order = {
        id: `ORD-${Date.now()}`,
        orderDate: new Date().toISOString().split('T')[0],
        ...orderData,
      } as Order;

      await addOrder(newOrder);
      alert('주문이 성공적으로 추가되었습니다.');
      setIsModalOpen(false);
    } catch (error) {
      console.error('주문 추가 중 오류 발생:', error);
      alert('주문 추가 중 오류가 발생했습니다.');
    }
  };

  return (
      <div>
        {isModalOpen && (
          <OrderFormModal
            onSubmit={handleSubmitOrder}
            onClose={handleCloseModal}
          />
        )}

        {/* 메인 컨텐츠 */}
        <div className="relative max-w-4xl mx-auto py-12 px-4">
          {/* 헤더 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">CAELUM 주문 관리</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">의류 주문 관리 시스템</p>
          </div>

          {/* 빠른 액세스 버튼들 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Link
              href="/orders"
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">주문 목록</h2>
                  <p className="text-gray-600 dark:text-gray-400">전체 주문 조회 및 관리</p>
                </div>
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </Link>

            <button
              onClick={handleOpenModal}
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">새 주문 추가</h2>
                  <p className="text-gray-600 dark:text-gray-400">신규 주문 등록</p>
                </div>
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </button>
          </div>

          {/* 주요 기능 안내 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">주요 기능</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <span className="font-medium text-gray-800 dark:text-gray-100">주문 검색:</span>
                  <span className="text-gray-600 dark:text-gray-400 ml-2">주문 ID, 고객명, 상품명으로 검색</span>
                </div>
              </div>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <span className="font-medium text-gray-800 dark:text-gray-100">상태 관리:</span>
                  <span className="text-gray-600 dark:text-gray-400 ml-2">주문 상태 실시간 업데이트</span>
                </div>
              </div>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <span className="font-medium text-gray-800 dark:text-gray-100">일괄 처리:</span>
                  <span className="text-gray-600 dark:text-gray-400 ml-2">여러 주문 동시 수정 가능</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
