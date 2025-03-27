/**
 * إعلان النوع لمكتبة bidi-js
 * تستخدم لمعالجة النصوص ثنائية الاتجاه
 */
declare module 'bidi-js' {
  /**
   * إعادة ترتيب النص ثنائي الاتجاه (العربي/العبري مع الإنجليزي)
   * لعرضه بشكل صحيح
   */
  export function resolve(text: string): string;
  
  /**
   * فحص ما إذا كان النص يحتوي على محتوى ثنائي الاتجاه
   */
  export function hasBidiCharacters(text: string): boolean;
  
  /**
   * تحليل النص وإعادة خريطة ترتيب الأحرف
   */
  export function getPositionMap(text: string): number[];
  
  export const version: string;
  
  export default {
    resolve,
    hasBidiCharacters,
    getPositionMap,
    version
  };
}