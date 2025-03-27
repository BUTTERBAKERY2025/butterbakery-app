/**
 * مسارات واجهة برمجة التطبيقات للنسخ الاحتياطي واستعادة البيانات
 */

import { Request, Response, Express } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { isAuthenticated } from '../middlewares/auth';

// للتوافق مع نظام الوحدات ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// مسار ملفات النسخ الاحتياطي
const BACKUPS_DIR = path.join(__dirname, '../../backups');

// التأكد من وجود مجلد النسخ الاحتياطي
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

/**
 * تسجيل مسارات النسخ الاحتياطي
 */
export function registerBackupRoutes(app: Express) {
  // الحصول على قائمة النسخ الاحتياطية
  app.get('/api/backups', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // التحقق من صلاحيات المستخدم (المسؤول فقط)
      if ((req.user as any)?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول إلى النسخ الاحتياطية' });
      }

      if (!fs.existsSync(BACKUPS_DIR)) {
        return res.status(200).json({ success: true, backups: [] });
      }

      const files = fs.readdirSync(BACKUPS_DIR);
      const backups = files
        .filter(file => file.endsWith('.sql') || file.endsWith('.gz'))
        .map(file => {
          const stats = fs.statSync(path.join(BACKUPS_DIR, file));
          const fileSizeInMB = stats.size / (1024 * 1024);
          const dateStr = file.split('_')[0]; // استخراج التاريخ من اسم الملف

          // تحديد نوع النسخة الاحتياطية (يومي، أسبوعي، شهري)
          let type = 'يومي';
          if (file.includes('weekly')) {
            type = 'أسبوعي';
          } else if (file.includes('monthly')) {
            type = 'شهري';
          }

          return {
            id: file,
            name: file,
            path: path.join(BACKUPS_DIR, file),
            date: dateStr.replace(/(\d{4})(\d{2})(\d{2})/, '$3-$2-$1'),
            size: `${fileSizeInMB.toFixed(2)} MB`,
            type
          };
        })
        .sort((a, b) => {
          // ترتيب بحسب التاريخ (الأحدث أولاً)
          const dateA = new Date(a.date.split('-').reverse().join('-'));
          const dateB = new Date(b.date.split('-').reverse().join('-'));
          return dateB.getTime() - dateA.getTime();
        });

      res.status(200).json({ success: true, backups });
    } catch (error) {
      console.error('خطأ في الحصول على النسخ الاحتياطية:', error);
      res.status(500).json({ success: false, message: 'حدث خطأ أثناء جلب النسخ الاحتياطية', error: error.message });
    }
  });

  // إنشاء نسخة احتياطية جديدة
  app.post('/api/backups/create', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // التحقق من صلاحيات المستخدم (المسؤول فقط)
      if ((req.user as any)?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية لإنشاء نسخة احتياطية' });
      }

      // توليد اسم الملف بناءً على التاريخ والوقت الحالي
      const now = new Date();
      const timestamp = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
        String(now.getHours()).padStart(2, '0'),
        String(now.getMinutes()).padStart(2, '0')
      ].join('');

      const backupFileName = `${timestamp}_backup.sql.gz`;
      const backupFilePath = path.join(BACKUPS_DIR, backupFileName);

      // تنفيذ سكريبت النسخ الاحتياطي
      const backupScript = path.join(process.cwd(), 'scripts/auto_backup.sh');

      if (!fs.existsSync(backupScript)) {
        return res.status(500).json({ 
          success: false, 
          message: 'ملف سكريبت النسخ الاحتياطي غير موجود',
          path: backupScript
        });
      }

      console.log('Starting backup process with script:', backupScript);
      console.log('Output file path:', backupFilePath);
      
      const child = spawn('bash', [backupScript, backupFilePath]);

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          // تم إنشاء النسخة الاحتياطية بنجاح
          res.status(200).json({ 
            success: true, 
            message: 'تم إنشاء النسخة الاحتياطية بنجاح',
            file: backupFileName,
            path: backupFilePath
          });
        } else {
          // حدث خطأ أثناء إنشاء النسخة الاحتياطية
          res.status(500).json({ 
            success: false, 
            message: 'فشل إنشاء النسخة الاحتياطية',
            output,
            error: errorOutput
          });
        }
      });
    } catch (error) {
      console.error('خطأ في إنشاء النسخة الاحتياطية:', error);
      res.status(500).json({ success: false, message: 'حدث خطأ أثناء إنشاء النسخة الاحتياطية', error: error.message });
    }
  });

  // تنزيل نسخة احتياطية
  app.get('/api/backups/download/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // التحقق من صلاحيات المستخدم (المسؤول فقط)
      if ((req.user as any)?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية لتنزيل النسخة الاحتياطية' });
      }

      const { id } = req.params;
      const filePath = path.join(BACKUPS_DIR, id);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: 'النسخة الاحتياطية غير موجودة' });
      }

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename=${id}`);
      
      // إرسال الملف للتنزيل
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('خطأ في تنزيل النسخة الاحتياطية:', error);
      res.status(500).json({ success: false, message: 'حدث خطأ أثناء تنزيل النسخة الاحتياطية', error: error.message });
    }
  });

  // استعادة نسخة احتياطية
  app.post('/api/backups/restore', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // التحقق من صلاحيات المستخدم (المسؤول فقط)
      if ((req.user as any)?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية لاستعادة النسخة الاحتياطية' });
      }

      const { backupPath } = req.body;

      if (!backupPath) {
        return res.status(400).json({ success: false, message: 'مسار النسخة الاحتياطية مطلوب' });
      }

      if (!fs.existsSync(backupPath)) {
        return res.status(404).json({ success: false, message: 'النسخة الاحتياطية غير موجودة' });
      }

      // تنفيذ سكريبت استعادة النسخة الاحتياطية
      const restoreScript = path.join(process.cwd(), 'scripts/restore_backup.sh');

      if (!fs.existsSync(restoreScript)) {
        return res.status(500).json({ 
          success: false, 
          message: 'ملف سكريبت استعادة النسخة الاحتياطية غير موجود',
          path: restoreScript
        });
      }

      console.log('Starting restore process with script:', restoreScript);
      console.log('Backup file path:', backupPath);
      
      const child = spawn('bash', [restoreScript, backupPath]);

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          // تمت استعادة النسخة الاحتياطية بنجاح
          res.status(200).json({ 
            success: true, 
            message: 'تمت استعادة النسخة الاحتياطية بنجاح',
          });
        } else {
          // حدث خطأ أثناء استعادة النسخة الاحتياطية
          res.status(500).json({ 
            success: false, 
            message: 'فشل استعادة النسخة الاحتياطية',
            output,
            error: errorOutput
          });
        }
      });
    } catch (error) {
      console.error('خطأ في استعادة النسخة الاحتياطية:', error);
      res.status(500).json({ success: false, message: 'حدث خطأ أثناء استعادة النسخة الاحتياطية', error: error.message });
    }
  });

  // حفظ إعدادات النسخ الاحتياطي
  app.put('/api/backups/settings', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // التحقق من صلاحيات المستخدم (المسؤول فقط)
      if ((req.user as any)?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية لتحديث إعدادات النسخ الاحتياطي' });
      }

      // هنا يمكن حفظ إعدادات النسخ الاحتياطي (مثل تكرار النسخ الاحتياطي، ومستودع S3، إلخ)
      // يمكن تخزينها في ملف أو في قاعدة البيانات

      // مثال بسيط: حفظ الإعدادات في ملف
      const settingsFilePath = path.join(BACKUPS_DIR, 'backup_settings.json');
      fs.writeFileSync(settingsFilePath, JSON.stringify(req.body, null, 2));

      res.status(200).json({ 
        success: true, 
        message: 'تم تحديث إعدادات النسخ الاحتياطي بنجاح' 
      });
    } catch (error) {
      console.error('خطأ في تحديث إعدادات النسخ الاحتياطي:', error);
      res.status(500).json({ success: false, message: 'حدث خطأ أثناء تحديث إعدادات النسخ الاحتياطي', error: error.message });
    }
  });

  // الحصول على إعدادات النسخ الاحتياطي
  app.get('/api/backups/settings', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // التحقق من صلاحيات المستخدم (المسؤول فقط)
      if ((req.user as any)?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول إلى إعدادات النسخ الاحتياطي' });
      }

      const settingsFilePath = path.join(BACKUPS_DIR, 'backup_settings.json');
      
      if (!fs.existsSync(settingsFilePath)) {
        // إذا لم يكن ملف الإعدادات موجودًا، نقوم بإنشاء إعدادات افتراضية
        const defaultSettings = {
          frequency: 'daily',
          s3Bucket: process.env.BACKUP_S3_BUCKET || 'butterbakery-backups',
          retentionPolicy: {
            daily: 7,    // الاحتفاظ بالنسخ اليومية لمدة 7 أيام
            weekly: 28,  // الاحتفاظ بالنسخ الأسبوعية لمدة 4 أسابيع
            monthly: 365 // الاحتفاظ بالنسخ الشهرية لمدة سنة
          }
        };
        
        return res.status(200).json({ 
          success: true, 
          settings: defaultSettings 
        });
      }

      const settings = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));
      
      res.status(200).json({ 
        success: true, 
        settings 
      });
    } catch (error) {
      console.error('خطأ في الحصول على إعدادات النسخ الاحتياطي:', error);
      res.status(500).json({ success: false, message: 'حدث خطأ أثناء الحصول على إعدادات النسخ الاحتياطي', error: error.message });
    }
  });
}