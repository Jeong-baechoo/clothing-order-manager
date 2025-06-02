'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Company, Product, initialCompanies } from '../models/orderTypes';

export default function CompaniesPage() {
    const [companies, setCompanies] = useState<Company[]>(initialCompanies);
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
    const [isAddingCompany, setIsAddingCompany] = useState(false);
    const [isAddingProduct, setIsAddingProduct] = useState(false);
    const [newCompany, setNewCompany] = useState<{ name: string }>({ name: '' });
    const [newProduct, setNewProduct] = useState<{ name: string, defaultPrice: number }>({
        name: '',
        defaultPrice: 0
    });

    // 로컬 스토리지에서 회사 데이터 불러오기
    useEffect(() => {
        const savedCompanies = localStorage.getItem('companies');
        if (savedCompanies) {
            try {
                setCompanies(JSON.parse(savedCompanies));
            } catch (e) {
                console.error('회사 데이터 불러오기 실패:', e);
            }
        }
    }, []);

    // 회사 데이터 저장
    const saveCompanies = (updatedCompanies: Company[]) => {
        try {
            localStorage.setItem('companies', JSON.stringify(updatedCompanies));
            setCompanies(updatedCompanies);
        } catch (e) {
            console.error('회사 데이터 저장 실패:', e);
        }
    };

    // 회사 추가 처리
    const handleAddCompany = () => {
        if (!newCompany.name.trim()) {
            alert('회사 이름을 입력해주세요.');
            return;
        }

        const companyExists = companies.some(
            company => company.name.toLowerCase() === newCompany.name.toLowerCase()
        );

        if (companyExists) {
            alert('이미 존재하는 회사 이름입니다.');
            return;
        }

        const newCompanyData: Company = {
            id: `comp-${Date.now()}`,
            name: newCompany.name.trim(),
            products: []
        };

        const updatedCompanies = [...companies, newCompanyData];
        saveCompanies(updatedCompanies);
        setNewCompany({ name: '' });
        setIsAddingCompany(false);
    };

    // 제품 추가 처리
    const handleAddProduct = () => {
        if (!selectedCompany) {
            alert('회사를 먼저 선택해주세요.');
            return;
        }

        if (!newProduct.name.trim()) {
            alert('제품 이름을 입력해주세요.');
            return;
        }

        const productExists = selectedCompany.products.some(
            product => product.name.toLowerCase() === newProduct.name.toLowerCase()
        );

        if (productExists) {
            alert('이미 존재하는 제품 이름입니다.');
            return;
        }

        const newProductData: Product = {
            id: `prod-${Date.now()}`,
            name: newProduct.name.trim(),
            defaultPrice: newProduct.defaultPrice
        };

        const updatedCompanies = companies.map(company =>
            company.id === selectedCompany.id
                ? { ...company, products: [...company.products, newProductData] }
                : company
        );

        saveCompanies(updatedCompanies);
        setNewProduct({ name: '', defaultPrice: 0 });
        setIsAddingProduct(false);

        // 선택된 회사 업데이트
        const updatedCompany = updatedCompanies.find(c => c.id === selectedCompany.id);
        if (updatedCompany) {
            setSelectedCompany(updatedCompany);
        }
    };

    // 회사 삭제 처리
    const handleDeleteCompany = (companyId: string) => {
        if (!confirm('정말 이 회사를 삭제하시겠습니까? 관련된 모든 제품 정보도 함께 삭제됩니다.')) {
            return;
        }

        const updatedCompanies = companies.filter(company => company.id !== companyId);
        saveCompanies(updatedCompanies);

        if (selectedCompany && selectedCompany.id === companyId) {
            setSelectedCompany(null);
        }
    };

    // 제품 삭제 처리
    const handleDeleteProduct = (productId: string) => {
        if (!selectedCompany) return;

        if (!confirm('정말 이 제품을 삭제하시겠습니까?')) {
            return;
        }

        const updatedCompanies = companies.map(company =>
            company.id === selectedCompany.id
                ? {
                    ...company,
                    products: company.products.filter(product => product.id !== productId)
                }
                : company
        );

        saveCompanies(updatedCompanies);

        // 선택된 회사 업데이트
        const updatedCompany = updatedCompanies.find(c => c.id === selectedCompany.id);
        if (updatedCompany) {
            setSelectedCompany(updatedCompany);
        }
    };

    // 초기 데이터로 리셋
    const handleResetToDefault = () => {
        if (!confirm('모든 회사 및 제품 데이터를 초기 상태로 되돌리시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            return;
        }

        saveCompanies(initialCompanies);
        setSelectedCompany(null);
    };

    return (
        <div className="max-w-6xl mx-auto py-8">
            <div className="mb-8 flex justify-between items-center">
                <h1 className="text-2xl font-bold">회사 및 제품 관리</h1>
                <div className="space-x-2">
                    <button
                        onClick={handleResetToDefault}
                        className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                    >
                        초기 데이터로 리셋
                    </button>
                    <Link
                        href="/orders"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                    >
                        주문 관리로 돌아가기
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 회사 목록 */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                        <h2 className="text-lg font-semibold">회사 목록</h2>
                        <button
                            onClick={() => setIsAddingCompany(true)}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                            + 새 회사
                        </button>
                    </div>

                    {isAddingCompany && (
                        <div className="p-4 border-b border-gray-200 bg-gray-50">
                            <h3 className="text-md font-medium mb-2">새 회사 추가</h3>
                            <div className="mb-3">
                                <input
                                    type="text"
                                    value={newCompany.name}
                                    onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                                    placeholder="회사명"
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                />
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button
                                    onClick={() => setIsAddingCompany(false)}
                                    className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleAddCompany}
                                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                    추가
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="overflow-y-auto max-h-96">
                        {companies.length > 0 ? (
                            <ul className="divide-y divide-gray-200">
                                {companies.map((company) => (
                                    <li key={company.id} className="hover:bg-gray-50">
                                        <div
                                            className={`p-4 flex justify-between items-center cursor-pointer ${selectedCompany?.id === company.id ? 'bg-indigo-50' : ''
                                                }`}
                                            onClick={() => setSelectedCompany(company)}
                                        >
                                            <div>
                                                <h3 className="font-medium">{company.name}</h3>
                                                <p className="text-sm text-gray-500">{company.products.length}개 제품</p>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteCompany(company.id);
                                                }}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                삭제
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="p-4 text-center text-gray-500">
                                등록된 회사가 없습니다.
                            </div>
                        )}
                    </div>
                </div>

                {/* 제품 목록 */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden md:col-span-2">
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                        <h2 className="text-lg font-semibold">
                            {selectedCompany ? `${selectedCompany.name} 제품` : '제품 목록'}
                        </h2>
                        {selectedCompany && (
                            <button
                                onClick={() => setIsAddingProduct(true)}
                                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                            >
                                + 새 제품
                            </button>
                        )}
                    </div>

                    {selectedCompany && isAddingProduct && (
                        <div className="p-4 border-b border-gray-200 bg-gray-50">
                            <h3 className="text-md font-medium mb-2">새 제품 추가</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                <input
                                    type="text"
                                    value={newProduct.name}
                                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                                    placeholder="제품명"
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                />
                                <input
                                    type="number"
                                    value={newProduct.defaultPrice === 0 ? '' : newProduct.defaultPrice}
                                    onChange={(e) => {
                                        const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                                        setNewProduct({ ...newProduct, defaultPrice: value });
                                    }}
                                    placeholder="기본 가격 (원)"
                                    min="0"
                                    step="1000"
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                />
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button
                                    onClick={() => setIsAddingProduct(false)}
                                    className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleAddProduct}
                                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                    추가
                                </button>
                            </div>
                        </div>
                    )}

                    {selectedCompany ? (
                        selectedCompany.products.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                제품명
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                기본 가격
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                관리
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {selectedCompany.products.map((product) => (
                                            <tr key={product.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {product.name}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    {product.defaultPrice.toLocaleString()}원
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button
                                                        onClick={() => handleDeleteProduct(product.id)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        삭제
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-6 text-center text-gray-500">
                                등록된 제품이 없습니다. 새 제품을 추가해주세요.
                            </div>
                        )
                    ) : (
                        <div className="p-6 text-center text-gray-500">
                            왼쪽에서 회사를 선택하면 해당 회사의 제품이 여기에 표시됩니다.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
