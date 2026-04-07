import { describe, it, expect } from 'vitest';
import {
  calculateUnitPrice,
  calculateItemTotal,
  calculateTotalPrice,
} from '../app/utils/order-calculations';
import {
  getPrintingUnitPrice,
  getQuantityTier,
  OrderItem,
  PrintingConfig,
} from '../app/models/orderTypes';

// =============================================================================
// 헬퍼: 기본 OrderItem 생성
// =============================================================================
const makeItem = (overrides: Partial<OrderItem> = {}): OrderItem => ({
  id: 'test-item',
  product: '기본 티셔츠',
  quantity: 1,
  size: 'L',
  color: '검정',
  price: 10000,
  ...overrides,
});

// =============================================================================
// 1. 가격 매트릭스 기본 동작
// =============================================================================
describe('가격 매트릭스 기본 동작', () => {
  it('수량 구간이 올바르게 결정된다', () => {
    expect(getQuantityTier(1)).toBe('1-9');
    expect(getQuantityTier(9)).toBe('1-9');
    expect(getQuantityTier(10)).toBe('10-29');
    expect(getQuantityTier(29)).toBe('10-29');
    expect(getQuantityTier(30)).toBe('30-49');
    expect(getQuantityTier(49)).toBe('30-49');
    expect(getQuantityTier(50)).toBe('50+');
    expect(getQuantityTier(100)).toBe('50+');
  });

  it('DTF small, 1-9 구간 = 2000원', () => {
    expect(getPrintingUnitPrice('dtf', 'small', 5)).toBe(2000);
  });

  it('DTF medium, 10-29 구간 = 3200원', () => {
    expect(getPrintingUnitPrice('dtf', 'medium', 15)).toBe(3200);
  });

  it('반사 DTF extraLarge, 50+ 구간 = 7500원', () => {
    expect(getPrintingUnitPrice('reflective_dtf', 'extraLarge', 60)).toBe(7500);
  });

  it('리무버는 수량 구간 관계없이 동일 가격', () => {
    expect(getPrintingUnitPrice('remover', 'large', 1)).toBe(14000);
    expect(getPrintingUnitPrice('remover', 'large', 50)).toBe(14000);
  });
});

// =============================================================================
// 2. 프린팅 없는 주문 (기본가만)
// =============================================================================
describe('케이스 1: 프린팅 없는 주문', () => {
  it('기본가 10,000원 × 5장 = 50,000원', () => {
    const item = makeItem({ quantity: 5, price: 10000 });
    expect(calculateUnitPrice(item, 5)).toBe(10000);
    expect(calculateItemTotal(item, 5)).toBe(50000);
  });

  it('기본가 0원이면 단가 0원', () => {
    const item = makeItem({ quantity: 3, price: 0 });
    expect(calculateUnitPrice(item, 3)).toBe(0);
    expect(calculateItemTotal(item, 3)).toBe(0);
  });
});

// =============================================================================
// 3. 단일 프린팅 주문 (printingOption 방식)
// =============================================================================
describe('케이스 2: 단일 프린팅 주문', () => {
  it('DTF small 1개, 총수량 5장 → 기본가 + 2000', () => {
    const item = makeItem({
      quantity: 5,
      price: 10000,
      printingOption: 'dtf',
      smallPrintCount: 1,
    });
    // DTF small at tier 1-9 = 2000
    expect(calculateUnitPrice(item, 5)).toBe(12000);
    expect(calculateItemTotal(item, 5)).toBe(60000);
  });

  it('DTF small 1 + large 1, 총수량 15장 → 기본가 + 1800 + 4500', () => {
    const item = makeItem({
      quantity: 15,
      price: 8000,
      printingOption: 'dtf',
      smallPrintCount: 1,
      largePrintCount: 1,
    });
    // tier 10-29: small=1800, large=4500
    expect(calculateUnitPrice(item, 15)).toBe(8000 + 1800 + 4500);
    expect(calculateItemTotal(item, 15)).toBe((8000 + 1800 + 4500) * 15);
  });

  it('printingOption 있지만 카운트 모두 0이면 프린팅 비용 없음', () => {
    const item = makeItem({
      quantity: 10,
      price: 5000,
      printingOption: 'dtf',
      smallPrintCount: 0,
      mediumPrintCount: 0,
      largePrintCount: 0,
      extraLargePrintCount: 0,
    });
    expect(calculateUnitPrice(item, 10)).toBe(5000);
  });

  it('개별작업(individual) medium 2개, 50+ 구간 → 기본가 + 3700×2', () => {
    const item = makeItem({
      quantity: 50,
      price: 15000,
      printingOption: 'individual',
      mediumPrintCount: 2,
    });
    // individual medium at 50+ = 3700
    expect(calculateUnitPrice(item, 50)).toBe(15000 + 3700 * 2);
  });
});

// =============================================================================
// 4. 복수 프린팅 주문 (printingConfigs JSON 방식)
// =============================================================================
describe('케이스 3: 복수 프린팅 주문', () => {
  it('DTF small 1 + 반사DTF medium 1, 총수량 5장', () => {
    const configs: PrintingConfig[] = [
      {
        id: 'p1',
        printingOption: 'dtf',
        smallPrintCount: 1,
        mediumPrintCount: 0,
        largePrintCount: 0,
        extraLargePrintCount: 0,
      },
      {
        id: 'p2',
        printingOption: 'reflective_dtf',
        smallPrintCount: 0,
        mediumPrintCount: 1,
        largePrintCount: 0,
        extraLargePrintCount: 0,
      },
    ];
    const item = makeItem({
      quantity: 5,
      price: 10000,
      printingConfigs: configs,
    });
    // DTF small at 1-9 = 2000, reflective_dtf medium at 1-9 = 5500
    expect(calculateUnitPrice(item, 5)).toBe(10000 + 2000 + 5500);
    expect(calculateItemTotal(item, 5)).toBe((10000 + 2000 + 5500) * 5);
  });

  it('같은 옵션 2개 프린팅 (DTF small 1 앞면 + DTF small 1 뒷면)', () => {
    const configs: PrintingConfig[] = [
      {
        id: 'front',
        printingOption: 'dtf',
        smallPrintCount: 1,
        mediumPrintCount: 0,
        largePrintCount: 0,
        extraLargePrintCount: 0,
      },
      {
        id: 'back',
        printingOption: 'dtf',
        smallPrintCount: 1,
        mediumPrintCount: 0,
        largePrintCount: 0,
        extraLargePrintCount: 0,
      },
    ];
    const item = makeItem({
      quantity: 30,
      price: 12000,
      printingConfigs: configs,
    });
    // DTF small at 30-49 = 1500 × 2 configs
    expect(calculateUnitPrice(item, 30)).toBe(12000 + 1500 + 1500);
  });

  it('복수 프린팅 + 개별단가 추가', () => {
    const configs: PrintingConfig[] = [
      {
        id: 'p1',
        printingOption: 'dtf',
        smallPrintCount: 1,
        mediumPrintCount: 0,
        largePrintCount: 0,
        extraLargePrintCount: 0,
      },
    ];
    const item = makeItem({
      quantity: 10,
      price: 10000,
      printingConfigs: configs,
      extraLargePrintingQuantity: 1,
      extraLargePrintingPrice: 5000,
    });
    // DTF small at 10-29 = 1800, custom = 1×5000
    expect(calculateUnitPrice(item, 10)).toBe(10000 + 1800 + 5000);
  });

  it('빈 printingConfigs 배열이면 프린팅 비용 없음', () => {
    const item = makeItem({
      quantity: 5,
      price: 10000,
      printingConfigs: [],
    });
    expect(calculateUnitPrice(item, 5)).toBe(10000);
  });
});

// =============================================================================
// 5. 레거시 프린팅 주문
// =============================================================================
describe('케이스 4: 레거시 프린팅 주문', () => {
  it('소형 1개 = 1500원 추가', () => {
    const item = makeItem({
      quantity: 2,
      price: 15000,
      smallPrintingQuantity: 1,
      largePrintingQuantity: 0,
      extraLargePrintingQuantity: 0,
      extraLargePrintingPrice: 0,
    });
    expect(calculateUnitPrice(item, 2)).toBe(15000 + 1500);
  });

  it('소형 1 + 대형 2 + 특대 1(5000원) + 디자인 1(15000원)', () => {
    const item = makeItem({
      quantity: 1,
      price: 35000,
      smallPrintingQuantity: 0,
      largePrintingQuantity: 2,
      extraLargePrintingQuantity: 1,
      extraLargePrintingPrice: 5000,
      designWorkQuantity: 1,
      designWorkPrice: 15000,
    });
    // 대형 2×3000 + 특대 1×5000 + 디자인 1×15000 = 6000 + 5000 + 15000 = 26000
    expect(calculateUnitPrice(item, 1)).toBe(35000 + 26000);
  });

  it('레거시는 개별단가가 이미 포함되어 별도 추가 안됨', () => {
    // 레거시 경로에서 extraLargePrintingQuantity/Price는 이미 calculateLegacyPrintingCost에서 처리됨
    // calculateUnitPrice에서 early return하므로 중복 계산 없어야 함
    const item = makeItem({
      quantity: 1,
      price: 10000,
      smallPrintingQuantity: 1,
      largePrintingQuantity: 0,
      extraLargePrintingQuantity: 2,
      extraLargePrintingPrice: 3000,
    });
    // legacy: 소형 1×1500 + 특대 2×3000 = 1500 + 6000 = 7500
    expect(calculateUnitPrice(item, 1)).toBe(10000 + 7500);
  });
});

// =============================================================================
// 6. 수량 구간별 단가 변동 검증
// =============================================================================
describe('케이스 5: 수량 구간별 단가 변동', () => {
  const makeItemWithDtfSmall = (totalQty: number) =>
    makeItem({
      quantity: totalQty,
      price: 10000,
      printingConfigs: [
        {
          id: 'p1',
          printingOption: 'dtf',
          smallPrintCount: 1,
          mediumPrintCount: 0,
          largePrintCount: 0,
          extraLargePrintCount: 0,
        },
      ],
    });

  it('1-9 구간: DTF small = 2000', () => {
    expect(calculateUnitPrice(makeItemWithDtfSmall(5), 5)).toBe(12000);
  });

  it('10-29 구간: DTF small = 1800', () => {
    expect(calculateUnitPrice(makeItemWithDtfSmall(15), 15)).toBe(11800);
  });

  it('30-49 구간: DTF small = 1500', () => {
    expect(calculateUnitPrice(makeItemWithDtfSmall(35), 35)).toBe(11500);
  });

  it('50+ 구간: DTF small = 1300', () => {
    expect(calculateUnitPrice(makeItemWithDtfSmall(60), 60)).toBe(11300);
  });

  it('수량 경계값: 9→10 전환 시 단가 변동', () => {
    const price9 = calculateUnitPrice(makeItemWithDtfSmall(9), 9);
    const price10 = calculateUnitPrice(makeItemWithDtfSmall(10), 10);
    expect(price9).toBe(12000); // 1-9 구간
    expect(price10).toBe(11800); // 10-29 구간
    expect(price10).toBeLessThan(price9);
  });
});

// =============================================================================
// 7. calculateTotalPrice (여러 아이템 합산)
// =============================================================================
describe('케이스 6: 전체 주문 총액 계산', () => {
  it('프린팅 없는 2개 아이템 합산', () => {
    const items: OrderItem[] = [
      makeItem({ quantity: 3, price: 10000 }),
      makeItem({ id: 'item-2', quantity: 2, price: 20000 }),
    ];
    // total qty = 5, no printing
    // 3×10000 + 2×20000 = 30000 + 40000 = 70000
    expect(calculateTotalPrice(items)).toBe(70000);
  });

  it('혼합: 프린팅 있는 아이템 + 없는 아이템', () => {
    const items: OrderItem[] = [
      makeItem({
        quantity: 10,
        price: 10000,
        printingConfigs: [
          {
            id: 'p1',
            printingOption: 'dtf',
            smallPrintCount: 1,
            mediumPrintCount: 0,
            largePrintCount: 0,
            extraLargePrintCount: 0,
          },
        ],
      }),
      makeItem({ id: 'item-2', quantity: 10, price: 5000 }),
    ];
    // total qty = 20 → tier 10-29
    // item1: (10000 + 1800) × 10 = 118000
    // item2: 5000 × 10 = 50000
    expect(calculateTotalPrice(items)).toBe(168000);
  });

  it('totalQuantity가 전체 주문 기준으로 구간 결정됨을 검증', () => {
    // 아이템 각각 5개씩이면 totalQty=10 → 10-29 구간
    const items: OrderItem[] = [
      makeItem({
        quantity: 5,
        price: 10000,
        printingConfigs: [
          {
            id: 'p1',
            printingOption: 'dtf',
            smallPrintCount: 1,
            mediumPrintCount: 0,
            largePrintCount: 0,
            extraLargePrintCount: 0,
          },
        ],
      }),
      makeItem({
        id: 'item-2',
        quantity: 5,
        price: 10000,
        printingConfigs: [
          {
            id: 'p2',
            printingOption: 'dtf',
            smallPrintCount: 1,
            mediumPrintCount: 0,
            largePrintCount: 0,
            extraLargePrintCount: 0,
          },
        ],
      }),
    ];
    // total qty = 10 → tier 10-29, DTF small = 1800
    // each item: (10000 + 1800) × 5 = 59000
    // total: 59000 × 2 = 118000
    expect(calculateTotalPrice(items)).toBe(118000);
  });

  it('빈 아이템 배열이면 0원', () => {
    expect(calculateTotalPrice([])).toBe(0);
  });
});

// =============================================================================
// 8. 개별단가(커스텀 가격) 단독 사용
// =============================================================================
describe('케이스 7: 개별단가(커스텀 가격)', () => {
  it('프린팅 없이 개별단가만 → 기본가 + 커스텀', () => {
    const item = makeItem({
      quantity: 5,
      price: 10000,
      extraLargePrintingQuantity: 1,
      extraLargePrintingPrice: 3000,
    });
    // 프린팅 없음 (no printingConfigs, no printingOption, no legacy fields)
    // 하지만 extraLargePrintingQuantity>0 → 레거시 경로 진입?
    // calculateUnitPrice: line 80 조건 확인
    // (item.extraLargePrintingQuantity ?? 0) > 0 → true → 레거시 경로
    // legacy: extraLarge 1×3000 = 3000
    expect(calculateUnitPrice(item, 5)).toBe(13000);
  });

  it('복수 프린팅 + 개별단가 2건', () => {
    const configs: PrintingConfig[] = [
      {
        id: 'p1',
        printingOption: 'dtf',
        smallPrintCount: 1,
        mediumPrintCount: 0,
        largePrintCount: 0,
        extraLargePrintCount: 0,
      },
    ];
    const item = makeItem({
      quantity: 10,
      price: 8000,
      printingConfigs: configs,
      extraLargePrintingQuantity: 2,
      extraLargePrintingPrice: 4000,
    });
    // DTF small at 10-29 = 1800
    // custom: 2×4000 = 8000
    expect(calculateUnitPrice(item, 10)).toBe(8000 + 1800 + 8000);
  });
});

// =============================================================================
// 9. 엣지 케이스
// =============================================================================
describe('엣지 케이스', () => {
  it('quantity가 0이면 itemTotal = 0', () => {
    const item = makeItem({ quantity: 0, price: 10000 });
    expect(calculateItemTotal(item, 5)).toBe(0);
  });

  it('음수 quantity는 0으로 처리', () => {
    const item = makeItem({ quantity: -5, price: 10000 });
    expect(calculateItemTotal(item, 5)).toBe(0);
  });

  it('음수 price는 0으로 처리', () => {
    const item = makeItem({ quantity: 5, price: -1000 });
    expect(calculateUnitPrice(item, 5)).toBe(0);
  });

  it('totalQuantity 미제공 시 item.quantity 사용', () => {
    const item = makeItem({
      quantity: 25,
      price: 10000,
      printingConfigs: [
        {
          id: 'p1',
          printingOption: 'dtf',
          smallPrintCount: 1,
          mediumPrintCount: 0,
          largePrintCount: 0,
          extraLargePrintCount: 0,
        },
      ],
    });
    // totalQuantity = undefined → qty = max(1, 25) = 25 → tier 10-29
    // DTF small = 1800
    expect(calculateUnitPrice(item)).toBe(11800);
  });

  it('프린팅 카운트가 문자열이어도 Number 변환됨', () => {
    const item = makeItem({
      quantity: 5,
      price: 10000,
      printingConfigs: [
        {
          id: 'p1',
          printingOption: 'dtf',
          smallPrintCount: '2' as unknown as number,
          mediumPrintCount: 0,
          largePrintCount: 0,
          extraLargePrintCount: 0,
        },
      ],
    });
    // DTF small at 1-9 = 2000 × 2 = 4000
    expect(calculateUnitPrice(item, 5)).toBe(14000);
  });
});
