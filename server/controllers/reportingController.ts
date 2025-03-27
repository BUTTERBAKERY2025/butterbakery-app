import { Request, Response } from 'express';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay, subDays, addDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { eq, and, desc, gte, lte, or, sql } from 'drizzle-orm';
import { db } from '../db';
import { IStorage } from '../storage';
import {
  dailySales,
  users,
  branches,
  monthlyTargets,
  consolidatedDailySales,
} from '../../shared/schema';

// استيراد نظام الفلترة الموحد
import { 
  extractFilterParams, 
  buildDailySalesFilterQuery,
  buildConsolidatedSalesFilterQuery,
  enrichDailySalesData,
  enrichConsolidatedSalesData,
  FilterParams
} from './filteringSystem';

// إعادة تسمية دوال المستوردة لمنع تضارب الأسماء
import {
  getAllBranchesDailySales as getAllBranchesSales,
  getSpecificBranchDailySales as getSpecificBranchSales
} from './filteringSystem';

/**
 * وحدة تحكم التقارير المركزية
 * 
 * تقوم هذه الوحدة بتوحيد عمليات الاستعلام والفلترة لمختلف أنواع التقارير
 * وتدعم وضع "جميع الفروع" (branchId=0) بشكل موحد
 */

/**
 * الحصول على تقرير المبيعات اليومية مع دعم الفلترة المتقدمة
 * تدعم branchId=0 لعرض بيانات جميع الفروع
 */
export const getDailySalesReport = async (
  req: Request,
  res: Response,
  storage: IStorage
) => {
  try {
    console.log('🔄 معالجة طلب تقرير المبيعات اليومية');
    
    // استخراج معاملات الفلترة
    const filterParams = extractFilterParams(req);
    const {
      isAllBranches,
      specificBranchId,
      specificCashierId,
      specificStatus,
      formattedStartDate,
      formattedEndDate,
    } = filterParams;

    console.log(`📋 معاملات الفلترة: ${
      isAllBranches ? 'جميع الفروع' : 'فرع محدد: ' + specificBranchId
    }, التاريخ: ${formattedStartDate} إلى ${formattedEndDate}${
      specificCashierId ? ', كاشير: ' + specificCashierId : ''
    }${specificStatus ? ', حالة: ' + specificStatus : ''}`);

    // هل هو استعلام لجميع الفروع؟
    if (isAllBranches) {
      return await getAllBranchesSales(storage, filterParams);
    } else {
      // استعلام لفرع محدد
      return await getSpecificBranchSales(storage, filterParams);
    }
  } catch (error) {
    console.error('❌ خطأ في استخراج تقرير المبيعات اليومية:', error);
    throw error;
  }
};

/**
 * الحصول على تقرير المبيعات المجمعة مع دعم الفلترة المتقدمة
 * تدعم branchId=0 لعرض بيانات جميع الفروع
 */
export const getConsolidatedSalesReport = async (
  req: Request,
  res: Response,
  storage: IStorage
) => {
  try {
    console.log('🔄 معالجة طلب تقرير المبيعات المجمعة');
    
    // استخراج معاملات الفلترة
    const {
      isAllBranches,
      specificBranchId,
      formattedStartDate,
      formattedEndDate,
      specificStatus,
    } = extractFilterParams(req);

    // بناء الاستعلام
    let consolidatedSalesQuery = db.select().from(consolidatedDailySales)
      .where(
        and(
          gte(consolidatedDailySales.date, formattedStartDate),
          lte(consolidatedDailySales.date, formattedEndDate)
        )
      );

    // إضافة فلتر الفرع إذا كان محددًا
    if (!isAllBranches) {
      consolidatedSalesQuery = consolidatedSalesQuery.where(
        eq(consolidatedDailySales.branchId, specificBranchId)
      );
    }

    // إضافة فلتر الحالة إذا كان محددًا
    if (specificStatus) {
      consolidatedSalesQuery = consolidatedSalesQuery.where(
        eq(consolidatedDailySales.status, specificStatus)
      );
    }

    // تنفيذ الاستعلام
    const consolidatedSales = await consolidatedSalesQuery.orderBy(desc(consolidatedDailySales.date));

    // إثراء البيانات بمعلومات إضافية
    const enrichedData = await Promise.all(
      consolidatedSales.map(async (sale) => {
        const branch = await storage.getBranch(sale.branchId);
        const closedBy = sale.closedById ? await storage.getUser(sale.closedById) : null;
        
        return {
          ...sale,
          branchName: branch?.name || `فرع #${sale.branchId}`,
          closedByName: closedBy?.name || null,
        };
      })
    );

    return enrichedData;
  } catch (error) {
    console.error('❌ خطأ في استخراج تقرير المبيعات المجمعة:', error);
    throw error;
  }
};

/**
 * الحصول على تحليلات أداء الكاشير مع دعم الفلترة المتقدمة
 */
export const getCashierPerformanceReport = async (
  req: Request,
  res: Response,
  storage: IStorage
) => {
  try {
    console.log('🔄 معالجة طلب تقرير أداء الكاشير');
    
    // استخراج معاملات الفلترة
    const {
      isAllBranches,
      specificBranchId,
      specificCashierId,
      targetDate,
      formattedStartDate,
      formattedEndDate,
    } = extractFilterParams(req);

    // هل هو استعلام لكاشير محدد؟
    if (specificCashierId) {
      // استعلام لكاشير محدد
      const performance = await getCashierPerformanceById(
        storage,
        specificCashierId,
        formattedStartDate,
        formattedEndDate
      );
      return [performance];
    } else {
      // استعلام لجميع الكاشيرين (إما في فرع محدد أو في جميع الفروع)
      if (isAllBranches) {
        return await getAllCashiersPerformance(
          storage,
          formattedStartDate,
          formattedEndDate
        );
      } else {
        return await getBranchCashiersPerformance(
          storage,
          specificBranchId,
          formattedStartDate,
          formattedEndDate
        );
      }
    }
  } catch (error) {
    console.error('❌ خطأ في استخراج تقرير أداء الكاشير:', error);
    throw error;
  }
};

/**
 * الحصول على تقرير تحقيق الأهداف الشهرية للفروع
 */
export const getBranchTargetAchievementReport = async (
  req: Request,
  res: Response,
  storage: IStorage
) => {
  try {
    console.log('🔄 معالجة طلب تقرير تحقيق الأهداف الشهرية');
    
    // استخراج معاملات الفلترة
    const {
      isAllBranches,
      specificBranchId,
      currentMonth,
      currentYear,
    } = extractFilterParams(req);

    // استعلام عن بيانات تحقيق الأهداف
    const targetAchievementData = await storage.getBranchTargetAchievement(
      currentMonth,
      currentYear,
      isAllBranches ? 0 : specificBranchId
    );

    return targetAchievementData;
  } catch (error) {
    console.error('❌ خطأ في استخراج تقرير تحقيق الأهداف:', error);
    throw error;
  }
};

/**
 * الحصول على تحليلات المبيعات حسب الفترة الزمنية
 * تدعم branchId=0 لعرض بيانات جميع الفروع
 */
export const getSalesAnalyticsReport = async (
  req: Request,
  res: Response,
  storage: IStorage
) => {
  try {
    console.log('🔄 معالجة طلب تحليلات المبيعات');
    
    // استخراج معاملات الفلترة
    const {
      isAllBranches,
      specificBranchId,
      period,
      targetStartDate: startDate,
      targetEndDate: endDate
    } = extractFilterParams(req);

    // التحقق من صحة الفترة الزمنية
    const validPeriods = ["weekly", "monthly", "yearly"];
    const selectedPeriod = validPeriods.includes(period) ? period : "weekly";
    
    console.log(`📊 تحليل المبيعات: فترة=${selectedPeriod}, branchId=${isAllBranches ? '0 (كل الفروع)' : specificBranchId}`);
    
    // تنسيق التواريخ للاستعلامات
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    
    // إنشاء جميع التواريخ في النطاق
    const salesByDate = new Map();
    let currentDate = new Date(startDate);
    
    // تحديد نمط تنسيق التاريخ المناسب للفترة المحددة
    let pattern = 'dd/MM';
    switch (selectedPeriod) {
      case 'weekly':
        pattern = 'EEE'; // اسم اليوم (السبت، الأحد، إلخ)
        break;
      case 'monthly':
        pattern = 'dd/MM';
        break;
      case 'yearly':
        pattern = 'MMM'; // اسم الشهر (يناير، فبراير، إلخ)
        break;
    }
    
    // إنشاء قاموس بالتواريخ وتهيئة القيم
    while (currentDate <= endDate) {
      const dateKey = format(currentDate, 'yyyy-MM-dd');
      const formattedDate = format(currentDate, pattern, { locale: ar });
      
      salesByDate.set(dateKey, {
        date: formattedDate,
        cashSales: 0,
        networkSales: 0,
        totalSales: 0,
        target: 0
      });
      
      currentDate = addDays(currentDate, 1);
    }
    
    // إذا كان طلب لجميع الفروع - استخدم branchId=0 مباشرة في استدعاء getSalesAnalytics
    if (isAllBranches) {
      console.log('📊 طلب تحليلات مبيعات لجميع الفروع...');
      console.log('🔄 استخدام برنامج getSalesAnalytics مع branchId=0 للحصول على بيانات مجمعة');
      
      // إنهاء الدالة الحالية وإرجاع نتائج تحليلات المبيعات مباشرة
      const analytics = await storage.getSalesAnalytics(0, selectedPeriod);
      console.log(`✅ تم الحصول على تحليلات المبيعات لجميع الفروع (${analytics.length} سجل)`);
      return analytics;
      
      // القسم أدناه لا يتم تنفيذه بعد إضافة "return" أعلاه (نبقي عليه للمراجع)
      // الحصول على قائمة جميع الفروع
      const branches = await storage.getBranches();
      
      // معالجة كل فرع
      for (const branch of branches) {
        // الحصول على بيانات المبيعات للفرع
        const branchSalesData = await storage.getDailySalesByBranchAndDateRange(
          branch.id, 
          startDateStr, 
          endDateStr
        );
        
        // ملء بيانات المبيعات
        for (const sale of branchSalesData) {
          const dateKey = format(new Date(sale.date), 'yyyy-MM-dd');
          
          if (salesByDate.has(dateKey)) {
            const currentData = salesByDate.get(dateKey);
            
            currentData.cashSales += sale.totalCashSales || 0;
            currentData.networkSales += sale.totalNetworkSales || 0;
            currentData.totalSales += sale.totalSales || 0;
          }
        }
        
        // إضافة بيانات الهدف
        const month = endDate.getMonth() + 1;
        const year = endDate.getFullYear();
        const monthlyTarget = await storage.getMonthlyTargetByBranchAndDate(branch.id, month, year);
        
        if (monthlyTarget) {
          const daysInMonth = new Date(year, month, 0).getDate();
          const dailyTarget = monthlyTarget.targetAmount / daysInMonth;
          
          for (const [dateKey, data] of salesByDate.entries()) {
            data.target += dailyTarget; // نجمع أهداف كل الفروع
          }
        }
      }
    } else {
      // الحصول على بيانات المبيعات للفرع المحدد
      const salesData = await storage.getDailySalesByBranchAndDateRange(
        specificBranchId, 
        startDateStr, 
        endDateStr
      );
      
      // ملء بيانات المبيعات
      for (const sale of salesData) {
        const dateKey = format(new Date(sale.date), 'yyyy-MM-dd');
        
        if (salesByDate.has(dateKey)) {
          const currentData = salesByDate.get(dateKey);
          
          currentData.cashSales += sale.totalCashSales || 0;
          currentData.networkSales += sale.totalNetworkSales || 0;
          currentData.totalSales += sale.totalSales || 0;
        }
      }
      
      // إضافة بيانات الهدف
      const month = endDate.getMonth() + 1;
      const year = endDate.getFullYear();
      const monthlyTarget = await storage.getMonthlyTargetByBranchAndDate(specificBranchId, month, year);
      
      if (monthlyTarget) {
        const daysInMonth = new Date(year, month, 0).getDate();
        const dailyTarget = monthlyTarget.targetAmount / daysInMonth;
        
        for (const [dateKey, data] of salesByDate.entries()) {
          data.target = dailyTarget;
        }
      }
    }
    
    console.log(`✅ تم معالجة تحليلات المبيعات بنجاح (${Array.from(salesByDate.values()).length} سجل)`);
    
    return Array.from(salesByDate.values());
  } catch (error) {
    console.error('❌ خطأ في استخراج تحليلات المبيعات:', error);
    throw error;
  }
};

/**
 * الحصول على إحصائيات لوحة التحكم
 * تدعم branchId=0 لعرض إحصائيات جميع الفروع
 */
export const getDashboardStatsReport = async (
  req: Request,
  res: Response,
  storage: IStorage
) => {
  try {
    console.log('🔄 معالجة طلب إحصائيات لوحة التحكم');
    
    // استخراج معاملات الفلترة
    const {
      isAllBranches,
      specificBranchId,
      targetDate,
    } = extractFilterParams(req);
    
    // التحقق من وجود معرف الفرع
    if (!isAllBranches && specificBranchId === 0) {
      throw new Error('Branch ID is required unless requesting all branches data');
    }
    
    // الحصول على إحصائيات لوحة التحكم
    // استخدام 0 لمعرف الفرع يعني الحصول على إحصائيات جميع الفروع
    const statsData = await storage.getDashboardStats(
      isAllBranches ? 0 : specificBranchId,
      targetDate
    );
    
    console.log(`✅ تم الحصول على إحصائيات لوحة التحكم ${isAllBranches ? 'لجميع الفروع' : `للفرع رقم ${specificBranchId}`}`);
    return statsData;
  } catch (error) {
    console.error('❌ خطأ في استخراج إحصائيات لوحة التحكم:', error);
    throw error;
  }
};

// دوال مساعدة خاصة

/**
 * الحصول على المبيعات اليومية لجميع الفروع
 */
async function getAllBranchesDailySales(
  storage: IStorage,
  startDate: string,
  endDate: string,
  cashierId?: number,
  status?: string
) {
  console.log(`🔍 البحث عن مبيعات جميع الفروع من ${startDate} إلى ${endDate}`);
  
  // 1. الحصول على جميع الفروع
  const branches = await storage.getBranches();
  let allSales = [];
  
  // 2. جمع بيانات المبيعات من كل فرع
  for (const branch of branches) {
    let branchSales;
    
    if (startDate === endDate) {
      // استعلام يوم واحد
      branchSales = await storage.getDailySalesByBranchAndDate(branch.id, startDate);
    } else {
      // استعلام نطاق تاريخ
      branchSales = await storage.getDailySalesByBranchAndDateRange(branch.id, startDate, endDate);
    }
    
    // فلترة حسب الكاشير إذا تم تحديده
    if (cashierId) {
      branchSales = branchSales.filter(sale => sale.cashierId === cashierId);
    }
    
    // فلترة حسب الحالة إذا تم تحديدها
    if (status) {
      branchSales = branchSales.filter(sale => sale.status === status);
    }
    
    // إضافة معلومات الفروع والكاشيرية
    const enrichedBranchSales = await Promise.all(branchSales.map(async (sale) => {
      const cashier = await storage.getUser(sale.cashierId);
      
      return {
        ...sale,
        cashierName: cashier?.name || `كاشير #${sale.cashierId}`,
        branchName: branch.name
      };
    }));
    
    allSales = [...allSales, ...enrichedBranchSales];
  }
  
  console.log(`📊 تم العثور على ${allSales.length} سجل مبيعات من جميع الفروع`);
  
  // ترتيب النتائج حسب التاريخ (الأحدث أولاً)
  return allSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * الحصول على المبيعات اليومية لفرع محدد
 */
async function getSpecificBranchDailySales(
  storage: IStorage,
  branchId: number,
  startDate: string,
  endDate: string,
  cashierId?: number,
  status?: string
) {
  console.log(`🔍 البحث عن مبيعات فرع #${branchId} من ${startDate} إلى ${endDate}`);
  
  let salesData;
  if (startDate === endDate) {
    // استعلام يوم واحد
    salesData = await storage.getDailySalesByBranchAndDate(branchId, startDate);
  } else {
    // استعلام نطاق تاريخ
    salesData = await storage.getDailySalesByBranchAndDateRange(branchId, startDate, endDate);
  }
  
  // فلترة حسب الكاشير إذا تم تحديده
  if (cashierId) {
    salesData = salesData.filter(sale => sale.cashierId === cashierId);
  }
  
  // فلترة حسب الحالة إذا تم تحديدها
  if (status) {
    salesData = salesData.filter(sale => sale.status === status);
  }
  
  // إثراء البيانات بمعلومات إضافية
  const branch = await storage.getBranch(branchId);
  const enrichedSalesData = await Promise.all(salesData.map(async (sale) => {
    const cashier = await storage.getUser(sale.cashierId);
    
    return {
      ...sale,
      cashierName: cashier?.name || `كاشير #${sale.cashierId}`,
      branchName: branch?.name || `فرع #${branchId}`
    };
  }));
  
  console.log(`📊 تم العثور على ${enrichedSalesData.length} سجل مبيعات من الفرع المحدد`);
  
  // ترتيب النتائج حسب التاريخ (الأحدث أولاً)
  return enrichedSalesData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * الحصول على أداء كاشير محدد
 */
async function getCashierPerformanceById(
  storage: IStorage,
  cashierId: number,
  startDate: string,
  endDate: string
) {
  console.log(`🔍 البحث عن أداء الكاشير #${cashierId} من ${startDate} إلى ${endDate}`);
  
  // الحصول على بيانات الكاشير
  const cashier = await storage.getUser(cashierId);
  if (!cashier) {
    throw new Error(`الكاشير برقم ${cashierId} غير موجود`);
  }
  
  // بناء استعلام للمبيعات
  let salesQuery = db.select().from(dailySales)
    .where(
      and(
        eq(dailySales.cashierId, cashierId),
        gte(dailySales.date, startDate),
        lte(dailySales.date, endDate)
      )
    );
  
  // تنفيذ الاستعلام وحساب الإحصائيات
  const sales = await salesQuery;
  
  if (sales.length === 0) {
    // إذا لم يكن هناك مبيعات، نعيد بيانات أساسية
    return {
      cashierId,
      name: cashier.name,
      avatar: cashier.avatar,
      branchId: cashier.branchId,
      branchName: (await storage.getBranch(cashier.branchId))?.name || `فرع #${cashier.branchId}`,
      totalSales: 0,
      discrepancy: 0,
      totalTransactions: 0,
      averageTicket: 0,
      performance: 100  // نفترض أداء 100% في حالة عدم وجود مبيعات
    };
  }
  
  // حساب الإحصائيات الإجمالية
  const totalSales = sales.reduce((sum, sale) => sum + sale.totalSales, 0);
  const totalDiscrepancy = sales.reduce((sum, sale) => sum + (sale.discrepancy || 0), 0);
  const totalTransactions = sales.reduce((sum, sale) => sum + (sale.totalTransactions || 0), 0);
  const averageTicket = totalTransactions > 0 ? totalSales / totalTransactions : 0;
  
  // حساب الأداء بناءً على التناقضات
  let performance = 100;
  if (totalDiscrepancy !== 0) {
    const discrepancyRate = Math.abs(totalDiscrepancy) / totalSales;
    if (discrepancyRate > 0.05) {
      performance = 70;  // أداء ضعيف
    } else if (discrepancyRate > 0.02) {
      performance = 85;  // أداء متوسط
    } else {
      performance = 95;  // أداء جيد
    }
  }
  
  // الحصول على اسم الفرع
  const branch = await storage.getBranch(cashier.branchId);
  
  return {
    cashierId,
    name: cashier.name,
    avatar: cashier.avatar,
    branchId: cashier.branchId,
    branchName: branch?.name || `فرع #${cashier.branchId}`,
    totalSales,
    discrepancy: totalDiscrepancy,
    totalTransactions,
    averageTicket,
    performance,
    salesCount: sales.length
  };
}

/**
 * الحصول على أداء جميع الكاشيرين
 */
async function getAllCashiersPerformance(
  storage: IStorage,
  startDate: string,
  endDate: string
) {
  console.log(`🔍 البحث عن أداء جميع الكاشيرين من ${startDate} إلى ${endDate}`);
  
  // الحصول على جميع الكاشيرين
  const allUsers = await storage.getUsers();
  const cashiers = allUsers.filter(user => user.role === "cashier");
  
  // تجميع أداء كل كاشير
  const performanceData = await Promise.all(
    cashiers.map(cashier => 
      getCashierPerformanceById(storage, cashier.id, startDate, endDate)
    )
  );
  
  // ترتيب حسب إجمالي المبيعات (تنازليًا)
  return performanceData.sort((a, b) => b.totalSales - a.totalSales);
}

/**
 * الحصول على أداء كاشيرين فرع محدد
 */
async function getBranchCashiersPerformance(
  storage: IStorage,
  branchId: number,
  startDate: string,
  endDate: string
) {
  console.log(`🔍 البحث عن أداء كاشيرين الفرع #${branchId} من ${startDate} إلى ${endDate}`);
  
  // الحصول على كاشيرين الفرع المحدد
  const allUsers = await storage.getUsers();
  const branchCashiers = allUsers.filter(user => 
    user.role === "cashier" && user.branchId === branchId
  );
  
  // تجميع أداء كل كاشير
  const performanceData = await Promise.all(
    branchCashiers.map(cashier => 
      getCashierPerformanceById(storage, cashier.id, startDate, endDate)
    )
  );
  
  // ترتيب حسب إجمالي المبيعات (تنازليًا)
  return performanceData.sort((a, b) => b.totalSales - a.totalSales);
}