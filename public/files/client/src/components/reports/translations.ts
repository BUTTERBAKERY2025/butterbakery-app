/**
 * قاموس ترجمة للعناوين والنصوص المستخدمة في تقارير PDF وExcel
 * يستخدم هذا الملف لضمان ظهور النصوص العربية بشكل صحيح في التقارير
 */

// قاموس للعناوين العربية إلى الإنجليزية
export const arabicToEnglishHeaders: Record<string, string> = {
  // عناوين عامة
  'التاريخ': 'Date',
  'الفرع': 'Branch',
  'المبيعات': 'Sales',
  'النقد': 'Cash',
  'الشبكة': 'Network',
  'المجموع': 'Total',
  'الهدف': 'Target',
  'نسبة الإنجاز': 'Achievement %',
  'عدد العمليات': 'Transactions',
  'متوسط الفاتورة': 'Avg. Ticket',
  'الفرق': 'Discrepancy',
  'التوقيع': 'Signature',
  'المبيعات النقدية': 'Cash Sales',
  'مبيعات الشبكة': 'Network Sales',
  'إجمالي المبيعات': 'Total Sales',
  'الكاشير': 'Cashier',
  'اسم الكاشير': 'Cashier Name',
  'الشفت': 'Shift',
  'الحالة': 'Status',
  'ملاحظات': 'Notes',

  // أيام الأسبوع
  'السبت': 'Saturday',
  'الأحد': 'Sunday',
  'الاثنين': 'Monday', 
  'الثلاثاء': 'Tuesday',
  'الأربعاء': 'Wednesday',
  'الخميس': 'Thursday',
  'الجمعة': 'Friday',

  // عناوين الكاشير
  'بداية الشفت': 'Shift Start',
  'نهاية الشفت': 'Shift End',
  'النقد الفعلي': 'Actual Cash',
  'نقد البداية': 'Starting Cash',

  // عناوين التقارير
  'تقرير المبيعات اليومية': 'Daily Sales Report',
  'تقرير الكاشير': 'Cashier Report',
  'تقرير الأهداف': 'Targets Report',
  'تقرير المبيعات المجمعة': 'Consolidated Sales Report',
  'تقرير المقارنة': 'Comparative Report',

  // حالات
  'مفتوح': 'Open',
  'مغلق': 'Closed',
  'معلق': 'Pending',
  'مرفوض': 'Rejected',
  'موافق': 'Approved',
  'تم التحويل': 'Transferred',

  // أنواع الشفتات
  'صباحي': 'Morning',
  'مسائي': 'Evening',

  // أشهر السنة
  'يناير': 'January',
  'فبراير': 'February',
  'مارس': 'March',
  'أبريل': 'April',
  'مايو': 'May',
  'يونيو': 'June',
  'يوليو': 'July',
  'أغسطس': 'August',
  'سبتمبر': 'September',
  'أكتوبر': 'October',
  'نوفمبر': 'November',
  'ديسمبر': 'December',
};

// دالة مساعدة للترجمة مع التعامل مع النص غير الموجود في القاموس
export function translateToEnglish(arabicText: string): string {
  // إذا كان النص فارغًا أو بلغة أخرى غير عربية
  if (!arabicText || !containsArabic(arabicText)) {
    return arabicText;
  }

  // إذا كان النص موجودًا بالضبط في القاموس
  if (arabicToEnglishHeaders[arabicText]) {
    return arabicToEnglishHeaders[arabicText];
  }

  // محاولة الترجمة عن طريق تقسيم النص إلى كلمات
  const words = arabicText.split(' ');
  const translatedWords = words.map(word => {
    return arabicToEnglishHeaders[word] || word;
  });

  return translatedWords.join(' ');
}

// دالة للتحقق من وجود نص عربي
export function containsArabic(text: string): boolean {
  const arabicPattern = /[\u0600-\u06FF]/;
  return arabicPattern.test(text);
}

// دالة لتنسيق الأرقام بالشكل الإنجليزي
export function formatNumberToEnglish(num: number | string): string {
  if (typeof num === 'number') {
    return num.toLocaleString('en-US');
  }
  
  if (typeof num === 'string' && !isNaN(parseFloat(num))) {
    return parseFloat(num).toLocaleString('en-US');
  }
  
  return String(num);
}

// دالة لتنسيق التاريخ بالشكل الإنجليزي
export function formatDateToEnglish(date: string | Date): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
  } catch (e) {
    return String(date);
  }
}