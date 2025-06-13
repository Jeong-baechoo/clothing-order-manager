'use client';

import React, { useState, useEffect } from 'react';
import OrderDetailView from '../components/order/OrderDetailView';
import OrderStatistics from '../components/order/OrderStatistics';
import OrderExport from '../components/order/OrderExport';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import OrderFormModal from '../components/order/OrderFormModal';
import { Order, getStatusColor, orderStatusMap } from '../models/orderTypes';
import { getOrders, addOrder, updateOrder, deleteOrder, updateOrderStatus } from '../lib/supabase';

// Supabase에서 가져온 주문 항목의 타입 정의 (정규화된 스키마)
interface SupabaseOrderItem {
    id: string | number;
    product_id: string;
    product?: {
        id: string;
        name: string;
        default_price: number;
        wholesale_price?: number;
    };
    product_name?: string; // 기존 데이터 호환성을 위한 필드
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
}

// 에러 객체의 타입 정의
interface ErrorObject {
    message?: string;
    code?: string;
    [key: string]: unknown; // 다른 속성들도 허용
}

const OrdersPage: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentOrder, setCurrentOrder] = useState<Partial<Order> | null>(null);
    const [loading, setLoading] = useState(true);

    // 삭제 확인 대화상자 상태
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

    // Supabase에서 데이터 로드
    useEffect(() => {
        async function loadOrders() {
            setLoading(true);
            try {
                const ordersData = await getOrders();
                if (ordersData.length > 0) {
                    // Supabase에서 받은 데이터를 애플리케이션 형식으로 변환
                    const formattedOrders = ordersData.map(order => ({
                        id: order.id,
                        customerName: order.customer_name,
                        phone: order.phone,
                        address: order.address,
                        status: order.status,
                        orderDate: order.order_date,
                        paymentMethod: order.payment_method,
                        totalPrice: order.total_price,
                        items: order.items.map((item: SupabaseOrderItem) => ({
                            id: `ITEM-${item.id}`,
                            product: item.product?.name || item.product_name || '알 수 없는 제품', // 정규화된 제품명 처리
                            productId: item.product_id || item.product?.id, // 제품 ID 저장
                            quantity: item.quantity,
                            size: item.size,
                            color: item.color,
                            price: item.price,
                            smallPrintingQuantity: item.small_printing_quantity || 0,
                            largePrintingQuantity: item.large_printing_quantity || 0,
                            extraLargePrintingQuantity: item.extra_large_printing_quantity || 0,
                            extraLargePrintingPrice: item.extra_large_printing_price || 0,
                            designWorkQuantity: item.design_work_quantity || 0,
                            designWorkPrice: item.design_work_price || 0,
                            productInfo: item.product?.id ? item.product : undefined // 제품 정보 저장
                        }))
                    }));
                    setOrders(formattedOrders);
                } else {
                    // 데이터가 없으면 초기 데이터로 설정하고 Supabase에 저장
                    // setOrders(initialOrders);
                    // 초기 데이터를 Supabase에 저장 (실제 구현 시 필요에 따라 사용)
                    // initialOrders.forEach(order => addOrder(order));
                }
            } catch (error) {
                console.error('주문 데이터 로드 중 오류 발생:', error);
                // 오류 발생 시 초기 데이터 사용
                // setOrders(initialOrders);
            } finally {
                setLoading(false);
            }
        }

        loadOrders();
    }, []);

    // 주문 검색 및 필터링
    const filteredOrders = orders.filter((order) => {
        const matchesSearchTerm =
            order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.items.some(item =>
                item.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.size.toLowerCase().includes(searchTerm.toLowerCase())
            );

        const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;

        return matchesSearchTerm && matchesStatus;
    });

    // 새 주문 추가
    const handleAddOrder = async (orderData: Partial<Order>) => {
        // 년도월 기반 고유 ID 생성
        const generateOrderId = () => {
            const now = new Date();
            const year = now.getFullYear().toString().slice(-2);
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const yearMonth = `${year}${month}`;
            
            const monthOrders = orders.filter(order => order.id.startsWith(`${yearMonth}-`));
            
            const maxOrderNumber = monthOrders.reduce((max, order) => {
                const match = order.id.match(/^\d{4}-(\d+)$/);
                if (match) {
                    return Math.max(max, parseInt(match[1]));
                }
                return max;
            }, 0);
            
            return `${yearMonth}-${String(maxOrderNumber + 1).padStart(3, '0')}`;
        };

        const newOrder: Order = {
            id: generateOrderId(),
            orderDate: new Date().toISOString().split('T')[0],
            ...orderData,
        } as Order;

        try {
            const result = await addOrder(newOrder);

            if (result.success) {
                setOrders([...orders, newOrder]);
                alert('주문이 성공적으로 추가되었습니다.');
            } else {
                console.error('주문 추가 실패:', result.error);
            }
        } catch (error) {
            console.error('주문 추가 중 오류 발생:', error);
            alert('주문 추가 중 오류가 발생했습니다.');
        }
    };

    // 주문 편집
    const handleEditOrder = async (orderData: Partial<Order>) => {
        if (!currentOrder?.id) return;

        try {
            // 디버깅을 위한 로그 추가
            console.log('현재 주문:', currentOrder);
            console.log('업데이트 데이터:', orderData);
            console.log('현재 주문 items:', currentOrder.items);
            console.log('업데이트 데이터 items:', orderData.items);

            // 업데이트된 주문 데이터 생성 - items 배열을 명시적으로 처리
            const updatedOrder = {
                ...currentOrder,
                ...orderData,
                id: currentOrder.id,
                // items 배열이 orderData에 있으면 그것을 사용, 없으면 currentOrder의 items 사용
                items: orderData.items || currentOrder.items
            };

            console.log('업데이트된 주문:', updatedOrder);
            console.log('업데이트된 주문 items:', updatedOrder.items);

            // 업데이트 요청
            const result = await updateOrder(updatedOrder);
            console.log('업데이트 결과:', result);

            if (result.success) {
                // 업데이트 성공 시 로컬 상태 업데이트
                setOrders(
                    orders.map((order) => {
                        if (order.id === currentOrder.id) {
                            return {
                                ...order,
                                ...orderData,
                                // items 배열이 orderData에 있으면 그것을 사용, 없으면 order의 items 사용
                                items: orderData.items || order.items
                            } as Order;
                        }
                        return order;
                    })
                );
                // 성공 메시지 표시
                alert('주문이 성공적으로 업데이트되었습니다.');
            } else {
                // 실패 메시지 표시
                console.error('주문 업데이트 실패:', result.error);
                // 에러 객체가 어떤 형태인지 확인하고 안전하게 메시지 표시
                let errorMessage = '알 수 없는 오류';
                if (result.error) {
                    // ErrorObject로 타입 단언하여 message 속성에 접근
                    const error = result.error as ErrorObject;
                    errorMessage = error.message || error.code || JSON.stringify(error);
                }
                alert(`주문 업데이트에 실패했습니다: ${errorMessage}`);
            }
        } catch (error) {
            console.error('주문 편집 중 오류 발생:', error);
            alert('주문 편집 중 오류가 발생했습니다.');
        } finally {
            setIsFormVisible(false);
            setIsEditMode(false);
            setCurrentOrder(null);
        }
    };

    // 주문 상태 변경
    const handleStatusChange = async (id: string, newStatus: Order['status']) => {
        try {
            await updateOrderStatus(id, newStatus);
            setOrders(
                orders.map((order) =>
                    order.id === id ? { ...order, status: newStatus } : order
                )
            );
        } catch (error) {
            console.error('주문 상태 변경 중 오류 발생:', error);
        }
    };

    // 주문 편집 폼 열기
    const openEditForm = (order: Order) => {
        setCurrentOrder(order);
        setIsEditMode(true);
        setIsFormVisible(true);
    };

    // 주문 삭제 대화상자 열기
    const openDeleteDialog = (id: string) => {
        setOrderToDelete(id);
        setIsDeleteDialogOpen(true);
    };

    // 주문 삭제 확인
    const confirmDeleteOrder = async () => {
        if (orderToDelete) {
            try {
                await deleteOrder(orderToDelete);
                setOrders(orders.filter((order) => order.id !== orderToDelete));
            } catch (error) {
                console.error('주문 삭제 중 오류 발생:', error);
            } finally {
                setIsDeleteDialogOpen(false);
                setOrderToDelete(null);
            }
        }
    };

    // 주문 삭제 취소
    const cancelDeleteOrder = () => {
        setIsDeleteDialogOpen(false);
        setOrderToDelete(null);
    };

    // 주문 폼 닫기
    const handleFormCancel = () => {
        setIsFormVisible(false);
        setIsEditMode(false);
        setCurrentOrder(null);
    };

    // 새 주문 추가 버튼 클릭
    const handleAddNewOrderClick = () => {
        setIsEditMode(false);
        setCurrentOrder(null);
        setIsFormVisible(true);
    };

    return (
        <div className="max-w-7xl mx-auto py-8">
            {selectedOrder && (
                <OrderDetailView
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                />
            )}

            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                title="주문 삭제 확인"
                message="정말로 이 주문을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
                confirmText="삭제"
                cancelText="취소"
                onConfirm={confirmDeleteOrder}
                onCancel={cancelDeleteOrder}
            />

            <div className="mb-8 flex justify-between items-center">
                <h1 className="text-2xl font-bold">주문 관리</h1>
                <button
                    onClick={handleAddNewOrderClick}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                    새 주문 추가
                </button>
            </div>

            <OrderStatistics orders={orders} />

            {isFormVisible && (
                <OrderFormModal
                    onSubmit={isEditMode ? handleEditOrder : handleAddOrder}
                    onClose={handleFormCancel}
                    initialData={currentOrder || undefined}
                    isEdit={isEditMode}
                />
            )}

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row justify-between space-y-4 md:space-y-0">
                    <div className="w-full md:w-1/3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            검색
                        </label>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="주문 ID, 고객 이름, 상품명으로 검색"
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md"
                        />
                    </div>
                    <div className="w-full md:w-1/4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            주문 상태 필터
                        </label>
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md"
                        >
                            <option value="all">모든 상태</option>
                            <option value="pending">대기중</option>
                            <option value="processing">작업중</option>
                            <option value="completed">완료</option>
                        </select>
                    </div>
                    <div className="w-full md:w-auto flex items-end">
                        <OrderExport orders={filteredOrders} />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    주문 ID
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    고객 이름
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    상품 정보
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    총 금액
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    상태
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    주문일
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    작업
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-300">
                                        데이터를 불러오는 중...
                                    </td>
                                </tr>
                            ) : filteredOrders.length > 0 ? (
                                filteredOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                            {order.id}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                            {order.customerName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                            {order.items.map((item) => (
                                                <div key={item.id} className="mb-1">
                                                    {item.product} ({item.color}, {item.size}) x {item.quantity}
                                                </div>
                                            ))}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                            {order.totalPrice.toLocaleString()}원
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                                {orderStatusMap[order.status]}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                            {order.orderDate}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => setSelectedOrder(order)}
                                                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                                >
                                                    상세보기
                                                </button>
                                                <button
                                                    onClick={() => openEditForm(order)}
                                                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                                >
                                                    편집
                                                </button>
                                                <button
                                                    onClick={() => openDeleteDialog(order.id)}
                                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                                >
                                                    삭제
                                                </button>
                                                <select
                                                    value={order.status}
                                                    onChange={(e) => handleStatusChange(order.id, e.target.value as Order['status'])}
                                                    className="text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md"
                                                >
                                                    <option value="pending">대기중</option>
                                                    <option value="processing">작업중</option>
                                                    <option value="completed">완료</option>
                                                </select>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-300">
                                        주문 정보가 없습니다
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default OrdersPage;
