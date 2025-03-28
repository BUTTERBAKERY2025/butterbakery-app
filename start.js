/**
 * ملف بدء تشغيل تطبيق ButterBakery لمنصة Render.com
 * يستخدم CommonJS لضمان التوافق مع Node.js في بيئة Render.com
 */

// استيراد المكتبات اللازمة (بأسلوب CommonJS)
const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// تهيئة إكسبرس
const app = express();
const PORT = process.env.PORT || 10000;

// طباعة معلومات النظام للتشخيص
console.log(`🔍 معلومات النظام:`);
console.log(`- Node.js: ${process.version}`);
console.log(`- المسار الحالي: ${process.cwd()}`);
console.log(`- المسار المطلق: ${__dirname}`);
console.log(`- منفذ التشغيل: ${PORT}`);
console.log(`- متغيرات البيئة: NODE_ENV=${process.env.NODE_ENV}`);

// محاولة الكشف عن هيكل المجلدات
try {
  console.log(`\n📂 محتويات المجلد الحالي:`);
  const files = fs.readdirSync(process.cwd());
  files.forEach(file => {
    const stats = fs.statSync(path.join(process.cwd(), file));
    console.log(`- ${stats.isDirectory() ? '📁' : '📄'} ${file}`);
  });
} catch (error) {
  console.error(`❌ خطأ في قراءة المجلد: ${error.message}`);
}

// إعداد المسارات
const publicPath = path.join(process.cwd(), 'public');
const clientDistPath = path.join(process.cwd(), 'client', 'dist');

// محاولة العثور على مجلد public
let staticPath = '';
if (fs.existsSync(publicPath)) {
  staticPath = publicPath;
  console.log(`✅ تم العثور على مجلد public: ${publicPath}`);
} else if (fs.existsSync(clientDistPath)) {
  staticPath = clientDistPath;
  console.log(`✅ تم العثور على مجلد client/dist: ${clientDistPath}`);
} else {
  console.log(`⚠️ لم يتم العثور على مجلدات واجهة المستخدم. سيتم إنشاء واجهة بسيطة.`);
  // إنشاء مجلد static إذا لم يكن موجوداً
  if (!fs.existsSync(path.join(process.cwd(), 'static'))) {
    fs.mkdirSync(path.join(process.cwd(), 'static'));
  }
  staticPath = path.join(process.cwd(), 'static');
  
  // إنشاء ملف HTML بسيط
  const htmlContent = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ButterBakery - حالة الخادم</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f5f5f5;
      color: #333;
      margin: 0;
      padding: 20px;
      text-align: center;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background-color: white;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .status {
      margin: 20px 0;
      padding: 15px;
      border-radius: 5px;
      background-color: #e8f5e9;
    }
    h1 {
      color: #4caf50;
    }
    .info {
      text-align: left;
      background-color: #f5f5f5;
      padding: 15px;
      border-radius: 5px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>ButterBakery - حالة الخادم</h1>
    <div class="status">
      ✅ الخادم يعمل بنجاح!
    </div>
    <p>تم التحقق من حالة التشغيل بنجاح. الخادم جاهز لاستقبال الطلبات.</p>
    <div class="info">
      <h3>معلومات النظام:</h3>
      <ul>
        <li><strong>Node.js:</strong> ${process.version}</li>
        <li><strong>المنفذ:</strong> ${PORT}</li>
        <li><strong>البيئة:</strong> ${process.env.NODE_ENV || 'development'}</li>
        <li><strong>الوقت:</strong> ${new Date().toLocaleString()}</li>
      </ul>
    </div>
  </div>
</body>
</html>
  `;
  
  fs.writeFileSync(path.join(staticPath, 'index.html'), htmlContent);
  console.log(`✅ تم إنشاء صفحة HTML بسيطة في ${staticPath}/index.html`);
}

// إعداد المجلد العام
app.use(express.static(staticPath));
app.use(express.json());

// إعداد مسارات API الأساسية
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    nodejs: process.version,
    environment: process.env.NODE_ENV || 'development'
  });
});

// توجيه الطلبات إلى ملف index.html
app.get('*', (req, res) => {
  // محاولة إرسال ملف index.html
  const indexPath = path.join(staticPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send(`
      <h1>ButterBakery - الخادم يعمل</h1>
      <p>تم تشغيل الخادم بنجاح ولكن لم يتم العثور على ملف index.html.</p>
      <p>الوقت الحالي: ${new Date().toLocaleString()}</p>
    `);
  }
});

// محاولة فحص قاعدة البيانات إذا كان متوفراً
try {
  if (process.env.DATABASE_URL) {
    console.log(`\n🔍 محاولة فحص الاتصال بقاعدة البيانات...`);
    const dbCheckScript = path.join(process.cwd(), 'render-db-check.js');
    
    if (fs.existsSync(dbCheckScript)) {
      exec('node render-db-check.js', (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ خطأ في فحص قاعدة البيانات: ${error.message}`);
          return;
        }
        if (stderr) {
          console.error(`⚠️ تحذير: ${stderr}`);
          return;
        }
        console.log(`✅ نتيجة فحص قاعدة البيانات:\n${stdout}`);
      });
    } else {
      console.log(`⚠️ لم يتم العثور على سكريبت فحص قاعدة البيانات.`);
    }
  } else {
    console.log(`⚠️ متغير DATABASE_URL غير معرّف. تم تخطي فحص قاعدة البيانات.`);
  }
} catch (error) {
  console.error(`❌ خطأ في فحص قاعدة البيانات: ${error.message}`);
}

// بدء الاستماع على المنفذ المحدد
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 خادم ButterBakery يعمل على المنفذ ${PORT}`);
  console.log(`📊 يمكن الوصول إلى الخادم عبر: http://localhost:${PORT}`);
  console.log(`📣 ملاحظة: هذا خادم بسيط للتحقق من صحة النشر على Render.com`);
});