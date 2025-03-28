# نشر مشروع ButterBakery إلى GitHub

## محتويات الحزمة

هذه الحزمة تحتوي على الملفات الأساسية للمشروع، حيث تم استبعاد:
- المجلدات المؤقتة والمجلدات التي يمكن إعادة إنشائها
- ملفات التسجيل والتصحيح
- النسخ المكررة من الوثائق

## طريقة النشر على GitHub:

1. قم بإنشاء مستودع جديد على GitHub
2. قم بتنزيل الملف `butterbakery-github-minimal.zip`
3. قم بفك ضغط الملف على جهازك
4. ارفع المحتويات إلى المستودع باستخدام أحد الطرق التالية:
   
   - واجهة GitHub المرئية (سحب وإفلات)
   - أوامر Git المباشرة:
     ```
     git init
     git add .
     git commit -m "نشر ملفات مشروع ButterBakery"
     git branch -M main
     git remote add origin https://github.com/username/repo-name.git
     git push -u origin main
     ```

## بعد النشر:

يمكن نشر المشروع على Render.com باستخدام الرابط المباشر من GitHub:
1. انتقل إلى Render.com وقم بإنشاء خدمة جديدة
2. اختر "Build and deploy from a Git repository"
3. اختر المستودع الذي قمت بإنشائه
4. استخدم الإعدادات التالية:
   - نوع الخدمة: Web Service
   - وقت التنفيذ: Node
   - أمر البدء: `node start.js`
   - أمر البناء: `npm install && npm run build`

لمزيد من التفاصيل، يرجى الرجوع إلى ملف `RENDER_FINAL_DEPLOY_GUIDE.md`
