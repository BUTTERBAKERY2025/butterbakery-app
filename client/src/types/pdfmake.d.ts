/**
 * تعريف واجهات التطبيق البرمجية لمكتبة pdfmake
 * يتم استخدام هذا الملف لتوفير تلميحات TypeScript عند استخدام pdfmake
 */
declare module 'pdfmake/build/pdfmake' {
  export interface TDocumentDefinitions {
    content: any;
    styles?: any;
    defaultStyle?: {
      font?: string;
      fontSize?: number;
      alignment?: string;
      direction?: string;
    };
    pageSize?: string;
    pageOrientation?: string;
    pageMargins?: [number, number, number, number];
    header?: any;
    footer?: any;
    info?: {
      title?: string;
      author?: string;
      subject?: string;
      keywords?: string;
    };
    compress?: boolean;
    rtl?: boolean;
  }

  export interface TFontDictionary {
    [fontName: string]: {
      normal: string;
      bold: string;
      italics: string;
      bolditalics: string;
    };
  }

  export interface TCreatedPdf {
    download: (defaultFileName?: string, cb?: () => void) => void;
    open: (options?: any, win?: Window | null) => void;
    print: (options?: any) => void;
    getDataUrl: (cb?: (result: string) => void) => void;
    getBase64: (cb?: (result: string) => void) => void;
    getBuffer: (cb?: (result: ArrayBuffer) => void) => void;
    getBlob: (cb?: (result: Blob) => void) => void;
  }

  export interface PDFMake {
    fonts: TFontDictionary;
    createPdf: (documentDefinitions: TDocumentDefinitions) => TCreatedPdf;
    vfs: any;
  }

  const pdfMake: PDFMake;
  export default pdfMake;
}

/**
 * تعريف واجهات pdfMake لتوفير الأنواع للمستندات الخاصة بالتقارير
 */
declare module 'pdfmake/interfaces' {
  export interface StyleDefinition {
    fontSize?: number;
    fontFeatures?: string[];
    font?: string;
    bold?: boolean;
    italics?: boolean;
    alignment?: string;
    color?: string;
    columnGap?: number;
    fillColor?: string;
    decoration?: string | string[];
    decorationStyle?: string;
    decorationColor?: string;
    background?: string;
    lineHeight?: number;
    characterSpacing?: number;
    noWrap?: boolean;
    markerColor?: string;
    leadingIndent?: number;
    margin?: [number, number, number, number] | number;
    marginLeft?: number;
    marginTop?: number;
    marginRight?: number;
    marginBottom?: number;
  }

  export interface TableDefinition {
    widths?: string[] | number[];
    heights?: number[] | ((row: number) => number);
    headerRows?: number;
    body: any[][];
  }

  export interface ContentDefinition {
    table?: TableDefinition;
    text?: string | string[];
    style?: string | string[];
    columns?: ContentDefinition[];
    stack?: ContentDefinition[];
    margin?: [number, number, number, number] | number;
    alignment?: string;
    width?: string | number;
    canvas?: any[];
  }
}