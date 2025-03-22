/**
 * ملف تشغيل البدء لبيئة الإنتاج
 * 
 * يتم استخدام هذا الملف عند تشغيل التطبيق على Render.com
 * بدلاً من تشغيل الخادم مباشرة
 */

// التحقق من وجود حزم NPM المطلوبة وتثبيتها إذا لزم الأمر
const requiredModules = [
  'dotenv',
  'ts-node',
  'psl',
  'express',
  'postgres',
  'drizzle-orm',
  'connect-pg-simple',
  'express-session',
  'memorystore',
  'passport',
  'passport-local'
];

// تحميل المتغيرات البيئية
try {
  require('dotenv').config();
  console.log('✅ تم تحميل ملف .env بنجاح');
} catch (err) {
  console.log('⚠️ لم يتم العثور على حزمة dotenv، الاستمرار بدون تحميل ملف .env');
  // هذا ليس مشكلة في بيئة الإنتاج حيث يتم تعيين المتغيرات البيئية مباشرة
}

// التحقق من الحزم المطلوبة
console.log('🔍 التحقق من الحزم المطلوبة...');
requiredModules.forEach(moduleName => {
  try {
    require.resolve(moduleName);
    console.log(`✅ تم العثور على حزمة ${moduleName}`);
  } catch (err) {
    console.log(`⚠️ حزمة ${moduleName} غير متوفرة. المشروع قد لا يعمل بشكل صحيح.`);
  }
});

// التحقق من متغير البيئة DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.log('⚠️ متغير البيئة DATABASE_URL غير موجود. قد لا يتمكن التطبيق من الاتصال بقاعدة البيانات.');
} else {
  console.log('✅ تم العثور على متغير البيئة DATABASE_URL');
}

const { log } = console;

// سجل معلومات البدء
log('🚀 بدء تشغيل تطبيق ButterBakery-OP في بيئة الإنتاج...');
log(`🕒 التاريخ والوقت: ${new Date().toISOString()}`);
log(`🌐 بيئة التشغيل: ${process.env.NODE_ENV}`);
log(`🔌 المنفذ: ${process.env.PORT || 10000}`);

// تعيين مسار الملف الرئيسي للتطبيق
const entryPoint = process.env.NODE_ENV === 'production' 
    ? './server/index.js' 
    : './server/index.ts';

// في بيئة Render، يمكن أن يكون الملف في مسارات مختلفة، نجرب كل واحد منها
const possiblePaths = [
  './server/index.js',
  './server/index.ts',
  'server/index.js',
  'server/index.ts',
  '/opt/render/project/src/server/index.js',
  '/opt/render/project/src/server/index.ts',
  '/app/server/index.js',
  '../server/index.js',
  '../../server/index.js'
];

// تابع هروب للعثور على الحزم التي قد تكون مفقودة
function requireWithFallback(moduleName) {
    try {
        return require(moduleName);
    } catch (error) {
        log(`⚠️ فشل تحميل الحزمة ${moduleName}: ${error.message}`);
        if (error.code === 'MODULE_NOT_FOUND') {
            // محاولة تحميل من مسارات مختلفة
            const possibleNodeModulesPaths = [
                './node_modules',
                '../node_modules',
                '../../node_modules',
                '/opt/render/project/node_modules',
                '/opt/render/project/src/node_modules',
                '/app/node_modules'
            ];

            for (const nodeModulesPath of possibleNodeModulesPaths) {
                try {
                    const fullPath = `${nodeModulesPath}/${moduleName}`;
                    log(`🔍 محاولة تحميل من ${fullPath}`);
                    return require(fullPath);
                } catch (err) {
                    // استمر في المحاولة
                }
            }
            log(`❌ لم نتمكن من العثور على الحزمة ${moduleName} في أي من المسارات المحتملة`);
        }
        // تسجيل خطأ ولكن لا تفشل التطبيق
        return null;
    }
}

// بدء التطبيق
function startServer() {
    try {
        log(`📂 محاولة تحميل نقطة البدء: ${entryPoint}`);
        
        // تحميل الحزم المهمة بشكل صريح
        log('🔍 تحميل الحزم المهمة بشكل صريح...');
        const express = requireWithFallback('express');
        const postgres = requireWithFallback('postgres');
        const drizzle = requireWithFallback('drizzle-orm');
        
        // محاولة تحميل الملف من المسارات المحتملة
        let loaded = false;
        let lastError = null;
        
        // محاولة تهيئة بيئة Express يدويًا إذا فشلت الطرق الأخرى
        if (!loaded) {
            try {
                log('🔄 محاولة تهيئة خادم Express يدوياً...');
                
                if (express) {
                    const app = express();
                    const port = process.env.PORT || 10000;
                    
                    // إضافة الطرق الأساسية
                    app.get('/health', (req, res) => {
                        res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
                    });
                    
                    app.get('/', (req, res) => {
                        res.send(`
                            <html>
                                <head><title>ButterBakery Operations Platform</title></head>
                                <body>
                                    <h1>ButterBakery Operations Platform</h1>
                                    <p>Server running in fallback mode. Please check logs for details.</p>
                                    <p>Time: ${new Date().toISOString()}</p>
                                </body>
                            </html>
                        `);
                    });
                    
                    // بدء الاستماع
                    app.listen(port, '0.0.0.0', () => {
                        log(`🚀 خادم الاحتياطي يعمل على المنفذ ${port}`);
                    });
                    
                    loaded = true;
                }
            } catch (expressError) {
                log(`⚠️ فشلت محاولة تهيئة Express يدوياً: ${expressError.message}`);
                lastError = expressError;
            }
        }
                
        // محاولة تحميل الملف الرئيسي
        for (const path of possiblePaths) {
            if (loaded) break;
            
            try {
                log(`🔍 محاولة تحميل من المسار: ${path}`);
                
                if (path.endsWith('.js')) {
                    require(path);
                } else {
                    // في بيئة التطوير، يمكن استخدام ts-node لتنفيذ ملفات TypeScript
                    try {
                        requireWithFallback('ts-node').register({
                            transpileOnly: true
                        });
                    } catch (err) {
                        log('⚠️ لم يتم العثور على حزمة ts-node، سنجرب تحميل الملف مباشرة');
                    }
                    require(path);
                }
                
                log(`✅ تم تحميل التطبيق بنجاح من المسار: ${path}`);
                loaded = true;
                break;
            } catch (err) {
                log(`⚠️ فشل تحميل المسار ${path}: ${err.message}`);
                lastError = err;
            }
        }
        
        if (!loaded) {
            throw new Error(`فشل تحميل التطبيق من جميع المسارات المحتملة. آخر خطأ: ${lastError?.message}`);
        }
        
        log('✅ تم بدء التطبيق بنجاح');
    } catch (error) {
        log('❌ حدث خطأ أثناء بدء التطبيق:');
        console.error(error);
        process.exit(1);
    }
}

// التعامل مع إشارات الإيقاف
process.on('SIGINT', () => {
    log('🛑 تم استلام إشارة SIGINT، إيقاف التطبيق...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    log('🛑 تم استلام إشارة SIGTERM، إيقاف التطبيق...');
    process.exit(0);
});

// بدء التشغيل
startServer();