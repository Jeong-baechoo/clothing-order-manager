import { describe, it, expect } from 'vitest';
import {
  groupsToOrderItems,
  orderItemsToGroups,
  calculateGroupsTotalQuantity,
  calculateGroupSubtotal,
  isLegacyOrder,
} from '../app/utils/product-group-utils';
import { OrderItem, ProductGroup, PrintingConfig } from '../app/models/orderTypes';

// =============================================================================
// 헬퍼
// =============================================================================
const makePrinting = (
  option: 'dtf' | 'reflective_dtf' | 'remover' | 'individual' = 'dtf',
  counts: { s?: number; m?: number; l?: number; xl?: number } = { s: 1 },
): PrintingConfig => ({
  id: `print-${Math.random()}`,
  printingOption: option,
  smallPrintCount: counts.s || 0,
  mediumPrintCount: counts.m || 0,
  largePrintCount: counts.l || 0,
  extraLargePrintCount: counts.xl || 0,
});

const makeGroup = (overrides: Partial<ProductGroup> = {}): ProductGroup => ({
  id: 'group-1',
  product: '기본 티셔츠',
  productId: 'prod-1',
  price: 10000,
  variants: [
    { id: 'v1', quantity: 5, size: 'L', color: '검정' },
  ],
  printings: [],
  extraLargePrintingQuantity: 0,
  extraLargePrintingPrice: 0,
  ...overrides,
});

// =============================================================================
// 1. groupsToOrderItems 변환
// =============================================================================
describe('groupsToOrderItems 변환', () => {
  it('1그룹 1변형 → OrderItem 1개', () => {
    const group = makeGroup();
    const items = groupsToOrderItems([group]);
    expect(items).toHaveLength(1);
    expect(items[0].product).toBe('기본 티셔츠');
    expect(items[0].productId).toBe('prod-1');
    expect(items[0].price).toBe(10000);
    expect(items[0].quantity).toBe(5);
    expect(items[0].size).toBe('L');
    expect(items[0].color).toBe('검정');
  });

  it('1그룹 3변형 → OrderItem 3개 (같은 product/price)', () => {
    const group = makeGroup({
      variants: [
        { id: 'v1', quantity: 3, size: 'M', color: '흰색' },
        { id: 'v2', quantity: 5, size: 'L', color: '검정' },
        { id: 'v3', quantity: 2, size: 'XL', color: '네이비' },
      ],
    });
    const items = groupsToOrderItems([group]);
    expect(items).toHaveLength(3);
    expect(items.every(i => i.product === '기본 티셔츠')).toBe(true);
    expect(items.every(i => i.price === 10000)).toBe(true);
    expect(items.map(i => i.quantity)).toEqual([3, 5, 2]);
  });

  it('프린팅 설정이 모든 variant에 동일하게 복사됨', () => {
    const printing = makePrinting('dtf', { s: 1, l: 1 });
    const group = makeGroup({
      variants: [
        { id: 'v1', quantity: 3, size: 'M', color: '흰색' },
        { id: 'v2', quantity: 5, size: 'L', color: '검정' },
      ],
      printings: [printing],
    });
    const items = groupsToOrderItems([group]);
    expect(items).toHaveLength(2);
    // 양쪽 다 printingConfigs가 있어야 함
    expect(items[0].printingConfigs).toBeDefined();
    expect(items[0].printingConfigs![0].printingOption).toBe('dtf');
    expect(items[0].printingConfigs![0].smallPrintCount).toBe(1);
    expect(items[0].printingConfigs![0].largePrintCount).toBe(1);
    expect(items[1].printingConfigs).toEqual(items[0].printingConfigs);
  });

  it('복수 프린팅이 각 variant에 전달됨', () => {
    const group = makeGroup({
      variants: [
        { id: 'v1', quantity: 10, size: 'L', color: '검정' },
      ],
      printings: [
        makePrinting('dtf', { s: 1 }),
        makePrinting('reflective_dtf', { m: 1 }),
      ],
    });
    const items = groupsToOrderItems([group]);
    expect(items[0].printingConfigs).toHaveLength(2);
    expect(items[0].printingConfigs![0].printingOption).toBe('dtf');
    expect(items[0].printingConfigs![1].printingOption).toBe('reflective_dtf');
  });

  it('프린팅 없으면 printingConfigs가 undefined', () => {
    const group = makeGroup({ printings: [] });
    const items = groupsToOrderItems([group]);
    expect(items[0].printingConfigs).toBeUndefined();
  });

  it('개별단가가 variant에 전달됨', () => {
    const group = makeGroup({
      extraLargePrintingQuantity: 2,
      extraLargePrintingPrice: 5000,
    });
    const items = groupsToOrderItems([group]);
    expect(items[0].extraLargePrintingQuantity).toBe(2);
    expect(items[0].extraLargePrintingPrice).toBe(5000);
  });

  it('2그룹 → 각 그룹의 variant 합산', () => {
    const groups: ProductGroup[] = [
      makeGroup({
        id: 'g1',
        product: '티셔츠',
        variants: [
          { id: 'v1', quantity: 3, size: 'M', color: '흰색' },
          { id: 'v2', quantity: 2, size: 'L', color: '검정' },
        ],
      }),
      makeGroup({
        id: 'g2',
        product: '후드티',
        price: 20000,
        variants: [
          { id: 'v3', quantity: 1, size: 'XL', color: '네이비' },
        ],
      }),
    ];
    const items = groupsToOrderItems(groups);
    expect(items).toHaveLength(3);
    expect(items[0].product).toBe('티셔츠');
    expect(items[1].product).toBe('티셔츠');
    expect(items[2].product).toBe('후드티');
  });

  it('비고(remarks) 필드가 variant별로 전달됨', () => {
    const group = makeGroup({
      variants: [
        { id: 'v1', quantity: 3, size: 'M', color: '흰색', remarks: '급해요' },
        { id: 'v2', quantity: 2, size: 'L', color: '검정' },
      ],
    });
    const items = groupsToOrderItems([group]);
    expect(items[0].remarks).toBe('급해요');
    expect(items[1].remarks).toBeUndefined();
  });
});

// =============================================================================
// 2. orderItemsToGroups 변환
// =============================================================================
describe('orderItemsToGroups 변환', () => {
  it('같은 productId+price인 아이템이 하나의 그룹으로 묶임', () => {
    const items: OrderItem[] = [
      {
        id: 'i1', product: '티셔츠', productId: 'p1', quantity: 3,
        size: 'M', color: '흰색', price: 10000,
      },
      {
        id: 'i2', product: '티셔츠', productId: 'p1', quantity: 5,
        size: 'L', color: '검정', price: 10000,
      },
    ];
    const groups = orderItemsToGroups(items);
    expect(groups).toHaveLength(1);
    expect(groups[0].variants).toHaveLength(2);
    expect(groups[0].product).toBe('티셔츠');
  });

  it('같은 상품이라도 price가 다르면 별도 그룹', () => {
    const items: OrderItem[] = [
      {
        id: 'i1', product: '티셔츠', productId: 'p1', quantity: 3,
        size: 'M', color: '흰색', price: 10000,
      },
      {
        id: 'i2', product: '티셔츠', productId: 'p1', quantity: 5,
        size: 'L', color: '검정', price: 12000,
      },
    ];
    const groups = orderItemsToGroups(items);
    expect(groups).toHaveLength(2);
  });

  it('printingConfigs JSON이 그룹에 복원됨', () => {
    const configs: PrintingConfig[] = [
      {
        id: 'pc1', printingOption: 'dtf',
        smallPrintCount: 1, mediumPrintCount: 0,
        largePrintCount: 0, extraLargePrintCount: 0,
      },
    ];
    const items: OrderItem[] = [
      {
        id: 'i1', product: '티셔츠', productId: 'p1', quantity: 5,
        size: 'L', color: '검정', price: 10000,
        printingConfigs: configs,
      },
    ];
    const groups = orderItemsToGroups(items);
    expect(groups[0].printings).toHaveLength(1);
    expect(groups[0].printings[0].printingOption).toBe('dtf');
    expect(groups[0].printings[0].smallPrintCount).toBe(1);
  });

  it('단일 printingOption에서 PrintingConfig로 복원됨', () => {
    const items: OrderItem[] = [
      {
        id: 'i1', product: '티셔츠', productId: 'p1', quantity: 5,
        size: 'L', color: '검정', price: 10000,
        printingOption: 'reflective_dtf',
        smallPrintCount: 0, mediumPrintCount: 1,
        largePrintCount: 0, extraLargePrintCount: 0,
      },
    ];
    const groups = orderItemsToGroups(items);
    expect(groups[0].printings).toHaveLength(1);
    expect(groups[0].printings[0].printingOption).toBe('reflective_dtf');
    expect(groups[0].printings[0].mediumPrintCount).toBe(1);
  });

  it('프린팅 없는 아이템은 빈 printings 배열', () => {
    const items: OrderItem[] = [
      {
        id: 'i1', product: '티셔츠', productId: 'p1', quantity: 5,
        size: 'L', color: '검정', price: 10000,
      },
    ];
    const groups = orderItemsToGroups(items);
    expect(groups[0].printings).toEqual([]);
  });

  it('개별단가가 그룹에 복원됨', () => {
    const items: OrderItem[] = [
      {
        id: 'i1', product: '티셔츠', productId: 'p1', quantity: 5,
        size: 'L', color: '검정', price: 10000,
        extraLargePrintingQuantity: 2,
        extraLargePrintingPrice: 4000,
      },
    ];
    const groups = orderItemsToGroups(items);
    expect(groups[0].extraLargePrintingQuantity).toBe(2);
    expect(groups[0].extraLargePrintingPrice).toBe(4000);
  });
});

// =============================================================================
// 3. 라운드트립 정합성 (groups → items → groups)
// =============================================================================
describe('라운드트립 정합성', () => {
  it('groups → items → groups 변환 시 데이터 보존', () => {
    const original: ProductGroup[] = [
      makeGroup({
        id: 'g1',
        product: '반팔 티',
        productId: 'prod-100',
        price: 15000,
        variants: [
          { id: 'v1', quantity: 3, size: 'M', color: '흰색' },
          { id: 'v2', quantity: 7, size: 'L', color: '검정' },
        ],
        printings: [makePrinting('dtf', { s: 1, l: 1 })],
        extraLargePrintingQuantity: 1,
        extraLargePrintingPrice: 2000,
      }),
    ];

    const items = groupsToOrderItems(original);
    const restored = orderItemsToGroups(items);

    expect(restored).toHaveLength(1);
    expect(restored[0].product).toBe('반팔 티');
    expect(restored[0].price).toBe(15000);
    expect(restored[0].variants).toHaveLength(2);
    expect(restored[0].variants[0].quantity).toBe(3);
    expect(restored[0].variants[1].quantity).toBe(7);
    expect(restored[0].printings).toHaveLength(1);
    expect(restored[0].printings[0].printingOption).toBe('dtf');
    expect(restored[0].printings[0].smallPrintCount).toBe(1);
    expect(restored[0].printings[0].largePrintCount).toBe(1);
    expect(restored[0].extraLargePrintingQuantity).toBe(1);
    expect(restored[0].extraLargePrintingPrice).toBe(2000);
  });
});

// =============================================================================
// 4. calculateGroupsTotalQuantity
// =============================================================================
describe('calculateGroupsTotalQuantity', () => {
  it('여러 그룹의 variant 수량 합산', () => {
    const groups: ProductGroup[] = [
      makeGroup({
        variants: [
          { id: 'v1', quantity: 3, size: 'M', color: '흰색' },
          { id: 'v2', quantity: 5, size: 'L', color: '검정' },
        ],
      }),
      makeGroup({
        id: 'g2',
        variants: [
          { id: 'v3', quantity: 10, size: 'XL', color: '네이비' },
        ],
      }),
    ];
    expect(calculateGroupsTotalQuantity(groups)).toBe(18);
  });

  it('빈 그룹 배열이면 0', () => {
    expect(calculateGroupsTotalQuantity([])).toBe(0);
  });
});

// =============================================================================
// 5. calculateGroupSubtotal
// =============================================================================
describe('calculateGroupSubtotal', () => {
  it('프린팅 없는 그룹 소계 = 기본가 × 수량', () => {
    const group = makeGroup({
      price: 10000,
      variants: [
        { id: 'v1', quantity: 3, size: 'M', color: '흰색' },
        { id: 'v2', quantity: 2, size: 'L', color: '검정' },
      ],
    });
    // (10000 × 3) + (10000 × 2) = 50000
    expect(calculateGroupSubtotal(group, 5)).toBe(50000);
  });

  it('프린팅 있는 그룹 소계 = (기본가+프린팅) × 수량', () => {
    const group = makeGroup({
      price: 10000,
      variants: [
        { id: 'v1', quantity: 10, size: 'L', color: '검정' },
      ],
      printings: [makePrinting('dtf', { s: 1 })],
    });
    // totalQuantity=20으로 전달 → tier 10-29, DTF small=1800
    // (10000 + 1800) × 10 = 118000
    expect(calculateGroupSubtotal(group, 20)).toBe(118000);
  });
});

// =============================================================================
// 6. isLegacyOrder
// =============================================================================
describe('isLegacyOrder', () => {
  it('레거시 필드 사용 시 true', () => {
    const items: OrderItem[] = [
      {
        id: 'i1', product: '티셔츠', quantity: 1, size: 'L',
        color: '검정', price: 10000,
        smallPrintingQuantity: 1,
      },
    ];
    expect(isLegacyOrder(items)).toBe(true);
  });

  it('printingOption 사용 시 false', () => {
    const items: OrderItem[] = [
      {
        id: 'i1', product: '티셔츠', quantity: 1, size: 'L',
        color: '검정', price: 10000,
        printingOption: 'dtf',
        smallPrintCount: 1,
      },
    ];
    expect(isLegacyOrder(items)).toBe(false);
  });

  it('프린팅 없는 주문은 false', () => {
    const items: OrderItem[] = [
      {
        id: 'i1', product: '티셔츠', quantity: 1, size: 'L',
        color: '검정', price: 10000,
      },
    ];
    expect(isLegacyOrder(items)).toBe(false);
  });
});
