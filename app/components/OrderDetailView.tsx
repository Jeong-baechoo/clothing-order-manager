'use client';

import { Order } from '../models/orderTypes';
import AdvancedPrintOptions from './AdvancedPrintOptions';
import InvoicePreview from './InvoicePreview';

interface OrderDetailProps {
    order: Order;
    onClose: () => void;
}

export default function OrderDetailView({ order, onClose }: OrderDetailProps) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 print:bg-white print:block">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] overflow-y-auto print:max-h-none print:shadow-none print:rounded-none print:w-auto print:max-w-none">
                <div className="p-0 print:p-4">
                    {/* 헤더 - 인쇄 시 숨김 */}
                    <div className="flex justify-between items-center p-6 pb-0 print:hidden">
                        <h2 className="text-xl font-bold">주문 상세 정보</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <AdvancedPrintOptions order={order}>
                        <InvoicePreview order={order} />
                    </AdvancedPrintOptions>
                </div>
            </div>
        </div>
    );
}
