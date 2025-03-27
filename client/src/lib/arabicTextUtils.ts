/**
 * مكتبة أدوات خاصة بمعالجة النصوص العربية
 * توفر دوال متقدمة للتعامل مع النصوص ثنائية الاتجاه والأرقام والتواريخ
 */

// استيراد مكتبات معالجة النصوص العربية
import arabicReshaper from 'arabic-reshaper';
import bidi from 'bidi-js';

/**
 * إعادة تشكيل النص العربي وتحسينه للعرض - معالجة محسنة
 * @param text النص المراد إعادة تشكيله
 */
export function reshapeArabicText(text: string | number | undefined | null): string {
  if (text === undefined || text === null) return '';
  
  // تحويل النص إلى سلسلة نصية
  const textStr = typeof text === 'string' ? text : String(text);
  
  // التحقق مما إذا كان النص يحتوي على أرقام وعلامات عشرية وفواصل فقط
  if (/^-?[\d,.]+$/.test(textStr)) {
    // نرجع الأرقام كما هي بدون تغيير (بصيغة أرقام إنجليزية)
    return textStr;
  }
  
  // التحقق إذا كان النص يحتوي على أحرف عربية
  const hasArabic = containsArabic(textStr);
  
  // استبدال الأرقام العربية في النص بأرقام إنجليزية
  let processedText = replaceArabicNumbers(textStr);
  
  // إذا كان النص يحتوي على أحرف عربية، نقوم بإعادة تشكيله
  if (hasArabic) {
    try {
      // معالجة النص بشكل أبسط وأكثر موثوقية
      // إضافة علامة RLM للتأكد من أن النص العربي يعرض بشكل صحيح
      return `\u200F${processedText}`;
    } catch (error) {
      console.error('خطأ في إعادة تشكيل النص العربي:', error);
      return processedText;
    }
  }
  
  // إذا كان النص لا يحتوي على عربية (إنجليزي أو أرقام فقط)، نرجعه كما هو
  return processedText;
}

/**
 * التحقق مما إذا كان النص يحتوي على أحرف عربية
 * @param text النص المراد فحصه
 */
export function containsArabic(text: string): boolean {
  // نطاق الأحرف العربية في Unicode
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDCF\uFDF0-\uFDFF\uFE70-\uFEFF]/;
  return arabicPattern.test(text);
}

/**
 * استبدال الأرقام العربية بأرقام إنجليزية
 * @param text النص المراد معالجته
 */
export function replaceArabicNumbers(text: string): string {
  return text
    .replace(/[\u0660-\u0669]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 0x30))
    .replace(/٫/g, '.')
    .replace(/٬/g, ',');
}

/**
 * معالجة النص ثنائي الاتجاه (عربي/إنجليزي)
 * @param text النص المراد معالجته
 */
export function handleBidirectionalText(text: string): string {
  try {
    // التحقق مما إذا كان النص يحتوي على أحرف عربية
    if (containsArabic(text)) {
      // استخدام مكتبة bidi-js لمعالجة النص ثنائي الاتجاه
      if (bidi.hasBidiCharacters(text)) {
        return bidi.resolve(text);
      }
      
      // إضافة علامة RLM للنص العربي
      return `\u200F${text}`;
    }
    
    // إضافة علامة LRM للنص غير العربي
    return `\u200E${text}`;
  } catch (error) {
    console.error('خطأ في معالجة النص ثنائي الاتجاه:', error);
    return text;
  }
}

/**
 * تنسيق النص للعرض في التقارير مع مراعاة ثنائية الاتجاه
 * @param text النص المراد تنسيقه
 * @param isRTL ما إذا كان المستند بالاتجاه من اليمين إلى اليسار
 */
export function formatTextForReport(text: string | number | undefined | null, isRTL: boolean = true): string {
  if (text === undefined || text === null) return '';
  
  // تحويل النص إلى سلسلة نصية
  const textStr = typeof text === 'string' ? text : String(text);
  
  // معالجة النص حسب نوعه
  if (/^-?[\d,.]+$/.test(textStr)) {
    // نص رقمي
    return textStr;
  } else if (containsArabic(textStr)) {
    // نص عربي
    return isRTL ? reshapeArabicText(textStr) : handleBidirectionalText(textStr);
  } else {
    // نص إنجليزي
    return isRTL ? handleBidirectionalText(textStr) : textStr;
  }
}

/**
 * تنسيق النص للعرض في واجهة المستخدم مع مراعاة ثنائية الاتجاه
 * @param text النص المراد تنسيقه
 */
export function formatTextForUI(text: string): string {
  // استبدال الأرقام العربية بأرقام إنجليزية
  const processedText = replaceArabicNumbers(text);
  
  // إضافة علامات التحكم في الاتجاه حسب محتوى النص
  return containsArabic(processedText) ? `\u200F${processedText}` : `\u200E${processedText}`;
}

/**
 * تحديد اتجاه النص (RTL أو LTR) بناءً على محتواه
 * @param text النص المراد تحديد اتجاهه
 */
export function getTextDirection(text: string): 'rtl' | 'ltr' {
  // البحث عن أول حرف غير رقم وغير علامة ترقيم
  const nonDigitMatch = text.match(/[^\d\s.,;:!?()[\]{}"'\/\\+\-*=%$#@&|^_<>~`]/);
  
  if (nonDigitMatch) {
    const firstChar = nonDigitMatch[0];
    // التحقق مما إذا كان الحرف عربي
    return containsArabic(firstChar) ? 'rtl' : 'ltr';
  }
  
  // إذا لم يحتوي النص على أحرف، نفترض أنه LTR
  return 'ltr';
}

/**
 * تطبيق اتجاه النص ديناميكياً على عنصر HTML
 * @param element العنصر المراد تحديد اتجاهه
 * @param text النص المراد تحديد اتجاهه
 */
export function applyTextDirection(element: HTMLElement, text: string): void {
  const direction = getTextDirection(text);
  element.style.direction = direction;
  element.style.textAlign = direction === 'rtl' ? 'right' : 'left';
}