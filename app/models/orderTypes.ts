// =============================================================================
// CORE BUSINESS TYPES
// =============================================================================

// 회사 타입 정의
export interface Company {
    id: string;
    name: string;
    products: Product[];
}

// 카테고리 타입 정의
export interface Category {
    id: number;
    name: string;
    sort_order: number;
}

// 제품 타입 정의
export interface Product {
    id: string;
    name: string;
    defaultPrice: number;
    wholesalePrice?: number;
    categoryId?: number;
    category?: Category;
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
// PRINTING TYPES & PRICING MATRIX
// =============================================================================

// 프린팅 옵션 타입
export type PrintingOption = 'dtf' | 'reflective_dtf' | 'remover' | 'individual';

// 프린팅 옵션 한글 표시
export const printingOptionMap: Record<PrintingOption, string> = {
    dtf: '일반 DTF',
    reflective_dtf: '반사 DTF',
    remover: '리무버',
    individual: '개별작업',
};

// 인쇄 사이즈 타입
export type PrintSize = 'small' | 'medium' | 'large' | 'extraLarge';

// 수량 구간 타입 (1~9, 10~29, 30~49, 50+)
export type QuantityTier = '1-9' | '10-29' | '30-49' | '50+';

// 수량으로 구간 결정
export const getQuantityTier = (quantity: number): QuantityTier => {
    if (quantity >= 50) return '50+';
    if (quantity >= 30) return '30-49';
    if (quantity >= 10) return '10-29';
    return '1-9';
};

// 가격 매트릭스: [프린팅옵션][수량구간][사이즈] = 단가
export const PRINTING_PRICE_MATRIX: Record<PrintingOption, Record<QuantityTier, Record<PrintSize, number>>> = {
    dtf: {
        '1-9':  { small: 2000, medium: 3500, large: 5000, extraLarge: 6000 },
        '10-29': { small: 1800, medium: 3200, large: 4500, extraLarge: 5500 },
        '30-49': { small: 1500, medium: 3000, large: 4000, extraLarge: 5000 },
        '50+':  { small: 1300, medium: 2700, large: 3500, extraLarge: 4500 },
    },
    reflective_dtf: {
        '1-9':  { small: 3500, medium: 5500, large: 7500, extraLarge: 9000 },
        '10-29': { small: 3200, medium: 5000, large: 6800, extraLarge: 8500 },
        '30-49': { small: 3000, medium: 4500, large: 6000, extraLarge: 8000 },
        '50+':  { small: 2700, medium: 4000, large: 5500, extraLarge: 7500 },
    },
    remover: {
        '1-9':  { small: 6000, medium: 10000, large: 14000, extraLarge: 18000 },
        '10-29': { small: 6000, medium: 10000, large: 14000, extraLarge: 18000 },
        '30-49': { small: 6000, medium: 10000, large: 14000, extraLarge: 18000 },
        '50+':  { small: 6000, medium: 10000, large: 14000, extraLarge: 18000 },
    },
    individual: {
        '1-9':  { small: 3000, medium: 4500, large: 6500, extraLarge: 8000 },
        '10-29': { small: 2700, medium: 4200, large: 6000, extraLarge: 7500 },
        '30-49': { small: 2500, medium: 4000, large: 5500, extraLarge: 7000 },
        '50+':  { small: 2300, medium: 3700, large: 5000, extraLarge: 6500 },
    },
};

// 프린팅 단가 조회
export const getPrintingUnitPrice = (
    option: PrintingOption,
    size: PrintSize,
    quantity: number
): number => {
    const tier = getQuantityTier(quantity);
    return PRINTING_PRICE_MATRIX[option][tier][size];
};

// =============================================================================
// PRODUCT GROUP TYPES (계층형 UI용)
// =============================================================================

// 사이즈/색상 변형
export interface ProductVariant {
    id: string;
    quantity: number;
    size: string;
    color: string;
    remarks?: string;
}

// 프린팅 설정 (한 옷에 여러 프린팅 가능)
export interface PrintingConfig {
    id: string;
    printingOption: PrintingOption;
    smallPrintCount: number;
    mediumPrintCount: number;
    largePrintCount: number;
    extraLargePrintCount: number;
}

// 상품 그룹 (계층형 주문 입력용)
export interface ProductGroup {
    id: string;
    product: string;
    productId?: string;
    price: number;
    variants: ProductVariant[];
    printings: PrintingConfig[]; // 복수 프린팅 지원
    // 개별단가
    extraLargePrintingQuantity: number;
    extraLargePrintingPrice: number;
}

// =============================================================================
// ORDER TYPES
// =============================================================================

// 주문 상태 타입
export type OrderStatus = 'pending' | 'paid' | 'printing_request' | 'processing' | 'completed' | 'hold';

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
    // 기존 프린팅 필드 (레거시 호환)
    smallPrintingQuantity?: number;
    largePrintingQuantity?: number;
    extraLargePrintingQuantity?: number;
    extraLargePrintingPrice?: number;
    designWorkQuantity?: number;
    designWorkPrice?: number;
    // 새 프린팅 필드 (단일 - 레거시 호환)
    printingOption?: PrintingOption | null;
    smallPrintCount?: number;
    mediumPrintCount?: number;
    largePrintCount?: number;
    extraLargePrintCount?: number;
    // 복수 프린팅 (JSON)
    printingConfigs?: PrintingConfig[];
    productInfo?: ProductInfo; // 정규화된 제품 정보
    remarks?: string; // 비고 필드 추가
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
    memo?: string;  // 메모 필드 추가
}

// 주문 상태 한글 표시
export const orderStatusMap = {
    pending: '대기중',
    paid: '입금완료',
    printing_request: '프린팅요청',
    processing: '작업중',
    completed: '완료',
    hold: '보류'
};

// 주문 상태에 따른 배경색 지정
export const getStatusColor = (status: string) => {
    switch (status) {
        case 'pending':
            return 'bg-yellow-100 text-yellow-800';
        case 'paid':
            return 'bg-purple-100 text-purple-800';
        case 'printing_request':
            return 'bg-orange-100 text-orange-800';
        case 'processing':
            return 'bg-blue-100 text-blue-800';
        case 'completed':
            return 'bg-green-100 text-green-800';
        case 'hold':
            return 'bg-red-100 text-red-800';
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
