/**
 * ButterBakery OPS - نقطة الدخول للإنتاج
 * تم تعديل هذا الملف لتوافق Render.com والمنصات الأخرى
 */

// تضمين متغيرات البيئة
require('dotenv').config();

// التأكد من اتصال قاعدة البيانات
const dbConnectionTester = require('./db-connect');

// النظام الاحتياطي لقاعدة البيانات
const dataPersistence = require('./database-persistence');

// معالجة الاستثناءات غير المعالجة
process.on('uncaughtException', (err) => {
  console.error('خطأ غير معالج:', err);
  console.log('سيتم محاولة الاستمرار...');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('وعد مرفوض غير معالج:', promise, 'السبب:', reason);
  console.log('سيتم محاولة الاستمرار...');
});

// المعلومات البيئية
console.log('بيئة Node.js:', process.version);
console.log('بيئة التطبيق:', process.env.NODE_ENV || 'development');
console.log('المنفذ:', process.env.PORT || 3000);

// فحص اتصال قاعدة البيانات ثم بدء التطبيق
async function main() {
  try {
    // محاولة الاتصال بقاعدة البيانات
    console.log('جاري فحص الاتصال بقاعدة البيانات...');
    const isConnected = await dbConnectionTester.testConnection();
    
    if (!isConnected) {
      console.error('فشل الاتصال بقاعدة البيانات! سيتم إعادة المحاولة...');
      
      // إعادة المحاولة بعد 5 ثوانٍ
      setTimeout(main, 5000);
      return;
    }
    
    console.log('تم الاتصال بقاعدة البيانات بنجاح!');
    
    // الحفاظ على استمرارية البيانات
    await dataPersistence.maintainDataPersistence();
    
    // بدء الخادم
    console.log('جاري بدء خادم الويب...');
    
    // هذا الجزء سيبدأ الخادم بالطريقة المناسبة اعتمادًا على البيئة
    try {
      if (process.env.NODE_ENV === 'production') {
        // في وضع الإنتاج، نشغل الخادم المبني مسبقًا
        console.log('تشغيل في وضع الإنتاج');
        require('./server/dist/server.js');
      } else {
        // في وضع التطوير، نشغل الخادم التطويري
        console.log('تشغيل في وضع التطوير');
        require('./server/index.js');
      }
      console.log('تم بدء الخادم بنجاح!');
    } catch (err) {
      console.error('خطأ في بدء الخادم الرئيسي، محاولة استخدام الخادم البديل:', err);
      
      // محاولة تشغيل الخادم البديل
      try {
        console.log('تشغيل الخادم البديل...');
        require('./minimal-server.js');
      } catch (fallbackErr) {
        console.error('فشل في تشغيل الخادم البديل أيضًا:', fallbackErr);
        throw new Error('فشل في بدء أي خادم');
      }
    }
  } catch (err) {
    console.error('خطأ أثناء بدء التطبيق:', err);
    process.exit(1);
  }
}

main();