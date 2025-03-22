#!/bin/bash

# سكريبت إنشاء مستودع GitHub ودفع الكود إليه
# هذا السكريبت يقوم بإنشاء مستودع GitHub جديد ودفع الكود الحالي إليه

# معلومات المستودع - يمكن تغييرها حسب الرغبة
REPO_NAME="butterbakery-app"
REPO_DESC="تطبيق إدارة مخبز ButterBakery"
REPO_VISIBILITY="private"  # يمكن تغييرها إلى "public" إذا أردت

# التحقق من توكن GitHub
if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ خطأ: متغير البيئة GITHUB_TOKEN غير موجود"
    echo "يرجى تعيين متغير البيئة GITHUB_TOKEN قبل تشغيل هذا السكريبت"
    exit 1
fi

echo "🚀 بدء إنشاء مستودع GitHub جديد: $REPO_NAME"

# التحقق من توفر صلاحيات التوكن
echo "🔍 التحقق من صلاحيات توكن GitHub..."
user_response=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
                    -H "Accept: application/vnd.github.v3+json" \
                    https://api.github.com/user)

if [[ $user_response == *"login"* ]]; then
    username=$(echo $user_response | grep -o '"login":"[^"]*' | head -1 | cut -d'"' -f4)
    echo "✅ تم التحقق من توكن GitHub. المستخدم: $username"
else
    echo "❌ خطأ: توكن GitHub غير صالح أو منتهي الصلاحية."
    echo "الرجاء الحصول على توكن جديد من: https://github.com/settings/tokens"
    exit 1
fi

# إنشاء المستودع على GitHub
echo "🔄 إنشاء المستودع..."
response=$(curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/user/repos \
  -d "{\"name\":\"$REPO_NAME\",\"description\":\"$REPO_DESC\",\"private\":$([ "$REPO_VISIBILITY" == "private" ] && echo "true" || echo "false")}")

# التحقق من نجاح الإنشاء
if [[ $response == *"html_url"* ]]; then
    repo_url=$(echo $response | grep -o '"html_url":"[^"]*' | grep -o '[^"]*$' | head -1)
    clone_url=$(echo $response | grep -o '"clone_url":"[^"]*' | grep -o '[^"]*$' | head -1)
    
    echo "✅ تم إنشاء المستودع بنجاح!"
    echo "🔗 رابط المستودع: $repo_url"
    
    # تهيئة Git محليًا
    echo "🔄 تهيئة Git في المشروع الحالي..."
    rm -rf .git 2>/dev/null  # إزالة أي مستودع Git موجود مسبقًا
    git init
    
    # تجاهل بعض الملفات إن لزم الأمر
    echo "🛠️ إعداد ملف .gitignore..."
    echo "node_modules/
.env
.DS_Store
dist/
*.log
.nix/
.replit
replit.nix" > .gitignore
    
    # إضافة جميع الملفات (بعد تعيين .gitignore)
    echo "📎 إضافة جميع الملفات للمستودع..."
    git add .
    
    # تكوين هوية المستخدم لعملية الدفع
    git config user.email "deploy@butterbakery.com"
    git config user.name "ButterBakery Deploy"
    
    # التعهد الأول
    echo "📝 إنشاء التعهد الأول..."
    git commit -m "الإصدار الأولي: تطبيق ButterBakery كامل"
    
    # إضافة المستودع البعيد
    echo "🔄 إضافة المستودع البعيد..."
    git remote remove origin 2>/dev/null  # إزالة أي مستودع بعيد موجود مسبقًا
    git remote add origin $clone_url
    
    # إنشاء توكن للمصادقة مع Git
    git_auth_url=$(echo $clone_url | sed "s/https:\/\//https:\/\/$username:$GITHUB_TOKEN@/")
    
    # دفع الكود باستخدام التوكن للمصادقة
    echo "⬆️ دفع الكود إلى المستودع البعيد..."
    git push -u -f $git_auth_url master 2>&1 | grep -v "http"
    
    if [ $? -eq 0 ]; then
        echo "✅ تم دفع الكود بنجاح!"
    else
        echo "⚠️ واجهنا مشكلة في دفع الكود. نحاول بطريقة أخرى..."
        # محاولة دفع الكود بطريقة أخرى
        echo "username=$username" > ~/.git-credentials
        echo "password=$GITHUB_TOKEN" >> ~/.git-credentials
        git config credential.helper store
        git push -u -f origin master
        
        if [ $? -eq 0 ]; then
            echo "✅ تم دفع الكود بنجاح!"
        else
            echo "❌ فشل دفع الكود إلى المستودع."
            echo "الرجاء استكمال عملية دفع الكود يدويًا باستخدام:"
            echo "git push -u origin master"
        fi
    fi
    
    # حفظ معلومات المستودع للخطوات اللاحقة
    echo "💾 حفظ معلومات المستودع للاستخدام لاحقًا..."
    echo "{\"repo_name\":\"$REPO_NAME\",\"repo_url\":\"$repo_url\",\"clone_url\":\"$clone_url\"}" > github-repo-info.json
    
    echo "🎉 تم بنجاح! المشروع الآن متاح على GitHub ويمكن ربطه مع Render.com"
    echo "📋 الخطوات التالية: استخدام معلومات المستودع (في ملف github-repo-info.json) للربط مع Render.com"
else
    # فحص خطأ وجود المستودع مسبقًا
    if [[ $response == *"already exists"* ]]; then
        echo "⚠️ المستودع '$REPO_NAME' موجود بالفعل."
        
        # محاولة استخدام المستودع الموجود
        echo "🔄 محاولة استخدام المستودع الموجود..."
        repo_url="https://github.com/$username/$REPO_NAME"
        clone_url="https://github.com/$username/$REPO_NAME.git"
        
        # تهيئة Git محليًا
        echo "🔄 تهيئة Git في المشروع الحالي..."
        rm -rf .git 2>/dev/null
        git init
        
        # تجاهل بعض الملفات إن لزم الأمر
        echo "🛠️ إعداد ملف .gitignore..."
        echo "node_modules/
.env
.DS_Store
dist/
*.log
.nix/
.replit
replit.nix" > .gitignore
        
        # إضافة جميع الملفات
        echo "📎 إضافة جميع الملفات للمستودع..."
        git add .
        
        # تكوين هوية المستخدم لعملية الدفع
        git config user.email "deploy@butterbakery.com"
        git config user.name "ButterBakery Deploy"
        
        # التعهد الأول
        echo "📝 إنشاء التعهد الأول..."
        git commit -m "الإصدار الأولي: تطبيق ButterBakery كامل"
        
        # إضافة المستودع البعيد
        echo "🔄 إضافة المستودع البعيد..."
        git remote remove origin 2>/dev/null
        git remote add origin $clone_url
        
        # إنشاء توكن للمصادقة مع Git
        git_auth_url=$(echo $clone_url | sed "s/https:\/\//https:\/\/$username:$GITHUB_TOKEN@/")
        
        # دفع الكود باستخدام التوكن للمصادقة
        echo "⬆️ دفع الكود إلى المستودع البعيد (قد يعيد كتابة المحتوى الحالي)..."
        git push -u -f $git_auth_url master 2>&1 | grep -v "http"
        
        if [ $? -eq 0 ]; then
            echo "✅ تم دفع الكود بنجاح!"
            
            # حفظ معلومات المستودع للخطوات اللاحقة
            echo "💾 حفظ معلومات المستودع للاستخدام لاحقًا..."
            echo "{\"repo_name\":\"$REPO_NAME\",\"repo_url\":\"$repo_url\",\"clone_url\":\"$clone_url\"}" > github-repo-info.json
            
            echo "🎉 تم بنجاح! تم استخدام المستودع الموجود ودفع الكود إليه"
            echo "📋 الخطوات التالية: استخدام معلومات المستودع (في ملف github-repo-info.json) للربط مع Render.com"
            exit 0
        else
            echo "❌ فشل دفع الكود إلى المستودع الموجود."
        fi
    fi
    
    # عرض رسالة الخطأ إذا فشلت جميع المحاولات
    echo "❌ فشل إنشاء/استخدام المستودع. رسالة الخطأ:"
    echo $response
    exit 1
fi