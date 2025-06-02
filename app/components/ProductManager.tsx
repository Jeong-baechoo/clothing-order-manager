'use client';

import React, { useState, useEffect } from 'react';
import { Company, Product, initialCompanies } from '../models/orderTypes';

interface ProductManagerProps {
    onSelectProduct: (companyName: string, productName: string, defaultPrice: number) => void;
}

export default function ProductManager({ onSelectProduct }: ProductManagerProps) {
    // 회사 및 제품 데이터 상태
    const [companies, setCompanies] = useState<Company[]>(initialCompanies);
    // 선택된 회사 ID
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
    // 새 회사 입력 모드
    const [isAddingCompany, setIsAddingCompany] = useState<boolean>(false);
    // 새 제품 입력 모드
    const [isAddingProduct, setIsAddingProduct] = useState<boolean>(false);

    // 새 회사 및 제품 입력 폼 상태
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
        setCompanies(updatedCompanies);
        saveCompanies(updatedCompanies);
        setNewCompany({ name: '' });
        setIsAddingCompany(false);
        setSelectedCompanyId(newCompanyData.id);
    };

    // 제품 추가 처리
    const handleAddProduct = () => {
        if (!selectedCompanyId) {
            alert('회사를 먼저 선택해주세요.');
            return;
        }

        if (!newProduct.name.trim()) {
            alert('제품 이름을 입력해주세요.');
            return;
        }

        const companyIndex = companies.findIndex(company => company.id === selectedCompanyId);
        if (companyIndex === -1) return;

        const productExists = companies[companyIndex].products.some(
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

        const updatedCompanies = [...companies];
        updatedCompanies[companyIndex].products.push(newProductData);

        setCompanies(updatedCompanies);
        saveCompanies(updatedCompanies);
        setNewProduct({ name: '', defaultPrice: 0 });
        setIsAddingProduct(false);
    };

    // 제품 선택 처리
    const handleSelectProduct = (companyId: string, productId: string) => {
        const company = companies.find(c => c.id === companyId);
        if (!company) return;

        const product = company.products.find(p => p.id === productId);
        if (!product) return;

        onSelectProduct(company.name, product.name, product.defaultPrice);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-md font-medium">회사 선택</h3>
                    {!isAddingCompany && (
                        <button
                            type="button"
                            onClick={() => setIsAddingCompany(true)}
                            className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            새 회사 추가
                        </button>
                    )}
                </div>

                {/* 회사 추가 폼 */}
                {isAddingCompany && (
                    <div className="mb-3 p-3 border border-gray-200 rounded-md">
                        <h4 className="text-sm font-medium mb-2">새 회사 정보</h4>
                        <div className="flex space-x-2 mb-2">
                            <input
                                type="text"
                                value={newCompany.name}
                                onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                                placeholder="회사명"
                                className="flex-1 p-2 border border-gray-300 rounded-md text-sm"
                            />
                        </div>
                        <div className="flex justify-end space-x-2">
                            <button
                                type="button"
                                onClick={() => setIsAddingCompany(false)}
                                className="text-xs px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={handleAddCompany}
                                className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                                추가
                            </button>
                        </div>
                    </div>
                )}

                {/* 회사 선택 드롭다운 */}
                <select
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                >
                    <option value="">회사 선택</option>
                    {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                            {company.name}
                        </option>
                    ))}
                </select>
            </div>

            {selectedCompanyId && (
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-md font-medium">제품 선택</h3>
                        {!isAddingProduct && (
                            <button
                                type="button"
                                onClick={() => setIsAddingProduct(true)}
                                className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                새 제품 추가
                            </button>
                        )}
                    </div>

                    {/* 제품 추가 폼 */}
                    {isAddingProduct && (
                        <div className="mb-3 p-3 border border-gray-200 rounded-md">
                            <h4 className="text-sm font-medium mb-2">새 제품 정보</h4>
                            <div className="grid grid-cols-1 gap-2 mb-2">
                                <input
                                    type="text"
                                    value={newProduct.name}
                                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                                    placeholder="제품명"
                                    className="p-2 border border-gray-300 rounded-md text-sm"
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
                                    className="p-2 border border-gray-300 rounded-md text-sm"
                                />
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAddingProduct(false)}
                                    className="text-xs px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                                >
                                    취소
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAddProduct}
                                    className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                    추가
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 제품 목록 */}
                    <div className="grid grid-cols-1 gap-2">
                        {companies.find(c => c.id === selectedCompanyId)?.products.map((product) => (
                            <button
                                key={product.id}
                                type="button"
                                onClick={() => handleSelectProduct(selectedCompanyId, product.id)}
                                className="text-left p-2 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex justify-between">
                                    <span className="font-medium">{product.name}</span>
                                    <span className="text-gray-600">{product.defaultPrice.toLocaleString()}원</span>
                                </div>
                            </button>
                        ))}
                        {companies.find(c => c.id === selectedCompanyId)?.products.length === 0 && (
                            <p className="text-center text-gray-500 text-sm py-4">
                                등록된 제품이 없습니다. 새 제품을 추가해주세요.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
