/**
 * مسارات API لإعدادات الشركة
 */
import { Express, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { isAuthenticated } from '../middlewares/auth';

const SETTINGS_DIR = path.join(process.cwd(), 'data');
const COMPANY_SETTINGS_FILE = path.join(SETTINGS_DIR, 'company_settings.json');

// تأكد من وجود المجلد
if (!fs.existsSync(SETTINGS_DIR)) {
  fs.mkdirSync(SETTINGS_DIR, { recursive: true });
}

// الإعدادات الافتراضية للشركة
const defaultCompanySettings = {
  companyName: "شركة المخبوزات الفاخرة",
  taxNumber: "30094587",
  email: "info@butterbakery.sa",
  phone: "+966138759465",
  darkMode: false,
  language: "ar"
};

/**
 * تسجيل مسارات إعدادات الشركة
 */
export function registerCompanyRoutes(app: Express) {
  /**
   * الحصول على إعدادات الشركة
   * @route GET /api/company/settings
   */
  app.get('/api/company/settings', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // التحقق من صلاحيات المستخدم (المسؤول فقط)
      if ((req.user as any)?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول إلى إعدادات الشركة' });
      }

      // التحقق من وجود ملف الإعدادات
      if (!fs.existsSync(COMPANY_SETTINGS_FILE)) {
        // إذا لم يوجد، إنشاء ملف بالإعدادات الافتراضية
        fs.writeFileSync(COMPANY_SETTINGS_FILE, JSON.stringify(defaultCompanySettings, null, 2));
        
        return res.status(200).json({ 
          success: true, 
          settings: defaultCompanySettings 
        });
      }

      // قراءة الإعدادات من الملف
      const settings = JSON.parse(fs.readFileSync(COMPANY_SETTINGS_FILE, 'utf8'));
      
      res.status(200).json({ 
        success: true, 
        settings 
      });
    } catch (error) {
      console.error('خطأ في جلب إعدادات الشركة:', error);
      res.status(500).json({ success: false, message: 'حدث خطأ أثناء جلب إعدادات الشركة', error: (error as Error).message });
    }
  });

  /**
   * تحديث إعدادات الشركة
   * @route PUT /api/company/settings
   */
  app.put('/api/company/settings', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // التحقق من صلاحيات المستخدم (المسؤول فقط)
      if ((req.user as any)?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية لتحديث إعدادات الشركة' });
      }

      // التحقق من البيانات المستلمة
      const newSettings = req.body;
      
      if (!newSettings || !newSettings.companyName) {
        return res.status(400).json({ success: false, message: 'البيانات المرسلة غير صالحة' });
      }
      
      // الإعدادات المطلوبة
      const requiredSettings = ['companyName', 'taxNumber', 'email', 'phone', 'darkMode', 'language'];
      const validSettings = requiredSettings.reduce((obj: any, key) => {
        obj[key] = newSettings[key] !== undefined ? newSettings[key] : defaultCompanySettings[key as keyof typeof defaultCompanySettings];
        return obj;
      }, {});
      
      // حفظ الإعدادات في ملف
      fs.writeFileSync(COMPANY_SETTINGS_FILE, JSON.stringify(validSettings, null, 2));

      res.status(200).json({ 
        success: true, 
        message: 'تم تحديث إعدادات الشركة بنجاح',
        settings: validSettings
      });
    } catch (error) {
      console.error('خطأ في تحديث إعدادات الشركة:', error);
      res.status(500).json({ success: false, message: 'حدث خطأ أثناء تحديث إعدادات الشركة', error: (error as Error).message });
    }
  });
}