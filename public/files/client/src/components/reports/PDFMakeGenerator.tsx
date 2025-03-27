// استيراد المكتبات الضرورية
import { ExportableData, ExportConfig } from './ExportUtils';
import { formatCurrency } from '@/lib/utils';
import i18n from '@/lib/i18n';

/**
 * ملاحظة هامة: 
 * تم تعطيل استخدام PDFMake وتعديل الكود ليعتمد فقط على jsPDF مباشرة
 * لذلك لن يتم استخدام هذا الملف بعد الآن وتم إعادة كتابة وظيفة التصدير
 * في ملف ExportUtils.tsx
 */

// هذه المتغيرات الوهمية فقط لمنع أخطاء التنفيذ في حالة تم استدعاء هذا الملف
const pdfMake = {
  fonts: {},
  vfs: {},
  createPdf: function(docDefinition: any) {
    return {
      download: (fileName?: string, cb?: () => void) => {
        console.log('PDF download placeholder', fileName);
        if (cb) cb();
        return;
      },
      print: (options?: any) => console.log('PDF print placeholder', options),
      open: (options?: any, win?: Window | null) => console.log('PDF open placeholder', options),
      getDataUrl: (cb?: (result: string) => void) => cb && cb(''),
      getBase64: (cb?: (result: string) => void) => cb && cb(''),
      getBuffer: (cb?: (result: ArrayBuffer) => void) => cb && cb(new ArrayBuffer(0)),
      getBlob: (cb?: (result: Blob) => void) => cb && cb(new Blob())
    };
  }
};

/**
 * دالة بسيطة وفعالة لمعالجة النص العربي في PDFMake
 * تستخدم رموز BIDI للتحكم في اتجاه النص
 * مع الحفاظ على الأرقام بالصيغة الإنجليزية
 */
function reshapeArabicText(text: string | number | undefined | null): string {
  if (text === undefined || text === null) return '';
  
  // تحويل النص إلى سلسلة نصية
  const textStr = typeof text === 'string' ? text : String(text);
  
  // التحقق مما إذا كان النص يحتوي على أرقام وعلامات عشرية وفواصل فقط
  if (/^-?[\d,.]+$/.test(textStr)) {
    // نرجع الأرقام كما هي بدون تغيير (بصيغة أرقام إنجليزية)
    return textStr;
  }
  
  // التحقق إذا كان النص يحتوي على أحرف عربية
  const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDCF\uFDF0-\uFDFF\uFE70-\uFEFF]/.test(textStr);
  
  // استبدال الأرقام العربية في النص بأرقام إنجليزية
  let processedText = textStr;
  
  // إذا كان النص يحتوي على أرقام عربية، نحولها إلى أرقام إنجليزية
  if (hasArabic) {
    processedText = textStr
      .replace(/٠/g, '0')
      .replace(/١/g, '1')
      .replace(/٢/g, '2')
      .replace(/٣/g, '3')
      .replace(/٤/g, '4')
      .replace(/٥/g, '5')
      .replace(/٦/g, '6')
      .replace(/٧/g, '7')
      .replace(/٨/g, '8')
      .replace(/٩/g, '9')
      .replace(/٫/g, '.');
      
    // استخدام رموز BIDI للتحكم في اتجاه النص العربي
    // U+200F هو علامة من اليمين إلى اليسار (RLM)
    return `\u200F${processedText}`;
  }
  
  // إذا كان النص لا يحتوي على عربية (إنجليزي أو أرقام فقط)، نرجعه كما هو
  return processedText;
}

// تحديد الخطوط مع تحسين دعم الخطوط العربية
const fonts = {
  // خط نوتو سانس العربي - خط رئيسي للمحتوى العربي
  'NotoSansArabic': {
    normal: 'NotoSansArabic-Regular.ttf',
    bold: 'NotoSansArabic-Regular.ttf',
    italics: 'NotoSansArabic-Regular.ttf',
    bolditalics: 'NotoSansArabic-Regular.ttf'
  },
  // خط Arial مضاف كاحتياطي للنصوص غير العربية
  'Roboto': {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  }
};

/**
 * تكوين الوثيقة مع تحسينات محسنة للغة العربية/الإنجليزية
 * تم إعادة تصميم وتحسين هذه الدالة لدعم أفضل للتقارير ثنائية اللغة
 */
function getDocumentConfiguration() {
  // تحديد اللغة الحالية
  const isArabic = i18n.language === 'ar';
  
  return {
    // تعيين إعدادات النص الافتراضية
    defaultStyle: {
      font: isArabic ? 'NotoSansArabic' : 'Roboto', // اختيار الخط المناسب للغة
      fontSize: 10,          // تصغير حجم الخط للحصول على مظهر أكثر احترافية
      lineHeight: 1.3,       // تباعد أسطر محسن للمظهر الاحترافي
      alignment: isArabic ? 'right' : 'left', // محاذاة حسب اللغة
    },
    // إعدادات الصفحة - استخدام هوامش أفضل للصفحة
    pageSize: 'A4',
    pageOrientation: 'portrait', // وضع الصفحة
    pageMargins: [20, 40, 20, 40] as [number, number, number, number], // هوامش محسنة
    
    // اتجاه النص العام
    rtl: isArabic,
    
    // إعدادات PDF الإضافية
    info: {
      title: isArabic ? 'تقرير بتر بيكري' : 'Butter Bakery Report',
      author: isArabic ? 'نظام بتر بيكري' : 'Butter Bakery System',
      subject: isArabic ? 'تقرير مبيعات' : 'Sales Report',
      keywords: isArabic ? 'تقرير,مبيعات,محاسبة,بتر بيكري' : 'report,sales,accounting,butter bakery',
      creator: 'Butter Bakery Management System'
    }
  };
}

// احصل على التكوين الافتراضي للوثيقة
const defaultDocumentConfiguration = getDocumentConfiguration();

// دمج إعدادات pdfMake
pdfMake.fonts = fonts;
pdfMake.vfs = {};

// انشاء PDFMaker كائن بإعدادات وخطوط عربية
const virtualPdfMake = pdfMake;

/**
 * إنشاء تقرير PDF باستخدام PDFMake مع دعم كامل للغة العربية
 * نسخة محسنة تماماً مع معالجة أكثر ذكاءً للنصوص العربية وتنسيق أفضل
 * 
 * @param data بيانات التقرير
 * @param config إعدادات التقرير
 * @param fileName اسم الملف (اختياري)
 */
/**
 * إنشاء تقرير PDF محسن مع دعم طباعة صفحات محددة
 * نسخة محسنة تماماً مع تصميم جذري جديد وتحسين معالجة اللغة العربية
 * 
 * @param data بيانات التقرير
 * @param config إعدادات التقرير
 * @param fileName اسم الملف (اختياري)
 * @param printOptions خيارات الطباعة مثل تحديد الصفحات (اختياري)
 */
export const generateArabicPDF = (
  data: ExportableData, 
  config: ExportConfig, 
  fileName?: string,
  printOptions?: { 
    print?: boolean; 
    pageRanges?: string;  // مثال: "1-3, 5, 8"
  }
) => {
  // إعادة تعيين إعدادات التوثيق بناءً على اللغة الحالية
  const docConfig = getDocumentConfiguration();
  try {
    // تسجيل بداية عملية إنشاء PDF للتشخيص
    console.log(`Generating PDF for: ${config.title}`, {
      dataSize: data.length,
      headers: config.headers.length,
      fileName: fileName || config.fileName
    });

    // استخراج البيانات الأساسية للتقرير
    const branchName = config.footer && config.footer.includes(':') ? 
      config.footer.split(':')[1]?.trim() : undefined;

    // استخراج بيانات المجموع إذا وجدت
    const totalRow = data.find((item: any) => 
      item.cashierName?.includes('المجموع') || 
      (typeof item.id === 'number' && item.id === 0)
    );

    // تحضير رؤوس الجدول مع معالجة النص العربي
    const tableHeaders = config.headers.map(header => ({
      text: reshapeArabicText(header.label),
      style: 'tableHeader',
      alignment: 'center'
    }));

    // تحضير صفوف الجدول
    const tableRows = data.map((item: any) => {
      const isTotal = item.cashierName?.includes('المجموع') || 
                    (typeof item.id === 'number' && item.id === 0);

      return config.headers.map(header => {
        let cellValue = item[header.key];
        let cellStyle: string[] = isTotal ? ['totalCell'] : [];

        // معالجة خاصة للتوقيع - نستبدل أي صورة توقيع بعلامة صح للبساطة 
        // وتجنب مشاكل معالجة الصور الطويلة في PDF
        if (header.key === 'signature' && cellValue) {
          // نتحقق إذا كانت قيمة خلية هي رابط صورة
          if (typeof cellValue === 'string' && 
             (cellValue.startsWith('data:image') || cellValue.length > 200)) {
            cellValue = '✓ تم التوقيع';
          }
        }

        // معالجة خاصة للفرق (عجز/زيادة)
        const isDiscrepancy = header.key === 'discrepancy' || header.key === 'cashDiscrepancy';
        
        if (isDiscrepancy && cellValue) {
          const value = parseFloat(String(cellValue));
          if (value < 0) {
            cellStyle.push('negativeAmount');
            cellValue = `عجز ${Math.abs(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
          } else if (value > 0) {
            cellStyle.push('positiveAmount');
            cellValue = `زيادة ${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
          }
        }

        // تنسيق القيم الرقمية للجدول
        if (typeof cellValue === 'number' && !isNaN(cellValue) && header.key !== 'id') {
          if (header.key.includes('percentage')) {
            cellValue = `${cellValue}%`;
          } else {
            // استخدام تنسيق الأرقام بطريقة أكثر توافقية
            cellValue = cellValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
          }
        }

        // تحديد محاذاة الخلية
        let alignment = 'center'; // تغيير القيمة الافتراضية إلى وسط
        
        // تفعيل محاذاة خاصة لحقول معينة
        if (['name', 'branchName', 'cashierName', 'notes', 'shiftType'].includes(header.key)) {
          alignment = 'right'; // محاذاة النص العربي لليمين
        } else if (['totalCashSales', 'totalNetworkSales', 'totalSales', 'amount', 
                   'discrepancy', 'price', 'target', 'ticket', 'percentage'].some(k => header.key.includes(k))) {
          // محاذاة القيم الرقمية للمركز
          alignment = 'center';
        }

        // معالجة النص العربي لكل الحقول المناسبة
        let finalText;
        
        // قائمة الحقول التي تحتاج لمعالجة نص عربي
        const needsArabicReformatting = [
          'name', 'branchName', 'cashierName', 'status', 'notes', 'shiftType'
        ];
        
        if (typeof cellValue === 'string' && 
            (needsArabicReformatting.includes(header.key) || 
             cellValue.includes('عجز') || 
             cellValue.includes('زيادة'))) {
          finalText = reshapeArabicText(cellValue);
        } else {
          finalText = cellValue || '';
        }

        return { 
          text: finalText, 
          style: cellStyle, 
          alignment 
        };
      });
    });

    // إنشاء محتوى المستند
    const docDefinition = {
      // تعيين اتجاه المستند حسب اللغة الحالية
      ...docConfig,
      // محتوى المستند
      content: [
        // رأس التقرير مع معلومات الشركة
        {
          columns: [
            {
              width: '*',
              text: ''
            },
            {
              width: 'auto',
              stack: [
                { text: reshapeArabicText('بتر بيكري للحلويات'), style: 'companyName' },
                { text: reshapeArabicText('س.ت: 1234567890'), style: 'companyDetail' },
                { text: reshapeArabicText('ر.ض: 301234567800003'), style: 'companyDetail' }
              ],
              alignment: 'right'
            }
          ],
          marginBottom: 20
        },
        // عنوان التقرير الرئيسي
        {
          text: reshapeArabicText(config.title),
          style: 'header',
          alignment: 'center',
          marginBottom: 10
        },
        // معلومات إضافية (الفرع والتاريخ)
        branchName ? {
          text: reshapeArabicText(`الفرع: ${branchName}`),
          style: 'subheader',
          alignment: 'center',
          marginBottom: 5
        } : null,
        {
          text: reshapeArabicText(`تاريخ التقرير: ${new Date().toLocaleDateString('en-US')}`),
          style: 'subheader',
          alignment: 'center',
          marginBottom: 20
        },
        // ملخص مالي إذا كان هناك صف للمجموع
        totalRow ? {
          style: 'summaryBox',
          stack: [
            { text: reshapeArabicText('الملخص المالي'), style: 'summaryTitle', alignment: 'center' },
            {
              columns: [
                { 
                  width: '*',
                  stack: [
                    // المبيعات النقدية
                    {
                      columns: [
                        { width: '*', text: reshapeArabicText('المبيعات النقدية:'), style: 'summaryLabel' },
                        { 
                          width: 'auto', 
                          text: typeof totalRow.totalCashSales === 'number' ? 
                            totalRow.totalCashSales.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") : 
                            totalRow.totalCashSales || '0', 
                          style: 'summaryValue' 
                        }
                      ],
                      marginBottom: 5
                    },
                    // مبيعات الشبكة
                    {
                      columns: [
                        { width: '*', text: reshapeArabicText('مبيعات الشبكة:'), style: 'summaryLabel' },
                        { 
                          width: 'auto', 
                          text: typeof totalRow.totalNetworkSales === 'number' ? 
                            totalRow.totalNetworkSales.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") : 
                            totalRow.totalNetworkSales || '0', 
                          style: 'summaryValue' 
                        }
                      ],
                      marginBottom: 5
                    },
                    // فاصل
                    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 1, lineColor: '#dddddd' }], marginBottom: 5 },
                    // إجمالي المبيعات
                    {
                      columns: [
                        { width: '*', text: reshapeArabicText('إجمالي المبيعات:'), style: ['summaryLabel', 'bold'] },
                        { 
                          width: 'auto', 
                          text: typeof totalRow.totalSales === 'number' ? 
                            totalRow.totalSales.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") : 
                            totalRow.totalSales || '0', 
                          style: ['summaryValue', 'bold'] 
                        }
                      ],
                      marginBottom: 10
                    },
                  ]
                },
                // العمود الثاني
                { 
                  width: '*',
                  stack: [
                    // عدد المعاملات
                    totalRow.totalTransactions ? {
                      columns: [
                        { width: '*', text: reshapeArabicText('عدد المعاملات:'), style: 'summaryLabel' },
                        { 
                          width: 'auto', 
                          text: typeof totalRow.totalTransactions === 'number' ? 
                            String(totalRow.totalTransactions) : 
                            totalRow.totalTransactions, 
                          style: 'summaryValue' 
                        }
                      ],
                      marginBottom: 5
                    } : null,
                    // متوسط قيمة الفاتورة
                    totalRow.averageTicket ? {
                      columns: [
                        { width: '*', text: reshapeArabicText('متوسط قيمة الفاتورة:'), style: 'summaryLabel' },
                        { 
                          width: 'auto', 
                          text: typeof totalRow.averageTicket === 'number' ? 
                            totalRow.averageTicket.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") : 
                            totalRow.averageTicket, 
                          style: 'summaryValue' 
                        }
                      ],
                      marginBottom: 5
                    } : null,
                    // فاصل
                    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 1, lineColor: '#dddddd' }], marginBottom: 5 },
                    // فروقات الصندوق
                    totalRow.discrepancy && totalRow.discrepancy !== 0 ? {
                      columns: [
                        { width: '*', text: reshapeArabicText('فروقات الصندوق:'), style: 'summaryLabel' },
                        { 
                          width: 'auto', 
                          text: typeof totalRow.discrepancy === 'number' ? 
                            parseFloat(String(totalRow.discrepancy)) < 0 ?
                              reshapeArabicText(`عجز ${Math.abs(parseFloat(String(totalRow.discrepancy))).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`) :
                              reshapeArabicText(`زيادة ${Math.abs(parseFloat(String(totalRow.discrepancy))).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`) :
                            totalRow.discrepancy,
                          style: [
                            'summaryValue', 
                            parseFloat(String(totalRow.discrepancy)) < 0 ? 'negativeAmount' : 'positiveAmount'
                          ]
                        }
                      ],
                      marginBottom: 5
                    } : null,
                  ]
                }
              ]
            }
          ],
          marginBottom: 20
        } : null,
        // جدول البيانات التفصيلي
        {
          table: {
            // تنسيق العرض بناءً على الأعمدة المحددة
            widths: config.headers.map(header => header.width ? `${header.width}%` : '*'),
            headerRows: 1,
            // رؤوس وصفوف الجدول
            body: [tableHeaders, ...tableRows]
          },
          layout: {
            fillColor: function(rowIndex: number, node: any, columnIndex: any) {
              if (rowIndex === 0) {
                return '#374785'; // لون خلفية رأس الجدول
              } 
              // خلفية صف المجموع
              if (rowIndex > 0 && tableRows[rowIndex-1].some(cell => 
                (cell.style && Array.isArray(cell.style) && cell.style.includes('totalCell')))) {
                return '#f0f0e0';
              }
              // خلفية الصفوف البديلة
              return rowIndex % 2 === 0 ? '#f5f5fa' : null;
            },
            // تخصيص الحدود
            hLineWidth: function(i: number, node: any) { return 0.5; },
            vLineWidth: function(i: number, node: any) { return 0.5; },
            hLineColor: function(i: number, node: any) { return '#dddddd'; },
            vLineColor: function(i: number, node: any) { return '#dddddd'; },
          }
        },
        // تذييل المستند
        {
          text: reshapeArabicText('هذا التقرير وثيقة رسمية وسرية. جميع الحقوق محفوظة لشركة بتر بيكري © 2025'),
          style: 'footer',
          alignment: 'center',
          marginTop: 30
        }
      ],
      // ترويسة وتذييل المستند
      header: function(currentPage: number, pageCount: number, pageSize: any) {
        return [
          {
            text: reshapeArabicText(`Page ${currentPage} of ${pageCount}`),
            alignment: 'left',
            margin: [40, 20, 40, 0],
            fontSize: 8,
            color: '#888888'
          }
        ];
      },
      // تعريف الأنماط
      styles: {
        header: {
          fontSize: 22,
          bold: true,
          color: '#374785',
          marginBottom: 10
        },
        subheader: {
          fontSize: 14,
          color: '#666666',
          marginBottom: 5
        },
        companyName: {
          fontSize: 16,
          bold: true,
          color: '#333333',
          marginBottom: 5
        },
        companyDetail: {
          fontSize: 10,
          color: '#666666',
          marginBottom: 2
        },
        tableHeader: {
          fontSize: 12,
          bold: true,
          color: 'white',
          margin: [0, 5, 0, 5]
        },
        totalCell: {
          bold: true,
          fontSize: 11
        },
        negativeAmount: {
          color: '#b00000'
        },
        positiveAmount: {
          color: '#007800'
        },
        summaryBox: {
          margin: [0, 0, 0, 20],
          padding: 10,
          background: '#f9f9ff',
          border: [1, 1, 1, 1],
          borderColor: '#ddddee',
          borderRadius: 3
        },
        summaryTitle: {
          fontSize: 16,
          bold: true,
          color: '#374785',
          marginBottom: 10
        },
        summaryLabel: {
          fontSize: 12,
          color: '#666666'
        },
        summaryValue: {
          fontSize: 12,
          bold: true,
          color: '#333333'
        },
        footer: {
          fontSize: 8,
          color: '#888888',
          marginTop: 20
        },
        bold: {
          bold: true
        }
      }
    };

    // تحضير اسم الملف
    const outputFileName = fileName || `${config.fileName || 'report'}.pdf`;

    // إنشاء وتحميل أو طباعة ملف PDF
    try {
      // إنشاء كائن PDF (استخدام الدالة البديلة لمنع الأخطاء)
      const pdfDoc = virtualPdfMake.createPdf(docDefinition);
      
      // تحديد العملية المطلوبة (تنزيل أو طباعة)
      if (printOptions?.print) {
        try {
          // نهج مبسط: تنزيل الملف مباشرة ثم إظهار رسالة للطباعة
          const fileName = `${outputFileName}_print.pdf`;
          console.log("Downloading PDF for printing");
          
          // عرض توجيهات للمستخدم
          setTimeout(() => {
            // تجنب استخدام alert هنا لأنه قد يتسبب في خطأ في التشغيل
            console.log("تم تنزيل ملف PDF للطباعة");
          }, 1000);
          
          // تنزيل الملف مباشرة
          pdfDoc.download(fileName);
        } catch (printErr) {
          console.error("Error in print function:", printErr);
          
          // محاولة أخيرة - تنزيل الملف بالطريقة العادية
          pdfDoc.download(outputFileName);
          console.error("حدث خطأ أثناء التنزيل، تم الاعتماد على طريقة التنزيل البديلة");
        }
      } else {
        // تنزيل المستند كملف PDF
        pdfDoc.download(outputFileName);
      }
    } catch (pdfErr) {
      console.error('Error creating PDF document:', pdfErr);
      console.error('حدث خطأ أثناء إنشاء ملف PDF. يرجى المحاولة مرة أخرى.');
    }
  } catch (error) {
    console.error('Failed to generate Arabic PDF:', error);
    console.error('حدث خطأ أثناء إنشاء ملف PDF. الرجاء المحاولة مرة أخرى.');
  }
};