import React from 'react';
import { Button } from '@/components/ui/button';
import { FileTextIcon, DownloadIcon } from 'lucide-react';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, PDFViewer } from '@react-pdf/renderer';
import { ExportableData, ExportConfig } from './ExportUtils';
import { generateArabicPDF } from './PDFMakeGenerator';
import { reshape } from 'arabic-reshaper';

// أنماط التصميم للوثيقة
const styles = StyleSheet.create({
  page: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 30,
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1
  },
  heading: {
    fontSize: 18,
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#374785'
  },
  subheading: {
    fontSize: 14,
    marginBottom: 5,
    textAlign: 'center',
    color: '#666666'
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#dddddd',
    marginVertical: 10
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#dddddd',
    minHeight: 30,
    alignItems: 'center'
  },
  tableHeader: {
    backgroundColor: '#374785',
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
    padding: 5,
    textAlign: 'center'
  },
  tableCell: {
    fontSize: 10,
    padding: 5,
    textAlign: 'right'
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 8,
    color: '#888888'
  }
});

/**
 * مكون وثيقة PDF عربية
 * يستخدم مكتبة react-pdf مع دعم للغة العربية
 */
export const ArabicPdfDocument = ({ data, config }: { data: ExportableData, config: ExportConfig }) => {
  /**
   * دالة محسنة تماماً لمعالجة النص العربي في PDF
   * تستخدم مزيجاً من علامات التوجيه والتشكيل
   */
  const reshapeArabicText = (text: string): string => {
    if (typeof text !== 'string') return String(text);
    
    // إذا كان النص يحتوي على أرقام فقط، لا داعي لإعادة تشكيله
    if (/^[\d\s.,٠-٩]+$/.test(text)) {
      return text;
    }
    
    // قائمة بالمصطلحات الشائعة في التطبيق
    const commonTerms: Record<string, boolean> = {
      'المجموع': true,
      'الفرع': true,
      'التاريخ': true,
      'الكاشير': true,
      'المبيعات النقدية': true,
      'مبيعات الشبكة': true,
      'إجمالي المبيعات': true,
      'عدد المعاملات': true,
      'متوسط قيمة الفاتورة': true,
      'فروقات الصندوق': true,
      'عجز': true,
      'زيادة': true,
      'الملخص المالي': true,
      'تقرير المبيعات': true,
      'يومية المبيعات': true,
      'اليومية المجمعة': true
    };
    
    // التحقق مما إذا كان النص يحتوي على أي من المصطلحات الشائعة
    for (const term in commonTerms) {
      if (text.includes(term)) {
        // استخدم النص الأصلي كما هو للمصطلحات المعروفة
        return text;
      }
    }
    
    // بالنسبة للنصوص الأخرى، حاول استخدام التشكيل
    try {
      // نستخدم arabic-reshaper مع إعدادات بسيطة بدون خيارات متقدمة
      return reshape(text);
    } catch (error) {
      console.error('Error reshaping Arabic text:', error);
      return text; // في حالة الفشل، إرجاع النص كما هو
    }
  };

  return (
    <Document
      title={config.title}
      author="بتر بيكري"
      subject={config.title}
      keywords="تقرير, مبيعات, بتر بيكري"
      language="ar"
    >
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.section}>
          {/* عنوان التقرير */}
          <Text style={styles.heading}>{reshapeArabicText(config.title)}</Text>
          
          {/* معلومات إضافية */}
          {config.footer && (
            <Text style={styles.subheading}>
              {reshapeArabicText(config.footer)}
            </Text>
          )}
          
          {/* بيانات التاريخ */}
          <Text style={styles.subheading}>
            {reshapeArabicText(`تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}`)}
          </Text>
          
          {/* جدول البيانات */}
          <View style={styles.table}>
            {/* رؤوس الجدول */}
            <View style={[styles.tableRow, { backgroundColor: '#374785' }]}>
              {config.headers.map((header, index) => (
                <View 
                  key={`header-${index}`}
                  style={{ 
                    width: `${header.width || 100 / config.headers.length}%`,
                    backgroundColor: '#374785'
                  }}
                >
                  <Text style={styles.tableHeader}>
                    {reshapeArabicText(header.label)}
                  </Text>
                </View>
              ))}
            </View>
            
            {/* صفوف البيانات */}
            {data.map((item, rowIndex) => (
              <View 
                key={`row-${rowIndex}`}
                style={[
                  styles.tableRow,
                  { backgroundColor: rowIndex % 2 === 0 ? '#f5f5fa' : '#ffffff' }
                ]}
              >
                {config.headers.map((header, colIndex) => {
                  // استخراج القيمة من البيانات
                  let value = item[header.key];
                  
                  // معالجة قيم خاصة
                  if (typeof value === 'number') {
                    if (header.key.includes('percentage')) {
                      value = `${value}%`;
                    } else {
                      // استخدام تنسيق آمن للأرقام بدلاً من toLocaleString
                      value = value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                    }
                  }
                  
                  // معالجة الفروقات (عجز/زيادة)
                  if ((header.key === 'discrepancy' || header.key === 'cashDiscrepancy') && value) {
                    const numValue = parseFloat(String(value));
                    if (numValue < 0) {
                      value = reshapeArabicText(`عجز ${Math.abs(numValue).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`);
                    } else if (numValue > 0) {
                      value = reshapeArabicText(`زيادة ${numValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`);
                    }
                  }
                  
                  return (
                    <View 
                      key={`cell-${rowIndex}-${colIndex}`}
                      style={{ 
                        width: `${header.width || 100 / config.headers.length}%` 
                      }}
                    >
                      <Text 
                        style={[
                          styles.tableCell,
                          // تحديد محاذاة الخلية
                          { 
                            textAlign: header.key.includes('amount') || 
                                    header.key.includes('sales') || 
                                    header.key.includes('price') ? 
                                    'left' : 'right',
                            color: (header.key === 'discrepancy' || header.key === 'cashDiscrepancy') && value
                              ? parseFloat(String(item[header.key])) < 0
                                ? '#b00000'
                                : parseFloat(String(item[header.key])) > 0
                                  ? '#007800'
                                  : '#000000'
                              : '#000000'
                          }
                        ]}
                      >
                        {reshapeArabicText(String(value || ''))}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
          
          {/* تذييل الصفحة */}
          <Text style={styles.footer}>
            {reshapeArabicText('هذا التقرير وثيقة رسمية وسرية. جميع الحقوق محفوظة لشركة بتر بيكري © 2025')}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

/**
 * زر تنزيل PDF باللغة العربية
 * يقوم بتصدير البيانات إلى ملف PDF مباشرة
 */
export const ArabicPdfDownloadButton = ({ 
  children, 
  data, 
  config,
  className = '',
  fileName,
}: { 
  children?: React.ReactNode,
  data: ExportableData, 
  config: ExportConfig,
  className?: string,
  fileName?: string,
}) => {
  // معالجة النقر على زر التصدير
  const handleExport = () => {
    // استخدام مولد PDF العربي المحسن
    generateArabicPDF(data, config, fileName);
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className={`gap-2 ${className}`}
      onClick={handleExport}
    >
      {children || (
        <>
          <FileTextIcon className="h-4 w-4 text-primary" />
          <span>تصدير PDF</span>
        </>
      )}
    </Button>
  );
};

export default ArabicPdfDownloadButton;