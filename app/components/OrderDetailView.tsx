'use client';

import { Order } from '../models/orderTypes';
import AdvancedPrintOptions from './AdvancedPrintOptions';
import Image from 'next/image';

interface OrderDetailProps {
    order: Order;
    onClose: () => void;
}

export default function OrderDetailView({ order, onClose }: OrderDetailProps) {
    // 현재 날짜 구하기
    const currentDate = new Date().toLocaleDateString('ko-KR');

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
                        <div className="flex flex-col invoice-container bg-white" style={{ pageBreakInside: 'avoid', minHeight: '297mm' }}>

                            {/* 인보이스 헤더 */}
                            <div className="mb-6" style={{ pageBreakAfter: 'avoid' }}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="mb-4">
                                            <Image
                                                src="/images/KakaoTalk_20250604_192242063_01.png"
                                                alt="Caelum Logo"
                                                className="h-20 w-auto object-contain"
                                                style={{
                                                    maxWidth: '150px',
                                                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                                                }}
                                                width={120}
                                                height={80}
                                                priority={true}
                                                onError={(e) => console.error('Logo load error:', e)}
                                                onLoad={() => console.log('Logo loaded successfully')}
                                            />
                                        </div>
                                        <div className="text-sm text-gray-600 space-y-1">
                                            <p>경북 구미시 송선로 420</p>
                                            <p>연락처: 010-5789-6891</p>
                                            <p>E-mail: caelum2022@daum.net</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <h1 className="text-4xl font-bold text-gray-800 mb-3">INVOICE</h1>
                                        <div className="inline-flex items-center bg-gray-100 rounded-md px-4 py-2 mb-4" style={{ minHeight: '40px' }}>
                                            <span className="text-sm text-gray-600 mr-2" style={{ color: '#4B5563' }}>주문번호</span>
                                            <span className="text-lg font-bold text-gray-800" style={{ color: '#1F2937', fontSize: '1.125rem', fontWeight: 'bold' }}>#{order.id}</span>
                                        </div>
                                        <div className="space-y-1 text-sm text-gray-600">
                                            <p><span className="font-medium">발행일:</span> {currentDate}</p>
                                            <p><span className="font-medium">만기일:</span> {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('ko-KR')}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="border-b-2 border-gray-300"></div>
                            </div>

                            {/* 고객 정보와 주문 정보 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8" style={{ pageBreakInside: 'avoid' }}>
                                {/* 청구 정보 */}
                                <div>
                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">BILL TO</h3>
                                    <div className="text-sm space-y-1">
                                        <p className="font-semibold text-base text-gray-800">{order.customerName}</p>
                                        <p className="text-gray-600">{order.phone}</p>
                                        <p className="text-gray-600">{order.address}</p>
                                    </div>
                                </div>

                                {/* 주문 정보 */}
                                <div>
                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">INVOICE DETAILS</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between gap-4">
                                            <span className="text-gray-600 flex-shrink-0">Invoice Date:</span>
                                            <span className="font-medium text-gray-800 text-right">{currentDate}</span>
                                        </div>
                                        <div className="flex justify-between gap-4">
                                            <span className="text-gray-600 flex-shrink-0">Order Date:</span>
                                            <span className="font-medium text-gray-800 text-right">{new Date(order.orderDate).toLocaleDateString('ko-KR')}</span>
                                        </div>
                                        <div className="flex justify-between gap-4">
                                            <span className="text-gray-600 flex-shrink-0">결제 방식:</span>
                                            <span className="font-medium text-gray-800 text-right">{order.paymentMethod}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 주문 상품 목록 */}
                            <div className="mb-8 flex-grow" style={{ pageBreakInside: 'avoid' }}>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b-2 border-gray-800">
                                                <th className="text-left py-3 px-2 font-semibold text-gray-800">DESCRIPTION</th>
                                                <th className="text-center py-3 px-2 font-semibold text-gray-800">SIZE</th>
                                                <th className="text-center py-3 px-2 font-semibold text-gray-800">COLOR</th>
                                                <th className="text-center py-3 px-2 font-semibold text-gray-800">QTY</th>
                                                <th className="text-right py-3 px-2 font-semibold text-gray-800">UNIT PRICE</th>
                                                <th className="text-right py-3 px-2 font-semibold text-gray-800">AMOUNT</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {order.items.map((item, index) => (
                                                <tr key={index} className="border-b border-gray-200 hover:bg-gray-50" style={{ pageBreakInside: 'avoid' }}>
                                                    <td className="py-4 px-2 text-left">
                                                        <div className="font-medium text-gray-800">
                                                            {item.productInfo?.name || item.product}
                                                        </div>
                                                        {item.productInfo?.companies?.name && (
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                {item.productInfo.companies.name}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-4 px-2 text-center text-gray-700">{item.size}</td>
                                                    <td className="py-4 px-2 text-center text-gray-700">{item.color}</td>
                                                    <td className="py-4 px-2 text-center text-gray-700">{item.quantity}</td>
                                                    <td className="py-4 px-2 text-right text-gray-700">₩{item.price.toLocaleString()}</td>
                                                    <td className="py-4 px-2 text-right font-medium text-gray-800">
                                                        ₩{(item.quantity * item.price).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 총액 요약 */}
                            <div className="border-t-2 border-gray-300 pt-6 mb-8" style={{ pageBreakInside: 'avoid' }}>
                                <div className="flex justify-end">
                                    <div className="w-full md:w-1/3">
                                        <div className="border-t-2 border-gray-800 pt-2">
                                            <div className="flex justify-between">
                                                <span className="text-lg font-bold text-gray-800">TOTAL:</span>
                                                <span className="text-lg font-bold text-gray-800">₩{order.totalPrice.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 푸터 */}
                            <div className="mt-auto" style={{ pageBreakInside: 'avoid' }}>
                                <div className="border-t border-gray-200 pt-6 mt-4">
                                    <div className="text-center text-xs text-gray-500">
                                        <p>CAELUM</p>
                                        <p className="mt-2">경북 구미시 송선로 420 | Tel: 010-5789-6891 | E-mail: caelum2022@daum.net</p>
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
