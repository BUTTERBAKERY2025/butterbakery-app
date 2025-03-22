#!/bin/bash

# استيراد معلومات المستودع من ملف الإعدادات
source ./github-push-info.txt
GITHUB_REPO="$GITHUB_USERNAME/$(echo $GITHUB_REPO_URL | sed 's/.*\/\([^\/]*\)\.git$/\1/')"
BRANCH="$GITHUB_BRANCH"

# التأكد من وجود الرمز السري
if [ -z "$GITHUB_TOKEN" ]; then
  echo "خطأ: رمز الوصول GITHUB_TOKEN غير موجود."
  echo "يرجى التأكد من إضافة GITHUB_TOKEN كمتغير بيئة."
  exit 1
fi

# إنشاء مجلد عمل مؤقت
TEMP_DIR=$(mktemp -d)
echo "إنشاء مجلد مؤقت: $TEMP_DIR"

# استنساخ المستودع
echo "استنساخ المستودع من GitHub..."
git clone "https://$GITHUB_TOKEN@github.com/$GITHUB_REPO.git" "$TEMP_DIR"
cd "$TEMP_DIR"

# إعداد معلومات Git
git config user.name "BestButterBakeryOP"
git config user.email "auto-commit@butterybakery.com"

# نسخ الملفات المحدثة
echo "نسخ الملفات المحدثة..."
# إنشاء المجلدات اللازمة
mkdir -p client/src/pages
mkdir -p client/src/components/ui

# نسخ ملف صفحة تسجيل الدخول
cp -f "./client/src/pages/login.tsx" client/src/pages/

# نسخ ملف تنسيق الشعار
if [ -f "./client/src/components/ui/logo.css" ]; then
  cp -f "./client/src/components/ui/logo.css" client/src/components/ui/
fi

# نسخ صور الشعار إذا كانت موجودة
if [ -d "./public/images" ]; then
  mkdir -p public/images
  cp -rf "./public/images" public/
fi

# إضافة التغييرات وعمل الالتزام
git add client/src/pages/login.tsx
# إضافة ملف CSS إذا كان موجودًا
if [ -f "client/src/components/ui/logo.css" ]; then
  git add client/src/components/ui/logo.css
fi
# إضافة مجلد الصور إذا كان موجودًا
if [ -d "public/images" ]; then
  git add public/images
fi

# قراءة رسالة الالتزام من الملف إذا كان موجودًا
COMMIT_MESSAGE="تحسين واجهة تسجيل الدخول وإضافة الشعار الجديد"
if [ -f "./github-commit-message.txt" ]; then
  COMMIT_MESSAGE=$(cat ./github-commit-message.txt)
fi

git commit -m "$COMMIT_MESSAGE"

# دفع التغييرات
echo "دفع التغييرات إلى GitHub..."
git push origin $BRANCH

echo "اكتمل دفع التعديلات بنجاح!"

# تنظيف
cd ~
rm -rf "$TEMP_DIR"