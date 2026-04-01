import { OrderItem, getPrintingUnitPrice } from '../models/orderTypes';

/**
 * 새 프린팅 방식인지 확인
 */
const isNewPrinting = (item: OrderItem): boolean => {
    return !!item.printingOption;
};

/**
 * 새 프린팅 방식의 인쇄 비용 계산 (옷 1장당)
 * @param item 주문 항목
 * @param totalQuantity 주문 전체 옷 수량 (구간 결정용)
 */
const calculateNewPrintingCost = (item: OrderItem, totalQuantity: number): number => {
    if (!item.printingOption) return 0;

    let cost = 0;

    const smallCount = Math.max(0, Number(item.smallPrintCount) || 0);
    const mediumCount = Math.max(0, Number(item.mediumPrintCount) || 0);
    const largeCount = Math.max(0, Number(item.largePrintCount) || 0);
    const extraLargeCount = Math.max(0, Number(item.extraLargePrintCount) || 0);

    if (smallCount > 0) cost += getPrintingUnitPrice(item.printingOption, 'small', totalQuantity) * smallCount;
    if (mediumCount > 0) cost += getPrintingUnitPrice(item.printingOption, 'medium', totalQuantity) * mediumCount;
    if (largeCount > 0) cost += getPrintingUnitPrice(item.printingOption, 'large', totalQuantity) * largeCount;
    if (extraLargeCount > 0) cost += getPrintingUnitPrice(item.printingOption, 'extraLarge', totalQuantity) * extraLargeCount;

    // 개별단가
    const customQty = Math.max(0, Number(item.extraLargePrintingQuantity) || 0);
    const customPrice = Math.max(0, Number(item.extraLargePrintingPrice) || 0);
    if (customQty > 0 && customPrice > 0) {
        cost += customQty * customPrice;
    }

    return cost;
};

/**
 * 기존 프린팅 방식의 인쇄 비용 계산 (옷 1장당)
 */
const calculateLegacyPrintingCost = (item: OrderItem): number => {
    let cost = 0;
    cost += Math.max(0, Number(item.smallPrintingQuantity) || 0) * 1500;
    cost += Math.max(0, Number(item.largePrintingQuantity) || 0) * 3000;

    const extraLargeQty = Math.max(0, Number(item.extraLargePrintingQuantity) || 0);
    const extraLargePrice = Math.max(0, Number(item.extraLargePrintingPrice) || 0);
    if (extraLargeQty > 0 && extraLargePrice > 0) {
        cost += extraLargeQty * extraLargePrice;
    }

    const designQty = Math.max(0, Number(item.designWorkQuantity) || 0);
    const designPrice = Math.max(0, Number(item.designWorkPrice) || 0);
    if (designQty > 0 && designPrice > 0) {
        cost += designQty * designPrice;
    }

    return cost;
};

/**
 * 개별 상품의 단가를 계산합니다 (기본가 + 프린팅)
 * @param item 주문 항목
 * @param totalQuantity 주문 전체 옷 수량 (새 프린팅 구간 결정용, 생략 시 항목 수량 사용)
 */
export const calculateUnitPrice = (item: OrderItem, totalQuantity?: number): number => {
    const basePrice = Math.max(0, Number(item.price) || 0);
    const qty = totalQuantity ?? Math.max(1, Number(item.quantity) || 1);
    const printingCost = isNewPrinting(item)
        ? calculateNewPrintingCost(item, qty)
        : calculateLegacyPrintingCost(item);

    return basePrice + printingCost;
};

/**
 * 개별 상품의 총액을 계산합니다
 * @param item 주문 항목
 * @param totalQuantity 주문 전체 옷 수량 (새 프린팅 구간 결정용)
 */
export const calculateItemTotal = (item: OrderItem, totalQuantity?: number): number => {
    const quantity = Math.max(0, Number(item.quantity) || 0);
    const unitPrice = calculateUnitPrice(item, totalQuantity);
    return unitPrice * quantity;
};

/**
 * 주문의 총 금액을 계산합니다
 * @param items 주문 항목 배열
 */
export const calculateTotalPrice = (items: OrderItem[]): number => {
    const totalQuantity = items.reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0);
    return items.reduce((sum, item) => sum + calculateItemTotal(item, totalQuantity), 0);
};