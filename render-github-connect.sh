#!/bin/bash

# سكريبت ربط مستودع GitHub مع Render.com
# هذا السكريبت يقوم بإنشاء خدمة ويب وقاعدة بيانات على Render.com وربطها بمستودع GitHub

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

# التحقق من وجود معلومات مستودع GitHub
if [ ! -f "github-repo-info.json" ]; then
    echo "❌ خطأ: ملف معلومات مستودع GitHub (github-repo-info.json) غير موجود"
    echo "يرجى تشغيل سكريبت 'github-setup-repo.sh' أولاً لإنشاء مستودع GitHub ودفع الكود إليه"
    exit 1
fi

# قراءة معلومات مستودع GitHub
REPO_URL=$(cat github-repo-info.json | grep -o '"repo_url":"[^"]*' | grep -o '[^"]*$')
REPO_NAME=$(cat github-repo-info.json | grep -o '"repo_name":"[^"]*' | grep -o '[^"]*$')
CLONE_URL=$(cat github-repo-info.json | grep -o '"clone_url":"[^"]*' | grep -o '[^"]*$')

echo "🚀 بدء إنشاء خدمات Render.com وربطها بمستودع GitHub: $REPO_NAME"
echo "🔗 رابط المستودع: $REPO_URL"

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
      https://api.render.com/v1/databases \
      -d "{
        \"name\": \"$DB_NAME\",
        \"region\": \"$REGION\",
        \"instanceType\": \"free\",
        \"databaseName\": \"butterbakery\",
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
    
    # تحديث خدمة الويب لاستخدام المستودع الجديد
    echo "🔄 تحديث خدمة الويب لاستخدام المستودع الجديد..."
    UPDATE_RESPONSE=$(curl -s -X PATCH \
      -H "Authorization: Bearer $RENDER_API_KEY" \
      -H "Content-Type: application/json" \
      "https://api.render.com/v1/services/$WEB_ID" \
      -d "{
        \"serviceDetails\": {
          \"repo\": \"$CLONE_URL\",
          \"branch\": \"master\",
          \"autoDeploy\": \"yes\",
          \"envVars\": [
            {\"key\": \"NODE_ENV\", \"value\": \"production\"},
            {\"key\": \"PORT\", \"value\": \"10000\"},
            {\"key\": \"DATABASE_URL\", \"value\": \"$DB_URL\"}
          ]
        }
      }")
    
    echo "✅ تم تحديث خدمة الويب الموجودة!"
    echo "🔗 رابط التطبيق: $WEB_URL"
    
    # إعادة نشر التطبيق
    echo "🔄 إعادة نشر التطبيق..."
    DEPLOY_RESPONSE=$(curl -s -X POST \
      -H "Authorization: Bearer $RENDER_API_KEY" \
      "https://api.render.com/v1/services/$WEB_ID/deploys")
    
    if [[ $DEPLOY_RESPONSE == *"id"* ]]; then
        echo "✅ تم بدء عملية إعادة النشر بنجاح!"
    else
        echo "⚠️ لم نتمكن من بدء عملية إعادة النشر تلقائيًا. ستتم عند الدفع التالي للمستودع."
    fi
else
    # إنشاء خدمة الويب وربطها بمستودع GitHub
    echo "🌐 إنشاء خدمة الويب جديدة وربطها بمستودع GitHub..."
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
          \"repo\": \"$CLONE_URL\",
          \"branch\": \"master\",
          \"autoDeploy\": \"yes\"
        },
        \"instanceType\": \"free\"
      }")
    
    # التحقق من نجاح إنشاء خدمة الويب
    if [[ $WEB_RESPONSE == *"id"* ]]; then
        WEB_ID=$(echo $WEB_RESPONSE | grep -o '"id":"[^"]*' | grep -o '[^"]*$' | head -1)
        WEB_URL=$(echo $WEB_RESPONSE | grep -o '"serviceDetails":{[^}]*"url":"[^"]*' | grep -o '"url":"[^"]*' | grep -o '[^"]*$' | head -1)
        
        echo "✅ تم إنشاء خدمة الويب بنجاح!"
        echo "🔗 رابط التطبيق: $WEB_URL"
    else
        echo "❌ فشل إنشاء خدمة الويب. رسالة الخطأ:"
        echo $WEB_RESPONSE
        exit 1
    fi
fi

# حفظ معلومات الخدمات للاستخدام لاحقًا
echo "💾 حفظ معلومات خدمات Render.com للاستخدام لاحقًا..."
echo "{\"app_name\":\"$APP_NAME\",\"app_url\":\"$WEB_URL\",\"db_name\":\"$DB_NAME\",\"db_id\":\"$DB_ID\",\"region\":\"$REGION\"}" > render-services-info.json

# إضافة رابط واجهة برمجة التطبيقات إلى ملف المعلومات
RENDER_DASHBOARD_URL="https://dashboard.render.com/web/$WEB_ID"
echo "📝 إضافة رابط لوحة تحكم Render.com إلى ملف المعلومات..."
temp=$(cat render-services-info.json | sed 's/}$/,\"dashboard_url\":\"'$RENDER_DASHBOARD_URL'\"}/')
echo $temp > render-services-info.json

echo "🎉 تم الربط بنجاح! التطبيق الآن قيد البناء والنشر على Render.com"
echo "⏱️ قد تستغرق عملية البناء والنشر الأولية بضع دقائق"
echo "📋 بعد اكتمال العملية، يمكنك الوصول إلى التطبيق عبر الرابط:"
echo "🔗 التطبيق: $WEB_URL"
echo "🔗 لوحة التحكم: $RENDER_DASHBOARD_URL"
echo ""
echo "🔐 معلومات تسجيل الدخول الافتراضية:"
echo "  👤 اسم المستخدم: admin"
echo "  🔑 كلمة المرور: admin"
echo "  ⚠️ يُرجى تغيير كلمة المرور الافتراضية فور تسجيل الدخول لأول مرة"