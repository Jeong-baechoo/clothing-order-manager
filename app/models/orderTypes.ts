// =============================================================================
// CORE BUSINESS TYPES
// =============================================================================

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
    wholesalePrice?: number;
}

// 제품 정보 (데이터베이스 정규화용)
export interface ProductInfo {
    id: string;
    name: string;
    default_price: number;
    wholesale_price?: number;
    companies?: {
        name: string;
    };
}

// =============================================================================
// ORDER TYPES
// =============================================================================

// 주문 상태 타입
export type OrderStatus = 'pending' | 'processing' | 'completed';

// 결제 방법 타입
export type PaymentMethod = '신용카드' | '무통장입금' | '계좌이체' | '현금' | '기타';

// 주문 항목 타입 정의
export interface OrderItem {
    id: string;
    product: string; // 제품명 (UI용)
    productId?: string; // 제품 ID (정규화된 참조)
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
    productInfo?: ProductInfo; // 정규화된 제품 정보
}

// 주문 타입 정의
export interface Order {
    id: string;
    customerName: string;
    phone: string;
    address: string;
    status: OrderStatus;
    orderDate: string;
    paymentMethod: string;
    items: OrderItem[];
    totalPrice: number;
    shippingFee?: number;  // 배송비 필드 추가
}

// 주문 상태 한글 표시
export const orderStatusMap = {
    pending: '대기중',
    processing: '작업중',
    completed: '완료'
};

// 주문 상태에 따른 배경색 지정
export const getStatusColor = (status: string) => {
    switch (status) {
        case 'pending':
            return 'bg-yellow-100 text-yellow-800';
        case 'processing':
            return 'bg-blue-100 text-blue-800';
        case 'completed':
            return 'bg-green-100 text-green-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

// 초기 더미 데이터 (개발 및 테스트용)
export const initialOrders: Order[] = [
    {
        id: 'ORD-001',
        customerName: '김철수',
        phone: '010-1234-5678',
        address: '서울시 강남구 테헤란로 123',
        status: 'pending',
        orderDate: '2024-01-15',
        paymentMethod: '신용카드',
        totalPrice: 45000,
        items: [
            {
                id: 'ITEM-001',
                product: '기본 티셔츠',
                quantity: 2,
                size: 'L',
                color: '검정',
                price: 15000,
                smallPrintingQuantity: 1,
                largePrintingQuantity: 0,
                extraLargePrintingQuantity: 0,
                extraLargePrintingPrice: 0,
                designWorkQuantity: 0,
                designWorkPrice: 0
            }
        ]
    },
    {
        id: 'ORD-002',
        customerName: '이영희',
        phone: '010-9876-5432',
        address: '부산시 해운대구 센텀시티로 456',
        status: 'processing',
        orderDate: '2024-01-16',
        paymentMethod: '무통장입금',
        totalPrice: 78000,
        items: [
            {
                id: 'ITEM-002',
                product: '후드티',
                quantity: 1,
                size: 'XL',
                color: '네이비',
                price: 35000,
                smallPrintingQuantity: 0,
                largePrintingQuantity: 2,
                extraLargePrintingQuantity: 1,
                extraLargePrintingPrice: 5000,
                designWorkQuantity: 1,
                designWorkPrice: 15000
            }
        ]
    }
];
