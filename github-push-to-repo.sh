#!/bin/bash

# قراءة معلومات دفع GitHub من ملف التكوين
source ./github-push-info.txt

# التأكد من وجود رمز الوصول GitHub
if [ -z "$GITHUB_TOKEN" ]; then
  echo "خطأ: رمز الوصول GITHUB_TOKEN غير موجود."
  echo "يرجى التأكد من إضافة GITHUB_TOKEN كمتغير بيئة."
  exit 1
fi

# تجهيز مجلد مؤقت للعمل عليه
TEMP_DIR=$(mktemp -d)
echo "إنشاء مجلد مؤقت للعمل: $TEMP_DIR"

# استنساخ المستودع
echo "استنساخ المستودع من $GITHUB_REPO_URL..."
git clone "https://${GITHUB_TOKEN}@${GITHUB_REPO_URL#https://}" "$TEMP_DIR"
cd "$TEMP_DIR"

# إعداد معلومات المستخدم لـ Git
git config user.name "$GITHUB_USERNAME"
git config user.email "auto-commit@butterbakery-op.com"

# نسخ ملفات واجهة تسجيل الدخول المحدثة
echo "نسخ ملفات واجهة تسجيل الدخول المحدثة..."
cp -f /home/runner/client/src/pages/login.tsx ./client/src/pages/login.tsx

# قراءة رسالة الالتزام
COMMIT_MESSAGE=$(cat /home/runner/$COMMIT_MESSAGE_FILE)

# إضافة التغييرات وإجراء الالتزام
git add .
git commit -m "$COMMIT_MESSAGE"

# دفع التغييرات للفرع
echo "دفع التغييرات إلى $GITHUB_BRANCH..."
git push origin "$GITHUB_BRANCH"

echo "اكتمل الدفع بنجاح!"

# تنظيف المجلد المؤقت
cd /home/runner
rm -rf "$TEMP_DIR"