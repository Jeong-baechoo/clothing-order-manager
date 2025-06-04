'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Order, OrderItem } from '../models/orderTypes';
import ProductSelectionModal from './ProductSelectionModal';

interface OrderFormProps {
    onSubmit: (order: Partial<Order>) => void;
    onCancel: () => void;
    initialData?: Partial<Order>;
    isEdit?: boolean;
}

export default function OrderForm({ onSubmit, onCancel, initialData, isEdit = false }: OrderFormProps) {
    const [orderData, setOrderData] = useState<Partial<Order>>({
        customerName: '',
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
                price: 0,
                smallPrintingQuantity: 0,
                largePrintingQuantity: 0,
                extraLargePrintingQuantity: 0,
                extraLargePrintingPrice: 0,
                designWorkQuantity: 0,
                designWorkPrice: 0
            }
        ]
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false);
    const [currentItemIndex, setCurrentItemIndex] = useState<number | null>(null);

    // 로컬 상품 데이터 (기존 DB에 없는 필드들)
    const productSizes = ['CS', 'CM', 'CL', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
    const productColors = ['화이트', '블랙', '그레이', '네이비', '레드', '블루', '그린', '옐로우', '핑크', '브라운'];

    // 초기 데이터가 있으면 폼 데이터 설정
    useEffect(() => {
        if (initialData) {
            setOrderData({
                ...initialData,
                items: initialData.items?.map((item, index) => ({
                    ...item,
                    id: item.id || `item-temp-${Date.now()}-${index + 1}`
                })) || []
            });
        }
    }, [initialData]);

    // 기본 주문 정보 변경 핸들러
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setOrderData(prev => ({
            ...prev,
            [name]: value
        }));
    }, []);

    // 상품 항목 변경 핸들러
    const handleItemChange = useCallback((index: number, field: keyof OrderItem, value: string | number) => {
        setOrderData(prev => ({
            ...prev,
            items: prev.items?.map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            ) || []
        }));
    }, []);

    // 상품 항목 추가 핸들러
    const handleAddItem = useCallback(() => {
        const newItem: OrderItem = {
            id: `item-${Date.now()}-${(orderData.items?.length || 0) + 1}`,
            product: '',
            quantity: 1,
            size: '',
            color: '',
            price: 0,
            smallPrintingQuantity: 0,
            largePrintingQuantity: 0,
            extraLargePrintingQuantity: 0,
            extraLargePrintingPrice: 0,
            designWorkQuantity: 0,
            designWorkPrice: 0
        };

        setOrderData(prev => ({
            ...prev,
            items: [...(prev.items || []), newItem]
        }));
    }, [orderData.items?.length]);

    // 상품 항목 제거 핸들러
    const handleRemoveItem = useCallback((index: number) => {
        setOrderData(prev => ({
            ...prev,
            items: prev.items?.filter((_, i) => i !== index) || []
        }));
    }, []);

    // 상품 항목 복사 핸들러
    const handleCopyItem = useCallback((index: number) => {
        const itemToCopy = orderData.items?.[index];
        if (!itemToCopy) return;

        const newItem: OrderItem = {
            ...JSON.parse(JSON.stringify(itemToCopy)), // 깊은 복사
            id: `item-${Date.now()}-${(orderData.items?.length || 0) + 1}`
        };

        setOrderData(prev => ({
            ...prev,
            items: [...(prev.items || []), newItem]
        }));
    }, [orderData.items]);

    // 개별 상품 총액 계산
    const calculateItemTotal = useCallback((item: OrderItem): number => {
        const quantity = Math.max(0, Number(item.quantity) || 0);
        const price = Math.max(0, Number(item.price) || 0);
        let itemTotal = price * quantity;

        // 프린팅 비용 추가
        itemTotal += Math.max(0, Number(item.smallPrintingQuantity) || 0) * 1500;
        itemTotal += Math.max(0, Number(item.largePrintingQuantity) || 0) * 3000;

        // 특대형 프린팅
        const extraLargeQty = Math.max(0, Number(item.extraLargePrintingQuantity) || 0);
        const extraLargePrice = Math.max(0, Number(item.extraLargePrintingPrice) || 0);
        if (extraLargeQty > 0 && extraLargePrice > 0) {
            itemTotal += extraLargeQty * extraLargePrice;
        }

        // 디자인 작업
        const designQty = Math.max(0, Number(item.designWorkQuantity) || 0);
        const designPrice = Math.max(0, Number(item.designWorkPrice) || 0);
        if (designQty > 0 && designPrice > 0) {
            itemTotal += designQty * designPrice;
        }

        return itemTotal;
    }, []);

    // 총 주문 금액 계산
    const calculateTotalPrice = useCallback((): number => {
        return (orderData.items || []).reduce((sum, item) => sum + calculateItemTotal(item), 0);
    }, [orderData.items, calculateItemTotal]);

    const totalPrice = useMemo(() => calculateTotalPrice(), [calculateTotalPrice]);

    // 폼 유효성 검사
    const validateForm = (): { isValid: boolean; errors: string[] } => {
        const errors: string[] = [];

        // 고객 정보 검증 강화
        if (!orderData.customerName?.trim()) {
            errors.push('고객 이름은 필수 입력 항목입니다.');
        } else if (orderData.customerName.length > 50) {
            errors.push('고객 이름은 50자를 초과할 수 없습니다.');
        }

        // 전화번호 검증
        if (orderData.phone) {
            if (orderData.phone.length > 20) {
                errors.push('전화번호는 20자를 초과할 수 없습니다.');
            }
            if (!/^[\d\-\+\(\)\s]{8,20}$/.test(orderData.phone.trim())) {
                errors.push('올바른 전화번호 형식을 입력해주세요.');
            }
        }

        // 주소 길이 검증
        if (orderData.address && orderData.address.length > 255) {
            errors.push('주소는 255자를 초과할 수 없습니다.');
        }

        // 상품 검증 강화
        if (!orderData.items || orderData.items.length === 0) {
            errors.push('최소 하나 이상의 상품을 추가해주세요.');
        } else {
            orderData.items.forEach((item, index) => {
                const itemNum = index + 1;

                // 필수 필드 검증
                if (!item.product?.trim()) {
                    errors.push(`${itemNum}번 상품명을 입력해주세요.`);
                } else if (item.product.length > 100) {
                    errors.push(`${itemNum}번 상품명은 100자를 초과할 수 없습니다.`);
                }

                if (!item.size?.trim()) {
                    errors.push(`${itemNum}번 상품의 사이즈를 입력해주세요.`);
                } else if (item.size.length > 20) {
                    errors.push(`${itemNum}번 상품의 사이즈는 20자를 초과할 수 없습니다.`);
                }

                if (!item.color?.trim()) {
                    errors.push(`${itemNum}번 상품의 색상을 입력해주세요.`);
                } else if (item.color.length > 30) {
                    errors.push(`${itemNum}번 상품의 색상은 30자를 초과할 수 없습니다.`);
                }

                // 숫자 필드 범위 검증
                if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 9999) {
                    errors.push(`${itemNum}번 상품의 수량은 1-9999 사이의 정수여야 합니다.`);
                }

                if (item.price <= 0 || item.price > 10000000) {
                    errors.push(`${itemNum}번 상품의 단가는 1-10,000,000원 사이여야 합니다.`);
                }

                // 인쇄 수량 검증
                if (item.smallPrintingQuantity !== undefined &&
                    (!Number.isInteger(item.smallPrintingQuantity) ||
                        item.smallPrintingQuantity < 0 ||
                        item.smallPrintingQuantity > 9999)) {
                    errors.push(`${itemNum}번 상품의 소형인쇄 수량은 0-9999 사이의 정수여야 합니다.`);
                }

                if (item.largePrintingQuantity !== undefined &&
                    (!Number.isInteger(item.largePrintingQuantity) ||
                        item.largePrintingQuantity < 0 ||
                        item.largePrintingQuantity > 9999)) {
                    errors.push(`${itemNum}번 상품의 대형인쇄 수량은 0-9999 사이의 정수여야 합니다.`);
                }

                // 특대형 인쇄 검증
                if (item.extraLargePrintingQuantity !== undefined &&
                    item.extraLargePrintingQuantity > 0 &&
                    (!item.extraLargePrintingPrice || item.extraLargePrintingPrice <= 0)) {
                    errors.push(`${itemNum}번 상품의 특대형인쇄 단가를 입력해주세요.`);
                }                // 디자인 작업 검증
                if (item.designWorkQuantity && item.designWorkQuantity > 0 &&
                    (!item.designWorkPrice || item.designWorkPrice <= 0)) {
                    errors.push(`${itemNum}번 상품의 디자인작업 단가를 입력해주세요.`);
                }
            });
        }

        // 총액 검증
        const total = calculateTotalPrice();
        if (total > 999999999) {  // 10억 미만으로 제한
            errors.push('총 주문 금액이 너무 큽니다.');
        }

        return { isValid: errors.length === 0, errors };
    };

    // 안전한 숫자 입력 핸들러
    const handleSafeNumberChange = useCallback((
        index: number,
        field: keyof OrderItem,
        value: string,
        min: number = 0,
        max: number = 9999,
        isInteger: boolean = true
    ) => {
        let numValue = isInteger ? parseInt(value) : parseFloat(value);

        // NaN 체크
        if (isNaN(numValue)) {
            numValue = min;
        }

        // 범위 제한
        numValue = Math.max(min, Math.min(max, numValue));

        setOrderData(prev => ({
            ...prev,
            items: prev.items?.map((item, i) =>
                i === index ? { ...item, [field]: numValue } : item
            ) || []
        }));
    }, []);    // 상품 선택 핸들러
    const handleProductSelect = (product: { id: string; name: string; default_price: number; company_id: string; companies?: { name: string } }) => {
        if (currentItemIndex !== null) {
            setOrderData(prev => ({
                ...prev,
                items: prev.items?.map((item, i) =>
                    i === currentItemIndex ? {
                        ...item,
                        product: product.name,
                        price: product.default_price || 0
                    } : item
                ) || []
            }));
        }
        setCurrentItemIndex(null);
    };

    // 상품 선택 모달 열기
    const openProductSelection = (index: number) => {
        setCurrentItemIndex(index);
        setShowProductModal(true);
    };

    // 폼 제출 핸들러
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isSubmitting) return;

        const validation = validateForm();
        if (!validation.isValid) {
            alert(validation.errors.join('\n'));
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit({
                ...orderData,
                totalPrice
            });
        } catch (error) {
            console.error('주문 제출 중 오류:', error);
            alert('주문 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-[95vw] max-h-[95vh] overflow-hidden">
                {/* 헤더 */}
                <div className="bg-blue-600 text-white px-6 py-4 border-b">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold">{isEdit ? '주문 수정' : '새 주문 등록'}</h2>
                            <p className="text-blue-100 text-sm mt-1">의류 주문 정보를 정확히 입력해주세요</p>
                        </div>
                        <button
                            type="button"
                            onClick={onCancel}
                            className="text-blue-100 hover:text-white p-2 rounded-md hover:bg-blue-700 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* 고객 정보 섹션 */}
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
                            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    고객 정보
                                </h3>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                            고객명 <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="customerName"
                                            value={orderData.customerName || ''}
                                            onChange={handleChange}
                                            required
                                            placeholder="고객 이름을 입력하세요"
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                            연락처
                                        </label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={orderData.phone || ''}
                                            onChange={handleChange}
                                            placeholder="010-0000-0000"
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                            배송지
                                        </label>
                                        <input
                                            type="text"
                                            name="address"
                                            value={orderData.address || ''}
                                            onChange={handleChange}
                                            placeholder="배송 주소를 입력하세요"
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 주문 상품 테이블 섹션 */}
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
                            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                                            <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                            </svg>
                                            주문 상품
                                        </h3>
                                        <span className="ml-3 px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                                            {orderData.items?.length || 0}개 항목
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddItem}
                                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        상품 추가
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
                                {orderData.items && orderData.items.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
                                            <thead>
                                                <tr className="bg-gray-100 dark:bg-gray-700">
                                                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">No.</th>
                                                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">상품명</th>
                                                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">수량</th>
                                                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">사이즈</th>
                                                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">색상</th>
                                                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">단가</th>
                                                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">소형인쇄</th>
                                                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">대형인쇄</th>                                                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">특대형인쇄</th>
                                                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">디자인작업</th>
                                                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">소계</th>
                                                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">관리</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {orderData.items.map((item, index) => (
                                                    <tr key={item.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                        <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center font-medium">
                                                            {index + 1}
                                                        </td>
                                                        <td className="border border-gray-300 dark:border-gray-600 px-3 py-2">
                                                            <div className="flex space-x-2">
                                                                <input
                                                                    type="text"
                                                                    value={item.product || ''}
                                                                    onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                                                                    placeholder="상품명 직접 입력"
                                                                    className="flex-1 px-2 py-1 border border-gray-200 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100 rounded text-sm focus:ring-1 focus:ring-blue-500"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openProductSelection(index)}
                                                                    className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors whitespace-nowrap"
                                                                    title="등록된 상품에서 선택"
                                                                >
                                                                    선택
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td className="border border-gray-300 dark:border-gray-600 px-3 py-2">
                                                            <input
                                                                type="number"
                                                                value={item.quantity || ''}
                                                                onChange={(e) => handleSafeNumberChange(index, 'quantity', e.target.value, 1, 9999, true)}
                                                                min="1"
                                                                max="9999"
                                                                required
                                                                className="w-full px-2 py-1 border border-gray-200 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100 rounded text-sm focus:ring-1 focus:ring-blue-500"
                                                            />
                                                        </td>
                                                        <td className="border border-gray-300 dark:border-gray-600 px-3 py-2">
                                                            <select
                                                                value={item.size || ''}
                                                                onChange={(e) => handleItemChange(index, 'size', e.target.value)}
                                                                required
                                                                className="w-full px-2 py-1 border border-gray-200 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100 rounded text-sm focus:ring-1 focus:ring-blue-500"
                                                            >
                                                                <option value="">사이즈 선택</option>
                                                                {productSizes.map(size => (
                                                                    <option key={size} value={size}>{size}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="border border-gray-300 dark:border-gray-600 px-3 py-2">
                                                            <select
                                                                value={item.color || ''}
                                                                onChange={(e) => handleItemChange(index, 'color', e.target.value)}
                                                                required
                                                                className="w-full px-2 py-1 border border-gray-200 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100 rounded text-sm focus:ring-1 focus:ring-blue-500"
                                                            >
                                                                <option value="">색상 선택</option>
                                                                {productColors.map(color => (
                                                                    <option key={color} value={color}>{color}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="border border-gray-300 dark:border-gray-600 px-3 py-2">
                                                            <input
                                                                type="number"
                                                                value={item.price || ''}
                                                                onChange={(e) => handleSafeNumberChange(index, 'price', e.target.value, 1, 10000000, false)}
                                                                min="1"
                                                                max="10000000"
                                                                step="1"
                                                                required
                                                                placeholder="원"
                                                                className="w-full px-2 py-1 border border-gray-200 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100 rounded text-sm focus:ring-1 focus:ring-blue-500"
                                                            />
                                                        </td>
                                                        <td className="border border-gray-300 dark:border-gray-600 px-3 py-2">
                                                            <input
                                                                type="number"
                                                                value={item.smallPrintingQuantity || ''}
                                                                onChange={(e) => handleItemChange(index, 'smallPrintingQuantity', parseInt(e.target.value) || 0)}
                                                                min="0"
                                                                placeholder="개수"
                                                                className="w-full px-2 py-1 border border-gray-200 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100 rounded text-sm focus:ring-1 focus:ring-blue-500"
                                                            />
                                                            <div className="text-xs text-gray-500 mt-1">1,500원/개</div>
                                                        </td>
                                                        <td className="border border-gray-300 dark:border-gray-600 px-3 py-2">
                                                            <input
                                                                type="number"
                                                                value={item.largePrintingQuantity || ''}
                                                                onChange={(e) => handleItemChange(index, 'largePrintingQuantity', parseInt(e.target.value) || 0)}
                                                                min="0"
                                                                placeholder="개수"
                                                                className="w-full px-2 py-1 border border-gray-200 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100 rounded text-sm focus:ring-1 focus:ring-blue-500"
                                                            />
                                                            <div className="text-xs text-gray-500 mt-1">3,000원/개</div>
                                                        </td>
                                                        <td className="border border-gray-300 dark:border-gray-600 px-3 py-2">
                                                            <div className="space-y-1">
                                                                <input
                                                                    type="number"
                                                                    value={item.extraLargePrintingQuantity || ''}
                                                                    onChange={(e) => handleItemChange(index, 'extraLargePrintingQuantity', parseInt(e.target.value) || 0)}
                                                                    min="0"
                                                                    placeholder="개수"
                                                                    className="w-full px-2 py-1 border border-gray-200 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100 rounded text-sm focus:ring-1 focus:ring-blue-500"
                                                                />
                                                                <input
                                                                    type="number"
                                                                    value={item.extraLargePrintingPrice || ''}
                                                                    onChange={(e) => handleItemChange(index, 'extraLargePrintingPrice', parseFloat(e.target.value) || 0)}
                                                                    min="0"
                                                                    placeholder="단가"
                                                                    className="w-full px-2 py-1 border border-gray-200 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100 rounded text-sm focus:ring-1 focus:ring-blue-500"
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="border border-gray-300 dark:border-gray-600 px-3 py-2">
                                                            <div className="space-y-1">
                                                                <input
                                                                    type="number"
                                                                    value={item.designWorkQuantity || ''}
                                                                    onChange={(e) => handleItemChange(index, 'designWorkQuantity', parseInt(e.target.value) || 0)}
                                                                    min="0"
                                                                    placeholder="개수"
                                                                    className="w-full px-2 py-1 border border-gray-200 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100 rounded text-sm focus:ring-1 focus:ring-blue-500"
                                                                />
                                                                <input
                                                                    type="number"
                                                                    value={item.designWorkPrice || ''}
                                                                    onChange={(e) => handleItemChange(index, 'designWorkPrice', parseFloat(e.target.value) || 0)}
                                                                    min="0"
                                                                    placeholder="단가"
                                                                    className="w-full px-2 py-1 border border-gray-200 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100 rounded text-sm focus:ring-1 focus:ring-blue-500"
                                                                />
                                                            </div>
                                                        </td>                                                        <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right font-semibold text-blue-600">
                                                            {calculateItemTotal(item).toLocaleString()}원
                                                        </td>
                                                        <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center">
                                                            <div className="flex justify-center items-center space-x-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleCopyItem(index)}
                                                                    className="text-blue-500 hover:text-blue-700 p-1 rounded-md hover:bg-blue-50 transition-colors"
                                                                    title="상품 복사"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                                                    </svg>
                                                                </button>
                                                                {orderData.items!.length > 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveItem(index)}
                                                                        className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 transition-colors"
                                                                        title="상품 삭제"
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                        </svg>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                        </svg>
                                        <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">등록된 상품이 없습니다</p>
                                        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">상품 추가 버튼을 클릭하여 상품을 등록하세요</p>
                                    </div>
                                )}

                                {/* 총 금액 표시 */}
                                <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-900 rounded-lg border border-blue-200 dark:border-blue-700">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center">
                                            <svg className="w-6 h-6 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                            </svg>
                                            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">총 주문 금액</span>
                                        </div>
                                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                            {totalPrice.toLocaleString()}원
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 주문 설정 섹션 */}
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
                            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                                    <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    주문 설정
                                </h3>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                            결제 방법
                                        </label>
                                        <select
                                            name="paymentMethod"
                                            value={orderData.paymentMethod || '신용카드'}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
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
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                            주문 상태
                                        </label>
                                        <select
                                            name="status"
                                            value={orderData.status || 'pending'}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                                        >
                                            <option value="pending">주문접수</option>
                                            <option value="processing">제작중</option>
                                            <option value="shipped">배송중</option>
                                            <option value="delivered">배송완료</option>
                                            <option value="cancelled">주문취소</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 하단 버튼 영역 */}
                    <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800">
                        <div className="flex justify-end space-x-4">
                            <button
                                type="button"
                                onClick={onCancel}
                                disabled={isSubmitting}
                                className="px-6 py-3 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                            >
                                취소
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-8 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md flex items-center"
                            >
                                {isSubmitting ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        처리중...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        {isEdit ? '주문 수정' : '주문 등록'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* 상품 선택 모달 */}
            <ProductSelectionModal
                isOpen={showProductModal}
                onClose={() => {
                    setShowProductModal(false);
                    setCurrentItemIndex(null);
                }}
                onSelect={handleProductSelect}
            />
        </div>
    );
}
