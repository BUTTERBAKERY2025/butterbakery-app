import { Request, Response, Express } from "express";
import { isAuthenticated } from "../middlewares/auth";
import { storage } from "../storage";
import { z } from "zod";

/**
 * تسجيل الطرق الخاصة بنظام المكافآت والحوافز
 */
export function registerRewardsRoutes(app: Express) {
  
  // ========== نقاط المستخدم ==========
  
  /**
   * الحصول على نقاط المستخدم الحالي
   * @route GET /api/rewards/points/me
   */
  app.get('/api/rewards/points/me', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // @ts-ignore - نتجاهل خطأ TypeScript للتعامل مع كائن req.user
      const userId = req.user!.id;
      const userPoints = await storage.getUserRewardPoints(userId);
      
      if (!userPoints) {
        // إذا لم يكن هناك سجل نقاط للمستخدم، نقوم بإنشاءه
        const newPoints = await storage.updateUserRewardPoints(userId, 0);
        return res.json(newPoints);
      }
      
      return res.json(userPoints);
    } catch (error) {
      console.error('Error fetching user reward points:', error);
      return res.status(500).json({ message: 'حدث خطأ أثناء جلب بيانات النقاط' });
    }
  });
  
  /**
   * الحصول على نقاط مستخدم محدد (للمدراء)
   * @route GET /api/rewards/points/:userId
   */
  app.get('/api/rewards/points/:userId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // التحقق من صلاحيات المستخدم (يجب أن يكون مدير أو مسؤول)
      // @ts-ignore - نتجاهل خطأ TypeScript للتعامل مع كائن req.user
      const currentUser = req.user!;
      if (!['admin', 'branch_manager', 'supervisor'].includes(currentUser.role)) {
        return res.status(403).json({ message: 'غير مصرح بالوصول' });
      }
      
      const userId = parseInt(req.params.userId);
      const userPoints = await storage.getUserRewardPoints(userId);
      
      if (!userPoints) {
        return res.status(404).json({ message: 'لم يتم العثور على بيانات نقاط للمستخدم' });
      }
      
      return res.json(userPoints);
    } catch (error) {
      console.error('Error fetching user reward points:', error);
      return res.status(500).json({ message: 'حدث خطأ أثناء جلب بيانات النقاط' });
    }
  });
  
  /**
   * الحصول على سجل نقاط المستخدم الحالي
   * @route GET /api/rewards/points/history/me
   */
  app.get('/api/rewards/points/history/me', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // @ts-ignore - نتجاهل خطأ TypeScript للتعامل مع كائن req.user
      const userId = req.user!.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      
      const pointsHistory = await storage.getRewardPointsHistory(userId, limit);
      return res.json(pointsHistory);
    } catch (error) {
      console.error('Error fetching reward points history:', error);
      return res.status(500).json({ message: 'حدث خطأ أثناء جلب سجل النقاط' });
    }
  });
  
  /**
   * الحصول على سجل نقاط مستخدم محدد (للمدراء)
   * @route GET /api/rewards/points/history/:userId
   */
  app.get('/api/rewards/points/history/:userId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // التحقق من صلاحيات المستخدم (يجب أن يكون مدير أو مسؤول)
      const currentUser = req.session.user!;
      if (!['admin', 'branch_manager', 'supervisor'].includes(currentUser.role)) {
        return res.status(403).json({ message: 'غير مصرح بالوصول' });
      }
      
      const userId = parseInt(req.params.userId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      
      const pointsHistory = await storage.getRewardPointsHistory(userId, limit);
      return res.json(pointsHistory);
    } catch (error) {
      console.error('Error fetching reward points history:', error);
      return res.status(500).json({ message: 'حدث خطأ أثناء جلب سجل النقاط' });
    }
  });
  
  /**
   * إضافة نقاط لمستخدم (للمدراء فقط)
   * @route POST /api/rewards/points/add
   */
  app.post('/api/rewards/points/add', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // التحقق من صلاحيات المستخدم (يجب أن يكون مدير أو مسؤول)
      const currentUser = req.session.user!;
      if (!['admin', 'branch_manager', 'supervisor'].includes(currentUser.role)) {
        return res.status(403).json({ message: 'غير مصرح بالوصول' });
      }
      
      // التحقق من بيانات الطلب
      const schema = z.object({
        userId: z.number(),
        points: z.number().positive(),
        reason: z.string().min(3),
        type: z.enum(['earned', 'adjusted']),
      });
      
      const validatedData = schema.safeParse(req.body);
      if (!validatedData.success) {
        return res.status(400).json({ message: 'بيانات غير صالحة', errors: validatedData.error.format() });
      }
      
      const { userId, points, reason, type } = validatedData.data;
      
      // إضافة سجل النقاط
      const historyEntry = await storage.addRewardPointsHistory({
        userId,
        points,
        type,
        reason,
        relatedEntityType: 'manual',
        relatedEntityId: null,
        date: new Date(),
        timestamp: new Date(),
        status: 'active',
        branchId: currentUser.branchId
      });
      
      // إنشاء إشعار للمستخدم
      await storage.createNotification({
        userId,
        title: "🎉 تم إضافة نقاط مكافأة!",
        message: `تم إضافة ${points} نقطة إلى رصيدك. السبب: ${reason}`,
        type: "success",
        timestamp: new Date(),
        link: "/rewards/points"
      });
      
      // إنشاء نشاط للمتابعة
      await storage.createActivity({
        userId: currentUser.id,
        action: "add_reward_points",
        details: { 
          targetUserId: userId, 
          points, 
          reason,
          type
        },
        branchId: currentUser.branchId,
        timestamp: new Date()
      });
      
      return res.json(historyEntry);
    } catch (error) {
      console.error('Error adding reward points:', error);
      return res.status(500).json({ message: 'حدث خطأ أثناء إضافة النقاط' });
    }
  });
  
  // ========== المكافآت ==========
  
  /**
   * الحصول على جميع المكافآت المتاحة
   * @route GET /api/rewards
   */
  app.get('/api/rewards', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const rewards = await storage.getAllRewards();
      
      // إضافة اسم المكافأة إلى طلبات الاستبدال (إن وجدت)
      const rewardsWithDetails = rewards.map(reward => {
        return {
          ...reward,
          isAvailable: reward.availableQuantity === null || reward.availableQuantity > 0
        };
      });
      
      // تسجيل معلومات للتصحيح
      console.log('Rewards fetched successfully, count:', rewards.length);
      
      return res.json(rewardsWithDetails);
    } catch (error) {
      console.error('Error fetching rewards:', error);
      return res.status(500).json({ message: 'حدث خطأ أثناء جلب المكافآت' });
    }
  });
  
  /**
   * الحصول على مكافأة محددة
   * @route GET /api/rewards/:id
   */
  app.get('/api/rewards/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const rewardId = parseInt(req.params.id);
      const reward = await storage.getReward(rewardId);
      
      if (!reward) {
        return res.status(404).json({ message: 'لم يتم العثور على المكافأة' });
      }
      
      return res.json(reward);
    } catch (error) {
      console.error('Error fetching reward:', error);
      return res.status(500).json({ message: 'حدث خطأ أثناء جلب المكافأة' });
    }
  });
  
  /**
   * إنشاء مكافأة جديدة (للمدراء فقط)
   * @route POST /api/rewards
   */
  app.post('/api/rewards', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // التحقق من صلاحيات المستخدم (يجب أن يكون مدير أو مسؤول)
      const currentUser = req.session.user!;
      if (!['admin', 'branch_manager'].includes(currentUser.role)) {
        return res.status(403).json({ message: 'غير مصرح بالوصول' });
      }
      
      // التحقق من بيانات الطلب
      const schema = z.object({
        name: z.string().min(3),
        description: z.string().min(3),
        pointsCost: z.number().positive(),
        category: z.enum(['time_off', 'financial', 'gifts', 'training', 'other']),
        icon: z.string().optional(),
        availableQuantity: z.number().nullable().optional(),
        expiryDate: z.union([z.string(), z.date()]).optional(),
        isActive: z.boolean().default(true)
      });
      
      const validatedData = schema.safeParse(req.body);
      if (!validatedData.success) {
        return res.status(400).json({ message: 'بيانات غير صالحة', errors: validatedData.error.format() });
      }
      
      // تنسيق التاريخ إذا كان موجودًا
      let formattedData = { ...validatedData.data };
      if (formattedData.expiryDate && typeof formattedData.expiryDate === 'string') {
        formattedData.expiryDate = new Date(formattedData.expiryDate);
      }
      
      // إنشاء المكافأة
      const reward = await storage.createReward(formattedData);
      
      // إنشاء نشاط للمتابعة
      await storage.createActivity({
        userId: currentUser.id,
        action: "create_reward",
        details: { rewardId: reward.id },
        branchId: currentUser.branchId,
        timestamp: new Date()
      });
      
      return res.status(201).json(reward);
    } catch (error) {
      console.error('Error creating reward:', error);
      return res.status(500).json({ message: 'حدث خطأ أثناء إنشاء المكافأة' });
    }
  });
  
  /**
   * تحديث مكافأة موجودة (للمدراء فقط)
   * @route PUT /api/rewards/:id
   */
  app.put('/api/rewards/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // التحقق من صلاحيات المستخدم (يجب أن يكون مدير أو مسؤول)
      const currentUser = req.session.user!;
      if (!['admin', 'branch_manager'].includes(currentUser.role)) {
        return res.status(403).json({ message: 'غير مصرح بالوصول' });
      }
      
      const rewardId = parseInt(req.params.id);
      
      // التحقق من وجود المكافأة
      const existingReward = await storage.getReward(rewardId);
      if (!existingReward) {
        return res.status(404).json({ message: 'لم يتم العثور على المكافأة' });
      }
      
      // التحقق من بيانات الطلب
      const schema = z.object({
        name: z.string().min(3).optional(),
        description: z.string().min(3).optional(),
        pointsCost: z.number().positive().optional(),
        category: z.enum(['time_off', 'financial', 'gifts', 'training', 'other']).optional(),
        icon: z.string().optional(),
        availableQuantity: z.number().nullable().optional(),
        expiryDate: z.union([z.string(), z.date(), z.null()]).optional(),
        isActive: z.boolean().optional(),
      });
      
      const validatedData = schema.safeParse(req.body);
      if (!validatedData.success) {
        return res.status(400).json({ message: 'بيانات غير صالحة', errors: validatedData.error.format() });
      }
      
      // تنسيق التاريخ إذا كان موجودًا
      let formattedData = { ...validatedData.data };
      if (formattedData.expiryDate && typeof formattedData.expiryDate === 'string') {
        formattedData.expiryDate = new Date(formattedData.expiryDate);
      }
      
      // تحديث المكافأة
      const updatedReward = await storage.updateReward(rewardId, formattedData);
      
      // إنشاء نشاط للمتابعة
      await storage.createActivity({
        userId: currentUser.id,
        action: "update_reward",
        details: { rewardId, updates: formattedData },
        branchId: currentUser.branchId,
        timestamp: new Date()
      });
      
      return res.json(updatedReward);
    } catch (error) {
      console.error('Error updating reward:', error);
      return res.status(500).json({ message: 'حدث خطأ أثناء تحديث المكافأة' });
    }
  });
  
  /**
   * استبدال مكافأة (للمستخدمين)
   * @route POST /api/rewards/redeem
   */
  app.post('/api/rewards/redeem', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // @ts-ignore - نتجاهل خطأ TypeScript للتعامل مع كائن req.user
      const userId = req.user!.id;
      
      // التحقق من بيانات الطلب
      const schema = z.object({
        rewardId: z.number(),
        pointsUsed: z.number().positive(),
        notes: z.string().optional()
      });
      
      const validatedData = schema.safeParse(req.body);
      if (!validatedData.success) {
        return res.status(400).json({ message: 'بيانات غير صالحة', errors: validatedData.error.format() });
      }
      
      const { rewardId, pointsUsed, notes } = validatedData.data;
      
      // التحقق من وجود المكافأة
      const reward = await storage.getReward(rewardId);
      if (!reward) {
        return res.status(404).json({ message: 'لم يتم العثور على المكافأة' });
      }
      
      // التحقق من أن المكافأة متاحة
      if (!reward.isActive) {
        return res.status(400).json({ message: 'المكافأة غير متاحة حاليًا' });
      }
      
      // التحقق من الكمية المتاحة
      if (reward.availableQuantity !== null && reward.availableQuantity <= 0) {
        return res.status(400).json({ message: 'نفدت الكمية المتاحة من هذه المكافأة' });
      }
      
      // التحقق من صلاحية تاريخ المكافأة
      if (reward.expiryDate && new Date(reward.expiryDate) < new Date()) {
        return res.status(400).json({ message: 'انتهت صلاحية هذه المكافأة' });
      }
      
      // التحقق من أن النقاط المستخدمة تساوي تكلفة المكافأة
      if (pointsUsed !== reward.pointsCost) {
        return res.status(400).json({ message: 'عدد النقاط المستخدمة غير صحيح' });
      }
      
      // إنشاء طلب الاستبدال
      const redemption = await storage.createRedemption({
        userId,
        rewardId,
        pointsUsed,
        notes: notes || null,
        redeemedAt: new Date(),
        status: 'pending',
        approvedBy: null,
        approvedAt: null
      });
      
      // إنشاء نشاط للمتابعة
      await storage.createActivity({
        userId,
        action: "redeem_reward",
        details: { rewardId, pointsUsed, redemptionId: redemption.id },
        // @ts-ignore - نتجاهل خطأ TypeScript للتعامل مع كائن req.user
        branchId: req.user!.branchId,
        timestamp: new Date()
      });
      
      return res.status(201).json(redemption);
    } catch (error: any) {
      console.error('Error redeeming reward:', error);
      
      // إذا كان الخطأ متعلق بعدم كفاية النقاط
      if (error.message && error.message.includes('النقاط غير كافية')) {
        return res.status(400).json({ message: 'النقاط غير كافية لاستبدال هذه المكافأة' });
      }
      
      return res.status(500).json({ message: 'حدث خطأ أثناء استبدال المكافأة' });
    }
  });
  
  /**
   * الحصول على طلبات استبدال المستخدم الحالي
   * @route GET /api/rewards/redemptions/me
   */
  app.get('/api/rewards/redemptions/me', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // @ts-ignore - نتجاهل خطأ TypeScript للتعامل مع كائن req.user
      const userId = req.user!.id;
      const redemptions = await storage.getUserRedemptions(userId);
      
      // إضافة اسم المكافأة إلى طلبات الاستبدال
      const enrichedRedemptions = await Promise.all(redemptions.map(async (redemption) => {
        const reward = await storage.getReward(redemption.rewardId);
        return {
          ...redemption,
          rewardName: reward ? reward.name : null
        };
      }));
      
      return res.json(enrichedRedemptions);
    } catch (error) {
      console.error('Error fetching user redemptions:', error);
      return res.status(500).json({ message: 'حدث خطأ أثناء جلب طلبات الاستبدال' });
    }
  });
  
  /**
   * الحصول على طلبات الاستبدال حسب الحالة (للمدراء)
   * @route GET /api/rewards/redemptions/status/:status
   */
  app.get('/api/rewards/redemptions/status/:status', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // التحقق من صلاحيات المستخدم (يجب أن يكون مدير أو مسؤول)
      const currentUser = req.session.user!;
      if (!['admin', 'branch_manager', 'supervisor'].includes(currentUser.role)) {
        return res.status(403).json({ message: 'غير مصرح بالوصول' });
      }
      
      const status = req.params.status;
      if (!['pending', 'approved', 'rejected', 'fulfilled'].includes(status)) {
        return res.status(400).json({ message: 'حالة غير صالحة' });
      }
      
      const redemptions = await storage.getRedemptionsByStatus(status);
      
      // إضافة اسم المستخدم واسم المكافأة إلى طلبات الاستبدال
      const enrichedRedemptions = await Promise.all(redemptions.map(async (redemption) => {
        const [user, reward] = await Promise.all([
          storage.getUser(redemption.userId),
          storage.getReward(redemption.rewardId)
        ]);
        
        return {
          ...redemption,
          userName: user ? user.name : null,
          rewardName: reward ? reward.name : null
        };
      }));
      
      return res.json(enrichedRedemptions);
    } catch (error) {
      console.error('Error fetching redemptions by status:', error);
      return res.status(500).json({ message: 'حدث خطأ أثناء جلب طلبات الاستبدال' });
    }
  });
  
  /**
   * الموافقة على طلب استبدال مكافأة (للمدراء)
   * @route POST /api/rewards/redemptions/:id/approve
   */
  app.post('/api/rewards/redemptions/:id/approve', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // التحقق من صلاحيات المستخدم (يجب أن يكون مدير أو مسؤول)
      const currentUser = req.session.user!;
      if (!['admin', 'branch_manager', 'supervisor'].includes(currentUser.role)) {
        return res.status(403).json({ message: 'غير مصرح بالوصول' });
      }
      
      const redemptionId = parseInt(req.params.id);
      const approvedRedemption = await storage.approveRedemption(redemptionId, currentUser.id);
      
      if (!approvedRedemption) {
        return res.status(404).json({ message: 'لم يتم العثور على طلب الاستبدال أو الطلب ليس في حالة معلقة' });
      }
      
      // تحديث كمية المكافأة المتاحة (إذا كانت محددة)
      const reward = await storage.getReward(approvedRedemption.rewardId);
      if (reward && reward.availableQuantity !== null) {
        await storage.updateReward(reward.id, {
          availableQuantity: Math.max(0, reward.availableQuantity - 1)
        });
      }
      
      // إنشاء نشاط للمتابعة
      await storage.createActivity({
        userId: currentUser.id,
        action: "approve_redemption",
        details: { 
          redemptionId,
          userId: approvedRedemption.userId,
          rewardId: approvedRedemption.rewardId
        },
        branchId: currentUser.branchId,
        timestamp: new Date()
      });
      
      return res.json(approvedRedemption);
    } catch (error) {
      console.error('Error approving redemption:', error);
      return res.status(500).json({ message: 'حدث خطأ أثناء الموافقة على طلب الاستبدال' });
    }
  });
  
  /**
   * رفض طلب استبدال مكافأة (للمدراء)
   * @route POST /api/rewards/redemptions/:id/reject
   */
  app.post('/api/rewards/redemptions/:id/reject', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // التحقق من صلاحيات المستخدم (يجب أن يكون مدير أو مسؤول)
      const currentUser = req.session.user!;
      if (!['admin', 'branch_manager', 'supervisor'].includes(currentUser.role)) {
        return res.status(403).json({ message: 'غير مصرح بالوصول' });
      }
      
      const redemptionId = parseInt(req.params.id);
      const notes = req.body.notes;
      
      const rejectedRedemption = await storage.rejectRedemption(redemptionId, notes);
      
      if (!rejectedRedemption) {
        return res.status(404).json({ message: 'لم يتم العثور على طلب الاستبدال أو الطلب ليس في حالة معلقة' });
      }
      
      // إنشاء نشاط للمتابعة
      await storage.createActivity({
        userId: currentUser.id,
        action: "reject_redemption",
        details: { 
          redemptionId,
          userId: rejectedRedemption.userId,
          rewardId: rejectedRedemption.rewardId,
          notes
        },
        branchId: currentUser.branchId,
        timestamp: new Date()
      });
      
      return res.json(rejectedRedemption);
    } catch (error) {
      console.error('Error rejecting redemption:', error);
      return res.status(500).json({ message: 'حدث خطأ أثناء رفض طلب الاستبدال' });
    }
  });
  
  // ========== إنجازات المستخدمين ==========
  
  /**
   * الحصول على جميع الإنجازات المتاحة
   * @route GET /api/achievements
   */
  app.get('/api/achievements', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const achievements = await storage.getAllAchievements();
      return res.json(achievements);
    } catch (error) {
      console.error('Error fetching achievements:', error);
      return res.status(500).json({ message: 'حدث خطأ أثناء جلب الإنجازات' });
    }
  });
  
  /**
   * الحصول على إنجاز محدد
   * @route GET /api/achievements/:id
   */
  app.get('/api/achievements/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const achievementId = parseInt(req.params.id);
      const achievement = await storage.getAchievement(achievementId);
      
      if (!achievement) {
        return res.status(404).json({ message: 'لم يتم العثور على الإنجاز' });
      }
      
      return res.json(achievement);
    } catch (error) {
      console.error('Error fetching achievement:', error);
      return res.status(500).json({ message: 'حدث خطأ أثناء جلب الإنجاز' });
    }
  });
  
  /**
   * الحصول على إنجازات المستخدم الحالي
   * @route GET /api/achievements/user/me
   */
  app.get('/api/achievements/user/me', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // @ts-ignore - نتجاهل خطأ TypeScript للتعامل مع كائن req.user
      const userId = req.user!.id;
      const userAchievements = await storage.getUserAchievements(userId);
      
      // إثراء البيانات بتفاصيل الإنجازات
      const enrichedAchievements = await Promise.all(userAchievements.map(async (userAchievement) => {
        const achievement = await storage.getAchievement(userAchievement.achievementId);
        if (!achievement) return null;
        
        return {
          ...userAchievement,
          name: achievement.name,
          description: achievement.description,
          category: achievement.category,
          pointsValue: achievement.pointsValue,
          icon: achievement.icon
        };
      }));
      
      // استبعاد العناصر الفارغة (null)
      const filteredAchievements = enrichedAchievements.filter(a => a !== null);
      
      return res.json(filteredAchievements);
    } catch (error) {
      console.error('Error fetching user achievements:', error);
      return res.status(500).json({ message: 'حدث خطأ أثناء جلب إنجازات المستخدم' });
    }
  });
  
  /**
   * الحصول على إنجازات مستخدم محدد (للمدراء)
   * @route GET /api/achievements/user/:userId
   */
  app.get('/api/achievements/user/:userId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // التحقق من صلاحيات المستخدم (يجب أن يكون مدير أو مسؤول)
      const currentUser = req.session.user!;
      if (!['admin', 'branch_manager', 'supervisor'].includes(currentUser.role)) {
        return res.status(403).json({ message: 'غير مصرح بالوصول' });
      }
      
      const userId = parseInt(req.params.userId);
      const userAchievements = await storage.getUserAchievements(userId);
      
      // إثراء البيانات بتفاصيل الإنجازات
      const enrichedAchievements = await Promise.all(userAchievements.map(async (userAchievement) => {
        const achievement = await storage.getAchievement(userAchievement.achievementId);
        if (!achievement) return null;
        
        return {
          ...userAchievement,
          name: achievement.name,
          description: achievement.description,
          category: achievement.category,
          pointsValue: achievement.pointsValue,
          icon: achievement.icon
        };
      }));
      
      // استبعاد العناصر الفارغة (null)
      const filteredAchievements = enrichedAchievements.filter(a => a !== null);
      
      return res.json(filteredAchievements);
    } catch (error) {
      console.error('Error fetching user achievements:', error);
      return res.status(500).json({ message: 'حدث خطأ أثناء جلب إنجازات المستخدم' });
    }
  });
  
  /**
   * إنشاء إنجاز جديد (للمدراء فقط)
   * @route POST /api/achievements
   */
  app.post('/api/achievements', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // التحقق من صلاحيات المستخدم (يجب أن يكون مدير أو مسؤول)
      const currentUser = req.session.user!;
      if (!['admin', 'branch_manager'].includes(currentUser.role)) {
        return res.status(403).json({ message: 'غير مصرح بالوصول' });
      }
      
      // التحقق من بيانات الطلب
      const schema = z.object({
        name: z.string().min(3),
        description: z.string().min(3),
        category: z.enum(['sales', 'attendance', 'quality', 'customer_service', 'team_work']),
        icon: z.string().optional(),
        pointsValue: z.number().positive(),
        criteria: z.record(z.string(), z.any()).optional(),
        isActive: z.boolean().default(true)
      });
      
      const validatedData = schema.safeParse(req.body);
      if (!validatedData.success) {
        return res.status(400).json({ message: 'بيانات غير صالحة', errors: validatedData.error.format() });
      }
      
      // إنشاء الإنجاز
      const achievement = await storage.createAchievement(validatedData.data);
      
      // إنشاء نشاط للمتابعة
      await storage.createActivity({
        userId: currentUser.id,
        action: "create_achievement",
        details: { achievementId: achievement.id },
        branchId: currentUser.branchId,
        timestamp: new Date()
      });
      
      return res.status(201).json(achievement);
    } catch (error) {
      console.error('Error creating achievement:', error);
      return res.status(500).json({ message: 'حدث خطأ أثناء إنشاء الإنجاز' });
    }
  });
  
  /**
   * تحديث تقدم إنجاز للمستخدم
   * @route POST /api/achievements/progress
   */
  app.post('/api/achievements/progress', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // التحقق من بيانات الطلب
      const schema = z.object({
        userId: z.number(),
        achievementId: z.number(),
        progress: z.number().min(0).max(100)
      });
      
      const validatedData = schema.safeParse(req.body);
      if (!validatedData.success) {
        return res.status(400).json({ message: 'بيانات غير صالحة', errors: validatedData.error.format() });
      }
      
      const { userId, achievementId, progress } = validatedData.data;
      
      // التحقق من صلاحيات المستخدم
      const currentUser = req.session.user!;
      if (userId !== currentUser.id && !['admin', 'branch_manager', 'supervisor'].includes(currentUser.role)) {
        return res.status(403).json({ message: 'غير مصرح بالوصول' });
      }
      
      // تحديث تقدم الإنجاز
      const updatedAchievement = await storage.updateUserAchievementProgress(userId, achievementId, progress);
      
      if (!updatedAchievement) {
        // إذا لم يكن هناك إنجاز للمستخدم، نقوم بإنشائه أولاً
        const achievement = await storage.getAchievement(achievementId);
        if (!achievement) {
          return res.status(404).json({ message: 'لم يتم العثور على الإنجاز' });
        }
        
        await storage.assignAchievementToUser({
          userId,
          achievementId,
          progress,
          awardedAt: new Date(),
          isCompleted: progress >= 100,
          completedAt: progress >= 100 ? new Date() : null
        });
        
        const newUserAchievement = await storage.updateUserAchievementProgress(userId, achievementId, progress);
        return res.json(newUserAchievement);
      }
      
      return res.json(updatedAchievement);
    } catch (error) {
      console.error('Error updating achievement progress:', error);
      return res.status(500).json({ message: 'حدث خطأ أثناء تحديث تقدم الإنجاز' });
    }
  });
  
  /**
   * تعيين إنجاز لمستخدم (للمدراء)
   * @route POST /api/achievements/assign
   */
  app.post('/api/achievements/assign', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // التحقق من صلاحيات المستخدم (يجب أن يكون مدير أو مسؤول)
      const currentUser = req.session.user!;
      if (!['admin', 'branch_manager', 'supervisor'].includes(currentUser.role)) {
        return res.status(403).json({ message: 'غير مصرح بالوصول' });
      }
      
      // التحقق من بيانات الطلب
      const schema = z.object({
        userId: z.number(),
        achievementId: z.number(),
        progress: z.number().min(0).max(100).default(0)
      });
      
      const validatedData = schema.safeParse(req.body);
      if (!validatedData.success) {
        return res.status(400).json({ message: 'بيانات غير صالحة', errors: validatedData.error.format() });
      }
      
      const { userId, achievementId, progress } = validatedData.data;
      
      // التحقق من وجود المستخدم
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'لم يتم العثور على المستخدم' });
      }
      
      // التحقق من وجود الإنجاز
      const achievement = await storage.getAchievement(achievementId);
      if (!achievement) {
        return res.status(404).json({ message: 'لم يتم العثور على الإنجاز' });
      }
      
      // تعيين الإنجاز للمستخدم
      const userAchievement = await storage.assignAchievementToUser({
        userId,
        achievementId,
        progress,
        awardedAt: new Date(),
        isCompleted: progress >= 100,
        completedAt: progress >= 100 ? new Date() : null
      });
      
      // إنشاء نشاط للمتابعة
      await storage.createActivity({
        userId: currentUser.id,
        action: "assign_achievement",
        details: { 
          targetUserId: userId, 
          achievementId,
          progress 
        },
        branchId: currentUser.branchId,
        timestamp: new Date()
      });
      
      return res.status(201).json(userAchievement);
    } catch (error) {
      console.error('Error assigning achievement:', error);
      return res.status(500).json({ message: 'حدث خطأ أثناء تعيين الإنجاز' });
    }
  });
}