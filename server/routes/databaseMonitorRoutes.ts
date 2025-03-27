/**
 * مسارات مراقبة قاعدة البيانات
 * توفر واجهات API لمراقبة حالة وإحصائيات قاعدة البيانات
 */
import { Express } from "express";
import { isAuthenticated } from "../middlewares/auth";
import { 
  getDatabaseSize, 
  getTableSizes, 
  getTableRowCounts, 
  getDatabaseStats,
  getDatabaseSummary
} from "../controllers/databaseMonitorController";

/**
 * تسجيل مسارات مراقبة قاعدة البيانات
 */
export function registerDatabaseMonitorRoutes(app: Express) {
  /**
   * الحصول على ملخص شامل لقاعدة البيانات
   * @route GET /api/database/summary
   */
  app.get("/api/database/summary", isAuthenticated, getDatabaseSummary);

  /**
   * الحصول على حجم قاعدة البيانات
   * @route GET /api/database/size
   */
  app.get("/api/database/size", isAuthenticated, getDatabaseSize);

  /**
   * الحصول على حجم الجداول في قاعدة البيانات
   * @route GET /api/database/tables/sizes
   */
  app.get("/api/database/tables/sizes", isAuthenticated, getTableSizes);

  /**
   * الحصول على عدد الصفوف في كل جدول
   * @route GET /api/database/tables/rows
   */
  app.get("/api/database/tables/rows", isAuthenticated, getTableRowCounts);

  /**
   * الحصول على إحصائيات الموارد والاتصالات
   * @route GET /api/database/stats
   */
  app.get("/api/database/stats", isAuthenticated, getDatabaseStats);
}