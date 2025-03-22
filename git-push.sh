#!/bin/bash
# نص برمجي لتسهيل دفع التغييرات إلى GitHub

# إعداد بيانات المستخدم
git config --global user.name "ButterBakery Deployment Bot"
git config --global user.email "deployment@butterbakery.sa"

# تحديث Remote URL لاستخدام التوكن
if [ -n "$GITHUB_TOKEN" ]; then
    GITHUB_URL="https://${GITHUB_TOKEN}@github.com/BUTTERBAKERY2025/butterbakery.git"
    git remote set-url origin "$GITHUB_URL"
    echo "تم تحديث عنوان المستودع البعيد بنجاح"
else
    echo "تحذير: لم يتم تعيين GITHUB_TOKEN"
fi

# محاولة الدفع
echo "جاري محاولة دفع التغييرات إلى GitHub..."
git push origin main --force-with-lease

# التحقق من نجاح الدفع
if [ $? -eq 0 ]; then
    echo "تم دفع التغييرات بنجاح!"
else
    echo "فشلت عملية الدفع. جاري إنشاء ملف معلومات للنشر اليدوي..."
    
    # إنشاء ملف يحتوي على معلومات التغييرات
    echo "## التزامات وتغييرات الـ Git" > github-push-info.txt
    echo "آخر 3 التزامات:" >> github-push-info.txt
    git log -3 --pretty=format:"%h - %s (%ar)" >> github-push-info.txt
    echo -e "\n\n## الملفات الرئيسية المضافة/المعدلة:" >> github-push-info.txt
    echo "- start.js" >> github-push-info.txt
    echo "- render.yaml" >> github-push-info.txt
    echo "- RENDER_DEPLOYMENT_GUIDE.md" >> github-push-info.txt
    echo "- deploy/check_database.js" >> github-push-info.txt
    echo "- deploy/prepare_for_render.sh" >> github-push-info.txt
    
    echo "تم إنشاء ملف 'github-push-info.txt' بنجاح"
fi