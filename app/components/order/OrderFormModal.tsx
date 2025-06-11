'use client';

import React, { useState } from 'react';
import { Order } from '../../models/orderTypes';
import OrderForm from './OrderForm';

interface OrderFormModalProps {
    onSubmit: (order: Partial<Order>) => void;
    onClose: () => void;
    initialData?: Partial<Order>;
    isEdit?: boolean;
}

export default function OrderFormModal({ onSubmit, onClose, initialData, isEdit = false }: OrderFormModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitTrigger, setSubmitTrigger] = useState(0);

    const handleSubmit = async (orderData: Partial<Order>) => {
        setIsSubmitting(true);
        try {
            await onSubmit(orderData);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFormSubmit = () => {
        setSubmitTrigger(prev => prev + 1);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[98vw] h-[95vh] overflow-hidden flex flex-col">
                {/* 고정된 헤더 */}
                <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            {isEdit ? '주문 수정' : '새 주문 추가'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* 스크롤 가능한 콘텐츠 영역 */}
                <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4">
                    <OrderForm
                        onSubmit={handleSubmit}
                        onCancel={onClose}
                        initialData={initialData}
                        isEdit={isEdit}
                        hideButtons={true}
                        submitTrigger={submitTrigger}
                    />
                </div>

                {/* 고정된 하단 버튼 */}
                <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
                    <div className="flex justify-end space-x-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-6 py-3 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                            취소
                        </button>
                        <button
                            type="button"
                            onClick={handleFormSubmit}
                            disabled={isSubmitting}
                            className="px-8 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md flex items-center"
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    처리중...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    {isEdit ? '주문 수정' : '주문 등록'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
