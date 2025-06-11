'use client';

import { Order } from '../../models/orderTypes';
import AdvancedPrintOptions from '../print/AdvancedPrintOptions';
import Image from 'next/image';

interface OrderDetailProps {
    order: Order;
    onClose: () => void;
}

export default function OrderDetailView({ order, onClose }: OrderDetailProps) {
    // 현재 날짜 구하기
    const currentDate = new Date().toLocaleDateString('ko-KR');

    // 주문 상태 한글 변환
    const getStatusText = (status: string) => {
        switch (status) {
            case 'pending': return '대기중';
            case 'processing': return '처리중';
            case 'shipped': return '배송중';
            case 'delivered': return '배송완료';
            case 'cancelled': return '취소됨';
            default: return status;
        }
    };

    // 개별 항목의 단가 계산 (기본가 + 프린팅 + 디자인)
    const calculateUnitPrice = (item: typeof order.items[0]) => {
        const basePrice = Number(item.price) || 0;
        
        // 프린팅 비용 계산 (개당 비용)
        let printingCostPerItem = 0;
        printingCostPerItem += Math.max(0, Number(item.smallPrintingQuantity) || 0) * 1500;
        printingCostPerItem += Math.max(0, Number(item.largePrintingQuantity) || 0) * 3000;

        // 특대형 프린팅 (개당 비용)
        const extraLargeQty = Math.max(0, Number(item.extraLargePrintingQuantity) || 0);
        const extraLargePrice = Math.max(0, Number(item.extraLargePrintingPrice) || 0);
        if (extraLargeQty > 0 && extraLargePrice > 0) {
            printingCostPerItem += extraLargeQty * extraLargePrice;
        }

        // 디자인 작업 (개당 비용)
        const designQty = Math.max(0, Number(item.designWorkQuantity) || 0);
        const designPrice = Math.max(0, Number(item.designWorkPrice) || 0);
        if (designQty > 0 && designPrice > 0) {
            printingCostPerItem += designQty * designPrice;
        }

        return basePrice + printingCostPerItem;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 print:bg-white print:block">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[95vh] overflow-y-auto print:max-h-none print:shadow-none print:rounded-none print:w-auto print:max-w-none">
                <div className="p-6 print:p-4">
                    {/* 헤더 - 인쇄 시 숨김 */}
                    <div className="flex justify-between items-center mb-6 print:hidden">
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
                        {/* PDF 최적화를 위한 추가 스타일 컨테이너 */}
                        <div className="print:text-black print:bg-white" style={{ pageBreakInside: 'avoid' }}>

                            {/* 인보이스 헤더 */}
                            <div className="border-b-4 border-blue-600 pb-4 mb-6 print:pb-3 print:mb-4 print:border-b-2" style={{ pageBreakAfter: 'avoid' }}>
                                <div className="flex justify-between items-start">                                <div>                                <div className="flex items-center gap-4 mb-2">                                        <div className="relative">
                                    <Image
                                        src="/images/caelum-logo-transparent.png"
                                        alt="Caelum Logo"
                                        className="h-16 w-auto print:h-14 object-contain"
                                        style={{
                                            maxWidth: '120px',
                                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                                        }}
                                        width={120}
                                        height={80}
                                        priority={true}
                                        onError={(e) => console.error('Logo load error:', e)}
                                        onLoad={() => console.log('Logo loaded successfully')}
                                    />
                                </div>

                                </div>
                                </div>
                                    <div className="text-right">
                                        <h2 className="text-3xl font-bold text-blue-600 print:text-2xl print:text-black">주문서</h2>
                                        <p className="text-lg text-gray-600 print:text-base print:text-black">ORDER INVOICE</p>
                                        <div className="mt-3 print:mt-2 space-y-1 text-sm">
                                            <p><span className="font-medium">주문번호:</span> #{order.id}</p>
                                            <p><span className="font-medium">발행일:</span> {currentDate}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 고객 정보와 주문 정보 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 print:gap-4 print:mb-4" style={{ pageBreakInside: 'avoid' }}>
                                {/* 고객 정보 */}
                                <div className="bg-gray-50 p-4 rounded-lg print:bg-white print:border print:border-gray-300 print:p-3">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-3 print:text-base print:mb-2 print:text-black">고객 정보</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex">
                                            <span className="font-medium text-gray-600 w-16 print:text-black">이름:</span>
                                            <span className="text-gray-800 print:text-black">{order.customerName}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="font-medium text-gray-600 w-16 print:text-black">전화:</span>
                                            <span className="text-gray-800 print:text-black">{order.phone}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="font-medium text-gray-600 w-16 print:text-black">주소:</span>
                                            <span className="text-gray-800 print:text-black">{order.address}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 주문 정보 */}
                                <div className="bg-blue-50 p-4 rounded-lg print:bg-white print:border print:border-gray-300 print:p-3">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-3 print:text-base print:mb-2 print:text-black">주문 정보</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex">
                                            <span className="font-medium text-gray-600 w-20 print:text-black">주문일:</span>
                                            <span className="text-gray-800 print:text-black">{new Date(order.orderDate).toLocaleDateString('ko-KR')}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="font-medium text-gray-600 w-20 print:text-black">상태:</span>
                                            <span className="text-gray-800 print:text-black">{getStatusText(order.status)}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="font-medium text-gray-600 w-20 print:text-black">결제방법:</span>
                                            <span className="text-gray-800 print:text-black">{order.paymentMethod}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 주문 상품 목록 */}
                            <div className="mb-6 print:mb-4" style={{ pageBreakInside: 'avoid' }}>
                                <h3 className="text-lg font-semibold text-gray-800 mb-4 print:text-base print:mb-2 print:text-black">주문 상품</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse border border-gray-300 text-sm">
                                        <thead>
                                            <tr className="bg-gray-100 print:bg-gray-50">
                                                <th className="border border-gray-300 px-3 py-2 text-left print:px-2 print:py-1 print:text-black">상품명</th>
                                                <th className="border border-gray-300 px-3 py-2 text-center print:px-2 print:py-1 print:text-black">크기</th>
                                                <th className="border border-gray-300 px-3 py-2 text-center print:px-2 print:py-1 print:text-black">색상</th>
                                                <th className="border border-gray-300 px-3 py-2 text-center print:px-2 print:py-1 print:text-black">수량</th>
                                                <th className="border border-gray-300 px-3 py-2 text-right print:px-2 print:py-1 print:text-black">단가</th>
                                                <th className="border border-gray-300 px-3 py-2 text-right print:px-2 print:py-1 print:text-black">소계</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {order.items.map((item, index) => (
                                                <tr key={index} className="hover:bg-gray-50 print:hover:bg-transparent" style={{ pageBreakInside: 'avoid' }}>
                                                    <td className="border border-gray-300 px-3 py-2 print:px-2 print:py-1 print:text-black">
                                                        {item.productInfo?.name || item.product}
                                                        {item.productInfo?.companies?.name && (
                                                            <div className="text-xs text-gray-500 print:text-gray-600">
                                                                {item.productInfo.companies.name}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="border border-gray-300 px-3 py-2 text-center print:px-2 print:py-1 print:text-black">{item.size}</td>
                                                    <td className="border border-gray-300 px-3 py-2 text-center print:px-2 print:py-1 print:text-black">{item.color}</td>
                                                    <td className="border border-gray-300 px-3 py-2 text-center print:px-2 print:py-1 print:text-black">{item.quantity}</td>
                                                    <td className="border border-gray-300 px-3 py-2 text-right print:px-2 print:py-1 print:text-black">{calculateUnitPrice(item).toLocaleString()}원</td>
                                                    <td className="border border-gray-300 px-3 py-2 text-right font-medium print:px-2 print:py-1 print:text-black">
                                                        {(item.quantity * calculateUnitPrice(item)).toLocaleString()}원
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 총액 요약 */}
                            <div className="border-t-2 border-gray-300 pt-4 print:pt-2 print:border-t" style={{ pageBreakInside: 'avoid' }}>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-sm text-gray-600 print:text-black">총 {order.items.length}개 상품</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-blue-600 print:text-xl print:text-black">
                                            총 금액: {order.totalPrice.toLocaleString()}원
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 푸터 */}
                            <div className="mt-8 pt-4 border-t border-gray-200 print:mt-6 print:pt-3 print:border-gray-300" style={{ pageBreakInside: 'avoid' }}>
                                <div className="flex justify-between items-end text-xs text-gray-500 print:text-black">
                                    <div>
                                        <p>본 주문서는 {currentDate}에 발행되었습니다.</p>
                                        <p className="mt-1">Caelum 의류 주문 관리 시스템</p>
                                    </div>
                                </div>
                            </div>

                        </div> {/* PDF 최적화 컨테이너 끝 */}
                    </AdvancedPrintOptions>
                </div>
            </div>
        </div>
    );
}