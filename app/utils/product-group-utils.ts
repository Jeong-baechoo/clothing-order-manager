import { OrderItem, ProductGroup, PrintingConfig } from '../models/orderTypes';
import { calculateItemTotal } from './order-calculations';

/**
 * 레거시 주문인지 확인 (기존 프린팅 필드 사용)
 */
export function isLegacyOrder(items: OrderItem[]): boolean {
    return items.some(item =>
        !item.printingOption && (
            (item.smallPrintingQuantity ?? 0) > 0 ||
            (item.largePrintingQuantity ?? 0) > 0 ||
            (item.extraLargePrintingQuantity ?? 0) > 0
        )
    );
}

/**
 * OrderItem[] → ProductGroup[] 변환 (편집 시 사용)
 * printingConfigs JSON이 있으면 그대로 사용, 없으면 단일 printingOption에서 복원
 */
export function orderItemsToGroups(items: OrderItem[]): ProductGroup[] {
    // productId(또는 상품명) + price 기준으로 그룹핑
    const groupMap = new Map<string, { items: OrderItem[], printings: PrintingConfig[] }>();

    for (const item of items) {
        const key = `${item.productId || item.product}-${item.price}`;

        if (!groupMap.has(key)) {
            // 프린팅 복원: printingConfigs가 있으면 사용, 없으면 단일 printingOption에서 생성
            let printings: PrintingConfig[] = [];
            if (item.printingConfigs && item.printingConfigs.length > 0) {
                printings = item.printingConfigs.map(pc => ({
                    ...pc,
                    id: pc.id || `print-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                }));
            } else if (item.printingOption) {
                printings = [{
                    id: `print-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    printingOption: item.printingOption,
                    smallPrintCount: item.smallPrintCount || 0,
                    mediumPrintCount: item.mediumPrintCount || 0,
                    largePrintCount: item.largePrintCount || 0,
                    extraLargePrintCount: item.extraLargePrintCount || 0,
                }];
            }
            groupMap.set(key, { items: [item], printings });
        } else {
            groupMap.get(key)!.items.push(item);
        }
    }

    const groups: ProductGroup[] = [];
    for (const [, { items: groupItems, printings }] of groupMap) {
        const firstItem = groupItems[0];
        groups.push({
            id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            product: firstItem.product,
            productId: firstItem.productId,
            price: firstItem.price,
            variants: groupItems.map(item => ({
                id: `variant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                quantity: item.quantity,
                size: item.size,
                color: item.color,
                remarks: item.remarks,
            })),
            printings,
            extraLargePrintingQuantity: firstItem.extraLargePrintingQuantity || 0,
            extraLargePrintingPrice: firstItem.extraLargePrintingPrice || 0,
        });
    }

    return groups;
}

/**
 * ProductGroup[] → OrderItem[] 변환 (저장 시 사용)
 * 1행 = 1 variant, 프린팅은 printingConfigs JSON으로 저장
 */
export function groupsToOrderItems(groups: ProductGroup[]): OrderItem[] {
    const items: OrderItem[] = [];

    for (const group of groups) {
        for (const variant of group.variants) {
            items.push({
                id: variant.id,
                product: group.product,
                productId: group.productId,
                price: group.price,
                quantity: variant.quantity,
                size: variant.size,
                color: variant.color,
                printingConfigs: group.printings.length > 0 ? group.printings : undefined,
                extraLargePrintingQuantity: group.extraLargePrintingQuantity,
                extraLargePrintingPrice: group.extraLargePrintingPrice,
                remarks: variant.remarks,
            });
        }
    }

    return items;
}

/**
 * 전체 수량 합계 (프린팅 구간 결정용)
 * variant 수량만 합산 (프린팅 중복 행 제외)
 */
export function calculateGroupsTotalQuantity(groups: ProductGroup[]): number {
    return groups.reduce((sum, group) =>
        sum + group.variants.reduce((vSum, v) => vSum + Math.max(0, Number(v.quantity) || 0), 0), 0
    );
}

/**
 * 그룹 소계 계산
 */
export function calculateGroupSubtotal(group: ProductGroup, totalQuantity: number): number {
    const items = groupsToOrderItems([group]);
    return items.reduce((sum, item) => sum + calculateItemTotal(item, totalQuantity), 0);
}
