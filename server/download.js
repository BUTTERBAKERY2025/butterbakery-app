/**
 * إنشاء نقطة نهاية مخصصة للتنزيل
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// الحصول على مسار الدليل الحالي بطريقة متوافقة مع ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function setupDownload(app) {
  app.get('/api/download/deployment-package', (req, res) => {
    const filePath = path.join(__dirname, '..', 'butterbakery-render-deployment.zip');
    
    if (fs.existsSync(filePath)) {
      res.download(filePath, 'butterbakery-render-deployment.zip', (err) => {
        if (err) {
          console.error('خطأ في التنزيل:', err);
          res.status(500).send('حدث خطأ أثناء تنزيل الملف');
        }
      });
    } else {
      res.status(404).send('الملف غير موجود');
    }
  });
  
  console.log('تم إعداد نقطة نهاية API للتنزيل: /api/download/deployment-package');
};
