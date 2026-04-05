import { OrderItem, PrintingConfig, getPrintingUnitPrice } from '../models/orderTypes';

/**
 * 복수 프린팅(JSON) 방식의 인쇄 비용 계산 (옷 1장당)
 */
const calculateMultiPrintingCost = (configs: PrintingConfig[], totalQuantity: number): number => {
    let cost = 0;
    for (const config of configs) {
        const s = Math.max(0, Number(config.smallPrintCount) || 0);
        const m = Math.max(0, Number(config.mediumPrintCount) || 0);
        const l = Math.max(0, Number(config.largePrintCount) || 0);
        const xl = Math.max(0, Number(config.extraLargePrintCount) || 0);

        if (s > 0) cost += getPrintingUnitPrice(config.printingOption, 'small', totalQuantity) * s;
        if (m > 0) cost += getPrintingUnitPrice(config.printingOption, 'medium', totalQuantity) * m;
        if (l > 0) cost += getPrintingUnitPrice(config.printingOption, 'large', totalQuantity) * l;
        if (xl > 0) cost += getPrintingUnitPrice(config.printingOption, 'extraLarge', totalQuantity) * xl;
    }
    return cost;
};

/**
 * 단일 프린팅 방식의 인쇄 비용 계산 (옷 1장당, 레거시 새 프린팅 호환)
 */
const calculateSinglePrintingCost = (item: OrderItem, totalQuantity: number): number => {
    if (!item.printingOption) return 0;

    let cost = 0;
    const s = Math.max(0, Number(item.smallPrintCount) || 0);
    const m = Math.max(0, Number(item.mediumPrintCount) || 0);
    const l = Math.max(0, Number(item.largePrintCount) || 0);
    const xl = Math.max(0, Number(item.extraLargePrintCount) || 0);

    if (s > 0) cost += getPrintingUnitPrice(item.printingOption, 'small', totalQuantity) * s;
    if (m > 0) cost += getPrintingUnitPrice(item.printingOption, 'medium', totalQuantity) * m;
    if (l > 0) cost += getPrintingUnitPrice(item.printingOption, 'large', totalQuantity) * l;
    if (xl > 0) cost += getPrintingUnitPrice(item.printingOption, 'extraLarge', totalQuantity) * xl;

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
 * 개별 상품의 단가를 계산합니다 (기본가 + 프린팅 + 개별단가)
 */
export const calculateUnitPrice = (item: OrderItem, totalQuantity?: number): number => {
    const basePrice = Math.max(0, Number(item.price) || 0);
    const qty = totalQuantity ?? Math.max(1, Number(item.quantity) || 1);

    let printingCost = 0;

    if (item.printingConfigs && item.printingConfigs.length > 0) {
        // 복수 프린팅 (JSON)
        printingCost = calculateMultiPrintingCost(item.printingConfigs, qty);
    } else if (item.printingOption) {
        // 단일 프린팅 (기존 새 방식)
        printingCost = calculateSinglePrintingCost(item, qty);
    } else if ((item.smallPrintingQuantity ?? 0) > 0 || (item.largePrintingQuantity ?? 0) > 0 || (item.extraLargePrintingQuantity ?? 0) > 0) {
        // 레거시 방식
        printingCost = calculateLegacyPrintingCost(item);
        return basePrice + printingCost; // 레거시는 개별단가가 이미 포함됨
    }

    // 개별단가 (복수/단일 프린팅에서 별도 계산)
    const customQty = Math.max(0, Number(item.extraLargePrintingQuantity) || 0);
    const customPrice = Math.max(0, Number(item.extraLargePrintingPrice) || 0);
    if (customQty > 0 && customPrice > 0) {
        printingCost += customQty * customPrice;
    }

    return basePrice + printingCost;
};

/**
 * 개별 상품의 총액을 계산합니다
 */
export const calculateItemTotal = (item: OrderItem, totalQuantity?: number): number => {
    const quantity = Math.max(0, Number(item.quantity) || 0);
    const unitPrice = calculateUnitPrice(item, totalQuantity);
    return unitPrice * quantity;
};

/**
 * 주문의 총 금액을 계산합니다
 */
export const calculateTotalPrice = (items: OrderItem[]): number => {
    const totalQuantity = items.reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0);
    return items.reduce((sum, item) => sum + calculateItemTotal(item, totalQuantity), 0);
};
