import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// صفحة تنزيل ملفات المشروع
export default function DownloadFiles() {
  // وظيفة لتنزيل الملفات
  const handleDownload = (filename: string) => {
    // وظيفة لتوجيه المستخدم لرابط التنزيل المباشر
    window.open('/static/butterbakery-github-ready.zip', '_blank');
  };

  // تنزيل مباشر للملف (طريقة بديلة)
  const handleDirectDownload = () => {
    const directLink = 'https://workspace.beestfoods.repl.co/butterbakery-latest.zip';
    window.location.href = directLink;
  };

  // إضافة رسالة وصفية على الصفحة
  useEffect(() => {
    document.title = 'تنزيل ملفات المشروع';
  }, []);

  return (
    <div className="container mx-auto py-8 text-right" dir="rtl">
      <h1 className="text-3xl font-bold mb-6">تنزيل ملفات المشروع</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>كيفية تنزيل ورفع المشروع</CardTitle>
          <CardDescription>
            اتبع الخطوات التالية لتنزيل ملفات المشروع ورفعها إلى GitHub
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2">
            <li>انقر على زر "تنزيل ملفات المشروع" أدناه</li>
            <li>قم بفك ضغط الملف المنزل على جهازك</li>
            <li>قم بإنشاء مستودع جديد على GitHub</li>
            <li>ارفع جميع الملفات المستخرجة إلى المستودع</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ملفات للتنزيل</CardTitle>
          <CardDescription>
            انقر على أحد الأزرار أدناه لتنزيل الملفات
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-md bg-gray-50">
            <h3 className="font-medium mb-2">تنزيل ملفات المشروع (النسخة الكاملة)</h3>
            <p className="text-sm text-gray-600 mb-4">
              حزمة كاملة مضغوطة تحتوي على ملفات المشروع جاهزة للرفع إلى GitHub
            </p>
            <Button 
              onClick={() => handleDownload('butterbakery-github-ready.zip')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              تنزيل النسخة الكاملة
            </Button>
          </div>

          <div className="p-4 border rounded-md bg-gray-50">
            <h3 className="font-medium mb-2">تنزيل مباشر (طريقة بديلة)</h3>
            <p className="text-sm text-gray-600 mb-4">
              استخدم هذا الخيار في حالة وجود مشكلة في التنزيل من الرابط الأول
            </p>
            <Button 
              onClick={handleDirectDownload}
              className="bg-green-600 hover:bg-green-700"
            >
              تنزيل مباشر
            </Button>
          </div>

          <div className="p-4 border rounded-md bg-gray-50">
            <h3 className="font-medium mb-2">نسخ رابط التنزيل</h3>
            <p className="text-sm text-gray-600 mb-4">
              يمكنك نسخ الرابط التالي واستخدامه في متصفح آخر للتنزيل:
            </p>
            <div className="bg-white p-2 border rounded text-xs overflow-auto mb-2 text-left" dir="ltr">
              https://workspace.beestfoods.repl.co/butterbakery-latest.zip
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 text-center">
        <p className="text-gray-500 text-sm">
          إذا واجهت أي مشاكل في تنزيل الملفات، يرجى التواصل مع فريق الدعم
        </p>
      </div>
    </div>
  );
}