/**
 * تصريح نموذج file-saver
 * يستخدم لإزالة أخطاء TypeScript المتعلقة بوحدة file-saver
 */
declare module 'file-saver' {
  /**
   * حفظ ملف باستخدام SaveAs dialog
   * 
   * @param data ملف أو Blob أو Uri للحفظ كـ ملف
   * @param filename اسم الملف المقترح مع امتداد الملف المناسب
   * @param options خيارات إضافية للحفظ (اختياري)
   */
  export function saveAs(
    data: Blob | File | string,
    filename?: string,
    options?: {
      type?: string;
      autoBom?: boolean;
    }
  ): void;
}