import { describe, it, expect } from 'vitest';
import { generateInvoiceHTML } from '../app/utils/pdf-utils-html';
import { Order, OrderItem, PrintingConfig } from '../app/models/orderTypes';

// =============================================================================
// 헬퍼
// =============================================================================
const makeOrder = (overrides: Partial<Order> = {}): Order => ({
  id: 'ORD-TEST',
  customerName: '테스트 고객',
  phone: '010-1234-5678',
  address: '서울시 강남구',
  status: 'pending',
  orderDate: '2026-04-08',
  paymentMethod: '무통장입금',
  items: [],
  totalPrice: 0,
  shippingFee: 0,
  ...overrides,
});

const makeItem = (overrides: Partial<OrderItem> = {}): OrderItem => ({
  id: 'item-1',
  product: '기본 티셔츠',
  quantity: 1,
  size: 'L',
  color: '검정',
  price: 10000,
  ...overrides,
});

/**
 * HTML에서 특정 값이 포함되어 있는지 확인하는 헬퍼
 * toLocaleString()은 환경에 따라 콤마/마침표가 다를 수 있으므로
 * 숫자를 직접 포맷해서 검색
 */
const formatNumber = (n: number) => n.toLocaleString();

// =============================================================================
// 1. 기본 고객 정보 렌더링
// =============================================================================
describe('인보이스: 고객 정보 렌더링', () => {
  it('고객명, 전화번호, 주소가 출력됨', () => {
    const order = makeOrder({
      customerName: '김철수',
      phone: '010-9999-8888',
      address: '부산시 해운대구',
      items: [makeItem()],
    });
    const html = generateInvoiceHTML(order);
    expect(html).toContain('김철수');
    expect(html).toContain('010-9999-8888');
    expect(html).toContain('부산시 해운대구');
  });
});

// =============================================================================
// 2. 프린팅 없는 주문 → 인보이스 단가/금액
// =============================================================================
describe('인보이스: 프린팅 없는 주문', () => {
  it('기본가 10,000 × 5장 → 단가 10,000 / 금액 50,000', () => {
    const order = makeOrder({
      items: [makeItem({ quantity: 5, price: 10000 })],
    });
    const html = generateInvoiceHTML(order);
    // 단가 열에 10,000 존재
    expect(html).toContain(`>${formatNumber(10000)}<`);
    // 금액 열에 50,000 존재
    expect(html).toContain(`>${formatNumber(50000)}<`);
  });
});

// =============================================================================
// 3. 단일 프린팅 → 인보이스 단가 포함 확인
// =============================================================================
describe('인보이스: 단일 프린팅 주문', () => {
  it('DTF small 1개, 5장 → 단가 12,000 / 금액 60,000', () => {
    const order = makeOrder({
      items: [
        makeItem({
          quantity: 5,
          price: 10000,
          printingOption: 'dtf',
          smallPrintCount: 1,
        }),
      ],
    });
    const html = generateInvoiceHTML(order);
    // 단가: 10000 + 2000 = 12000
    expect(html).toContain(`>${formatNumber(12000)}<`);
    // 금액: 12000 × 5 = 60000
    expect(html).toContain(`>${formatNumber(60000)}<`);
  });
});

// =============================================================================
// 4. 복수 프린팅 → 인보이스 단가 포함 확인
// =============================================================================
describe('인보이스: 복수 프린팅 주문', () => {
  it('DTF small 1 + 반사DTF medium 1, 5장 → 단가 17,500 / 금액 87,500', () => {
    const configs: PrintingConfig[] = [
      {
        id: 'p1', printingOption: 'dtf',
        smallPrintCount: 1, mediumPrintCount: 0,
        largePrintCount: 0, extraLargePrintCount: 0,
      },
      {
        id: 'p2', printingOption: 'reflective_dtf',
        smallPrintCount: 0, mediumPrintCount: 1,
        largePrintCount: 0, extraLargePrintCount: 0,
      },
    ];
    const order = makeOrder({
      items: [
        makeItem({
          quantity: 5,
          price: 10000,
          printingConfigs: configs,
        }),
      ],
    });
    const html = generateInvoiceHTML(order);
    // 단가: 10000 + 2000 + 5500 = 17500
    expect(html).toContain(`>${formatNumber(17500)}<`);
    // 금액: 17500 × 5 = 87500
    expect(html).toContain(`>${formatNumber(87500)}<`);
  });
});

// =============================================================================
// 5. 배송비 표시
// =============================================================================
describe('인보이스: 배송비', () => {
  it('배송비 3,500원이 별도 행으로 표시됨', () => {
    const order = makeOrder({
      items: [makeItem({ quantity: 2, price: 10000 })],
      shippingFee: 3500,
    });
    const html = generateInvoiceHTML(order);
    expect(html).toContain('배송비');
    expect(html).toContain(`>${formatNumber(3500)}<`);
  });

  it('배송비 0이면 배송비 행 없음', () => {
    const order = makeOrder({
      items: [makeItem({ quantity: 2, price: 10000 })],
      shippingFee: 0,
    });
    const html = generateInvoiceHTML(order);
    expect(html).not.toContain('배송비');
  });
});

// =============================================================================
// 6. TOTAL / VAT / TOTAL+VAT 계산
// =============================================================================
describe('인보이스: 합계 / VAT 계산', () => {
  it('아이템 50,000 + 배송비 3,500 → TOTAL 53,500, VAT 5,350, TOTAL+VAT 58,850', () => {
    const order = makeOrder({
      items: [makeItem({ quantity: 5, price: 10000 })],
      shippingFee: 3500,
    });
    const html = generateInvoiceHTML(order);
    const grandTotal = 50000 + 3500;
    const vat = Math.round(grandTotal * 0.1);
    const totalWithVat = grandTotal + vat;

    expect(html).toContain(`>${formatNumber(grandTotal)}<`);
    expect(html).toContain(`>${formatNumber(vat)}<`);
    expect(html).toContain(`>${formatNumber(totalWithVat)}<`);
  });

  it('프린팅 포함 총액에 VAT 10% 적용', () => {
    const order = makeOrder({
      items: [
        makeItem({
          quantity: 10,
          price: 10000,
          printingConfigs: [
            {
              id: 'p1', printingOption: 'dtf',
              smallPrintCount: 1, mediumPrintCount: 0,
              largePrintCount: 0, extraLargePrintCount: 0,
            },
          ],
        }),
      ],
      shippingFee: 0,
    });
    const html = generateInvoiceHTML(order);
    // totalQty=10 → tier 10-29, DTF small=1800
    // unitPrice = 10000+1800 = 11800
    // itemsTotal = 11800×10 = 118000
    // grandTotal = 118000, VAT = 11800, total+vat = 129800
    expect(html).toContain(`>${formatNumber(118000)}<`);
    expect(html).toContain(`>${formatNumber(11800)}<`);
    expect(html).toContain(`>${formatNumber(129800)}<`);
  });
});

// =============================================================================
// 7. EA 수량 표시
// =============================================================================
describe('인보이스: EA 수량', () => {
  it('총 수량이 EA로 표시됨', () => {
    const order = makeOrder({
      items: [
        makeItem({ quantity: 3 }),
        makeItem({ id: 'i2', quantity: 7 }),
      ],
    });
    const html = generateInvoiceHTML(order);
    expect(html).toContain('10 EA');
  });
});

// =============================================================================
// 8. 상품명/사이즈/색상/비고 표시
// =============================================================================
describe('인보이스: 상품 정보 표시', () => {
  it('상품명, 사이즈/색상, 비고가 올바르게 표시됨', () => {
    const order = makeOrder({
      items: [
        makeItem({
          product: '프리미엄 후드',
          size: 'XL',
          color: '네이비',
          remarks: '앞면 자수',
        }),
      ],
    });
    const html = generateInvoiceHTML(order);
    expect(html).toContain('프리미엄 후드');
    expect(html).toContain('XL / 네이비');
    expect(html).toContain('앞면 자수');
  });

  it('비고 없으면 빈 문자열', () => {
    const order = makeOrder({
      items: [makeItem({ remarks: undefined })],
    });
    const html = generateInvoiceHTML(order);
    // col-remarks 영역에 빈 값
    expect(html).toMatch(/col-remarks">\s*<\/div>/);
  });
});

// =============================================================================
// 9. 복합 시나리오: 여러 아이템 + 프린팅 + 배송비
// =============================================================================
describe('인보이스: 복합 시나리오', () => {
  it('2개 아이템 + 복수프린팅 + 배송비 → 모든 값 정확', () => {
    const configs: PrintingConfig[] = [
      {
        id: 'p1', printingOption: 'dtf',
        smallPrintCount: 1, mediumPrintCount: 0,
        largePrintCount: 0, extraLargePrintCount: 0,
      },
    ];

    const order = makeOrder({
      items: [
        makeItem({
          id: 'i1',
          product: '티셔츠A',
          quantity: 20,
          price: 8000,
          size: 'M',
          color: '흰색',
          printingConfigs: configs,
        }),
        makeItem({
          id: 'i2',
          product: '티셔츠B',
          quantity: 10,
          price: 12000,
          size: 'L',
          color: '검정',
        }),
      ],
      shippingFee: 3500,
    });

    const html = generateInvoiceHTML(order);

    // totalQty = 30 → tier 30-49
    // item1: DTF small at 30-49 = 1500 → unitPrice = 8000+1500 = 9500
    //   total = 9500 × 20 = 190000
    // item2: no printing → unitPrice = 12000
    //   total = 12000 × 10 = 120000
    // itemsTotal = 310000
    // grandTotal = 310000 + 3500 = 313500
    // VAT = 31350
    // totalWithVat = 344850

    // 아이템1 단가
    expect(html).toContain(`>${formatNumber(9500)}<`);
    // 아이템1 금액
    expect(html).toContain(`>${formatNumber(190000)}<`);
    // 아이템2 금액
    expect(html).toContain(`>${formatNumber(120000)}<`);
    // EA
    expect(html).toContain('30 EA');
    // TOTAL
    expect(html).toContain(`>${formatNumber(313500)}<`);
    // VAT
    expect(html).toContain(`>${formatNumber(31350)}<`);
    // TOTAL + VAT
    expect(html).toContain(`>${formatNumber(344850)}<`);
  });
});

// =============================================================================
// 10. 수량 구간 경계에서 인보이스 단가 정확성
// =============================================================================
describe('인보이스: 수량 구간 경계 정확성', () => {
  it('9장 주문(1-9구간) vs 10장 주문(10-29구간) 단가 차이', () => {
    const makePrintOrder = (qty: number) => makeOrder({
      items: [
        makeItem({
          quantity: qty,
          price: 10000,
          printingConfigs: [
            {
              id: 'p1', printingOption: 'dtf',
              smallPrintCount: 1, mediumPrintCount: 0,
              largePrintCount: 0, extraLargePrintCount: 0,
            },
          ],
        }),
      ],
    });

    const html9 = generateInvoiceHTML(makePrintOrder(9));
    const html10 = generateInvoiceHTML(makePrintOrder(10));

    // 9장: DTF small 1-9 = 2000 → 단가 12000
    expect(html9).toContain(`>${formatNumber(12000)}<`);
    // 10장: DTF small 10-29 = 1800 → 단가 11800
    expect(html10).toContain(`>${formatNumber(11800)}<`);
  });
});

// =============================================================================
// 11. 동적 폰트 크기 적용
// =============================================================================
describe('인보이스: 동적 폰트 크기', () => {
  const makeOrderWithNItems = (n: number) => makeOrder({
    items: Array.from({ length: n }, (_, i) =>
      makeItem({ id: `item-${i}`, quantity: 1 })
    ),
  });

  it('10개 이하 → 기본 13px', () => {
    const html = generateInvoiceHTML(makeOrderWithNItems(10));
    expect(html).toContain('font-size: 13px');
  });

  it('11-15개 → 12px', () => {
    const html = generateInvoiceHTML(makeOrderWithNItems(12));
    expect(html).toContain('font-size: 12px');
  });

  it('16-20개 → 11px', () => {
    const html = generateInvoiceHTML(makeOrderWithNItems(18));
    expect(html).toContain('font-size: 11px');
  });

  it('21-25개 → 10px', () => {
    const html = generateInvoiceHTML(makeOrderWithNItems(22));
    expect(html).toContain('font-size: 10px');
  });

  it('26개 이상 → 9px', () => {
    const html = generateInvoiceHTML(makeOrderWithNItems(30));
    expect(html).toContain('font-size: 9px');
  });
});
