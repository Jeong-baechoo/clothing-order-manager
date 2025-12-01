import { Order } from '../models/orderTypes';
import { calculateUnitPrice, calculateItemTotal } from './order-calculations';

// Generate HTML invoice based on the invoice.html template
export const generateInvoiceHTML = (order: Order): string => {
  console.log('generateInvoiceHTML - order:', order); // 디버깅용
  console.log('generateInvoiceHTML - shippingFee:', order.shippingFee); // 디버깅용

  // Calculate totals using the shared calculation logic
  const itemsTotal = order.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  const shippingFee = Number(order.shippingFee) || 0;
  const grandTotal = itemsTotal + shippingFee;
  const vat = Math.round(grandTotal * 0.1);
  const totalWithVat = grandTotal + vat;
  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

  // 상품 개수에 따른 동적 간격 계산 (단일 페이지 최적화)
  const itemCount = order.items.length;
  let rowPadding = '8px'; // 기본값
  let fontSize = '13px'; // 기본값

  if (itemCount > 25) {
    rowPadding = '1px';
    fontSize = '9px';
  } else if (itemCount > 20) {
    rowPadding = '2px';
    fontSize = '10px';
  } else if (itemCount > 15) {
    rowPadding = '3px';
    fontSize = '11px';
  } else if (itemCount > 10) {
    rowPadding = '4px';
    fontSize = '12px';
  }

  // 정렬하지 않고 원래 순서대로 사용
  const sortedItems = order.items;

  // Generate table rows (단순한 단일 페이지 구조)
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
        <div class="col-remarks">${item.remarks || ''}</div>
      </div>
    `;
  });

  // Add shipping fee row if exists and is greater than 0
  if (shippingFee && shippingFee > 0) {
    tableRows += `
      <div class="table-row">
        <div class="col-product">배송비</div>
        <div class="col-size">-</div>
        <div class="col-quantity">1</div>
        <div class="col-price">${shippingFee.toLocaleString()}</div>
        <div class="col-amount">${shippingFee.toLocaleString()}</div>
        <div class="col-remarks">-</div>
      </div>
    `;
  }

  // 헤더 폰트 크기 계산
  const headerFontSize = fontSize === '9px' ? '10px' : fontSize === '10px' ? '11px' : fontSize === '11px' ? '12px' : '14px';
  const headerPadding = rowPadding === '1px' ? '2px 0' : rowPadding === '2px' ? '3px 0' : '5px 0';
  const rowMinHeight = fontSize === '9px' ? '16px' : fontSize === '10px' ? '18px' : fontSize === '11px' ? '20px' : '25px';
  const colPadding = fontSize === '9px' || fontSize === '10px' ? '2px' : '4px';
  const isCompact = fontSize === '9px' || fontSize === '10px';
  const summaryPadding = isCompact ? '8px 0' : '12px 0';
  const summaryMinHeight = isCompact ? '60px' : '80px';

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

        /* A4 Container - 794px x 1123px (96dpi 기준) */
        .a4-container {
          width: 794px;
          height: 1123px;
          padding: 15mm 10mm;
          background-color: #f9f9f9;
          position: relative;
          overflow: hidden;
        }

        /* Invoice container - 원본 구조 유지 */
        #invoice-page {
          width: 100%;
          height: 100%;
          padding: 45px;
          display: flex;
          flex-direction: column;
          background-color: #f9f9f9;
        }

        /* Header - 원본과 동일한 음수 마진 구조 */
        header {
          background-color: #1a1a1a;
          color: white;
          margin: -45px -45px 35px -45px;
          padding: 40px 45px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-shrink: 0;
          background-image:
            repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 255, 255, 0.03) 2px, rgba(255, 255, 255, 0.03) 4px),
            repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255, 255, 255, 0.03) 2px, rgba(255, 255, 255, 0.03) 4px);
        }

        header .logo {
          height: 66px;
          width: auto;
          object-fit: contain;
        }

        header .company-info {
          text-align: right;
          font-size: 12px;
          opacity: 0.9;
          line-height: 1.5;
        }

        header .company-info p {
          margin: 0;
          padding: 5px 0;
        }

        /* Main content */
        main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* Customer info section */
        .customer-section {
          margin-bottom: 20px;
          border-top: 2px solid black;
          padding-top: 16px;
          flex-shrink: 0;
        }

        .customer-section h2 {
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 12px;
          letter-spacing: 1px;
          color: #000000;
        }

        .customer-info {
          font-size: 11px;
          line-height: 1.8;
          color: #000000;
        }

        .customer-info-row {
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
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .table-header {
          display: flex;
          font-size: ${headerFontSize};
          font-weight: bold;
          text-align: center;
          padding: ${headerPadding};
          color: #000000;
          flex-shrink: 0;
        }

        .table-body {
          font-size: ${fontSize};
          text-align: center;
          color: #000000;
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .table-row {
          display: flex;
          min-height: ${rowMinHeight};
          align-items: center;
          padding: ${rowPadding} 0;
          color: #000000;
          flex-shrink: 0;
        }

        .col-product {
          width: 25%;
          padding: 0 ${colPadding};
          text-align: left;
        }

        .col-size {
          width: 20%;
          padding: 0 ${colPadding};
        }

        .col-quantity {
          width: 10%;
          padding: 0 ${colPadding};
        }

        .col-price {
          width: 15%;
          padding: 0 ${colPadding};
        }

        .col-amount {
          width: 15%;
          padding: 0 ${colPadding};
        }

        .col-remarks {
          width: 15%;
          padding: 0 ${colPadding};
        }

        /* Footer */
        footer {
          margin-top: auto;
          padding-top: 0;
          flex-shrink: 0;
        }

        /* Final summary */
        .final-summary {
          border-top: 2px solid black;
          border-bottom: 2px solid black;
          padding: ${summaryPadding};
          display: flex;
          justify-content: space-between;
          align-items: stretch;
          min-height: ${summaryMinHeight};
        }

        .notes-ea-container {
          width: 45%;
          font-size: 12px;
          color: #000000;
          display: flex;
          flex-direction: column;
          justify-content: space-around;
          gap: 8px;
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
          color: #000000;
        }

        .price-row.total {
          font-weight: bold;
        }

        .price-value {
          width: 90px;
          text-align: right;
          color: #000000;
        }

        /* Page number */
        .page-number {
          text-align: center;
          padding-top: 16px;
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
                  <span class="customer-info-label">ADDRESS</span>
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
                <div class="price-row" style="justify-content: flex-end;">
                  <div style="font-size: 11px; color: #333;">
                    • 계산서 미발행시 토탈 금액으로 입금
                  </div>
                </div>
                <div class="price-row">
                  <span style="font-weight: bold;">NOTES</span>
                  <span>${totalQuantity} EA</span>
                </div>
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
            <div class="page-number">1</div>
          </footer>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Generate JPEG image from HTML invoice
export const generateInvoiceJPEG = async (order: Order, preview: boolean = false): Promise<void> => {
  try {
    // Dynamically import html2canvas
    const html2canvasModule = await import('html2canvas');
    const html2canvas = html2canvasModule.default;

    // Generate the HTML content
    const htmlContent = generateInvoiceHTML(order);

    // Create a temporary container
    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '794px'; // A4 width in pixels
    container.style.backgroundColor = 'white';
    container.style.zIndex = '-1';
    document.body.appendChild(container);

    // Get the A4 container element
    const element = container.querySelector('.a4-container') as HTMLElement;

    if (!element) {
      throw new Error('Invoice element not found');
    }

    // Wait a bit for fonts and images to load
    await new Promise(resolve => setTimeout(resolve, 500));

    // Ensure proper styling before capturing
    element.style.transform = 'none';
    element.style.position = 'static';
    element.style.backgroundColor = '#ffffff';

    // Generate canvas with high quality settings
    const canvas = await html2canvas(element, {
      useCORS: true,
      allowTaint: false,
      width: 794,
      height: 1123
    });

    // Convert canvas to JPEG blob
    canvas.toBlob((blob) => {
      if (!blob) {
        throw new Error('Failed to generate image blob');
      }

      if (preview) {
        // Open in new tab for preview
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 100);
      } else {
        // Download the image
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${order.customerName}_견적서.jpg`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      // Clean up
      document.body.removeChild(container);
    }, 'image/jpeg', 1.0); // Maximum quality (1.0)

  } catch (error) {
    console.error('Error generating JPEG:', error);
    throw error;
  }
};

// Generate PDF from HTML invoice (기존 함수 유지)
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

    // PDF options - 단일 페이지 최적화
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
