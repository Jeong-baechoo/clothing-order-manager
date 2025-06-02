'use client';

import { initialOrders, getStatusColor } from '../models/orderTypes';

interface OrderDetailProps {
    orderId: string;
    onClose: () => void;
}

export default function OrderDetailView({ orderId, onClose }: OrderDetailProps) {

    // 실제 구현에서는 여기서 API 호출로 주문 정보를 가져올 수 있습니다
    // 지금은 샘플 데이터에서 orderId로 찾아서 사용합니다
    const orderDetail = initialOrders.find(order => order.id === orderId) || initialOrders[0];

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
                                    <span className="font-medium">주문 ID:</span> {orderDetail.id}
                                </p>
                                <p>
                                    <span className="font-medium">주문일:</span> {orderDetail.orderDate}
                                </p>
                                <p>
                                    <span className="font-medium">상태:</span>{' '}
                                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(orderDetail.status)}`}>
                                        {orderDetail.status === 'pending' && '대기중'}
                                        {orderDetail.status === 'processing' && '처리중'}
                                        {orderDetail.status === 'shipped' && '배송중'}
                                        {orderDetail.status === 'delivered' && '배송완료'}
                                        {orderDetail.status === 'cancelled' && '취소됨'}
                                    </span>
                                </p>
                                <p>
                                    <span className="font-medium">결제 방법:</span> {orderDetail.paymentMethod}
                                </p>
                                <p>
                                    <span className="font-medium">총 가격:</span> {orderDetail.totalPrice.toLocaleString()}원
                                </p>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold mb-3">고객 정보</h3>
                            <div className="space-y-2 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                <p>
                                    <span className="font-medium">이름:</span> {orderDetail.customerName}
                                </p>
                                <p>
                                    <span className="font-medium">이메일:</span> {orderDetail.email}
                                </p>
                                <p>
                                    <span className="font-medium">전화번호:</span> {orderDetail.phone}
                                </p>
                                <p>
                                    <span className="font-medium">배송 주소:</span> {orderDetail.address}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-3">주문 상품 ({orderDetail.items.length}개)</h3>
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
                                    {orderDetail.items.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-100 dark:hover:bg-gray-600">
                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                {item.product}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                                {item.quantity}개
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                                {item.size}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                                {item.color}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right">
                                                {item.price.toLocaleString()}원
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-right">
                                                {(item.price * item.quantity).toLocaleString()}원
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="bg-gray-200 dark:bg-gray-600">
                                        <td colSpan={5} className="px-4 py-2 text-right text-sm font-bold text-gray-700 dark:text-gray-200">
                                            총 합계:
                                        </td>
                                        <td className="px-4 py-2 text-right text-sm font-bold text-gray-900 dark:text-white">
                                            {orderDetail.totalPrice.toLocaleString()}원
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end space-x-3">
                        <button
                            onClick={handlePrint}
                            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                        >
                            영수증 인쇄
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        >
                            확인
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
