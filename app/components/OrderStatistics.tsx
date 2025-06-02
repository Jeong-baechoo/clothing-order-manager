'use client';

import { useMemo } from 'react';
import { Order, OrderItem } from '../models/orderTypes';

interface OrderStatisticsProps {
    orders: Order[];
}

export default function OrderStatistics({ orders }: OrderStatisticsProps) {
    // 통계 계산
    const statistics = useMemo(() => {
        const totalOrders = orders.length;
        const pendingOrders = orders.filter(order => order.status === 'pending').length;
        const processingOrders = orders.filter(order => order.status === 'processing').length;
        const shippedOrders = orders.filter(order => order.status === 'shipped').length;
        const deliveredOrders = orders.filter(order => order.status === 'delivered').length;
        const cancelledOrders = orders.filter(order => order.status === 'cancelled').length;

        // 오늘 날짜 기준 최근 7일간의 주문
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);

        const recentOrders = orders.filter(order => {
            const orderDate = new Date(order.orderDate);
            return orderDate >= weekAgo && orderDate <= today;
        }).length;

        // 모든 상품 항목 추출
        const allItems: OrderItem[] = orders.flatMap(order => order.items);

        // 총 상품 항목 수
        const totalItems = allItems.length;

        // 총 주문 수량
        const totalQuantity = allItems.reduce((sum, item) => sum + (item.quantity === undefined ? 0 : item.quantity), 0);

        // 평균 주문당 항목 수
        const avgItemsPerOrder = totalOrders > 0 ? (totalItems / totalOrders).toFixed(1) : '0';

        // 가장 많이 주문된 상품
        const productCounts: Record<string, number> = {};
        allItems.forEach(item => {
            productCounts[item.product] = (productCounts[item.product] || 0) + (item.quantity === undefined ? 0 : item.quantity);
        });

        let mostOrderedProduct = '';
        let maxCount = 0;

        Object.entries(productCounts).forEach(([product, count]) => {
            if (count > maxCount) {
                mostOrderedProduct = product;
                maxCount = count;
            }
        });

        // 총 매출액
        const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);

        // 평균 주문 금액
        const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(0) : '0';

        return {
            totalOrders,
            pendingOrders,
            processingOrders,
            shippedOrders,
            deliveredOrders,
            cancelledOrders,
            recentOrders,
            mostOrderedProduct,
            maxCount,
            totalItems,
            totalQuantity,
            avgItemsPerOrder,
            totalRevenue,
            avgOrderValue
        };
    }, [orders]);

    return (
        <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 bg-indigo-100 dark:bg-indigo-900 rounded-full p-3">
                            <svg className="h-6 w-6 text-indigo-600 dark:text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">총 주문</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{statistics.totalOrders}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 bg-yellow-100 dark:bg-yellow-900 rounded-full p-3">
                            <svg className="h-6 w-6 text-yellow-600 dark:text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">대기중 주문</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{statistics.pendingOrders}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 bg-green-100 dark:bg-green-900 rounded-full p-3">
                            <svg className="h-6 w-6 text-green-600 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">배송완료 주문</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{statistics.deliveredOrders}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900 rounded-full p-3">
                            <svg className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">인기 상품</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {statistics.mostOrderedProduct ? statistics.mostOrderedProduct : '데이터 없음'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 주문 요약 카드 */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">주문 요약</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                        <p className="text-sm text-gray-500 dark:text-gray-400">총 상품 수량</p>
                        <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{statistics.totalQuantity}개</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">총 상품 항목 {statistics.totalItems}개</p>
                    </div>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                        <p className="text-sm text-gray-500 dark:text-gray-400">총 매출액</p>
                        <p className="text-xl font-bold text-green-600 dark:text-green-400">{statistics.totalRevenue.toLocaleString()}원</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">평균 {parseInt(statistics.avgOrderValue).toLocaleString()}원/주문</p>
                    </div>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                        <p className="text-sm text-gray-500 dark:text-gray-400">주문 현황</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{statistics.processingOrders}건</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">배송중 {statistics.shippedOrders}건 / 취소 {statistics.cancelledOrders}건</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
