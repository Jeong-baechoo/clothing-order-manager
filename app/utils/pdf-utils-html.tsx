import { Order } from '../models/orderTypes';
import { calculateUnitPrice, calculateItemTotal } from './order-calculations';

// Generate HTML invoice based on the invoice.html template
export const generateInvoiceHTML = (order: Order): string => {
  // Calculate totals using the shared calculation logic
  const grandTotal = order.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  const vat = Math.round(grandTotal * 0.1);
  const totalWithVat = grandTotal + vat;
  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

  // 상품 개수에 따른 동적 간격 계산
  const itemCount = order.items.length;
  let rowPadding = '8px'; // 기본값
  let fontSize = '13px'; // 기본값

  if (itemCount > 20) {
    rowPadding = '2px';
    fontSize = '11px';
  } else if (itemCount > 15) {
    rowPadding = '3px';
    fontSize = '12px';
  } else if (itemCount > 10) {
    rowPadding = '5px';
    fontSize = '12px';
  }

  // Sort items: 상품명 > 색상 > 사이즈
  // 주문번호는 모든 아이템이 같은 주문에 속하므로 정렬 기준에서 제외
  const sortedItems = [...order.items].sort((a, b) => {
    // 1. 상품명 비교 - 자연 정렬 (숫자가 포함된 경우 올바르게 정렬)
    const productCompare = a.product.localeCompare(b.product, 'ko', { numeric: true });
    if (productCompare !== 0) return productCompare;
    
    // 2. 색상 비교
    const colorCompare = a.color.localeCompare(b.color, 'ko');
    if (colorCompare !== 0) return colorCompare;
    
    // 3. 사이즈 비교 - 사이즈 순서 정의
    const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
    const sizeIndexA = sizeOrder.indexOf(a.size);
    const sizeIndexB = sizeOrder.indexOf(b.size);
    
    // 정의된 사이즈가 아닌 경우 문자열 비교
    if (sizeIndexA === -1 && sizeIndexB === -1) {
      return a.size.localeCompare(b.size, 'ko', { numeric: true });
    }
    if (sizeIndexA === -1) return 1;
    if (sizeIndexB === -1) return -1;
    
    return sizeIndexA - sizeIndexB;
  });

  // Generate table rows
  let tableRows = '';

  // Add main order items
  sortedItems.forEach(item => {
    tableRows += `
      <div class="table-row">
        <div class="col-product">${item.product}</div>
        <div class="col-size">${item.size} / ${item.color}</div>
        <div class="col-quantity">${item.quantity}</div>
        <div class="col-price">${calculateUnitPrice(item).toLocaleString()}</div>
        <div class="col-amount">${calculateItemTotal(item).toLocaleString()}</div>
        <div class="col-remarks"></div>
      </div>
    `;
  });

  // Note: 프린팅과 디자인 비용은 이미 단가에 포함되어 있으므로 별도 행으로 표시하지 않음

  // 빈 행 추가 제거 - 반응형으로 자동 조절되도록 함

  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>견적서</title>
      <style>
        /* Reset and base styles */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", sans-serif;
          background-color: #ffffff;
          color: #000000;
          margin: 0;
          padding: 0;
        }

        /* A4 Container */
        .a4-container {
          width: 210mm;
          min-height: 297mm;
          margin: 0;
          padding: 15mm 10mm;
          background-color: #f9f9f9;
          position: relative;
          overflow: visible;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }

        /* Invoice container with padding inside A4 */
        #invoice-page {
          width: 100%;
          min-height: 100%;
          padding: 30mm 15mm;
          display: flex;
          flex-direction: column;
          background-color: #f9f9f9;
          box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.05);
          box-sizing: border-box;
          flex: 1;
        }

        /* Header */
        header {
          background-color: #1a1a1a;
          color: white;
          margin: -30mm -15mm 15mm -15mm;
          padding: 15mm 15mm 15mm 15mm;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          background-image:
            repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 255, 255, 0.03) 2px, rgba(255, 255, 255, 0.03) 4px),
            repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255, 255, 255, 0.03) 2px, rgba(255, 255, 255, 0.03) 4px);
        }

        header .logo {
          height: 66px;
          width: auto;
          object-fit: contain;
          /*left: 50%;*/
        }

        header .company-info {
          text-align: right;
          font-size: 12px;
          opacity: 0.9;
          line-height: 1.3;
          margin-left: auto;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        
        header .company-info p {
          margin: 0;
          padding: 5px 0;
          line-height: 1.5;
        }
        
        header .company-info p:first-child {
          padding-top: 7px;
        }
        
        header .company-info p:last-child {
          margin-bottom: 0;
          padding-bottom: 7px;
        }

        /* Main content */
        main {
          flex: 1 1 auto;
          display: flex;
          flex-direction: column;
          overflow: visible;
          min-height: 0;
        }

        /* Customer info section */
        .customer-section {
          margin-bottom: 8mm;
          border-top: 2.5px solid black;
          padding-top: 3mm;
        }

        .customer-section h2 {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 8px;
          margin-left: 5px;
          color: #000000;
        }

        .customer-info {
          font-size: 13px;
          line-height: 1.6;
          color: #000000;
        }

        .customer-info-row {
          padding: 5px;
          display: flex;
        }

        .customer-info-label {
          font-weight: bold;
          width: 70px;
          color: #000000;
        }

        .customer-info-value {
          padding-left: 16px;
          color: #000000;
        }


        /* Items table */
        .items-table {
          flex: 1 1 auto;
          overflow: visible;
          display: flex;
          flex-direction: column;
          min-height: 100px;
        }

        .table-header {
          display: flex;
          font-size: ${itemCount > 20 ? '12px' : itemCount > 15 ? '13px' : '14px'};
          font-weight: bold;
          text-align: center;
          padding: ${itemCount > 20 ? '3px 0' : '5px 0'};
          /* border-bottom: 1px solid #000; */
          color: #000000;
        }

        .table-body {
          font-size: ${fontSize};
          text-align: center;
          color: #000000;
          flex: 1 1 auto;
          display: flex;
          flex-direction: column;
          min-height: 50px;
        }

        .table-row {
          display: flex;
          min-height: ${itemCount > 20 ? '20px' : itemCount > 15 ? '22px' : '25px'};
          align-items: center;
          padding: ${rowPadding} 0;
          color: #000000;
          flex-shrink: 0;
        }
        
        .table-row:last-child {
          border-bottom: none;
        }

        .col-product {
          width: 25%;
          padding: 0 ${itemCount > 20 ? '2' : '4'}px;
          text-align: left;
        }

        .col-size {
          width: 20%;
          padding: 0 ${itemCount > 20 ? '2' : '4'}px;
        }

        .col-quantity {
          width: 10%;
          padding: 0 ${itemCount > 20 ? '2' : '4'}px;
        }

        .col-price {
          width: 15%;
          padding: 0 ${itemCount > 20 ? '2' : '4'}px;
        }

        .col-amount {
          width: 15%;
          padding: 0 ${itemCount > 20 ? '2' : '4'}px;
        }

        .col-remarks {
          width: 15%;
          padding: 0 ${itemCount > 20 ? '2' : '4'}px;
        }

        /* Footer */
        footer {
          margin-top: 20px;
          padding-top: 5mm;
          flex-shrink: 0;
        }

        /* Final summary */
        .final-summary {
          border-top: 2.5px solid black;
          border-bottom: 2.5px solid black;
          padding: ${itemCount > 20 ? '8px 0' : '12px 0'};
          display: flex;
          justify-content: space-between;
          align-items: stretch;
          min-height: ${itemCount > 20 ? '60px' : '80px'};
        }

        .notes-ea-container {
          font-size: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 45%;
          color: #000000;
        }

        .price-summary {
          width: 45%;
          font-size: 12px;
          background-color: #f5f5f5;
          border-radius: 4px;
          color: #000000;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 12px;
          gap: 8px;
        }

        .price-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 0;
          padding: 0;
          color: #000000;
        }

        .price-row.total {
          margin: 0;
          padding: 0;
          /*padding-top: 8px;*/
          /*border-top: 1px solid #ddd;*/
          font-weight: bold;
        }

        .price-value {
          width: 90px;
          text-align: right;
          color: #000000;
        }

        /* Page number */
        .page-number {
          position: absolute;
          bottom: 10mm;
          right: 10mm;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="a4-container">
        <div id="invoice-page">
          <!-- Header Section -->
          <header>
            <img src="/images/caelum-logo-white.png" alt="CAELUM" class="logo" />
            <div class="company-info">
              <p>커스텀 팀 웨어 제작업체</p>
              <p>사업자 등록번호 279-32-01590</p>
              <p>157-211939-04-011 기업은행 정의영(케룸)</p>
            </div>
          </header>

          <!-- Main Body Section -->
          <main>
            <!-- Customer Info Section -->
            <section class="customer-section">
              <h2>INVOICE</h2>
              <div class="customer-info">
                <div class="customer-info-row">
                  <span class="customer-info-label">NAME</span>
                  <span class="customer-info-value">${order.customerName}</span>
                </div>
                <div class="customer-info-row">
                  <span class="customer-info-label">PHONE</span>
                  <span class="customer-info-value">${order.phone}</span>
                </div>
                <div class="customer-info-row">
                  <span class="customer-info-label">ADRESS</span>
                  <span class="customer-info-value">${order.address}</span>
                </div>
              </div>
            </section>


            <!-- Items Table -->
            <section class="items-table">
              <!-- Table Header -->
              <div class="table-header">
                <div class="col-product">품명</div>
                <div class="col-size">사이즈</div>
                <div class="col-quantity">수량</div>
                <div class="col-price">단가</div>
                <div class="col-amount">금액</div>
                <div class="col-remarks">비고</div>
              </div>
              <!-- Table Body -->
              <div class="table-body">
                ${tableRows}
              </div>
            </section>
          </main>

          <!-- Footer Section -->
          <footer>
            <!-- Final Summary Section -->
            <section class="final-summary">
              <div class="notes-ea-container">
                <span style="font-weight: bold;">NOTES</span>
                <span>${totalQuantity} EA</span>
              </div>
              <div class="price-summary">
                <div class="price-row">
                  <span>TOTAL</span>
                  <span class="price-value">${grandTotal.toLocaleString()}</span>
                </div>
                <div class="price-row">
                  <span>VAT</span>
                  <span class="price-value">${vat.toLocaleString()}</span>
                </div>
                <div class="price-row total">
                  <span>TOTAL + VAT</span>
                  <span class="price-value">${totalWithVat.toLocaleString()}</span>
                </div>
              </div>
            </section>

            <!-- Page Number -->
            <div class="page-number">
              <p>1</p>
            </div>
          </footer>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Generate PDF from HTML invoice
export const generateHTMLPDF = async (order: Order, preview: boolean = false): Promise<void> => {
  try {
    // Dynamically import html2pdf to avoid SSR issues
    const html2pdfModule = await import('html2pdf.js');
    const html2pdf = html2pdfModule.default;

    // Generate the HTML content
    const htmlContent = generateInvoiceHTML(order);

    // Create a temporary container
    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = '210mm';
    container.style.height = '297mm';
    container.style.overflow = 'hidden';
    container.style.zIndex = '-9999';
    container.style.background = 'white';
    document.body.appendChild(container);

    // Get the A4 container element
    const element = container.querySelector('.a4-container') as HTMLElement;

    if (!element) {
      throw new Error('Invoice element not found');
    }

    // PDF options - 정확한 A4 크기 설정
    const options = {
      margin: 0,
      filename: `${order.customerName}_주문서.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        letterRendering: true,
        windowWidth: 794,
        windowHeight: 1123,
        width: 794,
        height: 1123,
        scrollY: 0,
        scrollX: 0,
        backgroundColor: '#ffffff'
      },
      jsPDF: {
        unit: 'pt' as const,
        format: [595, 842], // A4 size in points
        orientation: 'portrait' as const,
        compress: true
      },
      pagebreak: { mode: 'avoid-all', before: '.page-break' }
    };

    // Generate PDF
    const pdfWorker = html2pdf()
      .set(options)
      .from(element);

    if (preview) {
      // Generate blob and open in new tab for preview
      const blob = await pdfWorker.output('blob') as Blob;
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');

      // Clean up blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } else {
      // Download directly
      await pdfWorker.save();
    }

    // Clean up
    document.body.removeChild(container);
  } catch (error) {
    console.error('Error generating HTML PDF:', error);
    throw error;
  }
};
