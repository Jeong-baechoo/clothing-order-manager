'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Order } from '../../models/orderTypes';
import { generateInvoiceHTML } from '../../utils/pdf-utils-html';

interface InvoicePreviewProps {
  order: Order;
}

export default function InvoicePreview({ order }: InvoicePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (iframeRef.current) {
      const previewHTML = generateInvoiceHTML(order);
      const blob = new Blob([previewHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      iframeRef.current.src = url;
      
      // Clean up blob URL when component unmounts
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [order]);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className="invoice-preview-container">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600">인보이스 로딩 중...</p>
          </div>
        </div>
      )}
      
      <iframe
        ref={iframeRef}
        onLoad={handleIframeLoad}
        className="w-full h-full border-0"
        style={{
          minHeight: '842px', // A4 height in pixels
          backgroundColor: 'white',
        }}
        title="Invoice Preview"
        sandbox="allow-same-origin allow-scripts"
      />
      
      <style jsx>{`
        .invoice-preview-container {
          position: relative;
          width: 100%;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        @media print {
          .invoice-preview-container {
            box-shadow: none;
            border-radius: 0;
          }
        }
      `}</style>
    </div>
  );
}