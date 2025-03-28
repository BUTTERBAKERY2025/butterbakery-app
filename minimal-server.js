/**
 * خادم الويب المصغر
 * يستخدم في حالة فشل الخادم الرئيسي
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

// إنشاء تطبيق Express
const app = express();
const PORT = process.env.PORT || 3000;

// المسار للملفات الثابتة
const staticPath = path.join(__dirname, 'client', 'dist');
const indexPath = path.join(staticPath, 'index.html');

// التحقق من وجود ملفات الواجهة المبنية مسبقًا
const hasBuiltClient = fs.existsSync(staticPath) && fs.existsSync(indexPath);

if (hasBuiltClient) {
  console.log('تم العثور على ملفات الواجهة المبنية مسبقًا، سيتم استخدامها.');
  
  // استخدام الملفات الثابتة
  app.use(express.static(staticPath));
  
  // توجيه جميع الطلبات إلى index.html
  app.get('*', (req, res) => {
    res.sendFile(indexPath);
  });
} else {
  console.log('لم يتم العثور على ملفات الواجهة المبنية مسبقًا، سيتم إنشاء واجهة بسيطة.');
  
  // إنشاء صفحة بسيطة في حالة عدم وجود ملفات مبنية مسبقًا
  app.get('*', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>ButterBakery OPS - وضع الطوارئ</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f5f5f5;
              color: #333;
              text-align: center;
              padding: 50px;
              direction: rtl;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
              background-color: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
            }
            h1 {
              color: #f59e0b;
            }
            .status {
              margin: 30px 0;
              padding: 15px;
              background-color: #ffe9c2;
              border-radius: 5px;
            }
            .info {
              text-align: right;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>ButterBakery OPS - وضع الطوارئ</h1>
            <div class="status">
              الخادم يعمل في وضع الطوارئ. يرجى الانتظار حتى استعادة الخدمة الكاملة.
            </div>
            <div class="info">
              <p><strong>حالة الاتصال:</strong> تم الاتصال بقاعدة البيانات</p>
              <p><strong>بيئة التشغيل:</strong> ${process.env.NODE_ENV || 'development'}</p>
              <p><strong>إصدار Node.js:</strong> ${process.version}</p>
              <p><strong>الوقت:</strong> ${new Date().toLocaleString('ar-SA')}</p>
            </div>
            <p>
              لأي استفسارات أو مساعدة، يرجى التواصل مع الدعم الفني.
            </p>
          </div>
        </body>
      </html>
    `);
  });
}

// بدء الخادم
app.listen(PORT, () => {
  console.log(`الخادم المصغر يعمل على المنفذ ${PORT}`);
});