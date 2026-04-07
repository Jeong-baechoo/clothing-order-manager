import { describe, it, expect } from 'vitest';
import {
  groupsToOrderItems,
  orderItemsToGroups,
} from '../app/utils/product-group-utils';
import { ProductGroup, PrintingConfig } from '../app/models/orderTypes';

// =============================================================================
// 버그 재현: 같은 제품+같은 가격, 다른 프린팅으로 4그룹 생성 시
// 저장(groups→items) → 편집 로드(items→groups) 라운드트립에서 그룹 병합
// =============================================================================

const makePrinting = (
  option: 'dtf' | 'reflective_dtf' | 'remover' | 'individual',
  counts: { s?: number; m?: number; l?: number; xl?: number } = {},
): PrintingConfig => ({
  id: `print-${option}-${Math.random()}`,
  printingOption: option,
  smallPrintCount: counts.s || 0,
  mediumPrintCount: counts.m || 0,
  largePrintCount: counts.l || 0,
  extraLargePrintCount: counts.xl || 0,
});

describe('버그 재현: 같은 제품, 같은 가격, 다른 프린팅 → 그룹 병합', () => {
  it('4개 그룹(같은 제품, 같은 가격, 각각 다른 프린팅) → 저장 후 로드해도 4개 그룹 유지', () => {
    const groups: ProductGroup[] = [
      {
        id: 'g1',
        product: '기본 티셔츠',
        productId: 'prod-1',
        price: 10000,
        variants: [{ id: 'v1', quantity: 5, size: 'M', color: '흰색' }],
        printings: [makePrinting('dtf', { s: 1 })],
        extraLargePrintingQuantity: 0,
        extraLargePrintingPrice: 0,
      },
      {
        id: 'g2',
        product: '기본 티셔츠',
        productId: 'prod-1',
        price: 10000,
        variants: [{ id: 'v2', quantity: 3, size: 'L', color: '검정' }],
        printings: [makePrinting('reflective_dtf', { m: 1 })],
        extraLargePrintingQuantity: 0,
        extraLargePrintingPrice: 0,
      },
      {
        id: 'g3',
        product: '기본 티셔츠',
        productId: 'prod-1',
        price: 10000,
        variants: [{ id: 'v3', quantity: 7, size: 'XL', color: '네이비' }],
        printings: [makePrinting('remover', { l: 1 })],
        extraLargePrintingQuantity: 0,
        extraLargePrintingPrice: 0,
      },
      {
        id: 'g4',
        product: '기본 티셔츠',
        productId: 'prod-1',
        price: 10000,
        variants: [{ id: 'v4', quantity: 2, size: 'S', color: '빨강' }],
        printings: [makePrinting('individual', { xl: 1 })],
        extraLargePrintingQuantity: 0,
        extraLargePrintingPrice: 0,
      },
    ];

    const items = groupsToOrderItems(groups);
    expect(items).toHaveLength(4);

    const restored = orderItemsToGroups(items);

    // 4개 그룹 유지
    expect(restored).toHaveLength(4);

    // 각 그룹의 프린팅이 보존됨
    const printingOptions = restored.map(g => g.printings[0].printingOption).sort();
    expect(printingOptions).toEqual(['dtf', 'individual', 'reflective_dtf', 'remover']);

    // 각 그룹에 variant 1개씩
    expect(restored.every(g => g.variants.length === 1)).toBe(true);
  });

  it('같은 제품, 같은 가격이라도 프린팅이 다르면 별도 그룹으로 유지되어야 함', () => {
    const groups: ProductGroup[] = [
      {
        id: 'g1',
        product: '기본 티셔츠',
        productId: 'prod-1',
        price: 10000,
        variants: [{ id: 'v1', quantity: 5, size: 'M', color: '흰색' }],
        printings: [makePrinting('dtf', { s: 1 })],
        extraLargePrintingQuantity: 0,
        extraLargePrintingPrice: 0,
      },
      {
        id: 'g2',
        product: '기본 티셔츠',
        productId: 'prod-1',
        price: 10000,
        variants: [{ id: 'v2', quantity: 3, size: 'L', color: '검정' }],
        printings: [makePrinting('reflective_dtf', { m: 1 })],
        extraLargePrintingQuantity: 0,
        extraLargePrintingPrice: 0,
      },
    ];

    const items = groupsToOrderItems(groups);
    const restored = orderItemsToGroups(items);

    // 이 assertion은 현재 실패함 — 버그
    expect(restored).toHaveLength(2);
    expect(restored[0].printings[0].printingOption).toBe('dtf');
    expect(restored[1].printings[0].printingOption).toBe('reflective_dtf');
  });

  it('같은 제품, 다른 가격이면 정상적으로 분리됨', () => {
    const groups: ProductGroup[] = [
      {
        id: 'g1',
        product: '기본 티셔츠',
        productId: 'prod-1',
        price: 10000,
        variants: [{ id: 'v1', quantity: 5, size: 'M', color: '흰색' }],
        printings: [makePrinting('dtf', { s: 1 })],
        extraLargePrintingQuantity: 0,
        extraLargePrintingPrice: 0,
      },
      {
        id: 'g2',
        product: '기본 티셔츠',
        productId: 'prod-1',
        price: 12000, // 다른 가격!
        variants: [{ id: 'v2', quantity: 3, size: 'L', color: '검정' }],
        printings: [makePrinting('reflective_dtf', { m: 1 })],
        extraLargePrintingQuantity: 0,
        extraLargePrintingPrice: 0,
      },
    ];

    const items = groupsToOrderItems(groups);
    const restored = orderItemsToGroups(items);

    // 가격이 다르면 정상 분리
    expect(restored).toHaveLength(2);
  });

  it('프린팅 없는 그룹끼리 같은 제품+같은 가격이면 병합해도 무방', () => {
    const groups: ProductGroup[] = [
      {
        id: 'g1',
        product: '기본 티셔츠',
        productId: 'prod-1',
        price: 10000,
        variants: [{ id: 'v1', quantity: 5, size: 'M', color: '흰색' }],
        printings: [],
        extraLargePrintingQuantity: 0,
        extraLargePrintingPrice: 0,
      },
      {
        id: 'g2',
        product: '기본 티셔츠',
        productId: 'prod-1',
        price: 10000,
        variants: [{ id: 'v2', quantity: 3, size: 'L', color: '검정' }],
        printings: [],
        extraLargePrintingQuantity: 0,
        extraLargePrintingPrice: 0,
      },
    ];

    const items = groupsToOrderItems(groups);
    const restored = orderItemsToGroups(items);

    // 프린팅 없으면 병합해도 단가 동일하므로 OK
    expect(restored).toHaveLength(1);
    expect(restored[0].variants).toHaveLength(2);
  });
});
