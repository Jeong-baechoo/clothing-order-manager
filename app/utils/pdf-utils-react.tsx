// Note: React-PDF doesn't require 'use client' as it runs in browser anyway

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, pdf, Image } from '@react-pdf/renderer';
import { Order, OrderItem } from '../models/orderTypes';

// Static import of logo image
import logoImage from '../../public/images/caelum-logo.png';

// Register Korean font for proper Korean text display
Font.register({
  family: 'NotoSansKR',
  src: '/fonts/NotoSansKR-Regular.ttf',
  fontWeight: 'normal',
});

// Register font for bold weight
Font.register({
  family: 'NotoSansKR',
  src: '/fonts/NotoSansKR-Regular.ttf',
  fontWeight: 'bold',
});

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 40,
    fontFamily: 'NotoSansKR',
    fontSize: 11, // Base font size
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  companyInfo: {
    flex: 1,
  },
  invoiceInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  logo: {
    width: 120,
    height: 40,
    marginBottom: 10,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1f2937',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
  },
  orderBox: {
    backgroundColor: '#f3f4f6',
    padding: '8 16',
    borderRadius: 6,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderLabel: {
    fontSize: 12,
    color: '#4b5563',
    marginRight: 8,
    fontFamily: 'NotoSansKR',
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    fontFamily: 'NotoSansKR',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    fontFamily: 'NotoSansKR',
  },
  infoGrid: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  infoColumn: {
    flex: 1,
    marginRight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    color: '#6b7280',
    width: 80,
    fontFamily: 'NotoSansKR',
  },
  value: {
    fontSize: 10,
    color: '#1f2937',
    flex: 1,
    fontFamily: 'NotoSansKR',
  },
  table: {
    display: 'table',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderColor: '#e5e7eb',
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableHeader: {
    backgroundColor: '#f9fafb',
  },
  tableCol: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#e5e7eb',
    padding: 8,
  },
  tableCell: {
    fontSize: 10,
    color: '#1f2937',
    fontFamily: 'NotoSansKR',
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
    fontFamily: 'NotoSansKR',
  },
  totalSection: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 12,
    color: '#6b7280',
    width: 100,
    textAlign: 'right',
    marginRight: 10,
    fontFamily: 'NotoSansKR',
  },
  totalValue: {
    fontSize: 12,
    color: '#1f2937',
    width: 100,
    textAlign: 'right',
    fontFamily: 'NotoSansKR',
  },
  grandTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    fontFamily: 'NotoSansKR',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 10,
    fontFamily: 'NotoSansKR',
  },
});

// Create Document Component
export const InvoicePDF = ({ order }: { order: Order }) => {
  const currentDate = new Date().toLocaleDateString('ko-KR');
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('ko-KR');

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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            {/* Logo image from static import */}
            <Image 
              style={styles.logo} 
              src={logoImage}
            />
            <Text style={{ fontSize: 10, marginBottom: 2, fontFamily: 'NotoSansKR' }}>사업자등록번호: 646-38-01260</Text>
            <Text style={{ fontSize: 10, marginBottom: 2, fontFamily: 'NotoSansKR' }}>대표: 홍종철</Text>
            <Text style={{ fontSize: 10, marginBottom: 2, fontFamily: 'NotoSansKR' }}>연락처: 010-3010-2960</Text>
            <Text style={{ fontSize: 10, marginBottom: 2, fontFamily: 'NotoSansKR' }}>주소: 경기도 군포시 군포로 374, 803동 1303호</Text>
            <Text style={{ fontSize: 10, fontFamily: 'NotoSansKR' }}>이메일: caelum2022@daum.net</Text>
          </View>
          
          <View style={styles.invoiceInfo}>
            <Text style={styles.title}>INVOICE</Text>
            <View style={styles.orderBox}>
              <Text style={styles.orderLabel}>주문번호</Text>
              <Text style={styles.orderNumber}>#{order.id}</Text>
            </View>
            <Text style={{ fontSize: 10, marginBottom: 2 }}>
              <Text style={{ fontWeight: 'bold' }}>발행일:</Text> {currentDate}
            </Text>
            <Text style={{ fontSize: 10 }}>
              <Text style={{ fontWeight: 'bold' }}>만기일:</Text> {dueDate}
            </Text>
          </View>
        </View>

        {/* Customer and Order Info */}
        <View style={styles.infoGrid}>
          <View style={styles.infoColumn}>
            <Text style={styles.sectionTitle}>고객 정보</Text>
            <View style={styles.infoRow}>
              <Text style={styles.label}>고객명:</Text>
              <Text style={styles.value}>{order.customerName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>연락처:</Text>
              <Text style={styles.value}>{order.phone}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>주소:</Text>
              <Text style={styles.value}>{order.address}</Text>
            </View>
          </View>
          
          <View style={styles.infoColumn}>
            <Text style={styles.sectionTitle}>주문 정보</Text>
            <View style={styles.infoRow}>
              <Text style={styles.label}>주문일:</Text>
              <Text style={styles.value}>{new Date(order.orderDate).toLocaleDateString('ko-KR')}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>결제방법:</Text>
              <Text style={styles.value}>{order.paymentMethod}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>상태:</Text>
              <Text style={styles.value}>{order.status}</Text>
            </View>
          </View>
        </View>

        {/* Order Items Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>주문 항목</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={[styles.tableRow, styles.tableHeader]}>
              <View style={[styles.tableCol, { width: '20%' }]}>
                <Text style={styles.tableHeaderCell}>제품명</Text>
              </View>
              <View style={[styles.tableCol, { width: '10%' }]}>
                <Text style={styles.tableHeaderCell}>사이즈</Text>
              </View>
              <View style={[styles.tableCol, { width: '10%' }]}>
                <Text style={styles.tableHeaderCell}>색상</Text>
              </View>
              <View style={[styles.tableCol, { width: '10%' }]}>
                <Text style={styles.tableHeaderCell}>수량</Text>
              </View>
              <View style={[styles.tableCol, { width: '15%' }]}>
                <Text style={styles.tableHeaderCell}>단가</Text>
              </View>
              <View style={[styles.tableCol, { width: '15%' }]}>
                <Text style={styles.tableHeaderCell}>소계</Text>
              </View>
              <View style={[styles.tableCol, { width: '20%' }]}>
                <Text style={styles.tableHeaderCell}>추가옵션</Text>
              </View>
            </View>
            
            {/* Table Body */}
            {order.items.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <View style={[styles.tableCol, { width: '20%' }]}>
                  <Text style={styles.tableCell}>{item.product}</Text>
                </View>
                <View style={[styles.tableCol, { width: '10%' }]}>
                  <Text style={styles.tableCell}>{item.size}</Text>
                </View>
                <View style={[styles.tableCol, { width: '10%' }]}>
                  <Text style={styles.tableCell}>{item.color}</Text>
                </View>
                <View style={[styles.tableCol, { width: '10%' }]}>
                  <Text style={styles.tableCell}>{item.quantity}</Text>
                </View>
                <View style={[styles.tableCol, { width: '15%' }]}>
                  <Text style={styles.tableCell}>{item.price.toLocaleString()}원</Text>
                </View>
                <View style={[styles.tableCol, { width: '15%' }]}>
                  <Text style={styles.tableCell}>{(item.price * item.quantity).toLocaleString()}원</Text>
                </View>
                <View style={[styles.tableCol, { width: '20%' }]}>
                  <Text style={styles.tableCell}>
                    {item.smallPrintingQuantity ? `소형: ${item.smallPrintingQuantity} ` : ''}
                    {item.largePrintingQuantity ? `대형: ${item.largePrintingQuantity} ` : ''}
                    {item.extraLargePrintingQuantity ? `특대: ${item.extraLargePrintingQuantity} ` : ''}
                    {item.designWorkQuantity ? `디자인: ${item.designWorkQuantity}` : ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>상품 합계:</Text>
            <Text style={styles.totalValue}>{subtotal.toLocaleString()}원</Text>
          </View>
          {printingTotal > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>프린팅 비용:</Text>
              <Text style={styles.totalValue}>{printingTotal.toLocaleString()}원</Text>
            </View>
          )}
          {designTotal > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>디자인 비용:</Text>
              <Text style={styles.totalValue}>{designTotal.toLocaleString()}원</Text>
            </View>
          )}
          <View style={[styles.totalRow, { borderTopWidth: 1, borderColor: '#e5e7eb', paddingTop: 8, marginTop: 8 }]}>
            <Text style={[styles.totalLabel, styles.grandTotal]}>총 금액:</Text>
            <Text style={[styles.totalValue, styles.grandTotal]}>{grandTotal.toLocaleString()}원</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          이 인보이스는 CAELUM에서 발행되었습니다. 문의사항은 010-3010-2960으로 연락주세요.
        </Text>
      </Page>
    </Document>
  );
};

// Simple test PDF component
const TestPDF = () => (
  <Document>
    <Page size="A4" style={{ padding: 30 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Test PDF Generation</Text>
      <Text style={{ fontSize: 14 }}>If you can see this, React-PDF is working!</Text>
      <Text style={{ fontSize: 14, marginTop: 10 }}>Korean test: 한글 테스트</Text>
    </Page>
  </Document>
);

// Export function to generate PDF
export const generateReactPDF = async (order: Order): Promise<void> => {
  console.log('generateReactPDF started with order:', order);
  
  try {
    // First, let's test with a simple PDF
    const testMode = false; // Set to true to test basic PDF generation
    
    console.log('Creating PDF document...');
    const doc = testMode ? <TestPDF /> : <InvoicePDF order={order} />;
    console.log('Document created:', doc);
    
    console.log('Converting to PDF blob...');
    const pdfInstance = pdf(doc);
    console.log('PDF instance:', pdfInstance);
    
    const blob = await pdfInstance.toBlob();
    console.log('Blob created:', blob, 'Size:', blob.size);
    
    const url = URL.createObjectURL(blob);
    console.log('Blob URL created:', url);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoice_${order.id}.pdf`;
    console.log('Download link created:', link.download);
    
    // Add to document temporarily to ensure it works
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log('Download triggered');
    
    // Clean up
    setTimeout(() => {
      URL.revokeObjectURL(url);
      console.log('Blob URL revoked');
    }, 100);
  } catch (error) {
    console.error('Error generating React-PDF:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
};