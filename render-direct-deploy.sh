#!/bin/bash

# سكريبت النشر المباشر على Render.com
# هذا السكريبت ينشئ خدمات Render.com بدون الحاجة إلى GitHub
# يستخدم طريقة رفع الكود مباشرة عبر حزمة مضغوطة

# معلومات التطبيق على Render.com
APP_NAME="butterbakery-app"
DB_NAME="butterbakery-db"
REGION="frankfurt"  # يمكن تغييرها إلى أي منطقة تفضلها مثل "singapore", "oregon" إلخ

# التحقق من توكن Render.com
if [ -z "$RENDER_API_KEY" ]; then
    echo "❌ خطأ: متغير البيئة RENDER_API_KEY غير موجود"
    echo "يرجى تعيين متغير البيئة RENDER_API_KEY أولاً."
    echo "يمكنك الحصول على مفتاح API من Render.com في صفحة إعدادات الحساب."
    exit 1
fi

# التحقق من توفر صلاحيات توكن Render.com
echo "🔍 التحقق من صلاحيات توكن Render.com..."
render_check=$(curl -s -H "Authorization: Bearer $RENDER_API_KEY" https://api.render.com/v1/owners)

if [[ $render_check == *"id"* ]]; then
    owner_id=$(echo $render_check | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    owner_name=$(echo $render_check | grep -o '"name":"[^"]*' | head -1 | cut -d'"' -f4)
    echo "✅ تم التحقق من توكن Render.com. المالك: $owner_name"
else
    echo "❌ خطأ: توكن Render.com غير صالح أو منتهي الصلاحية."
    echo "الرجاء الحصول على توكن جديد من: https://dashboard.render.com/account/api-keys"
    exit 1
fi

# التحقق من وجود حزمة النشر
DEPLOY_PACKAGE="butterbakery-render-deployment-v3.zip"

if [ ! -f "$DEPLOY_PACKAGE" ]; then
    echo "📦 إنشاء حزمة نشر جديدة..."
    
    # إنشاء مجلد مؤقت
    rm -rf deploy_temp 2>/dev/null
    mkdir -p deploy_temp
    
    # نسخ الملفات الضرورية (باستثناء الملفات الكبيرة وغير الضرورية)
    echo "📋 نسخ ملفات المشروع..."
    cp -r client deploy_temp/
    cp -r server deploy_temp/
    cp -r shared deploy_temp/
    cp -r public deploy_temp/
    
    # نسخ ملفات التكوين الأساسية
    cp package.json deploy_temp/
    cp package-lock.json deploy_temp/
    cp start.js deploy_temp/
    cp drizzle.config.ts deploy_temp/
    cp vite.config.ts deploy_temp/
    cp tailwind.config.ts deploy_temp/
    cp postcss.config.js deploy_temp/
    cp tsconfig.json deploy_temp/
    cp theme.json deploy_temp/
    
    # نسخ الملفات الخاصة بالنشر
    echo "📋 نسخ ملفات النشر والتوثيق..."
    cp render.yaml deploy_temp/
    cp RENDER_DIRECT_DEPLOY_V3.md deploy_temp/
    cp RENDER_DIRECT_DEPLOY_V3_EN.md deploy_temp/
    
    # الانتقال إلى المجلد المؤقت
    cd deploy_temp
    
    # إنشاء ملف .gitignore
    echo "node_modules/
.env
.DS_Store
dist/
*.log" > .gitignore
    
    # إضافة ملف .npmrc للتأكد من تثبيت جميع التبعيات
    echo "# إعدادات NPM لضمان تثبيت جميع التبعيات
legacy-peer-deps=true
node-linker=hoisted
strict-peer-dependencies=false
save-exact=true" > .npmrc
    
    # إضافة ملف README.md بتعليمات النشر
    echo "# ButterBakery Operations Platform

This package contains the complete ButterBakery Operations Platform ready for deployment on Render.com.

## Deployment Instructions

Please refer to one of the following deployment guides:

- [Arabic Deployment Guide](./RENDER_DIRECT_DEPLOY_V3.md)
- [English Deployment Guide](./RENDER_DIRECT_DEPLOY_V3_EN.md)

## Default Login Credentials

- Username: \`admin\`
- Password: \`admin\`

**Important**: Change the default password immediately after your first login.
" > README.md
    
    # ضغط المجلد بشكل صحيح (في المستوى الرئيسي)
    cd ..
    echo "🔄 ضغط ملفات المشروع..."
    cd deploy_temp && zip -r "../$DEPLOY_PACKAGE" * .gitignore && cd ..
    
    # تنظيف المجلد المؤقت
    rm -rf deploy_temp
    
    echo "✅ تم إنشاء حزمة النشر: $DEPLOY_PACKAGE"
fi

# البحث عن قواعد بيانات موجودة بالفعل
echo "🔍 البحث عن قواعد بيانات موجودة بالفعل..."
existing_db=$(curl -s -H "Authorization: Bearer $RENDER_API_KEY" "https://api.render.com/v1/databases?name=$DB_NAME")

DB_ID=""
DB_URL=""

# التحقق مما إذا كانت قاعدة البيانات موجودة بالفعل
if [[ $existing_db == *"$DB_NAME"* ]] && [[ $existing_db == *"id"* ]]; then
    echo "⚠️ تم العثور على قاعدة بيانات بنفس الاسم موجودة بالفعل."
    DB_ID=$(echo $existing_db | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    
    # الحصول على التفاصيل
    db_details=$(curl -s -H "Authorization: Bearer $RENDER_API_KEY" "https://api.render.com/v1/databases/$DB_ID")
    DB_URL=$(echo $db_details | grep -o '"connectionString":"[^"]*' | head -1 | cut -d'"' -f4)
    
    echo "✅ استخدام قاعدة البيانات الموجودة مسبقًا"
    echo "🔗 معرف قاعدة البيانات: $DB_ID"
else
    # إنشاء قاعدة بيانات PostgreSQL جديدة
    echo "🗄️ إنشاء قاعدة بيانات PostgreSQL جديدة..."
    DB_RESPONSE=$(curl -s -X POST \
      -H "Authorization: Bearer $RENDER_API_KEY" \
      -H "Content-Type: application/json" \
      "https://api.render.com/v1/psql-databases" \
      -d "{
        \"name\": \"$DB_NAME\",
        \"region\": \"$REGION\",
        \"plan\": \"free\",
        \"database\": \"butterbakery\",
        \"user\": \"butterbakery_user\"
      }")

    # التحقق من نجاح إنشاء قاعدة البيانات
    if [[ $DB_RESPONSE == *"id"* ]]; then
        DB_ID=$(echo $DB_RESPONSE | grep -o '"id":"[^"]*' | grep -o '[^"]*$' | head -1)
        DB_URL=$(echo $DB_RESPONSE | grep -o '"connectionString":"[^"]*' | grep -o '[^"]*$' | head -1)
        
        echo "✅ تم إنشاء قاعدة البيانات بنجاح!"
        echo "🔗 معرف قاعدة البيانات: $DB_ID"
        
        # انتظار تهيئة قاعدة البيانات (قد تستغرق بعض الوقت)
        echo "⏳ انتظار تهيئة قاعدة البيانات (قد يستغرق هذا عدة دقائق)..."
        sleep 30  # انتظار 30 ثانية على الأقل
    else
        echo "❌ فشل إنشاء قاعدة البيانات. رسالة الخطأ:"
        echo $DB_RESPONSE
        exit 1
    fi
fi

# البحث عن خدمات الويب الموجودة بالفعل
echo "🔍 البحث عن خدمات الويب الموجودة بالفعل..."
existing_web=$(curl -s -H "Authorization: Bearer $RENDER_API_KEY" "https://api.render.com/v1/services?name=$APP_NAME")

WEB_ID=""
WEB_URL=""

# التحقق مما إذا كانت خدمة الويب موجودة بالفعل
if [[ $existing_web == *"$APP_NAME"* ]] && [[ $existing_web == *"id"* ]]; then
    echo "⚠️ تم العثور على خدمة ويب بنفس الاسم موجودة بالفعل."
    WEB_ID=$(echo $existing_web | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    
    # الحصول على التفاصيل
    web_details=$(curl -s -H "Authorization: Bearer $RENDER_API_KEY" "https://api.render.com/v1/services/$WEB_ID")
    WEB_URL=$(echo $web_details | grep -o '"url":"[^"]*' | head -1 | cut -d'"' -f4)
    
    # تحديث خدمة الويب لاستخدام رفع مباشر
    echo "🔄 تحديث خدمة الويب لاستخدام الرفع المباشر..."
    UPDATE_RESPONSE=$(curl -s -X PATCH \
      -H "Authorization: Bearer $RENDER_API_KEY" \
      -H "Content-Type: application/json" \
      "https://api.render.com/v1/services/$WEB_ID" \
      -d "{
        \"serviceDetails\": {
          \"buildCommand\": \"npm install\",
          \"startCommand\": \"node start.js\",
          \"envVars\": [
            {\"key\": \"NODE_ENV\", \"value\": \"production\"},
            {\"key\": \"PORT\", \"value\": \"10000\"},
            {\"key\": \"DATABASE_URL\", \"value\": \"$DB_URL\"}
          ],
          \"pullRequestPreviewsEnabled\": false
        }
      }")
    
    echo "✅ تم تحديث خدمة الويب الموجودة!"
    echo "🔗 رابط التطبيق: $WEB_URL"
    
    # رفع حزمة النشر مباشرة
    echo "⬆️ رفع حزمة النشر مباشرة..."
    DEPLOY_RESPONSE=$(curl -s -X POST \
      -H "Authorization: Bearer $RENDER_API_KEY" \
      -H "Content-Type: multipart/form-data" \
      -F "file=@$DEPLOY_PACKAGE" \
      "https://api.render.com/v1/services/$WEB_ID/deploys")
    
    if [[ $DEPLOY_RESPONSE == *"id"* ]]; then
        DEPLOY_ID=$(echo $DEPLOY_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
        echo "✅ تم بدء عملية النشر بنجاح! معرف النشر: $DEPLOY_ID"
    else
        echo "⚠️ واجهنا مشكلة في بدء عملية النشر."
        echo $DEPLOY_RESPONSE
    fi
else
    # إنشاء خدمة الويب باستخدام الرفع المباشر
    echo "🌐 إنشاء خدمة الويب جديدة باستخدام الرفع المباشر..."
    
    # إنشاء خدمة ويب فارغة أولاً
    WEB_RESPONSE=$(curl -s -X POST \
      -H "Authorization: Bearer $RENDER_API_KEY" \
      -H "Content-Type: application/json" \
      https://api.render.com/v1/services \
      -d "{
        \"name\": \"$APP_NAME\",
        \"type\": \"web_service\",
        \"region\": \"$REGION\",
        \"serviceDetails\": {
          \"env\": \"node\",
          \"buildCommand\": \"npm install\",
          \"startCommand\": \"node start.js\",
          \"envVars\": [
            {\"key\": \"NODE_ENV\", \"value\": \"production\"},
            {\"key\": \"PORT\", \"value\": \"10000\"},
            {\"key\": \"DATABASE_URL\", \"value\": \"$DB_URL\"}
          ],
          \"pullRequestPreviewsEnabled\": false
        },
        \"plan\": \"free\"
      }")
    
    # التحقق من نجاح إنشاء خدمة الويب
    if [[ $WEB_RESPONSE == *"id"* ]]; then
        WEB_ID=$(echo $WEB_RESPONSE | grep -o '"id":"[^"]*' | grep -o '[^"]*$' | head -1)
        WEB_URL=$(echo $WEB_RESPONSE | grep -o '"url":"[^"]*' | grep -o '[^"]*$' | head -1)
        
        echo "✅ تم إنشاء خدمة الويب بنجاح!"
        echo "🔗 رابط التطبيق: $WEB_URL"
        
        # رفع حزمة النشر مباشرة
        echo "⬆️ رفع حزمة النشر مباشرة..."
        sleep 5  # انتظار قليلاً للتأكد من أن الخدمة جاهزة
        
        DEPLOY_RESPONSE=$(curl -s -X POST \
          -H "Authorization: Bearer $RENDER_API_KEY" \
          -H "Content-Type: multipart/form-data" \
          -F "file=@$DEPLOY_PACKAGE" \
          "https://api.render.com/v1/services/$WEB_ID/deploys")
        
        if [[ $DEPLOY_RESPONSE == *"id"* ]]; then
            DEPLOY_ID=$(echo $DEPLOY_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
            echo "✅ تم بدء عملية النشر بنجاح! معرف النشر: $DEPLOY_ID"
        else
            echo "⚠️ واجهنا مشكلة في بدء عملية النشر. سنحاول مرة أخرى بعد قليل."
            echo $DEPLOY_RESPONSE
            
            # انتظار أطول ثم المحاولة مرة أخرى
            echo "⏳ انتظار 30 ثانية ثم المحاولة مرة أخرى..."
            sleep 30
            
            echo "⬆️ محاولة رفع حزمة النشر مرة أخرى..."
            DEPLOY_RESPONSE=$(curl -s -X POST \
              -H "Authorization: Bearer $RENDER_API_KEY" \
              -H "Content-Type: multipart/form-data" \
              -F "file=@$DEPLOY_PACKAGE" \
              "https://api.render.com/v1/services/$WEB_ID/deploys")
            
            if [[ $DEPLOY_RESPONSE == *"id"* ]]; then
                DEPLOY_ID=$(echo $DEPLOY_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
                echo "✅ تم بدء عملية النشر بنجاح في المحاولة الثانية! معرف النشر: $DEPLOY_ID"
            else
                echo "⚠️ لم نتمكن من بدء عملية النشر تلقائيًا."
                echo "الرجاء محاولة رفع الملفات يدويًا من خلال لوحة تحكم Render.com:"
                echo "https://dashboard.render.com/web/$WEB_ID"
            fi
        fi
    else
        echo "❌ فشل إنشاء خدمة الويب. رسالة الخطأ:"
        echo $WEB_RESPONSE
        exit 1
    fi
fi

# حفظ معلومات الخدمات للاستخدام لاحقًا
RENDER_DASHBOARD_URL="https://dashboard.render.com/web/$WEB_ID"
echo "💾 حفظ معلومات خدمات Render.com للاستخدام لاحقًا..."
echo "{
  \"app_name\": \"$APP_NAME\",
  \"app_url\": \"$WEB_URL\",
  \"db_name\": \"$DB_NAME\",
  \"db_id\": \"$DB_ID\",
  \"region\": \"$REGION\",
  \"dashboard_url\": \"$RENDER_DASHBOARD_URL\",
  \"deploy_type\": \"direct-upload\",
  \"deploy_date\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
}" > render-direct-deploy-info.json

echo "🎉 تم النشر بنجاح! التطبيق الآن قيد البناء والتشغيل على Render.com"
echo "⏱️ قد تستغرق عملية البناء والنشر الأولية بضع دقائق"
echo "📋 بعد اكتمال العملية، يمكنك الوصول إلى التطبيق عبر الرابط:"
echo "🔗 التطبيق: $WEB_URL"
echo "🔗 لوحة التحكم: $RENDER_DASHBOARD_URL"
echo ""
echo "🔐 معلومات تسجيل الدخول الافتراضية:"
echo "  👤 اسم المستخدم: admin"
echo "  🔑 كلمة المرور: admin"
echo "  ⚠️ يُرجى تغيير كلمة المرور الافتراضية فور تسجيل الدخول لأول مرة"