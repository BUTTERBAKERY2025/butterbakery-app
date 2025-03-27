/**
 * مسارات التنزيل المباشر للملفات
 * توفر وصولاً مباشراً للملفات دون الحاجة لمصادقة
 */

import { Express, Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";

/**
 * تسجيل مسارات التنزيل المباشر
 */
export function registerDownloadRoutes(app: Express) {
  /**
   * نقطة نهاية لتنزيل حزمة جاهزة للنشر على GitHub
   * @route GET /download/github-package
   */
  app.get('/download/github-package', (req: Request, res: Response) => {
    const filePath = path.join(process.cwd(), 'butterbakery-github-ready.zip');
    
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename=butterbakery-github-ready.zip');
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } else {
      res.status(404).json({
        status: 'error',
        message: 'ملف الحزمة غير موجود'
      });
    }
  });

  /**
   * نقطة نهاية لتنزيل أحدث إصدار
   * @route GET /download/latest
   */
  app.get('/download/latest', (req: Request, res: Response) => {
    const filePath = path.join(process.cwd(), 'butterbakery-latest.zip');
    
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename=butterbakery-latest.zip');
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } else {
      res.status(404).json({
        status: 'error',
        message: 'ملف الحزمة غير موجود'
      });
    }
  });

  /**
   * نقطة نهاية لتنزيل حزمة محسنة للنشر على Render.com
   * @route GET /download/render-package
   */
  app.get('/download/render-package', (req: Request, res: Response) => {
    const filePath = path.join(process.cwd(), 'butterbakery-render-optimized.zip');
    
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename=butterbakery-render-optimized.zip');
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } else {
      res.status(404).json({
        status: 'error',
        message: 'ملف الحزمة غير موجود'
      });
    }
  });

  /**
   * نقطة نهاية للحصول على قائمة الملفات القابلة للتنزيل
   * @route GET /download/list
   */
  app.get('/download/list', (req: Request, res: Response) => {
    const rootDir = process.cwd();
    const packageFiles = fs.readdirSync(rootDir)
      .filter(file => file.endsWith('.zip') && !file.includes('node_modules'))
      .map(file => {
        const stats = fs.statSync(path.join(rootDir, file));
        return {
          name: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          url: `/download/file/${file}`
        };
      });
    
    res.json({
      status: 'success',
      files: packageFiles,
      downloadOptions: [
        { name: 'GitHub Package', url: '/download/github-package', description: 'حزمة جاهزة للنشر على GitHub' },
        { name: 'Latest Package', url: '/download/latest', description: 'أحدث إصدار من التطبيق' },
        { name: 'Render.com Package', url: '/download/render-package', description: 'حزمة محسنة للنشر على Render.com' }
      ]
    });
  });

  /**
   * نقطة نهاية لتنزيل ملف محدد
   * @route GET /download/file/:filename
   */
  app.get('/download/file/:filename', (req: Request, res: Response) => {
    const filename = req.params.filename;
    const filePath = path.join(process.cwd(), filename);
    
    // تحقق أساسي من صحة الملف - ينبغي أن يكون ملف zip وموجودًا في الدليل الجذر
    if (!filename.endsWith('.zip') || filename.includes('..') || !fs.existsSync(filePath)) {
      return res.status(404).json({
        status: 'error',
        message: 'الملف غير موجود أو غير مسموح بتنزيله'
      });
    }
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  });

  /**
   * نقطة نهاية لتنزيل دليل الاستخدام
   * @route GET /download/manual
   */
  app.get('/download/manual', (req: Request, res: Response) => {
    const manualPath = path.join(process.cwd(), 'MANUAL_GITHUB_GUIDE.md');
    
    if (fs.existsSync(manualPath)) {
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', 'attachment; filename=MANUAL_GITHUB_GUIDE.md');
      const fileStream = fs.createReadStream(manualPath);
      fileStream.pipe(res);
    } else {
      // إذا لم يكن الدليل موجودًا، قم بإنشاء نسخة مبسطة
      const manualContent = `# دليل النشر على GitHub
      
## خطوات النشر على GitHub

1. قم بتنزيل ملف \`butterbakery-github-ready.zip\` من صفحة التنزيلات
2. قم بفك ضغط الملف على جهاز الكمبيوتر الخاص بك
3. قم بإنشاء مستودع جديد على GitHub
4. قم برفع الملفات المستخرجة إلى المستودع

## للنشر على Render.com

1. قم بتنزيل ملف \`butterbakery-render-optimized.zip\` من صفحة التنزيلات
2. استخدم خيار "Deploy from ZIP file" في Render.com
3. قم بتهيئة قاعدة بيانات PostgreSQL جديدة
4. أضف متغيرات البيئة المطلوبة

للمزيد من التفاصيل، راجع ملفات الدليل المضمنة في الحزمة المنزلة.`;
      
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', 'attachment; filename=MANUAL_GITHUB_GUIDE.md');
      res.send(manualContent);
    }
  });

  /**
   * نقطة نهاية لتنزيل نص الملف مباشرة
   * @route GET /download/text/:filename
   */
  app.get('/download/text/:filename', (req: Request, res: Response) => {
    const filename = req.params.filename;
    // قائمة الملفات النصية المسموح بها للتحميل
    const allowedFiles = [
      'README.md', 
      'GITHUB_DEPLOYMENT.md', 
      'RENDER_DEPLOYMENT_GUIDE.md',
      'AWS_DEPLOYMENT_GUIDE.md',
      'RENDER_QUICK_GUIDE.md',
      'TROUBLESHOOTING.md'
    ];
    
    if (!allowedFiles.includes(filename)) {
      return res.status(403).json({
        status: 'error',
        message: 'الملف غير مسموح بتنزيله'
      });
    }
    
    const filePath = path.join(process.cwd(), filename);
    
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } else {
      res.status(404).json({
        status: 'error',
        message: 'الملف غير موجود'
      });
    }
  });
}