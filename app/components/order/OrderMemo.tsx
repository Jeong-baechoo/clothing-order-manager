'use client';

import React, { useState, useEffect } from 'react';

interface OrderMemoProps {
    orderId: string;
    isOpen: boolean;
    onClose: () => void;
    memo?: string;
    onSave: (memo: string) => void;
}

export default function OrderMemo({ orderId, isOpen, onClose, memo = '', onSave }: OrderMemoProps) {
    const [memoText, setMemoText] = useState(memo);

    useEffect(() => {
        setMemoText(memo);
    }, [memo]);

    const handleSave = () => {
        onSave(memoText);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] mx-4">
                <div className="p-6">
                    {/* 헤더 */}
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            주문 메모 - {orderId}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* 메모 입력 영역 */}
                    <div className="mb-6">
                        <label htmlFor="memo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            메모 내용
                        </label>
                        <textarea
                            id="memo"
                            value={memoText}
                            onChange={(e) => setMemoText(e.target.value)}
                            placeholder="주문과 관련된 메모를 입력하세요..."
                            className="w-full h-40 p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    {/* 버튼 영역 */}
                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            취소
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                        >
                            저장
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}