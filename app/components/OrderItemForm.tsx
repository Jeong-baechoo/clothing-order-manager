'use client';

import React, {useState} from 'react';
import {OrderItem} from '../models/orderTypes';
import ProductManager from './ProductManager';
import {createPortal} from 'react-dom';

// 사이즈 옵션 정의
const sizeOptions = [
    {value: 'XS', label: 'XS'},
    {value: 'S', label: 'S'},
    {value: 'M', label: 'M'},
    {value: 'L', label: 'L'},
    {value: 'XL', label: 'XL'},
    {value: 'XXL', label: 'XXL'},
    {value: '28', label: '28 (청바지)'},
    {value: '30', label: '30 (청바지)'},
    {value: '32', label: '32 (청바지)'},
    {value: '34', label: '34 (청바지)'},
    {value: '36', label: '36 (청바지)'},
    {value: '250', label: '250mm (신발)'},
    {value: '260', label: '260mm (신발)'},
    {value: '270', label: '270mm (신발)'},
    {value: '280', label: '280mm (신발)'},
    {value: 'FREE', label: 'FREE (프리사이즈)'}
];

// 색상 옵션 정의
const colorOptions = [
    {value: '검정', label: '검정'},
    {value: '흰색', label: '흰색'},
    {value: '회색', label: '회색'},
    {value: '네이비', label: '네이비'},
    {value: '베이지', label: '베이지'},
    {value: '브라운', label: '브라운'},
    {value: '카키', label: '카키'},
    {value: '올리브', label: '올리브'},
    {value: '레드', label: '레드'},
    {value: '블루', label: '블루'},
    {value: '그린', label: '그린'},
    {value: '옐로우', label: '옐로우'},
    {value: '퍼플', label: '퍼플'},
    {value: '핑크', label: '핑크'},
    {value: '오렌지', label: '오렌지'}
];

interface OrderItemFormProps {
    item: Partial<OrderItem>;
    onChange: (item: Partial<OrderItem>) => void;
    onRemove: () => void;
    isRemovable: boolean;
    isTableMode?: boolean;
}

export default function OrderItemForm({
                                          item,
                                          onChange,
                                          onRemove,
                                          isRemovable,
                                          isTableMode = false
                                      }: OrderItemFormProps) {
    // 직접 입력 모드 상태
    const [customSizeMode, setCustomSizeMode] = useState(false);
    const [customColorMode, setCustomColorMode] = useState(false);

    // 상품 선택 모달 상태
    const [showProductSelector, setShowProductSelector] = useState(false);

    // 사이즈나 색상이 기존 옵션에 없는 경우 직접 입력 모드로 설정
    React.useEffect(() => {
        if (item.size && !sizeOptions.some(option => option.value === item.size)) {
            setCustomSizeMode(true);
        }
        if (item.color && !colorOptions.some(option => option.value === item.color)) {
            setCustomColorMode(true);
        }
    }, [item.size, item.color]);

    // 제품 선택 처리
    const handleProductSelect = (companyName: string, productName: string, defaultPrice: number) => {
        onChange({
            ...item,
            product: `${companyName} - ${productName}`,
            price: defaultPrice
        });
        setShowProductSelector(false);
    };

    // 사이즈 선택/입력 컴포넌트
    const SizeSelector = () => (
        customSizeMode ? (
            <div className="flex space-x-2">
                <input
                    type="text"
                    value={item.size || ''}
                    onChange={(e) => onChange({...item, size: e.target.value})}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="직접 입력"
                />
                <button
                    type="button"
                    onClick={() => setCustomSizeMode(false)}
                    className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md text-xs hover:bg-gray-300 dark:hover:bg-gray-500"
                >
                    목록
                </button>
            </div>
        ) : (
            <div className="flex space-x-2">
                <select
                    value={item.size || ''}
                    onChange={(e) => onChange({...item, size: e.target.value})}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                    <option value="">사이즈 선택</option>
                    {sizeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <button
                    type="button"
                    onClick={() => setCustomSizeMode(true)}
                    className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md text-xs hover:bg-gray-300 dark:hover:bg-gray-500"
                >
                    직접 입력
                </button>
            </div>
        )
    );

    // 색상 선택/입력 컴포넌트
    const ColorSelector = () => (
        customColorMode ? (
            <div className="flex space-x-2">
                <input
                    type="text"
                    value={item.color || ''}
                    onChange={(e) => onChange({...item, color: e.target.value})}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="직접 입력"
                />
                <button
                    type="button"
                    onClick={() => setCustomColorMode(false)}
                    className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md text-xs hover:bg-gray-300 dark:hover:bg-gray-500"
                >
                    목록
                </button>
            </div>
        ) : (
            <div className="flex space-x-2">
                <select
                    value={item.color || ''}
                    onChange={(e) => onChange({...item, color: e.target.value})}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                    <option value="">색상 선택</option>
                    {colorOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <button
                    type="button"
                    onClick={() => setCustomColorMode(true)}
                    className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md text-xs hover:bg-gray-300 dark:hover:bg-gray-500"
                >
                    직접 입력
                </button>
            </div>
        )
    );

    // 테이블 모드일 때 렌더링
    if (isTableMode) {
        return (
            <>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-3 py-2">
                        <div className="flex space-x-2 relative">
                            <input
                                type="text"
                                value={item.product || ''}
                                onChange={(e) => onChange({...item, product: e.target.value})}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                placeholder="예: 면 티셔츠"
                                readOnly={showProductSelector}
                            />
                            <button
                                type="button"
                                onClick={() => setShowProductSelector(true)}
                                className="px-2 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-xs"
                            >
                                찾기
                            </button>
                            {showProductSelector && createPortal(
                                <div
                                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                    <div
                                        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                                        <div className="p-4 border-b border-gray-200">
                                            <div className="flex justify-between items-center">
                                                <h2 className="text-lg font-bold">상품 선택</h2>
                                                <button
                                                    onClick={() => setShowProductSelector(false)}
                                                    className="text-gray-500 hover:text-gray-700"
                                                >
                                                    &times; 닫기
                                                </button>
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <ProductManager onSelectProduct={handleProductSelect}/>
                                        </div>
                                    </div>
                                </div>,
                                document.body
                            )}
                        </div>
                    </td>
                    <td className="px-3 py-2">
                        <input
                            type="number"
                            value={item.quantity === undefined ? '' : item.quantity}
                            onChange={(e) => {
                                const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                                onChange({...item, quantity: value});
                            }}
                            min="0"
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                    </td>
                    <td className="px-3 py-2">
                        <SizeSelector/>
                    </td>
                    <td className="px-3 py-2">
                        <ColorSelector/>
                    </td>
                    <td className="px-3 py-2">
                        <input
                            type="number"
                            value={item.price === 0 && !item.price ? '' : item.price}
                            onChange={(e) => {
                                const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                                onChange({...item, price: value});
                            }}
                            min="0"
                            step="1000"
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                    </td>
                    <td className="px-3 py-2">
                        <div className="flex flex-col space-y-1">
                            <div className="flex justify-between">
                                <span className="text-xs">소형:</span>
                                <input
                                    type="number"
                                    value={item.smallPrintingQuantity || ''}
                                    onChange={(e) => {
                                        const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                                        onChange({...item, smallPrintingQuantity: value});
                                    }}
                                    min="0"
                                    className="w-16 p-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    placeholder="수량"
                                />
                            </div>
                            <div className="flex justify-between">
                                <span className="text-xs">대형:</span>
                                <input
                                    type="number"
                                    value={item.largePrintingQuantity || ''}
                                    onChange={(e) => {
                                        const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                                        onChange({...item, largePrintingQuantity: value});
                                    }}
                                    min="0"
                                    className="w-16 p-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    placeholder="수량"
                                />
                            </div>
                            <div className="flex justify-between">
                                <span className="text-xs">특대:</span>
                                <div className="flex space-x-1">
                                    <input
                                        type="number"
                                        value={item.extraLargePrintingQuantity || ''}
                                        onChange={(e) => {
                                            const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                                            onChange({...item, extraLargePrintingQuantity: value});
                                        }}
                                        min="0"
                                        className="w-10 p-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        placeholder="수량"
                                    />
                                    <input
                                        type="number"
                                        value={item.extraLargePrintingPrice || ''}
                                        onChange={(e) => {
                                            const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                                            onChange({...item, extraLargePrintingPrice: value});
                                        }}
                                        min="0"
                                        className="w-16 p-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        placeholder="가격"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-xs">디자인:</span>
                                <div className="flex space-x-1">
                                    <input
                                        type="number"
                                        value={item.designWorkQuantity || ''}
                                        onChange={(e) => {
                                            const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                                            onChange({...item, designWorkQuantity: value});
                                        }}
                                        min="0"
                                        className="w-10 p-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        placeholder="수량"
                                    />
                                    <input
                                        type="number"
                                        value={item.designWorkPrice || ''}
                                        onChange={(e) => {
                                            const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                                            onChange({...item, designWorkPrice: value});
                                        }}
                                        min="0"
                                        className="w-16 p-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        placeholder="가격"
                                    />
                                </div>
                            </div>
                        </div>
                    </td>
                    <td className="px-3 py-2">
                        <span className="font-semibold">{
                            (() => {
                                let total = (item.price || 0) * (item.quantity === undefined ? 0 : item.quantity);
                                total += (item.smallPrintingQuantity || 0) * 1500;
                                total += (item.largePrintingQuantity || 0) * 3000;

                                if (item.extraLargePrintingQuantity && item.extraLargePrintingPrice) {
                                    total += item.extraLargePrintingQuantity * item.extraLargePrintingPrice;
                                }

                                if (item.designWorkQuantity && item.designWorkPrice) {
                                    total += item.designWorkQuantity * item.designWorkPrice;
                                }

                                return total.toLocaleString();
                            })()
                        }원</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                        {isRemovable && (
                            <button
                                onClick={onRemove}
                                className="text-red-500 hover:text-red-700"
                                type="button"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20"
                                     fill="currentColor">
                                    <path fillRule="evenodd"
                                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 011.414 1.414L11.414 10l4.293 4.293a1 1 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                          clipRule="evenodd"/>
                                </svg>
                            </button>
                        )}
                    </td>
                </tr>
            </>
        );
    }

    // 카드 모드일 때 렌더링 (기존 방식)
    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-3 relative">
            {isRemovable && (
                <button
                    onClick={onRemove}
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                    type="button"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 111.414 1.414L11.414 10l4.293 4.293a1 1 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"/>
                    </svg>
                </button>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        상품명
                    </label>
                    <div className="flex space-x-2 relative">
                        <input
                            type="text"
                            value={item.product || ''}
                            onChange={(e) => onChange({...item, product: e.target.value})}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="예: 면 티셔츠"
                            readOnly={showProductSelector}
                        />
                        <button
                            type="button"
                            onClick={() => setShowProductSelector(true)}
                            className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        >
                            찾기
                        </button>
                        {showProductSelector && createPortal(
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                <div
                                    className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                                    <div className="p-4 border-b border-gray-200">
                                        <div className="flex justify-between items-center">
                                            <h2 className="text-lg font-bold">상품 선택</h2>
                                            <button
                                                onClick={() => setShowProductSelector(false)}
                                                className="text-gray-500 hover:text-gray-700"
                                            >
                                                &times; 닫기
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <ProductManager onSelectProduct={handleProductSelect}/>
                                    </div>
                                </div>
                            </div>,
                            document.body
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        수량
                    </label>
                    <input
                        type="number"
                        value={item.quantity === undefined ? '' : item.quantity}
                        onChange={(e) => {
                            const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                            onChange({...item, quantity: value});
                        }}
                        min="0"
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        사이즈
                    </label>
                    <SizeSelector/>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        색상
                    </label>
                    <ColorSelector/>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        가격
                    </label>
                    <input
                        type="number"
                        value={item.price === 0 && !item.price ? '' : item.price}
                        onChange={(e) => {
                            const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                            onChange({...item, price: value});
                        }}
                        min="0"
                        step="1000"
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        인쇄 수량 및 가격
                    </label>
                    <div className="flex flex-col space-y-1">
                        <div className="flex justify-between">
                            <span className="text-xs">소형:</span>
                            <input
                                type="number"
                                value={item.smallPrintingQuantity || ''}
                                onChange={(e) => {
                                    const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                                    onChange({...item, smallPrintingQuantity: value});
                                }}
                                min="0"
                                className="w-16 p-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                placeholder="수량"
                            />
                        </div>
                        <div className="flex justify-between">
                            <span className="text-xs">대형:</span>
                            <input
                                type="number"
                                value={item.largePrintingQuantity || ''}
                                onChange={(e) => {
                                    const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                                    onChange({...item, largePrintingQuantity: value});
                                }}
                                min="0"
                                className="w-16 p-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                placeholder="수량"
                            />
                        </div>
                        <div className="flex justify-between">
                            <span className="text-xs">특대:</span>
                            <div className="flex space-x-1">
                                <input
                                    type="number"
                                    value={item.extraLargePrintingQuantity || ''}
                                    onChange={(e) => {
                                        const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                                        onChange({...item, extraLargePrintingQuantity: value});
                                    }}
                                    min="0"
                                    className="w-10 p-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    placeholder="수량"
                                />
                                <input
                                    type="number"
                                    value={item.extraLargePrintingPrice || ''}
                                    onChange={(e) => {
                                        const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                                        onChange({...item, extraLargePrintingPrice: value});
                                    }}
                                    min="0"
                                    className="w-16 p-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    placeholder="가격"
                                />
                            </div>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-xs">디자인:</span>
                            <div className="flex space-x-1">
                                <input
                                    type="number"
                                    value={item.designWorkQuantity || ''}
                                    onChange={(e) => {
                                        const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                                        onChange({...item, designWorkQuantity: value});
                                    }}
                                    min="0"
                                    className="w-10 p-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    placeholder="수량"
                                />
                                <input
                                    type="number"
                                    value={item.designWorkPrice || ''}
                                    onChange={(e) => {
                                        const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                                        onChange({...item, designWorkPrice: value});
                                    }}
                                    min="0"
                                    className="w-16 p-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    placeholder="가격"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
