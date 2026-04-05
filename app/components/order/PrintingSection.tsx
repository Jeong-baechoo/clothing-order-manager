'use client';

import React from 'react';
import { PrintingOption, PrintingConfig, printingOptionMap, getPrintingUnitPrice, getQuantityTier } from '../../models/orderTypes';

interface PrintingSectionProps {
    printings: PrintingConfig[];
    extraLargePrintingQuantity: number;
    extraLargePrintingPrice: number;
    totalQuantity: number;
    onPrintingConfigChange: (printingIndex: number, field: string, value: string | number) => void;
    onAddPrinting: () => void;
    onRemovePrinting: (printingIndex: number) => void;
    onCustomPricingChange: (field: string, value: number) => void;
}

export default function PrintingSection({
    printings,
    extraLargePrintingQuantity,
    extraLargePrintingPrice,
    totalQuantity,
    onPrintingConfigChange,
    onAddPrinting,
    onRemovePrinting,
    onCustomPricingChange,
}: PrintingSectionProps) {
    const sizeFields = [
        { field: 'smallPrintCount', label: '소형', size: 'small' as const },
        { field: 'mediumPrintCount', label: '중형', size: 'medium' as const },
        { field: 'largePrintCount', label: '대형', size: 'large' as const },
        { field: 'extraLargePrintCount', label: '특대형', size: 'extraLarge' as const },
    ];

    const handleNumberChange = (callback: (field: string, value: number) => void, field: string, rawValue: string, min: number = 0, max: number = 99) => {
        if (rawValue === '' || rawValue === '-') {
            callback(field, 0);
            return;
        }
        let num = parseInt(rawValue);
        if (isNaN(num)) num = 0;
        num = Math.max(min, Math.min(max, num));
        callback(field, num);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">프린팅</h4>
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                    총 {totalQuantity}장 → {getQuantityTier(totalQuantity)} 구간
                </span>
            </div>

            {/* 프린팅 목록 */}
            {printings.map((printing, pIndex) => (
                <div key={printing.id} className="mb-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                        <select
                            value={printing.printingOption || ''}
                            onChange={(e) => onPrintingConfigChange(pIndex, 'printingOption', e.target.value)}
                            className="px-3 py-1.5 border border-gray-200 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100 rounded text-sm focus:ring-1 focus:ring-blue-500"
                        >
                            {(Object.entries(printingOptionMap) as [PrintingOption, string][]).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                        {printings.length > 1 && (
                            <button
                                type="button"
                                onClick={() => onRemovePrinting(pIndex)}
                                className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                title="프린팅 삭제"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {sizeFields.map(({ field, label, size }) => {
                            const value = printing[field as keyof PrintingConfig] as number;
                            const unitPrice = getPrintingUnitPrice(printing.printingOption, size, totalQuantity);
                            return (
                                <div key={field}>
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</label>
                                    <input
                                        type="number"
                                        value={value || ''}
                                        onChange={(e) => handleNumberChange(
                                            (f, v) => onPrintingConfigChange(pIndex, f, v),
                                            field, e.target.value, 0, 99
                                        )}
                                        min="0"
                                        max="99"
                                        placeholder="0"
                                        className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100 rounded text-sm focus:ring-1 focus:ring-blue-500 text-center"
                                    />
                                    {value > 0 && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 text-center">
                                            {unitPrice.toLocaleString()}원
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {/* 프린팅 추가 버튼 */}
            <button
                type="button"
                onClick={onAddPrinting}
                className="w-full py-1.5 border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 rounded-lg hover:border-blue-400 hover:text-blue-500 transition-colors text-sm"
            >
                + 프린팅 추가
            </button>

            {/* 개별단가 */}
            <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">개별단가</label>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        value={extraLargePrintingQuantity || ''}
                        onChange={(e) => handleNumberChange(
                            (f, v) => onCustomPricingChange(f, v),
                            'extraLargePrintingQuantity', e.target.value, 0, 9999
                        )}
                        min="0"
                        placeholder="개수"
                        className="w-24 px-2 py-1.5 border border-gray-200 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100 rounded text-sm focus:ring-1 focus:ring-blue-500 text-center"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400">x</span>
                    <input
                        type="number"
                        value={extraLargePrintingPrice || ''}
                        onChange={(e) => handleNumberChange(
                            (f, v) => onCustomPricingChange(f, v),
                            'extraLargePrintingPrice', e.target.value, 0, 10000000
                        )}
                        min="0"
                        placeholder="단가"
                        className="w-28 px-2 py-1.5 border border-gray-200 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100 rounded text-sm focus:ring-1 focus:ring-blue-500 text-right"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400">원</span>
                </div>
            </div>
        </div>
    );
}
