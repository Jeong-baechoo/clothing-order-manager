import { OrderItem } from '../models/orderTypes';

/**
 * 개별 상품의 단가를 계산합니다 (기본가 + 프린팅 + 디자인)
 * @param item 주문 항목
 * @returns 계산된 단가
 */
export const calculateUnitPrice = (item: OrderItem): number => {
    const basePrice = Math.max(0, Number(item.price) || 0);
    
    // 프린팅 비용 계산 (개당)
    let printingCostPerItem = 0;
    printingCostPerItem += Math.max(0, Number(item.smallPrintingQuantity) || 0) * 1500;
    printingCostPerItem += Math.max(0, Number(item.largePrintingQuantity) || 0) * 3000;

    // 특대형 프린팅 (개당)
    const extraLargeQty = Math.max(0, Number(item.extraLargePrintingQuantity) || 0);
    const extraLargePrice = Math.max(0, Number(item.extraLargePrintingPrice) || 0);
    if (extraLargeQty > 0 && extraLargePrice > 0) {
        printingCostPerItem += extraLargeQty * extraLargePrice;
    }

    // 디자인 작업 (개당)
    const designQty = Math.max(0, Number(item.designWorkQuantity) || 0);
    const designPrice = Math.max(0, Number(item.designWorkPrice) || 0);
    if (designQty > 0 && designPrice > 0) {
        printingCostPerItem += designQty * designPrice;
    }

    return basePrice + printingCostPerItem;
};

/**
 * 개별 상품의 총액을 계산합니다
 * @param item 주문 항목
 * @returns 계산된 총액
 */
export const calculateItemTotal = (item: OrderItem): number => {
    const quantity = Math.max(0, Number(item.quantity) || 0);
    const unitPrice = calculateUnitPrice(item);
    return unitPrice * quantity;
};

/**
 * 주문의 총 금액을 계산합니다
 * @param items 주문 항목 배열
 * @returns 계산된 총 금액
 */
export const calculateTotalPrice = (items: OrderItem[]): number => {
    return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
};