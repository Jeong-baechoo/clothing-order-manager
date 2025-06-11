/**
 * Utility functions for PDF generation
 * This file provides a safe way to import and use html2pdf.js in a Next.js environment
 * by ensuring it's only loaded on the client side
 */

import type { Html2PdfOptions } from 'html2pdf.js';

// Type guard to check if we're running in a browser environment
export const isBrowser = (): boolean => {
    return typeof window !== 'undefined';
};

// Safely load html2pdf.js only on client-side
export const loadHtml2Pdf = async () => {
    if (isBrowser()) {
        try {
            const html2pdfModule = await import('html2pdf.js');
            // html2pdf.js uses CommonJS module.exports, so we need to access the default property
            return html2pdfModule.default || html2pdfModule;
        } catch (error) {
            console.error('Error loading html2pdf.js:', error);
            return null;
        }
    }
    return null;
};

// Default PDF options
export const getDefaultPdfOptions = (orderId: string): Html2PdfOptions => {
    return {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `Invoice_${orderId}.pdf`,
        enableLinks: true,
        image: {
            type: 'jpeg' as const,
            quality: 0.98
        },
        html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: true,
            letterRendering: true,
            backgroundColor: '#ffffff',
            windowWidth: 1200,
            onclone: (clonedDoc: Document) => {
                // Style adjustments in cloned document
                const container = clonedDoc.querySelector('.invoice-container');
                if (container) {
                    (container as HTMLElement).style.width = '1000px';
                    (container as HTMLElement).style.margin = '0';
                    (container as HTMLElement).style.padding = '20px';
                }

                // Image optimizations
                const images = clonedDoc.querySelectorAll('img');
                images.forEach((img: HTMLImageElement) => {
                    img.style.maxWidth = '100%';
                    img.style.display = 'block';
                });

                return clonedDoc;
            },
            imageTimeout: 30000,
            removeContainer: false
        },
        jsPDF: {
            unit: 'in' as const,
            format: 'a4',
            orientation: 'portrait',
            compress: true,
            precision: 16,
            putOnlyUsedFonts: true
        },
        pagebreak: {
            mode: ['avoid-all', 'css', 'legacy'],
            before: '.page-break-before',
            after: '.page-break-after',
            avoid: '.no-break'
        }
    };
};