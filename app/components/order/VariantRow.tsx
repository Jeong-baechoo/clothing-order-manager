'use client';

import React from 'react';
import { ProductVariant } from '../../models/orderTypes';

interface VariantRowProps {
    variant: ProductVariant;
    index: number;
    onChange: (index: number, field: keyof ProductVariant, value: string | number) => void;
    onCopy: (index: number) => void;
    onRemove: (index: number) => void;
    canRemove: boolean;
    productSizes: string[];
    productColors: string[];
}

export default function VariantRow({
    variant,
    index,
    onChange,
    onCopy,
    onRemove,
    canRemove,
    productSizes,
    productColors,
}: VariantRowProps) {
    return (
        <div className="flex items-center gap-2 py-1">
            {/* 수량 */}
            <div className="w-20">
                <input
                    type="number"
                    value={variant.quantity || ''}
                    onChange={(e) => {
                        const val = parseInt(e.target.value);
                        onChange(index, 'quantity', isNaN(val) ? 0 : Math.max(0, Math.min(9999, val)));
                    }}
                    min="1"
                    max="9999"
                    placeholder="수량"
                    className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100 rounded text-sm focus:ring-1 focus:ring-blue-500 text-center"
                />
            </div>

            {/* 사이즈 */}
            <div className="w-28">
                <input
                    list={`variant-size-list-${index}`}
                    value={variant.size || ''}
                    onChange={(e) => onChange(index, 'size', e.target.value)}
                    placeholder="사이즈"
                    className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100 rounded text-sm focus:ring-1 focus:ring-blue-500"
                />
                <datalist id={`variant-size-list-${index}`}>
                    {productSizes.map(size => (
                        <option key={size} value={size} />
                    ))}
                </datalist>
            </div>

            {/* 색상 */}
            <div className="w-28">
                <input
                    list={`variant-color-list-${index}`}
                    value={variant.color || ''}
                    onChange={(e) => onChange(index, 'color', e.target.value)}
                    placeholder="색상"
                    className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100 rounded text-sm focus:ring-1 focus:ring-blue-500"
                />
                <datalist id={`variant-color-list-${index}`}>
                    {productColors.map(color => (
                        <option key={color} value={color} />
                    ))}
                </datalist>
            </div>

            {/* 비고 */}
            <div className="flex-1 min-w-0">
                <input
                    type="text"
                    value={variant.remarks || ''}
                    onChange={(e) => onChange(index, 'remarks', e.target.value)}
                    placeholder="비고"
                    className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100 rounded text-sm focus:ring-1 focus:ring-blue-500"
                />
            </div>

            {/* 복사 버튼 */}
            <button
                type="button"
                onClick={() => onCopy(index)}
                className="flex-shrink-0 p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                title="변형 복사"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                </svg>
            </button>
            {/* 삭제 버튼 */}
            <button
                type="button"
                onClick={() => onRemove(index)}
                disabled={!canRemove}
                className="flex-shrink-0 p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="변형 삭제"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        </div>
    );
}
