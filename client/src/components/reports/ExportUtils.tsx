import React from 'react';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
// autoTable التصريح المزدوج يسبب مشاكل - نستخدم التنسيق البديل
// import autoTable from 'jspdf-autotable';
import { formatCurrency } from '@/lib/utils';
// استيراد مكتبة معالجة النصوص العربية
import { reshape } from 'arabic-reshaper';
import * as bidi from 'bidi-js';
import { translateToEnglish, formatNumberToEnglish, formatDateToEnglish, containsArabic } from './translations';
// استيراد وظيفة الطباعة المباشرة
import { directWindowPrint } from '@/lib/printing';

// تعريف نوع MeasureText لتفادي أخطاء التوافق مع jsPDF
interface MeasureText {
  w: number;
  h: number;
};

// التعامل مع أخطاء الوعود غير المعالجة
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // منع الأخطاء من الظهور في وحدة التحكم
  event.preventDefault();
});

// أنواع البيانات للتصدير
export type ExportableData = Record<string, any>[];

// إعدادات التصدير
export interface ExportConfig {
  fileName: string;
  title: string;
  headers: {
    key: string;
    label: string;
    width?: number;
  }[];
  format?: 'A4' | 'A3' | 'letter';
  orientation?: 'portrait' | 'landscape';
  logo?: string;
  footer?: string;
  arabicEnabled?: boolean;
}

/**
 * تصدير البيانات إلى ملف Excel
 */
export const exportToExcel = async (data: ExportableData, config: ExportConfig) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(config.title);

    // إضافة العنوان الرئيسي
    const titleRow = worksheet.addRow([config.title]);
    titleRow.font = { size: 16, bold: true };
    titleRow.height = 30;

    // دمج خلايا العنوان
    worksheet.mergeCells(`A1:${String.fromCharCode(64 + config.headers.length)}1`);
    titleRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // إضافة صف فارغ
    worksheet.addRow([]);

    // إضافة رؤوس الأعمدة
    const headerRow = worksheet.addRow(config.headers.map(header => header.label));
    headerRow.font = { bold: true };
    headerRow.height = 24;
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // تنسيق خلايا العناوين
    headerRow.eachCell((cell, colNumber) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // تعيين عرض الأعمدة
    config.headers.forEach((header, index) => {
      if (header.width) {
        worksheet.getColumn(index + 1).width = header.width;
      } else {
        worksheet.getColumn(index + 1).width = 15;
      }
    });

    // إضافة البيانات
    data.forEach((item, rowIndex) => {
      const rowData = config.headers.map(header => item[header.key]);
      const row = worksheet.addRow(rowData);
      row.height = 22;
      
      // تعيين محاذاة للنص العربي
      if (config.arabicEnabled) {
        row.alignment = { 
          vertical: 'middle',
          horizontal: 'right',
          readingOrder: 'rtl'
        };
      } else {
        row.alignment = { 
          vertical: 'middle'
        };
      }
      
      // تنسيق وتحديد أنماط الخلايا
      row.eachCell((cell, colNumber) => {
        const headerObj = config.headers[colNumber - 1];
        
        // تطبيق حدود الخلايا
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        
        // تنسيق خلايا الصفوف البديلة للتسهيل على العين
        if (rowIndex % 2 === 1) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF9F9F9' }
          };
        }
        
        // تنسيق خاص للأرقام والعملات
        if (typeof item[headerObj.key] === 'number') {
          // تنسيق الأرقام المالية للعرض بشكل أفضل
          if (headerObj.key.toLowerCase().includes('sales') || 
              headerObj.key.toLowerCase().includes('amount') || 
              headerObj.key.toLowerCase().includes('price') || 
              headerObj.key.toLowerCase().includes('target') || 
              headerObj.key.toLowerCase().includes('ticket') ||
              headerObj.key.toLowerCase().includes('cash')) {
            cell.numFmt = '#,##0.00 ر.س';
          } else {
            cell.numFmt = '#,##0';
          }
        }
        
        // تنسيق خاص للنسب المئوية
        if (headerObj.key.toLowerCase().includes('percentage') || 
            (typeof item[headerObj.key] === 'string' && item[headerObj.key]?.toString().endsWith('%'))) {
          cell.numFmt = '0.0%';
        }
      });
    });

    // إضافة صف فارغ قبل التذييل
    worksheet.addRow([]);
    
    // إضافة تاريخ ووقت إنشاء التقرير بتنسيق محسن
    const now = new Date();
    const dateFormat = now.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      weekday: 'long' 
    });
    const timeFormat = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    
    // صف معلومات التقرير
    const reportDateRow = worksheet.addRow([`Report Generated: ${dateFormat} at ${timeFormat}`]);
    reportDateRow.font = { name: 'Arial', size: 10, italic: true, color: { argb: '666666' } };
    worksheet.mergeCells(`A${reportDateRow.number}:${String.fromCharCode(64 + config.headers.length)}${reportDateRow.number}`);
    
    // إضافة تذييل مخصص في الملف
    if (config.footer) {
      worksheet.addRow([]);
      const footerRow = worksheet.addRow([config.footer]);
      footerRow.font = { name: 'Arial', bold: true, size: 10, color: { argb: '333333' } };
      worksheet.mergeCells(`A${footerRow.number}:${String.fromCharCode(64 + config.headers.length)}${footerRow.number}`);
      footerRow.alignment = { horizontal: 'center' };
      
      // تحسين مظهر خلية التذييل
      const footerCell = footerRow.getCell(1);
      footerCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F0F4F8' }
      };
      footerCell.border = {
        top: { style: 'thin', color: { argb: 'BFDBFE' } },
        bottom: { style: 'thin', color: { argb: 'BFDBFE' } }
      };
    }
    
    // إضافة معلومات حقوق النشر
    worksheet.addRow([]);
    const copyrightRow = worksheet.addRow([`© ${new Date().getFullYear()} Butter Bakery Management System - جميع الحقوق محفوظة`]);
    copyrightRow.font = { name: 'Arial', italic: true, size: 9, color: { argb: '888888' } };
    worksheet.mergeCells(`A${copyrightRow.number}:${String.fromCharCode(64 + config.headers.length)}${copyrightRow.number}`);
    copyrightRow.alignment = { horizontal: 'center' };

    // تصدير الملف
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${config.fileName}.xlsx`);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
  }
};

/**
 * دالة بسيطة لتصدير وطباعة تقرير - استخدام طباعة مباشرة من المتصفح
 * تم تحسين الدالة لاستخدام النافذة المباشرة بدل تنزيل PDF
 */
export const exportToPdf = (data: ExportableData, config: ExportConfig) => {
  try {
    console.log("Opening direct print window");
    
    // استدعاء وظيفة الطباعة المباشرة من النافذة
    directWindowPrint(data, {
      title: config.title,
      headers: config.headers,
      format: config.format || 'A4',
      orientation: config.orientation || 'landscape',
      logo: config.logo,
      footer: config.footer,
      arabicEnabled: config.arabicEnabled
    });
    
    return;
    
    // الكود التالي تم الاحتفاظ به كاحتياطي فقط (لن يتم تنفيذه)
    // في حال الرغبة بالعودة لاستخدام PDF بدلاً من الطباعة المباشرة
    
    // تنزيل الملف باسم مناسب
    const filename = config.fileName 
      ? config.fileName.replace(/\s+/g, '_') 
      : 'report_' + new Date().toISOString().split('T')[0];
    
    // إنشاء مستند PDF جديد بالحجم المناسب
    const doc = new jsPDF({
      orientation: config.orientation || 'landscape',
      unit: 'mm',
      format: config.format || 'a4',
      hotfixes: ["px_scaling"] // إصلاح لمشكلة مقياس البكسل
    });
    
    // تعيين خصائص المستند
    doc.setProperties({
      title: config.title,
      subject: "تقرير - Butter Bakery",
      creator: "Butter Bakery System",
      author: "Butter Bakery"
    });
    
    // إعداد عنوان التقرير
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    
    // الصفحة بأكملها
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // رسم إطار خفيف للصفحة
    doc.setDrawColor(150, 150, 190);
    doc.setLineWidth(0.3);
    doc.rect(5, 5, pageWidth - 10, pageHeight - 10);
    
    // إضافة شريط علوي مميز
    doc.setFillColor(240, 240, 250);
    doc.rect(5, 5, pageWidth - 10, 15, 'F');
    
    // عنوان التقرير بتنسيق محسن
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(50, 50, 100);
    
    // ترجمة العنوان إلى الإنجليزية
    let reportTitle = translateToEnglish(config.title);
    
    // استخدام النص المترجم
    doc.text(reportTitle || "Sales Report", pageWidth / 2, 14, { align: 'center' });
    
    // إضافة شعار الشركة (نص فقط لعدم وجود صورة)
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Butter Bakery", 15, 10);
    
    // رسم خط تحت العنوان
    doc.setDrawColor(100, 100, 160);
    doc.setLineWidth(0.3);
    doc.line(20, 20, pageWidth - 20, 20);
    
    // إضافة معلومات التقرير
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Report Date: ${new Date().toLocaleDateString('en-US')}`, 15, 25);
    
    // إضافة معلومات الفرع إذا كان متاحًا
    if (data.length > 0 && data[0].branchName) {
      // تحويل النص العربي للاتجاه المناسب
      const branchText = data[0].branchName;
      doc.text(`Branch: ${branchText}`, pageWidth - 15, 25, { align: 'right' });
    }
    
    // رسم الجدول
    const tableTop = 35;
    const cellPadding = 3;
    const colWidth = (pageWidth - 20) / config.headers.length;
    
    // رسم رؤوس الجدول بتدرج لوني
    const gradientFill = {
      start: [230, 230, 250],
      end: [210, 210, 240]
    };
    
    // إنشاء خلفية مميزة لرأس الجدول
    doc.setFillColor(gradientFill.start[0], gradientFill.start[1], gradientFill.start[2]);
    doc.rect(10, tableTop, pageWidth - 20, 10, 'F');
    
    // إطار الجدول بلون داكن قليلاً
    doc.setDrawColor(100, 100, 150);
    doc.setLineWidth(0.3);
    
    // رسم خطوط عمودية للأعمدة
    for (let i = 0; i <= config.headers.length; i++) {
      doc.line(10 + i * colWidth, tableTop, 10 + i * colWidth, tableTop + 10);
    }
    
    // رسم خط أفقي فوق الرؤوس
    doc.line(10, tableTop, pageWidth - 10, tableTop);
    
    // رسم خط أفقي تحت الرؤوس
    doc.line(10, tableTop + 10, pageWidth - 10, tableTop + 10);
    
    // كتابة عناوين الأعمدة
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    
    config.headers.forEach((header, i) => {
      // تحويل عناوين الأعمدة إلى الإنجليزية باستخدام وظيفة الترجمة
      // هذا يضمن عرض عناوين الأعمدة بشكل صحيح
      let headerLabel = header.label;
      
      // استخدام خدمة الترجمة من الملف translations.ts
      headerLabel = translateToEnglish(headerLabel);
      
      doc.text(
        headerLabel,
        10 + i * colWidth + colWidth / 2,
        tableTop + 6,
        { align: 'center' }
      );
    });
    
    // كتابة بيانات الجدول
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    
    let yPos = tableTop + 10;
    
    // كل صف من البيانات
    data.forEach((row, rowIndex) => {
      // تظليل الصفوف البديلة بلون مختلف
      if (rowIndex % 2 === 1) {
        // لون أفتح قليلاً للصفوف الزوجية
        doc.setFillColor(248, 248, 255);
        doc.rect(10, yPos, pageWidth - 20, 10, 'F');
      } else {
        // خلفية بيضاء للصفوف الفردية
        doc.setFillColor(255, 255, 255);
        doc.rect(10, yPos, pageWidth - 20, 10, 'F');
      }
      
      // رسم خط أفقي بين الصفوف
      doc.line(10, yPos, pageWidth - 10, yPos);
      
      // كتابة بيانات الصف
      config.headers.forEach((header, i) => {
        // التعامل مع البيانات المختلفة (أرقام، نصوص، إلخ)
        let cellValue = row[header.key];
        
        // التعامل مع النص العربي - ترجمة إلى الإنجليزية إذا كان نصاً
        if (typeof cellValue === 'string' && containsArabic(cellValue)) {
          // تحويل النص العربي للإنجليزية إذا كانت له ترجمة
          cellValue = translateToEnglish(cellValue);
        }
        
        // تنسيق القيم المالية والأرقام
        if (typeof cellValue === 'number') {
          // تنسيق مالي للأرقام حسب نوع العمود
          if (header.key.toLowerCase().includes('sales') || 
              header.key.toLowerCase().includes('cash') || 
              header.key.toLowerCase().includes('amount') || 
              header.key.toLowerCase().includes('price') ||
              header.key.toLowerCase().includes('target') ||
              header.key.toLowerCase().includes('discrepancy')) {
            // استخدام وظيفة تنسيق الأرقام الإنجليزية
            cellValue = formatNumberToEnglish(cellValue.toFixed(2));
          } else {
            // أرقام عادية بدون كسور
            cellValue = formatNumberToEnglish(cellValue);
          }
        }
        
        // التعامل مع التواريخ وتحويلها للتنسيق الإنجليزي
        if (header.key.toLowerCase().includes('date') && cellValue) {
          cellValue = formatDateToEnglish(cellValue);
        }
        
        // معالجة تنسيق النص
        let textAlign = 'center';
        
        // معالجة حالات خاصة (التوقيع)
        if (header.key === 'signature' && cellValue && typeof cellValue === 'string' && cellValue.startsWith('data:image')) {
          cellValue = '✓';
        }
        
        // كتابة قيمة الخلية
        doc.text(
          String(cellValue || ''),
          10 + i * colWidth + colWidth / 2,
          yPos + 6,
          { align: textAlign as any }
        );
        
        // رسم الخطوط العمودية للخلايا
        doc.line(10 + i * colWidth, yPos, 10 + i * colWidth, yPos + 10);
      });
      
      // رسم الخط العمودي الأخير للصف
      doc.line(pageWidth - 10, yPos, pageWidth - 10, yPos + 10);
      
      // الانتقال للصف التالي
      yPos += 10;
      
      // التحقق مما إذا كان هناك حاجة لإضافة صفحة جديدة
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
        
        // إعادة رسم رؤوس الجدول في الصفحة الجديدة
        doc.setFillColor(240, 240, 250);
        doc.rect(10, yPos, pageWidth - 20, 10, 'F');
        
        // رسم خطوط العناوين
        doc.line(10, yPos, pageWidth - 10, yPos);
        doc.line(10, yPos + 10, pageWidth - 10, yPos + 10);
        
        for (let i = 0; i <= config.headers.length; i++) {
          doc.line(10 + i * colWidth, yPos, 10 + i * colWidth, yPos + 10);
        }
        
        // كتابة عناوين الأعمدة مرة أخرى
        doc.setFont("Helvetica", "bold");
        config.headers.forEach((header, i) => {
          // استخدام الترجمة للعناوين في كل صفحة
          const headerLabel = translateToEnglish(header.label);
          doc.text(
            headerLabel,
            10 + i * colWidth + colWidth / 2,
            yPos + 6,
            { align: 'center' }
          );
        });
        
        // إعادة ضبط النمط للبيانات
        doc.setFont("Helvetica", "normal");
        
        // ضبط المؤشر لبداية البيانات في الصفحة الجديدة
        yPos += 10;
      }
    });
    
    // رسم الخط الأفقي الأخير
    doc.line(10, yPos, pageWidth - 10, yPos);
    
    // ===== تذييل احترافي مطور =====
    // إنشاء شريط تذييل ملون
    doc.setFillColor(25, 80, 160, 0.9); // نفس لون الشريط العلوي للتناسق
    doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
    
    // إضافة زخرفة بسيطة
    doc.setDrawColor(255, 255, 255, 0.5);
    doc.setLineWidth(0.5);
    doc.line(20, pageHeight - 15, pageWidth - 20, pageHeight - 15);
    
    // تنسيق نص التذييل
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255); // لون أبيض للنص على الخلفية الزرقاء
    
    // تاريخ ووقت الإنشاء بتنسيق محسن
    const now = new Date();
    // إعداد خيارات تنسيق التاريخ والوقت مع تحديد الأنواع الدقيقة
    const dateOptions = { 
      year: 'numeric' as const, 
      month: 'long' as const, 
      day: 'numeric' as const, 
      weekday: 'long' as const
    };
    const timeOptions = { 
      hour: '2-digit' as const, 
      minute: '2-digit' as const,
      hour12: true
    };
    
    // تنسيق التاريخ بالإنجليزية للتوافق (مع تحسين العرض)
    const dateStr = now.toLocaleDateString('en-US', dateOptions);
    const timeStr = now.toLocaleTimeString('en-US', timeOptions);
    const dateString = `Generated on: ${dateStr} at ${timeStr}`;
    doc.text(dateString, pageWidth - 12, pageHeight - 12, { align: 'right' });
    
    // اسم النظام وشعار الشركة
    doc.setFontSize(10);
    doc.setFont("Helvetica", "bold");
    doc.text("Butter Bakery Management System", 12, pageHeight - 12);
    
    // ترقيم الصفحات في المنتصف بتنسيق محسن
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    const pageInfo = `Page 1 of 1`; // تعديل للتوافق مع jsPDF
    doc.text(pageInfo, pageWidth / 2, pageHeight - 12, { align: 'center' });
    
    // إضافة نص تذييل مخصص إذا كان موجوداً
    if (config.footer) {
      doc.text(
        String(config.footer),
        pageWidth / 2,
        pageHeight - 18,
        { align: 'center' }
      );
    }
    
    // حفظ الملف
    doc.save(`${filename}.pdf`);
    console.log('تم تنزيل ملف PDF للطباعة');
  } catch (error) {
    console.error("Error generating PDF:", error);
  }
};

/**
 * دالة مساعدة لتصدير البيانات بتنسيق محدد
 * تستخدم النهج المبسط لإنشاء ملفات PDF مع دعم العربية
 */
export const exportData = (data: ExportableData, config: ExportConfig, format: 'pdf' | 'excel') => {
  try {
    console.log(`بدء عملية التصدير بتنسيق ${format}:`, { 
      title: config.title, 
      records: data.length, 
      fileName: config.fileName 
    });
    
    if (format === 'pdf') {
      // استخدام مولد PDF المبسط
      exportToPdf(data, config);
    } else {
      // تصدير إلى إكسل
      exportToExcel(data, config);
    }
    
    console.log(`تمت عملية التصدير بنجاح بتنسيق ${format}`);
  } catch (error) {
    console.error('Error exporting data:', error);
    console.error('Export details:', { format, configTitle: config.title, dataCount: data.length });
    
    // إظهار رسالة خطأ للمستخدم بطريقة أكثر إفادة
    const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
    alert(`حدث خطأ أثناء تصدير البيانات: ${errorMessage}\nالرجاء المحاولة مرة أخرى.`);
  }
};