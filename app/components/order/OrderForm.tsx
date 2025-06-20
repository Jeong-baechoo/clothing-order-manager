'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Order, OrderItem } from '../../models/orderTypes';
import ProductSelectionModal from './ProductSelectionModal';
import { calculateUnitPrice, calculateItemTotal, calculateTotalPrice } from '../../utils/order-calculations';

interface OrderFormProps {
    onSubmit: (order: Partial<Order>) => void;
    onCancel: () => void;
    initialData?: Partial<Order>;
    isEdit?: boolean;
    hideButtons?: boolean;
    submitTrigger?: number;
}

export default function OrderForm({ onSubmit, onCancel, initialData, isEdit = false, hideButtons = false, submitTrigger }: OrderFormProps) {
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
                productId: '', // 정규화된 product_id 필드 추가
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
    
    const [shippingFee, setShippingFee] = useState<number>(3500); // 배송비 별도 관리
    const [autoShipping, setAutoShipping] = useState<boolean>(true); // 배송비 자동 계산 여부

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false);
    const [currentItemIndex, setCurrentItemIndex] = useState<number | null>(null);
    const [highlightedItems, setHighlightedItems] = useState<Set<string>>(new Set());

    // 로컬 상품 데이터 (기존 DB에 없는 필드들)
    const productSizes = ['CS', 'CM', 'CL', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
    const productColors = ['화이트', '블랙', '그레이', '네이비', '레드', '블루', '그린', '옐로우', '핑크', '브라운'];

    // 초기 데이터가 있으면 폼 데이터 설정
    useEffect(() => {
        if (initialData) {
            // 배송비 항목 찾기
            const shippingItem = initialData.items?.find(item => item.product === '배송비');
            const regularItems = initialData.items?.filter(item => item.product !== '배송비') || [];
            
            setOrderData({
                ...initialData,
                items: regularItems.map((item, index) => ({
                    ...item,
                    id: item.id || `item-temp-${Date.now()}-${index + 1}`
                }))
            });
            
            // 배송비 설정
            if (shippingItem) {
                setShippingFee(shippingItem.price || 0);
                setAutoShipping(false); // 기존 데이터가 있으면 수동 모드
            } else if (initialData.shippingFee !== undefined) {
                setShippingFee(initialData.shippingFee);
                setAutoShipping(false); // 기존 데이터가 있으면 수동 모드
            }
        }
    }, [initialData]);

    // 외부에서 제출 트리거 시 폼 제출
    useEffect(() => {
        if (submitTrigger && submitTrigger > 0) {
            const formElement = document.querySelector('form');
            if (formElement) {
                const event = new Event('submit', { bubbles: true, cancelable: true });
                formElement.dispatchEvent(event);
            }
        }
    }, [submitTrigger]);

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
    
    // 배송비 추가 핸들러 제거 (더 이상 필요 없음)

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

    // 하이라이트 효과 추가 함수
    const addHighlight = useCallback((itemId: string) => {
        setHighlightedItems(prev => new Set(prev).add(itemId));
        // 0.6초 후 하이라이트 제거
        setTimeout(() => {
            setHighlightedItems(prev => {
                const newSet = new Set(prev);
                newSet.delete(itemId);
                return newSet;
            });
        }, 600);
    }, []);

    // 상품 항목 위로 이동 핸들러
    const handleMoveItemUp = useCallback((index: number) => {
        if (index === 0) return; // 첫 번째 항목은 위로 이동 불가

        setOrderData(prev => {
            const newItems = [...(prev.items || [])];
            const movingItem = newItems[index];
            // 현재 항목과 위 항목을 교환
            [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
            
            // 이동한 항목에 하이라이트 효과 추가
            if (movingItem.id) {
                addHighlight(movingItem.id);
            }
            
            return {
                ...prev,
                items: newItems
            };
        });
    }, [addHighlight]);

    // 상품 항목 아래로 이동 핸들러
    const handleMoveItemDown = useCallback((index: number) => {
        const itemsLength = orderData.items?.length || 0;
        if (index === itemsLength - 1) return; // 마지막 항목은 아래로 이동 불가

        setOrderData(prev => {
            const newItems = [...(prev.items || [])];
            const movingItem = newItems[index];
            // 현재 항목과 아래 항목을 교환
            [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
            
            // 이동한 항목에 하이라이트 효과 추가
            if (movingItem.id) {
                addHighlight(movingItem.id);
            }
            
            return {
                ...prev,
                items: newItems
            };
        });
    }, [orderData.items?.length, addHighlight]);

    // 상품 금액 계산 (배송비 제외)
    const totalPrice = useMemo(() => {
        const items = orderData.items?.filter(item => item.product !== '배송비') || [];
        return calculateTotalPrice(items);
    }, [orderData.items]);
    
    // 배송비 자동 계산 (상품 금액이 100,000원 미만일 때)
    useEffect(() => {
        if (autoShipping) {
            if (totalPrice < 100000 && totalPrice > 0) {
                setShippingFee(3500);
            } else {
                setShippingFee(0);
            }
        }
    }, [totalPrice, autoShipping]);

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
            if (!/^[\d\-+()\s]{8,20}$/.test(orderData.phone.trim())) {
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
                
                // 배송비는 더 이상 주문 항목으로 처리하지 않음

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
        const total = calculateTotalPrice(orderData.items || []);
        if (total > 999999999) {  // 10억 미만으로 제한
            errors.push('총 주문 금액이 너무 큽니다.');
        }
        if (total <= 0) {
            errors.push('총 주문 금액은 0원보다 커야 합니다.');
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
                        productId: product.id, // 정규화된 product_id 저장
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
            // 배송비가 포함된 항목 제거하고 순수 상품만 전달
            const pureItems = orderData.items?.filter(item => item.product !== '배송비') || [];
            
            await onSubmit({
                ...orderData,
                items: pureItems,
                shippingFee: shippingFee,
                totalPrice: totalPrice + shippingFee
            });
        } catch (error) {
            console.error('주문 제출 중 오류:', error);
            alert('주문 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-full">
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
                <div className="space-y-6">
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
                                    <div className="overflow-x-auto max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg min-h-96">
                                        <table className="w-full border-collapse border border-gray-300 dark:border-gray-600" style={{tableLayout: 'fixed', minWidth: '1550px'}}>
                                            <colgroup>
                                                <col style={{ width: '50px' }} /><col style={{ width: '200px' }} /><col style={{ width: '80px' }} /><col style={{ width: '100px' }} /><col style={{ width: '100px' }} /><col style={{ width: '120px' }} /><col style={{ width: '120px' }} /><col style={{ width: '120px' }} /><col style={{ width: '120px' }} /><col style={{ width: '140px' }} /><col style={{ width: '140px' }} /><col style={{ width: '120px' }} /><col style={{ width: '140px' }} />
                                            </colgroup>
                                            <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700 z-10">
                                                <tr className="bg-gray-100 dark:bg-gray-700">
                                                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">No.</th>
                                                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">상품명</th>
                                                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">수량</th>
                                                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">사이즈</th>
                                                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">색상</th>
                                                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">의류 단가</th>
                                                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">소형인쇄</th>
                                                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">대형인쇄</th>
                                                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">특대형인쇄</th>
                                                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">디자인작업</th>
                                                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">단가</th>
                                                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">총 금액</th>
                                                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">관리</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {orderData.items.map((item, index) => (
                                                    <tr 
                                                        key={item.id || index} 
                                                        className={`
                                                            hover:bg-gray-50 dark:hover:bg-gray-700 
                                                            transition-all duration-300 ease-out
                                                            ${highlightedItems.has(item.id || '') ? 
                                                                'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-300 dark:ring-blue-700' : 
                                                                ''
                                                            }
                                                        `}
                                                        style={{
                                                            animation: highlightedItems.has(item.id || '') ? 'highlight-fade 0.6s ease-out' : 'none'
                                                        }}
                                                    >
                                                        <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center font-medium">
                                                            {index + 1}
                                                        </td>
                                                        <td className="border border-gray-300 dark:border-gray-600 px-2 py-2">
                                                            <div className="w-full">
                                                                <input
                                                                    type="text"
                                                                    value={item.product || ''}
                                                                    onChange={(e) => {
                                                                        const value = e.target.value.slice(0, 100); // 100자 제한
                                                                        handleItemChange(index, 'product', value);
                                                                    }}
                                                                    placeholder="상품명"
                                                                    className="w-full px-1 py-1 border border-gray-200 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100 rounded text-xs focus:ring-1 focus:ring-blue-500 mb-1"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openProductSelection(index)}
                                                                    className="w-full px-1 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
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
                                                                        onChange={(e) => handleSafeNumberChange(index, 'smallPrintingQuantity', e.target.value, 0, 9999, true)}
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
                                                                        onChange={(e) => handleSafeNumberChange(index, 'largePrintingQuantity', e.target.value, 0, 9999, true)}
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
                                                                            onChange={(e) => handleSafeNumberChange(index, 'extraLargePrintingQuantity', e.target.value, 0, 9999, true)}
                                                                            min="0"
                                                                            placeholder="개수"
                                                                            className="w-full px-2 py-1 border border-gray-200 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100 rounded text-sm focus:ring-1 focus:ring-blue-500"
                                                                        />
                                                                        <input
                                                                            type="number"
                                                                            value={item.extraLargePrintingPrice || ''}
                                                                            onChange={(e) => handleSafeNumberChange(index, 'extraLargePrintingPrice', e.target.value, 0, 10000000, false)}
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
                                                                            onChange={(e) => handleSafeNumberChange(index, 'designWorkQuantity', e.target.value, 0, 9999, true)}
                                                                            min="0"
                                                                            placeholder="개수"
                                                                            className="w-full px-2 py-1 border border-gray-200 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100 rounded text-sm focus:ring-1 focus:ring-blue-500"
                                                                        />
                                                                        <input
                                                                            type="number"
                                                                            value={item.designWorkPrice || ''}
                                                                            onChange={(e) => handleSafeNumberChange(index, 'designWorkPrice', e.target.value, 0, 10000000, false)}
                                                                            min="0"
                                                                            placeholder="단가"
                                                                            className="w-full px-2 py-1 border border-gray-200 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100 rounded text-sm focus:ring-1 focus:ring-blue-500"
                                                                        />
                                                                    </div>
                                                                </td>
                                                        <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right font-semibold text-green-600">
                                                            {calculateUnitPrice(item).toLocaleString()}원
                                                        </td>
                                                        <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right font-semibold text-blue-600">
                                                            {calculateItemTotal(item).toLocaleString()}원
                                                        </td>
                                                        <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center">
                                                            <div className="flex justify-center items-center space-x-1">
                                                                {/* 위로 이동 버튼 */}
                                                                {index > 0 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleMoveItemUp(index)}
                                                                        className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                                        title="위로 이동"
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                                        </svg>
                                                                    </button>
                                                                )}
                                                                {/* 아래로 이동 버튼 */}
                                                                {index < (orderData.items?.length || 0) - 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleMoveItemDown(index)}
                                                                        className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                                        title="아래로 이동"
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                                        </svg>
                                                                    </button>
                                                                )}
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

                                {/* 금액 정보 섹션 */}
                                <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-900 rounded-lg border border-blue-200 dark:border-blue-700">
                                    {/* 상품 금액 */}
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-gray-700 dark:text-gray-300">상품 금액</span>
                                        <span className="font-medium text-gray-900 dark:text-gray-100">{totalPrice.toLocaleString()}원</span>
                                    </div>
                                    
                                    {/* 배송비 */}
                                    <div className="mb-3">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-gray-700 dark:text-gray-300">배송비</label>
                                            <div className="flex items-center">
                                                <input
                                                    type="number"
                                                    value={shippingFee}
                                                    onChange={(e) => {
                                                        setShippingFee(parseInt(e.target.value) || 0);
                                                        setAutoShipping(false); // 수동 입력 시 자동 계산 해제
                                                    }}
                                                    min="0"
                                                    step="100"
                                                    disabled={autoShipping}
                                                    className="w-32 px-3 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-md text-right focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                />
                                                <span className="ml-2 text-gray-900 dark:text-gray-100">원</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center text-sm">
                                            <input
                                                type="checkbox"
                                                id="autoShipping"
                                                checked={autoShipping}
                                                onChange={(e) => setAutoShipping(e.target.checked)}
                                                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <label htmlFor="autoShipping" className="text-gray-600 dark:text-gray-400">
                                                자동 계산 (100,000원 미만 주문 시 3,500원)
                                            </label>
                                        </div>
                                    </div>
                                    
                                    {/* 구분선 */}
                                    <div className="border-t border-blue-300 dark:border-blue-700 pt-3 mt-3">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center">
                                                <svg className="w-6 h-6 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                                </svg>
                                                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">총 주문 금액</span>
                                            </div>
                                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                                {(totalPrice + shippingFee).toLocaleString()}원
                                            </span>
                                        </div>
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
                                            <option value="pending">대기중</option>
                                            <option value="processing">작업중</option>
                                            <option value="completed">완료</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                </div>
            </form>

            {/* 하단 버튼 영역 */}
            {!hideButtons && (
                    <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
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
                )}

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
