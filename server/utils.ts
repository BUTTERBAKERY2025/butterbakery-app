/**
 * ملف المساعدات والوظائف المشتركة للخادم
 */

/**
 * تنسيق التاريخ إلى YYYY-MM-DD
 * @param date التاريخ المراد تنسيقه
 * @returns التاريخ بتنسيق YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * استخراج التاريخ من نص
 * @param dateString نص التاريخ
 * @returns كائن تاريخ
 */
export function parseDate(dateString: string): Date {
  // حالة خاصة لتنسيق YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  
  return new Date(dateString);
}

/**
 * الحصول على تاريخ اليوم بتنسيق YYYY-MM-DD
 * @returns تاريخ اليوم بتنسيق YYYY-MM-DD
 */
export function today(): string {
  return formatDate(new Date());
}

/**
 * الحصول على تاريخ اليوم السابق بتنسيق YYYY-MM-DD
 * @returns تاريخ اليوم السابق بتنسيق YYYY-MM-DD
 */
export function yesterday(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return formatDate(date);
}

/**
 * الحصول على تاريخ بداية الشهر الحالي بتنسيق YYYY-MM-DD
 * @returns تاريخ بداية الشهر الحالي بتنسيق YYYY-MM-DD
 */
export function firstDayOfMonth(): string {
  const date = new Date();
  date.setDate(1);
  return formatDate(date);
}

/**
 * الحصول على تاريخ بداية الأسبوع الحالي بتنسيق YYYY-MM-DD
 * @returns تاريخ بداية الأسبوع الحالي بتنسيق YYYY-MM-DD
 */
export function firstDayOfWeek(): string {
  const date = new Date();
  const day = date.getDay();
  // تعديل ليكون الأحد هو بداية الأسبوع (0)
  const diff = date.getDate() - day;
  date.setDate(diff);
  return formatDate(date);
}

/**
 * إضافة أيام إلى تاريخ
 * @param date التاريخ الأصلي
 * @param days عدد الأيام المراد إضافتها
 * @returns التاريخ الجديد
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * تنسيق رقم كمبلغ مالي
 * @param amount المبلغ
 * @param currency عملة المبلغ
 * @returns المبلغ المنسق كنص
 */
export function formatCurrency(amount: number, currency: string = 'SAR'): string {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2
  }).format(amount);
}

/**
 * تنسيق رقم بصورة عامة
 * @param number الرقم المراد تنسيقه
 * @param minimumFractionDigits الحد الأدنى لخانات الكسور العشرية
 * @returns الرقم المنسق
 */
export function formatNumber(number: number, minimumFractionDigits: number = 0): string {
  return new Intl.NumberFormat('ar-SA', {
    minimumFractionDigits
  }).format(number);
}

/**
 * توليد معرف فريد
 * @returns معرف فريد
 */
export function generateUniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * توليد رقم مرجعي فريد
 * @param prefix بادئة الرقم المرجعي
 * @returns رقم مرجعي فريد
 */
export function generateReferenceNumber(prefix: string = 'REF'): string {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${timestamp}-${random}`;
}