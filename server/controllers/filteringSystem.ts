import { Request } from 'express';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays } from 'date-fns';
import { and, eq, gte, lte, or, asc, desc } from 'drizzle-orm';
import { db } from '../db';
import { 
  dailySales, 
  users, 
  branches, 
  monthlyTargets, 
  consolidatedDailySales 
} from '../../shared/schema';
import { IStorage } from '../storage';

/**
 * نظام فلترة متقدم موحد
 * 
 * يوفر هذا الملف واجهة موحدة للتعامل مع فلترة البيانات بطريقة موحدة
 * ويدعم فلترة متعددة المعايير: حسب الفرع، التاريخ، الكاشير، الحالة
 * ويدعم العمليات المجمعة لكل الفروع (branchId=0)
 */

/**
 * نموذج معلمات الفلترة الموحدة
 */
export interface FilterParams {
  isAllBranches: boolean;                  // هل الاستعلام لجميع الفروع
  specificBranchId: number;                // معرف الفرع المحدد (0 لجميع الفروع)
  specificCashierId?: number;              // معرف الكاشير المحدد (اختياري)
  specificStatus?: string;                 // حالة محددة للفلترة (اختياري)
  targetDate: Date;                        // التاريخ المستهدف
  targetStartDate: Date;                   // بداية نطاق التاريخ
  targetEndDate: Date;                     // نهاية نطاق التاريخ
  formattedStartDate: string;              // بداية النطاق بتنسيق yyyy-MM-dd
  formattedEndDate: string;                // نهاية النطاق بتنسيق yyyy-MM-dd
  period: string;                          // الفترة: weekly, monthly, yearly
  currentMonth: number;                    // الشهر الحالي
  currentYear: number;                     // السنة الحالية
}

/**
 * استخراج معاملات الفلترة المشتركة من الطلب
 */
export const extractFilterParams = (req: Request): FilterParams => {
  // 1. معاملات الفلترة الأساسية
  const {
    branchId = '0',
    date,
    startDate,
    endDate,
    cashierId,
    period = 'weekly',
    status,
  } = req.query;

  // 2. تحويل القيم وتحديد المتغيرات المشتقة
  const isAllBranches = branchId === '0';
  const specificBranchId = isAllBranches ? 0 : parseInt(branchId as string, 10);
  const specificCashierId = cashierId && cashierId !== '0' ? parseInt(cashierId as string, 10) : undefined;
  const specificStatus = status as string | undefined;
  
  // 3. معالجة معاملات التاريخ بشكل آمن لتجنب قيم undefined
  const today = new Date();
  let targetDate = date ? new Date(date as string) : today;
  
  // التعامل مع targetDate غير الصالح
  if (isNaN(targetDate.getTime())) {
    console.warn('تاريخ غير صالح، استخدام اليوم كبديل');
    targetDate = today;
  }
  
  let targetStartDate: Date = today;
  let targetEndDate: Date = today;

  // استخدام نطاق التواريخ إذا تم تحديده
  if (startDate && endDate) {
    const parsedStartDate = new Date(startDate as string);
    const parsedEndDate = new Date(endDate as string);
    
    // التحقق من صحة التواريخ
    if (!isNaN(parsedStartDate.getTime()) && !isNaN(parsedEndDate.getTime())) {
      targetStartDate = parsedStartDate;
      targetEndDate = parsedEndDate;
    } else {
      console.warn('نطاق تاريخ غير صالح، استخدام اليوم كبديل');
      targetStartDate = startOfDay(today);
      targetEndDate = endOfDay(today);
    }
  } else {
    // استخدام تاريخ واحد وتهيئة النطاق ليوم كامل
    targetStartDate = startOfDay(targetDate);
    targetEndDate = endOfDay(targetDate);
  }

  // 4. تنسيق التواريخ للاستعلامات
  const formattedStartDate = format(targetStartDate, 'yyyy-MM-dd');
  const formattedEndDate = format(targetEndDate, 'yyyy-MM-dd');
  
  // 5. المعلومات المشتقة من التاريخ
  const currentMonth = targetDate.getMonth() + 1;
  const currentYear = targetDate.getFullYear();

  return {
    isAllBranches,
    specificBranchId,
    specificCashierId,
    specificStatus,
    targetDate,
    targetStartDate,
    targetEndDate,
    formattedStartDate,
    formattedEndDate,
    period: period as string,
    currentMonth,
    currentYear,
  };
};

/**
 * بناء استعلام فلترة موحد للمبيعات اليومية
 */
export const buildDailySalesFilterQuery = (params: FilterParams) => {
  const {
    isAllBranches,
    specificBranchId,
    specificCashierId,
    specificStatus,
    formattedStartDate,
    formattedEndDate,
  } = params;

  console.log(`🔍 بناء استعلام بمعاملات: فرع=${isAllBranches ? 'الكل' : specificBranchId}, تاريخ=${formattedStartDate} إلى ${formattedEndDate}`);

  // 1. بناء شرط التاريخ
  const dateCondition = (
    formattedStartDate === formattedEndDate
      ? eq(dailySales.date, formattedStartDate)
      : and(
          gte(dailySales.date, formattedStartDate),
          lte(dailySales.date, formattedEndDate)
        )
  );

  // 2. إنشاء استعلام أساسي بشرط التاريخ
  let query = db.select().from(dailySales).where(dateCondition);

  // 3. إضافة شرط الفرع إذا كان محددًا (وليس كل الفروع)
  if (!isAllBranches) {
    query = query.where(eq(dailySales.branchId, specificBranchId));
  }

  // 4. إضافة شرط الكاشير إذا كان محددًا
  if (specificCashierId) {
    query = query.where(eq(dailySales.cashierId, specificCashierId));
  }

  // 5. إضافة شرط الحالة إذا كانت محددة
  if (specificStatus) {
    query = query.where(eq(dailySales.status, specificStatus));
  }

  // 6. الترتيب حسب التاريخ (الأحدث أولاً)
  query = query.orderBy(desc(dailySales.date));

  return query;
};

/**
 * بناء استعلام فلترة موحد للمبيعات المجمعة
 */
export const buildConsolidatedSalesFilterQuery = (params: FilterParams) => {
  const {
    isAllBranches,
    specificBranchId,
    specificStatus,
    formattedStartDate,
    formattedEndDate,
  } = params;

  // 1. بناء شرط التاريخ
  const dateCondition = (
    formattedStartDate === formattedEndDate
      ? eq(consolidatedDailySales.date, formattedStartDate)
      : and(
          gte(consolidatedDailySales.date, formattedStartDate),
          lte(consolidatedDailySales.date, formattedEndDate)
        )
  );

  // 2. إنشاء استعلام أساسي بشرط التاريخ
  let query = db.select().from(consolidatedDailySales).where(dateCondition);

  // 3. إضافة شرط الفرع إذا كان محددًا (وليس كل الفروع)
  if (!isAllBranches) {
    query = query.where(eq(consolidatedDailySales.branchId, specificBranchId));
  }

  // 4. إضافة شرط الحالة إذا كانت محددة
  if (specificStatus) {
    query = query.where(eq(consolidatedDailySales.status, specificStatus));
  }

  // 5. الترتيب حسب التاريخ (الأحدث أولاً)
  query = query.orderBy(desc(consolidatedDailySales.date));

  return query;
};

/**
 * إثراء بيانات المبيعات بالمعلومات الإضافية
 */
export const enrichDailySalesData = async (
  storage: IStorage,
  salesData: any[],
  includeDetails: boolean = true
) => {
  if (!salesData || salesData.length === 0) {
    return [];
  }

  const enrichedData = await Promise.all(
    salesData.map(async (sale) => {
      // إضافة معلومات الفرع
      const branch = includeDetails ? await storage.getBranch(sale.branchId) : undefined;
      
      // إضافة معلومات الكاشير
      const cashier = includeDetails ? await storage.getUser(sale.cashierId) : undefined;
      
      return {
        ...sale,
        branchName: branch?.name || `فرع #${sale.branchId}`,
        cashierName: cashier?.name || `كاشير #${sale.cashierId}`,
      };
    })
  );

  return enrichedData;
};

/**
 * إثراء بيانات المبيعات المجمعة بالمعلومات الإضافية
 */
export const enrichConsolidatedSalesData = async (
  storage: IStorage,
  salesData: any[],
  includeDetails: boolean = true
) => {
  if (!salesData || salesData.length === 0) {
    return [];
  }

  const enrichedData = await Promise.all(
    salesData.map(async (sale) => {
      // إضافة معلومات الفرع
      const branch = includeDetails ? await storage.getBranch(sale.branchId) : undefined;
      
      // إضافة معلومات من قام بإغلاق التقرير
      const closedBy = includeDetails && sale.closedById ? 
        await storage.getUser(sale.closedById) : undefined;
      
      return {
        ...sale,
        branchName: branch?.name || `فرع #${sale.branchId}`,
        closedByName: closedBy?.name || null,
      };
    })
  );

  return enrichedData;
};

/**
 * تجميع بيانات المبيعات اليومية لجميع الفروع
 */
export const getAllBranchesDailySales = async (
  storage: IStorage,
  params: FilterParams
) => {
  const {
    formattedStartDate,
    formattedEndDate,
    specificCashierId,
    specificStatus,
  } = params;

  console.log(`🔍 تجميع بيانات المبيعات لجميع الفروع من ${formattedStartDate} إلى ${formattedEndDate}`);
  
  // 1. الحصول على جميع الفروع
  const branches = await storage.getBranches();
  let allSales = [];
  
  // 2. جمع بيانات المبيعات من كل فرع
  for (const branch of branches) {
    let branchSales;
    
    if (formattedStartDate === formattedEndDate) {
      // استعلام يوم واحد
      branchSales = await storage.getDailySalesByBranchAndDate(branch.id, formattedStartDate);
    } else {
      // استعلام نطاق تاريخ
      branchSales = await storage.getDailySalesByBranchAndDateRange(
        branch.id, 
        formattedStartDate, 
        formattedEndDate
      );
    }
    
    // فلترة حسب الكاشير إذا تم تحديده
    if (specificCashierId) {
      branchSales = branchSales.filter(sale => sale.cashierId === specificCashierId);
    }
    
    // فلترة حسب الحالة إذا تم تحديدها
    if (specificStatus) {
      branchSales = branchSales.filter(sale => sale.status === specificStatus);
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
};

/**
 * الحصول على المبيعات اليومية لفرع محدد
 */
export const getSpecificBranchDailySales = async (
  storage: IStorage,
  params: FilterParams
) => {
  const {
    specificBranchId,
    formattedStartDate,
    formattedEndDate,
    specificCashierId,
    specificStatus,
  } = params;

  console.log(`🔍 البحث عن مبيعات فرع #${specificBranchId} من ${formattedStartDate} إلى ${formattedEndDate}`);
  
  let salesData;
  if (formattedStartDate === formattedEndDate) {
    // استعلام يوم واحد
    salesData = await storage.getDailySalesByBranchAndDate(specificBranchId, formattedStartDate);
  } else {
    // استعلام نطاق تاريخ
    salesData = await storage.getDailySalesByBranchAndDateRange(
      specificBranchId, 
      formattedStartDate, 
      formattedEndDate
    );
  }
  
  // فلترة حسب الكاشير إذا تم تحديده
  if (specificCashierId) {
    salesData = salesData.filter(sale => sale.cashierId === specificCashierId);
  }
  
  // فلترة حسب الحالة إذا تم تحديدها
  if (specificStatus) {
    salesData = salesData.filter(sale => sale.status === specificStatus);
  }
  
  // إثراء البيانات بمعلومات إضافية
  const branch = await storage.getBranch(specificBranchId);
  const enrichedSalesData = await Promise.all(salesData.map(async (sale) => {
    const cashier = await storage.getUser(sale.cashierId);
    
    return {
      ...sale,
      cashierName: cashier?.name || `كاشير #${sale.cashierId}`,
      branchName: branch?.name || `فرع #${specificBranchId}`
    };
  }));
  
  console.log(`📊 تم العثور على ${enrichedSalesData.length} سجل مبيعات من الفرع المحدد`);
  
  // ترتيب النتائج حسب التاريخ (الأحدث أولاً)
  return enrichedSalesData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};