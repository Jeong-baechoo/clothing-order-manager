'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Order, OrderItem, ProductGroup, ProductVariant } from '../../models/orderTypes';
import ProductSelectionModal from './ProductSelectionModal';
import { calculateTotalPrice } from '../../utils/order-calculations';
import { isLegacyOrder, orderItemsToGroups, groupsToOrderItems, calculateGroupSubtotal, calculateGroupsTotalQuantity } from '../../utils/product-group-utils';
import OrderFormLegacyTable from './OrderFormLegacy';
import ProductGroupCard from './ProductGroupCard';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface OrderFormProps {
    onSubmit: (order: Partial<Order>) => void;
    onCancel: () => void;
    initialData?: Partial<Order>;
    isEdit?: boolean;
    hideButtons?: boolean;
    submitTrigger?: number;
}

export default function OrderForm({ onSubmit, onCancel, initialData, isEdit = false, hideButtons = false, submitTrigger }: OrderFormProps) {
    // =========================================================================
    // 공통 상태
    // =========================================================================
    const [orderData, setOrderData] = useState<Partial<Order>>({
        customerName: '',
        phone: '',
        address: '',
        status: 'pending',
        paymentMethod: '계좌이체',
        items: [],
    });

    const [shippingFee, setShippingFee] = useState<number>(3500);
    const [autoShipping, setAutoShipping] = useState<boolean>(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false);

    // =========================================================================
    // 레거시 모드 상태
    // =========================================================================
    const [isLegacyMode, setIsLegacyMode] = useState(false);
    const [highlightedItems, setHighlightedItems] = useState<Set<string>>(new Set());

    // =========================================================================
    // 계층형 모드 상태
    // =========================================================================
    const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [currentGroupIndex, setCurrentGroupIndex] = useState<number | null>(null);
    // 레거시 모드용 인덱스
    const [currentItemIndex, setCurrentItemIndex] = useState<number | null>(null);

    // 로컬 상품 데이터
    const productSizes = ['CS', 'CM', 'CL', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
    const productColors = ['화이트', '블랙', '그레이', '네이비', '레드', '블루', '그린', '옐로우', '오렌지', '핑크', '브라운', '레드켓', '태극'];

    // 드래그 앤 드롭 센서
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // =========================================================================
    // 초기화
    // =========================================================================
    useEffect(() => {
        if (initialData) {
            const shippingItem = initialData.items?.find(item => item.product === '배송비');
            const regularItems = initialData.items?.filter(item => item.product !== '배송비') || [];
            const itemsWithIds = regularItems.map((item, index) => ({
                ...item,
                id: item.id || `item-temp-${Date.now()}-${index + 1}`
            }));

            setOrderData({
                ...initialData,
                items: itemsWithIds,
            });

            // 배송비 설정
            if (shippingItem) {
                setShippingFee(shippingItem.price || 0);
                setAutoShipping(false);
            } else if (initialData.shippingFee !== undefined) {
                setShippingFee(initialData.shippingFee);
                setAutoShipping(false);
            }

            // 편집 모드: 레거시 판별
            if (isEdit && itemsWithIds.length > 0) {
                if (isLegacyOrder(itemsWithIds)) {
                    setIsLegacyMode(true);
                } else {
                    setIsLegacyMode(false);
                    const groups = orderItemsToGroups(itemsWithIds);
                    setProductGroups(groups);
                    setExpandedGroups(new Set(groups.map(g => g.id)));
                }
            }
        } else {
            // 새 주문: 계층형 UI, 빈 그룹 1개
            setIsLegacyMode(false);
            const initialGroup = createEmptyGroup();
            setProductGroups([initialGroup]);
            setExpandedGroups(new Set([initialGroup.id]));
        }
    }, [initialData, isEdit]);

    // 외부 제출 트리거
    useEffect(() => {
        if (submitTrigger && submitTrigger > 0) {
            const formElement = document.querySelector('form');
            if (formElement) {
                const event = new Event('submit', { bubbles: true, cancelable: true });
                formElement.dispatchEvent(event);
            }
        }
    }, [submitTrigger]);

    // =========================================================================
    // 가격 계산
    // =========================================================================
    const totalQuantity = useMemo(() => {
        if (isLegacyMode) {
            return (orderData.items || []).reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0);
        }
        return calculateGroupsTotalQuantity(productGroups);
    }, [isLegacyMode, orderData.items, productGroups]);

    const totalPrice = useMemo(() => {
        if (isLegacyMode) {
            const items = orderData.items?.filter(item => item.product !== '배송비') || [];
            return calculateTotalPrice(items);
        }
        const items = groupsToOrderItems(productGroups);
        return calculateTotalPrice(items);
    }, [isLegacyMode, orderData.items, productGroups]);

    // 배송비 자동 계산
    useEffect(() => {
        if (autoShipping) {
            if (totalPrice < 100000 && totalPrice > 0) {
                setShippingFee(3500);
            } else {
                setShippingFee(0);
            }
        }
    }, [totalPrice, autoShipping]);

    // =========================================================================
    // 공통 핸들러
    // =========================================================================
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setOrderData(prev => ({
            ...prev,
            [name]: value
        }));
    }, []);

    // =========================================================================
    // 유틸리티
    // =========================================================================
    function createEmptyGroup(): ProductGroup {
        const groupId = `group-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        return {
            id: groupId,
            product: '',
            productId: undefined,
            price: 0,
            variants: [{
                id: `variant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                quantity: 1,
                size: '',
                color: '',
                remarks: '',
            }],
            printings: [],
            extraLargePrintingQuantity: 0,
            extraLargePrintingPrice: 0,
        };
    }

    // =========================================================================
    // 레거시 모드 핸들러들
    // =========================================================================
    const handleItemChange = useCallback((index: number, field: keyof OrderItem, value: string | number) => {
        setOrderData(prev => ({
            ...prev,
            items: prev.items?.map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            ) || []
        }));
    }, []);

    const handleSafeNumberChange = useCallback((
        index: number,
        field: keyof OrderItem,
        value: string,
        min: number = 0,
        max: number = 9999,
        isInteger: boolean = true
    ) => {
        if (value === '' || value === '-') {
            setOrderData(prev => ({
                ...prev,
                items: prev.items?.map((item, i) =>
                    i === index ? { ...item, [field]: 0 } : item
                ) || []
            }));
            return;
        }

        let numValue = isInteger ? parseInt(value) : parseFloat(value);
        if (isNaN(numValue)) numValue = 0;
        numValue = Math.max(min, Math.min(max, numValue));

        setOrderData(prev => ({
            ...prev,
            items: prev.items?.map((item, i) =>
                i === index ? { ...item, [field]: numValue } : item
            ) || []
        }));
    }, []);

    const handleAddItem = useCallback(() => {
        const firstItem = orderData.items?.[0];
        const useLegacy = firstItem && !firstItem.printingOption && (
            (firstItem.smallPrintingQuantity ?? 0) > 0 ||
            (firstItem.largePrintingQuantity ?? 0) > 0 ||
            (firstItem.extraLargePrintingQuantity ?? 0) > 0
        );

        const newItem: OrderItem = useLegacy ? {
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
            designWorkPrice: 0,
            remarks: '-'
        } : {
            id: `item-${Date.now()}-${(orderData.items?.length || 0) + 1}`,
            product: '',
            quantity: 1,
            size: '',
            color: '',
            price: 0,
            printingOption: null,
            smallPrintCount: 0,
            mediumPrintCount: 0,
            largePrintCount: 0,
            extraLargePrintCount: 0,
            extraLargePrintingQuantity: 0,
            extraLargePrintingPrice: 0,
            remarks: '-'
        };

        setOrderData(prev => ({
            ...prev,
            items: [...(prev.items || []), newItem]
        }));
    }, [orderData.items]);

    const handleRemoveItem = useCallback((index: number) => {
        setOrderData(prev => ({
            ...prev,
            items: prev.items?.filter((_, i) => i !== index) || []
        }));
    }, []);

    const handleCopyItem = useCallback((index: number) => {
        const itemToCopy = orderData.items?.[index];
        if (!itemToCopy) return;

        const newItem: OrderItem = {
            ...JSON.parse(JSON.stringify(itemToCopy)),
            id: `item-${Date.now()}-${(orderData.items?.length || 0) + 1}`
        };

        setOrderData(prev => ({
            ...prev,
            items: [...(prev.items || []), newItem]
        }));
    }, [orderData.items]);

    const addHighlight = useCallback((itemId: string) => {
        setHighlightedItems(prev => new Set(prev).add(itemId));
        setTimeout(() => {
            setHighlightedItems(prev => {
                const newSet = new Set(prev);
                newSet.delete(itemId);
                return newSet;
            });
        }, 600);
    }, []);

    const handleMoveItemUp = useCallback((index: number) => {
        if (index === 0) return;
        setOrderData(prev => {
            const newItems = [...(prev.items || [])];
            const movingItem = newItems[index];
            [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
            if (movingItem.id) addHighlight(movingItem.id);
            return { ...prev, items: newItems };
        });
    }, [addHighlight]);

    const handleMoveItemDown = useCallback((index: number) => {
        const itemsLength = orderData.items?.length || 0;
        if (index === itemsLength - 1) return;
        setOrderData(prev => {
            const newItems = [...(prev.items || [])];
            const movingItem = newItems[index];
            [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
            if (movingItem.id) addHighlight(movingItem.id);
            return { ...prev, items: newItems };
        });
    }, [orderData.items?.length, addHighlight]);

    const handleLegacyDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setOrderData((prev) => {
                const oldIndex = prev.items?.findIndex((item) => item.id === active.id) ?? -1;
                const newIndex = prev.items?.findIndex((item) => item.id === over.id) ?? -1;
                if (oldIndex !== -1 && newIndex !== -1 && prev.items) {
                    const newItems = arrayMove(prev.items, oldIndex, newIndex);
                    const movedItem = newItems[newIndex];
                    if (movedItem.id) addHighlight(movedItem.id);
                    return { ...prev, items: newItems };
                }
                return prev;
            });
        }
    }, [addHighlight]);

    // =========================================================================
    // 계층형 모드 핸들러들
    // =========================================================================
    const handleAddGroup = useCallback(() => {
        const newGroup = createEmptyGroup();
        setProductGroups(prev => [...prev, newGroup]);
        setExpandedGroups(prev => new Set(prev).add(newGroup.id));
    }, []);

    const handleRemoveGroup = useCallback((groupIndex: number) => {
        setProductGroups(prev => prev.filter((_, i) => i !== groupIndex));
    }, []);

    const handleCopyGroup = useCallback((groupIndex: number) => {
        setProductGroups(prev => {
            const source = prev[groupIndex];
            if (!source) return prev;
            const ts = Date.now();
            const r = () => Math.random().toString(36).slice(2, 7);
            const copy: ProductGroup = {
                ...JSON.parse(JSON.stringify(source)),
                id: `group-${ts}-${r()}`,
                variants: source.variants.map(v => ({
                    ...v,
                    id: `variant-${ts}-${r()}`,
                })),
                printings: source.printings.map(p => ({
                    ...p,
                    id: `print-${ts}-${r()}`,
                })),
            };
            const next = [...prev];
            next.splice(groupIndex + 1, 0, copy);
            return next;
        });
    }, []);

    const handleGroupChange = useCallback((groupIndex: number, field: string, value: string | number) => {
        setProductGroups(prev => prev.map((g, i) =>
            i === groupIndex ? { ...g, [field]: value } : g
        ));
    }, []);

    const handleVariantChange = useCallback((groupIndex: number, variantIndex: number, field: keyof ProductVariant, value: string | number) => {
        setProductGroups(prev => prev.map((g, i) => {
            if (i !== groupIndex) return g;
            return {
                ...g,
                variants: g.variants.map((v, vi) =>
                    vi === variantIndex ? { ...v, [field]: value } : v
                ),
            };
        }));
    }, []);

    const handleAddVariant = useCallback((groupIndex: number) => {
        setProductGroups(prev => prev.map((g, i) => {
            if (i !== groupIndex) return g;
            return {
                ...g,
                variants: [...g.variants, {
                    id: `variant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    quantity: 1,
                    size: '',
                    color: '',
                    remarks: '',
                }],
            };
        }));
    }, []);

    const handleRemoveVariant = useCallback((groupIndex: number, variantIndex: number) => {
        setProductGroups(prev => prev.map((g, i) => {
            if (i !== groupIndex) return g;
            if (g.variants.length <= 1) return g;
            return {
                ...g,
                variants: g.variants.filter((_, vi) => vi !== variantIndex),
            };
        }));
    }, []);

    const handlePrintingConfigChange = useCallback((groupIndex: number, printingIndex: number, field: string, value: string | number) => {
        setProductGroups(prev => prev.map((g, i) => {
            if (i !== groupIndex) return g;
            return {
                ...g,
                printings: g.printings.map((p, pi) =>
                    pi === printingIndex ? { ...p, [field]: value } : p
                ),
            };
        }));
    }, []);

    const handleAddPrinting = useCallback((groupIndex: number) => {
        setProductGroups(prev => prev.map((g, i) => {
            if (i !== groupIndex) return g;
            return {
                ...g,
                printings: [...g.printings, {
                    id: `print-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    printingOption: 'dtf' as const,
                    smallPrintCount: 0,
                    mediumPrintCount: 0,
                    largePrintCount: 0,
                    extraLargePrintCount: 0,
                }],
            };
        }));
    }, []);

    const handleRemovePrinting = useCallback((groupIndex: number, printingIndex: number) => {
        setProductGroups(prev => prev.map((g, i) => {
            if (i !== groupIndex) return g;
            return {
                ...g,
                printings: g.printings.filter((_, pi) => pi !== printingIndex),
            };
        }));
    }, []);

    const handleCustomPricingChange = useCallback((groupIndex: number, field: string, value: number) => {
        setProductGroups(prev => prev.map((g, i) =>
            i === groupIndex ? { ...g, [field]: value } : g
        ));
    }, []);

    const handleToggleGroup = useCallback((groupId: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) {
                next.delete(groupId);
            } else {
                next.add(groupId);
            }
            return next;
        });
    }, []);

    // 계층형 DnD
    const handleGroupDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setProductGroups(prev => {
                const oldIndex = prev.findIndex(g => g.id === active.id);
                const newIndex = prev.findIndex(g => g.id === over.id);
                if (oldIndex !== -1 && newIndex !== -1) {
                    return arrayMove(prev, oldIndex, newIndex);
                }
                return prev;
            });
        }
    }, []);

    // =========================================================================
    // 상품 선택 모달
    // =========================================================================
    const openProductSelectionForLegacy = useCallback((index: number) => {
        setCurrentItemIndex(index);
        setCurrentGroupIndex(null);
        setShowProductModal(true);
    }, []);

    const openProductSelectionForGroup = useCallback((groupIndex: number) => {
        setCurrentGroupIndex(groupIndex);
        setCurrentItemIndex(null);
        setShowProductModal(true);
    }, []);

    const handleProductSelect = (product: { id: string; name: string; default_price: number; company_id: string; companies?: { name: string } }) => {
        if (isLegacyMode && currentItemIndex !== null) {
            setOrderData(prev => ({
                ...prev,
                items: prev.items?.map((item, i) =>
                    i === currentItemIndex ? {
                        ...item,
                        product: product.name,
                        productId: product.id,
                        price: product.default_price || 0
                    } : item
                ) || []
            }));
        } else if (!isLegacyMode && currentGroupIndex !== null) {
            setProductGroups(prev => prev.map((g, i) =>
                i === currentGroupIndex ? {
                    ...g,
                    product: product.name,
                    productId: product.id,
                    price: product.default_price || 0,
                } : g
            ));
        }
        setCurrentItemIndex(null);
        setCurrentGroupIndex(null);
    };

    // =========================================================================
    // 폼 유효성 검사
    // =========================================================================
    const validateForm = (): { isValid: boolean; errors: string[] } => {
        const errors: string[] = [];

        if (!orderData.customerName?.trim()) {
            errors.push('고객 이름은 필수 입력 항목입니다.');
        } else if (orderData.customerName.length > 50) {
            errors.push('고객 이름은 50자를 초과할 수 없습니다.');
        }

        if (orderData.phone) {
            if (orderData.phone.length > 20) {
                errors.push('전화번호는 20자를 초과할 수 없습니다.');
            }
            if (!/^[\d\-+()\s]{8,20}$/.test(orderData.phone.trim())) {
                errors.push('올바른 전화번호 형식을 입력해주세요.');
            }
        }

        if (orderData.address && orderData.address.length > 255) {
            errors.push('주소는 255자를 초과할 수 없습니다.');
        }

        // 레거시/계층 공통: 아이템 생성
        const itemsToValidate = isLegacyMode
            ? (orderData.items || [])
            : groupsToOrderItems(productGroups);

        if (itemsToValidate.length === 0) {
            errors.push('최소 하나 이상의 상품을 추가해주세요.');
        } else {
            itemsToValidate.forEach((item, index) => {
                const itemNum = index + 1;

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

                if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 9999) {
                    errors.push(`${itemNum}번 상품의 수량은 1-9999 사이의 정수여야 합니다.`);
                }

                // 복수 프린팅 추가 행(price=0)은 단가 검증 스킵
                const isAdditionalPrintingRow = item.price === 0 && !!item.printingOption;
                if (!isAdditionalPrintingRow && (item.price <= 0 || item.price > 10000000)) {
                    errors.push(`${itemNum}번 상품의 단가는 1-10,000,000원 사이여야 합니다.`);
                }

                if (item.printingOption) {
                    const printCounts = [item.smallPrintCount, item.mediumPrintCount, item.largePrintCount, item.extraLargePrintCount];
                    for (const count of printCounts) {
                        if (count !== undefined && (!Number.isInteger(count) || count < 0 || count > 99)) {
                            errors.push(`${itemNum}번 상품의 인쇄 개수는 0-99 사이의 정수여야 합니다.`);
                            break;
                        }
                    }
                } else if (isLegacyMode) {
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

                    if (item.extraLargePrintingQuantity !== undefined &&
                        item.extraLargePrintingQuantity > 0 &&
                        (!item.extraLargePrintingPrice || item.extraLargePrintingPrice <= 0)) {
                        errors.push(`${itemNum}번 상품의 개별단가를 입력해주세요.`);
                    }
                }
            });
        }

        const total = calculateTotalPrice(itemsToValidate);
        if (total > 999999999) {
            errors.push('총 주문 금액이 너무 큽니다.');
        }
        if (total <= 0) {
            errors.push('총 주문 금액은 0원보다 커야 합니다.');
        }

        return { isValid: errors.length === 0, errors };
    };

    // =========================================================================
    // 폼 제출
    // =========================================================================
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
            const pureItems = isLegacyMode
                ? (orderData.items?.filter(item => item.product !== '배송비') || [])
                : groupsToOrderItems(productGroups);

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

    // =========================================================================
    // 아이템 개수 (레거시/계층 공통)
    // =========================================================================
    const itemCount = isLegacyMode
        ? (orderData.items?.length || 0)
        : productGroups.reduce((sum, g) => sum + g.variants.length, 0);

    // =========================================================================
    // 렌더링
    // =========================================================================
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

                    {/* 주문 상품 섹션 */}
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
                                            {isLegacyMode
                                                ? `${orderData.items?.length || 0}개 항목`
                                                : `${productGroups.length}개 그룹 / ${itemCount}개 변형`
                                            }
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={isLegacyMode ? handleAddItem : handleAddGroup}
                                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        {isLegacyMode ? '상품 추가' : '상품 그룹 추가'}
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
                                {/* ================= 레거시 모드 ================= */}
                                {isLegacyMode && (
                                    <>
                                        {orderData.items && orderData.items.length > 0 ? (
                                            <OrderFormLegacyTable
                                                items={orderData.items}
                                                handleItemChange={handleItemChange}
                                                handleSafeNumberChange={handleSafeNumberChange}
                                                handleRemoveItem={handleRemoveItem}
                                                handleCopyItem={handleCopyItem}
                                                handleMoveItemUp={handleMoveItemUp}
                                                handleMoveItemDown={handleMoveItemDown}
                                                handleAddItem={handleAddItem}
                                                openProductSelection={openProductSelectionForLegacy}
                                                handleDragEnd={handleLegacyDragEnd}
                                                sensors={sensors}
                                                productSizes={productSizes}
                                                productColors={productColors}
                                                highlightedItems={highlightedItems}
                                            />
                                        ) : (
                                            <EmptyState />
                                        )}
                                    </>
                                )}

                                {/* ================= 계층형 모드 ================= */}
                                {!isLegacyMode && (
                                    <>
                                        {productGroups.length > 0 ? (
                                            <DndContext
                                                sensors={sensors}
                                                collisionDetection={closestCenter}
                                                onDragEnd={handleGroupDragEnd}
                                            >
                                                <SortableContext
                                                    items={productGroups.map(g => g.id)}
                                                    strategy={verticalListSortingStrategy}
                                                >
                                                    {productGroups.map((group, groupIndex) => (
                                                        <ProductGroupCard
                                                            key={group.id}
                                                            group={group}
                                                            groupIndex={groupIndex}
                                                            totalQuantity={totalQuantity}
                                                            isExpanded={expandedGroups.has(group.id)}
                                                            onToggle={() => handleToggleGroup(group.id)}
                                                            onGroupChange={(field, value) => handleGroupChange(groupIndex, field, value)}
                                                            onVariantChange={(variantIndex, field, value) => handleVariantChange(groupIndex, variantIndex, field, value)}
                                                            onAddVariant={() => handleAddVariant(groupIndex)}
                                                            onRemoveVariant={(variantIndex) => handleRemoveVariant(groupIndex, variantIndex)}
                                                            onPrintingConfigChange={(pIndex, field, value) => handlePrintingConfigChange(groupIndex, pIndex, field, value)}
                                                            onAddPrinting={() => handleAddPrinting(groupIndex)}
                                                            onRemovePrinting={(pIndex) => handleRemovePrinting(groupIndex, pIndex)}
                                                            onCustomPricingChange={(field, value) => handleCustomPricingChange(groupIndex, field, value)}
                                                            onCopyGroup={() => handleCopyGroup(groupIndex)}
                                                            onRemoveGroup={() => handleRemoveGroup(groupIndex)}
                                                            openProductSelection={() => openProductSelectionForGroup(groupIndex)}
                                                            productSizes={productSizes}
                                                            productColors={productColors}
                                                            groupSubtotal={calculateGroupSubtotal(group, totalQuantity)}
                                                        />
                                                    ))}
                                                </SortableContext>
                                            </DndContext>
                                        ) : (
                                            <EmptyState />
                                        )}
                                    </>
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
                                                        setAutoShipping(false);
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
                                            value={orderData.paymentMethod || '계좌이체'}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                                        >
                                            <option value="계좌이체">계좌이체</option>
                                            <option value="신용카드">신용카드</option>
                                            <option value="무통장입금">무통장입금</option>
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
                                            <option value="paid">입금완료</option>
                                            <option value="printing_request">프린팅요청</option>
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
                    setCurrentGroupIndex(null);
                }}
                onSelect={handleProductSelect}
            />

            {/* 드래그 중 커서 스타일 */}
            <style jsx global>{`
                .drag-handle {
                    touch-action: none;
                }

                .drag-handle:active {
                    cursor: grabbing !important;
                }

                /* 하이라이트 애니메이션 */
                @keyframes highlight-fade {
                    0% {
                        background-color: rgb(219 234 254); /* bg-blue-100 */
                        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
                    }
                    100% {
                        background-color: transparent;
                        box-shadow: none;
                    }
                }
            `}</style>
        </div>
    );
}

// 빈 상태 컴포넌트
function EmptyState() {
    return (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">등록된 상품이 없습니다</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">상품 추가 버튼을 클릭하여 상품을 등록하세요</p>
        </div>
    );
}
