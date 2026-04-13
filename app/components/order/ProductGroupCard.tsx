'use client';

import React from 'react';
import { ProductGroup, ProductVariant } from '../../models/orderTypes';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import VariantRow from './VariantRow';
import PrintingSection from './PrintingSection';

interface ProductGroupCardProps {
    group: ProductGroup;
    groupIndex: number;
    totalQuantity: number;
    isExpanded: boolean;
    onToggle: () => void;
    onGroupChange: (field: string, value: string | number) => void;
    onVariantChange: (variantIndex: number, field: keyof ProductVariant, value: string | number) => void;
    onAddVariant: () => void;
    onCopyVariant: (variantIndex: number) => void;
    onRemoveVariant: (variantIndex: number) => void;
    onPrintingConfigChange: (printingIndex: number, field: string, value: string | number) => void;
    onAddPrinting: () => void;
    onRemovePrinting: (printingIndex: number) => void;
    onCustomPricingChange: (field: string, value: number) => void;
    onCopyGroup: () => void;
    onRemoveGroup: () => void;
    openProductSelection: () => void;
    productSizes: string[];
    productColors: string[];
    groupSubtotal: number;
}

export default function ProductGroupCard({
    group,
    groupIndex,
    totalQuantity,
    isExpanded,
    onToggle,
    onGroupChange,
    onVariantChange,
    onAddVariant,
    onCopyVariant,
    onRemoveVariant,
    onPrintingConfigChange,
    onAddPrinting,
    onRemovePrinting,
    onCustomPricingChange,
    onCopyGroup,
    onRemoveGroup,
    openProductSelection,
    productSizes,
    productColors,
    groupSubtotal,
}: ProductGroupCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: group.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const groupQuantity = group.variants.reduce(
        (sum, v) => sum + Math.max(0, Number(v.quantity) || 0),
        0
    );

    const unitPricePerGarment = groupQuantity > 0 && groupSubtotal > 0
        ? Math.round(groupSubtotal / groupQuantity)
        : group.price;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="border border-gray-200 dark:border-gray-600 rounded-lg mb-4 bg-white dark:bg-gray-800"
        >
            {/* 헤더 (항상 표시) */}
            <div
                className="flex justify-between items-center px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-t-lg cursor-pointer select-none"
                onClick={onToggle}
            >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {/* 드래그 핸들 */}
                    <button
                        type="button"
                        className="drag-handle cursor-grab text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 touch-none flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                        {...attributes}
                        {...listeners}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                        </svg>
                    </button>

                    {/* 펼침/접힘 화살표 */}
                    <svg
                        className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>

                    {/* 그룹 번호 */}
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 flex-shrink-0">
                        #{groupIndex + 1}
                    </span>

                    {/* 상품명 */}
                    <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                        <input
                            type="text"
                            value={group.product || ''}
                            onChange={(e) => onGroupChange('product', e.target.value.slice(0, 100))}
                            placeholder="상품명"
                            className="flex-1 min-w-0 px-2 py-1 border border-gray-200 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100 rounded text-sm focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                            type="button"
                            onClick={openProductSelection}
                            className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors flex-shrink-0"
                            title="등록된 상품에서 선택"
                        >
                            선택
                        </button>
                    </div>

                    {/* 의류 단가 */}
                    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <input
                            type="number"
                            value={group.price || ''}
                            onChange={(e) => {
                                let val = parseFloat(e.target.value);
                                if (isNaN(val)) val = 0;
                                val = Math.max(0, Math.min(10000000, val));
                                onGroupChange('price', val);
                            }}
                            min="0"
                            max="10000000"
                            placeholder="단가"
                            className="w-28 px-2 py-1 border border-gray-200 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100 rounded text-sm focus:ring-1 focus:ring-blue-500 text-right"
                        />
                        <span className="text-xs text-gray-500 dark:text-gray-400">원</span>
                    </div>
                </div>

                <div className="flex items-center gap-4 ml-4 flex-shrink-0">
                    {/* 수량 표시 */}
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                        {groupQuantity}장
                    </span>
                    {/* 1장당 단가 */}
                    <span className="text-sm text-green-600 dark:text-green-400 whitespace-nowrap">
                        단가 {unitPricePerGarment.toLocaleString()}원
                    </span>
                    {/* 소계 */}
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        소계: {groupSubtotal.toLocaleString()}원
                    </span>
                    {/* 복사 */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onCopyGroup();
                        }}
                        className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                        title="그룹 복사"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                        </svg>
                    </button>
                    {/* 삭제 */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemoveGroup();
                        }}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                        title="그룹 삭제"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* 펼침 내용 */}
            {isExpanded && (
                <div className="p-4 space-y-4">
                    {/* 사이즈 / 색상 */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">사이즈 / 색상</h4>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {group.variants.length}개 변형
                            </span>
                        </div>
                        <div className="space-y-1">
                            {/* 열 헤더 */}
                            <div className="flex items-center gap-2 py-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                                <div className="w-20 text-center">수량</div>
                                <div className="w-28">사이즈</div>
                                <div className="w-28">색상</div>
                                <div className="flex-1 min-w-0">비고</div>
                                <div className="w-16"></div>
                            </div>
                            {group.variants.map((variant, variantIndex) => (
                                <VariantRow
                                    key={variant.id}
                                    variant={variant}
                                    index={variantIndex}
                                    onChange={onVariantChange}
                                    onCopy={onCopyVariant}
                                    onRemove={onRemoveVariant}
                                    canRemove={group.variants.length > 1}
                                    productSizes={productSizes}
                                    productColors={productColors}
                                />
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={onAddVariant}
                            className="mt-2 flex items-center px-3 py-1.5 text-sm text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                        >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            변형 추가
                        </button>
                    </div>

                    {/* 프린팅 */}
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                        <PrintingSection
                            printings={group.printings}
                            extraLargePrintingQuantity={group.extraLargePrintingQuantity}
                            extraLargePrintingPrice={group.extraLargePrintingPrice}
                            totalQuantity={totalQuantity}
                            onPrintingConfigChange={onPrintingConfigChange}
                            onAddPrinting={onAddPrinting}
                            onRemovePrinting={onRemovePrinting}
                            onCustomPricingChange={onCustomPricingChange}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
