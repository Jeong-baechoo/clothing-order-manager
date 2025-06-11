'use client';

import { useState, useEffect, useCallback } from 'react';
import { Order, OrderItem } from '../models/orderTypes';
import { getOrders } from '../lib/supabase';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';

interface AnalyticsData {
    totalRevenue: number;
    totalCost: number;
    netProfit: number;
    profitMargin: number;
    totalOrders: number;
    averageOrderValue: number;
    topProducts: Array<{
        product: string;
        quantity: number;
        revenue: number;
    }>;
    monthlyData: Array<{
        month: string;
        revenue: number;
        cost: number;
        profit: number;
    }>;
}

// 차트 색상 팔레트
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

// 커스텀 툴팁 컴포넌트
const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
}) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                <p className="text-gray-700 font-medium">{`${label}`}</p>
                {payload.map((entry, index: number) => (
                    <p key={index} style={{ color: entry.color }}>
                        {`${entry.name}: ${entry.value.toLocaleString()}원`}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function AnalyticsPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<AnalyticsData>({
        totalRevenue: 0,
        totalCost: 0,
        netProfit: 0,
        profitMargin: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        topProducts: [],
        monthlyData: []
    });

    // 수파베이스에서 데이터 로드
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            
            // 주문 데이터 로드 (제품 정보는 조인으로 함께 가져옴)
            const orderData = await getOrders();
            
            // 개선된 스키마에 맞게 주문 데이터 변환 (안전한 변환)
            const transformedOrders = orderData.map(order => ({
                id: order.id || '',
                customerName: order.customer_name || '',
                phone: order.phone || '',
                address: order.address || '',
                status: order.status || 'pending',
                orderDate: order.order_date || new Date().toISOString(),
                paymentMethod: order.payment_method || '',
                totalPrice: order.total_price || 0,
                items: Array.isArray(order.items) ? order.items.map((item: {
                    id: string;
                    product_id: string;
                    product?: {
                        id: string;
                        name: string;
                        default_price: number;
                        wholesale_price?: number;
                    };
                    product_name?: string;
                    quantity: number;
                    size: string;
                    color: string;
                    price: number;
                    small_printing_quantity?: number;
                    large_printing_quantity?: number;
                    extra_large_printing_quantity?: number;
                    extra_large_printing_price?: number;
                    design_work_quantity?: number;
                    design_work_price?: number;
                }) => {
                    // 안전한 아이템 변환
                    const productInfo = item.product as { id?: string; name?: string; default_price?: number; wholesale_price?: number } | undefined;
                    return {
                        id: item.id || '',
                        product: productInfo?.name || item.product_name || '알 수 없는 제품', // 폴백 처리
                        productId: item.product_id || '',
                        quantity: Number(item.quantity) || 0,
                        size: item.size || '',
                        color: item.color || '',
                        price: Number(item.price) || 0,
                        smallPrintingQuantity: Number(item.small_printing_quantity) || 0,
                        largePrintingQuantity: Number(item.large_printing_quantity) || 0,
                        extraLargePrintingQuantity: Number(item.extra_large_printing_quantity) || 0,
                        extraLargePrintingPrice: Number(item.extra_large_printing_price) || 0,
                        designWorkQuantity: Number(item.design_work_quantity) || 0,
                        designWorkPrice: Number(item.design_work_price) || 0,
                        // 정규화된 제품 정보 추가
                        productInfo: productInfo?.id ? productInfo : undefined
                    };
                }) : []
            }));
            
            setOrders(transformedOrders);
        } catch (error) {
            console.error('데이터 로드 실패:', error);
            // 에러 발생 시 빈 배열로 초기화
            setOrders([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const calculateItemCost = useCallback((item: OrderItem): number => {
        // 정규화된 제품 정보 사용 (더 정확하고 빠름)
        const productInfo = item.productInfo;
        const wholesalePrice = (productInfo?.wholesale_price && productInfo.wholesale_price > 0) 
            ? productInfo.wholesale_price 
            : (item.price * 0.6); // 도매가가 0이거나 없으면 60% 적용
        
        
        // 기본 제품 비용 (도매가 기준)
        const baseCost = wholesalePrice * item.quantity;
        
        // 인쇄 비용 (고정 비용으로 가정)
        const printingCost = (item.smallPrintingQuantity || 0) * 2000 +
                           (item.largePrintingQuantity || 0) * 3000 +
                           (item.extraLargePrintingQuantity || 0) * 4000;
        
        // 디자인 작업 비용
        const designCost = (item.designWorkPrice || 0) * 0.3; // 디자인 비용의 30%가 실제 비용
        
        return baseCost + printingCost + designCost;
    }, []);

    const calculateAnalytics = useCallback(() => {
        let totalRevenue = 0;
        let totalCost = 0;
        const productMap = new Map<string, { quantity: number; revenue: number }>();
        const monthlyMap = new Map<string, { revenue: number; cost: number }>();

        orders.forEach(order => {
            const orderRevenue = order.totalPrice;
            let orderCost = 0;

            order.items.forEach(item => {
                const itemCost = calculateItemCost(item);
                const itemRevenue = item.price * item.quantity;
                
                orderCost += itemCost;
                
                // 제품별 집계 (정규화된 제품 정보 사용)
                const productKey = item.productInfo?.name || item.product;
                const existing = productMap.get(productKey) || { quantity: 0, revenue: 0 };
                productMap.set(productKey, {
                    quantity: existing.quantity + item.quantity,
                    revenue: existing.revenue + itemRevenue
                });
            });

            totalRevenue += orderRevenue;
            totalCost += orderCost;

            // 월별 집계
            const month = new Date(order.orderDate).toISOString().slice(0, 7);
            const existing = monthlyMap.get(month) || { revenue: 0, cost: 0 };
            monthlyMap.set(month, {
                revenue: existing.revenue + orderRevenue,
                cost: existing.cost + orderCost
            });
        });

        const netProfit = totalRevenue - totalCost;
        const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

        // 상위 제품 정렬
        const topProducts = Array.from(productMap.entries())
            .map(([product, data]) => ({ product, ...data }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        // 월별 데이터 정렬
        const monthlyData = Array.from(monthlyMap.entries())
            .map(([month, data]) => ({
                month,
                revenue: data.revenue,
                cost: data.cost,
                profit: data.revenue - data.cost
            }))
            .sort((a, b) => a.month.localeCompare(b.month));

        setAnalytics({
            totalRevenue,
            totalCost,
            netProfit,
            profitMargin,
            totalOrders: orders.length,
            averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
            topProducts,
            monthlyData
        });
    }, [orders, calculateItemCost]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (!loading) {
            calculateAnalytics();
        }
    }, [calculateAnalytics, loading]);

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="text-center">
                        <div className="text-lg text-gray-600">데이터를 불러오는 중...</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">매출 분석 대시보드</h1>

                {/* 주요 지표 카드 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">총 매출</dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {analytics.totalRevenue.toLocaleString()}원
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">총 비용</dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {analytics.totalCost.toLocaleString()}원
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">순수익</dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {analytics.netProfit.toLocaleString()}원
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">수익률</dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {analytics.profitMargin.toFixed(1)}%
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 월별 매출 차트 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <div className="bg-white rounded-lg shadow">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900">월별 매출 & 수익 트렌드</h3>
                        </div>
                        <div className="p-6">
                            {analytics.monthlyData && analytics.monthlyData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={analytics.monthlyData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="month" />
                                        <YAxis />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                        <Area
                                            type="monotone"
                                            dataKey="revenue"
                                            stackId="1"
                                            stroke="#8884d8"
                                            fill="#8884d8"
                                            fillOpacity={0.6}
                                            name="매출"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="profit"
                                            stackId="2"
                                            stroke="#82ca9d"
                                            fill="#82ca9d"
                                            fillOpacity={0.6}
                                            name="순수익"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-[300px] text-gray-500">
                                    데이터가 없습니다
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900">월별 비교 차트</h3>
                        </div>
                        <div className="p-6">
                            {analytics.monthlyData && analytics.monthlyData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={analytics.monthlyData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="month" />
                                        <YAxis />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                        <Bar dataKey="revenue" fill="#3B82F6" name="매출" />
                                        <Bar dataKey="cost" fill="#EF4444" name="비용" />
                                        <Bar dataKey="profit" fill="#10B981" name="순수익" />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-[300px] text-gray-500">
                                    데이터가 없습니다
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 상위 제품 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <div className="bg-white rounded-lg shadow">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900">인기 제품 TOP 5</h3>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {analytics.topProducts.map((product, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div 
                                                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white"
                                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                            >
                                                {index + 1}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{product.product}</div>
                                                <div className="text-sm text-gray-500">판매량: {product.quantity}개</div>
                                            </div>
                                        </div>
                                        <div className="text-sm font-medium text-gray-900">
                                            {product.revenue.toLocaleString()}원
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900">제품별 매출 분포</h3>
                        </div>
                        <div className="p-6">
                            {analytics.topProducts && analytics.topProducts.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={analytics.topProducts}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ product, percent }) => `${product} ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="revenue"
                                        >
                                            {analytics.topProducts.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-[300px] text-gray-500">
                                    데이터가 없습니다
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 추가 통계 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">주문 통계</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500">총 주문 수</span>
                                <span className="text-sm font-medium text-gray-900">{analytics.totalOrders}건</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500">평균 주문 금액</span>
                                <span className="text-sm font-medium text-gray-900">
                                    {analytics.averageOrderValue.toLocaleString()}원
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">수익성 분석</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500">매출 대비 비용</span>
                                <span className="text-sm font-medium text-gray-900">
                                    {analytics.totalRevenue > 0 ? ((analytics.totalCost / analytics.totalRevenue) * 100).toFixed(1) : 0}%
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500">주문당 평균 수익</span>
                                <span className="text-sm font-medium text-gray-900">
                                    {analytics.totalOrders > 0 ? (analytics.netProfit / analytics.totalOrders).toLocaleString() : 0}원
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900">수익률 트렌드</h3>
                        </div>
                        <div className="p-6">
                            {analytics.monthlyData && analytics.monthlyData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={analytics.monthlyData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="month" />
                                        <YAxis />
                                        <Tooltip 
                                            formatter={(value) => [`${value}`, '순수익']}
                                        />
                                        <Line 
                                            type="monotone" 
                                            dataKey="profit" 
                                            stroke="#8884d8" 
                                            strokeWidth={3}
                                            dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-[200px] text-gray-500">
                                    데이터가 없습니다
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}