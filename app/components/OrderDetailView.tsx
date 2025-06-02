'use client';

import { Order } from '../models/orderTypes';

interface OrderDetailProps {
    order: Order;
    onClose: () => void;
}

export default function OrderDetailView({ order, onClose }: OrderDetailProps) {

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold">주문 상세 정보</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            &times; 닫기
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-3">주문 정보</h3>
                            <div className="space-y-2 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                <p>
                                    <span className="font-medium">주문 ID:</span> {order.id}
                                </p>
                                <p>
                                    <span className="font-medium">주문일:</span> {order.orderDate}
                                </p>
                                <p>
                                    <span className="font-medium">결제 방법:</span> {order.paymentMethod}
                                </p>
                                <p>
                                    <span className="font-medium">총 가격:</span> {order.totalPrice.toLocaleString()}원
                                </p>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold mb-3">고객 정보</h3>
                            <div className="space-y-2 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                <p>
                                    <span className="font-medium">이름:</span> {order.customerName}
                                </p>
                                <p>
                                    <span className="font-medium">전화번호:</span> {order.phone}
                                </p>
                                <p>
                                    <span className="font-medium">배송 주소:</span> {order.address}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-3">주문 상품 ({order.items.length}개)</h3>
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100 dark:bg-gray-600">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">상품명</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">수량</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">사이즈</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">색상</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">가격</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">소계</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-500">
                                    {order.items.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-100 dark:hover:bg-gray-600">
                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                {item.product}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                                {item.quantity}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                                {item.size}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                                {item.color}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-300">
                                                {item.price.toLocaleString()}원
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white font-medium">
                                                {(item.price * (item.quantity === undefined ? 0 : item.quantity)).toLocaleString()}원
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-100 dark:bg-gray-600">
                                    <tr>
                                        <td colSpan={5} className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                                            총 주문 금액:
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right font-bold text-gray-900 dark:text-white">
                                            {order.totalPrice.toLocaleString()}원
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={handlePrint}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors print:hidden"
                        >
                            주문서 인쇄
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
