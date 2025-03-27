/**
 * ملف تعريف لمكتبة arabic-reshaper
 * يستخدم لإزالة أخطاء TypeScript المتعلقة بمكتبة arabic-reshaper
 */
declare module 'arabic-reshaper' {
  /**
   * إعادة تشكيل النص العربي لعرضه بشكل صحيح
   * @param text النص المراد إعادة تشكيله
   * @returns النص بعد إعادة التشكيل
   */
  export function reshape(text: string): string;
  
  /**
   * إعدادات إضافية لعملية إعادة التشكيل
   */
  export interface ReshapeOptions {
    letters_map?: any;
    delete_harakat?: boolean;
    delete_tatweel?: boolean;
    use_unshaped_instead_of_isolated?: boolean;
    support_zwj?: boolean;
    use_unshaped_instead_of_isolated_for_specific_chars?: boolean;
  }

  /**
   * إعادة تشكيل النص العربي مع خيارات مخصصة
   * @param text النص المراد إعادة تشكيله
   * @param options خيارات إعادة التشكيل
   * @returns النص بعد إعادة التشكيل
   */
  export function reshape(text: string, options: ReshapeOptions): string;

  /**
   * الكائن الافتراضي المصدر
   */
  const arabicReshaper: {
    reshape: typeof reshape;
  };

  export default arabicReshaper;
}