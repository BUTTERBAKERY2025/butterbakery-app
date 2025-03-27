import React, { useEffect } from 'react';
import './responsive.css';
import './rtl.css';
import { useTranslation } from 'react-i18next';

/**
 * مكون لتحميل التنسيقات المستجيبة
 * نسخة مبسطة ومستقرة
 */
const LoadResponsiveStyles: React.FC = () => {
  const { i18n } = useTranslation();

  // التأكد من تطبيق الاتجاه الصحيح عند تحميل المكون
  useEffect(() => {
    // تحديد اتجاه المستند بناءً على اللغة الحالية
    const currentLanguage = i18n.language || 'ar';
    const direction = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    
    // تطبيق الاتجاه على المستند
    document.documentElement.dir = direction;
    document.documentElement.lang = currentLanguage;
    document.body.dir = direction;
    
    // سجل للتشخيص
    console.log(`[RTL Manager] Direction set to ${direction} for language ${currentLanguage}`);
    
  }, [i18n.language]);

  // لا يوجد واجهة مستخدم، فقط لتحميل التنسيقات
  return null;
};

export default LoadResponsiveStyles;