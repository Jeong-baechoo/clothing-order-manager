'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Company, Category } from '../models/orderTypes';
import {
  getCompanies, addCompany, updateCompany, deleteCompany,
  addProduct, updateProduct, deleteProduct,
  getCategories, addCategory, updateCategory, deleteCategory,
  getProducts
} from '../lib/supabase';

// Supabase에서 가져온 회사 및 제품 타입 정의
interface SupabaseProduct {
  id: string;
  name: string;
  default_price: number;
  wholesale_price?: number;
  company_id: string;
  category_id?: number;
  categories?: { id: number; name: string; sort_order: number } | { id: number; name: string; sort_order: number }[];
}

interface SupabaseCompany {
  id: string;
  name: string;
  products: SupabaseProduct[];
}

// 전체 제품 탭용 타입
interface AllProduct {
  id: string;
  name: string;
  defaultPrice: number;
  wholesalePrice?: number;
  companyId: string;
  companyName: string;
  categoryId?: number;
  categoryName?: string;
}

type TabType = 'companies' | 'allProducts' | 'categories';

export default function CompaniesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('companies');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newCompany, setNewCompany] = useState<{ name: string }>({ name: '' });
  const [newProduct, setNewProduct] = useState<{ name: string; defaultPrice: number; wholesalePrice: number; categoryId: number | null }>({
    name: '',
    defaultPrice: 0,
    wholesalePrice: 0,
    categoryId: null
  });
  const [loading, setLoading] = useState(true);

  // 카테고리 관리 상태
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState<{ name: string; sortOrder: number }>({ name: '', sortOrder: 0 });
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingCategoryData, setEditingCategoryData] = useState<{ name: string; sortOrder: number }>({ name: '', sortOrder: 0 });

  // 전체 제품 탭 상태
  const [allProducts, setAllProducts] = useState<AllProduct[]>([]);
  const [allProductsLoading, setAllProductsLoading] = useState(false);
  const [productFilterCompany, setProductFilterCompany] = useState<string>('');
  const [productFilterCategory, setProductFilterCategory] = useState<string>('');
  const [productSearchTerm, setProductSearchTerm] = useState('');

  // Supabase에서 회사 및 카테고리 데이터 불러오기
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [companiesData, categoriesData] = await Promise.all([getCompanies(), getCategories()]);

      if (companiesData.length > 0) {
        const formattedCompanies = companiesData.map((company: SupabaseCompany) => ({
          id: company.id,
          name: company.name,
          products: company.products?.map((product: SupabaseProduct) => {
            const cat = product.categories;
            const categoryObj = Array.isArray(cat) ? cat[0] : cat;
            return {
              id: product.id,
              name: product.name,
              wholesalePrice: product.wholesale_price,
              defaultPrice: product.default_price,
              categoryId: product.category_id,
              category: categoryObj || undefined
            };
          }) || []
        }));
        setCompanies(formattedCompanies);
      }

      setCategories(categoriesData);
    } catch (error) {
      console.error('데이터 로드 중 오류 발생:', error);
    } finally {
      setLoading(false);
    }
  };

  // 전체 제품 로드
  const loadAllProducts = async () => {
    setAllProductsLoading(true);
    try {
      const result = await getProducts();
      if (result.success && result.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formatted: AllProduct[] = result.data.map((p: any) => {
          const cat = p.categories;
          const categoryObj = Array.isArray(cat) ? cat[0] : cat;
          const comp = p.companies;
          const compObj = Array.isArray(comp) ? comp[0] : comp;
          return {
            id: p.id,
            name: p.name,
            defaultPrice: p.default_price,
            wholesalePrice: p.wholesale_price,
            companyId: p.company_id,
            companyName: compObj?.name || '회사명 없음',
            categoryId: p.category_id,
            categoryName: categoryObj?.name || undefined
          };
        });
        setAllProducts(formatted);
      }
    } catch (error) {
      console.error('전체 제품 로드 중 오류 발생:', error);
    } finally {
      setAllProductsLoading(false);
    }
  };

  // 탭 변경 시 전체 제품 로드
  useEffect(() => {
    if (activeTab === 'allProducts') {
      loadAllProducts();
    }
  }, [activeTab]);

  // ===== 회사 관련 핸들러 =====
  const handleAddCompany = async () => {
    if (!newCompany.name.trim()) {
      alert('회사 이름을 입력해주세요.');
      return;
    }

    const maxCompanyNumber = companies.reduce((max, company) => {
      const match = company.id.match(/^COMP-(\d+)$/);
      if (match) return Math.max(max, parseInt(match[1]));
      return max;
    }, 0);

    const companyId = `COMP-${String(maxCompanyNumber + 1).padStart(3, '0')}`;
    const company = { id: companyId, name: newCompany.name, products: [] };

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

  const handleDeleteCompany = async (id: string) => {
    if (!window.confirm('이 회사를 삭제하시겠습니까? 모든 제품 정보가 함께 삭제됩니다.')) return;

    try {
      const result = await deleteCompany(id);
      if (result) {
        setCompanies(companies.filter(company => company.id !== id));
        if (selectedCompany?.id === id) setSelectedCompany(null);
      }
    } catch (error) {
      console.error('회사 삭제 중 오류 발생:', error);
      alert('회사 삭제 중 오류가 발생했습니다.');
    }
  };

  // ===== 제품 관련 핸들러 =====
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

    const maxProductNumber = selectedCompany.products.reduce((max, product) => {
      const companyPrefix = selectedCompany.id.replace('COMP-', 'COMP');
      const match = product.id.match(new RegExp(`^${companyPrefix}-(\\d+)$`));
      if (match) return Math.max(max, parseInt(match[1]));
      return max;
    }, 0);

    const companyPrefix = selectedCompany.id.replace('COMP-', 'COMP');
    const productId = `${companyPrefix}-${String(maxProductNumber + 1).padStart(3, '0')}`;
    const product = {
      id: productId,
      name: newProduct.name,
      defaultPrice: newProduct.defaultPrice,
      wholesalePrice: newProduct.wholesalePrice,
      companyId: selectedCompany.id,
      categoryId: newProduct.categoryId
    };

    try {
      const result = await addProduct(product);
      if (result) {
        const categoryInfo = newProduct.categoryId
          ? categories.find(c => c.id === newProduct.categoryId)
          : undefined;

        const formattedProduct = {
          id: product.id,
          name: product.name,
          defaultPrice: product.defaultPrice,
          wholesalePrice: product.wholesalePrice,
          categoryId: product.categoryId ?? undefined,
          category: categoryInfo
        };

        const updatedCompanies = companies.map(company => {
          if (company.id === selectedCompany.id) {
            return { ...company, products: [...company.products, formattedProduct] };
          }
          return company;
        });

        setCompanies(updatedCompanies);
        setSelectedCompany({
          ...selectedCompany,
          products: [...selectedCompany.products, formattedProduct]
        });
        setNewProduct({ name: '', defaultPrice: 0, wholesalePrice: 0, categoryId: null });
        setIsAddingProduct(false);
      }
    } catch (error) {
      console.error('제품 추가 중 오류 발생:', error);
      alert('제품 추가 중 오류가 발생했습니다.');
    }
  };

  const handleUpdateProduct = async (productId: string, updatedData: { name?: string; defaultPrice?: number; wholesalePrice?: number; categoryId?: number | null }) => {
    if (!selectedCompany) return;

    try {
      const result = await updateProduct(productId, updatedData);
      if (result) {
        const categoryInfo = updatedData.categoryId
          ? categories.find(c => c.id === updatedData.categoryId)
          : undefined;

        const updatePayload = { ...updatedData } as Record<string, unknown>;
        if (updatedData.categoryId !== undefined) {
          updatePayload.category = categoryInfo;
        }

        const updatedCompanies = companies.map(company => {
          if (company.id === selectedCompany.id) {
            return {
              ...company,
              products: company.products.map(product =>
                product.id === productId ? { ...product, ...updatePayload } : product
              )
            };
          }
          return company;
        });

        setCompanies(updatedCompanies);
        setSelectedCompany({
          ...selectedCompany,
          products: selectedCompany.products.map(product =>
            product.id === productId ? { ...product, ...updatePayload } : product
          )
        });
      }
    } catch (error) {
      console.error('제품 수정 중 오류 발생:', error);
      alert('제품 수정 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!selectedCompany) return;
    if (!window.confirm('이 제품을 삭제하시겠습니까?')) return;

    try {
      const result = await deleteProduct(productId);
      if (result) {
        const updatedCompanies = companies.map(company => {
          if (company.id === selectedCompany.id) {
            return { ...company, products: company.products.filter(product => product.id !== productId) };
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

  // 전체 제품 탭에서 제품 삭제
  const handleDeleteAllProduct = async (productId: string) => {
    if (!window.confirm('이 제품을 삭제하시겠습니까?')) return;

    try {
      const result = await deleteProduct(productId);
      if (result) {
        setAllProducts(allProducts.filter(p => p.id !== productId));
        // 회사 목록도 갱신
        setCompanies(companies.map(company => ({
          ...company,
          products: company.products.filter(p => p.id !== productId)
        })));
      }
    } catch (error) {
      console.error('제품 삭제 중 오류 발생:', error);
      alert('제품 삭제 중 오류가 발생했습니다.');
    }
  };

  // 전체 제품 탭에서 카테고리 변경
  const handleUpdateAllProductCategory = async (productId: string, categoryId: number | null) => {
    try {
      const result = await updateProduct(productId, { categoryId });
      if (result) {
        const categoryInfo = categoryId ? categories.find(c => c.id === categoryId) : undefined;
        setAllProducts(allProducts.map(p =>
          p.id === productId
            ? { ...p, categoryId: categoryId ?? undefined, categoryName: categoryInfo?.name }
            : p
        ));
      }
    } catch (error) {
      console.error('카테고리 변경 중 오류 발생:', error);
    }
  };

  const handleSelectCompany = (company: Company) => {
    setSelectedCompany(company);
    setIsAddingProduct(false);
  };

  // ===== 카테고리 관련 핸들러 =====
  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      alert('카테고리 이름을 입력해주세요.');
      return;
    }

    try {
      const result = await addCategory(newCategory);
      if (result) {
        setCategories([...categories, result]);
        setNewCategory({ name: '', sortOrder: 0 });
        setIsAddingCategory(false);
      }
    } catch (error) {
      console.error('카테고리 추가 중 오류 발생:', error);
      alert('카테고리 추가 중 오류가 발생했습니다.');
    }
  };

  const handleUpdateCategory = async (id: number) => {
    if (!editingCategoryData.name.trim()) {
      alert('카테고리 이름을 입력해주세요.');
      return;
    }

    try {
      const result = await updateCategory(id, editingCategoryData);
      if (result) {
        setCategories(categories.map(cat =>
          cat.id === id ? { ...cat, name: editingCategoryData.name, sort_order: editingCategoryData.sortOrder } : cat
        ));
        setEditingCategoryId(null);
      }
    } catch (error) {
      console.error('카테고리 수정 중 오류 발생:', error);
      alert('카테고리 수정 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm('이 카테고리를 삭제하시겠습니까? 해당 카테고리의 제품은 카테고리 미지정 상태가 됩니다.')) return;

    try {
      const result = await deleteCategory(id);
      if (result) {
        setCategories(categories.filter(cat => cat.id !== id));
      }
    } catch (error) {
      console.error('카테고리 삭제 중 오류 발생:', error);
      alert('카테고리 삭제 중 오류가 발생했습니다.');
    }
  };

  // 필터링된 전체 제품 목록
  const filteredAllProducts = allProducts.filter(product => {
    const matchesCompany = !productFilterCompany || product.companyId === productFilterCompany;
    const matchesCategory = !productFilterCategory ||
      (productFilterCategory === 'none' ? !product.categoryId : product.categoryId?.toString() === productFilterCategory);
    const matchesSearch = !productSearchTerm || product.name.toLowerCase().includes(productSearchTerm.toLowerCase());
    return matchesCompany && matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">회사/제품 관리</h1>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <p className="text-center text-gray-500 dark:text-gray-300">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">회사/제품 관리</h1>
        <Link href="/" className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">
          &larr; 메인 페이지로 돌아가기
        </Link>
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex space-x-8">
          {([
            { key: 'companies' as TabType, label: '회사 관리' },
            { key: 'allProducts' as TabType, label: '전체 제품' },
            { key: 'categories' as TabType, label: '카테고리 관리' },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 회사 관리 탭 */}
      {activeTab === 'companies' && (
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
                  <button onClick={() => setIsAddingCompany(false)} className="px-3 py-1 bg-gray-300 text-gray-800 dark:bg-gray-600 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500">취소</button>
                  <button onClick={handleAddCompany} className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700">추가</button>
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
                        className={`text-left font-medium ${selectedCompany?.id === company.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}`}
                      >
                        {company.name}
                        <span className="ml-2 text-gray-500 dark:text-gray-400 text-sm">({company.products.length}개 제품)</span>
                      </button>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => {
                            const newName = prompt('새 회사 이름을 입력하세요:', company.name);
                            if (newName !== null) handleUpdateCompany(company.id, newName);
                          }}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 px-2"
                        >수정</button>
                        <button onClick={() => handleDeleteCompany(company.id)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 px-2">삭제</button>
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
                  <button onClick={() => setIsAddingProduct(true)} className="px-2 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                    + 제품 추가
                  </button>
                </div>

                {isAddingProduct && (
                  <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
                      <input
                        type="text"
                        value={newProduct.name}
                        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                        placeholder="제품 이름"
                        className="p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-md"
                      />
                      <input
                        type="number"
                        value={newProduct.defaultPrice}
                        onChange={(e) => setNewProduct({ ...newProduct, defaultPrice: parseInt(e.target.value) || 0 })}
                        placeholder="소비자 가격"
                        className="p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-md"
                      />
                      <input
                        type="number"
                        value={newProduct.wholesalePrice}
                        onChange={(e) => setNewProduct({ ...newProduct, wholesalePrice: parseInt(e.target.value) || 0 })}
                        placeholder="도매가"
                        className="p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-md"
                      />
                      <select
                        value={newProduct.categoryId ?? ''}
                        onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value ? parseInt(e.target.value) : null })}
                        className="p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-md"
                      >
                        <option value="">카테고리 선택</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button onClick={() => setIsAddingProduct(false)} className="px-3 py-1 bg-gray-300 text-gray-800 dark:bg-gray-600 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500">취소</button>
                      <button onClick={handleAddProduct} className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700">추가</button>
                    </div>
                  </div>
                )}

                {selectedCompany.products.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">제품 ID</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">이름</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">카테고리</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">소비자 가격</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">도매가</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">관리</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {selectedCompany.products.map((product) => (
                          <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{product.id}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{product.name}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              <select
                                value={product.categoryId ?? ''}
                                onChange={(e) => {
                                  const catId = e.target.value ? parseInt(e.target.value) : null;
                                  handleUpdateProduct(product.id, { categoryId: catId });
                                }}
                                className="px-2 py-1 border border-gray-200 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-100 rounded text-sm"
                              >
                                <option value="">미지정</option>
                                {categories.map(cat => (
                                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-300">
                              {product.defaultPrice.toLocaleString()}원
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-300">
                              {product.wholesalePrice ? product.wholesalePrice.toLocaleString() + '원' : '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => {
                                    const newName = prompt('새 제품 이름을 입력하세요:', product.name);
                                    if (newName !== null) handleUpdateProduct(product.id, { name: newName });
                                  }}
                                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 px-2"
                                >이름</button>
                                <button
                                  onClick={() => {
                                    const newPrice = prompt('새 소비자 가격을 입력하세요:', product.defaultPrice.toString());
                                    if (newPrice !== null && !isNaN(parseInt(newPrice))) handleUpdateProduct(product.id, { defaultPrice: parseInt(newPrice) });
                                  }}
                                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 px-2"
                                >가격</button>
                                <button
                                  onClick={() => {
                                    const newWholesalePrice = prompt('새 도매가를 입력하세요:', product.wholesalePrice ? product.wholesalePrice.toString() : '0');
                                    if (newWholesalePrice !== null && !isNaN(parseInt(newWholesalePrice))) handleUpdateProduct(product.id, { wholesalePrice: parseInt(newWholesalePrice) });
                                  }}
                                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 px-2"
                                >도매가</button>
                                <button onClick={() => handleDeleteProduct(product.id)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 px-2">삭제</button>
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
                <p className="text-center text-gray-500 dark:text-gray-400">왼쪽에서 회사를 선택하면 제품 목록이 표시됩니다.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 전체 제품 탭 */}
      {activeTab === 'allProducts' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              전체 제품 목록
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">({filteredAllProducts.length}개)</span>
            </h2>
          </div>

          {/* 필터 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <select
              value={productFilterCompany}
              onChange={(e) => setProductFilterCompany(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md"
            >
              <option value="">전체 회사</option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
            <select
              value={productFilterCategory}
              onChange={(e) => setProductFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md"
            >
              <option value="">전체 카테고리</option>
              <option value="none">미지정</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <input
              type="text"
              value={productSearchTerm}
              onChange={(e) => setProductSearchTerm(e.target.value)}
              placeholder="제품명 검색"
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md"
            />
          </div>

          {allProductsLoading ? (
            <p className="text-center text-gray-500 dark:text-gray-300 py-4">데이터를 불러오는 중...</p>
          ) : filteredAllProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">제품명</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">회사</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">카테고리</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">소비자가</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">도매가</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">관리</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredAllProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{product.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{product.companyName}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <select
                          value={product.categoryId ?? ''}
                          onChange={(e) => {
                            const catId = e.target.value ? parseInt(e.target.value) : null;
                            handleUpdateAllProductCategory(product.id, catId);
                          }}
                          className="px-2 py-1 border border-gray-200 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-100 rounded text-sm"
                        >
                          <option value="">미지정</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-300">{product.defaultPrice.toLocaleString()}원</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-300">
                        {product.wholesalePrice ? product.wholesalePrice.toLocaleString() + '원' : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        <button onClick={() => handleDeleteAllProduct(product.id)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 px-2">삭제</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">조건에 맞는 제품이 없습니다.</p>
          )}
        </div>
      )}

      {/* 카테고리 관리 탭 */}
      {activeTab === 'categories' && (
        <div className="max-w-2xl bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">카테고리 관리</h2>
            <button
              onClick={() => setIsAddingCategory(true)}
              className="px-2 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              + 카테고리 추가
            </button>
          </div>

          {isAddingCategory && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="grid grid-cols-2 gap-4 mb-2">
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  placeholder="카테고리 이름"
                  className="p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-md"
                />
                <input
                  type="number"
                  value={newCategory.sortOrder}
                  onChange={(e) => setNewCategory({ ...newCategory, sortOrder: parseInt(e.target.value) || 0 })}
                  placeholder="정렬 순서"
                  className="p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-md"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button onClick={() => setIsAddingCategory(false)} className="px-3 py-1 bg-gray-300 text-gray-800 dark:bg-gray-600 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500">취소</button>
                <button onClick={handleAddCategory} className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700">추가</button>
              </div>
            </div>
          )}

          {categories.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">이름</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">정렬 순서</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">관리</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{cat.id}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {editingCategoryId === cat.id ? (
                        <input
                          type="text"
                          value={editingCategoryData.name}
                          onChange={(e) => setEditingCategoryData({ ...editingCategoryData, name: e.target.value })}
                          className="p-1 border border-gray-300 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-100 rounded text-sm w-full"
                        />
                      ) : cat.name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-300">
                      {editingCategoryId === cat.id ? (
                        <input
                          type="number"
                          value={editingCategoryData.sortOrder}
                          onChange={(e) => setEditingCategoryData({ ...editingCategoryData, sortOrder: parseInt(e.target.value) || 0 })}
                          className="p-1 border border-gray-300 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-100 rounded text-sm w-20 text-center"
                        />
                      ) : cat.sort_order}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      {editingCategoryId === cat.id ? (
                        <div className="flex justify-center space-x-2">
                          <button onClick={() => handleUpdateCategory(cat.id)} className="text-green-600 hover:text-green-800 dark:text-green-400 px-2">저장</button>
                          <button onClick={() => setEditingCategoryId(null)} className="text-gray-600 hover:text-gray-800 dark:text-gray-400 px-2">취소</button>
                        </div>
                      ) : (
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => {
                              setEditingCategoryId(cat.id);
                              setEditingCategoryData({ name: cat.name, sortOrder: cat.sort_order });
                            }}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 px-2"
                          >수정</button>
                          <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 px-2">삭제</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">등록된 카테고리가 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}
