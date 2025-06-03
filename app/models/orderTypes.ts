'use client';

// 회사 타입 정의
export interface Company {
    id: string;
    name: string;
    products: Product[];
}

// 제품 타입 정의
export interface Product {
    id: string;
    name: string;
    defaultPrice: number;
}

// 주문 항목 타입 정의
export interface OrderItem {
    id: string;
    product: string;
    quantity: number;
    size: string;
    color: string;
    price: number;
    smallPrintingQuantity?: number;
    largePrintingQuantity?: number;
    extraLargePrintingQuantity?: number;
    extraLargePrintingPrice?: number;
    designWorkQuantity?: number;
    designWorkPrice?: number;
}

// 주문 타입 정의
export interface Order {
    id: string;
    customerName: string;
    phone: string;
    address: string;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    orderDate: string;
    paymentMethod: string;
    items: OrderItem[];
    totalPrice: number;
}

// 주문 상태 한글 표시
export const orderStatusMap = {
    pending: '대기중',
    processing: '처리중',
    shipped: '배송중',
    delivered: '배송완료',
    cancelled: '취소됨'
};

// 주문 상태에 따른 배경색 지정
export const getStatusColor = (status: string) => {
    switch (status) {
        case 'pending':
            return 'bg-yellow-100 text-yellow-800';
        case 'processing':
            return 'bg-blue-100 text-blue-800';
        case 'shipped':
            return 'bg-purple-100 text-purple-800';
        case 'delivered':
            return 'bg-green-100 text-green-800';
        case 'cancelled':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

// 샘플 주문 데이터
export const initialOrders: Order[] = [
    {
        id: 'ORD-001',
        customerName: '김민수',
        phone: '010-1234-5678',
        address: '서울시 강남구 테헤란로 123',
        status: 'delivered',
        orderDate: '2025-05-28',
        paymentMethod: '신용카드',
        items: [
            {
                id: 'ITEM-001-1',
                product: '기본 티셔츠',
                quantity: 2,
                size: 'M',
                color: '검정',
                price: 15000
            },
            {
                id: 'ITEM-001-2',
                product: '면 반바지',
                quantity: 1,
                size: 'M',
                color: '네이비',
                price: 25000
            }
        ],
        totalPrice: 55000
    },
    {
        id: 'ORD-002',
        customerName: '이지연',
        phone: '010-9876-5432',
        address: '서울시 서초구 방배로 456',
        status: 'processing',
        orderDate: '2025-05-30',
        paymentMethod: '무통장입금',
        items: [
            {
                id: 'ITEM-002-1',
                product: '면 맨투맨',
                quantity: 1,
                size: 'L',
                color: '흰색',
                price: 35000
            }
        ],
        totalPrice: 35000
    },
    {
        id: 'ORD-003',
        customerName: '박준호',
        phone: '010-5555-4444',
        address: '경기도 성남시 분당구 판교로 789',
        status: 'pending',
        orderDate: '2025-06-01',
        paymentMethod: '카카오페이',
        items: [
            {
                id: 'ITEM-003-1',
                product: '청바지',
                quantity: 1,
                size: '32',
                color: '진청',
                price: 45000
            },
            {
                id: 'ITEM-003-2',
                product: '가죽 벨트',
                quantity: 1,
                size: 'FREE',
                color: '브라운',
                price: 18000
            },
            {
                id: 'ITEM-003-3',
                product: '면 양말',
                quantity: 3,
                size: 'FREE',
                color: '흰색',
                price: 4000
            }
        ],
        totalPrice: 75000
    }
];

// 초기 회사 및 제품 데이터
export const initialCompanies: Company[] = [
    {
        id: 'comp-001',
        name: '스타일리시',
        products: [
            { id: 'prod-001-1', name: '기본 티셔츠', defaultPrice: 15000 },
            { id: 'prod-001-2', name: '면 맨투맨', defaultPrice: 35000 },
            { id: 'prod-001-3', name: '후드 집업', defaultPrice: 45000 }
        ]
    },
    {
        id: 'comp-002',
        name: '데님코',
        products: [
            { id: 'prod-002-1', name: '청바지', defaultPrice: 45000 },
            { id: 'prod-002-2', name: '데님 자켓', defaultPrice: 65000 },
            { id: 'prod-002-3', name: '데님 스커트', defaultPrice: 38000 }
        ]
    },
    {
        id: 'comp-003',
        name: '코지웨어',
        products: [
            { id: 'prod-003-1', name: '니트 스웨터', defaultPrice: 42000 },
            { id: 'prod-003-2', name: '울 코트', defaultPrice: 120000 },
            { id: 'prod-003-3', name: '캐시미어 목도리', defaultPrice: 38000 }
        ]
    },
    {
        id: 'comp-004',
        name: '액티브스포츠',
        products: [
            { id: 'prod-004-1', name: '스포츠 티셔츠', defaultPrice: 28000 },
            { id: 'prod-004-2', name: '트레이닝 팬츠', defaultPrice: 35000 },
            { id: 'prod-004-3', name: '기능성 재킷', defaultPrice: 89000 }
        ]
    }
];
