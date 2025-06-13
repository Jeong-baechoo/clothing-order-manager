/**
 * HTML-based PDF generation utilities
 * This file provides functions to generate PDFs using HTML templates
 */

import { Order } from '../models/orderTypes';
import { isBrowser, loadHtml2Pdf } from './pdf-utils';

// Generate HTML content for the invoice
export const generateInvoiceHTML = (order: Order): string => {
  const currentDate = new Date().toLocaleDateString('ko-KR');
  
  // Calculate totals
  const calculateUnitPrice = (item: typeof order.items[0]) => {
    const basePrice = Number(item.price) || 0;
    
    // Printing costs per item
    let printingCostPerItem = 0;
    printingCostPerItem += Math.max(0, Number(item.smallPrintingQuantity) || 0) * 1500;
    printingCostPerItem += Math.max(0, Number(item.largePrintingQuantity) || 0) * 3000;

    // Extra large printing
    const extraLargeQty = Math.max(0, Number(item.extraLargePrintingQuantity) || 0);
    const extraLargePrice = Math.max(0, Number(item.extraLargePrintingPrice) || 0);
    if (extraLargeQty > 0 && extraLargePrice > 0) {
      printingCostPerItem += extraLargeQty * extraLargePrice;
    }

    // Design work
    const designQty = Math.max(0, Number(item.designWorkQuantity) || 0);
    const designPrice = Math.max(0, Number(item.designWorkPrice) || 0);
    if (designQty > 0 && designPrice > 0) {
      printingCostPerItem += designQty * designPrice;
    }

    return basePrice + printingCostPerItem;
  };

  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const grandTotal = order.totalPrice;
  const vat = Math.round(grandTotal * 0.1);
  const totalWithVat = grandTotal + vat;

  // Generate items HTML
  const itemsHTML = order.items.map((item) => {
    const unitPrice = calculateUnitPrice(item);
    const itemTotal = item.quantity * unitPrice;
    
    // Build remarks
    let remarks = '';
    if (item.smallPrintingQuantity) remarks += `소형: ${item.smallPrintingQuantity} `;
    if (item.largePrintingQuantity) remarks += `대형: ${item.largePrintingQuantity} `;
    if (item.extraLargePrintingQuantity) remarks += `특대: ${item.extraLargePrintingQuantity} `;
    if (item.designWorkQuantity) remarks += `디자인: ${item.designWorkQuantity}`;

    return `
      <div class="table-row">
        <div class="col-product">${item.productInfo?.name || item.product}</div>
        <div class="col-size">${item.size} / ${item.color}</div>
        <div class="col-quantity">${item.quantity}</div>
        <div class="col-price">${unitPrice.toLocaleString()}</div>
        <div class="col-amount">${itemTotal.toLocaleString()}</div>
        <div class="col-remarks">${remarks.trim()}</div>
      </div>
    `;
  }).join('');

  // Add empty rows to maintain consistent layout
  const emptyRowsCount = Math.max(0, 12 - order.items.length);
  const emptyRows = Array(emptyRowsCount).fill(null).map(() => 
    '<div class="table-row"><div style="width: 100%">&nbsp;</div></div>'
  ).join('');

  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice_${order.id}</title>
      <style>
        /* Reset and base styles */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", sans-serif;
          background-color: white;
          margin: 0;
          padding: 0;
        }

        /* Invoice container */
        #invoice-page {
          width: 794px; /* A4 width at 96 DPI */
          min-height: 1123px; /* A4 height at 96 DPI */
          padding: 60px;
          margin: 0 auto;
          background-color: white;
          display: flex;
          flex-direction: column;
        }

        /* Header */
        header {
          background-color: #1a1a1a;
          color: white;
          margin: -60px -60px 40px -60px;
          padding: 40px 60px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-image:
            repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 255, 255, 0.03) 2px, rgba(255, 255, 255, 0.03) 4px),
            repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255, 255, 255, 0.03) 2px, rgba(255, 255, 255, 0.03) 4px);
        }

        header h1 {
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 2px;
        }

        header .company-info {
          text-align: right;
          font-size: 12px;
          opacity: 0.9;
          line-height: 1.5;
        }

        /* Main content */
        main {
          flex-grow: 1;
        }

        /* Customer info section */
        .customer-section {
          margin-bottom: 30px;
          border-top: 2px solid black;
          padding-top: 20px;
        }

        .customer-section h2 {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 16px;
          letter-spacing: 1px;
        }

        .customer-info {
          font-size: 14px;
          line-height: 2;
        }

        .customer-info-row {
          display: flex;
          margin-bottom: 4px;
        }

        .customer-info-label {
          font-weight: bold;
          width: 80px;
        }

        .customer-info-value {
          padding-left: 20px;
        }

        /* Total summary bar */
        .total-summary-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 2px solid black;
          border-bottom: 2px solid black;
          padding: 20px 40px;
          margin: 30px 0;
          background-color: #f8f8f8;
        }

        .total-summary-bar .label {
          font-size: 18px;
          font-weight: bold;
          letter-spacing: 1px;
        }

        .total-summary-bar .value {
          font-size: 24px;
          font-weight: bold;
          color: #2563eb;
        }

        /* Items table */
        .items-table {
          margin-bottom: 30px;
        }

        .table-header {
          display: flex;
          font-size: 14px;
          font-weight: bold;
          text-align: center;
          padding: 12px 0;
          border-bottom: 2px solid black;
          background-color: #f0f0f0;
        }

        .table-body {
          font-size: 13px;
          text-align: center;
        }

        .table-row {
          display: flex;
          min-height: 36px;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #e0e0e0;
        }

        .table-row:hover {
          background-color: #f8f8f8;
        }

        .col-product {
          width: 25%;
          padding: 0 8px;
          text-align: left;
          font-weight: 500;
        }

        .col-size {
          width: 20%;
          padding: 0 8px;
        }

        .col-quantity {
          width: 10%;
          padding: 0 8px;
          font-weight: 500;
        }

        .col-price {
          width: 15%;
          padding: 0 8px;
          text-align: right;
        }

        .col-amount {
          width: 15%;
          padding: 0 8px;
          text-align: right;
          font-weight: bold;
        }

        .col-remarks {
          width: 15%;
          padding: 0 8px;
          font-size: 11px;
          color: #666;
        }

        /* Footer */
        footer {
          margin-top: auto;
          padding-top: 20px;
        }

        /* Final summary */
        .final-summary {
          border-top: 2px solid black;
          border-bottom: 2px solid black;
          padding: 20px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .notes-ea-container {
          font-size: 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 45%;
        }

        .quantity-total {
          font-size: 16px;
          font-weight: bold;
        }

        .price-summary {
          width: 45%;
          font-size: 14px;
          background-color: #f5f5f5;
          padding: 16px;
          border-radius: 6px;
        }

        .price-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .price-row.total {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 2px solid black;
          font-weight: bold;
          font-size: 16px;
        }

        .price-value {
          width: 120px;
          text-align: right;
        }

        /* Page info */
        .page-info {
          margin-top: 30px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }

        .page-number {
          font-weight: bold;
          margin-bottom: 8px;
        }

        /* Logo image */
        .logo-image {
          height: 60px;
          width: auto;
        }

        /* No page break */
        .no-break {
          page-break-inside: avoid;
        }
      </style>
    </head>
    <body>
      <div id="invoice-page" class="no-break">
        <!-- Header Section -->
        <header>
          <h1>CAELUM</h1>
          <div class="company-info">
            <p>커스텀 팀 웨어 제작업체</p>
            <p>사업자 등록번호 279-32-01590</p>
            <p>278-079307-01-011 기업은행 CAELUM(정의영)</p>
          </div>
        </header>

        <!-- Main Body Section -->
        <main>
          <!-- Customer Info Section -->
          <section class="customer-section no-break">
            <h2>INVOICE</h2>
            <div class="customer-info">
              <div class="customer-info-row">
                <span class="customer-info-label">주문번호</span>
                <span class="customer-info-value">#${order.id}</span>
              </div>
              <div class="customer-info-row">
                <span class="customer-info-label">고객명</span>
                <span class="customer-info-value">${order.customerName}</span>
              </div>
              <div class="customer-info-row">
                <span class="customer-info-label">연락처</span>
                <span class="customer-info-value">${order.phone}</span>
              </div>
              <div class="customer-info-row">
                <span class="customer-info-label">주소</span>
                <span class="customer-info-value">${order.address}</span>
              </div>
              <div class="customer-info-row">
                <span class="customer-info-label">주문일</span>
                <span class="customer-info-value">${new Date(order.orderDate).toLocaleDateString('ko-KR')}</span>
              </div>
            </div>
          </section>

          <!-- Mid-Total Summary Bar -->
          <section class="total-summary-bar no-break">
            <span class="label">TOTAL</span>
            <span class="value">${grandTotal.toLocaleString()}원</span>
          </section>

          <!-- Items Table -->
          <section class="items-table no-break">
            <!-- Table Header -->
            <div class="table-header">
              <div class="col-product">품명</div>
              <div class="col-size">사이즈/색상</div>
              <div class="col-quantity">수량</div>
              <div class="col-price">단가</div>
              <div class="col-amount">금액</div>
              <div class="col-remarks">비고</div>
            </div>
            <!-- Table Body -->
            <div class="table-body">
              ${itemsHTML}
              ${emptyRows}
            </div>
          </section>
        </main>

        <!-- Footer Section -->
        <footer class="no-break">
          <!-- Final Summary Section -->
          <section class="final-summary">
            <div class="notes-ea-container">
              <span style="font-weight: bold;">NOTES</span>
              <span class="quantity-total">${totalQuantity} EA</span>
            </div>
            <div class="price-summary">
              <div class="price-row">
                <span>상품 합계</span>
                <span class="price-value">${grandTotal.toLocaleString()}원</span>
              </div>
              <div class="price-row">
                <span>부가세 (VAT)</span>
                <span class="price-value">${vat.toLocaleString()}원</span>
              </div>
              <div class="price-row total">
                <span>총 결제금액</span>
                <span class="price-value">${totalWithVat.toLocaleString()}원</span>
              </div>
            </div>
          </section>

          <!-- Page info -->
          <div class="page-info">
            <div class="page-number">1</div>
            <div>발행일: ${currentDate} | Caelum 의류 주문 관리 시스템</div>
          </div>
        </footer>
      </div>
    </body>
    </html>
  `;
};

// Generate PDF from HTML
export const generatePDFFromHTML = async (order: Order) => {
  if (!isBrowser()) {
    throw new Error('PDF generation is only available in browser environment');
  }

  const html2pdfLib = await loadHtml2Pdf();
  if (!html2pdfLib) {
    throw new Error('Failed to load PDF generation library');
  }

  // Generate HTML content
  const htmlContent = generateInvoiceHTML(order);

  // Create a temporary container
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
    // PDF options optimized for HTML content
    const options = {
      margin: [0, 0, 0, 0],
      filename: `Invoice_${order.id}.pdf`,
      image: {
        type: 'jpeg' as const,
        quality: 0.98
      },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        letterRendering: true,
        backgroundColor: '#ffffff',
        windowWidth: 794, // A4 width
        imageTimeout: 30000,
      },
      jsPDF: {
        unit: 'px' as const,
        format: [794, 1123], // A4 size in pixels at 96 DPI
        orientation: 'portrait',
        compress: true,
      },
      pagebreak: {
        mode: ['avoid-all', 'css', 'legacy'],
        avoid: '.no-break'
      }
    };

    // Generate PDF
    const element = container.querySelector('#invoice-page');
    if (!element) {
      throw new Error('Invoice content not found');
    }

    await html2pdfLib()
      .set(options)
      .from(element)
      .save();

  } finally {
    // Clean up
    document.body.removeChild(container);
  }
};

// Export preview HTML (for iframe preview)
export const getPreviewHTML = (order: Order): string => {
  const html = generateInvoiceHTML(order);
  // Add controls for preview
  const previewHTML = html.replace(
    '<body>',
    `<body>
      <div id="controls" style="text-align: center; padding: 20px; background: #f0f2f5; position: sticky; top: 0; z-index: 1000; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <button onclick="window.print()" style="background-color: #3b82f6; color: white; padding: 10px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; transition: background-color 0.2s;">
          인쇄 미리보기
        </button>
      </div>`
  );
  return previewHTML;
};