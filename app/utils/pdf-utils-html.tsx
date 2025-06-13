import { Order } from '../models/orderTypes';

// Generate HTML invoice based on the invoice.html template
export const generateInvoiceHTML = (order: Order): string => {
  // Calculate totals
  const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const printingTotal = order.items.reduce((sum, item) => {
    const smallPrinting = (item.smallPrintingQuantity || 0) * 3000;
    const largePrinting = (item.largePrintingQuantity || 0) * 5000;
    const extraLargePrinting = (item.extraLargePrintingQuantity || 0) * (item.extraLargePrintingPrice || 0);
    return sum + smallPrinting + largePrinting + extraLargePrinting;
  }, 0);
  const designTotal = order.items.reduce((sum, item) => {
    return sum + ((item.designWorkQuantity || 0) * (item.designWorkPrice || 0));
  }, 0);
  const grandTotal = subtotal + printingTotal + designTotal;
  const vat = Math.round(grandTotal * 0.1);
  const totalWithVat = grandTotal + vat;
  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

  // Generate table rows
  let tableRows = '';
  let totalRows = 0;

  // Add main order items
  order.items.forEach(item => {
    let remarks = '';
    if (item.smallPrintingQuantity) remarks += `소형: ${item.smallPrintingQuantity} `;
    if (item.largePrintingQuantity) remarks += `대형: ${item.largePrintingQuantity} `;
    if (item.extraLargePrintingQuantity) remarks += `특대: ${item.extraLargePrintingQuantity} `;
    if (item.designWorkQuantity) remarks += `디자인: ${item.designWorkQuantity}`;

    tableRows += `
      <div class="table-row">
        <div class="col-product">${item.product}</div>
        <div class="col-size">${item.size} / ${item.color}</div>
        <div class="col-quantity">${item.quantity}</div>
        <div class="col-price">${item.price.toLocaleString()}</div>
        <div class="col-amount">${(item.price * item.quantity).toLocaleString()}</div>
        <div class="col-remarks">${remarks.trim()}</div>
      </div>
    `;
    totalRows++;
  });

  // Add additional cost rows if they exist
  if (printingTotal > 0) {
    tableRows += `
      <div class="table-row">
        <div class="col-product">프린팅 비용</div>
        <div class="col-size">-</div>
        <div class="col-quantity">-</div>
        <div class="col-price">-</div>
        <div class="col-amount">${printingTotal.toLocaleString()}</div>
        <div class="col-remarks">프린팅 작업</div>
      </div>
    `;
    totalRows++;
  }

  if (designTotal > 0) {
    tableRows += `
      <div class="table-row">
        <div class="col-product">디자인 비용</div>
        <div class="col-size">-</div>
        <div class="col-quantity">-</div>
        <div class="col-price">-</div>
        <div class="col-amount">${designTotal.toLocaleString()}</div>
        <div class="col-remarks">디자인 작업</div>
      </div>
    `;
    totalRows++;
  }

  // Add empty rows to maintain consistent look
  const emptyRowsToAdd = Math.max(0, 5 - totalRows);
  for (let i = 0; i < emptyRowsToAdd; i++) {
    tableRows += `
      <div class="table-row">
        <div style="width: 100%">&nbsp;</div>
      </div>
    `;
  }

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
          height: 297mm;
          margin: 0;
          padding: 15mm 10mm;
          background-color: #f9f9f9;
          position: relative;
          overflow: hidden;
          box-sizing: border-box;
        }

        /* Invoice container with padding inside A4 */
        #invoice-page {
          width: 100%;
          height: 100%;
          padding: 30mm 15mm;
          display: flex;
          flex-direction: column;
          background-color: #f9f9f9;
          box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.05);
          box-sizing: border-box;
        }

        /* Header */
        header {
          background-color: #1a1a1a;
          color: white;
          margin: -30mm -15mm 15mm -15mm;
          padding: 15mm 15mm 10mm 15mm;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          background-image:
            repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 255, 255, 0.03) 2px, rgba(255, 255, 255, 0.03) 4px),
            repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255, 255, 255, 0.03) 2px, rgba(255, 255, 255, 0.03) 4px);
        }

        header .logo {
          height: 50px;
          width: auto;
          filter: brightness(0) invert(1);
          /*left: 50%;*/
        }

        header .company-info {
          text-align: right;
          font-size: 12px;
          opacity: 0.9;
          line-height: 1.4;
          margin-left: auto;
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
          margin-bottom: 8mm;
          border-top: 2.5px solid black;
          padding-top: 3mm;
        }

        .customer-section h2 {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 8px;
          letter-spacing: 1px;
          color: #000000;
        }

        .customer-info {
          font-size: 13px;
          line-height: 1.6;
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

        /* Total summary bar */
        .total-summary-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 2.5px solid black;
          padding: 5mm 5mm;
          margin: 5mm 0;
        }

        .total-summary-bar .label {
          font-size: 16px;
          font-weight: bold;
          letter-spacing: 1px;
          color: #000000;
        }

        .total-summary-bar .value {
          font-size: 18px;
          font-weight: bold;
          color: #000000;
        }

        /* Items table */
        .items-table {
          flex: 1;
          overflow: hidden;
        }

        .table-header {
          display: flex;
          font-size: 14px;
          font-weight: bold;
          text-align: center;
          padding-bottom: 4px;
          /* border-bottom: 1px solid #000; */
          color: #000000;
        }

        .table-body {
          font-size: 13px;
          text-align: center;
          color: #000000;
        }

        .table-row {
          display: flex;
          min-height: 20px;
          align-items: center;
          padding: 2px 0;
          color: #000000;
        }

        .col-product {
          width: 25%;
          padding: 0 4px;
          text-align: center;
        }

        .col-size {
          width: 20%;
          padding: 0 4px;
        }

        .col-quantity {
          width: 10%;
          padding: 0 4px;
        }

        .col-price {
          width: 15%;
          padding: 0 4px;
        }

        .col-amount {
          width: 15%;
          padding: 0 4px;
        }

        .col-remarks {
          width: 15%;
          padding: 0 4px;
          font-size: 12px;
        }

        /* Footer */
        footer {
          margin-top: auto;
          padding-top: 5mm;
        }

        /* Final summary */
        .final-summary {
          border-top: 2.5px solid black;
          border-bottom: 2.5px solid black;
          padding: 8px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
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
          padding: 10px;
          border-radius: 4px;
          color: #000000;
        }

        .price-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
          color: #000000;
        }

        .price-row.total {
          margin-top: 8px;
          padding-top: 8px;
          /* border-top: 2.5px solid black; */
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
            <img src="/images/caelum-logo.png" alt="CAELUM" class="logo" />
            <div class="company-info">
              <p>커스텀 팀 웨어 제작업체</p>
              <p>사업자 등록번호 279-32-01590</p>
              <p>278-079307-01-011기업은행 CAELUM(정의영)</p>
            </div>
          </header>

          <!-- Main Body Section -->
          <main>
            <!-- Customer Info Section -->
            <section class="customer-section">
              <h2>IN VOICE</h2>
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

            <!-- Mid-Total Summary Bar -->
            <section class="total-summary-bar">
              <span class="label">TOTAL</span>
              <span class="value">${grandTotal.toLocaleString()}</span>
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
    const element = container.querySelector('.a4-container');

    if (!element) {
      throw new Error('Invoice element not found');
    }

    // PDF options - 정확한 A4 크기 설정
    const options = {
      margin: 0,
      filename: `${order.customerName}_주문서.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
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
        unit: 'pt',
        format: [595, 842], // A4 size in points
        orientation: 'portrait',
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
      const blob = await pdfWorker.outputPdf('blob');
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
