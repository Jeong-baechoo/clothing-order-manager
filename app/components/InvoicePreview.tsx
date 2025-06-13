'use client';

import { useEffect, useRef } from 'react';
import { Order } from '../models/orderTypes';
import { generateInvoiceHTML } from '../utils/pdf-utils-html';

interface InvoicePreviewProps {
  order: Order;
}

export default function InvoicePreview({ order }: InvoicePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current) {
      const htmlContent = generateInvoiceHTML(order);
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      
      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();
      }
    }
  }, [order]);

  return (
    <iframe
      ref={iframeRef}
      className="w-full border-0"
      style={{ minHeight: '297mm' }}
      title="Invoice Preview"
    />
  );
}