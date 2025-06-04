declare module 'html2pdf.js' {
  export interface Html2PdfOptions {
    margin?: number | number[];
    filename?: string;
    image?: {
      type?: 'jpeg' | 'png' | 'webp';
      quality?: number;
      [key: string]: unknown; // Changed from any
    };
    html2canvas?: { [key: string]: unknown; }; // Changed from any
    jsPDF?: {
      unit?: 'pt' | 'mm' | 'cm' | 'in' | 'px' | 'pc' | 'em' | 'ex';
      format?: string | number[];
      orientation?: 'portrait' | 'p' | 'landscape' | 'l';
      [key: string]: unknown; // Changed from any
    };
    enableLinks?: boolean;
    pagebreak?: {
      mode?: string | string[];
      before?: string | string[];
      after?: string | string[];
      avoid?: string | string[];
    };
    onclone?: (document: Document) => void;
  }

  export interface Html2Pdf {
    set(options: Html2PdfOptions): Html2Pdf;
    from(element: HTMLElement): Html2Pdf;
    save(): Promise<void>;
    output(type?: string): Promise<unknown>; // Changed from any
    then(callback: (pdf: unknown) => void): Html2Pdf; // Changed from any
  }

  function html2pdf(): Html2Pdf;
  export = html2pdf;
}
