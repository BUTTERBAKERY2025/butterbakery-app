/**
 * سكريبت للتحقق من إصدارات حزم Drizzle المثبتة
 * يقوم بفحص package.json للتأكد من توافق الإصدارات
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// الحصول على المسار الحالي في ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('التحقق من إصدارات حزم Drizzle المثبتة...');

// قراءة ملف package.json
function readPackageJson() {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      console.error('خطأ: ملف package.json غير موجود');
      return null;
    }
    
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
    return JSON.parse(packageJsonContent);
  } catch (error) {
    console.error(`خطأ في قراءة ملف package.json: ${error.message}`);
    return null;
  }
}

// الإصدارات المتوافقة المعروفة
const compatibleVersions = {
  'drizzle-orm': '0.30.6',
  'drizzle-zod': '0.5.1',
  'drizzle-kit': '0.30.4'
};

// التحقق من توافق الإصدارات
function checkVersionCompatibility(packageJson) {
  if (!packageJson) return;
  
  console.log('='.repeat(60));
  console.log('فحص توافق إصدارات Drizzle:');
  console.log('='.repeat(60));
  
  const { dependencies = {}, devDependencies = {} } = packageJson;
  const allDependencies = { ...dependencies, ...devDependencies };
  
  let hasIncompatibility = false;
  
  // التحقق من وجود الحزم وإصداراتها
  for (const [pkg, compatibleVersion] of Object.entries(compatibleVersions)) {
    const installedVersion = allDependencies[pkg];
    
    if (!installedVersion) {
      console.log(`⚠️  الحزمة ${pkg} غير مثبتة`);
      continue;
    }
    
    // إزالة الأحرف الخاصة من الإصدار المثبت (مثل ^ أو ~)
    const cleanInstalledVersion = installedVersion.replace(/[^\d.]/g, '');
    
    if (cleanInstalledVersion === compatibleVersion) {
      console.log(`✅ ${pkg}: ${installedVersion} (متوافق)`);
    } else {
      console.log(`❌ ${pkg}: ${installedVersion} (غير متوافق - الإصدار الموصى به: ${compatibleVersion})`);
      hasIncompatibility = true;
    }
  }
  
  console.log('='.repeat(60));
  
  if (hasIncompatibility) {
    console.log('\n⚠️ توجد إصدارات غير متوافقة!');
    console.log('للحصول على تعليمات التحديث، راجع ملف README_DRIZZLE_UPDATE.md');
  } else {
    console.log('\n✅ جميع الإصدارات متوافقة!');
  }
}

// فحص التبعيات الأخرى المهمة
function checkOtherDependencies(packageJson) {
  if (!packageJson) return;
  
  console.log('\n' + '='.repeat(60));
  console.log('التبعيات الأخرى المهمة:');
  console.log('='.repeat(60));
  
  const { dependencies = {}, devDependencies = {} } = packageJson;
  const allDependencies = { ...dependencies, ...devDependencies };
  
  const importantDependencies = [
    'typescript',
    'express',
    'react',
    'vite',
    '@replit/vite-plugin-cartographer',
    'pg',
    'postgres'
  ];
  
  for (const dep of importantDependencies) {
    if (allDependencies[dep]) {
      console.log(`📦 ${dep}: ${allDependencies[dep]}`);
    } else {
      console.log(`❓ ${dep}: غير مثبت`);
    }
  }
  
  console.log('='.repeat(60));
}

// عرض إحصائيات المشروع
function showProjectStats(packageJson) {
  if (!packageJson) return;
  
  const { dependencies = {}, devDependencies = {} } = packageJson;
  
  const depsCount = Object.keys(dependencies).length;
  const devDepsCount = Object.keys(devDependencies).length;
  const totalDepsCount = depsCount + devDepsCount;
  
  console.log('\n' + '='.repeat(60));
  console.log('إحصائيات المشروع:');
  console.log('='.repeat(60));
  console.log(`📊 اسم المشروع: ${packageJson.name || 'غير محدد'}`);
  console.log(`📊 الإصدار: ${packageJson.version || 'غير محدد'}`);
  console.log(`📊 إجمالي التبعيات: ${totalDepsCount} (${depsCount} أساسية + ${devDepsCount} تطويرية)`);
  console.log(`📊 نوع المشروع: ${packageJson.type || 'commonjs'}`);
  console.log('='.repeat(60));
}

// تشغيل الفحص
const packageJson = readPackageJson();
if (packageJson) {
  checkVersionCompatibility(packageJson);
  checkOtherDependencies(packageJson);
  showProjectStats(packageJson);
}