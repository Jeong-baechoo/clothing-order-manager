'use client';

import React from 'react';
import { OrderItem, PrintingOption, printingOptionMap, getPrintingUnitPrice, getQuantityTier } from '../../models/orderTypes';
import { calculateUnitPrice, calculateItemTotal } from '../../utils/order-calculations';
import {
    DndContext,
    closestCenter,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// SortableRow 컴포넌트 정의
interface SortableRowProps {
    item: OrderItem;
    index: number;
    isLegacy: boolean;
    handleItemChange: (index: number, field: keyof OrderItem, value: string | number) => void;
    handleSafeNumberChange: (index: number, field: keyof OrderItem, value: string, min?: number, max?: number, isInteger?: boolean) => void;
    handleRemoveItem: (index: number) => void;
    handleCopyItem: (index: number) => void;
    handleMoveItemUp: (index: number) => void;
    handleMoveItemDown: (index: number) => void;
    openProductSelection: (index: number) => void;
    totalQuantity: number;
    highlightedItems: Set<string>;
    orderItemsLength: number;
    productSizes: string[];
    productColors: string[];
}

function SortableRow({
    item,
    index,
    isLegacy,
    handleItemChange,
    handleSafeNumberChange,
    handleRemoveItem,
    handleCopyItem,
    handleMoveItemUp,
    handleMoveItemDown,
    openProductSelection,
    totalQuantity,
    highlightedItems,
    orderItemsLength,
    productSizes,
    productColors
}: SortableRowProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <tr
            ref={setNodeRef}
            style={style}
            className={`
                hover:bg-gray-50 dark:hover:bg-gray-700
                transition-all duration-300 ease-out
                ${highlightedItems.has(item.id || '') ?
                    'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-300 dark:ring-blue-700' :
                    ''
                }
                ${isDragging ? 'cursor-grabbing' : ''}
            `}
        >
            <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center font-medium">
                <div className="flex items-center justify-center">
                    <button
                        type="button"
                        className="drag-handle mr-2 cursor-grab text-gray-400 hover:text-gray-600 touch-none"
                        {...attributes}
                        {...listeners}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                        </svg>
                    </button>
                    {index + 1}
                </div>
            </td>
            <td className="border border-gray-300 dark:border-gray-600 px-2 py-2">
                <div className="w-full">
                    <input
                        type="text"
                        value={item.product || ''}
                        onChange={(e) => {
                            const value = e.target.value.slice(0, 100);
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
                <input
                    list={`size-list-${index}`}
                    value={item.size || ''}
                    onChange={(e) => handleItemChange(index, 'size', e.target.value)}
                    required
                    placeholder="사이즈 선택 또는 입력"
                    className="w-full px-2 py-1 border border-gray-200 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100 rounded text-sm focus:ring-1 focus:ring-blue-500"
                />
                <datalist id={`size-list-${index}`}>
                    {productSizes.map(size => (
                        <option key={size} value={size} />
                    ))}
                </datalist>
            </td>
            <td className="border border-gray-300 dark:border-gray-600 px-3 py-2">
                <input
                    list={`color-list-${index}`}
                    value={item.color || ''}
                    onChange={(e) => handleItemChange(index, 'color', e.target.value)}
                    required
                    placeholder="색상 선택 또는 입력"
                    className="w-full px-2 py-1 border border-gray-200 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100 rounded text-sm focus:ring-1 focus:ring-blue-500"
                />
                <datalist id={`color-list-${index}`}>
                    {productColors.map(color => (
                        <option key={color} value={color} />
                    ))}
                </datalist>
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
            {!isLegacy ? (
                <>
                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-2">
                        <select
                            value={item.printingOption || ''}
                            onChange={(e) => handleItemChange(index, 'printingOption', e.target.value || '')}
                            className="w-full px-1 py-1 border border-gray-200 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100 rounded text-xs focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">없음</option>
                            {(Object.entries(printingOptionMap) as [PrintingOption, string][]).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                        {item.printingOption && (
                            <div className="text-xs text-gray-500 mt-1">
                                {getQuantityTier(totalQuantity)}장 구간
                            </div>
                        )}
                    </td>
                    {(['smallPrintCount', 'mediumPrintCount', 'largePrintCount', 'extraLargePrintCount'] as const).map((field, i) => {
                        const sizeMap: Record<string, 'small' | 'medium' | 'large' | 'extraLarge'> = {
                            smallPrintCount: 'small',
                            mediumPrintCount: 'medium',
                            largePrintCount: 'large',
                            extraLargePrintCount: 'extraLarge',
                        };
                        const unitPrice = item.printingOption ? getPrintingUnitPrice(item.printingOption, sizeMap[field], totalQuantity) : 0;
                        return (
                            <td key={i} className="border border-gray-300 dark:border-gray-600 px-1 py-2">
                                <input
                                    type="number"
                                    value={item[field] || ''}
                                    onChange={(e) => handleSafeNumberChange(index, field, e.target.value, 0, 99, true)}
                                    min="0"
                                    max="99"
                                    placeholder="0"
                                    disabled={!item.printingOption}
                                    className="w-full px-1 py-1 border border-gray-200 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100 rounded text-xs focus:ring-1 focus:ring-blue-500 text-center disabled:opacity-40"
                                />
                                {item.printingOption && (item[field] ?? 0) > 0 && (
                                    <div className="text-xs text-gray-500 mt-1 text-center">
                                        {unitPrice.toLocaleString()}원
                                    </div>
                                )}
                            </td>
                        );
                    })}
                    <td className="border border-gray-300 dark:border-gray-600 px-3 py-2">
                        <div className="space-y-1">
                            <input
                                type="number"
                                value={item.extraLargePrintingQuantity || ''}
                                onChange={(e) => handleSafeNumberChange(index, 'extraLargePrintingQuantity', e.target.value, 0, 9999, true)}
                                min="0"
                                placeholder="개수"
                                className="w-full px-2 py-1 border border-gray-200 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100 rounded text-xs focus:ring-1 focus:ring-blue-500"
                            />
                            <input
                                type="number"
                                value={item.extraLargePrintingPrice || ''}
                                onChange={(e) => handleSafeNumberChange(index, 'extraLargePrintingPrice', e.target.value, 0, 10000000, false)}
                                min="0"
                                placeholder="단가"
                                className="w-full px-2 py-1 border border-gray-200 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100 rounded text-xs focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </td>
                </>
            ) : (
                <>
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
                </>
            )}
            <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right font-semibold text-green-600">
                {calculateUnitPrice(item, totalQuantity).toLocaleString()}원
            </td>
            <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right font-semibold text-blue-600">
                {calculateItemTotal(item, totalQuantity).toLocaleString()}원
            </td>
            <td className="border border-gray-300 dark:border-gray-600 px-3 py-2">
                <input
                    type="text"
                    value={item.remarks !== undefined ? item.remarks : '-'}
                    onChange={(e) => handleItemChange(index, 'remarks', e.target.value)}
                    placeholder="비고"
                    className="w-full px-2 py-1 border border-gray-200 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100 rounded text-sm focus:ring-1 focus:ring-blue-500"
                />
            </td>
            <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center">
                <div className="flex justify-center items-center space-x-1">
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
                    {index < orderItemsLength - 1 && (
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
                    {orderItemsLength > 1 && (
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
    );
}

// OrderFormLegacyTable Props
export interface OrderFormLegacyTableProps {
    items: OrderItem[];
    handleItemChange: (index: number, field: keyof OrderItem, value: string | number) => void;
    handleSafeNumberChange: (index: number, field: keyof OrderItem, value: string, min?: number, max?: number, isInteger?: boolean) => void;
    handleRemoveItem: (index: number) => void;
    handleCopyItem: (index: number) => void;
    handleMoveItemUp: (index: number) => void;
    handleMoveItemDown: (index: number) => void;
    handleAddItem: () => void;
    openProductSelection: (index: number) => void;
    handleDragEnd: (event: DragEndEvent) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sensors: any;
    productSizes: string[];
    productColors: string[];
    highlightedItems: Set<string>;
}

export default function OrderFormLegacyTable({
    items,
    handleItemChange,
    handleSafeNumberChange,
    handleRemoveItem,
    handleCopyItem,
    handleMoveItemUp,
    handleMoveItemDown,
    openProductSelection,
    handleDragEnd,
    sensors,
    productSizes,
    productColors,
    highlightedItems,
}: OrderFormLegacyTableProps) {
    const totalQuantity = items.reduce((sum, i) => sum + Math.max(0, Number(i.quantity) || 0), 0);

    const isLegacy = items.some(item => !item.printingOption && (
        (item.smallPrintingQuantity ?? 0) > 0 ||
        (item.largePrintingQuantity ?? 0) > 0 ||
        (item.extraLargePrintingQuantity ?? 0) > 0
    ));

    const thClass = "border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm font-semibold text-gray-900 dark:text-gray-100";

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <div className="overflow-x-auto max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg min-h-96">
                <table className="w-full border-collapse border border-gray-300 dark:border-gray-600" style={{tableLayout: 'fixed', minWidth: isLegacy ? '1560px' : '1800px'}}>
                    <colgroup>
                        {isLegacy ? (
                            <>
                                <col style={{ width: '50px' }} /><col style={{ width: '200px' }} /><col style={{ width: '80px' }} /><col style={{ width: '100px' }} /><col style={{ width: '100px' }} /><col style={{ width: '120px' }} /><col style={{ width: '120px' }} /><col style={{ width: '120px' }} /><col style={{ width: '120px' }} /><col style={{ width: '140px' }} /><col style={{ width: '120px' }} /><col style={{ width: '150px' }} /><col style={{ width: '140px' }} />
                            </>
                        ) : (
                            <>
                                <col style={{ width: '50px' }} /><col style={{ width: '200px' }} /><col style={{ width: '80px' }} /><col style={{ width: '100px' }} /><col style={{ width: '100px' }} /><col style={{ width: '120px' }} /><col style={{ width: '120px' }} /><col style={{ width: '70px' }} /><col style={{ width: '70px' }} /><col style={{ width: '70px' }} /><col style={{ width: '70px' }} /><col style={{ width: '120px' }} /><col style={{ width: '120px' }} /><col style={{ width: '120px' }} /><col style={{ width: '150px' }} /><col style={{ width: '140px' }} />
                            </>
                        )}
                    </colgroup>
                    <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700 z-10">
                        <tr className="bg-gray-100 dark:bg-gray-700">
                            <th className={thClass}>No.</th>
                            <th className={thClass}>상품명</th>
                            <th className={thClass}>수량</th>
                            <th className={thClass}>사이즈</th>
                            <th className={thClass}>색상</th>
                            <th className={thClass}>의류 단가</th>
                            {isLegacy ? (
                                <>
                                    <th className={thClass}>커스텀인쇄</th>
                                    <th className={thClass}>대형인쇄</th>
                                    <th className={thClass}>개별단가</th>
                                </>
                            ) : (
                                <>
                                    <th className={thClass}>프린팅</th>
                                    <th className={thClass}>소형</th>
                                    <th className={thClass}>중형</th>
                                    <th className={thClass}>대형</th>
                                    <th className={thClass}>특대형</th>
                                    <th className={thClass}>개별단가</th>
                                </>
                            )}
                            <th className={thClass}>단가</th>
                            <th className={thClass}>총 금액</th>
                            <th className={thClass}>비고</th>
                            <th className={thClass}>관리</th>
                        </tr>
                    </thead>
                    <SortableContext
                        items={items.map(item => item.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <tbody>
                            {items.map((item, index) => (
                                <SortableRow
                                    key={item.id || index}
                                    item={item}
                                    index={index}
                                    isLegacy={isLegacy}
                                    handleItemChange={handleItemChange}
                                    handleSafeNumberChange={handleSafeNumberChange}
                                    handleRemoveItem={handleRemoveItem}
                                    handleCopyItem={handleCopyItem}
                                    handleMoveItemUp={handleMoveItemUp}
                                    handleMoveItemDown={handleMoveItemDown}
                                    openProductSelection={openProductSelection}
                                    totalQuantity={totalQuantity}
                                    highlightedItems={highlightedItems}
                                    orderItemsLength={items.length}
                                    productSizes={productSizes}
                                    productColors={productColors}
                                />
                            ))}
                        </tbody>
                    </SortableContext>
                </table>
            </div>
        </DndContext>
    );
}
