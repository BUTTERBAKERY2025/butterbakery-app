#!/bin/bash

# سكريبت لدفع الملفات إلى مستودع GitHub باستخدام TOKEN
# استخدم هذا السكريبت بعد إضافة GITHUB_TOKEN إلى البيئة

# الحصول على رمز الوصول من متغير البيئة
GITHUB_TOKEN="${GITHUB_TOKEN}"

# التحقق من وجود الرمز
if [ -z "$GITHUB_TOKEN" ]; then
  echo "خطأ: لم يتم العثور على GITHUB_TOKEN في متغيرات البيئة"
  exit 1
fi

# معلومات المستودع
REPO_URL="https://github.com/BUTTERBAKERY2025/butterbakery.git"
REPO_URL_WITH_TOKEN="https://${GITHUB_TOKEN}@github.com/BUTTERBAKERY2025/butterbakery.git"

echo "جاري التحقق من تكوين Git..."
git config --global user.name "ButterBakery Deployment"
git config --global user.email "deploy@butterbakery-op.com"

echo "معلومات المستودع الحالية:"
git remote -v

# إضافة المستودع البعيد باستخدام الرمز إذا لم يكن موجوداً
if ! git remote | grep -q "origin-token"; then
  echo "إضافة المستودع البعيد باستخدام الرمز..."
  git remote add origin-token "${REPO_URL_WITH_TOKEN}"
fi

# التأكد من إضافة جميع التغييرات
echo "جاري إضافة الملفات المتعلقة بالنشر..."
git add start.js render.yaml RENDER_DEPLOYMENT_GUIDE.md RENDER_QUICKSTART.md
git add deploy/check_database.js github_publish_files.zip github-commit-message.txt

# عرض حالة التغييرات
echo "حالة التغييرات:"
git status --short

# إنشاء الالتزام
echo "جاري إنشاء الالتزام..."
git commit -m "إضافة دعم النشر على Render.com مع تكامل قاعدة بيانات PostgreSQL"

# الدفع إلى المستودع باستخدام الرمز
echo "جاري الدفع إلى المستودع باستخدام الرمز..."
git push origin-token main

echo "اكتمل دفع التغييرات إلى GitHub!"