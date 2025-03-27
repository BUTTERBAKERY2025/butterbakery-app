# دليل النشر على GitHub

## الخطوات
1. قم بإنشاء مستودع جديد على GitHub
2. قم برفع جميع ملفات هذا المجلد إلى المستودع

### طريقة واجهة GitHub:
1. انتقل إلى [GitHub](https://github.com) وقم بتسجيل الدخول
2. انقر على زر "+" في الزاوية العلوية اليمنى واختر "New repository"
3. أدخل اسم المستودع (مثل "butterbakery-app")
4. اختر "Public" أو "Private" حسب الحاجة
5. انقر على "Create repository"
6. في الصفحة التالية، انقر على "uploading an existing file"
7. اسحب وأفلت جميع ملفات هذا المجلد، أو انقر على مساحة السحب لاختيار الملفات يدويًا
8. انقر على "Commit changes"

## النشر على Render.com
1. قم بتسجيل الدخول إلى [Render.com](https://render.com)
2. انقر على "New" واختر "Web Service"
3. حدد "Build and deploy from a Git repository"
4. اختر المستودع الذي أنشأته
5. استخدم الإعدادات التالية:
   - Name: butterbakery-app
   - Region: اختر الأقرب إليك
   - Branch: main
   - Build Command: npm install && npm run build
   - Start Command: node start.js
6. اضبط متغيرات البيئة:
   - DATABASE_URL: رابط قاعدة بيانات PostgreSQL
7. انقر على "Create Web Service"
