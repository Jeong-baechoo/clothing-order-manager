'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import OrderDetailView from '../components/OrderDetailView';
import OrderStatistics from '../components/OrderStatistics';
import OrderExport from '../components/OrderExport';
import ConfirmDialog from '../components/ConfirmDialog';
import OrderForm from '../components/OrderForm';
import { Order, OrderItem, initialOrders, getStatusColor, orderStatusMap } from '../models/orderTypes';

const OrdersPage: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>(initialOrders);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentOrder, setCurrentOrder] = useState<Partial<Order> | null>(null);

    // 삭제 확인 대화상자 상태
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

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
    const handleAddOrder = (orderData: Partial<Order>) => {
        const newOrder: Order = {
            id: `ORD-${String(orders.length + 1).padStart(3, '0')}`,
            orderDate: new Date().toISOString().split('T')[0],
            ...orderData,
        } as Order;

        setOrders([...orders, newOrder]);
        setIsFormVisible(false);
        setCurrentOrder(null);
    };

    // 주문 편집
    const handleEditOrder = (orderData: Partial<Order>) => {
        if (!currentOrder?.id) return;

        setOrders(
            orders.map((order) =>
                order.id === currentOrder.id ? { ...order, ...orderData } as Order : order
            )
        );

        setIsFormVisible(false);
        setIsEditMode(false);
        setCurrentOrder(null);
    };

    // 주문 상태 변경
    const handleStatusChange = (id: string, newStatus: Order['status']) => {
        setOrders(
            orders.map((order) =>
                order.id === id ? { ...order, status: newStatus } : order
            )
        );
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
    const confirmDeleteOrder = () => {
        if (orderToDelete) {
            setOrders(orders.filter((order) => order.id !== orderToDelete));
            setIsDeleteDialogOpen(false);
            setOrderToDelete(null);
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
            {selectedOrderId && (
                <OrderDetailView
                    orderId={selectedOrderId}
                    onClose={() => setSelectedOrderId(null)}
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
                            className="w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div className="w-full md:w-1/4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            주문 상태 필터
                        </label>
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
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
                            {filteredOrders.length > 0 ? (
                                filteredOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                            {order.id}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                            {order.customerName}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                                            <div className="flex flex-col">
                                                <span className="font-medium">{order.items.length}개 항목</span>
                                                <span className="text-xs truncate max-w-xs">
                                                    {order.items.map(item => item.product).join(', ')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                            {order.totalPrice.toLocaleString()}원
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                                                    order.status
                                                )}`}
                                            >
                                                {orderStatusMap[order.status]}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                            {order.orderDate}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => setSelectedOrderId(order.id)}
                                                    className="text-indigo-600 hover:text-indigo-900"
                                                    title="상세 보기"
                                                >
                                                    보기
                                                </button>
                                                <button
                                                    onClick={() => openEditForm(order)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                    title="주문 편집"
                                                >
                                                    편집
                                                </button>
                                                <select
                                                    value={order.status}
                                                    onChange={(e) =>
                                                        handleStatusChange(
                                                            order.id,
                                                            e.target.value as Order['status']
                                                        )
                                                    }
                                                    className="text-xs border border-gray-300 rounded-md"
                                                    title="상태 변경"
                                                >
                                                    <option value="pending">대기중</option>
                                                    <option value="processing">처리중</option>
                                                    <option value="shipped">배송중</option>
                                                    <option value="delivered">배송완료</option>
                                                    <option value="cancelled">취소됨</option>
                                                </select>
                                                <button
                                                    onClick={() => openDeleteDialog(order.id)}
                                                    className="text-red-600 hover:text-red-900"
                                                    title="주문 삭제"
                                                >
                                                    삭제
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-300"
                                    >
                                        표시할 주문이 없습니다.
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