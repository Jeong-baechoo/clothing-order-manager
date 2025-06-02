'use client';

import React from 'react';
import { Order } from '../models/orderTypes';
import OrderForm from './OrderForm';

interface OrderFormModalProps {
    onSubmit: (order: Partial<Order>) => void;
    onClose: () => void;
    initialData?: Partial<Order>;
    isEdit?: boolean;
}

export default function OrderFormModal({ onSubmit, onClose, initialData, isEdit = false }: OrderFormModalProps) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold">{isEdit ? '주문 수정' : '새 주문 추가'}</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            &times; 닫기
                        </button>
                    </div>

                    <OrderForm
                        onSubmit={onSubmit}
                        onCancel={onClose}
                        initialData={initialData}
                        isEdit={isEdit}
                    />
                </div>
            </div>
        </div>
    );
}
