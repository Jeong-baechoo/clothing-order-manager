'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, getSessionInfo } from '../../lib/auth';

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [email, setEmail] = useState('');
    useEffect(() => { getSessionInfo().then(info => setEmail(info?.email ?? '')); }, []);

    return (
        <nav className="bg-white shadow-md dark:bg-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <span className="text-xl font-bold text-gray-800 dark:text-white">케룸 주문 관리</span>
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            <Link
                                href="/"
                                className={`${pathname === '/'
                                    ? 'border-indigo-500 text-gray-900 dark:text-white'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white'
                                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200`}
                            >
                                홈
                            </Link>
                            <Link
                                href="/orders"
                                className={`${pathname === '/orders'
                                    ? 'border-indigo-500 text-gray-900 dark:text-white'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white'
                                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200`}
                            >
                                주문 관리
                            </Link>
                            <Link
                                href="/companies"
                                className={`${pathname === '/companies'
                                    ? 'border-indigo-500 text-gray-900 dark:text-white'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white'
                                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200`}
                            >
                                회사/제품 관리
                            </Link>
                            <Link
                                href="/analytics"
                                className={`${pathname === '/analytics'
                                    ? 'border-indigo-500 text-gray-900 dark:text-white'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white'
                                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200`}
                            >
                                분석
                            </Link>
                            <Link
                                href="/loss"
                                className={`${pathname === '/loss'
                                    ? 'border-indigo-500 text-gray-900 dark:text-white'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white'
                                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200`}
                            >
                                로스 관리
                            </Link>
                            <Link
                                href="/b2b/orders"
                                className={`${pathname.startsWith('/b2b')
                                    ? 'border-indigo-500 text-gray-900 dark:text-white'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white'
                                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200`}
                            >
                                발주(B2B)
                            </Link>
                        </div>
                    </div>
                    <div className="flex items-center">
                        <div className="hidden sm:ml-6 sm:flex sm:items-center">
                            {email && <span className="text-sm text-gray-500 dark:text-gray-400 mr-3 hidden md:inline">{email}</span>}
                            <button
                                type="button"
                                onClick={async () => { await signOut(); router.replace('/login'); }}
                                className="px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-red-600 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                            >
                                로그아웃
                            </button>
                        </div>
                        <div className="-mr-2 flex items-center sm:hidden">
                            <button
                                type="button"
                                className="bg-white dark:bg-gray-700 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                                aria-expanded="false"
                            >
                                <span className="sr-only">메뉴 열기</span>
                                <svg
                                    className="block h-6 w-6"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 모바일 메뉴 - 필요한 경우 구현 */}
        </nav>
    );
}
