import { Router } from 'express';
import { 
  getSalesForecast, 
  getBranchPerformanceAnalysis, 
  getCashierPerformanceAnalysis,
  getSmartRecommendations 
} from '../controllers/aiAnalyticsController';

// مستخدم في توجيه طلبات API
const requireAuth = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

const router = Router();

/**
 * الحصول على توقعات المبيعات للأسبوع القادم
 * @route GET /api/ai-analytics/sales-forecast/:branchId
 * @group AI Analytics - تحليلات الذكاء الاصطناعي
 * @param {number} branchId.path.required - معرف الفرع
 * @returns {object} 200 - توقعات المبيعات والتحليلات
 * @returns {Error} 401 - غير مصرح
 * @returns {Error} 404 - لم يتم العثور على الفرع
 */
router.get('/sales-forecast/:branchId', requireAuth, getSalesForecast);

/**
 * الحصول على تحليل أداء الفرع
 * @route GET /api/ai-analytics/branch-performance/:branchId
 * @group AI Analytics - تحليلات الذكاء الاصطناعي
 * @param {number} branchId.path.required - معرف الفرع
 * @param {string} period.query - فترة التحليل (weekly, monthly, quarterly)
 * @returns {object} 200 - تحليل أداء الفرع
 * @returns {Error} 401 - غير مصرح
 * @returns {Error} 404 - لم يتم العثور على الفرع
 */
router.get('/branch-performance/:branchId', requireAuth, getBranchPerformanceAnalysis);

/**
 * الحصول على تحليل أداء الكاشيرين
 * @route GET /api/ai-analytics/cashier-performance/:branchId
 * @group AI Analytics - تحليلات الذكاء الاصطناعي
 * @param {number} branchId.path.required - معرف الفرع
 * @returns {object} 200 - تحليل أداء الكاشيرين
 * @returns {Error} 401 - غير مصرح
 * @returns {Error} 404 - لم يتم العثور على الفرع أو الكاشيرين
 */
router.get('/cashier-performance/:branchId', requireAuth, getCashierPerformanceAnalysis);

/**
 * الحصول على توصيات ذكية لتحسين المبيعات
 * @route GET /api/ai-analytics/smart-recommendations/:branchId
 * @group AI Analytics - تحليلات الذكاء الاصطناعي
 * @param {number} branchId.path.required - معرف الفرع
 * @returns {object} 200 - توصيات ذكية لتحسين المبيعات
 * @returns {Error} 401 - غير مصرح
 * @returns {Error} 404 - لم يتم العثور على الفرع
 */
router.get('/smart-recommendations/:branchId', requireAuth, getSmartRecommendations);

export default router;