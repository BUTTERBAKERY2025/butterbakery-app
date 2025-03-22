#!/bin/bash

# سكريبت لترحيل قاعدة البيانات باستخدام Drizzle ORM
# يستخدم هذا السكريبت لتهيئة قاعدة البيانات بعد النشر على Render.com

echo "🗃️ بدء ترحيل قاعدة البيانات..."

# التحقق من وجود متغير بيئة قاعدة البيانات
if [ -z "$DATABASE_URL" ]; then
    echo "❌ خطأ: متغير البيئة DATABASE_URL غير موجود"
    echo "يرجى تعيين متغير البيئة DATABASE_URL قبل تشغيل هذا السكريبت"
    exit 1
fi

# ترحيل قاعدة البيانات باستخدام Drizzle
echo "🔄 تنفيذ ترحيل قاعدة البيانات باستخدام Drizzle..."
npx drizzle-kit push:pg

# رمز الخروج من الأمر السابق
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ تم ترحيل قاعدة البيانات بنجاح"
else
    echo "❌ فشل ترحيل قاعدة البيانات، رمز الخطأ: $EXIT_CODE"
    exit $EXIT_CODE
fi

echo "🔍 التحقق من قاعدة البيانات..."
node deploy/check_database.js

echo "🏁 اكتمل تنفيذ سكريبت الترحيل"
exit 0