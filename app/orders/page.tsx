'use client';

import React, { useState, useEffect } from 'react';
import OrderDetailView from '../components/OrderDetailView';
import OrderStatistics from '../components/OrderStatistics';
import OrderExport from '../components/OrderExport';
import ConfirmDialog from '../components/ConfirmDialog';
import OrderForm from '../components/OrderForm';
import { Order, initialOrders, getStatusColor, orderStatusMap } from '../models/orderTypes';
import { getOrders, addOrder, updateOrder, deleteOrder, updateOrderStatus } from '../lib/supabase';

// Supabase에서 가져온 주문 항목의 타입 정의
interface SupabaseOrderItem {
    id: string | number;
    product: string;
    quantity: number;
    size: string;
    color: string;
    price: number;
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
                            product: item.product,
                            quantity: item.quantity,
                            size: item.size,
                            color: item.color,
                            price: item.price
                        }))
                    }));
                    setOrders(formattedOrders);
                } else {
                    // 데이터가 없으면 초기 데이터로 설정하고 Supabase에 저장
                    setOrders(initialOrders);
                    // 초기 데이터를 Supabase에 저장 (실제 구현 시 필요에 따라 사용)
                    // initialOrders.forEach(order => addOrder(order));
                }
            } catch (error) {
                console.error('주문 데이터 로드 중 오류 발생:', error);
                // 오류 발생 시 초기 데이터 사용
                setOrders(initialOrders);
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
        const newOrder: Order = {
            id: `ORD-${String(orders.length + 1).padStart(3, '0')}`,
            orderDate: new Date().toISOString().split('T')[0],
            ...orderData,
        } as Order;

        try {
            await addOrder(newOrder);
            setOrders([...orders, newOrder]);
        } catch (error) {
            console.error('주문 추가 중 오류 발생:', error);
        } finally {
            setIsFormVisible(false);
            setCurrentOrder(null);
        }
    };

    // 주문 편집
    const handleEditOrder = async (orderData: Partial<Order>) => {
        if (!currentOrder?.id) return;

        try {
            await updateOrder({
                ...currentOrder,
                ...orderData,
                id: currentOrder.id
            });

            setOrders(
                orders.map((order) =>
                    order.id === currentOrder.id ? { ...order, ...orderData } as Order : order
                )
            );
        } catch (error) {
            console.error('주문 편집 중 오류 발생:', error);
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
        <div className="max-w-6xl mx-auto py-8">
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
                <OrderForm
                    onSubmit={isEditMode ? handleEditOrder : handleAddOrder}
                    onCancel={handleFormCancel}
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
                            <option value="processing">처리중</option>
                            <option value="shipped">배송중</option>
                            <option value="delivered">배송완료</option>
                            <option value="cancelled">취소됨</option>
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
                                                    <option value="processing">처리중</option>
                                                    <option value="shipped">배송중</option>
                                                    <option value="delivered">배송완료</option>
                                                    <option value="cancelled">취소됨</option>
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
