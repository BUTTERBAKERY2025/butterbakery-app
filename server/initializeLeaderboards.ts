import { storage } from './storage';
import { format } from 'date-fns';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { leaderboards, leaderboardResults } from '../shared/schema';

/**
 * تهيئة بيانات لوحات المتصدرين التجريبية
 * يستخدم هذا الملف لإضافة بيانات تجريبية للوحات المتصدرين
 */
export async function initializeLeaderboardsData() {
  try {
    console.log("التحقق من وجود بيانات لوحات المتصدرين...");
    
    // التحقق من وجود لوحات متصدرين
    const existingLeaderboards = await storage.getActiveLeaderboards();
    if (existingLeaderboards.length > 0) {
      console.log(`تم العثور على ${existingLeaderboards.length} لوحة متصدرين. لا حاجة لإضافة بيانات جديدة.`);
      return;
    }
    
    console.log("لا توجد بيانات للوحات المتصدرين. جاري إنشاء بيانات تجريبية...");
    
    // إنشاء لوحات المتصدرين
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);

    // 1. لوحة متصدرين المبيعات الشهرية
    const salesLeaderboard = await storage.createLeaderboard({
      name: "تحدي المبيعات الشهري",
      description: "المتصدرون في مبيعات الشهر الحالي",
      type: "monthly",
      category: "sales",
      startDate: format(today, 'yyyy-MM-dd'),
      endDate: format(nextMonth, 'yyyy-MM-dd'),
      isActive: true
    });
    console.log(`تم إنشاء لوحة متصدرين المبيعات الشهرية بنجاح: ${salesLeaderboard.id}`);
    
    // 2. لوحة متصدرين خدمة العملاء
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const customerLeaderboard = await storage.createLeaderboard({
      name: "نجوم خدمة العملاء",
      description: "المتميزون في خدمة العملاء",
      type: "weekly", 
      category: "customer_satisfaction",
      startDate: format(today, 'yyyy-MM-dd'),
      endDate: format(nextWeek, 'yyyy-MM-dd'),
      isActive: true
    });
    console.log(`تم إنشاء لوحة متصدرين خدمة العملاء بنجاح: ${customerLeaderboard.id}`);
    
    // 3. لوحة متصدرين تحقيق الأهداف
    const endQuarter = new Date(today);
    endQuarter.setMonth(Math.floor(today.getMonth() / 3) * 3 + 3);
    const targetLeaderboard = await storage.createLeaderboard({
      name: "الأفضل في تحقيق الأهداف",
      description: "الفروع المتميزة في تحقيق أهداف المبيعات",
      type: "quarterly",
      category: "target_achievement",
      startDate: format(today, 'yyyy-MM-dd'),
      endDate: format(endQuarter, 'yyyy-MM-dd'),
      isActive: true
    });
    console.log(`تم إنشاء لوحة متصدرين تحقيق الأهداف بنجاح: ${targetLeaderboard.id}`);
    
    // إضافة نتائج للوحات المتصدرين
    // 1. نتائج لوحة المبيعات
    const salesResults = [
      {
        userId: 1,
        leaderboardId: salesLeaderboard.id,
        rank: 1,
        score: 9850,
        metricName: "المبيعات",
        metricValue: 9850,
        updateDate: new Date()
      },
      {
        userId: 2,
        leaderboardId: salesLeaderboard.id,
        rank: 2,
        score: 7500,
        metricName: "المبيعات",
        metricValue: 7500,
        updateDate: new Date()
      },
      {
        userId: 6,
        leaderboardId: salesLeaderboard.id,
        rank: 3,
        score: 6200,
        metricName: "المبيعات",
        metricValue: 6200,
        updateDate: new Date()
      },
      {
        userId: 7,
        leaderboardId: salesLeaderboard.id,
        rank: 4,
        score: 5100,
        metricName: "المبيعات",
        metricValue: 5100,
        updateDate: new Date()
      },
      {
        userId: 9,
        leaderboardId: salesLeaderboard.id,
        rank: 5,
        score: 4300,
        metricName: "المبيعات",
        metricValue: 4300,
        updateDate: new Date()
      }
    ];
    
    const updatedSalesResults = await storage.updateLeaderboardResults(salesLeaderboard.id, salesResults);
    console.log(`تم إضافة ${updatedSalesResults.length} نتيجة للوحة متصدرين المبيعات`);
    
    // 2. نتائج لوحة خدمة العملاء
    const customerResults = [
      {
        userId: 7,
        leaderboardId: customerLeaderboard.id,
        rank: 1,
        score: 97,
        metricName: "رضا العملاء",
        metricValue: 97,
        updateDate: new Date()
      },
      {
        userId: 6,
        leaderboardId: customerLeaderboard.id,
        rank: 2,
        score: 93,
        metricName: "رضا العملاء",
        metricValue: 93,
        updateDate: new Date()
      },
      {
        userId: 1,
        leaderboardId: customerLeaderboard.id,
        rank: 3,
        score: 90,
        metricName: "رضا العملاء", 
        metricValue: 90,
        updateDate: new Date()
      },
      {
        userId: 9,
        leaderboardId: customerLeaderboard.id,
        rank: 4,
        score: 88,
        metricName: "رضا العملاء",
        metricValue: 88,
        updateDate: new Date()
      },
      {
        userId: 2,
        leaderboardId: customerLeaderboard.id,
        rank: 5,
        score: 84,
        metricName: "رضا العملاء",
        metricValue: 84,
        updateDate: new Date()
      }
    ];
    
    const updatedCustomerResults = await storage.updateLeaderboardResults(customerLeaderboard.id, customerResults);
    console.log(`تم إضافة ${updatedCustomerResults.length} نتيجة للوحة متصدرين خدمة العملاء`);
    
    // 3. نتائج لوحة تحقيق الأهداف
    const targetResults = [
      { 
        userId: 5,  // رقم المستخدم الذي يمثل الفرع
        leaderboardId: targetLeaderboard.id,
        rank: 1,
        score: 98,
        metricName: "نسبة تحقيق الهدف",
        metricValue: 98,
        updateDate: new Date(),
        branchId: 1  // رقم الفرع
      },
      {
        userId: 3,
        leaderboardId: targetLeaderboard.id,
        rank: 2,
        score: 92,
        metricName: "نسبة تحقيق الهدف",
        metricValue: 92,
        updateDate: new Date(),
        branchId: 2
      },
      {
        userId: 4,
        leaderboardId: targetLeaderboard.id,
        rank: 3,
        score: 85,
        metricName: "نسبة تحقيق الهدف",
        metricValue: 85,
        updateDate: new Date(), 
        branchId: 3
      }
    ];
    
    const updatedTargetResults = await storage.updateLeaderboardResults(targetLeaderboard.id, targetResults);
    console.log(`تم إضافة ${updatedTargetResults.length} نتيجة للوحة متصدرين تحقيق الأهداف`);
    
    console.log("تم تهيئة بيانات لوحات المتصدرين بنجاح!");
    
  } catch (error) {
    console.error("حدث خطأ أثناء تهيئة بيانات لوحات المتصدرين:", error);
  }
}

// إضافة دالة لإعادة تعيين البيانات إذا احتاج الأمر
export async function resetLeaderboardsData() {
  try {
    console.log("جاري حذف كافة بيانات لوحات المتصدرين الحالية...");
    
    // حذف نتائج لوحات المتصدرين أولاً (بسبب الارتباط بين الجداول)
    await db.delete(leaderboardResults);
    console.log("تم حذف نتائج لوحات المتصدرين بنجاح");
    
    // حذف لوحات المتصدرين
    await db.delete(leaderboards);
    console.log("تم حذف لوحات المتصدرين بنجاح");
    
    // إعادة تهيئة البيانات
    await initializeLeaderboardsData();
    
  } catch (error) {
    console.error("حدث خطأ أثناء إعادة تعيين بيانات لوحات المتصدرين:", error);
  }
}