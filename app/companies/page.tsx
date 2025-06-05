'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Company } from '../models/orderTypes';
import { getCompanies, addCompany, updateCompany, deleteCompany, addProduct, updateProduct, deleteProduct } from '../lib/supabase';

// Supabase에서 가져온 회사 및 제품 타입 정의
interface SupabaseProduct {
  id: string;
  name: string;
  default_price: number;
  wholesale_price?: number;
  company_id: string;
}

interface SupabaseCompany {
  id: string;
  name: string;
  products: SupabaseProduct[];
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newCompany, setNewCompany] = useState<{ name: string }>({ name: '' });
  const [newProduct, setNewProduct] = useState<{ name: string, defaultPrice: number, wholesalePrice: number }>({
    name: '',
    defaultPrice: 0,
    wholesalePrice: 0
  });
  const [loading, setLoading] = useState(true);

  // Supabase에서 회사 데이터 불러오기
  useEffect(() => {
    async function loadCompanies() {
      setLoading(true);
      try {
        const companiesData = await getCompanies();
        if (companiesData.length > 0) {
          // Supabase에서 받은 데이터를 애플리케이션 형식으로 변환
          const formattedCompanies = companiesData.map((company: SupabaseCompany) => ({
            id: company.id,
            name: company.name,
            products: company.products?.map((product: SupabaseProduct) => ({
              id: product.id,
              name: product.name,
              wholesalePrice: product.wholesale_price,
              defaultPrice: product.default_price
            })) || []
          }));
          setCompanies(formattedCompanies);
        } else {
          // 데이터가 없으면 초기 데이터로 설정

        }
      } catch (error) {
        console.error('회사 데이터 로드 중 오류 발생:', error);
      } finally {
        setLoading(false);
      }
    }

    loadCompanies();
  }, []);

  // 회사 추가
  const handleAddCompany = async () => {
    if (!newCompany.name.trim()) {
      alert('회사 이름을 입력해주세요.');
      return;
    }

    const companyId = `comp-${new Date().getTime().toString().slice(-6)}`;
    const company = {
      id: companyId,
      name: newCompany.name,
      products: []
    };

    try {
      const result = await addCompany(company);
      if (result) {
        setCompanies([...companies, company]);
        setNewCompany({ name: '' });
        setIsAddingCompany(false);
      }
    } catch (error) {
      console.error('회사 추가 중 오류 발생:', error);
      alert('회사 추가 중 오류가 발생했습니다.');
    }
  };

  // 회사 수정
  const handleUpdateCompany = async (id: string, newName: string) => {
    if (!newName.trim()) {
      alert('회사 이름을 입력해주세요.');
      return;
    }

    try {
      const result = await updateCompany(id, { name: newName });
      if (result) {
        const updatedCompanies = companies.map(company =>
          company.id === id ? { ...company, name: newName } : company
        );
        setCompanies(updatedCompanies);

        if (selectedCompany?.id === id) {
          setSelectedCompany({ ...selectedCompany, name: newName });
        }
      }
    } catch (error) {
      console.error('회사 수정 중 오류 발생:', error);
      alert('회사 수정 중 오류가 발생했습니다.');
    }
  };

  // 회사 삭제
  const handleDeleteCompany = async (id: string) => {
    if (!window.confirm('이 회사를 삭제하시겠습니까? 모든 제품 정보가 함께 삭제됩니다.')) {
      return;
    }

    try {
      const result = await deleteCompany(id);
      if (result) {
        const updatedCompanies = companies.filter(company => company.id !== id);
        setCompanies(updatedCompanies);
        if (selectedCompany?.id === id) {
          setSelectedCompany(null);
        }
      }
    } catch (error) {
      console.error('회사 삭제 중 오류 발생:', error);
      alert('회사 삭제 중 오류가 발생했습니다.');
    }
  };

  // 제품 추가
  const handleAddProduct = async () => {
    if (!selectedCompany) return;
    if (!newProduct.name.trim()) {
      alert('제품 이름을 입력해주세요.');
      return;
    }
    if (newProduct.defaultPrice <= 0) {
      alert('유효한 가격을 입력해주세요.');
      return;
    }

    const productId = `prod-${selectedCompany.id}-${new Date().getTime().toString().slice(-6)}`;
    const product = {
      id: productId,
      name: newProduct.name,
      defaultPrice: newProduct.defaultPrice,
      wholesalePrice: newProduct.wholesalePrice,
      companyId: selectedCompany.id
    };

    try {
      const result = await addProduct(product);
      if (result) {
        const formattedProduct = {
          id: product.id,
          name: product.name,
          defaultPrice: product.defaultPrice,
          wholesalePrice: product.wholesalePrice
        };

        const updatedCompanies = companies.map(company => {
          if (company.id === selectedCompany.id) {
            return {
              ...company,
              products: [...company.products, formattedProduct]
            };
          }
          return company;
        });

        setCompanies(updatedCompanies);
        setSelectedCompany({
          ...selectedCompany,
          products: [...selectedCompany.products, formattedProduct]
        });
        setNewProduct({ name: '', defaultPrice: 0, wholesalePrice: 0 });
        setIsAddingProduct(false);
      }
    } catch (error) {
      console.error('제품 추가 중 오류 발생:', error);
      alert('제품 추가 중 오류가 발생했습니다.');
    }
  };

  // 제품 수정
  const handleUpdateProduct = async (productId: string, updatedData: { name?: string, defaultPrice?: number, wholesalePrice?: number }) => {
    if (!selectedCompany) return;

    try {
      const result = await updateProduct(productId, updatedData);
      if (result) {
        const updatedCompanies = companies.map(company => {
          if (company.id === selectedCompany.id) {
            return {
              ...company,
              products: company.products.map(product =>
                product.id === productId
                  ? { ...product, ...updatedData }
                  : product
              )
            };
          }
          return company;
        });

        setCompanies(updatedCompanies);
        setSelectedCompany({
          ...selectedCompany,
          products: selectedCompany.products.map(product =>
            product.id === productId
              ? { ...product, ...updatedData }
              : product
          )
        });
      }
    } catch (error) {
      console.error('제품 수정 중 오류 발생:', error);
      alert('제품 수정 중 오류가 발생했습니다.');
    }
  };

  // 제품 삭제
  const handleDeleteProduct = async (productId: string) => {
    if (!selectedCompany) return;
    if (!window.confirm('이 제품을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const result = await deleteProduct(productId);
      if (result) {
        const updatedCompanies = companies.map(company => {
          if (company.id === selectedCompany.id) {
            return {
              ...company,
              products: company.products.filter(product => product.id !== productId)
            };
          }
          return company;
        });

        setCompanies(updatedCompanies);
        setSelectedCompany({
          ...selectedCompany,
          products: selectedCompany.products.filter(product => product.id !== productId)
        });
      }
    } catch (error) {
      console.error('제품 삭제 중 오류 발생:', error);
      alert('제품 삭제 중 오류가 발생했습니다.');
    }
  };

  // 회사 선택
  const handleSelectCompany = (company: Company) => {
    setSelectedCompany(company);
    setIsAddingProduct(false);
  };

  // 로딩 중 표시
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">회사 관리</h1>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <p className="text-center text-gray-500 dark:text-gray-300">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">회사 관리</h1>
        <Link href="/" className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">
          &larr; 메인 페이지로 돌아가기
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 회사 목록 */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">회사 목록</h2>
            <button
              onClick={() => setIsAddingCompany(true)}
              className="px-2 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              + 회사 추가
            </button>
          </div>

          {isAddingCompany && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <input
                type="text"
                value={newCompany.name}
                onChange={(e) => setNewCompany({ name: e.target.value })}
                placeholder="회사 이름"
                className="w-full p-2 mb-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-md"
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setIsAddingCompany(false)}
                  className="px-3 py-1 bg-gray-300 text-gray-800 dark:bg-gray-600 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  취소
                </button>
                <button
                  onClick={handleAddCompany}
                  className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  추가
                </button>
              </div>
            </div>
          )}

          {companies.length > 0 ? (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {companies.map((company) => (
                <li key={company.id} className="py-3">
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => handleSelectCompany(company)}
                      className={`text-left font-medium ${selectedCompany?.id === company.id
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-700 dark:text-gray-300'
                        }`}
                    >
                      {company.name}
                      <span className="ml-2 text-gray-500 dark:text-gray-400 text-sm">
                        ({company.products.length}개 제품)
                      </span>
                    </button>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => {
                          const newName = prompt('새 회사 이름을 입력하세요:', company.name);
                          if (newName !== null) {
                            handleUpdateCompany(company.id, newName);
                          }
                        }}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 px-2"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDeleteCompany(company.id)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 px-2"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">등록된 회사가 없습니다.</p>
          )}
        </div>

        {/* 제품 목록 */}
        <div className="md:col-span-2 bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          {selectedCompany ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {selectedCompany.name} 제품 목록
                </h2>
                <button
                  onClick={() => setIsAddingProduct(true)}
                  className="px-2 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  + 제품 추가
                </button>
              </div>

              {isAddingProduct && (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="grid grid-cols-3 gap-4 mb-2">
                    <input
                      type="text"
                      value={newProduct.name}
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, name: e.target.value })
                      }
                      placeholder="제품 이름"
                      className="p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-md"
                    />
                    <input
                      type="number"
                      value={newProduct.defaultPrice}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          defaultPrice: parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="소비자 가격"
                      className="p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-md"
                    />
                    <input
                      type="number"
                      value={newProduct.wholesalePrice}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          wholesalePrice: parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="도매가"
                      className="p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-md"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setIsAddingProduct(false)}
                      className="px-3 py-1 bg-gray-300 text-gray-800 dark:bg-gray-600 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleAddProduct}
                      className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    >
                      추가
                    </button>
                  </div>
                </div>
              )}

              {selectedCompany.products.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          제품 ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          이름
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          소비자 가격
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          도매가
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          관리
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {selectedCompany.products.map((product) => (
                        <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {product.id}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {product.name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-300">
                            {product.defaultPrice.toLocaleString()}원
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-300">
                            {product.wholesalePrice ? product.wholesalePrice.toLocaleString() + '원' : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => {
                                  const newName = prompt('새 제품 이름을 입력하세요:', product.name);
                                  if (newName !== null) {
                                    handleUpdateProduct(product.id, { name: newName });
                                  }
                                }}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 px-2"
                              >
                                이름
                              </button>
                              <button
                                onClick={() => {
                                  const newPrice = prompt('새 소비자 가격을 입력하세요:', product.defaultPrice.toString());
                                  if (newPrice !== null && !isNaN(parseInt(newPrice))) {
                                    handleUpdateProduct(product.id, { defaultPrice: parseInt(newPrice) });
                                  }
                                }}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 px-2"
                              >
                                가격
                              </button>
                              <button
                                onClick={() => {
                                  const newWholesalePrice = prompt('새 도매가를 입력하세요:',
                                    product.wholesalePrice ? product.wholesalePrice.toString() : '0');
                                  if (newWholesalePrice !== null && !isNaN(parseInt(newWholesalePrice))) {
                                    handleUpdateProduct(product.id, { wholesalePrice: parseInt(newWholesalePrice) });
                                  }
                                }}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 px-2"
                              >
                                도매가
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 px-2"
                              >
                                삭제
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4">등록된 제품이 없습니다.</p>
              )}
            </>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-center text-gray-500 dark:text-gray-400">
                왼쪽에서 회사를 선택하면 제품 목록이 표시됩니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
