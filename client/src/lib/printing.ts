import i18n from './i18n';
import { formatDate } from './utils';

/**
 * مكتبة محسنة للطباعة
 * توفر أدوات متقدمة للطباعة المباشرة من التطبيق مع دعم كامل للغة العربية
 */

/**
 * إعدادات الطباعة
 */
export interface PrintOptions {
  /** عنصر HTML للطباعة */
  selector?: string;
  /** إخفاء العناصر المرتبطة بالتنقل والتحكم */
  hideControls?: boolean;
  /** إضافة ترويسة للصفحة المطبوعة */
  header?: string | {
    title: string;
    subtitle?: string;
    logo?: string;
    date?: boolean;
  };
  /** إضافة تذييل للصفحة المطبوعة */
  footer?: string;
  /** حجم الورق */
  paperSize?: 'a4' | 'letter' | 'legal' | 'a5';
  /** اتجاه الورق */
  orientation?: 'portrait' | 'landscape';
  /** إضافة ترقيم للصفحات */
  pageNumbers?: boolean;
  /** دالة يتم تنفيذها قبل الطباعة */
  beforePrint?: () => void;
  /** دالة يتم تنفيذها بعد الطباعة */
  afterPrint?: () => void;
  /** إعدادات خاصة بالجداول */
  tables?: {
    /** تكرار رؤوس الجداول في كل صفحة */
    repeatHeaders?: boolean;
    /** منع انقسام صفوف الجداول بين الصفحات */
    preventRowSplit?: boolean;
  };
}

/**
 * إعداد عنصر الستايل المخصص للطباعة
 */
function createPrintStyle(options: PrintOptions): HTMLStyleElement {
  const style = document.createElement('style');
  
  // استخراج الإعدادات
  const paperSize = options.paperSize || 'a4';
  const orientation = options.orientation || 'portrait';
  const selector = options.selector || '[role="dialog"] > div > div';
  const hideControls = options.hideControls !== false;
  const repeatHeaders = options.tables?.repeatHeaders !== false;
  const preventRowSplit = options.tables?.preventRowSplit !== false;
  
  // تحديد مقاسات الصفحة
  const sizeMap: Record<string, string> = {
    'a4': '210mm 297mm',
    'a5': '148mm 210mm',
    'letter': '216mm 279mm',
    'legal': '216mm 356mm'
  };
  
  const paperSizeValue = sizeMap[paperSize] || sizeMap.a4;
  
  // تحضير نص CSS للطباعة
  let cssText = `
    @media print {
      @page {
        size: ${orientation === 'landscape' ? paperSizeValue.split(' ').reverse().join(' ') : paperSizeValue};
        margin: 1.5cm 1cm;
      }
      
      body * {
        visibility: hidden;
      }
      
      /* إظهار العنصر المراد طباعته فقط */
      ${selector}, ${selector} * {
        visibility: visible;
      }
      
      ${selector} {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        padding: 0 !important;
        margin: 0 !important;
      }
      
      /* منع انقسام الجداول والعناصر المهمة */
      .no-page-break, .page-no-break {
        page-break-inside: avoid !important;
      }
      
      /* إضافة انقطاع صفحة إجباري */
      .page-break, .page-break-after {
        page-break-after: always !important;
      }
      
      /* تنسيق الجداول */
      table {
        width: 100% !important;
        border-collapse: collapse !important;
      }
      
      /* تكرار رؤوس الجداول */
      ${repeatHeaders ? 'thead { display: table-header-group !important; }' : ''}
      
      /* منع انقسام صفوف الجداول */
      ${preventRowSplit ? 'tr { page-break-inside: avoid !important; }' : ''}
      
      /* إخفاء عناصر التنقل والتحكم */
      ${hideControls ? `
        .print-hide, .dialog-footer, button, [role="dialog"] button, 
        .btn, .print-button, nav, .nav, .pagination, .pager,
        input[type=button], input[type=submit] {
          display: none !important;
          visibility: hidden !important;
        }
      ` : ''}
    }
  `;
  
  // إضافة ترويسة وتذييل في حال طلبها
  if (options.header || options.footer || options.pageNumbers) {
    cssText += `
      @media print {
        .print-header {
          position: fixed;
          top: 0;
          width: 100%;
          text-align: center;
          padding: 5mm 0;
          border-bottom: 0.5px solid #eee;
          margin-bottom: 10mm;
        }
        
        .print-footer {
          position: fixed;
          bottom: 0;
          width: 100%;
          text-align: center;
          padding: 5mm 0;
          border-top: 0.5px solid #eee;
          font-size: 9pt;
          color: #777;
        }
        
        .page-number:after {
          content: counter(page);
        }
        
        @page {
          @top-center {
            content: element(header);
          }
          @bottom-center {
            content: element(footer);
          }
        }
        
        /* إضافة هامش مناسب لمحتوى الصفحة */
        ${selector} {
          margin-top: ${options.header ? '20mm' : '0'} !important;
          margin-bottom: ${options.footer || options.pageNumbers ? '15mm' : '0'} !important;
        }
      }
    `;
  }
  
  style.innerHTML = cssText;
  return style;
}

/**
 * إنشاء ترويسة الصفحة المطبوعة
 */
function createHeader(options: PrintOptions): HTMLElement | null {
  if (!options.header) return null;
  
  const header = document.createElement('div');
  header.className = 'print-header';
  
  if (typeof options.header === 'string') {
    // ترويسة نصية بسيطة
    header.innerHTML = options.header;
  } else {
    // ترويسة متقدمة
    const { title, subtitle, logo, date } = options.header;
    
    let headerHTML = '';
    
    // إضافة الشعار إذا وجد
    if (logo) {
      headerHTML += `<div class="print-logo"><img src="${logo}" alt="Logo" style="max-height: 20mm; max-width: 40mm;" /></div>`;
    }
    
    // إضافة العنوان
    headerHTML += `<div class="print-title" style="font-size: 14pt; font-weight: bold;">${title}</div>`;
    
    // إضافة العنوان الفرعي إذا وجد
    if (subtitle) {
      headerHTML += `<div class="print-subtitle" style="font-size: 11pt;">${subtitle}</div>`;
    }
    
    // إضافة التاريخ إذا طلب
    if (date) {
      headerHTML += `<div class="print-date" style="font-size: 9pt; color: #555; margin-top: 2mm;">${formatDate(new Date(), 'long')}</div>`;
    }
    
    header.innerHTML = headerHTML;
  }
  
  return header;
}

/**
 * إنشاء تذييل الصفحة المطبوعة
 */
function createFooter(options: PrintOptions): HTMLElement | null {
  if (!options.footer && !options.pageNumbers) return null;
  
  const footer = document.createElement('div');
  footer.className = 'print-footer';
  
  let footerHTML = '';
  
  // إضافة نص التذييل إذا وجد
  if (options.footer) {
    footerHTML += `<div class="print-footer-text">${options.footer}</div>`;
  }
  
  // إضافة ترقيم الصفحات إذا طلب
  if (options.pageNumbers) {
    const pageLabel = i18n.language === 'ar' ? 'صفحة' : 'Page';
    footerHTML += `<div class="print-page-number">${pageLabel} <span class="page-number"></span></div>`;
  }
  
  footer.innerHTML = footerHTML;
  return footer;
}

/**
 * دالة الطباعة المحسنة
 * تقوم بطباعة عنصر محدد مع إعدادات كاملة للطباعة
 */
export function enhancedPrint(options: PrintOptions = {}): void {
  // حفظ حالة الستايل الأصلية
  const originalStyle = document.body.style.cssText;
  
  // استدعاء دالة ما قبل الطباعة إذا وجدت
  if (options.beforePrint) {
    options.beforePrint();
  }
  
  // تحديد العنصر المراد طباعته
  const selector = options.selector || '[role="dialog"] > div > div';
  const content = document.querySelector(selector);
  
  // إذا لم يوجد المحتوى، نتوقف
  if (!content) {
    console.error(`محتوى الطباعة غير موجود: ${selector}`);
    return;
  }
  
  // إنشاء ستايل الطباعة
  const printStyle = createPrintStyle(options);
  
  // إضافة الستايل إلى رأس الصفحة
  document.head.appendChild(printStyle);
  
  // إضافة الترويسة إذا طلبت
  const header = createHeader(options);
  if (header) {
    document.body.appendChild(header);
  }
  
  // إضافة التذييل إذا طلب
  const footer = createFooter(options);
  if (footer) {
    document.body.appendChild(footer);
  }
  
  // إضافة كلاس للمحتوى
  if (content) {
    content.classList.add('print-content');
  }
  
  // تطبيق كلاسات خاصة للجداول
  if (options.tables?.repeatHeaders) {
    document.querySelectorAll('table').forEach(table => {
      const thead = table.querySelector('thead');
      if (thead) {
        thead.classList.add('print-repeat-header');
      }
    });
  }
  
  // طباعة المحتوى
  console.log("بدء طباعة المحتوى");
  window.print();
  
  // تنظيف بعد الطباعة
  setTimeout(() => {
    // إزالة العناصر المضافة
    if (header) document.body.removeChild(header);
    if (footer) document.body.removeChild(footer);
    document.head.removeChild(printStyle);
    
    // استعادة حالة الستايل الأصلية
    document.body.style.cssText = originalStyle;
    
    // إزالة الكلاسات المضافة
    if (content) {
      content.classList.remove('print-content');
    }
    
    // استدعاء دالة ما بعد الطباعة إذا وجدت
    if (options.afterPrint) {
      options.afterPrint();
    }
    
    console.log("تمت عملية الطباعة بنجاح");
  }, 1000);
}

/**
 * دالة مبسطة للطباعة السريعة
 */
export function quickPrint(selector: string): void {
  enhancedPrint({ selector });
}

/**
 * دالة الطباعة المباشرة بدون PDF
 * تستخدم هذه الدالة نهجاً مبسطاً للطباعة المباشرة من المتصفح
 * بدون استخدام مكتبات خارجية ومع دعم كامل للغة العربية
 */
/**
 * الطباعة المباشرة من نافذة المتصفح
 * طباعة مباشرة للمحتوى HTML مع تحويل الأرقام العربية إلى إنجليزية
 */
export function directPrint(htmlContent: string, options: {
  title?: string;
  orientation?: 'portrait' | 'landscape';
  paperSize?: 'a4' | 'a3' | 'letter' | 'legal';
  rtl?: boolean;
  customStyles?: string;
}): void {
  const {
    title = 'طباعة',
    orientation = 'portrait',
    paperSize = 'a4',
    rtl = true,
    customStyles = ''
  } = options;

  try {
    // إنشاء نافذة منبثقة للطباعة
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('الرجاء السماح بالنوافذ المنبثقة للطباعة');
      return;
    }

    // تحويل الأرقام العربية إلى إنجليزية لضمان ظهورها بشكل صحيح
    const processedContent = htmlContent
      .replace(/٠/g, '0')
      .replace(/١/g, '1')
      .replace(/٢/g, '2')
      .replace(/٣/g, '3')
      .replace(/٤/g, '4')
      .replace(/٥/g, '5')
      .replace(/٦/g, '6')
      .replace(/٧/g, '7')
      .replace(/٨/g, '8')
      .replace(/٩/g, '9');

    // إعداد الستايل الأساسي للطباعة
    const basicStyles = `
      @page { 
        size: ${paperSize} ${orientation}; 
        margin: 1.5cm; 
      }
      
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;700&display=swap');
      
      * {
        box-sizing: border-box;
        font-family: 'Noto Sans Arabic', Arial, Tahoma, sans-serif !important;
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      body {
        direction: ${rtl ? 'rtl' : 'ltr'};
        text-align: ${rtl ? 'right' : 'left'};
        padding: 20px;
        background-color: white;
        color: black;
        line-height: 1.5;
      }
      
      h1, h2, h3, h4, h5, h6 {
        color: #333;
        margin-top: 0.5em;
        margin-bottom: 0.5em;
      }
      
      .print-header {
        text-align: center;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 1px solid #ddd;
      }
      
      .print-title {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 5px;
      }
      
      .print-subtitle {
        font-size: 16px;
        color: #666;
        margin-bottom: 5px;
      }
      
      .print-date {
        font-size: 14px;
        color: #666;
      }
      
      .print-footer {
        text-align: center;
        margin-top: 30px;
        padding-top: 10px;
        border-top: 1px solid #ddd;
        font-size: 12px;
        color: #666;
      }
      
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 15px 0;
      }
      
      table, th, td {
        border: 1px solid #ddd;
      }
      
      th {
        background-color: #f2f2f2;
        padding: 10px;
        font-weight: bold;
      }
      
      td {
        padding: 10px;
      }
      
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .text-left { text-align: left; }
      .text-bold { font-weight: bold; }
      
      .negative { color: #e53e3e; }
      .positive { color: #38a169; }
      
      @media print {
        body { font-size: 12pt; }
        button, .no-print { display: none !important; }
        
        /* تكرار رؤوس الجداول عند طباعة صفحات متعددة */
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }
        
        /* منع انقسام الصفوف بين الصفحات */
        tr { page-break-inside: avoid; }
      }
      
      ${customStyles}
    `;

    // إعداد محتوى HTML للطباعة
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${rtl ? 'rtl' : 'ltr'}" lang="${rtl ? 'ar' : 'en'}">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>${basicStyles}</style>
      </head>
      <body>
        ${processedContent}
      </body>
      </html>
    `);

    // إغلاق وثيقة النافذة للتحضير للطباعة
    printWindow.document.close();

    // تنفيذ الطباعة بعد تحميل المحتوى بالكامل
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 1000);
  } catch (error) {
    console.error("حدث خطأ أثناء الطباعة:", error);
    alert('حدث خطأ أثناء الطباعة. حاول مرة أخرى.');
  }
}

/**
 * وظيفة للطباعة المباشرة من نافذة الطباعة المحلية
 * تقوم بتحويل البيانات الجدولية إلى HTML وتفتح نافذة الطباعة المحلية مباشرة
 * مع ضمان عرض الأرقام بالصيغة الإنجليزية
 * 
 * @param data البيانات المراد طباعتها
 * @param config إعدادات الطباعة
 */
export function directWindowPrint(data: any[], config: {
  title: string;
  headers: { key: string; label: string; width?: number }[];
  format?: 'A4' | 'A3' | 'letter';
  orientation?: 'portrait' | 'landscape';
  logo?: string;
  footer?: string;
  arabicEnabled?: boolean;
}): void {
  const isArabic = true; // قم بتغييرها حسب إعدادات اللغة المفضلة
  
  try {
    // تحويل الأرقام العربية إلى إنجليزية
    const formatNumber = (value: any): string => {
      if (value === null || value === undefined) return '';
      
      if (typeof value === 'number') {
        // تنسيق الأرقام وإضافة الفواصل
        return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      } else if (typeof value === 'string') {
        // استبدال الأرقام العربية بالإنجليزية
        return value
          .replace(/٠/g, '0')
          .replace(/١/g, '1')
          .replace(/٢/g, '2')
          .replace(/٣/g, '3')
          .replace(/٤/g, '4')
          .replace(/٥/g, '5')
          .replace(/٦/g, '6')
          .replace(/٧/g, '7')
          .replace(/٨/g, '8')
          .replace(/٩/g, '9');
      }
      
      return String(value);
    };
    
    // إنشاء محتوى HTML كامل للطباعة
    let htmlContent = `
      <div class="print-container">
        <div class="print-header">
          <div class="print-title">${config.title}</div>
          ${config.logo ? `<img src="${config.logo}" alt="Logo" class="print-logo" />` : ''}
          <div class="print-date">${new Date().toLocaleDateString('en-US')}</div>
        </div>
        
        <table dir="${isArabic ? 'rtl' : 'ltr'}" class="print-table">
          <thead>
            <tr>
              ${config.headers.map(header => `<th>${header.label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map(row => {
              return `<tr>
                ${config.headers.map(header => {
                  const value = row[header.key];
                  let displayValue = formatNumber(value);
                  
                  // تنسيق خاص للأرقام السالبة والموجبة
                  if (typeof value === 'number') {
                    if (value < 0 && (header.key.includes('discrepancy') || header.key === 'difference')) {
                      return `<td class="negative">عجز ${Math.abs(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</td>`;
                    } else if (value > 0 && (header.key.includes('discrepancy') || header.key === 'difference')) {
                      return `<td class="positive">زيادة ${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</td>`;
                    }
                  }
                  
                  // معالجة خاصة للتوقيع
                  if (header.key === 'signature' && value && value.toString().length > 100) {
                    return `<td>✓ تم التوقيع</td>`;
                  }
                  
                  return `<td>${displayValue}</td>`;
                }).join('')}
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        
        ${config.footer ? `<div class="print-footer">${config.footer}</div>` : ''}
      </div>
    `;
    
    // فتح نافذة الطباعة
    directPrint(htmlContent, {
      title: config.title,
      orientation: config.orientation?.toLowerCase() as 'portrait' | 'landscape' || 'portrait',
      paperSize: config.format?.toLowerCase() as 'a4' | 'a3' | 'letter' | 'legal' || 'a4',
      rtl: isArabic,
      customStyles: `
        .print-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1.5em;
        }
        .print-table th, .print-table td {
          padding: 8px;
          border: 1px solid #ccc;
          text-align: ${isArabic ? 'right' : 'left'};
        }
        .print-table th {
          background-color: #f2f2f2;
          font-weight: bold;
        }
        .print-logo {
          max-height: 60px;
          margin-bottom: 10px;
        }
        .negative {
          color: #e53e3e;
        }
        .positive {
          color: #38a169;
        }
      `
    });
  } catch (error) {
    console.error("حدث خطأ أثناء تحضير الطباعة:", error);
    alert('حدث خطأ أثناء تحضير الطباعة. حاول مرة أخرى.');
  }
}

/**
 * دالة طباعة تقرير احترافي
 */
export function printReport(options: PrintOptions): void {
  // تعيين قيم افتراضية للتقارير
  const defaultHeader = {
    title: i18n.language === 'ar' ? 'تقرير بتر بيكري' : 'Butter Bakery Report',
    date: true
  };
  
  const defaultOptions: PrintOptions = {
    paperSize: 'a4',
    orientation: 'portrait',
    pageNumbers: true,
    hideControls: true,
    tables: {
      repeatHeaders: true,
      preventRowSplit: true
    },
    header: defaultHeader,
    footer: i18n.language === 'ar' 
      ? 'تم إنشاء هذا التقرير بواسطة نظام بتر بيكري' 
      : 'Generated by Butter Bakery System'
  };
  
  // بناء الإعدادات النهائية خطوة بخطوة
  let finalOptions = { ...defaultOptions };
  
  // نسخ الخيارات المرسلة (باستثناء header لأنه سيتم معالجته بشكل خاص)
  if (options) {
    for (const key in options) {
      if (key !== 'header') {
        (finalOptions as any)[key] = (options as any)[key];
      }
    }
  }
  
  // معالجة خاصة لخيار الترويسة
  if (options && options.header) {
    if (typeof options.header === 'string') {
      finalOptions.header = options.header;
    } else if (typeof options.header === 'object') {
      finalOptions.header = {
        ...defaultHeader,
        ...options.header
      };
    }
  }
  
  // استخدام الإعدادات النهائية
  enhancedPrint(finalOptions);
}