#!/bin/bash

# سكريبت النشر الشامل: من المشروع المحلي إلى Render.com عبر GitHub
# هذا السكريبت يجمع كل خطوات النشر في مكان واحد

echo "🚀 بدء عملية النشر الشامل لتطبيق ButterBakery"
echo "⚙️ هذا السكريبت سيقوم بالخطوات التالية:"
echo "  1. إنشاء مستودع GitHub جديد ودفع الكود إليه"
echo "  2. إنشاء قاعدة بيانات PostgreSQL وخدمة ويب على Render.com"
echo "  3. ربط خدمة الويب بمستودع GitHub للنشر التلقائي"

# التحقق من توكن GitHub
if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ خطأ: متغير البيئة GITHUB_TOKEN غير موجود"
    echo "يرجى تعيين متغير البيئة GITHUB_TOKEN قبل تشغيل هذا السكريبت"
    exit 1
fi

# التحقق من توكن Render.com
if [ -z "$RENDER_API_KEY" ]; then
    echo "❌ خطأ: متغير البيئة RENDER_API_KEY غير موجود"
    echo "يرجى الحصول على مفتاح API من Render.com وتعيينه كمتغير بيئة"
    exit 1
fi

# التأكد من أن السكريبتات الفرعية موجودة وقابلة للتنفيذ
if [ ! -f "github-setup-repo.sh" ]; then
    echo "❌ خطأ: ملف github-setup-repo.sh غير موجود"
    exit 1
fi

if [ ! -f "render-github-connect.sh" ]; then
    echo "❌ خطأ: ملف render-github-connect.sh غير موجود"
    exit 1
fi

# جعل السكريبتات قابلة للتنفيذ
chmod +x github-setup-repo.sh
chmod +x render-github-connect.sh

# تنفيذ الخطوة 1: إنشاء مستودع GitHub
echo "🔄 جاري تنفيذ الخطوة 1: إنشاء مستودع GitHub..."
./github-setup-repo.sh
if [ $? -ne 0 ]; then
    echo "❌ فشل إنشاء مستودع GitHub"
    exit 1
fi

# تنفيذ الخطوة 2 و 3: إنشاء خدمات Render.com وربطها بمستودع GitHub
echo "🔄 جاري تنفيذ الخطوة 2 و 3: إنشاء خدمات Render.com وربطها بمستودع GitHub..."
./render-github-connect.sh
if [ $? -ne 0 ]; then
    echo "❌ فشل إنشاء خدمات Render.com أو ربطها بمستودع GitHub"
    exit 1
fi

# عرض ملخص النشر
if [ -f "github-repo-info.json" ] && [ -f "render-services-info.json" ]; then
    GITHUB_REPO_URL=$(cat github-repo-info.json | grep -o '"repo_url":"[^"]*' | grep -o '[^"]*$')
    RENDER_APP_URL=$(cat render-services-info.json | grep -o '"app_url":"[^"]*' | grep -o '[^"]*$')
    
    echo "🎉 تم اكتمال عملية النشر بنجاح!"
    echo "📋 ملخص النشر:"
    echo "  🔗 مستودع GitHub: $GITHUB_REPO_URL"
    echo "  🔗 تطبيق Render.com: $RENDER_APP_URL"
    echo ""
    echo "⏱️ قد تستغرق عملية البناء والنشر الأولية بضع دقائق"
    echo "🔍 يمكنك متابعة عملية البناء من لوحة تحكم Render.com"
    echo "🔐 معلومات تسجيل الدخول الافتراضية:"
    echo "  👤 اسم المستخدم: admin"
    echo "  🔑 كلمة المرور: admin"
    echo "  ⚠️ يُرجى تغيير كلمة المرور الافتراضية فور تسجيل الدخول لأول مرة"
else
    echo "⚠️ تم تنفيذ السكريبت، ولكن لم يتم العثور على ملفات المعلومات الكاملة"
fi

echo "🏁 انتهى تنفيذ سكريبت النشر الشامل"