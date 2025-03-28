/**
 * أداة التحقق من اتصال قاعدة البيانات في Render.com
 * تستخدم للتأكد من أن قاعدة البيانات متصلة بشكل صحيح قبل بدء التطبيق
 */

import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// الحصول على عنوان قاعدة البيانات من متغيرات البيئة
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ متغير البيئة DATABASE_URL غير محدد.');
  console.error('يرجى التأكد من وجود رابط قاعدة البيانات في متغيرات البيئة.');
  process.exit(1);
}

// إنشاء كائن اتصال بقاعدة البيانات
const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

/**
 * التحقق من الاتصال بقاعدة البيانات
 */
async function checkConnection() {
  console.log('🔄 جاري التحقق من الاتصال بقاعدة البيانات...');
  
  try {
    const client = await pool.connect();
    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح!');
    
    // الحصول على معلومات الخادم
    const serverVersion = await client.query('SHOW server_version;');
    console.log(`📊 إصدار PostgreSQL: ${serverVersion.rows[0].server_version}`);
    
    // الحصول على قائمة الجداول
    const tablesQuery = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log(`📋 الجداول الموجودة (${tablesQuery.rows.length}):`);
    
    if (tablesQuery.rows.length === 0) {
      console.log('  لا توجد جداول بعد.');
    } else {
      tablesQuery.rows.forEach((row, index) => {
        console.log(`  ${index + 1}. ${row.table_name}`);
      });
    }
    
    // فحص عدد السجلات في كل جدول
    if (tablesQuery.rows.length > 0) {
      console.log('\n📈 عدد السجلات في كل جدول:');
      
      for (const row of tablesQuery.rows) {
        const tableName = row.table_name;
        const countQuery = await client.query(`SELECT COUNT(*) FROM "${tableName}";`);
        const count = parseInt(countQuery.rows[0].count);
        console.log(`  - ${tableName}: ${count} سجل`);
      }
    }
    
    // عرض معلومات الاتصال
    console.log('\n🔗 معلومات الاتصال:');
    console.log(`  - قاعدة البيانات: ${client.database}`);
    console.log(`  - المستخدم: ${client.user}`);
    console.log(`  - المضيف: ${client.host}`);
    console.log(`  - المنفذ: ${client.port}`);
    
    client.release();
    return true;
  } catch (error) {
    console.error('❌ فشل الاتصال بقاعدة البيانات:');
    console.error(error.message);
    return false;
  } finally {
    await pool.end();
  }
}

/**
 * الوظيفة الرئيسية
 */
async function main() {
  console.log('🚀 أداة التحقق من اتصال قاعدة البيانات في Render.com');
  console.log('=================================================\n');
  
  const connected = await checkConnection();
  
  if (connected) {
    console.log('\n✅ قاعدة البيانات متصلة وجاهزة للاستخدام.');
    console.log('يمكنك الآن بدء تشغيل التطبيق بأمان.');
  } else {
    console.error('\n❌ فشل الاتصال بقاعدة البيانات.');
    console.error('يرجى التحقق من إعدادات قاعدة البيانات في Render.com.');
    process.exit(1);
  }
}

// تنفيذ البرنامج
main().catch(error => {
  console.error('❌ حدث خطأ غير متوقع:', error);
  process.exit(1);
});