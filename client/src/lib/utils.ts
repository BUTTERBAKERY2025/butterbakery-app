import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

import i18n from '@/lib/i18n';

// Format currency in SAR with reliable formatting - numbers always in English 
export function formatCurrency(amount: number, showSymbol: boolean = true): string {
  // منع الأخطاء عند تمرير قيم غير صالحة
  if (isNaN(amount) || amount === null || amount === undefined) {
    const zero = '0.00'; // دائماً بالإنجليزي
    return showSymbol ? (i18n.language === 'ar' ? `${zero} ر.س` : `SAR ${zero}`) : zero;
  }

  // تنسيق الرقم بطريقة مباشرة دائماً بالأرقام الإنجليزية
  const formattedNumber = Math.abs(amount)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ','); // دائماً فاصلة إنجليزية
    
  const prefix = amount < 0 ? '-' : '';
  
  // لا نقوم بتحويل الأرقام إلى أرقام عربية بعد الآن
  const finalNumber = formattedNumber;
  
  // إضافة رمز العملة إذا كان مطلوبًا حسب اللغة
  if (showSymbol) {
    return i18n.language === 'ar'
      ? `${prefix}${finalNumber} ر.س`
      : `${prefix}SAR ${finalNumber}`;
  } else {
    return `${prefix}${finalNumber}`;
  }
}

// Get initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase();
}

// تنسيق الأرقام - دائماً بالإنجليزية بغض النظر عن اللغة
export function toArabicNumerals(num: number): string {
  // منع الأخطاء عند تمرير قيم غير صالحة
  if (isNaN(num) || num === null || num === undefined) {
    return '0'; // دائماً بالإنجليزية
  }
  
  // تنسيق الرقم بدون كسور عشرية إذا كان رقمًا صحيحًا
  let result;
  if (Math.floor(num) === num) {
    result = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); // دائماً فاصلة إنجليزية
  } else {
    // تنسيق الرقم مع كسور عشرية إذا كان يحتوي على أجزاء عشرية
    result = num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); // دائماً فاصلة إنجليزية
  }
  
  // لا نقوم بتحويل الأرقام إلى أرقام عربية بعد الآن
  return result;
}

// تنسيق عدد مع إضافة فواصل لتسهيل القراءة - دائماً بالإنجليزية بغض النظر عن اللغة
export function formatNumber(value: number): string {
  if (isNaN(value) || value === null || value === undefined) {
    return '0'; // دائماً بالإنجليزية
  }
  
  // استخدم دائماً فواصل إنجليزية وأرقام إنجليزية
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Get month name based on current language - with Gregorian calendar and English numbers
export function getMonthName(month: number): string {
  const date = new Date();
  date.setMonth(month - 1);
  
  // Use locale based on current language, with Gregorian calendar
  const locale = i18n.language === 'ar' ? 'ar' : 'en-US';
  return new Intl.DateTimeFormat(locale, { 
    month: 'long',
    calendar: 'gregory', // Always use Gregorian calendar
    numberingSystem: 'latn' // Always use Latin (Western) numerals
  }).format(date);
}

// Determine color based on percentage
export function getProgressColor(percentage: number): string {
  if (percentage >= 90) return 'bg-success';
  if (percentage >= 75) return 'bg-info';
  if (percentage >= 60) return 'bg-warning';
  return 'bg-danger';
}

// Check if user has required role
export function hasRole(userRole: string | undefined, requiredRoles: string[]): boolean {
  if (!userRole) return false;
  return requiredRoles.includes(userRole);
}

// Format date based on the current language - always with Gregorian calendar and English numbers
export function formatDate(date: Date | string, format: 'short' | 'medium' | 'long' = 'medium'): string {
  // التحقق من صحة التاريخ
  if (!date) return '---';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // التحقق من أن التاريخ صالح (ليس NaN)
    if (isNaN(dateObj.getTime())) {
      console.warn('تاريخ غير صالح:', date);
      return '---';
    }
    
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: format === 'short' ? 'numeric' : 'long',
      year: 'numeric',
      calendar: 'gregory' // Always use Gregorian calendar
    };
    
    // Use appropriate locale based on current language, but keep numbers in English
    const locale = i18n.language === 'ar' ? 'ar' : 'en-US';
    
    // Set number system explicitly to Latin (1, 2, 3) instead of Arabic (١, ٢, ٣)
    const formattedDate = new Intl.DateTimeFormat(locale, {
      ...options,
      numberingSystem: 'latn'  // Use Latin numbers (1, 2, 3) regardless of locale
    }).format(dateObj);
    
    return formattedDate;
  } catch (error) {
    console.error('خطأ أثناء تنسيق التاريخ:', error);
    return '---';
  }
}
