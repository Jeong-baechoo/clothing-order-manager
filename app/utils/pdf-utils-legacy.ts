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
        margin: [8, 8, 8, 8], // Further reduced margins for single page
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
            backgroundColor: '#ffffff',
            windowWidth: 794, // A4 width in pixels at 96 DPI
            width: 794,
            ignoreElements: (element) => {
                // Don't ignore any elements - we want everything visible
                return false;
            },
            letterRendering: true,
            onclone: (clonedDoc: Document) => {

                const container = clonedDoc.querySelector('.invoice-container');
                if (container) {
                    (container as HTMLElement).style.width = '100%';
                    (container as HTMLElement).style.maxWidth = '794px';
                    (container as HTMLElement).style.margin = '0 auto';
                    (container as HTMLElement).style.padding = '30px';
                    (container as HTMLElement).style.backgroundColor = '#ffffff';
                }

                // Image optimizations
                const images = clonedDoc.querySelectorAll('img');
                images.forEach((img: HTMLImageElement) => {
                    img.style.maxWidth = '100%';
                    img.style.display = 'block';
                });

                // Debug: Log all elements that might contain order number
                console.log('=== PDF Generation Debug ===');

                // Try multiple selectors to find order number
                const orderBoxSelectors = [
                    '.bg-gray-100.rounded-md',
                    '.inline-flex.items-center',
                    'div:has(> span:contains("주문번호"))',
                    '[class*="bg-gray-100"]',
                    '[class*="rounded-md"]'
                ];

                let orderBox = null;
                for (const selector of orderBoxSelectors) {
                    try {
                        orderBox = clonedDoc.querySelector(selector);
                        if (orderBox) {
                            console.log(`Found order box with selector: ${selector}`);
                            break;
                        }
                    } catch (e) {
                        // Some selectors might not be valid in all browsers
                    }
                }

                // If still not found, search by text content
                if (!orderBox) {
                    const allDivs = clonedDoc.querySelectorAll('div');
                    allDivs.forEach(div => {
                        if (div.textContent?.includes('주문번호')) {
                            orderBox = div;
                            console.log('Found order box by text content search');
                        }
                    });
                }

                if (orderBox) {
                    console.log('Order box HTML:', (orderBox as HTMLElement).outerHTML);

                    (orderBox as HTMLElement).style.backgroundColor = '#f3f4f6 !important';
                    (orderBox as HTMLElement).style.borderRadius = '6px';
                    (orderBox as HTMLElement).style.padding = '8px 16px';
                    (orderBox as HTMLElement).style.display = 'inline-flex';
                    (orderBox as HTMLElement).style.alignItems = 'center';
                    (orderBox as HTMLElement).style.minHeight = '40px';

                    // Ensure background color prints
                    (orderBox as HTMLElement).style.printColorAdjust = 'exact';
                    (orderBox as HTMLElement).style.WebkitPrintColorAdjust = 'exact';

                    // Force ALL child elements to be visible
                    const allChildren = orderBox.querySelectorAll('*');
                    allChildren.forEach((child) => {
                        (child as HTMLElement).style.color = '#000000 !important';
                        (child as HTMLElement).style.opacity = '1 !important';
                        (child as HTMLElement).style.visibility = 'visible !important';
                        (child as HTMLElement).style.display = 'inline !important';

                        console.log(`Child element: ${child.tagName}, text: ${child.textContent}`);
                    });

                    // Special handling for spans
                    const orderTexts = orderBox.querySelectorAll('span');
                    orderTexts.forEach((span, index) => {
                        const text = span.textContent || '';
                        console.log(`Span ${index}: "${text}"`);

                        (span as HTMLElement).style.setProperty('color', '#000000', 'important');
                        (span as HTMLElement).style.setProperty('opacity', '1', 'important');
                        (span as HTMLElement).style.setProperty('visibility', 'visible', 'important');

                        // Order number (contains #)
                        if (text.includes('#') || span.classList.contains('text-lg') || span.classList.contains('font-bold')) {
                            (span as HTMLElement).style.setProperty('font-size', '18px', 'important');
                            (span as HTMLElement).style.setProperty('font-weight', 'bold', 'important');
                            (span as HTMLElement).style.setProperty('color', '#000000', 'important');
                            console.log(`Applied special styling to order number span: "${text}"`);
                        }
                    });
                } else {
                    console.error('Could not find order box in PDF!');

                    // Last resort: Try to extract order ID from existing text and make it more visible
                    const allText = clonedDoc.body.textContent || '';
                    const orderMatch = allText.match(/#(\d{4}-\d{3})/);
                    if (orderMatch) {
                        console.log('Found order ID in text:', orderMatch[0]);
                        const invoiceHeader = clonedDoc.querySelector('h1');
                        if (invoiceHeader && invoiceHeader.textContent === 'INVOICE') {
                            console.log('Creating fallback order ID element');
                            const orderIdDiv = clonedDoc.createElement('div');
                            orderIdDiv.style.cssText = 'margin-top: 10px; font-size: 18px; font-weight: bold; color: #000000 !important; opacity: 1 !important; visibility: visible !important;';
                            orderIdDiv.textContent = `주문번호 ${orderMatch[0]}`;
                            invoiceHeader.parentElement?.appendChild(orderIdDiv);
                        }
                    }
                }

                // Make all text darker
                const textElements = clonedDoc.querySelectorAll('p, span, div, td, th, h1, h2, h3, h4, h5, h6');
                textElements.forEach((el) => {
                    const element = el as HTMLElement;
                    if (element.classList.contains('text-gray-500')) {
                        element.style.color = '#374151'; // gray-700
                    } else if (element.classList.contains('text-gray-600')) {
                        element.style.color = '#1f2937'; // gray-800
                    } else if (element.classList.contains('text-gray-700')) {
                        element.style.color = '#111827'; // gray-900
                    } else if (element.classList.contains('text-gray-800')) {
                        element.style.color = '#000000'; // black
                    }
                    // Don't change white text
                    if (!element.classList.contains('text-white') && element.style.color !== 'white' && element.style.color !== '#ffffff') {
                        element.style.opacity = '1';
                    }
                });

                // Extra check specifically for order ID visibility
                const allSpans = clonedDoc.querySelectorAll('span');
                allSpans.forEach((span) => {
                    const text = span.textContent || '';
                    // Check if this span contains the order ID (starts with #)
                    if (text.startsWith('#') && text.length > 1) {
                        (span as HTMLElement).style.setProperty('color', '#000000', 'important');
                        (span as HTMLElement).style.setProperty('font-weight', 'bold', 'important');
                        (span as HTMLElement).style.setProperty('font-size', '20px', 'important');
                        (span as HTMLElement).style.setProperty('opacity', '1', 'important');
                        (span as HTMLElement).style.setProperty('visibility', 'visible', 'important');
                        (span as HTMLElement).style.setProperty('display', 'inline', 'important');
                        (span as HTMLElement).style.setProperty('position', 'relative', 'important');
                        (span as HTMLElement).style.setProperty('z-index', '9999', 'important');

                        // Also try to make parent elements visible
                        let parent = span.parentElement;
                        while (parent && parent !== clonedDoc.body) {
                            (parent as HTMLElement).style.setProperty('opacity', '1', 'important');
                            (parent as HTMLElement).style.setProperty('visibility', 'visible', 'important');
                            parent = parent.parentElement;
                        }

                        console.log('Found order ID in PDF:', text);
                        console.log('Order ID element:', span);
                        console.log('Order ID computed styles:', window.getComputedStyle(span));
                    }
                });

                // Final attempt: Find any element containing order pattern like #2506-001
                const orderPattern = /#\d{4}-\d{3}/;
                const allElements = clonedDoc.querySelectorAll('*');
                allElements.forEach((el) => {
                    if (el.textContent && orderPattern.test(el.textContent) && el.children.length === 0) {
                        console.log('Found order ID by pattern in:', el.tagName, el.textContent);
                        (el as HTMLElement).style.setProperty('color', '#000000', 'important');
                        (el as HTMLElement).style.setProperty('font-weight', 'bold', 'important');
                        (el as HTMLElement).style.setProperty('font-size', '20px', 'important');
                        (el as HTMLElement).style.setProperty('opacity', '1', 'important');
                        (el as HTMLElement).style.setProperty('visibility', 'visible', 'important');
                    }
                });

                return clonedDoc;
            },
            imageTimeout: 30000,
            removeContainer: false
        },
        jsPDF: {
            unit: 'mm' as const,
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
