'use client';

import React, { useState, useEffect } from 'react';
import { getCompanies } from '../../lib/supabase';

interface Product {
    id: string;
    name: string;
    default_price: number;
    company_id: string;
    companies?: { name: string };
}

interface Company {
    id: string;
    name: string;
}

interface ProductSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (product: Product) => void;
}

export default function ProductSelectionModal({ isOpen, onClose, onSelect }: ProductSelectionModalProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompany, setSelectedCompany] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);    // 컴포넌트 마운트 시 데이터 로드
    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen]);

    const loadData = async () => {
        setLoading(true);
        try {
            // 회사 목록 로드
            const companiesResult = await getCompanies();
            if (Array.isArray(companiesResult)) {
                setCompanies(companiesResult);

                // 회사에서 제품 목록 추출하고 회사 정보 추가
                const allProducts: Product[] = [];
                companiesResult.forEach(company => {
                    if (company.products && Array.isArray(company.products)) {
                        company.products.forEach(product => {
                            allProducts.push({
                                ...product,
                                companies: { name: company.name }
                            });
                        });
                    }
                });
                setProducts(allProducts);
            }
        } catch (error) {
            console.error('데이터 로드 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    // 필터링된 상품 목록
    const filteredProducts = products.filter(product => {
        const matchesCompany = !selectedCompany || product.company_id === selectedCompany;
        const matchesSearch = !searchTerm || product.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCompany && matchesSearch;
    });

    const handleProductSelect = (product: Product) => {
        onSelect(product);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
                {/* 헤더 */}
                <div className="bg-green-600 text-white px-6 py-4 border-b">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold">상품 선택</h2>
                            <p className="text-green-100 text-sm mt-1">등록된 상품 중에서 선택하세요</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-green-100 hover:text-white p-2 rounded-md hover:bg-green-700 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* 필터 및 검색 */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                회사 필터
                            </label>
                            <select
                                value={selectedCompany}
                                onChange={(e) => setSelectedCompany(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            >
                                <option value="">전체 회사</option>
                                {companies.map(company => (
                                    <option key={company.id} value={company.id}>
                                        {company.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                상품명 검색
                            </label>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="상품명을 입력하세요"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* 상품 목록 */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                            <span className="ml-2 text-gray-600 dark:text-gray-400">로딩 중...</span>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="text-center py-12">
                            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">검색 결과가 없습니다</p>
                            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">다른 검색 조건을 사용해보세요</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredProducts.map(product => (
                                <div
                                    key={product.id}
                                    onClick={() => handleProductSelect(product)}
                                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                                            {product.name}
                                        </h3>
                                        <span className="text-blue-600 font-bold text-sm">
                                            {product.default_price?.toLocaleString()}원
                                        </span>
                                    </div>
                                    <p className="text-gray-500 dark:text-gray-400 text-xs">
                                        {product.companies?.name || '회사명 없음'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 하단 버튼 */}
                <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800">
                    <div className="flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                        >
                            취소
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}