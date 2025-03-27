import { Request, Response, Express } from "express";
import { isAuthenticated } from "../middlewares/auth";
import { storage } from "../storage";
import { z } from "zod";

/**
 * تسجيل الطرق الخاصة بلوحة المتصدرين
 */
export function registerLeaderboardRoutes(app: Express) {
  
  /**
   * الحصول على لوحات المتصدرين النشطة
   * @route GET /api/leaderboards/active
   */
  app.get('/api/leaderboards/active', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const leaderboards = await storage.getActiveLeaderboards();
      return res.json(leaderboards);
    } catch (error) {
      console.error('Error fetching active leaderboards:', error);
      return res.status(500).json({ message: 'حدث خطأ أثناء تحميل بيانات لوحة المتصدرين' });
    }
  });
  
  /**
   * الحصول على لوحة متصدرين محددة
   * @route GET /api/leaderboards/:id
   */
  app.get('/api/leaderboards/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const leaderboardId = parseInt(req.params.id);
      const leaderboard = await storage.getLeaderboard(leaderboardId);
      
      if (!leaderboard) {
        return res.status(404).json({ message: 'لم يتم العثور على لوحة المتصدرين' });
      }
      
      return res.json(leaderboard);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return res.status(500).json({ message: 'حدث خطأ أثناء تحميل بيانات لوحة المتصدرين' });
    }
  });
  
  /**
   * الحصول على نتائج لوحة متصدرين محددة
   * @route GET /api/leaderboards/:id/results
   */
  app.get('/api/leaderboards/:id/results', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const leaderboardId = parseInt(req.params.id);
      const results = await storage.getLeaderboardResults(leaderboardId);
      
      return res.json(results);
    } catch (error) {
      console.error('Error fetching leaderboard results:', error);
      return res.status(500).json({ message: 'حدث خطأ أثناء تحميل نتائج لوحة المتصدرين' });
    }
  });
  
  /**
   * الحصول على مرتبة المستخدم الحالي في لوحة متصدرين محددة
   * @route GET /api/leaderboards/:id/my-rank
   */
  app.get('/api/leaderboards/:id/my-rank', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // @ts-ignore - نتجاهل خطأ TypeScript للتعامل مع كائن req.user
      const userId = req.user!.id;
      const leaderboardId = parseInt(req.params.id);
      
      const userRank = await storage.getUserLeaderboardRank(leaderboardId, userId);
      
      return res.json(userRank || { rank: null, score: 0 });
    } catch (error) {
      console.error('Error fetching user leaderboard rank:', error);
      return res.status(500).json({ message: 'حدث خطأ أثناء تحميل بيانات المرتبة' });
    }
  });
  
  /**
   * إنشاء لوحة متصدرين جديدة (للمدراء فقط)
   * @route POST /api/leaderboards
   */
  app.post('/api/leaderboards', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // التحقق من صلاحيات المستخدم (يجب أن يكون مدير أو مسؤول)
      // @ts-ignore - نتجاهل خطأ TypeScript للتعامل مع كائن req.user
      const currentUser = req.user!;
      // @ts-ignore - نتجاهل خطأ TypeScript لخاصية role في كائن User
      if (!['admin', 'branch_manager'].includes(currentUser.role)) {
        return res.status(403).json({ message: 'غير مصرح بالوصول' });
      }
      
      // التحقق من بيانات الطلب
      const schema = z.object({
        name: z.string().min(3),
        description: z.string().min(3),
        category: z.enum(['sales', 'target_achievement', 'customer_satisfaction', 'general']),
        type: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
        startDate: z.union([z.string(), z.date()]),
        endDate: z.union([z.string(), z.date()]),
        isActive: z.boolean().default(true),
        rules: z.string().optional()
      });
      
      const validatedData = schema.safeParse(req.body);
      if (!validatedData.success) {
        return res.status(400).json({ message: 'بيانات غير صالحة', errors: validatedData.error.format() });
      }
      
      // تنسيق التواريخ
      let formattedData = { ...validatedData.data };
      if (formattedData.startDate && typeof formattedData.startDate === 'string') {
        formattedData.startDate = new Date(formattedData.startDate);
      }
      if (formattedData.endDate && typeof formattedData.endDate === 'string') {
        formattedData.endDate = new Date(formattedData.endDate);
      }
      
      // إنشاء لوحة المتصدرين
      const leaderboard = await storage.createLeaderboard(formattedData);
      
      // إنشاء نشاط للمتابعة
      await storage.createActivity({
        // @ts-ignore - نتجاهل خطأ TypeScript لخاصية id في كائن User
        userId: currentUser.id,
        action: "create_leaderboard",
        details: { leaderboardId: leaderboard.id },
        // @ts-ignore - نتجاهل خطأ TypeScript لخاصية branchId في كائن User
        branchId: currentUser.branchId,
        timestamp: new Date()
      });
      
      return res.status(201).json(leaderboard);
    } catch (error) {
      console.error('Error creating leaderboard:', error);
      return res.status(500).json({ message: 'حدث خطأ أثناء إنشاء لوحة المتصدرين' });
    }
  });
  
  /**
   * تحديث نتائج لوحة المتصدرين (للمدراء فقط)
   * @route POST /api/leaderboards/:id/update-results
   */
  app.post('/api/leaderboards/:id/update-results', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // التحقق من صلاحيات المستخدم (يجب أن يكون مدير أو مسؤول)
      // @ts-ignore - نتجاهل خطأ TypeScript للتعامل مع كائن req.user
      const currentUser = req.user!;
      // @ts-ignore - نتجاهل خطأ TypeScript لخاصية role في كائن User
      if (!['admin', 'branch_manager'].includes(currentUser.role)) {
        return res.status(403).json({ message: 'غير مصرح بالوصول' });
      }
      
      const leaderboardId = parseInt(req.params.id);
      
      // التحقق من بيانات الطلب
      const schema = z.array(z.object({
        userId: z.number(),
        score: z.number(),
        rank: z.number(),
        metricName: z.string().default("score"),
        metricValue: z.number(),
        details: z.any().optional()
      }));
      
      const validatedData = schema.safeParse(req.body);
      if (!validatedData.success) {
        return res.status(400).json({ message: 'بيانات غير صالحة', errors: validatedData.error.format() });
      }
      
      // إضافة معرف لوحة المتصدرين لكل نتيجة
      const results = validatedData.data.map(result => ({
        ...result,
        leaderboardId,
        metricName: result.metricName || "score",
        metricValue: result.metricValue || result.score,
        updateDate: new Date()
      }));
      
      // تحديث النتائج
      const updatedResults = await storage.updateLeaderboardResults(leaderboardId, results);
      
      // إنشاء نشاط للمتابعة
      await storage.createActivity({
        // @ts-ignore - نتجاهل خطأ TypeScript لخاصية id في كائن User
        userId: currentUser.id,
        action: "update_leaderboard_results",
        details: { leaderboardId, count: results.length },
        // @ts-ignore - نتجاهل خطأ TypeScript لخاصية branchId في كائن User
        branchId: currentUser.branchId,
        timestamp: new Date()
      });
      
      return res.json(updatedResults);
    } catch (error) {
      console.error('Error updating leaderboard results:', error);
      return res.status(500).json({ message: 'حدث خطأ أثناء تحديث نتائج لوحة المتصدرين' });
    }
  });
}