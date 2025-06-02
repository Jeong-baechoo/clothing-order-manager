'use client';

import React, { useState, useEffect } from 'react';
import { Order, OrderItem } from '../models/orderTypes';
import OrderItemForm from './OrderItemForm';

interface OrderFormProps {
    onSubmit: (order: Partial<Order>) => void;
    onCancel: () => void;
    initialData?: Partial<Order>;
    isEdit?: boolean;
}

export default function OrderForm({ onSubmit, onCancel, initialData, isEdit = false }: OrderFormProps) {
    const [orderData, setOrderData] = useState<Partial<Order>>({
        customerName: '',
        email: '',
        phone: '',
        address: '',
        status: 'pending',
        paymentMethod: '신용카드',
        items: [
            {
                id: `item-${Date.now()}-1`,
                product: '',
                quantity: 1,
                size: '',
                color: '',
                price: 0
            }
        ]
    });

    // 초기 데이터가 있으면 폼 데이터 설정
    useEffect(() => {
        if (initialData) {
            setOrderData({
                ...initialData,
                // 편집 시 items 배열의 각 항목에 id가 없을 경우 임시 id 생성
                items: initialData.items?.map((item, index) => ({
                    ...item,
                    id: item.id || `item-temp-${Date.now()}-${index + 1}`
                })) || []
            });
        }
    }, [initialData]);

    // 기본 주문 정보 변경 핸들러
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setOrderData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // 상품 항목 변경 핸들러
    const handleItemChange = (index: number, updatedItem: Partial<OrderItem>) => {
        const updatedItems = [...(orderData.items || [])];
        updatedItems[index] = { ...updatedItems[index], ...updatedItem };

        setOrderData(prev => ({
            ...prev,
            items: updatedItems
        }));
    };

    // 상품 항목 추가 핸들러
    const handleAddItem = () => {
        const newItem: Partial<OrderItem> = {
            id: `item-${Date.now()}-${(orderData.items?.length || 0) + 1}`,
            product: '',
            quantity: 1,
            size: '',
            color: '',
            price: 0
        };

        setOrderData(prev => ({
            ...prev,
            items: [...(prev.items || []), newItem]
        }));
    };

    // 상품 항목 제거 핸들러
    const handleRemoveItem = (index: number) => {
        const updatedItems = [...(orderData.items || [])];
        updatedItems.splice(index, 1);

        setOrderData(prev => ({
            ...prev,
            items: updatedItems
        }));
    };

    // 총 주문 금액 계산
    const calculateTotalPrice = (): number => {
        return (orderData.items || []).reduce((sum, item) => {
            return sum + ((item.price || 0) * (item.quantity || 1));
        }, 0);
    };    // 폼 제출 핸들러
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // 필수 필드 유효성 검사
        if (!orderData.customerName) {
            alert('고객 이름은 필수 입력 항목입니다.');
            return;
        }

        if (!orderData.items || orderData.items.length === 0) {
            alert('최소 하나 이상의 상품을 추가해주세요.');
            return;
        } const invalidItems = (orderData.items || []).filter(
            item => !item.product || !item.size || !item.color || !item.price
        );

        if (invalidItems.length > 0) {
            alert('모든 상품 정보를 완전히 입력해주세요.');
            return;
        }

        // 총 가격 계산
        const totalPrice = calculateTotalPrice();

        // 주문 제출
        onSubmit({
            ...orderData,
            totalPrice
        });
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">{isEdit ? '주문 수정' : '새 주문 추가'}</h2>

            <div className="mb-6">
                <h3 className="text-md font-medium mb-3">고객 정보</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            고객 이름 *
                        </label>
                        <input
                            type="text"
                            name="customerName"
                            value={orderData.customerName || ''}
                            onChange={handleChange}
                            required
                            className="w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            이메일
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={orderData.email || ''}
                            onChange={handleChange}
                            className="w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            전화번호
                        </label>
                        <input
                            type="tel"
                            name="phone"
                            value={orderData.phone || ''}
                            onChange={handleChange}
                            placeholder="예: 010-1234-5678"
                            className="w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            배송 주소
                        </label>
                        <input
                            type="text"
                            name="address"
                            value={orderData.address || ''}
                            onChange={handleChange}
                            className="w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                </div>
            </div>

            <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-md font-medium">주문 상품</h3>
                    <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            총 {orderData.items?.length || 0}개 항목
                        </span>
                        <button
                            type="button"
                            onClick={handleAddItem}
                            className="text-sm px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        >
                            + 상품 추가
                        </button>
                    </div>
                </div>

                {orderData.items && orderData.items.length > 0 ? (
                    <div className="space-y-2">
                        {orderData.items.map((item, index) => (
                            <OrderItemForm
                                key={item.id || index}
                                item={item}
                                onChange={(updatedItem) => handleItemChange(index, updatedItem)}
                                onRemove={() => handleRemoveItem(index)}
                                isRemovable={orderData.items!.length > 1}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-gray-500 dark:text-gray-400">상품이 없습니다. 상품을 추가해주세요.</p>
                    </div>
                )}

                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg flex justify-between items-center">
                    <span className="font-medium">총 주문 금액:</span>
                    <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                        {calculateTotalPrice().toLocaleString()}원
                    </span>
                </div>
            </div>

            <div className="mb-6">
                <h3 className="text-md font-medium mb-3">주문 상태</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            결제 방법
                        </label>
                        <select
                            name="paymentMethod"
                            value={orderData.paymentMethod || '신용카드'}
                            onChange={handleChange}
                            className="w-full p-2 border border-gray-300 rounded-md"
                        >
                            <option value="신용카드">신용카드</option>
                            <option value="무통장입금">무통장입금</option>
                            <option value="계좌이체">계좌이체</option>
                            <option value="휴대폰결제">휴대폰결제</option>
                            <option value="카카오페이">카카오페이</option>
                            <option value="네이버페이">네이버페이</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            주문 상태
                        </label>
                        <select
                            name="status"
                            value={orderData.status || 'pending'}
                            onChange={handleChange}
                            className="w-full p-2 border border-gray-300 rounded-md"
                        >
                            <option value="pending">대기중</option>
                            <option value="processing">처리중</option>
                            <option value="shipped">배송중</option>
                            <option value="delivered">배송완료</option>
                            <option value="cancelled">취소됨</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex justify-end space-x-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                    취소
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                    {isEdit ? '주문 수정' : '주문 추가'}
                </button>
            </div>
        </form>
    );
}
