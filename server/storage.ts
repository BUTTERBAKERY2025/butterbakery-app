import { 
  User, InsertUser, Branch, InsertBranch, MonthlyTarget, InsertMonthlyTarget,
  DailySales, InsertDailySales, Activity, InsertActivity, Notification, InsertNotification,
  ConsolidatedDailySales, InsertConsolidatedDailySales, DashboardStats,
  
  // أنواع نظام المكافآت والحوافز
  RewardPoints, InsertRewardPoints, RewardPointsHistory, InsertRewardPointsHistory,
  Achievement, InsertAchievement, UserAchievement, InsertUserAchievement,
  Reward, InsertReward, RewardRedemption, InsertRewardRedemption,
  Leaderboard, InsertLeaderboard, LeaderboardResult, InsertLeaderboardResult,
  
  // أنواع صندوق النقدية
  BranchCashBox, InsertBranchCashBox, CashBoxTransaction, InsertCashBoxTransaction,
  CashTransferToHQ, InsertCashTransferToHQ,
  
  // مولد موسيقى الطهي التفاعلي
  CookingSoundtrack, InsertCookingSoundtrack,
  
  users, branches, monthlyTargets, dailySales, activities, notifications, consolidatedDailySales,
  rewardPoints, rewardPointsHistory, achievements, userAchievements, rewards, rewardRedemptions,
  leaderboards, leaderboardResults, branchCashBox, cashBoxTransactions, cashTransfersToHQ,
  cookingSoundtracks
} from "@shared/schema";
import * as schema from "@shared/schema";
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, subDays, subMonths, subYears } from "date-fns";
import { ar } from "date-fns/locale";
import { db } from "./db";
import { eq, and, gte, lte, desc, asc, sql } from "drizzle-orm";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  
  // Branches
  getBranch(id: number): Promise<Branch | undefined>;
  getBranches(): Promise<Branch[]>;
  createBranch(branch: InsertBranch): Promise<Branch>;
  updateBranch(id: number, branch: Partial<Branch>): Promise<Branch | undefined>;
  
  // مولد موسيقى الطهي التفاعلي
  getCookingSoundtracks(): Promise<CookingSoundtrack[]>;
  getCookingSoundtrackById(id: number): Promise<CookingSoundtrack | undefined>;
  getCookingSoundtracksByUser(userId: number): Promise<CookingSoundtrack[]>;
  getCookingSoundtracksByBranch(branchId: number): Promise<CookingSoundtrack[]>;
  getCookingSoundtracksByMood(mood: string): Promise<CookingSoundtrack[]>;
  getCookingSoundtracksByRecipeType(recipeType: string): Promise<CookingSoundtrack[]>;
  createCookingSoundtrack(soundtrack: InsertCookingSoundtrack): Promise<CookingSoundtrack>;
  updateCookingSoundtrack(id: number, soundtrack: Partial<CookingSoundtrack>): Promise<CookingSoundtrack | undefined>;
  deleteCookingSoundtrack(id: number): Promise<boolean>;
  
  // Monthly Targets
  getMonthlyTarget(id: number): Promise<MonthlyTarget | undefined>;
  getMonthlyTargets(): Promise<MonthlyTarget[]>;
  getMonthlyTargetByBranchAndDate(branchId: number, month: number, year: number): Promise<MonthlyTarget | undefined>;
  createMonthlyTarget(target: InsertMonthlyTarget): Promise<MonthlyTarget>;
  
  // Daily Sales
  getDailySales(): Promise<DailySales[]>;
  getDailySalesById(id: number): Promise<DailySales | undefined>;
  getDailySalesByBranchAndDate(branchId: number, date: string): Promise<DailySales[]>;
  getDailySalesByBranchAndDateRange(branchId: number, startDate: string, endDate: string): Promise<DailySales[]>;
  getDailySalesByCashierAndDate(cashierId: number, date: string): Promise<DailySales | undefined>;
  createDailySales(sales: InsertDailySales): Promise<DailySales>;
  
  // Activities
  getActivities(limit?: number): Promise<Activity[]>;
  getActivitiesByBranch(branchId: number, limit?: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  
  // Notifications
  getNotifications(limit?: number): Promise<Notification[]>;
  getNotificationsByUser(userId?: number, limit?: number): Promise<Notification[]>;
  getUnreadNotificationsByUser(userId?: number, limit?: number): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<Notification | undefined>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  
  // Consolidated Daily Sales
  getConsolidatedDailySales(): Promise<ConsolidatedDailySales[]>;
  getConsolidatedDailySalesByBranch(branchId: number): Promise<ConsolidatedDailySales[]>;
  getConsolidatedDailySalesByDate(date: string): Promise<ConsolidatedDailySales[]>;
  getConsolidatedDailySalesById(id: number): Promise<ConsolidatedDailySales | undefined>;
  createConsolidatedDailySales(consolidatedSales: InsertConsolidatedDailySales): Promise<ConsolidatedDailySales>;
  closeConsolidatedDailySales(id: number, userId: number): Promise<ConsolidatedDailySales | undefined>;
  transferConsolidatedDailySales(id: number, userId: number): Promise<ConsolidatedDailySales | undefined>;
  
  // Daily Sales Operations
  checkExistingDailySales(cashierId: number, date: string): Promise<boolean>;
  updateDailySalesStatus(id: number, status: string, consolidatedId?: number): Promise<DailySales | undefined>;
  consolidateDailySales(branchId: number, date: string, userId: number): Promise<ConsolidatedDailySales | undefined>;
  
  // Dashboard Stats
  getDashboardStats(branchId: number, date: Date): Promise<DashboardStats>;
  /**
   * الحصول على إنجاز الهدف الشهري للفروع
   * إذا كان specificBranchId = 0، فسيتم عرض البيانات لجميع الفروع
   * @param month الشهر
   * @param year السنة
   * @param specificBranchId معرف الفرع المحدد (0 لجميع الفروع)
   */
  getBranchTargetAchievement(month: number, year: number, specificBranchId?: number): Promise<any[]>;
  /**
   * الحصول على أداء الكاشير حسب الفرع والتاريخ
   * إذا كان branchId = 0، فسيتم عرض أداء جميع الكاشيرين من جميع الفروع
   * @param branchId معرف الفرع (0 لجميع الفروع)
   * @param date التاريخ
   */
  getCashierPerformance(branchId: number, date: Date): Promise<any[]>;
  /**
   * الحصول على تحليلات المبيعات حسب الفرع والفترة الزمنية
   * إذا كان branchId = 0، فسيتم عرض البيانات لجميع الفروع
   * @param branchId معرف الفرع (0 لجميع الفروع)
   * @param period الفترة الزمنية (weekly, monthly, yearly)
   */
  getSalesAnalytics(branchId: number, period: string): Promise<any>;
  
  // نظام المكافآت والنقاط
  // Reward Points
  getUserRewardPoints(userId: number): Promise<RewardPoints | undefined>;
  updateUserRewardPoints(userId: number, points: number): Promise<RewardPoints | undefined>;
  addRewardPointsHistory(history: InsertRewardPointsHistory): Promise<RewardPointsHistory>;
  getRewardPointsHistory(userId: number, limit?: number): Promise<RewardPointsHistory[]>;
  getRewardPointsHistoryByType(userId: number, type: string): Promise<RewardPointsHistory[]>;
  
  // الإنجازات
  // Achievements
  getAllAchievements(): Promise<Achievement[]>;
  getAchievement(id: number): Promise<Achievement | undefined>;
  getAchievementsByCategory(category: string): Promise<Achievement[]>;
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;
  updateAchievement(id: number, achievement: Partial<Achievement>): Promise<Achievement | undefined>;
  
  // إنجازات المستخدمين
  // User Achievements
  getUserAchievements(userId: number): Promise<UserAchievement[]>;
  assignAchievementToUser(userAchievement: InsertUserAchievement): Promise<UserAchievement>;
  updateUserAchievementProgress(userId: number, achievementId: number, progress: number): Promise<UserAchievement | undefined>;
  completeUserAchievement(userId: number, achievementId: number): Promise<UserAchievement | undefined>;
  
  // المكافآت
  // Rewards
  getAllRewards(): Promise<Reward[]>;
  getReward(id: number): Promise<Reward | undefined>;
  getRewardsByCategory(category: string): Promise<Reward[]>;
  createReward(reward: InsertReward): Promise<Reward>;
  updateReward(id: number, reward: Partial<Reward>): Promise<Reward | undefined>;
  
  // استبدال المكافآت
  // Reward Redemptions
  getUserRedemptions(userId: number): Promise<RewardRedemption[]>;
  createRedemption(redemption: InsertRewardRedemption): Promise<RewardRedemption>;
  approveRedemption(id: number, approverId: number): Promise<RewardRedemption | undefined>;
  rejectRedemption(id: number, notes?: string): Promise<RewardRedemption | undefined>;
  getRedemptionsByStatus(status: string): Promise<RewardRedemption[]>;
  
  // لوحة المتصدرين
  // Leaderboards
  getActiveLeaderboards(): Promise<Leaderboard[]>;
  getLeaderboard(id: number): Promise<Leaderboard | undefined>;
  createLeaderboard(leaderboard: InsertLeaderboard): Promise<Leaderboard>;
  updateLeaderboardResults(leaderboardId: number, results: InsertLeaderboardResult[]): Promise<LeaderboardResult[]>;
  getLeaderboardResults(leaderboardId: number): Promise<LeaderboardResult[]>;
  getUserLeaderboardRank(leaderboardId: number, userId: number): Promise<LeaderboardResult | undefined>;
  
  // وظائف تحليل المبيعات
  // Sales Analysis
  analyzeSalesDrops(branchId: number, period: string): Promise<any>;
  generateSalesAlerts(branchId: number, threshold: number): Promise<any[]>;
  analyzeCashierPerformanceTrends(branchId: number, period: string): Promise<any[]>;
  
  // صندوق النقدية
  // Branch Cash Box
  getBranchCashBox(branchId: number): Promise<BranchCashBox | undefined>;
  createBranchCashBox(cashBox: InsertBranchCashBox): Promise<BranchCashBox>;
  updateBranchCashBoxBalance(branchId: number, amount: number): Promise<BranchCashBox | undefined>;
  
  // حركات صندوق النقدية
  // Cash Box Transactions
  getCashBoxTransactions(branchId: number): Promise<CashBoxTransaction[]>;
  getCashBoxTransactionsByDate(branchId: number, startDate: string, endDate: string): Promise<CashBoxTransaction[]>;
  getCashBoxTransactionById(id: number): Promise<CashBoxTransaction | undefined>;
  createCashBoxTransaction(transaction: InsertCashBoxTransaction): Promise<CashBoxTransaction>;
  
  // التحويلات النقدية للمركز الرئيسي
  // Cash Transfers to HQ
  getCashTransfersToHQ(branchId: number): Promise<CashTransferToHQ[]>;
  getCashTransferToHQById(id: number): Promise<CashTransferToHQ | undefined>;
  createCashTransferToHQ(transfer: InsertCashTransferToHQ): Promise<CashTransferToHQ>;
  approveCashTransferToHQ(id: number, approverId: number): Promise<CashTransferToHQ | undefined>;
  rejectCashTransferToHQ(id: number, notes: string): Promise<CashTransferToHQ | undefined>;
  getCashTransfersByStatus(status: string): Promise<CashTransferToHQ[]>;
  
  // تقارير صندوق النقدية
  // Cash Box Reports
  getBranchCashBoxBalance(branchId: number): Promise<number>;
  getCashBoxReport(branchId: number, startDate: string, endDate: string): Promise<any>;
  getCashTransfersReport(branchId: number, startDate: string, endDate: string): Promise<any>;
  
  // عمليات أخرى
  // مثل عملية تحويل مبيعات نقدية إلى صندوق النقدية بشكل آلي
  processDailySalesToCashBox(dailySalesId: number): Promise<CashBoxTransaction | undefined>;
  
  // صندوق النقدية للفرع
  getBranchCashBox(branchId: number): Promise<BranchCashBox | undefined>;
  createBranchCashBox(cashBox: InsertBranchCashBox): Promise<BranchCashBox>;
  updateBranchCashBoxBalance(branchId: number, amount: number): Promise<BranchCashBox | undefined>;
  
  // معاملات صندوق النقدية
  getCashBoxTransactions(branchId: number): Promise<CashBoxTransaction[]>;
  getCashBoxTransactionsByDate(branchId: number, startDate: string, endDate: string): Promise<CashBoxTransaction[]>;
  getCashBoxTransactionById(id: number): Promise<CashBoxTransaction | undefined>;
  createCashBoxTransaction(transaction: InsertCashBoxTransaction): Promise<CashBoxTransaction>;
  
  // التحويلات النقدية للمركز الرئيسي
  getCashTransfersToHQ(branchId: number): Promise<CashTransferToHQ[]>;
  getCashTransferToHQById(id: number): Promise<CashTransferToHQ | undefined>;
  createCashTransferToHQ(transfer: InsertCashTransferToHQ): Promise<CashTransferToHQ>;
  approveCashTransferToHQ(id: number, approverId: number): Promise<CashTransferToHQ | undefined>;
  rejectCashTransferToHQ(id: number, notes: string): Promise<CashTransferToHQ | undefined>;
  getCashTransfersByStatus(status: string): Promise<CashTransferToHQ[]>;
  
  // تقارير صندوق النقدية
  getBranchCashBoxBalance(branchId: number): Promise<number>;
  getCashBoxReport(branchId: number, startDate: string, endDate: string): Promise<any>;
  getCashTransfersReport(branchId: number, startDate: string, endDate: string): Promise<any>;
  
  // Demo data
  initializeDemoData(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private branches: Map<number, Branch>;
  private monthlyTargets: Map<number, MonthlyTarget>;
  private dailySales: Map<number, DailySales>;
  private activities: Map<number, Activity>;
  private notifications: Map<number, Notification>;
  private consolidatedDailySales: Map<number, ConsolidatedDailySales>;
  
  // خرائط لنظام المكافآت والحوافز
  private rewardPoints: Map<number, RewardPoints>;
  private rewardPointsHistory: Map<number, RewardPointsHistory>;
  private achievements: Map<number, Achievement>;
  private userAchievements: Map<number, UserAchievement>;
  private rewards: Map<number, Reward>;
  private rewardRedemptions: Map<number, RewardRedemption>;
  private leaderboards: Map<number, Leaderboard>;
  private leaderboardResults: Map<number, LeaderboardResult>;
  
  // خرائط لنظام صندوق النقدية
  private branchCashBoxes: Map<number, BranchCashBox>;
  private cashBoxTransactions: Map<number, CashBoxTransaction>;
  private cashTransfersToHQ: Map<number, CashTransferToHQ>;
  
  // خريطة لموسيقى الطهي التفاعلية
  private cookingSoundtracks: Map<number, CookingSoundtrack>;
  
  private userCurrentId: number;
  private branchCurrentId: number;
  private targetCurrentId: number;
  private salesCurrentId: number;
  private activityCurrentId: number;
  private notificationCurrentId: number;
  private consolidatedSalesCurrentId: number;
  
  // معرفات نظام المكافآت والحوافز
  private rewardPointsCurrentId: number;
  private rewardPointsHistoryCurrentId: number;
  private achievementsCurrentId: number;
  private userAchievementsCurrentId: number;
  private rewardsCurrentId: number;
  private rewardRedemptionsCurrentId: number;
  private leaderboardsCurrentId: number;
  private leaderboardResultsCurrentId: number;
  
  // معرفات نظام صندوق النقدية
  private cashBoxTransactionCurrentId: number;
  private cashTransferToHQCurrentId: number;
  
  // معرف مولد موسيقى الطهي التفاعلي
  private cookingSoundtrackCurrentId: number;
  
  constructor() {
    this.users = new Map();
    this.branches = new Map();
    this.monthlyTargets = new Map();
    this.dailySales = new Map();
    this.activities = new Map();
    this.notifications = new Map();
    this.consolidatedDailySales = new Map();
    
    // إنشاء خرائط جديدة لنظام المكافآت والحوافز
    this.rewardPoints = new Map();
    this.rewardPointsHistory = new Map();
    this.achievements = new Map();
    this.userAchievements = new Map();
    this.rewards = new Map();
    this.rewardRedemptions = new Map();
    this.leaderboards = new Map();
    this.leaderboardResults = new Map();
    
    // إنشاء خرائط لنظام صندوق النقدية
    this.branchCashBoxes = new Map();
    this.cashBoxTransactions = new Map();
    this.cashTransfersToHQ = new Map();
    
    // إنشاء خريطة موسيقى الطهي التفاعلية
    this.cookingSoundtracks = new Map();
    
    this.userCurrentId = 1;
    this.branchCurrentId = 1;
    this.targetCurrentId = 1;
    this.salesCurrentId = 1;
    this.activityCurrentId = 1;
    this.notificationCurrentId = 1;
    this.consolidatedSalesCurrentId = 1;
    
    // معرفات نظام المكافآت والحوافز
    this.rewardPointsCurrentId = 1;
    this.rewardPointsHistoryCurrentId = 1;
    this.achievementsCurrentId = 1;
    this.userAchievementsCurrentId = 1;
    this.rewardsCurrentId = 1;
    this.rewardRedemptionsCurrentId = 1;
    this.leaderboardsCurrentId = 1;
    this.leaderboardResultsCurrentId = 1;
    
    // معرفات نظام صندوق النقدية
    this.cashBoxTransactionCurrentId = 1;
    this.cashTransferToHQCurrentId = 1;
    
    // معرف مولد موسيقى الطهي التفاعلي
    this.cookingSoundtrackCurrentId = 1;
  }
  
  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }
  
  // Branches
  async getBranch(id: number): Promise<Branch | undefined> {
    return this.branches.get(id);
  }
  
  async getBranches(): Promise<Branch[]> {
    return Array.from(this.branches.values());
  }
  
  async createBranch(insertBranch: InsertBranch): Promise<Branch> {
    const id = this.branchCurrentId++;
    const branch: Branch = { ...insertBranch, id };
    this.branches.set(id, branch);
    return branch;
  }
  
  async updateBranch(id: number, branchData: Partial<Branch>): Promise<Branch | undefined> {
    const branch = this.branches.get(id);
    if (!branch) return undefined;
    
    const updatedBranch = { ...branch, ...branchData };
    this.branches.set(id, updatedBranch);
    return updatedBranch;
  }
  
  // Monthly Targets
  async getMonthlyTarget(id: number): Promise<MonthlyTarget | undefined> {
    return this.monthlyTargets.get(id);
  }
  
  async getMonthlyTargets(): Promise<MonthlyTarget[]> {
    return Array.from(this.monthlyTargets.values());
  }
  
  async getMonthlyTargetByBranchAndDate(branchId: number, month: number, year: number): Promise<MonthlyTarget | undefined> {
    return Array.from(this.monthlyTargets.values()).find(
      target => target.branchId === branchId && target.month === month && target.year === year
    );
  }
  
  async createMonthlyTarget(insertTarget: InsertMonthlyTarget): Promise<MonthlyTarget> {
    const id = this.targetCurrentId++;
    const target: MonthlyTarget = { ...insertTarget, id };
    this.monthlyTargets.set(id, target);
    return target;
  }
  
  // Daily Sales
  async getDailySales(): Promise<DailySales[]> {
    return Array.from(this.dailySales.values());
  }
  
  async getDailySalesById(id: number): Promise<DailySales | undefined> {
    return this.dailySales.get(id);
  }
  
  async getDailySalesByBranchAndDate(branchId: number, date: string): Promise<DailySales[]> {
    return Array.from(this.dailySales.values()).filter(sale => {
      // إذا كان branchId = 0، يتم اعتباره كـ "كل الفروع" وبالتالي نجلب كل المبيعات في هذا التاريخ المحدد
      if (branchId === 0) {
        return sale.date === date;
      }
      
      // خلاف ذلك، نقوم بالتصفية حسب الفرع المحدد
      return sale.branchId === branchId && sale.date === date;
    });
  }
  
  async getDailySalesByBranchAndDateRange(branchId: number, startDate: string, endDate: string): Promise<DailySales[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return Array.from(this.dailySales.values()).filter(sale => {
      const saleDate = new Date(sale.date);
      
      // إذا كان branchId = 0، يتم اعتباره كـ "كل الفروع" وبالتالي نجلب كل المبيعات في هذا النطاق الزمني
      if (branchId === 0) {
        return saleDate >= start && saleDate <= end;
      }
      
      // خلاف ذلك، نقوم بالتصفية حسب الفرع المحدد
      return sale.branchId === branchId && saleDate >= start && saleDate <= end;
    });
  }
  
  async getDailySalesByCashierAndDate(cashierId: number, date: string): Promise<DailySales | undefined> {
    return Array.from(this.dailySales.values()).find(
      sale => sale.cashierId === cashierId && sale.date === date
    );
  }
  
  async createDailySales(insertSales: InsertDailySales): Promise<DailySales> {
    const id = this.salesCurrentId++;
    const sales: DailySales = { ...insertSales, id };
    this.dailySales.set(id, sales);
    
    // تحديث الهدف الشهري بناءً على المبيعات الجديدة
    await this.updateTargetWithSales(sales);
    
    return sales;
  }
  
  /**
   * تحديث الهدف الشهري بناءً على المبيعات اليومية
   * يتم استدعاء هذه الدالة تلقائيًا عند إنشاء سجل مبيعات جديد
   */
  private async updateTargetWithSales(sales: DailySales): Promise<void> {
    try {
      // استخراج الشهر والسنة من تاريخ المبيعات
      const saleDate = new Date(sales.date);
      const month = saleDate.getMonth() + 1; // تحويل الشهر من 0-11 إلى 1-12
      const year = saleDate.getFullYear();
      
      // البحث عن الهدف الشهري المطابق للفرع والشهر والسنة
      const target = await this.getMonthlyTargetByBranchAndDate(sales.branchId, month, year);
      
      // إذا لم يوجد هدف مطابق، نخرج من الدالة
      if (!target) return;
      
      // الحصول على جميع المبيعات لهذا الفرع في هذا الشهر
      const startOfMonthDate = new Date(year, month - 1, 1);
      const endOfMonthDate = new Date(year, month, 0);
      
      const startDate = format(startOfMonthDate, 'yyyy-MM-dd');
      const endDate = format(endOfMonthDate, 'yyyy-MM-dd');
      
      const monthlySales = await this.getDailySalesByBranchAndDateRange(
        sales.branchId,
        startDate,
        endDate
      );
      
      // تجميع إجمالي المبيعات لهذا الشهر
      const totalMonthlySales = monthlySales.reduce(
        (total, sale) => total + sale.totalSales,
        0
      );
      
      // إنشاء نشاط لتتبع التحديث
      await this.createActivity({
        userId: sales.cashierId,
        action: "target_update_from_sales",
        details: { 
          branchId: sales.branchId, 
          month, 
          year, 
          saleAmount: sales.totalSales,
          totalMonthlySales,
          targetAmount: target.targetAmount 
        },
        branchId: sales.branchId,
        timestamp: new Date()
      });
      
      // إنشاء إشعار إذا تم تحقيق نسبة مهمة من الهدف
      const achievementPercentage = (totalMonthlySales / target.targetAmount) * 100;
      
      // إنشاء إشعارات عند تحقيق نسب معينة من الهدف
      const milestones = [50, 75, 90, 100];
      for (const milestone of milestones) {
        // تحقق إذا وصلنا للنسبة المئوية الحالية
        if (achievementPercentage >= milestone && achievementPercentage - (sales.totalSales / target.targetAmount * 100) < milestone) {
          await this.createNotification({
            userId: null, // للجميع
            title: `تم تحقيق ${milestone}% من الهدف الشهري`,
            message: `فرع #${sales.branchId} حقق ${achievementPercentage.toFixed(1)}% من هدف شهر ${month}/${year}`,
            type: milestone >= 100 ? "success" : "info",
            timestamp: new Date(),
            link: "/targets"
          });
          break; // اخرج من الحلقة بعد إنشاء الإشعار الأول الملائم
        }
      }
    } catch (error) {
      console.error("Error updating target with sales:", error);
    }
  }
  
  // Activities
  async getActivities(limit?: number): Promise<Activity[]> {
    let activities = Array.from(this.activities.values()).sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return dateB.getTime() - dateA.getTime();
    });
    
    if (limit) {
      activities = activities.slice(0, limit);
    }
    
    return activities;
  }
  
  async getActivitiesByBranch(branchId: number, limit?: number): Promise<Activity[]> {
    // إذا كان branchId = 0، قم بإرجاع الأنشطة لجميع الفروع (بدون فلترة)
    let activities = Array.from(this.activities.values());
    
    // فلترة الأنشطة حسب الفرع فقط إذا كان الفرع محدد (غير صفر)
    if (branchId !== 0) {
      activities = activities.filter(activity => activity.branchId === branchId);
    }
    
    // ترتيب النتائج حسب التاريخ تنازليًا
    activities = activities.sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateB.getTime() - dateA.getTime();
      });
    
    if (limit) {
      activities = activities.slice(0, limit);
    }
    
    return activities;
  }
  
  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = this.activityCurrentId++;
    const activity: Activity = { ...insertActivity, id };
    this.activities.set(id, activity);
    return activity;
  }
  
  // Notifications
  async getNotifications(limit?: number): Promise<Notification[]> {
    let notifications = Array.from(this.notifications.values()).sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return dateB.getTime() - dateA.getTime();
    });
    
    if (limit) {
      notifications = notifications.slice(0, limit);
    }
    
    return notifications;
  }
  
  async getNotificationsByUser(userId?: number, limit?: number): Promise<Notification[]> {
    let notifications;
    
    if (userId) {
      notifications = Array.from(this.notifications.values())
        .filter(notification => notification.userId === userId || notification.userId === null)
        .sort((a, b) => {
          const dateA = new Date(a.timestamp);
          const dateB = new Date(b.timestamp);
          return dateB.getTime() - dateA.getTime();
        });
    } else {
      notifications = Array.from(this.notifications.values()).sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateB.getTime() - dateA.getTime();
      });
    }
    
    if (limit) {
      notifications = notifications.slice(0, limit);
    }
    
    return notifications;
  }
  
  async getUnreadNotificationsByUser(userId?: number, limit?: number): Promise<Notification[]> {
    let notifications;
    
    if (userId) {
      notifications = Array.from(this.notifications.values())
        .filter(notification => (notification.userId === userId || notification.userId === null) && notification.isRead === false)
        .sort((a, b) => {
          const dateA = new Date(a.timestamp);
          const dateB = new Date(b.timestamp);
          return dateB.getTime() - dateA.getTime();
        });
    } else {
      notifications = Array.from(this.notifications.values())
        .filter(notification => notification.isRead === false)
        .sort((a, b) => {
          const dateA = new Date(a.timestamp);
          const dateB = new Date(b.timestamp);
          return dateB.getTime() - dateA.getTime();
        });
    }
    
    if (limit) {
      notifications = notifications.slice(0, limit);
    }
    
    return notifications;
  }
  
  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const notification = this.notifications.get(id);
    if (!notification) return undefined;
    
    const updatedNotification = { ...notification, isRead: true };
    this.notifications.set(id, updatedNotification);
    return updatedNotification;
  }
  
  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = this.notificationCurrentId++;
    const notification: Notification = { ...insertNotification, id, isRead: false };
    this.notifications.set(id, notification);
    return notification;
  }
  
  // Dashboard Stats
  async getDashboardStats(branchId: number, date: Date): Promise<DashboardStats> {
    const formattedDate = format(date, 'yyyy-MM-dd');
    const currentMonth = date.getMonth() + 1;
    const currentYear = date.getFullYear();
    
    // الحصول على مبيعات اليوم
    const dailySalesData = await this.getDailySalesByBranchAndDate(branchId, formattedDate);
    const dailySalesTotal = dailySalesData.reduce((sum, sale) => sum + sale.totalSales, 0);
    
    // إذا كان branchId = 0 (كل الفروع)، نحسب مجموع أهداف كل الفروع
    let monthlyTarget = null;
    let dailyTarget = 0;
    
    if (branchId === 0) {
      // الحصول على جميع الفروع
      const branches = await this.getBranches();
      
      // حساب مجموع الأهداف الشهرية لجميع الفروع
      let totalMonthlyTargetAmount = 0;
      
      for (const branch of branches) {
        const branchTarget = await this.getMonthlyTargetByBranchAndDate(branch.id, currentMonth, currentYear);
        if (branchTarget) {
          totalMonthlyTargetAmount += branchTarget.targetAmount;
        }
      }
      
      // إنشاء هدف شهري تجميعي "افتراضي"
      monthlyTarget = { targetAmount: totalMonthlyTargetAmount };
      
      // حساب الهدف اليومي
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      dailyTarget = totalMonthlyTargetAmount / daysInMonth;
    } else {
      // الحصول على الهدف الشهري للفرع المحدد
      monthlyTarget = await this.getMonthlyTargetByBranchAndDate(branchId, currentMonth, currentYear);
      
      // حساب الهدف اليومي استناداً إلى نمط التوزيع أو القسمة البسيطة
      if (monthlyTarget) {
        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
        dailyTarget = monthlyTarget.targetAmount / daysInMonth;
      }
    }
    
    // الحصول على المبيعات الشهرية حتى الآن
    const startOfMonthDate = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonthDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    const startDateFormatted = format(startOfMonthDate, 'yyyy-MM-dd');
    const endDateFormatted = format(endOfMonthDate, 'yyyy-MM-dd');
    
    const monthlySalesData = await this.getDailySalesByBranchAndDateRange(branchId, startDateFormatted, endDateFormatted);
    const monthlySalesTotal = monthlySalesData.reduce((sum, sale) => sum + sale.totalSales, 0);
    
    // حساب توزيع وسائل الدفع
    const totalCash = dailySalesData.reduce((sum, sale) => sum + sale.totalCashSales, 0);
    const totalNetwork = dailySalesData.reduce((sum, sale) => {
      if (typeof sale.totalNetworkSales !== 'undefined') {
        return sum + sale.totalNetworkSales;
      }
      return sum;
    }, 0);
    
    const total = totalCash + totalNetwork;
    
    // حساب متوسط قيمة الفاتورة وعدد المعاملات
    const totalTransactions = dailySalesData.reduce((sum, sale) => sum + sale.totalTransactions, 0);
    const averageTicket = totalTransactions > 0 ? dailySalesTotal / totalTransactions : 0;
    
    return {
      dailySales: dailySalesTotal,
      dailyTarget,
      dailyTargetPercentage: dailyTarget > 0 ? (dailySalesTotal / dailyTarget) * 100 : 0,
      monthlyTargetAmount: monthlyTarget?.targetAmount || 0,
      monthlySalesAmount: monthlySalesTotal,
      monthlyTargetPercentage: monthlyTarget?.targetAmount ? (monthlySalesTotal / monthlyTarget.targetAmount) * 100 : 0,
      averageTicket,
      totalTransactions,
      paymentMethodsBreakdown: {
        cash: { 
          amount: totalCash, 
          percentage: total > 0 ? (totalCash / total) * 100 : 0 
        },
        network: { 
          amount: totalNetwork, 
          percentage: total > 0 ? (totalNetwork / total) * 100 : 0 
        }
      }
    };
  }
  
  /**
   * الحصول على إنجاز الهدف الشهري للفروع
   * تدعم هذه الدالة عرض بيانات لجميع الفروع (specificBranchId=0)
   * @param month الشهر
   * @param year السنة
   * @param specificBranchId معرف الفرع المحدد (0 لجميع الفروع)
   */
  async getBranchTargetAchievement(month: number, year: number, specificBranchId?: number): Promise<any[]> {
    console.log(`🔍 طلب إنجاز الهدف الشهري للشهر ${month}, السنة ${year}, الفرع ${specificBranchId || 'جميع الفروع'}`);
    
    // استدعاء تنفيذ الدالة الفعلي
    return this.getBranchTargetAchievementImpl(month, year, specificBranchId);
  }
  
  /**
   * التنفيذ الفعلي لدالة الحصول على إنجاز الهدف الشهري للفروع
   * هذه دالة داخلية تستخدم من قبل getBranchTargetAchievement
   * @param month الشهر
   * @param year السنة
   * @param specificBranchId معرف الفرع المحدد (0 لجميع الفروع)
   */
  private async getBranchTargetAchievementImpl(month: number, year: number, specificBranchId?: number): Promise<any[]> {
    // تحديد قائمة الفروع المطلوب حساب الإنجاز لها
    let branchesList: Branch[] = [];
    
    if (specificBranchId !== undefined && specificBranchId !== 0) {
      // إذا تم تحديد رقم فرع محدد (وليس صفر)
      const branch = await this.getBranch(specificBranchId);
      if (branch) {
        branchesList = [branch];
      }
    } else {
      // إذا لم يتم تحديد فرع، أو تم تحديد القيمة صفر (كل الفروع)
      branchesList = await this.getBranches();
    }
    
    const results = [];
    
    // تجهيز عرض تجميعي للفروع إذا كان specificBranchId = 0
    if (specificBranchId === 0) {
      // قيم تجميعية لكل الفروع
      let totalTargetAmount = 0;
      let totalAchievedAmount = 0;
      
      // حساب مجموع الأهداف والإنجازات لكل الفروع
      for (const branch of branchesList) {
        const target = await this.getMonthlyTargetByBranchAndDate(branch.id, month, year);
        
        if (target) {
          const startDateStr = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
          const endDateStr = format(new Date(year, month, 0), 'yyyy-MM-dd');
          
          const sales = await this.getDailySalesByBranchAndDateRange(branch.id, startDateStr, endDateStr);
          const branchTotalSales = sales.reduce((sum, sale) => sum + sale.totalSales, 0);
          
          totalTargetAmount += target.targetAmount;
          totalAchievedAmount += branchTotalSales;
        }
      }
      
      // حساب نسبة الإنجاز الإجمالية
      const totalAchievementPercentage = totalTargetAmount > 0 ? (totalAchievedAmount / totalTargetAmount) * 100 : 0;
      
      // تحديد الحالة العامة بناءً على نسبة الإنجاز
      let overallStatus = "يحتاج تحسين"; // Needs improvement
      if (totalAchievementPercentage >= 95) {
        overallStatus = "ممتاز"; // Excellent
      } else if (totalAchievementPercentage >= 85) {
        overallStatus = "جيد جدًا"; // Very good
      } else if (totalAchievementPercentage >= 75) {
        overallStatus = "جيد"; // Good
      }
      
      // إضافة النتيجة التجميعية
      results.push({
        branchId: 0,
        branchName: "كل الفروع",
        target: totalTargetAmount,
        achieved: totalAchievedAmount,
        percentage: totalAchievementPercentage,
        status: overallStatus
      });
    }
    
    // معالجة كل فرع على حدة
    for (const branch of branchesList) {
      const target = await this.getMonthlyTargetByBranchAndDate(branch.id, month, year);
      
      if (target) {
        const startDateStr = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
        const endDateStr = format(new Date(year, month, 0), 'yyyy-MM-dd');
        
        const sales = await this.getDailySalesByBranchAndDateRange(branch.id, startDateStr, endDateStr);
        const totalSales = sales.reduce((sum, sale) => sum + sale.totalSales, 0);
        const achievementPercentage = (totalSales / target.targetAmount) * 100;
        
        // تحديد الحالة بناءً على نسبة الإنجاز
        let status = "يحتاج تحسين"; // Needs improvement
        if (achievementPercentage >= 95) {
          status = "ممتاز"; // Excellent
        } else if (achievementPercentage >= 85) {
          status = "جيد جدًا"; // Very good
        } else if (achievementPercentage >= 75) {
          status = "جيد"; // Good
        }
        
        // نضيف نتيجة الفرع فقط إذا كنا نعرض كل الفروع منفصلين أو إذا كنا نعرض فرع محدد
        if (specificBranchId !== 0) {
          results.push({
            branchId: branch.id,
            branchName: branch.name,
            target: target.targetAmount,
            achieved: totalSales,
            percentage: achievementPercentage,
            status
          });
        }
      }
    }
    
    return results;
  }
  
  // Consolidated Daily Sales
  async getConsolidatedDailySales(): Promise<ConsolidatedDailySales[]> {
    return Array.from(this.consolidatedDailySales.values());
  }
  
  async getConsolidatedDailySalesByBranch(branchId: number): Promise<ConsolidatedDailySales[]> {
    // إذا كان branchId يساوي 0، فهذا يعني جميع الفروع (بدون تصفية)
    const consolidatedSales = Array.from(this.consolidatedDailySales.values());
    
    // إذا تم تحديد فرع معين (غير الصفر)، نقوم بتصفية النتائج
    const filteredSales = branchId === 0 
      ? consolidatedSales 
      : consolidatedSales.filter(sale => sale.branchId === branchId);
      
    // ترتيب النتائج حسب التاريخ تنازليًا
    return filteredSales.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime(); // ترتيب تنازلي حسب التاريخ
      });
  }
  
  async getConsolidatedDailySalesByDate(date: string): Promise<ConsolidatedDailySales[]> {
    return Array.from(this.consolidatedDailySales.values())
      .filter(sale => sale.date === date)
      .sort((a, b) => a.branchId - b.branchId); // ترتيب تصاعدي حسب الفرع
  }
  
  async getConsolidatedDailySalesById(id: number): Promise<ConsolidatedDailySales | undefined> {
    return this.consolidatedDailySales.get(id);
  }
  
  async createConsolidatedDailySales(insertSales: InsertConsolidatedDailySales): Promise<ConsolidatedDailySales> {
    const id = this.consolidatedSalesCurrentId++;
    const consolidatedSales: ConsolidatedDailySales = { ...insertSales, id };
    this.consolidatedDailySales.set(id, consolidatedSales);
    
    // إنشاء نشاط لتتبع إنشاء يومية مجمعة
    await this.createActivity({
      userId: insertSales.createdBy || null,
      action: "create_consolidated_sales",
      details: { 
        branchId: insertSales.branchId, 
        date: insertSales.date,
        totalAmount: insertSales.totalSales
      },
      branchId: insertSales.branchId,
      timestamp: new Date()
    });
    
    return consolidatedSales;
  }
  
  async closeConsolidatedDailySales(id: number, userId: number): Promise<ConsolidatedDailySales | undefined> {
    const consolidatedSales = this.consolidatedDailySales.get(id);
    if (!consolidatedSales) return undefined;
    
    const updatedSales = { 
      ...consolidatedSales,
      status: "closed",
      closedBy: userId,
      closedAt: new Date()
    };
    
    this.consolidatedDailySales.set(id, updatedSales);
    
    // إنشاء نشاط لتتبع إغلاق اليومية المجمعة
    await this.createActivity({
      userId,
      action: "close_consolidated_sales",
      details: { 
        branchId: consolidatedSales.branchId, 
        date: consolidatedSales.date,
        totalAmount: consolidatedSales.totalSales
      },
      branchId: consolidatedSales.branchId,
      timestamp: new Date()
    });
    
    return updatedSales;
  }
  
  /**
   * ترحيل اليومية المجمعة إلى الحسابات
   * تقوم هذه الدالة بتحديث حالة اليومية المجمعة لتصبح "مرحلة" وتسجيل من قام بالترحيل
   * @param id معرف اليومية المجمعة
   * @param userId معرف المستخدم الذي يقوم بالترحيل
   * @returns اليومية المجمعة بعد الترحيل
   */
  async transferConsolidatedDailySales(id: number, userId: number): Promise<ConsolidatedDailySales | undefined> {
    const consolidatedSales = this.consolidatedDailySales.get(id);
    if (!consolidatedSales) {
      console.error(`Consolidated sales record with ID ${id} not found`);
      return undefined;
    }
    
    // التحقق من أن اليومية ليست مرحلة بالفعل
    if (consolidatedSales.status === "transferred") {
      console.log(`Consolidated sales record with ID ${id} is already transferred`);
      return consolidatedSales;
    }
    
    // التحقق من أن اليومية مغلقة (لا يمكن ترحيل يومية غير مغلقة)
    if (consolidatedSales.status !== "closed") {
      console.error(`Cannot transfer unconsolidated sales record with ID ${id}. Status must be 'closed'`);
      return undefined;
    }
    
    // تحديث حالة اليومية المجمعة
    const updatedSales = { 
      ...consolidatedSales,
      status: "transferred",
      transferredBy: userId,
      transferredAt: new Date()
    };
    
    this.consolidatedDailySales.set(id, updatedSales);
    
    // إنشاء نشاط لتتبع عملية الترحيل
    await this.createActivity({
      userId,
      action: "transfer_consolidated_sales",
      details: { 
        consolidatedId: id,
        date: consolidatedSales.date,
        branchId: consolidatedSales.branchId,
        totalAmount: consolidatedSales.totalSales
      },
      branchId: consolidatedSales.branchId,
      timestamp: new Date()
    });
    
    return updatedSales;
  }
  
  // Daily Sales Operations
  async checkExistingDailySales(cashierId: number, date: string): Promise<boolean> {
    const existingSales = Array.from(this.dailySales.values()).find(
      sale => sale.cashierId === cashierId && sale.date === date
    );
    
    return existingSales !== undefined;
  }
  
  async updateDailySalesStatus(id: number, status: string, consolidatedId?: number): Promise<DailySales | undefined> {
    const sales = this.dailySales.get(id);
    if (!sales) return undefined;
    
    const updatedSales = { 
      ...sales, 
      status,
      consolidatedId: consolidatedId || sales.consolidatedId
    };
    
    this.dailySales.set(id, updatedSales);
    
    // إنشاء نشاط لتتبع تحديث حالة اليومية
    await this.createActivity({
      userId: sales.cashierId,
      action: "update_daily_sales_status",
      details: { 
        branchId: sales.branchId, 
        date: sales.date,
        oldStatus: sales.status,
        newStatus: status
      },
      branchId: sales.branchId,
      timestamp: new Date()
    });
    
    return updatedSales;
  }
  
  async consolidateDailySales(branchId: number, date: string, userId: number): Promise<ConsolidatedDailySales | undefined> {
    console.log(`Attempting to consolidate sales for branch ${branchId} on date ${date}`);
    
    // 1. البحث عن جميع اليوميات للفرع المحدد والتاريخ المحدد
    const dailySales = Array.from(this.dailySales.values()).filter(
      sale => sale.branchId === branchId && sale.date === date && sale.status === "approved"
    );
    
    if (dailySales.length === 0) {
      console.log(`No approved daily sales found for branch ${branchId} on date ${date}`);
      return undefined;
    }
    
    console.log(`Found ${dailySales.length} approved daily sales for consolidation`);
    
    // 2. التحقق من عدم وجود يومية مجمعة سابقة لنفس الفرع والتاريخ
    const existingConsolidated = Array.from(this.consolidatedDailySales.values()).find(
      sale => sale.branchId === branchId && sale.date === date
    );
    
    if (existingConsolidated) {
      console.log(`Found existing consolidated record for branch ${branchId} on date ${date}, updating it`);
      // إذا كانت هناك يومية مجمعة سابقة، نقوم بتحديثها
      return this.updateConsolidatedSales(existingConsolidated, dailySales, userId);
    }
    
    // 3. حساب الإجماليات
    let totalCashSales = 0;
    let totalNetworkSales = 0;
    let totalSales = 0;
    let totalTransactions = 0;
    let totalDiscrepancy = 0;
    
    dailySales.forEach(sale => {
      totalCashSales += sale.totalCashSales || 0;
      totalNetworkSales += sale.totalNetworkSales || 0;
      totalSales += sale.totalSales || 0;
      totalTransactions += sale.totalTransactions || 0;
      if (sale.discrepancy) {
        totalDiscrepancy += sale.discrepancy;
      }
    });
    
    // 4. حساب متوسط قيمة الفاتورة
    const averageTicket = totalTransactions > 0 ? totalSales / totalTransactions : 0;
    
    console.log(`Creating new consolidated sales record with total: ${totalSales}`);
    
    // 5. إنشاء اليومية المجمعة
    const consolidatedSale = await this.createConsolidatedDailySales({
      branchId,
      date,
      totalCashSales,
      totalNetworkSales,
      totalSales,
      totalTransactions,
      averageTicket,
      totalDiscrepancy,
      status: "open",
      createdBy: userId,
      createdAt: new Date()
    });
    
    // 6. تحديث حالة اليوميات الفردية بأنها مرحلة إلى اليومية المجمعة
    for (const sale of dailySales) {
      await this.updateDailySalesStatus(sale.id, "transferred", consolidatedSale.id);
    }
    
    console.log(`Successfully consolidated ${dailySales.length} daily sales into consolidated record #${consolidatedSale.id}`);
    return consolidatedSale;
  }
  
  // طريقة مساعدة لتحديث يومية مجمعة موجودة
  private async updateConsolidatedSales(
    existingConsolidated: ConsolidatedDailySales, 
    dailySales: DailySales[], 
    userId: number
  ): Promise<ConsolidatedDailySales> {
    console.log(`Updating existing consolidated sales record #${existingConsolidated.id} with ${dailySales.length} daily sales records`);
    
    // حساب الإجماليات
    let totalCashSales = 0;
    let totalNetworkSales = 0;
    let totalSales = 0;
    let totalTransactions = 0;
    let totalDiscrepancy = 0;
    
    dailySales.forEach(sale => {
      totalCashSales += sale.totalCashSales || 0;
      totalNetworkSales += sale.totalNetworkSales || 0;
      totalSales += sale.totalSales || 0;
      totalTransactions += sale.totalTransactions || 0;
      if (sale.discrepancy) {
        totalDiscrepancy += sale.discrepancy;
      }
    });
    
    // حساب متوسط قيمة الفاتورة
    const averageTicket = totalTransactions > 0 ? totalSales / totalTransactions : 0;
    
    // تحديث اليومية المجمعة
    const updatedSales = { 
      ...existingConsolidated,
      totalCashSales,
      totalNetworkSales,
      totalSales,
      totalTransactions,
      averageTicket,
      totalDiscrepancy
    };
    
    this.consolidatedDailySales.set(existingConsolidated.id, updatedSales);
    console.log(`Updated consolidated sales record #${existingConsolidated.id} with total: ${totalSales}`);
    
    // تحديث حالة اليوميات الفردية لتشير إلى أنها مرحلة
    for (const sale of dailySales) {
      // إذا كانت اليومية غير مرحلة سابقًا، نقوم بترحيلها
      if (sale.status !== "transferred" || !sale.consolidatedId) {
        console.log(`Updating daily sales #${sale.id} to link to consolidated record #${existingConsolidated.id}`);
        await this.updateDailySalesStatus(sale.id, "transferred", existingConsolidated.id);
      }
    }
    
    return updatedSales;
  }
  
  // تم نقل هذه الوظيفة إلى تنفيذ قاعدة البيانات، انظر أدناه
  
  /**
   * الحصول على أداء الكاشير حسب الفرع والتاريخ
   * إذا كان branchId = 0، فسيتم عرض أداء جميع الكاشيرين من جميع الفروع
   * @param branchId معرف الفرع (0 لجميع الفروع)
   * @param date التاريخ
   */
  /**
   * الحصول على أداء الكاشير حسب الفرع والتاريخ
   * إذا كان branchId = 0، فسيتم عرض أداء جميع الكاشيرين من جميع الفروع
   * @param branchId معرف الفرع (0 لجميع الفروع)
   * @param date التاريخ
   */
  async getCashierPerformance(branchId: number, date: Date): Promise<any[]> {
    const formattedDate = format(date, "yyyy-MM-dd");
    console.log(`🔍 الحصول على أداء الكاشير للتاريخ ${formattedDate}, branchId=${branchId === 0 ? 'جميع الفروع' : branchId}`);
    
    // استدعاء تنفيذ الدالة الفعلي
    return this.getCashierPerformanceImpl(branchId, date);
  }
  
  /**
   * التنفيذ الفعلي لدالة الحصول على أداء الكاشير
   * هذه دالة داخلية تستخدم من قبل getCashierPerformance
   * @param branchId معرف الفرع (0 لجميع الفروع)
   * @param date التاريخ
   */
  private async getCashierPerformanceImpl(branchId: number, date: Date): Promise<any[]> {
    const formattedDate = format(date, "yyyy-MM-dd");
    // سنستخدم startOfDay و endOfDay من date-fns، لكننا لن نستدعيهم مباشرة هنا
    // نحن نستخدم formattedDate بدلاً من ذلك
    let cashiers = [];
    
    // 1. تحديد الكاشيرين المطلوب تحليل أدائهم
    if (branchId === 0) {
      // إذا كان branchId يساوي 0، نجلب جميع الكاشيرين من جميع الفروع
      cashiers = Array.from(this.users.values()).filter(user => user.role === "cashier");
      console.log(`📋 تم العثور على ${cashiers.length} كاشير من جميع الفروع`);
    } else {
      // فلترة الكاشيرين حسب الفرع المحدد
      cashiers = Array.from(this.users.values()).filter(user => user.role === "cashier" && user.branchId === branchId);
      console.log(`📋 تم العثور على ${cashiers.length} كاشير من الفرع #${branchId}`);
    }
    
    const results = [];
    
    // 2. الحصول على مبيعات اليوم المحدد لجميع الفروع مسبقاً لتحسين الأداء
    let allDailySales = [];
    
    if (branchId === 0) {
      // تجميع مبيعات جميع الفروع ليوم واحد
      const branches = await this.getBranches();
      for (const branch of branches) {
        const branchSales = await this.getDailySalesByBranchAndDate(branch.id, formattedDate);
        allDailySales = [...allDailySales, ...branchSales];
      }
    } else {
      // الحصول على مبيعات الفرع المحدد ليوم واحد
      allDailySales = await this.getDailySalesByBranchAndDate(branchId, formattedDate);
    }
    
    console.log(`📊 تم العثور على ${allDailySales.length} سجل مبيعات للتاريخ ${formattedDate}`);
    
    // 3. معالجة أداء كل كاشير
    for (const cashier of cashiers) {
      // فلترة المبيعات الخاصة بالكاشير
      const cashierSales = allDailySales.filter(sale => sale.cashierId === cashier.id);
      
      if (cashierSales.length > 0) {
        // تجميع المبيعات واستخراج الإحصائيات
        const totalSales = cashierSales.reduce((sum, sale) => sum + sale.totalSales, 0);
        const totalCashSales = cashierSales.reduce((sum, sale) => sum + (sale.totalCashSales || 0), 0);
        const totalNetworkSales = cashierSales.reduce((sum, sale) => sum + (sale.totalNetworkSales || 0), 0);
        const totalTransactions = cashierSales.reduce((sum, sale) => sum + (sale.totalTransactions || 0), 0);
        const totalDiscrepancy = cashierSales.reduce((sum, sale) => sum + (sale.discrepancy || 0), 0);
        
        // حساب متوسط التذكرة
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
        
        // إضافة معلومات الفرع للعرض التجميعي
        const branch = await this.getBranch(cashier.branchId || 0);
        
        results.push({
          cashierId: cashier.id,
          name: cashier.name,
          avatar: cashier.avatar,
          branchId: cashier.branchId,
          branchName: branch?.name || `فرع #${cashier.branchId}`,
          totalSales,
          totalCashSales,
          totalNetworkSales,
          discrepancy: totalDiscrepancy,
          totalTransactions,
          averageTicket,
          performance,
          salesCount: cashierSales.length
        });
      } else {
        // إذا لم يكن هناك مبيعات، نعيد بيانات أساسية
        const branch = await this.getBranch(cashier.branchId || 0);
        
        results.push({
          cashierId: cashier.id,
          name: cashier.name,
          avatar: cashier.avatar,
          branchId: cashier.branchId,
          branchName: branch?.name || `فرع #${cashier.branchId}`,
          totalSales: 0,
          totalCashSales: 0,
          totalNetworkSales: 0,
          discrepancy: 0,
          totalTransactions: 0,
          averageTicket: 0,
          performance: 100,  // نفترض أداء 100% في حالة عدم وجود مبيعات
          salesCount: 0
        });
      }
    }
    
    // ترتيب النتائج حسب المبيعات (تنازليًا)
    results.sort((a, b) => b.totalSales - a.totalSales);
    
    console.log(`✅ تم تجهيز تقرير أداء ${results.length} كاشير`);
    return results;
  }
  
  /**
   * الحصول على تحليلات المبيعات حسب الفرع والفترة الزمنية
   * إذا كان branchId = 0، فسيتم عرض البيانات لجميع الفروع
   * @param branchId معرف الفرع (0 لجميع الفروع)
   * @param period الفترة الزمنية (weekly, monthly, yearly)
   */
  async getSalesAnalytics(branchId: number, period: string): Promise<any> {
    const today = new Date();
    let startDate: Date;
    let endDate = today;
    let pattern = 'dd/MM';
    
    switch (period) {
      case 'weekly':
        startDate = startOfWeek(today, { weekStartsOn: 6 }); // يبدأ الأسبوع من يوم السبت
        endDate = endOfWeek(today, { weekStartsOn: 6 });
        pattern = 'EEE'; // اسم اليوم (السبت، الأحد، إلخ)
        break;
      case 'monthly':
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
        pattern = 'dd/MM';
        break;
      case 'yearly':
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
        pattern = 'MMM'; // اسم الشهر (يناير، فبراير، إلخ)
        break;
      default:
        startDate = subDays(today, 7);
        pattern = 'dd/MM';
    }
    
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    
    // إنشاء جميع التواريخ في النطاق
    const salesByDate = new Map();
    let currentDate = new Date(startDate);
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
    
    // إذا كان branchId = 0، نحصل على بيانات جميع الفروع
    if (branchId === 0) {
      // الحصول على قائمة جميع الفروع
      const branches = await this.getBranches();
      
      // معالجة كل فرع
      for (const branch of branches) {
        // الحصول على بيانات المبيعات للفرع
        const branchSalesData = await this.getDailySalesByBranchAndDateRange(branch.id, startDateStr, endDateStr);
        
        // ملء بيانات المبيعات
        for (const sale of branchSalesData) {
          const dateKey = format(new Date(sale.date), 'yyyy-MM-dd');
          
          if (salesByDate.has(dateKey)) {
            const currentData = salesByDate.get(dateKey);
            
            currentData.cashSales += sale.totalCashSales;
            
            if (typeof sale.totalNetworkSales !== 'undefined') {
              currentData.networkSales += sale.totalNetworkSales;
            }
            
            currentData.totalSales += sale.totalSales;
          }
        }
        
        // إضافة بيانات الهدف
        const month = today.getMonth() + 1;
        const year = today.getFullYear();
        const monthlyTarget = await this.getMonthlyTargetByBranchAndDate(branch.id, month, year);
        
        if (monthlyTarget) {
          const daysInMonth = new Date(year, month, 0).getDate();
          const dailyTarget = monthlyTarget.targetAmount / daysInMonth;
          
          for (const [dateKey, data] of salesByDate.entries()) {
            // نضيف أهداف كل فرع للحصول على الهدف الإجمالي
            data.target += dailyTarget;
          }
        }
      }
    } else {
      // الحصول على بيانات المبيعات للفرع المحدد
      const salesData = await this.getDailySalesByBranchAndDateRange(branchId, startDateStr, endDateStr);
      
      // ملء بيانات المبيعات
      for (const sale of salesData) {
        const dateKey = format(new Date(sale.date), 'yyyy-MM-dd');
        
        if (salesByDate.has(dateKey)) {
          const currentData = salesByDate.get(dateKey);
          
          currentData.cashSales += sale.totalCashSales;
          
          if (typeof sale.totalNetworkSales !== 'undefined') {
            currentData.networkSales += sale.totalNetworkSales;
          }
          
          currentData.totalSales += sale.totalSales;
        }
      }
      
      // إضافة بيانات الهدف
      const month = today.getMonth() + 1;
      const year = today.getFullYear();
      const monthlyTarget = await this.getMonthlyTargetByBranchAndDate(branchId, month, year);
      
      if (monthlyTarget) {
        const daysInMonth = new Date(year, month, 0).getDate();
        const dailyTarget = monthlyTarget.targetAmount / daysInMonth;
        
        for (const [dateKey, data] of salesByDate.entries()) {
          data.target = dailyTarget;
        }
      }
    }
    
    return Array.from(salesByDate.values());
  }
  
  // ==== وظائف نظام المكافآت والحوافز ====
  
  // نظام النقاط والمكافآت
  async getUserRewardPoints(userId: number): Promise<RewardPoints | undefined> {
    return Array.from(this.rewardPoints.values()).find(points => points.userId === userId);
  }
  
  async updateUserRewardPoints(userId: number, points: number): Promise<RewardPoints | undefined> {
    // البحث عن نقاط المستخدم
    let userPoints = await this.getUserRewardPoints(userId);
    
    // إذا لم تكن موجودة، نقوم بإنشائها
    if (!userPoints) {
      const id = this.rewardPointsCurrentId++;
      userPoints = {
        id,
        userId,
        points: 0,
        availablePoints: 0,
        totalEarnedPoints: 0,
        lastUpdated: new Date()
      };
      this.rewardPoints.set(id, userPoints);
    }
    
    // تحديث النقاط
    const updatedPoints = {
      ...userPoints,
      points: userPoints.points + points,
      availablePoints: userPoints.availablePoints + (points > 0 ? points : 0), // نضيف فقط للنقاط المتاحة إذا كانت إضافة وليست خصم
      totalEarnedPoints: userPoints.totalEarnedPoints + (points > 0 ? points : 0), // نضيف فقط للنقاط المكتسبة الإجمالية إذا كانت إضافة
      lastUpdated: new Date()
    };
    
    this.rewardPoints.set(updatedPoints.id, updatedPoints);
    return updatedPoints;
  }
  
  async addRewardPointsHistory(history: InsertRewardPointsHistory): Promise<RewardPointsHistory> {
    const id = this.rewardPointsHistoryCurrentId++;
    const newHistory: RewardPointsHistory = { ...history, id };
    this.rewardPointsHistory.set(id, newHistory);
    
    // تحديث رصيد نقاط المستخدم
    await this.updateUserRewardPoints(history.userId, history.points);
    
    return newHistory;
  }
  
  async getRewardPointsHistory(userId: number, limit?: number): Promise<RewardPointsHistory[]> {
    let history = Array.from(this.rewardPointsHistory.values())
      .filter(h => h.userId === userId)
      .sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateB.getTime() - dateA.getTime();
      });
    
    if (limit) {
      history = history.slice(0, limit);
    }
    
    return history;
  }
  
  async getRewardPointsHistoryByType(userId: number, type: string): Promise<RewardPointsHistory[]> {
    return Array.from(this.rewardPointsHistory.values())
      .filter(h => h.userId === userId && h.type === type)
      .sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateB.getTime() - dateA.getTime();
      });
  }
  
  // الإنجازات
  async getAllAchievements(): Promise<Achievement[]> {
    return Array.from(this.achievements.values())
      .filter(a => a.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  
  async getAchievement(id: number): Promise<Achievement | undefined> {
    return this.achievements.get(id);
  }
  
  async getAchievementsByCategory(category: string): Promise<Achievement[]> {
    return Array.from(this.achievements.values())
      .filter(a => a.category === category && a.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  
  async createAchievement(achievement: InsertAchievement): Promise<Achievement> {
    const id = this.achievementsCurrentId++;
    const newAchievement: Achievement = { ...achievement, id };
    this.achievements.set(id, newAchievement);
    return newAchievement;
  }
  
  async updateAchievement(id: number, achievement: Partial<Achievement>): Promise<Achievement | undefined> {
    const existingAchievement = this.achievements.get(id);
    if (!existingAchievement) return undefined;
    
    const updatedAchievement = { ...existingAchievement, ...achievement };
    this.achievements.set(id, updatedAchievement);
    return updatedAchievement;
  }
  
  // إنجازات المستخدمين
  async getUserAchievements(userId: number): Promise<UserAchievement[]> {
    return Array.from(this.userAchievements.values())
      .filter(ua => ua.userId === userId)
      .sort((a, b) => {
        if (a.isCompleted === b.isCompleted) {
          // إذا كان كلاهما مكتمل أو غير مكتمل، نرتب حسب التاريخ
          const dateA = a.completedAt ? new Date(a.completedAt) : new Date(a.awardedAt);
          const dateB = b.completedAt ? new Date(b.completedAt) : new Date(b.awardedAt);
          return dateB.getTime() - dateA.getTime();
        }
        // وضع المكتملة أولاً
        return a.isCompleted ? -1 : 1;
      });
  }
  
  async assignAchievementToUser(userAchievement: InsertUserAchievement): Promise<UserAchievement> {
    const id = this.userAchievementsCurrentId++;
    const newUserAchievement: UserAchievement = { 
      ...userAchievement, 
      id,
      awardedAt: new Date(),
      isCompleted: false
    };
    this.userAchievements.set(id, newUserAchievement);
    
    // إنشاء إشعار للمستخدم
    const achievement = await this.getAchievement(userAchievement.achievementId);
    if (achievement) {
      await this.createNotification({
        userId: userAchievement.userId,
        title: "إنجاز جديد متاح!",
        message: `تم إضافة إنجاز جديد: ${achievement.name}. اكتشف كيفية تحقيقه!`,
        type: "info",
        timestamp: new Date(),
        link: "/achievements"
      });
    }
    
    return newUserAchievement;
  }
  
  async updateUserAchievementProgress(userId: number, achievementId: number, progress: number): Promise<UserAchievement | undefined> {
    // البحث عن إنجاز المستخدم
    const userAchievement = Array.from(this.userAchievements.values())
      .find(ua => ua.userId === userId && ua.achievementId === achievementId);
    
    if (!userAchievement) return undefined;
    
    // تحديث التقدم
    const newProgress = Math.min(Math.max(progress, 0), 100); // ضمان أن التقدم بين 0 و 100
    const updatedUserAchievement = { ...userAchievement, progress: newProgress };
    
    // إذا وصل التقدم إلى 100%، نعتبره مكتملاً
    if (newProgress >= 100 && !userAchievement.isCompleted) {
      updatedUserAchievement.isCompleted = true;
      updatedUserAchievement.completedAt = new Date();
      
      // الحصول على تفاصيل الإنجاز لإضافة النقاط
      const achievement = await this.getAchievement(achievementId);
      if (achievement) {
        // إضافة النقاط المكافأة إلى حساب المستخدم
        await this.addRewardPointsHistory({
          userId,
          points: achievement.pointsValue,
          type: "earned",
          reason: `تم تحقيق إنجاز: ${achievement.name}`,
          relatedEntityType: "achievement",
          relatedEntityId: achievementId,
          date: new Date(),
          timestamp: new Date(),
          status: "active",
          branchId: null
        });
        
        // إنشاء إشعار بتحقيق الإنجاز
        await this.createNotification({
          userId,
          title: "🎉 تهانينا! تم تحقيق إنجاز",
          message: `لقد حققت إنجاز "${achievement.name}" وكسبت ${achievement.pointsValue} نقطة!`,
          type: "success",
          timestamp: new Date(),
          link: "/achievements"
        });
      }
    }
    
    this.userAchievements.set(userAchievement.id, updatedUserAchievement);
    return updatedUserAchievement;
  }
  
  async completeUserAchievement(userId: number, achievementId: number): Promise<UserAchievement | undefined> {
    return this.updateUserAchievementProgress(userId, achievementId, 100);
  }
  
  // المكافآت
  async getAllRewards(): Promise<Reward[]> {
    return Array.from(this.rewards.values())
      .filter(r => r.isActive)
      .sort((a, b) => a.pointsCost - b.pointsCost); // ترتيب تصاعدي حسب التكلفة
  }
  
  async getReward(id: number): Promise<Reward | undefined> {
    return this.rewards.get(id);
  }
  
  async getRewardsByCategory(category: string): Promise<Reward[]> {
    return Array.from(this.rewards.values())
      .filter(r => r.category === category && r.isActive)
      .sort((a, b) => a.pointsCost - b.pointsCost);
  }
  
  async createReward(reward: InsertReward): Promise<Reward> {
    const id = this.rewardsCurrentId++;
    const newReward: Reward = { ...reward, id };
    this.rewards.set(id, newReward);
    
    // إنشاء إشعار للجميع بالمكافأة الجديدة
    await this.createNotification({
      userId: null, // للجميع
      title: "مكافأة جديدة متاحة!",
      message: `تم إضافة مكافأة جديدة: ${reward.name}. تكلفة: ${reward.pointsCost} نقطة.`,
      type: "info",
      timestamp: new Date(),
      link: "/rewards"
    });
    
    return newReward;
  }
  
  async updateReward(id: number, reward: Partial<Reward>): Promise<Reward | undefined> {
    const existingReward = this.rewards.get(id);
    if (!existingReward) return undefined;
    
    const updatedReward = { ...existingReward, ...reward };
    this.rewards.set(id, updatedReward);
    return updatedReward;
  }
  
  // استبدال المكافآت
  async getUserRedemptions(userId: number): Promise<RewardRedemption[]> {
    return Array.from(this.rewardRedemptions.values())
      .filter(r => r.userId === userId)
      .sort((a, b) => {
        const dateA = new Date(a.redeemedAt);
        const dateB = new Date(b.redeemedAt);
        return dateB.getTime() - dateA.getTime();
      });
  }
  
  async createRedemption(redemption: InsertRewardRedemption): Promise<RewardRedemption> {
    // التحقق من أن المستخدم لديه نقاط كافية
    const userPoints = await this.getUserRewardPoints(redemption.userId);
    const reward = await this.getReward(redemption.rewardId);
    
    if (!userPoints || !reward) {
      throw new Error("المستخدم أو المكافأة غير موجودة");
    }
    
    if (userPoints.availablePoints < redemption.pointsUsed) {
      throw new Error("النقاط غير كافية لاستبدال هذه المكافأة");
    }
    
    // إنشاء طلب الاستبدال
    const id = this.rewardRedemptionsCurrentId++;
    const newRedemption: RewardRedemption = { 
      ...redemption, 
      id, 
      redeemedAt: new Date(),
      status: "pending"
    };
    this.rewardRedemptions.set(id, newRedemption);
    
    // إنشاء إشعار للمسؤولين بطلب الاستبدال الجديد
    await this.createNotification({
      userId: null, // للمسؤولين
      title: "طلب استبدال مكافأة جديد",
      message: `قام مستخدم برقم ${redemption.userId} بطلب استبدال مكافأة "${reward.name}".`,
      type: "info",
      timestamp: new Date(),
      link: "/redemptions"
    });
    
    return newRedemption;
  }
  
  async approveRedemption(id: number, approverId: number): Promise<RewardRedemption | undefined> {
    const redemption = this.rewardRedemptions.get(id);
    if (!redemption || redemption.status !== "pending") return undefined;
    
    // تحديث حالة الاستبدال
    const updatedRedemption = { 
      ...redemption, 
      status: "approved", 
      approvedBy: approverId,
      approvedAt: new Date() 
    };
    this.rewardRedemptions.set(id, updatedRedemption);
    
    // خصم النقاط من رصيد المستخدم
    await this.addRewardPointsHistory({
      userId: redemption.userId,
      points: -redemption.pointsUsed, // قيمة سالبة للخصم
      type: "redeemed",
      reason: `استبدال مكافأة بمعرف ${redemption.rewardId}`,
      relatedEntityType: "redemption",
      relatedEntityId: redemption.id,
      date: new Date(),
      timestamp: new Date(),
      status: "active",
      branchId: null
    });
    
    // الحصول على اسم المكافأة لإضافتها في الإشعار
    const reward = await this.getReward(redemption.rewardId);
    
    // إنشاء إشعار للمستخدم بالموافقة على طلب الاستبدال
    await this.createNotification({
      userId: redemption.userId,
      title: "تمت الموافقة على طلب الاستبدال",
      message: reward 
        ? `تمت الموافقة على طلب استبدال مكافأة "${reward.name}".` 
        : "تمت الموافقة على طلب استبدال المكافأة.",
      type: "success",
      timestamp: new Date(),
      link: "/rewards"
    });
    
    return updatedRedemption;
  }
  
  async rejectRedemption(id: number, notes?: string): Promise<RewardRedemption | undefined> {
    const redemption = this.rewardRedemptions.get(id);
    if (!redemption || redemption.status !== "pending") return undefined;
    
    // تحديث حالة الاستبدال
    const updatedRedemption = { 
      ...redemption, 
      status: "rejected",
      notes: notes || redemption.notes
    };
    this.rewardRedemptions.set(id, updatedRedemption);
    
    // الحصول على اسم المكافأة لإضافتها في الإشعار
    const reward = await this.getReward(redemption.rewardId);
    
    // إنشاء إشعار للمستخدم برفض طلب الاستبدال
    await this.createNotification({
      userId: redemption.userId,
      title: "تم رفض طلب الاستبدال",
      message: reward
        ? `تم رفض طلب استبدال مكافأة "${reward.name}". ${notes ? `السبب: ${notes}` : ''}`
        : `تم رفض طلب استبدال المكافأة. ${notes ? `السبب: ${notes}` : ''}`,
      type: "error",
      timestamp: new Date(),
      link: "/rewards"
    });
    
    return updatedRedemption;
  }
  
  async getRedemptionsByStatus(status: string): Promise<RewardRedemption[]> {
    return Array.from(this.rewardRedemptions.values())
      .filter(r => r.status === status)
      .sort((a, b) => {
        const dateA = new Date(a.redeemedAt);
        const dateB = new Date(b.redeemedAt);
        return dateA.getTime() - dateB.getTime(); // ترتيب تصاعدي بحيث أقدم الطلبات أولاً
      });
  }
  
  // لوحة المتصدرين
  async getActiveLeaderboards(): Promise<Leaderboard[]> {
    return Array.from(this.leaderboards.values())
      .filter(l => l.isActive)
      .sort((a, b) => {
        const dateA = new Date(a.endDate);
        const dateB = new Date(b.endDate);
        return dateA.getTime() - dateB.getTime(); // ترتيب تصاعدي بحيث أقرب موعد انتهاء أولاً
      });
  }
  
  async getLeaderboard(id: number): Promise<Leaderboard | undefined> {
    return this.leaderboards.get(id);
  }
  
  async createLeaderboard(leaderboard: InsertLeaderboard): Promise<Leaderboard> {
    const id = this.leaderboardsCurrentId++;
    const newLeaderboard: Leaderboard = { ...leaderboard, id, createdAt: new Date() };
    this.leaderboards.set(id, newLeaderboard);
    
    // إنشاء إشعار للجميع باللوحة الجديدة
    await this.createNotification({
      userId: null, // للجميع
      title: "لوحة متصدرين جديدة متاحة!",
      message: `تم إنشاء لوحة متصدرين جديدة: "${leaderboard.name}". تبدأ من ${new Date(leaderboard.startDate).toLocaleDateString('ar-SA')}.`,
      type: "info",
      timestamp: new Date(),
      link: "/leaderboards"
    });
    
    return newLeaderboard;
  }
  
  async updateLeaderboardResults(leaderboardId: number, results: InsertLeaderboardResult[]): Promise<LeaderboardResult[]> {
    const updatedResults: LeaderboardResult[] = [];
    
    for (const result of results) {
      const id = this.leaderboardResultsCurrentId++;
      // تحويل score و metricValue لتخزينها كنص متوافق مع نوع البيانات في قاعدة البيانات
      const formattedResult = {
        ...result,
        score: result.score.toString(),
        metricValue: result.metricValue.toString()
      };
      const newResult: LeaderboardResult = { 
        ...formattedResult, 
        id, 
        leaderboardId,
        updateDate: new Date() 
      };
      this.leaderboardResults.set(id, newResult);
      updatedResults.push(newResult);
      
      // إذا كان المركز في المراكز الثلاثة الأولى، نرسل إشعاراً للمستخدم
      if (result.rank <= 3) {
        // الحصول على معلومات اللوحة
        const leaderboard = await this.getLeaderboard(leaderboardId);
        if (leaderboard) {
          let rankText = "";
          if (result.rank === 1) rankText = "الأول 🥇";
          else if (result.rank === 2) rankText = "الثاني 🥈";
          else if (result.rank === 3) rankText = "الثالث 🥉";
          
          await this.createNotification({
            userId: result.userId,
            title: "تهانينا! أنت من المتصدرين",
            message: `لقد حصلت على المركز ${rankText} في لوحة المتصدرين "${leaderboard.name}".`,
            type: "success",
            timestamp: new Date(),
            link: "/leaderboards"
          });
        }
      }
    }
    
    return updatedResults;
  }
  
  async getLeaderboardResults(leaderboardId: number): Promise<LeaderboardResult[]> {
    return Array.from(this.leaderboardResults.values())
      .filter(r => r.leaderboardId === leaderboardId)
      .sort((a, b) => a.rank - b.rank); // ترتيب تصاعدي حسب المركز
  }
  
  async getUserLeaderboardRank(leaderboardId: number, userId: number): Promise<LeaderboardResult | undefined> {
    return Array.from(this.leaderboardResults.values())
      .find(r => r.leaderboardId === leaderboardId && r.userId === userId);
  }
  
  // وظائف تحليل انخفاض المبيعات
  async analyzeSalesDrops(branchId: number, period: string): Promise<any> {
    const today = new Date();
    let startDate = new Date();
    let endDate = new Date();
    
    // تحديد الفترة الزمنية للتحليل
    if (period === 'week') {
      // الأسبوع الماضي
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
    } else if (period === 'month') {
      // الشهر الماضي
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    } else if (period === 'quarter') {
      // الربع الماضي
      startDate = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
    } else {
      // افتراضياً: آخر أسبوع
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
    }
    
    // الحصول على المبيعات خلال الفترة المحددة
    const formattedStartDate = format(startDate, 'yyyy-MM-dd');
    const formattedEndDate = format(endDate, 'yyyy-MM-dd');
    
    const sales = await this.getDailySalesByBranchAndDateRange(
      branchId, 
      formattedStartDate, 
      formattedEndDate
    );
    
    // تنظيم المبيعات حسب اليوم
    const salesByDay: { [key: string]: { total: number, count: number, average: number, date: string } } = {};
    
    for (const sale of sales) {
      const dateStr = sale.date;
      if (!salesByDay[dateStr]) {
        salesByDay[dateStr] = { total: 0, count: 0, average: 0, date: dateStr };
      }
      
      salesByDay[dateStr].total += sale.totalSales;
      salesByDay[dateStr].count += 1;
    }
    
    // حساب المتوسط اليومي
    for (const day in salesByDay) {
      salesByDay[day].average = salesByDay[day].total / salesByDay[day].count;
    }
    
    // حساب متوسط المبيعات للفترة كاملة
    const dailyTotals = Object.values(salesByDay).map(day => day.total);
    const overallAverage = dailyTotals.reduce((sum, total) => sum + total, 0) / dailyTotals.length || 0;
    
    // تحديد أيام انخفاض المبيعات (أقل من 70% من المتوسط)
    const dropThreshold = overallAverage * 0.7;
    const salesDrops = Object.values(salesByDay)
      .filter(day => day.total < dropThreshold)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return {
      period,
      overallAverage,
      dropThreshold,
      salesDrops,
      salesByDay: Object.values(salesByDay),
      analysis: {
        totalDays: Object.keys(salesByDay).length,
        dropDays: salesDrops.length,
        dropPercentage: (salesDrops.length / Object.keys(salesByDay).length) * 100,
        worstDay: salesDrops.length > 0 ? 
          salesDrops.reduce((worst, current) => current.total < worst.total ? current : worst, salesDrops[0]) : 
          null,
        recommendations: this.generateDropRecommendations(salesDrops, overallAverage)
      }
    };
  }
  
  // توليد توصيات لانخفاض المبيعات
  private generateDropRecommendations(salesDrops: any[], average: number): any[] {
    if (salesDrops.length === 0) return [];
    
    const recommendations = [];
    
    // فحص الاتجاه: هل الانخفاضات متتالية؟
    const consecutiveDrops = this.checkForConsecutiveDrops(salesDrops);
    if (consecutiveDrops.isConsecutive) {
      recommendations.push({
        type: 'warning',
        title: 'انخفاض مستمر في المبيعات',
        message: `لوحظ انخفاض مستمر في المبيعات لمدة ${consecutiveDrops.days} أيام متتالية.`,
        actions: [
          'مراجعة استراتيجية التسعير',
          'تخطيط حملة ترويجية عاجلة',
          'تحليل سلوك المنافسين'
        ]
      });
    }
    
    // فحص الموسمية: هل أيام محددة من الأسبوع متكررة في الانخفاضات؟
    const weekdayPattern = this.checkForWeekdayPattern(salesDrops);
    if (weekdayPattern.hasPattern) {
      recommendations.push({
        type: 'insight',
        title: 'نمط أسبوعي في انخفاض المبيعات',
        message: `يوجد انخفاض منتظم في المبيعات في أيام ${weekdayPattern.days.join(', ')}.`,
        actions: [
          'تخطيط عروض خاصة في هذه الأيام',
          'مراجعة جدول الموظفين في هذه الأيام',
          'دراسة أنماط حركة العملاء'
        ]
      });
    }
    
    // فحص شدة الانخفاض: هل هناك أيام بانخفاض شديد؟
    const severeDrops = salesDrops.filter(day => day.total < (average * 0.5));
    if (severeDrops.length > 0) {
      recommendations.push({
        type: 'critical',
        title: 'انخفاض حاد في المبيعات',
        message: `هناك ${severeDrops.length} أيام بانخفاض شديد في المبيعات (أقل من 50% من المتوسط).`,
        actions: [
          'مراجعة العوامل الخارجية (الطقس، الأحداث المحلية)',
          'التحقق من جودة المنتجات والخدمة',
          'إطلاق خصومات مستهدفة'
        ]
      });
    }
    
    // إضافة توصيات عامة
    recommendations.push({
      type: 'general',
      title: 'تحسين الأداء العام',
      message: 'توصيات لتحسين الأداء العام للمبيعات.',
      actions: [
        'مراجعة تجربة العملاء الشاملة',
        'تدريب فريق المبيعات على تقنيات البيع الفعالة',
        'تحليل ملاحظات العملاء واستجابة السوق'
      ]
    });
    
    return recommendations;
  }
  
  // فحص وجود انخفاضات متتالية
  private checkForConsecutiveDrops(salesDrops: any[]): { isConsecutive: boolean, days: number } {
    if (salesDrops.length < 2) return { isConsecutive: false, days: 0 };
    
    // ترتيب الأيام حسب التاريخ
    const sortedDrops = [...salesDrops].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let maxConsecutive = 1;
    let currentConsecutive = 1;
    
    for (let i = 1; i < sortedDrops.length; i++) {
      const prevDate = new Date(sortedDrops[i-1].date);
      const currDate = new Date(sortedDrops[i].date);
      
      // التحقق إذا كان اليوم التالي مباشرة
      const diffTime = Math.abs(currDate.getTime() - prevDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 1;
      }
    }
    
    return { isConsecutive: maxConsecutive >= 3, days: maxConsecutive };
  }
  
  // فحص وجود نمط في أيام الأسبوع
  private checkForWeekdayPattern(salesDrops: any[]): { hasPattern: boolean, days: string[] } {
    if (salesDrops.length < 3) return { hasPattern: false, days: [] };
    
    // عد تكرار كل يوم من أيام الأسبوع
    const weekdayCounts: Record<string, number> = {
      'الأحد': 0, 'الاثنين': 0, 'الثلاثاء': 0, 'الأربعاء': 0, 'الخميس': 0, 'الجمعة': 0, 'السبت': 0
    };
    
    const arabicDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    
    for (const drop of salesDrops) {
      const date = new Date(drop.date);
      const dayOfWeek = date.getDay();
      weekdayCounts[arabicDays[dayOfWeek]]++;
    }
    
    // تحديد الأيام التي تحتوي على نمط (تكرار لأكثر من مرة)
    const patternDays = Object.entries(weekdayCounts)
      .filter(([_, count]) => count >= 2)
      .map(([day, _]) => day);
    
    return { hasPattern: patternDays.length > 0, days: patternDays };
  }
  
  async generateSalesAlerts(branchId: number, threshold: number): Promise<any[]> {
    // الحصول على بيانات المبيعات للأسبوع الماضي
    const today = new Date();
    const oneWeekAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
    
    const formattedStartDate = format(oneWeekAgo, 'yyyy-MM-dd');
    const formattedEndDate = format(today, 'yyyy-MM-dd');
    
    const sales = await this.getDailySalesByBranchAndDateRange(
      branchId,
      formattedStartDate,
      formattedEndDate
    );
    
    if (sales.length === 0) return [];
    
    // الحصول على أحدث هدف شهري
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const monthlyTarget = await this.getMonthlyTargetByBranchAndDate(branchId, currentMonth, currentYear);
    
    if (!monthlyTarget) return [];
    
    // حساب متوسط المبيعات اليومية
    const totalSales = sales.reduce((sum, sale) => sum + sale.totalSales, 0);
    const avgDailySales = totalSales / sales.length;
    
    // حساب الهدف اليومي (تقسيم الهدف الشهري على عدد أيام الشهر)
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const dailyTarget = monthlyTarget.targetAmount / daysInMonth;
    
    // التحقق إذا كان متوسط المبيعات أقل من الحد الأدنى للهدف
    const alerts = [];
    
    if (avgDailySales < (dailyTarget * (threshold / 100))) {
      // إنشاء تنبيه بانخفاض المبيعات
      const percentageOfTarget = (avgDailySales / dailyTarget) * 100;
      
      const branch = await this.getBranch(branchId);
      const branchName = branch ? branch.name : `فرع #${branchId}`;
      
      alerts.push({
        id: `sales-drop-${Date.now()}`,
        branchId,
        branchName,
        date: format(today, 'yyyy-MM-dd'),
        severity: percentageOfTarget < 50 ? 'critical' : percentageOfTarget < 70 ? 'high' : 'medium',
        type: 'sales_drop',
        metric: {
          current: avgDailySales,
          expected: dailyTarget,
          difference: dailyTarget - avgDailySales,
          percentageChange: ((dailyTarget - avgDailySales) / dailyTarget) * 100
        },
        recommendations: [
          {
            id: "rec1",
            text: "إجراء تخفيضات مؤقتة على المنتجات الأكثر مبيعاً",
            priority: "high",
            impact: 80
          },
          {
            id: "rec2",
            text: "تنشيط حملة تسويق على وسائل التواصل الاجتماعي",
            priority: "medium",
            impact: 65
          },
          {
            id: "rec3",
            text: "مراجعة جدول توزيع الموظفين لضمان تغطية أوقات الذروة",
            priority: "medium",
            impact: 60
          }
        ],
        details: `متوسط المبيعات اليومي (${avgDailySales.toFixed(2)}) أقل من ${threshold}% من الهدف اليومي (${dailyTarget.toFixed(2)})`
      });
      
      // إنشاء إشعار بالانخفاض
      await this.createNotification({
        userId: null, // للمسؤولين
        title: "⚠️ تنبيه: انخفاض المبيعات",
        message: `انخفاض المبيعات في ${branchName} إلى ${percentageOfTarget.toFixed(1)}% من الهدف اليومي.`,
        type: "warning",
        timestamp: new Date(),
        link: "/smart-alerts"
      });
    }
    
    return alerts;
  }
  
  async analyzeCashierPerformanceTrends(branchId: number, period: string): Promise<any[]> {
    // الحصول على الكاشيرين في الفرع
    const users = await this.getUsers();
    const cashiers = users.filter(user => user.role === 'cashier' && user.branchId === branchId);
    
    if (cashiers.length === 0) return [];
    
    // تحديد نطاق التاريخ للتحليل
    const today = new Date();
    let startDate = new Date();
    
    if (period === 'week') {
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
    } else if (period === 'month') {
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    } else if (period === 'quarter') {
      startDate = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
    } else {
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
    }
    
    const formattedStartDate = format(startDate, 'yyyy-MM-dd');
    const formattedEndDate = format(today, 'yyyy-MM-dd');
    
    // تحليل أداء كل كاشير
    const cashiersAnalysis = [];
    
    for (const cashier of cashiers) {
      // الحصول على مبيعات الكاشير خلال الفترة
      const sales = await this.getDailySalesByBranchAndDateRange(
        branchId,
        formattedStartDate,
        formattedEndDate
      ).then(allSales => allSales.filter(sale => sale.cashierId === cashier.id));
      
      if (sales.length === 0) continue;
      
      // حساب متوسط المبيعات ونسبة الانحراف والمتوسط
      const totalSales = sales.reduce((sum, sale) => sum + sale.totalSales, 0);
      const avgSales = totalSales / sales.length;
      
      const totalTransactions = sales.reduce((sum, sale) => sum + sale.totalTransactions, 0);
      const avgTransactions = totalTransactions / sales.length;
      
      const avgTicket = totalSales / totalTransactions;
      
      // حساب متوسط الانحراف في المبالغ النقدية (القيمة المطلقة)
      const totalDiscrepancy = sales.reduce((sum, sale) => {
        return sum + (sale.discrepancy ? Math.abs(sale.discrepancy) : 0);
      }, 0);
      const avgDiscrepancy = sales.length > 0 ? totalDiscrepancy / sales.length : 0;
      
      // تحليل الاتجاه: هل أداء الكاشير يتحسن أو يتراجع؟
      const trend = this.analyzeCashierTrend(sales);
      
      // تحليل نقاط القوة والضعف
      const strengths = [];
      const weaknesses = [];
      
      if (avgTicket > 30) strengths.push('قيمة متوسط التذكرة مرتفعة');
      if (avgDiscrepancy < 5) strengths.push('انحراف نقدي منخفض');
      if (trend.salesTrend === 'up') strengths.push('اتجاه المبيعات في تحسن');
      
      if (avgTicket < 20) weaknesses.push('قيمة متوسط التذكرة منخفضة');
      if (avgDiscrepancy > 20) weaknesses.push('انحراف نقدي مرتفع');
      if (trend.salesTrend === 'down') weaknesses.push('اتجاه المبيعات في تراجع');
      
      // تقديم توصيات تدريبية
      const trainingRecommendations = [];
      
      if (avgTicket < 20) {
        trainingRecommendations.push('تدريب على تقنيات البيع المتقاطع لزيادة قيمة الطلب');
      }
      
      if (avgDiscrepancy > 20) {
        trainingRecommendations.push('تدريب على التعامل مع النقد والتدقيق في العمليات');
      }
      
      if (trend.salesTrend === 'down') {
        trainingRecommendations.push('تدريب على مهارات خدمة العملاء والبيع المتقدمة');
      }
      
      // حساب نقاط المكافأة المقترحة
      const suggestedRewardPoints = this.calculateSuggestedRewardPoints(
        avgSales, avgDiscrepancy, trend.consistency
      );
      
      cashiersAnalysis.push({
        cashierId: cashier.id,
        cashierName: cashier.name,
        period,
        metrics: {
          totalSales,
          totalTransactions,
          averageDailySales: avgSales,
          averageTicket: avgTicket,
          averageDiscrepancy: avgDiscrepancy,
          daysLogged: sales.length
        },
        trends: trend,
        performance: {
          strengths,
          weaknesses,
          trainingRecommendations,
          suggestedRewardPoints
        }
      });
    }
    
    return cashiersAnalysis;
  }
  
  // تحليل اتجاه أداء الكاشير
  private analyzeCashierTrend(sales: DailySales[]): any {
    if (sales.length < 3) {
      return { salesTrend: 'stable', consistency: 'medium' };
    }
    
    // ترتيب المبيعات حسب التاريخ
    const sortedSales = [...sales].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // تقسيم البيانات إلى النصف الأول والنصف الثاني لتحليل الاتجاه
    const halfIndex = Math.floor(sortedSales.length / 2);
    const firstHalf = sortedSales.slice(0, halfIndex);
    const secondHalf = sortedSales.slice(halfIndex);
    
    // حساب متوسط المبيعات لكل نصف
    const firstHalfAvg = firstHalf.reduce((sum, sale) => sum + sale.totalSales, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, sale) => sum + sale.totalSales, 0) / secondHalf.length;
    
    // تحديد الاتجاه
    let salesTrend = 'stable';
    if (secondHalfAvg > (firstHalfAvg * 1.1)) {
      salesTrend = 'up';
    } else if (secondHalfAvg < (firstHalfAvg * 0.9)) {
      salesTrend = 'down';
    }
    
    // تحليل الاتساق
    const allSales = sortedSales.map(sale => sale.totalSales);
    const mean = allSales.reduce((sum, val) => sum + val, 0) / allSales.length;
    
    // حساب الانحراف المعياري
    const squaredDiffs = allSales.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / squaredDiffs.length;
    const stdDev = Math.sqrt(avgSquaredDiff);
    
    // حساب معامل الاختلاف (CV)
    const cv = (stdDev / mean) * 100;
    
    // تحديد الاتساق بناءً على معامل الاختلاف
    let consistency = 'medium';
    if (cv < 15) {
      consistency = 'high';
    } else if (cv > 30) {
      consistency = 'low';
    }
    
    return {
      salesTrend,
      consistency,
      changePercentage: ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100,
      coefficientOfVariation: cv
    };
  }
  
  // حساب نقاط المكافأة المقترحة
  private calculateSuggestedRewardPoints(avgSales: number, avgDiscrepancy: number, consistency: string): number {
    let points = 0;
    
    // نقاط بناءً على متوسط المبيعات
    if (avgSales > 1000) {
      points += 30;
    } else if (avgSales > 500) {
      points += 20;
    } else if (avgSales > 250) {
      points += 10;
    }
    
    // نقاط بناءً على متوسط الانحراف
    if (avgDiscrepancy < 5) {
      points += 20;
    } else if (avgDiscrepancy < 20) {
      points += 10;
    }
    
    // نقاط بناءً على الاتساق
    if (consistency === 'high') {
      points += 20;
    } else if (consistency === 'medium') {
      points += 10;
    }
    
    return points;
  }

  // Branch Cash Box - صندوق النقدية للفرع
  async getBranchCashBox(branchId: number): Promise<BranchCashBox | undefined> {
    return this.branchCashBoxes.get(branchId);
  }

  async createBranchCashBox(cashBox: InsertBranchCashBox): Promise<BranchCashBox> {
    // الفرع هو المعرف لصندوق النقدية
    const id = cashBox.branchId;
    const newCashBox: BranchCashBox = { 
      ...cashBox, 
      id,
      lastUpdated: new Date(),
      createdAt: new Date()
    };
    
    this.branchCashBoxes.set(id, newCashBox);
    
    // إنشاء نشاط لتتبع التحديث
    await this.createActivity({
      userId: cashBox.createdBy,
      branchId: cashBox.branchId,
      action: "cash_box_created",
      details: { 
        initialBalance: cashBox.balance,
        branchId: cashBox.branchId
      },
      timestamp: new Date()
    });
    
    return newCashBox;
  }

  async updateBranchCashBoxBalance(branchId: number, amount: number): Promise<BranchCashBox | undefined> {
    const cashBox = this.branchCashBoxes.get(branchId);
    if (!cashBox) return undefined;
    
    const updatedCashBox: BranchCashBox = {
      ...cashBox,
      balance: cashBox.balance + amount,
      lastUpdated: new Date()
    };
    
    this.branchCashBoxes.set(branchId, updatedCashBox);
    return updatedCashBox;
  }

  // Cash Box Transactions - معاملات صندوق النقدية
  async getCashBoxTransactions(branchId: number): Promise<CashBoxTransaction[]> {
    return Array.from(this.cashBoxTransactions.values())
      .filter(transaction => transaction.branchId === branchId)
      .sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });
  }

  async getCashBoxTransactionsByDate(branchId: number, startDate: string, endDate: string): Promise<CashBoxTransaction[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return Array.from(this.cashBoxTransactions.values())
      .filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transaction.branchId === branchId && 
          transactionDate >= start && 
          transactionDate <= end;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });
  }

  async getCashBoxTransactionById(id: number): Promise<CashBoxTransaction | undefined> {
    return this.cashBoxTransactions.get(id);
  }

  async createCashBoxTransaction(transaction: InsertCashBoxTransaction): Promise<CashBoxTransaction> {
    const id = this.cashBoxTransactionCurrentId++;
    const newTransaction: CashBoxTransaction = {
      ...transaction,
      id,
      timestamp: new Date(),
      notes: transaction.notes || "",
      referenceNumber: transaction.referenceNumber || `TR-${id}`
    };
    
    this.cashBoxTransactions.set(id, newTransaction);
    
    // تحديث رصيد صندوق النقدية
    let amountChange = 0;
    if (transaction.type === 'deposit') {
      amountChange = transaction.amount;
    } else if (transaction.type === 'withdrawal' || transaction.type === 'transfer_to_hq') {
      amountChange = -transaction.amount;
    }
    
    await this.updateBranchCashBoxBalance(transaction.branchId, amountChange);
    
    // إنشاء نشاط لتتبع التحديث
    await this.createActivity({
      userId: transaction.createdBy,
      branchId: transaction.branchId,
      action: `cash_box_${transaction.type}`,
      details: { 
        amount: transaction.amount,
        type: transaction.type,
        source: transaction.source,
        notes: transaction.notes
      },
      timestamp: new Date()
    });
    
    return newTransaction;
  }

  // Cash Transfers to HQ - التحويلات النقدية للمركز الرئيسي
  async getCashTransfersToHQ(branchId: number): Promise<CashTransferToHQ[]> {
    return Array.from(this.cashTransfersToHQ.values())
      .filter(transfer => transfer.branchId === branchId)
      .sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });
  }

  async getCashTransferToHQById(id: number): Promise<CashTransferToHQ | undefined> {
    return this.cashTransfersToHQ.get(id);
  }

  async createCashTransferToHQ(transfer: InsertCashTransferToHQ): Promise<CashTransferToHQ> {
    const id = this.cashTransferToHQCurrentId++;
    const newTransfer: CashTransferToHQ = {
      ...transfer,
      id,
      status: 'pending',
      createdAt: new Date(),
      notes: transfer.notes || "",
      referenceNumber: transfer.referenceNumber || `HQ-${id}`,
      approvedAt: null,
      approvedBy: null,
      rejectionReason: null
    };
    
    this.cashTransfersToHQ.set(id, newTransfer);
    
    // إنشاء معاملة صندوق نقدية مرتبطة
    await this.createCashBoxTransaction({
      branchId: transfer.branchId,
      cashBoxId: transfer.cashBoxId,
      amount: transfer.amount,
      type: 'transfer_to_hq',
      source: 'transfer',
      createdBy: transfer.createdBy,
      date: transfer.date,
      notes: `تحويل إلى المركز الرئيسي: ${transfer.notes || ""}`,
      referenceNumber: `HQ-TR-${id}`
    });
    
    // إنشاء نشاط لتتبع التحديث
    await this.createActivity({
      userId: transfer.createdBy,
      branchId: transfer.branchId,
      action: "cash_transfer_to_hq_created",
      details: { 
        amount: transfer.amount,
        transferId: id,
        method: transfer.transferMethod
      },
      timestamp: new Date()
    });
    
    // إنشاء إشعار للإدارة
    await this.createNotification({
      userId: null, // للجميع (المستخدمين الإداريين)
      title: `تحويل نقدي جديد من الفرع #${transfer.branchId}`,
      message: `تم إنشاء تحويل نقدي جديد بمبلغ ${transfer.amount} بواسطة الفرع #${transfer.branchId}`,
      type: "info",
      timestamp: new Date(),
      link: "/cash-transfers"
    });
    
    return newTransfer;
  }

  async approveCashTransferToHQ(id: number, approverId: number): Promise<CashTransferToHQ | undefined> {
    const transfer = this.cashTransfersToHQ.get(id);
    if (!transfer) return undefined;
    
    const updatedTransfer: CashTransferToHQ = {
      ...transfer,
      status: 'approved',
      approvedAt: new Date(),
      approvedBy: approverId
    };
    
    this.cashTransfersToHQ.set(id, updatedTransfer);
    
    // إنشاء نشاط لتتبع التحديث
    await this.createActivity({
      userId: approverId,
      branchId: transfer.branchId,
      action: "cash_transfer_to_hq_approved",
      details: { 
        amount: transfer.amount,
        transferId: id,
        method: transfer.transferMethod
      },
      timestamp: new Date()
    });
    
    // إنشاء إشعار للفرع
    await this.createNotification({
      userId: null, // للفرع المعني
      title: `تمت الموافقة على التحويل النقدي #${id}`,
      message: `تمت الموافقة على التحويل النقدي بمبلغ ${transfer.amount} من الفرع #${transfer.branchId}`,
      type: "success",
      timestamp: new Date(),
      link: `/cash-box/${transfer.branchId}/transfers`
    });
    
    return updatedTransfer;
  }

  async rejectCashTransferToHQ(id: number, notes: string): Promise<CashTransferToHQ | undefined> {
    const transfer = this.cashTransfersToHQ.get(id);
    if (!transfer) return undefined;
    
    const updatedTransfer: CashTransferToHQ = {
      ...transfer,
      status: 'rejected',
      rejectionReason: notes
    };
    
    this.cashTransfersToHQ.set(id, updatedTransfer);
    
    // إعادة المبلغ إلى رصيد صندوق النقدية للفرع
    await this.createCashBoxTransaction({
      branchId: transfer.branchId,
      cashBoxId: transfer.cashBoxId,
      amount: transfer.amount,
      type: 'deposit',
      source: 'manual',
      createdBy: 1, // النظام
      date: new Date(),
      notes: `إعادة مبلغ تحويل مرفوض #${id}: ${notes}`,
      referenceNumber: `REJ-${id}`
    });
    
    // إنشاء نشاط لتتبع التحديث
    await this.createActivity({
      userId: 1, // النظام
      branchId: transfer.branchId,
      action: "cash_transfer_to_hq_rejected",
      details: { 
        amount: transfer.amount,
        transferId: id,
        reason: notes
      },
      timestamp: new Date()
    });
    
    // إنشاء إشعار للفرع
    await this.createNotification({
      userId: null, // للفرع المعني
      title: `تم رفض التحويل النقدي #${id}`,
      message: `تم رفض التحويل النقدي بمبلغ ${transfer.amount} من الفرع #${transfer.branchId}: ${notes}`,
      type: "error",
      timestamp: new Date(),
      link: `/cash-box/${transfer.branchId}/transfers`
    });
    
    return updatedTransfer;
  }

  async getCashTransfersByStatus(status: string): Promise<CashTransferToHQ[]> {
    return Array.from(this.cashTransfersToHQ.values())
      .filter(transfer => transfer.status === status)
      .sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });
  }

  // Cash Box Reports - تقارير صندوق النقدية
  async getBranchCashBoxBalance(branchId: number): Promise<number> {
    const cashBox = await this.getBranchCashBox(branchId);
    return cashBox ? cashBox.balance : 0;
  }

  async getCashBoxReport(branchId: number, startDate: string, endDate: string): Promise<any> {
    // الحصول على معاملات الصندوق خلال الفترة المحددة
    const transactions = await this.getCashBoxTransactionsByDate(branchId, startDate, endDate);
    
    // الحصول على صندوق النقدية
    const cashBox = await this.getBranchCashBox(branchId);
    
    // تجميع البيانات حسب النوع
    const deposits = transactions.filter(t => t.type === 'deposit');
    const withdrawals = transactions.filter(t => t.type === 'withdrawal');
    const transfers = transactions.filter(t => t.type === 'transfer_to_hq');
    
    // حساب الإجماليات
    const totalDeposits = deposits.reduce((sum, t) => sum + t.amount, 0);
    const totalWithdrawals = withdrawals.reduce((sum, t) => sum + t.amount, 0);
    const totalTransfers = transfers.reduce((sum, t) => sum + t.amount, 0);
    
    // حساب الإجماليات حسب المصدر
    const depositsFromSales = deposits.filter(t => t.source === 'daily_sales').reduce((sum, t) => sum + t.amount, 0);
    const depositsManual = deposits.filter(t => t.source === 'manual').reduce((sum, t) => sum + t.amount, 0);
    
    // الرصيد الافتتاحي (تقريبي): الرصيد الحالي - الإيداعات + السحوبات + التحويلات
    const currentBalance = cashBox ? cashBox.balance : 0;
    const estimatedOpeningBalance = currentBalance - totalDeposits + totalWithdrawals + totalTransfers;
    
    return {
      branchId,
      periodStart: startDate,
      periodEnd: endDate,
      currentBalance,
      estimatedOpeningBalance,
      totalTransactions: transactions.length,
      summary: {
        totalDeposits,
        totalWithdrawals,
        totalTransfers,
        netChange: totalDeposits - totalWithdrawals - totalTransfers
      },
      depositsBySource: {
        fromSales: depositsFromSales,
        manual: depositsManual,
        other: totalDeposits - depositsFromSales - depositsManual
      },
      transactions,
      generatedAt: new Date()
    };
  }

  async getCashTransfersReport(branchId: number, startDate: string, endDate: string): Promise<any> {
    // الحصول على التحويلات خلال الفترة المحددة
    const transfers = Array.from(this.cashTransfersToHQ.values())
      .filter(transfer => {
        const transferDate = new Date(transfer.date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        return transfer.branchId === branchId && 
          transferDate >= start && 
          transferDate <= end;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });
    
    // تجميع البيانات حسب الحالة
    const approved = transfers.filter(t => t.status === 'approved');
    const pending = transfers.filter(t => t.status === 'pending');
    const rejected = transfers.filter(t => t.status === 'rejected');
    
    // حساب الإجماليات
    const totalApproved = approved.reduce((sum, t) => sum + t.amount, 0);
    const totalPending = pending.reduce((sum, t) => sum + t.amount, 0);
    const totalRejected = rejected.reduce((sum, t) => sum + t.amount, 0);
    const totalTransfersAmount = transfers.reduce((sum, t) => sum + t.amount, 0);
    
    // تجميع البيانات حسب وسيلة التحويل
    const byTransferMethod: Record<string, { count: number, amount: number }> = {};
    
    transfers.forEach(t => {
      if (!byTransferMethod[t.transferMethod]) {
        byTransferMethod[t.transferMethod] = { count: 0, amount: 0 };
      }
      byTransferMethod[t.transferMethod].count++;
      byTransferMethod[t.transferMethod].amount += t.amount;
    });
    
    return {
      branchId,
      periodStart: startDate,
      periodEnd: endDate,
      totalTransfers: transfers.length,
      summary: {
        totalTransfersAmount,
        totalApproved,
        totalPending,
        totalRejected
      },
      statusSummary: {
        approved: {
          count: approved.length,
          amount: totalApproved
        },
        pending: {
          count: pending.length,
          amount: totalPending
        },
        rejected: {
          count: rejected.length,
          amount: totalRejected
        }
      },
      byTransferMethod,
      transfers,
      generatedAt: new Date()
    };
  }

  // Process Daily Sales to Cash Box - تحويل المبيعات اليومية إلى صندوق النقدية
  async processDailySalesToCashBox(dailySalesId: number): Promise<CashBoxTransaction | undefined> {
    // الحصول على بيانات المبيعات اليومية
    const dailySales = await this.getDailySalesById(dailySalesId);
    if (!dailySales) return undefined;
    
    // التحقق من أن المبيعات اليومية لم يتم تحويلها بالفعل
    const existingTransaction = Array.from(this.cashBoxTransactions.values())
      .find(t => 
        t.source === 'daily_sales' && 
        t.referenceNumber?.includes(`DS-${dailySalesId}`)
      );
    
    if (existingTransaction) return existingTransaction;
    
    // الحصول على صندوق النقدية للفرع
    let cashBox = await this.getBranchCashBox(dailySales.branchId);
    
    // إنشاء صندوق نقدية للفرع إذا لم يكن موجودًا بالفعل
    if (!cashBox) {
      cashBox = await this.createBranchCashBox({
        branchId: dailySales.branchId,
        balance: 0,
        createdBy: dailySales.cashierId
      });
    }
    
    // إنشاء معاملة إيداع في صندوق النقدية
    const transaction = await this.createCashBoxTransaction({
      branchId: dailySales.branchId,
      cashBoxId: cashBox.id,
      amount: dailySales.totalCashSales,
      type: 'deposit',
      source: 'daily_sales',
      createdBy: dailySales.cashierId,
      date: new Date(dailySales.date),
      notes: `إيداع مبيعات نقدية: ${dailySales.date}`,
      referenceNumber: `DS-${dailySalesId}`
    });
    
    // تحديث حالة المبيعات اليومية
    await this.updateDailySalesStatus(dailySalesId, 'transferred');
    
    return transaction;
  }
  
  async initializeDemoData(): Promise<void> {
    // تنفيذ إضافة بيانات تجريبية
    console.log("Initializing demo data in memory storage");
    
    // إضافة لوحات المتصدرين التجريبية
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);
    
    // لوحة متصدرين المبيعات الشهرية
    this.createLeaderboard({
      name: "تحدي المبيعات الشهري",
      description: "المتصدرون في مبيعات الشهر الحالي",
      type: "monthly",
      category: "sales",
      startDate: today,
      endDate: nextMonth,
      isActive: true
    });
    
    // لوحة متصدرين خدمة العملاء
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    this.createLeaderboard({
      name: "نجوم خدمة العملاء",
      description: "المتميزون في خدمة العملاء",
      type: "weekly",
      category: "customer_satisfaction",
      startDate: today,
      endDate: nextWeek,
      isActive: true
    });
    
    // لوحة متصدرين تحقيق الأهداف
    const endQuarter = new Date(today);
    endQuarter.setMonth(Math.floor(today.getMonth() / 3) * 3 + 3);
    this.createLeaderboard({
      name: "الأفضل في تحقيق الأهداف",
      description: "الفروع المتميزة في تحقيق أهداف المبيعات",
      type: "quarterly",
      category: "target_achievement",
      startDate: today,
      endDate: endQuarter,
      isActive: true
    });
    
    // إضافة نتائج لوحة المتصدرين التجريبية
    if (this.leaderboards.size > 0) {
      const leaderboardId = 1; // أول لوحة متصدرين
      
      // إضافة بعض النتائج التجريبية
      const results = [
        {
          userId: 1,
          leaderboardId,
          rank: 1,
          score: 9850,
          metricName: "المبيعات",
          metricValue: 9850,
          updateDate: new Date()
        },
        {
          userId: 2,
          leaderboardId,
          rank: 2,
          score: 7500,
          metricName: "المبيعات",
          metricValue: 7500,
          updateDate: new Date()
        },
        {
          userId: 3,
          leaderboardId,
          rank: 3,
          score: 6200,
          metricName: "المبيعات",
          metricValue: 6200,
          updateDate: new Date()
        },
        {
          userId: 4,
          leaderboardId,
          rank: 4,
          score: 5100,
          metricName: "المبيعات",
          metricValue: 5100,
          updateDate: new Date()
        },
        {
          userId: 5,
          leaderboardId,
          rank: 5,
          score: 4300,
          metricName: "المبيعات",
          metricValue: 4300,
          updateDate: new Date()
        }
      ];
      
      try {
        this.updateLeaderboardResults(leaderboardId, results);
      } catch (error) {
        console.error("Error initializing leaderboard results:", error);
      }
    }
  }
  
  // مولد موسيقى الطهي التفاعلي - Cooking Soundtrack Generator
  
  /**
   * الحصول على جميع موسيقى الطهي المتاحة
   */
  async getCookingSoundtracks(): Promise<CookingSoundtrack[]> {
    return Array.from(this.cookingSoundtracks.values());
  }
  
  /**
   * الحصول على موسيقى طهي محددة حسب المعرف
   */
  async getCookingSoundtrackById(id: number): Promise<CookingSoundtrack | undefined> {
    return this.cookingSoundtracks.get(id);
  }
  
  /**
   * الحصول على موسيقى الطهي التي أنشأها مستخدم محدد
   */
  async getCookingSoundtracksByUser(userId: number): Promise<CookingSoundtrack[]> {
    return Array.from(this.cookingSoundtracks.values())
      .filter(soundtrack => soundtrack.userId === userId);
  }
  
  /**
   * الحصول على موسيقى الطهي حسب الفرع
   */
  async getCookingSoundtracksByBranch(branchId: number): Promise<CookingSoundtrack[]> {
    return Array.from(this.cookingSoundtracks.values())
      .filter(soundtrack => soundtrack.branchId === branchId);
  }
  
  /**
   * الحصول على موسيقى الطهي حسب الحالة المزاجية
   */
  async getCookingSoundtracksByMood(mood: string): Promise<CookingSoundtrack[]> {
    return Array.from(this.cookingSoundtracks.values())
      .filter(soundtrack => soundtrack.mood === mood);
  }
  
  /**
   * الحصول على موسيقى الطهي حسب نوع الوصفة
   */
  async getCookingSoundtracksByRecipeType(recipeType: string): Promise<CookingSoundtrack[]> {
    return Array.from(this.cookingSoundtracks.values())
      .filter(soundtrack => soundtrack.recipeType === recipeType);
  }
  
  /**
   * إنشاء موسيقى طهي جديدة
   */
  async createCookingSoundtrack(soundtrack: InsertCookingSoundtrack): Promise<CookingSoundtrack> {
    const id = this.cookingSoundtrackCurrentId++;
    const newSoundtrack: CookingSoundtrack = { 
      ...soundtrack, 
      id, 
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.cookingSoundtracks.set(id, newSoundtrack);
    
    // إنشاء نشاط لتتبع إنشاء موسيقى الطهي
    await this.createActivity({
      userId: soundtrack.userId,
      action: "cooking_soundtrack_created",
      details: {
        soundtrackId: id,
        name: soundtrack.name,
        mood: soundtrack.mood
      },
      branchId: soundtrack.branchId || null,
      timestamp: new Date()
    });
    
    return newSoundtrack;
  }
  
  /**
   * تحديث موسيقى طهي موجودة
   */
  async updateCookingSoundtrack(id: number, soundtrack: Partial<CookingSoundtrack>): Promise<CookingSoundtrack | undefined> {
    const existingSoundtrack = this.cookingSoundtracks.get(id);
    if (!existingSoundtrack) return undefined;
    
    const updatedSoundtrack: CookingSoundtrack = { 
      ...existingSoundtrack, 
      ...soundtrack,
      updatedAt: new Date()
    };
    
    this.cookingSoundtracks.set(id, updatedSoundtrack);
    
    // إنشاء نشاط لتتبع تحديث موسيقى الطهي
    await this.createActivity({
      userId: updatedSoundtrack.userId,
      action: "cooking_soundtrack_updated",
      details: {
        soundtrackId: id,
        name: updatedSoundtrack.name,
        mood: updatedSoundtrack.mood
      },
      branchId: updatedSoundtrack.branchId || null,
      timestamp: new Date()
    });
    
    return updatedSoundtrack;
  }
  
  /**
   * حذف موسيقى طهي
   */
  async deleteCookingSoundtrack(id: number): Promise<boolean> {
    const soundtrack = this.cookingSoundtracks.get(id);
    if (!soundtrack) return false;
    
    const result = this.cookingSoundtracks.delete(id);
    
    if (result) {
      // إنشاء نشاط لتتبع حذف موسيقى الطهي
      await this.createActivity({
        userId: soundtrack.userId,
        action: "cooking_soundtrack_deleted",
        details: {
          soundtrackId: id,
          name: soundtrack.name
        },
        branchId: soundtrack.branchId || null,
        timestamp: new Date()
      });
    }
    
    return result;
  }
}

export class DatabaseStorage implements IStorage {
  // تنفيذ للدوال المفقودة في واجهة IStorage
  
  /**
   * ترحيل اليومية المجمعة إلى الحسابات
   * تقوم هذه الدالة بتحديث حالة اليومية المجمعة لتصبح "مرحلة" وتسجيل من قام بالترحيل
   * @param id معرف اليومية المجمعة
   * @param userId معرف المستخدم الذي يقوم بالترحيل
   * @returns اليومية المجمعة بعد الترحيل
   */
  async transferConsolidatedDailySales(id: number, userId: number): Promise<ConsolidatedDailySales | undefined> {
    try {
      // 1. جلب اليومية المجمعة
      const consolidatedSales = await this.getConsolidatedDailySalesById(id);
      
      if (!consolidatedSales) {
        console.error(`Consolidated sales record with ID ${id} not found`);
        return undefined;
      }
      
      // 2. التحقق من أن اليومية ليست مرحلة بالفعل
      if (consolidatedSales.status === "transferred") {
        console.log(`Consolidated sales record with ID ${id} is already transferred`);
        return consolidatedSales;
      }
      
      // 3. التحقق من أن اليومية مغلقة (لا يمكن ترحيل يومية غير مغلقة)
      if (consolidatedSales.status !== "closed") {
        console.error(`Cannot transfer unconsolidated sales record with ID ${id}. Status must be 'closed'`);
        return undefined;
      }
      
      // 4. تحديث حالة اليومية المجمعة
      const result = await db.update(consolidatedDailySales)
        .set({
          status: "transferred",
          transferredBy: userId,
          transferredAt: new Date()
        })
        .where(eq(consolidatedDailySales.id, id))
        .returning();
      
      if (result.length === 0) {
        throw new Error(`Failed to transfer consolidated sales record with ID ${id}`);
      }
      
      // 5. إنشاء نشاط لتتبع عملية الترحيل
      await this.createActivity({
        userId,
        action: "transfer_consolidated_sales",
        details: { 
          consolidatedId: id,
          date: consolidatedSales.date,
          branchId: consolidatedSales.branchId,
          totalAmount: consolidatedSales.totalSales
        },
        branchId: consolidatedSales.branchId,
        timestamp: new Date()
      });
      
      return result[0];
    } catch (error) {
      console.error("Error in transferConsolidatedDailySales:", error);
      return undefined;
    }
  }
  
  /**
   * الحصول على أداء الكاشير حسب الفرع والتاريخ
   * تدعم هذه الدالة عرض بيانات لجميع الفروع (branchId=0)
   * @param branchId معرف الفرع (0 لجميع الفروع)
   * @param date التاريخ
   */
  async getCashierPerformance(branchId: number, date: Date): Promise<any[]> {
    console.log(`🔍 طلب أداء الكاشير للتاريخ ${format(date, "yyyy-MM-dd")}, للفرع ${branchId}`);
    
    const formattedDate = format(date, "yyyy-MM-dd");
    
    try {
      const users = await db.select().from(schema.users).where(eq(schema.users.role, "cashier"));
      let filteredUsers = users;
      
      if (branchId !== 0) {
        filteredUsers = users.filter(user => user.branchId === branchId);
      }
      
      console.log(`📋 تم العثور على ${filteredUsers.length} كاشير ${branchId === 0 ? 'من جميع الفروع' : `من الفرع #${branchId}`}`);
      
      const results = [];
      
      for (const cashier of filteredUsers) {
        let cashierSales = [];
        
        // الحصول على مبيعات اليوم المحدد للكاشير
        if (branchId === 0) {
          const sales = await db
            .select()
            .from(schema.dailySales)
            .where(
              and(
                eq(schema.dailySales.cashierId, cashier.id),
                eq(schema.dailySales.date, formattedDate)
              )
            );
          cashierSales = sales;
        } else {
          const sales = await db
            .select()
            .from(schema.dailySales)
            .where(
              and(
                eq(schema.dailySales.cashierId, cashier.id),
                eq(schema.dailySales.date, formattedDate),
                eq(schema.dailySales.branchId, branchId)
              )
            );
          cashierSales = sales;
        }
        
        if (cashierSales.length > 0) {
          // تجميع المبيعات واستخراج الإحصائيات
          const totalSales = cashierSales.reduce((sum, sale) => sum + sale.totalSales, 0);
          const totalCashSales = cashierSales.reduce((sum, sale) => sum + (sale.totalCashSales || 0), 0);
          const totalNetworkSales = cashierSales.reduce((sum, sale) => sum + (sale.totalNetworkSales || 0), 0);
          const totalTransactions = cashierSales.reduce((sum, sale) => sum + (sale.totalTransactions || 0), 0);
          const totalDiscrepancy = cashierSales.reduce((sum, sale) => sum + (sale.discrepancy || 0), 0);
          
          // حساب متوسط التذكرة
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
          
          // إضافة معلومات الفرع للعرض التجميعي
          const branch = await db.select().from(schema.branches).where(eq(schema.branches.id, cashier.branchId || 0)).then(b => b[0]);
          
          results.push({
            cashierId: cashier.id,
            name: cashier.name,
            avatar: cashier.avatar,
            branchId: cashier.branchId,
            branchName: branch?.name || `فرع #${cashier.branchId}`,
            totalSales,
            totalCashSales,
            totalNetworkSales,
            discrepancy: totalDiscrepancy,
            totalTransactions,
            averageTicket,
            performance,
            salesCount: cashierSales.length
          });
        } else {
          // إذا لم يكن هناك مبيعات، نعيد بيانات أساسية
          const branch = await db.select().from(schema.branches).where(eq(schema.branches.id, cashier.branchId || 0)).then(b => b[0]);
          
          results.push({
            cashierId: cashier.id,
            name: cashier.name,
            avatar: cashier.avatar,
            branchId: cashier.branchId,
            branchName: branch?.name || `فرع #${cashier.branchId}`,
            totalSales: 0,
            totalCashSales: 0,
            totalNetworkSales: 0,
            discrepancy: 0,
            totalTransactions: 0,
            averageTicket: 0,
            performance: 100,  // نفترض أداء 100% في حالة عدم وجود مبيعات
            salesCount: 0
          });
        }
      }
      
      // ترتيب النتائج حسب المبيعات (تنازليًا)
      results.sort((a, b) => b.totalSales - a.totalSales);
      
      console.log(`✅ تم تجهيز تقرير أداء ${results.length} كاشير`);
      return results;
    } catch (error) {
      console.error("خطأ في الحصول على أداء الكاشير:", error);
      return [];
    }
  }
  
  /**
   * الحصول على إنجاز الهدف الشهري للفروع
   * @param month الشهر
   * @param year السنة
   * @param specificBranchId معرف الفرع المحدد (0 لجميع الفروع)
   */
  /**
   * الحصول على إنجاز الهدف الشهري للفروع - النسخة المحدثة
   * تدعم هذه الدالة عرض بيانات لجميع الفروع (specificBranchId=0)
   * @param month الشهر
   * @param year السنة
   * @param specificBranchId معرف الفرع المحدد (0 لجميع الفروع)
   */
  async getBranchTargetAchievement(month: number, year: number, specificBranchId?: number): Promise<any[]> {
    console.log(`🔍 طلب إنجاز الهدف الشهري للشهر ${month}, السنة ${year}, الفرع ${specificBranchId || 'جميع الفروع'}`);
    
    try {
      // الحصول على قائمة الفروع
      let branchesToProcess = [];
      
      if (specificBranchId === 0 || !specificBranchId) {
        // إذا كان specificBranchId = 0 أو غير محدد، نجلب جميع الفروع
        branchesToProcess = await db.select().from(schema.branches);
        console.log(`📋 تم العثور على ${branchesToProcess.length} فرع للمعالجة`);
      } else {
        // نجلب فرع محدد فقط
        const branch = await db.select().from(schema.branches).where(eq(schema.branches.id, specificBranchId)).then(b => b[0]);
        if (branch) {
          branchesToProcess = [branch];
          console.log(`📋 تم تحديد الفرع ${branch.name} للمعالجة`);
        } else {
          console.warn(`⚠️ لم يتم العثور على الفرع برقم ${specificBranchId}`);
          return [];
        }
      }
      
      const results = [];
      
      // معالجة كل فرع
      for (const branch of branchesToProcess) {
        // الحصول على هدف الشهر للفرع
        const target = await db
          .select()
          .from(schema.monthlyTargets)
          .where(
            and(
              eq(schema.monthlyTargets.branchId, branch.id),
              eq(schema.monthlyTargets.month, month),
              eq(schema.monthlyTargets.year, year)
            )
          )
          .then(targets => targets[0]);
        
        if (!target) {
          console.warn(`⚠️ لم يتم العثور على هدف للفرع ${branch.name} للشهر ${month}/${year}`);
          
          // نقوم بإضافة بيانات فارغة في حالة عدم وجود هدف
          results.push({
            branchId: branch.id,
            branchName: branch.name,
            targetAmount: 0,
            currentAmount: 0,
            achievementPercentage: 0,
            daysInMonth: new Date(year, month, 0).getDate(),
            daysRemaining: 0,
            dailyAverage: 0,
            requiredDailyAverage: 0,
            dayTargets: []
          });
          
          continue;
        }
        
        // الحصول على المبيعات اليومية للفرع للشهر المحدد
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        
        const formattedStartDate = format(startDate, "yyyy-MM-dd");
        const formattedEndDate = format(endDate, "yyyy-MM-dd");
        
        const dailySalesForMonth = await db
          .select()
          .from(schema.dailySales)
          .where(
            and(
              eq(schema.dailySales.branchId, branch.id),
              gte(schema.dailySales.date, formattedStartDate),
              lte(schema.dailySales.date, formattedEndDate)
            )
          );
        
        // تجميع إجمالي المبيعات
        const totalSalesAmount = dailySalesForMonth.reduce((sum, sale) => sum + sale.totalSales, 0);
        
        // حساب النسبة المئوية للإنجاز
        const achievementPercentage = target.targetAmount > 0 
          ? Math.min(100, (totalSalesAmount / target.targetAmount) * 100) 
          : 0;
        
        // حساب الأيام المتبقية في الشهر
        const today = new Date();
        const currentDay = today.getDate();
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();
        
        const daysInMonth = new Date(year, month, 0).getDate();
        let daysRemaining = 0;
        
        if (currentYear === year && currentMonth === month) {
          daysRemaining = daysInMonth - currentDay + 1;
        } else if (currentYear < year || (currentYear === year && currentMonth < month)) {
          // الشهر المطلوب في المستقبل
          daysRemaining = daysInMonth;
        }
        
        // حساب المتوسط اليومي الحالي والمطلوب
        const daysElapsed = daysInMonth - daysRemaining;
        const dailyAverage = daysElapsed > 0 ? totalSalesAmount / daysElapsed : 0;
        
        const remainingAmount = target.targetAmount - totalSalesAmount;
        const requiredDailyAverage = daysRemaining > 0 && remainingAmount > 0 
          ? remainingAmount / daysRemaining 
          : 0;
        
        // إعداد بيانات الأيام
        const dayTargets = [];
        
        // تجميع المبيعات حسب اليوم
        const salesByDay = dailySalesForMonth.reduce((acc, sale) => {
          const dayKey = sale.date;
          if (!acc[dayKey]) {
            acc[dayKey] = { date: dayKey, totalSales: 0 };
          }
          acc[dayKey].totalSales += sale.totalSales;
          return acc;
        }, {} as Record<string, { date: string, totalSales: number }>);
        
        // إضافة كل أيام الشهر (حتى لو لم يكن هناك مبيعات)
        for (let day = 1; day <= daysInMonth; day++) {
          const currentDate = new Date(year, month - 1, day);
          const formattedDay = format(currentDate, "yyyy-MM-dd");
          
          // الحصول على الهدف اليومي من الهدف الشهري إذا كان متاحًا
          let dailyTarget = target.targetAmount / daysInMonth; // افتراضي: توزيع متساوٍ
          
          // إذا كان هناك توزيع خاص للأيام
          if (target.dailyTargets && target.dailyTargets[day.toString()]) {
            dailyTarget = target.dailyTargets[day.toString()];
          }
          
          // الحصول على المبيعات الفعلية لهذا اليوم
          const daySales = salesByDay[formattedDay] || { date: formattedDay, totalSales: 0 };
          
          dayTargets.push({
            day,
            date: formattedDay,
            weekday: format(currentDate, "EEEE"),
            target: dailyTarget,
            actual: daySales.totalSales,
            achievement: dailyTarget > 0 ? (daySales.totalSales / dailyTarget) * 100 : 0
          });
        }
        
        // إضافة نتائج هذا الفرع
        results.push({
          branchId: branch.id,
          branchName: branch.name,
          targetAmount: target.targetAmount,
          currentAmount: totalSalesAmount,
          achievementPercentage,
          daysInMonth,
          daysRemaining,
          dailyAverage,
          requiredDailyAverage,
          dayTargets
        });
      }
      
      // ترتيب النتائج حسب نسبة الإنجاز (تنازليًا)
      results.sort((a, b) => b.achievementPercentage - a.achievementPercentage);
      
      console.log(`✅ تم استخراج تقرير إنجاز الأهداف لـ ${results.length} فرع`);
      return results;
    } catch (error) {
      console.error("خطأ في استخراج بيانات إنجاز الهدف:", error);
      return [];
    }
  }
  
  /**
   * الحصول على تحليلات المبيعات حسب الفرع والفترة الزمنية
   * @param branchId معرف الفرع (0 لجميع الفروع)
   * @param period الفترة الزمنية (weekly, monthly, yearly)
   */
  async getSalesAnalytics(branchId: number, period: string): Promise<any> {
    console.log(`🔍 طلب تحليلات المبيعات للفرع ${branchId === 0 ? 'جميع الفروع' : branchId}, للفترة ${period}`);
    
    try {
      const today = new Date();
      let startDate: Date;
      let endDate = today;
      
      // تحديد نطاق التاريخ بناءً على الفترة المطلوبة
      switch (period) {
        case 'weekly':
          startDate = subDays(today, 7);
          break;
        case 'monthly':
          startDate = subMonths(today, 1);
          break;
        case 'yearly':
          startDate = subYears(today, 1);
          break;
        default:
          // افتراضي: أسبوع واحد
          startDate = subDays(today, 7);
      }
      
      const formattedStartDate = format(startDate, "yyyy-MM-dd");
      const formattedEndDate = format(endDate, "yyyy-MM-dd");
      
      // الحصول على المبيعات في النطاق الزمني المحدد
      let salesData;
      
      if (branchId === 0) {
        // استعلام عن المبيعات لجميع الفروع
        salesData = await db
          .select()
          .from(schema.dailySales)
          .where(
            and(
              gte(schema.dailySales.date, formattedStartDate),
              lte(schema.dailySales.date, formattedEndDate)
            )
          );
      } else {
        // استعلام عن المبيعات لفرع محدد
        salesData = await db
          .select()
          .from(schema.dailySales)
          .where(
            and(
              eq(schema.dailySales.branchId, branchId),
              gte(schema.dailySales.date, formattedStartDate),
              lte(schema.dailySales.date, formattedEndDate)
            )
          );
      }
      
      // تجميع البيانات حسب اليوم
      const dailyData: Record<string, any> = {};
      
      // إنشاء مجموعة نطاق التواريخ الكاملة
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const formattedDate = format(currentDate, "yyyy-MM-dd");
        dailyData[formattedDate] = {
          date: formattedDate,
          totalSales: 0,
          totalCashSales: 0,
          totalNetworkSales: 0,
          totalTransactions: 0,
          averageTicket: 0,
          branchesCount: 0,
          branches: {}
        };
        
        currentDate = addDays(currentDate, 1);
      }
      
      // تحليل بيانات المبيعات وتجميعها حسب اليوم
      for (const sale of salesData) {
        const saleDate = sale.date;
        
        if (!dailyData[saleDate]) {
          // في حالة عدم وجود تاريخ البيع في القائمة (غير متوقع في العادة)
          continue;
        }
        
        // تحديث إجماليات اليوم
        dailyData[saleDate].totalSales += sale.totalSales;
        dailyData[saleDate].totalCashSales += sale.totalCashSales || 0;
        dailyData[saleDate].totalNetworkSales += sale.totalNetworkSales || 0;
        dailyData[saleDate].totalTransactions += sale.totalTransactions || 0;
        
        // إضافة بيانات الفروع في حالة branchId = 0
        if (branchId === 0) {
          if (!dailyData[saleDate].branches[sale.branchId]) {
            dailyData[saleDate].branches[sale.branchId] = {
              branchId: sale.branchId,
              totalSales: 0,
              totalCashSales: 0,
              totalNetworkSales: 0,
              totalTransactions: 0,
              averageTicket: 0
            };
            dailyData[saleDate].branchesCount++;
          }
          
          // تحديث بيانات الفرع لهذا اليوم
          const branchData = dailyData[saleDate].branches[sale.branchId];
          branchData.totalSales += sale.totalSales;
          branchData.totalCashSales += sale.totalCashSales || 0;
          branchData.totalNetworkSales += sale.totalNetworkSales || 0;
          branchData.totalTransactions += sale.totalTransactions || 0;
          
          // حساب متوسط التذكرة للفرع
          if (branchData.totalTransactions > 0) {
            branchData.averageTicket = branchData.totalSales / branchData.totalTransactions;
          }
        }
      }
      
      // حساب متوسط التذكرة ليوم كامل
      for (const date in dailyData) {
        if (dailyData[date].totalTransactions > 0) {
          dailyData[date].averageTicket = dailyData[date].totalSales / dailyData[date].totalTransactions;
        }
        
        // تحويل كائن الفروع إلى مصفوفة في حالة branchId = 0
        if (branchId === 0) {
          dailyData[date].branchesData = Object.values(dailyData[date].branches);
          delete dailyData[date].branches; // إزالة الكائن الأصلي
        }
      }
      
      // تحويل الكائن إلى مصفوفة مرتبة حسب التاريخ
      const dailyDataArray = Object.values(dailyData) as any[];
      dailyDataArray.sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      
      // تحليل الاتجاهات
      const trends = this.analyzeSalesTrends(dailyDataArray, branchId);
      
      return {
        branchId,
        period,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        dailyData: dailyDataArray,
        trends
      };
    } catch (error) {
      console.error("خطأ في استخراج تحليلات المبيعات:", error);
      return { 
        branchId,
        period,
        startDate: "",
        endDate: "",
        dailyData: [],
        trends: []
      };
    }
  }
  
  /**
   * تحليل اتجاهات المبيعات من البيانات اليومية
   * @param dailyData بيانات المبيعات اليومية
   * @param branchId معرف الفرع (0 لجميع الفروع)
   */
  private analyzeSalesTrends(dailyData: any[], branchId: number): any {
    // إذا لم تكن هناك بيانات كافية، نعيد نتائج فارغة
    if (dailyData.length < 2) {
      return {
        salesGrowth: 0,
        averageTicketGrowth: 0,
        transactionsGrowth: 0,
        highestSalesDay: null,
        lowestSalesDay: null,
        cashToNetworkRatio: { cash: 50, network: 50 },
        salesByWeekday: {}
      };
    }
    
    // حساب النمو
    const firstDay = dailyData[0];
    const lastDay = dailyData[dailyData.length - 1];
    
    // حساب نسبة النمو (أو الانخفاض) في المبيعات
    const salesGrowth = firstDay.totalSales > 0 
      ? ((lastDay.totalSales - firstDay.totalSales) / firstDay.totalSales) * 100 
      : 0;
    
    // حساب نمو متوسط التذكرة
    const averageTicketGrowth = firstDay.averageTicket > 0 
      ? ((lastDay.averageTicket - firstDay.averageTicket) / firstDay.averageTicket) * 100 
      : 0;
    
    // حساب نمو عدد المعاملات
    const transactionsGrowth = firstDay.totalTransactions > 0 
      ? ((lastDay.totalTransactions - firstDay.totalTransactions) / firstDay.totalTransactions) * 100 
      : 0;
    
    // تحديد يوم أعلى مبيعات ويوم أقل مبيعات
    let highestSalesDay = dailyData[0];
    let lowestSalesDay = dailyData[0];
    
    for (const day of dailyData) {
      if (day.totalSales > highestSalesDay.totalSales) {
        highestSalesDay = day;
      }
      if (day.totalSales < lowestSalesDay.totalSales) {
        lowestSalesDay = day;
      }
    }
    
    // حساب نسبة المبيعات النقدية إلى مبيعات الشبكة
    let totalCash = 0;
    let totalNetwork = 0;
    
    for (const day of dailyData) {
      totalCash += day.totalCashSales;
      totalNetwork += day.totalNetworkSales;
    }
    
    const totalPayments = totalCash + totalNetwork;
    
    const cashToNetworkRatio = {
      cash: totalPayments > 0 ? Math.round((totalCash / totalPayments) * 100) : 50,
      network: totalPayments > 0 ? Math.round((totalNetwork / totalPayments) * 100) : 50
    };
    
    // تحليل المبيعات حسب أيام الأسبوع
    const salesByWeekday: Record<string, any> = {
      "الأحد": { totalSales: 0, count: 0, average: 0 },
      "الإثنين": { totalSales: 0, count: 0, average: 0 },
      "الثلاثاء": { totalSales: 0, count: 0, average: 0 },
      "الأربعاء": { totalSales: 0, count: 0, average: 0 },
      "الخميس": { totalSales: 0, count: 0, average: 0 },
      "الجمعة": { totalSales: 0, count: 0, average: 0 },
      "السبت": { totalSales: 0, count: 0, average: 0 }
    };
    
    const weekdayNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    
    for (const day of dailyData) {
      const date = new Date(day.date);
      const weekday = weekdayNames[date.getDay()];
      
      salesByWeekday[weekday].totalSales += day.totalSales;
      salesByWeekday[weekday].count++;
    }
    
    // حساب متوسط المبيعات لكل يوم في الأسبوع
    for (const weekday in salesByWeekday) {
      if (salesByWeekday[weekday].count > 0) {
        salesByWeekday[weekday].average = salesByWeekday[weekday].totalSales / salesByWeekday[weekday].count;
      }
    }
    
    // تحديد أيام الأسبوع الأفضل والأسوأ أداءً
    let bestWeekday = weekdayNames[0];
    let worstWeekday = weekdayNames[0];
    
    for (const weekday of weekdayNames) {
      if (salesByWeekday[weekday].count > 0) {
        if (salesByWeekday[weekday].average > salesByWeekday[bestWeekday].average || salesByWeekday[bestWeekday].count === 0) {
          bestWeekday = weekday;
        }
        if (salesByWeekday[weekday].average < salesByWeekday[worstWeekday].average || salesByWeekday[worstWeekday].count === 0) {
          worstWeekday = weekday;
        }
      }
    }
    
    return {
      salesGrowth,
      averageTicketGrowth,
      transactionsGrowth,
      highestSalesDay: {
        date: highestSalesDay.date,
        totalSales: highestSalesDay.totalSales
      },
      lowestSalesDay: {
        date: lowestSalesDay.date,
        totalSales: lowestSalesDay.totalSales
      },
      cashToNetworkRatio,
      salesByWeekday,
      bestPerformingWeekday: bestWeekday,
      worstPerformingWeekday: worstWeekday
    };
  }
  
  /**
   * إنشاء سجل مبيعات مجمع جديد
   * @param consolidatedSales بيانات المبيعات المجمعة
   */
  async createConsolidatedDailySales(consolidatedSales: InsertConsolidatedDailySales): Promise<ConsolidatedDailySales> {
    try {
      const [result] = await db
        .insert(consolidatedDailySales)
        .values(consolidatedSales)
        .returning();
      
      return result;
    } catch (error) {
      console.error('خطأ في إنشاء سجل مبيعات مجمع:', error);
      throw error;
    }
  }
  async deleteUser(id: number): Promise<boolean> {
    try {
      await db.delete(users).where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser || undefined;
  }

  async getBranch(id: number): Promise<Branch | undefined> {
    const result = await db.select().from(branches).where(eq(branches.id, id));
    return result[0];
  }

  async getBranches(): Promise<Branch[]> {
    return db.select().from(branches);
  }

  async createBranch(branch: InsertBranch): Promise<Branch> {
    const [newBranch] = await db.insert(branches).values(branch).returning();
    return newBranch;
  }

  async updateBranch(id: number, branchData: Partial<Branch>): Promise<Branch | undefined> {
    const [updatedBranch] = await db
      .update(branches)
      .set(branchData)
      .where(eq(branches.id, id))
      .returning();
    
    return updatedBranch || undefined;
  }

  async getMonthlyTarget(id: number): Promise<MonthlyTarget | undefined> {
    const result = await db.select().from(monthlyTargets).where(eq(monthlyTargets.id, id));
    return result[0];
  }

  async getMonthlyTargets(): Promise<MonthlyTarget[]> {
    return db.select().from(monthlyTargets);
  }

  async getMonthlyTargetByBranchAndDate(branchId: number, month: number, year: number): Promise<MonthlyTarget | undefined> {
    const result = await db
      .select()
      .from(monthlyTargets)
      .where(
        and(
          eq(monthlyTargets.branchId, branchId),
          eq(monthlyTargets.month, month),
          eq(monthlyTargets.year, year)
        )
      );
    
    return result[0];
  }

  async createMonthlyTarget(target: InsertMonthlyTarget): Promise<MonthlyTarget> {
    try {
      // تحويل وتهيئة القيم النصية والأنواع المعقدة بشكل صحيح
      const formattedTarget = {
        branchId: Number(target.branchId),
        month: Number(target.month),
        year: Number(target.year),
        targetAmount: Number(target.targetAmount),
        weekdayWeights: typeof target.weekdayWeights === 'object' ? target.weekdayWeights : {},
        dailyTargets: typeof target.dailyTargets === 'object' ? target.dailyTargets : {},
        specialDays: Array.isArray(target.specialDays) ? target.specialDays : [],
        distributionPattern: typeof target.distributionPattern === 'object' ? target.distributionPattern : {}
      };
      
      console.log('Formatted target before insert:', JSON.stringify(formattedTarget, null, 2));
      
      const [newTarget] = await db.insert(monthlyTargets).values(formattedTarget).returning();
      
      // إنشاء سجل نشاط للتحقق من تفاصيل الإدخال
      console.log('Created monthly target:', JSON.stringify(newTarget, null, 2));
      
      return newTarget;
    } catch (error) {
      console.error('Error in createMonthlyTarget:', error);
      throw error;
    }
  }

  async getDailySales(): Promise<DailySales[]> {
    return db.select().from(dailySales);
  }

  async getDailySalesById(id: number): Promise<DailySales | undefined> {
    const result = await db.select().from(dailySales).where(eq(dailySales.id, id));
    return result[0];
  }

  async getDailySalesByBranchAndDate(branchId: number, date: string): Promise<DailySales[]> {
    // إذا كان branchId = 0، فهذا يعني "جميع الفروع"، لذا نحذف شرط الفلترة حسب الفرع
    if (branchId === 0) {
      return db
        .select()
        .from(dailySales)
        .where(eq(dailySales.date, date));
    } else {
      return db
        .select()
        .from(dailySales)
        .where(
          and(
            eq(dailySales.branchId, branchId),
            eq(dailySales.date, date)
          )
        );
    }
  }

  async getDailySalesByBranchAndDateRange(branchId: number, startDate: string, endDate: string): Promise<DailySales[]> {
    // إذا كان branchId = 0، فهذا يعني "جميع الفروع"، لذا نحذف شرط الفلترة حسب الفرع
    if (branchId === 0) {
      return db
        .select()
        .from(dailySales)
        .where(
          and(
            gte(dailySales.date, startDate),
            lte(dailySales.date, endDate)
          )
        );
    } else {
      return db
        .select()
        .from(dailySales)
        .where(
          and(
            eq(dailySales.branchId, branchId),
            gte(dailySales.date, startDate),
            lte(dailySales.date, endDate)
          )
        );
    }
  }

  async getDailySalesByCashierAndDate(cashierId: number, date: string): Promise<DailySales | undefined> {
    const result = await db
      .select()
      .from(dailySales)
      .where(
        and(
          eq(dailySales.cashierId, cashierId),
          eq(dailySales.date, date)
        )
      );
    
    return result[0];
  }

  async createDailySales(sales: InsertDailySales): Promise<DailySales> {
    try {
      console.log("Original sales data:", JSON.stringify(sales));
      // تحويل shiftStart و shiftEnd إلى كائنات Date إذا كانت سلسلة نصية
      const salesData: any = { 
        date: sales.date,
        branchId: sales.branchId,
        cashierId: sales.cashierId,
        status: sales.status || "pending",
        shiftType: sales.shiftType || "morning",
        totalCashSales: sales.totalCashSales || 0,
        totalNetworkSales: sales.totalNetworkSales || 0,
        totalSales: sales.totalSales || 0,
        totalTransactions: sales.totalTransactions || 0
      };
      
      if (sales.shiftStart) {
        if (typeof sales.shiftStart === 'string') {
          salesData.shiftStart = new Date(sales.shiftStart);
        } else {
          salesData.shiftStart = sales.shiftStart;
        }
      }
      
      if (sales.shiftEnd) {
        if (typeof sales.shiftEnd === 'string') {
          salesData.shiftEnd = new Date(sales.shiftEnd);
        } else {
          salesData.shiftEnd = sales.shiftEnd;
        }
      }
      
      if (sales.startingCash !== undefined) salesData.startingCash = sales.startingCash;
      if (sales.actualCashInRegister !== undefined) salesData.actualCashInRegister = sales.actualCashInRegister;
      if (sales.discrepancy !== undefined) salesData.discrepancy = sales.discrepancy;
      if (sales.averageTicket !== undefined) salesData.averageTicket = sales.averageTicket;
      if (sales.signature !== undefined) salesData.signature = sales.signature;
      if (sales.notes !== undefined) salesData.notes = sales.notes;
      if (sales.hasDiscrepancyAcknowledgment !== undefined) salesData.hasDiscrepancyAcknowledgment = sales.hasDiscrepancyAcknowledgment;
      
      console.log("Processed sales data:", JSON.stringify(salesData));
      
      // تنفيذ الإدخال
      const [newSale] = await db.insert(dailySales).values(salesData).returning();
      
      // تحديث هدف الشهر بناءً على المبيعات الجديدة
      try {
        console.log("Updating target with sales:", JSON.stringify(newSale));
        await this.updateMonthlyTargetFromSales(newSale);
      } catch (updateError) {
        console.error("Error updating target:", updateError);
      }
      
      return newSale;
    } catch (error) {
      console.error("Error in createDailySales:", error);
      throw error;
    }
  }
  
  async checkExistingDailySales(cashierId: number, date: string): Promise<boolean> {
    const result = await db
      .select()
      .from(dailySales)
      .where(
        and(
          eq(dailySales.cashierId, cashierId),
          eq(dailySales.date, date)
        )
      );
    
    return result.length > 0;
  }
  
  async updateDailySalesStatus(id: number, status: string, consolidatedId?: number): Promise<DailySales | undefined> {
    try {
      const updateData: any = { status };
      
      if (consolidatedId !== undefined) {
        updateData.consolidatedId = consolidatedId;
      }
      
      const [updatedSale] = await db
        .update(dailySales)
        .set(updateData)
        .where(eq(dailySales.id, id))
        .returning();
      
      return updatedSale;
    } catch (error) {
      console.error("Error updating daily sales status:", error);
      return undefined;
    }
  }
  
  /**
   * تحديث هدف المبيعات الشهري عندما يتم إضافة مبيعات جديدة
   * نسخة محسنة من وظيفة updateTargetWithSales
   */
  private async updateMonthlyTargetFromSales(sales: DailySales): Promise<void> {
    try {
      // استخراج الشهر والسنة من تاريخ المبيعات
      const saleDate = new Date(sales.date);
      const month = saleDate.getMonth() + 1; // تحويل الشهر من 0-11 إلى 1-12
      const year = saleDate.getFullYear();
      
      // البحث عن الهدف الشهري المطابق للفرع والشهر والسنة
      const target = await this.getMonthlyTargetByBranchAndDate(sales.branchId, month, year);
      
      // إذا لم يوجد هدف مطابق، نخرج من الدالة
      if (!target) {
        console.log(`No target found for branch ${sales.branchId} in ${month}/${year}`);
        return;
      }
      
      // الحصول على جميع المبيعات لهذا الفرع في هذا الشهر
      const startOfMonthDate = new Date(year, month - 1, 1);
      const endOfMonthDate = new Date(year, month, 0);
      
      // تنسيق التواريخ باستخدام طريقة بديلة عن format
      const startDate = startOfMonthDate.toISOString().split('T')[0];
      const endDate = endOfMonthDate.toISOString().split('T')[0];
      
      console.log(`Fetching sales for branch ${sales.branchId} from ${startDate} to ${endDate}`);
      
      const monthlySales = await this.getDailySalesByBranchAndDateRange(
        sales.branchId,
        startDate,
        endDate
      );
      
      // تجميع إجمالي المبيعات لهذا الشهر
      const totalMonthlySales = monthlySales.reduce(
        (total, sale) => total + (sale.totalSales || 0),
        0
      );
      
      // حساب المبيعات الشهرية قبل إضافة المبيعات الحالية
      const previousMonthlySales = totalMonthlySales - sales.totalSales;
      
      // حساب النسب المئوية للإنجاز
      const previousPercentage = (previousMonthlySales / target.targetAmount) * 100;
      const currentPercentage = (totalMonthlySales / target.targetAmount) * 100;
      
      console.log(`Branch ${sales.branchId} target achievement: ${previousPercentage.toFixed(1)}% -> ${currentPercentage.toFixed(1)}%`);
      
      // إنشاء نشاط لتتبع التحديث
      await this.createActivity({
        userId: sales.cashierId,
        action: "target_update_from_sales",
        details: { 
          branchId: sales.branchId, 
          month, 
          year, 
          saleAmount: sales.totalSales,
          totalMonthlySales,
          targetAmount: target.targetAmount,
          previousPercentage: previousPercentage,
          currentPercentage: currentPercentage
        },
        branchId: sales.branchId,
        timestamp: new Date()
      });
      
      // علامات إنجاز الهدف التي نريد تتبعها
      const milestones = [50, 75, 90, 100];
      
      // فحص ما إذا تم تجاوز أي من علامات الإنجاز بالمبيعات الجديدة
      for (const milestone of milestones) {
        if (currentPercentage >= milestone && previousPercentage < milestone) {
          console.log(`Milestone achieved: ${milestone}% for branch ${sales.branchId}`);
          
          // تحديد نوع الإشعار بناءً على المرحلة
          const notificationType = milestone >= 100 ? "success" : "info";
          
          // إنشاء إشعار للجميع
          await this.createNotification({
            userId: null, // للجميع
            title: `تم تحقيق ${milestone}% من الهدف الشهري`,
            message: `الفرع ${sales.branchId} حقق ${currentPercentage.toFixed(1)}% من هدف شهر ${month}/${year}`,
            type: notificationType,
            timestamp: new Date(),
            link: "/targets"
          });
          
          // اخرج من الحلقة بعد إنشاء الإشعار الأول الملائم
          break;
        }
      }
      
    } catch (error) {
      console.error("Error updating monthly target from sales:", error);
    }
  }

  // Activities
  async getActivities(limit?: number): Promise<Activity[]> {
    const query = db.select().from(activities).orderBy(desc(activities.timestamp));
    
    if (limit) {
      return query.limit(limit);
    }
    
    return query;
  }

  async getActivitiesByBranch(branchId: number, limit?: number): Promise<Activity[]> {
    const query = db
      .select()
      .from(activities)
      .where(eq(activities.branchId, branchId))
      .orderBy(desc(activities.timestamp));
    
    if (limit) {
      return query.limit(limit);
    }
    
    return query;
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [newActivity] = await db.insert(activities).values(activity).returning();
    return newActivity;
  }

  // Notifications
  async getNotifications(limit?: number): Promise<Notification[]> {
    const query = db.select().from(notifications).orderBy(desc(notifications.timestamp));
    
    if (limit) {
      return query.limit(limit);
    }
    
    return query;
  }

  async getNotificationsByUser(userId?: number, limit?: number): Promise<Notification[]> {
    let query;
    
    if (userId) {
      query = db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.timestamp));
    } else {
      query = db
        .select()
        .from(notifications)
        .orderBy(desc(notifications.timestamp));
    }
    
    if (limit) {
      return query.limit(limit);
    }
    
    return query;
  }

  async getUnreadNotificationsByUser(userId?: number, limit?: number): Promise<Notification[]> {
    let query;
    
    if (userId) {
      query = db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
          )
        )
        .orderBy(desc(notifications.timestamp));
    } else {
      query = db
        .select()
        .from(notifications)
        .where(eq(notifications.isRead, false))
        .orderBy(desc(notifications.timestamp));
    }
    
    if (limit) {
      return query.limit(limit);
    }
    
    return query;
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const [updatedNotification] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    
    return updatedNotification || undefined;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  // Dashboard Stats
  async getDashboardStats(branchId: number, date: Date): Promise<DashboardStats> {
    const formattedDate = format(date, 'yyyy-MM-dd');
    const currentMonth = date.getMonth() + 1;
    const currentYear = date.getFullYear();
    
    // الحصول على مبيعات اليوم
    const dailySalesData = await this.getDailySalesByBranchAndDate(branchId, formattedDate);
    const dailySalesTotal = dailySalesData.reduce((sum, sale) => sum + sale.totalSales, 0);
    
    // الحصول على الهدف الشهري
    const monthlyTarget = await this.getMonthlyTargetByBranchAndDate(branchId, currentMonth, currentYear);
    
    // حساب الهدف اليومي استناداً إلى نمط التوزيع أو القسمة البسيطة
    let dailyTarget = 0;
    if (monthlyTarget) {
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      dailyTarget = monthlyTarget.targetAmount / daysInMonth;
    }
    
    // الحصول على المبيعات الشهرية حتى الآن
    const startOfMonthDate = format(startOfMonth(date), 'yyyy-MM-dd');
    const endOfMonthDate = format(endOfMonth(date), 'yyyy-MM-dd');
    const monthlySalesData = await this.getDailySalesByBranchAndDateRange(branchId, startOfMonthDate, endOfMonthDate);
    const monthlySalesTotal = monthlySalesData.reduce((sum, sale) => sum + sale.totalSales, 0);
    
    // حساب توزيع وسائل الدفع
    const totalCash = dailySalesData.reduce((sum, sale) => sum + sale.totalCashSales, 0);
    const totalNetwork = dailySalesData.reduce((sum, sale) => {
      // إذا كان الحقل الجديد متوفر، استخدمه. وإلا، اجمع القيم القديمة
      if (typeof sale.totalNetworkSales !== 'undefined') {
        return sum + sale.totalNetworkSales;
      } else {
        // التحويل من النظام القديم - نستخدم قيمة صفر
        return sum + 0;
      }
    }, 0);
    
    const total = totalCash + totalNetwork;
    
    // حساب متوسط قيمة الفاتورة وعدد المعاملات
    const totalTransactions = dailySalesData.reduce((sum, sale) => sum + sale.totalTransactions, 0);
    const averageTicket = totalTransactions > 0 ? dailySalesTotal / totalTransactions : 0;
    
    // حساب إجمالي فرق النقدية (الفائض أو العجز)
    const totalCashDiscrepancy = dailySalesData.reduce((sum, sale) => {
      // تأكد من أن حقل discrepancy موجود وليس null
      return sum + (sale.discrepancy !== null && sale.discrepancy !== undefined ? sale.discrepancy : 0);
    }, 0);
    
    return {
      dailySales: dailySalesTotal,
      dailyTarget,
      dailyTargetPercentage: dailyTarget > 0 ? (dailySalesTotal / dailyTarget) * 100 : 0,
      monthlyTargetAmount: monthlyTarget?.targetAmount || 0,
      monthlySalesAmount: monthlySalesTotal,
      monthlyTargetPercentage: monthlyTarget?.targetAmount ? (monthlySalesTotal / monthlyTarget.targetAmount) * 100 : 0,
      averageTicket,
      totalTransactions,
      cashDiscrepancy: totalCashDiscrepancy,
      paymentMethodsBreakdown: {
        cash: { 
          amount: totalCash, 
          percentage: total > 0 ? (totalCash / total) * 100 : 0 
        },
        network: { 
          amount: totalNetwork, 
          percentage: total > 0 ? (totalNetwork / total) * 100 : 0 
        }
      }
    };
  }
  
  // وظائف المبيعات اليومية المجمعة
  async getConsolidatedDailySales(): Promise<ConsolidatedDailySales[]> {
    try {
      return await db.select().from(consolidatedDailySales)
        .orderBy(desc(consolidatedDailySales.date));
    } catch (error) {
      console.error("Error in getConsolidatedDailySales:", error);
      return [];
    }
  }
  
  async getConsolidatedDailySalesByBranch(branchId: number): Promise<ConsolidatedDailySales[]> {
    try {
      console.log(`🔍 طلب المبيعات المجمعة للفرع ${branchId === 0 ? 'جميع الفروع' : branchId}`);
      
      let consolidatedSales: ConsolidatedDailySales[];
      
      // إذا كان branchId يساوي 0، فهذا يعني جميع الفروع (بدون تصفية)
      if (branchId === 0) {
        consolidatedSales = await db.select().from(consolidatedDailySales)
          .orderBy(desc(consolidatedDailySales.date));
      } else {
        // فلترة حسب الفرع المحدد
        consolidatedSales = await db.select().from(consolidatedDailySales)
          .where(eq(consolidatedDailySales.branchId, branchId))
          .orderBy(desc(consolidatedDailySales.date));
      }
      
      // إذا كان طلب جميع الفروع، نقوم بإثراء البيانات بمعلومات الفروع
      if (branchId === 0 && consolidatedSales.length > 0) {
        // استخراج قائمة بمعرفات الفروع
        const branchIds = [...new Set(consolidatedSales.map(sale => sale.branchId))];
        
        // استعلام عن معلومات الفروع
        const branchesData = await db.select().from(branches)
          .where(sql`${branches.id} IN (${branchIds.join(',')})`);
        
        // إنشاء خريطة للفروع لسهولة الوصول
        const branchMap = new Map();
        branchesData.forEach(branch => {
          branchMap.set(branch.id, branch);
        });
        
        // إضافة معلومات الفروع إلى بيانات المبيعات
        const enrichedSales = consolidatedSales.map(sale => {
          const branch = branchMap.get(sale.branchId);
          return {
            ...sale,
            branchName: branch ? branch.name : `فرع #${sale.branchId}`,
            branchLocation: branch ? branch.location : null
          };
        });
        
        return enrichedSales;
      }
      
      return consolidatedSales;
    } catch (error) {
      console.error("Error in getConsolidatedDailySalesByBranch:", error);
      return [];
    }
  }
  
  async getConsolidatedDailySalesByDate(date: string): Promise<ConsolidatedDailySales[]> {
    try {
      return await db.select().from(consolidatedDailySales)
        .where(eq(consolidatedDailySales.date, date))
        .orderBy(consolidatedDailySales.branchId);
    } catch (error) {
      console.error("Error in getConsolidatedDailySalesByDate:", error);
      return [];
    }
  }
  
  async getConsolidatedDailySalesById(id: number): Promise<ConsolidatedDailySales | undefined> {
    try {
      const result = await db.select().from(consolidatedDailySales)
        .where(eq(consolidatedDailySales.id, id));
      
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error("Error in getConsolidatedDailySalesById:", error);
      return undefined;
    }
  }
  
  /**
   * تجميع اليوميات الفردية للفرع والتاريخ المحدد
   * @param branchId معرف الفرع
   * @param date التاريخ
   * @param userId معرف المستخدم الذي يقوم بالتجميع
   * @returns اليومية المجمعة الجديدة
   */
  async consolidateDailySales(branchId: number, date: string, userId: number): Promise<ConsolidatedDailySales | undefined> {
    try {
      // 1. جلب اليوميات الفردية للفرع والتاريخ
      const dailySalesData = await db.select().from(dailySales).where(
        and(
          eq(dailySales.branchId, branchId),
          eq(dailySales.date, date),
          eq(dailySales.status, "approved")
        )
      );
      
      // 2. إذا لم تكن هناك يوميات مقبولة، نرجع خطأ
      if (dailySalesData.length === 0) {
        console.error("No approved daily sales to consolidate");
        return undefined;
      }
      
      // 3. التحقق مما إذا كانت اليومية المجمعة موجودة
      const existingConsolidated = await db.select().from(consolidatedDailySales).where(
        and(
          eq(consolidatedDailySales.branchId, branchId),
          eq(consolidatedDailySales.date, date)
        )
      );
      
      // 4. إذا كانت موجودة، نعيدها
      if (existingConsolidated.length > 0) {
        return existingConsolidated[0];
      }
      
      // 5. تجميع البيانات
      let totalCashSales = 0;
      let totalNetworkSales = 0;
      let totalSales = 0;
      let totalTransactions = 0;
      let totalDiscrepancy = 0;
      
      dailySalesData.forEach(sale => {
        totalCashSales += sale.totalCashSales || 0;
        totalNetworkSales += sale.totalNetworkSales || 0;
        totalSales += sale.totalSales || 0;
        totalTransactions += sale.totalTransactions || 0;
        totalDiscrepancy += sale.discrepancy || 0;
      });
      
      // 6. إنشاء اليومية المجمعة
      const newConsolidatedSales = {
        date,
        branchId,
        status: "open",
        totalCashSales,
        totalNetworkSales,
        totalSales,
        totalTransactions,
        totalDiscrepancy,
        createdBy: userId,
        createdAt: new Date(),
        closedBy: null,
        closedAt: null,
        notes: null
      };
      
      // 7. حفظ اليومية المجمعة في قاعدة البيانات
      const result = await db.insert(consolidatedDailySales)
        .values(newConsolidatedSales)
        .returning();
      
      if (result.length === 0) {
        throw new Error("Failed to create consolidated sales record");
      }
      
      const consolidatedId = result[0].id;
      
      // 8. تحديث حالة اليوميات الفردية
      for (const sale of dailySalesData) {
        await db.update(dailySales)
          .set({
            status: "consolidated",
            consolidatedId
          })
          .where(eq(dailySales.id, sale.id));
      }
      
      // 9. إرجاع اليومية المجمعة
      return result[0];
    } catch (error) {
      console.error("Error in consolidateDailySales:", error);
      return undefined;
    }
  }
  
  /**
   * إغلاق اليومية المجمعة
   * @param id معرف اليومية المجمعة
   * @param userId معرف المستخدم الذي يقوم بالإغلاق
   * @returns اليومية المجمعة بعد الإغلاق
   */
  async closeConsolidatedDailySales(id: number, userId: number): Promise<ConsolidatedDailySales | undefined> {
    try {
      // 1. جلب اليومية المجمعة
      const consolidatedSales = await this.getConsolidatedDailySalesById(id);
      
      if (!consolidatedSales) {
        console.error(`Consolidated sales record with ID ${id} not found`);
        return undefined;
      }
      
      // 2. التحقق من أن اليومية ليست مغلقة بالفعل
      if (consolidatedSales.status === "closed") {
        console.log(`Consolidated sales record with ID ${id} is already closed`);
        return consolidatedSales;
      }
      
      // 3. تحديث حالة اليومية المجمعة
      const result = await db.update(consolidatedDailySales)
        .set({
          status: "closed",
          closedBy: userId,
          closedAt: new Date()
        })
        .where(eq(consolidatedDailySales.id, id))
        .returning();
      
      if (result.length === 0) {
        throw new Error(`Failed to close consolidated sales record with ID ${id}`);
      }
      
      return result[0];
    } catch (error) {
      console.error("Error in closeConsolidatedDailySales:", error);
      return undefined;
    }
  }
  
  /**
   * ترحيل اليومية المجمعة إلى الحسابات
   * تقوم هذه الدالة بتحديث حالة اليومية المجمعة لتصبح "مرحلة" وتسجيل من قام بالترحيل
   * @param id معرف اليومية المجمعة
   * @param userId معرف المستخدم الذي يقوم بالترحيل
   * @returns اليومية المجمعة بعد الترحيل
   */
  async transferConsolidatedDailySales(id: number, userId: number): Promise<ConsolidatedDailySales | undefined> {
    try {
      // 1. جلب اليومية المجمعة
      const consolidatedSales = await this.getConsolidatedDailySalesById(id);
      
      if (!consolidatedSales) {
        console.error(`Consolidated sales record with ID ${id} not found`);
        return undefined;
      }
      
      // 2. التحقق من أن اليومية ليست مرحلة بالفعل
      if (consolidatedSales.status === "transferred") {
        console.log(`Consolidated sales record with ID ${id} is already transferred`);
        return consolidatedSales;
      }
      
      // 3. التحقق من أن اليومية مغلقة (لا يمكن ترحيل يومية غير مغلقة)
      if (consolidatedSales.status !== "closed") {
        console.error(`Cannot transfer unconsolidated sales record with ID ${id}. Status must be 'closed'`);
        return undefined;
      }
      
      // 4. تحديث حالة اليومية المجمعة
      const result = await db.update(consolidatedDailySales)
        .set({
          status: "transferred",
          transferredBy: userId,
          transferredAt: new Date()
        })
        .where(eq(consolidatedDailySales.id, id))
        .returning();
      
      if (result.length === 0) {
        throw new Error(`Failed to transfer consolidated sales record with ID ${id}`);
      }
      
      // 5. إنشاء نشاط لتتبع عملية الترحيل
      await this.createActivity({
        userId,
        action: "transfer_consolidated_sales",
        details: { 
          consolidatedId: id,
          date: consolidatedSales.date,
          branchId: consolidatedSales.branchId,
          totalAmount: consolidatedSales.totalSales
        },
        branchId: consolidatedSales.branchId,
        timestamp: new Date()
      });
      
      return result[0];
    } catch (error) {
      console.error("Error in transferConsolidatedDailySales:", error);
      return undefined;
    }
  }

  async initializeDemoData(): Promise<void> {
    // تحقق مما إذا كانت البيانات موجودة بالفعل
    const [userCount] = await db.select({ count: sql`count(*)` }).from(users);
    
    if (userCount.count > 0) {
      console.log("البيانات التجريبية موجودة بالفعل، تخطي التهيئة");
      return;
    }
    
    // إنشاء مستخدم المسؤول
    await this.createUser({
      username: "admin",
      password: "admin123",
      name: "أحمد محمد",
      role: "admin",
      email: "admin@butterbakery.com",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=80&q=80",
      isActive: true
    });
    
    // ...باقي شيفرة إضافة البيانات التجريبية كما في الملف الأصلي
  }

  // ==== وظائف نظام المكافآت والحوافز ====
  
  // نظام النقاط والمكافآت
  async getUserRewardPoints(userId: number): Promise<RewardPoints | undefined> {
    const result = await db.query.rewardPoints.findFirst({
      where: eq(rewardPoints.userId, userId)
    });
    return result;
  }
  
  async updateUserRewardPoints(userId: number, points: number): Promise<RewardPoints | undefined> {
    // البحث عن نقاط المستخدم
    let userPoints = await this.getUserRewardPoints(userId);
    
    // إذا لم تكن موجودة، نقوم بإنشائها
    if (!userPoints) {
      const newUserPoints = await db.insert(rewardPoints).values({
        userId,
        points: 0,
        availablePoints: 0,
        totalEarnedPoints: 0,
        lastUpdated: new Date()
      }).returning();
      
      userPoints = newUserPoints[0];
    }
    
    // تحديث النقاط
    const updatedPoints = await db.update(rewardPoints)
      .set({
        points: userPoints.points + points,
        availablePoints: userPoints.availablePoints + (points > 0 ? points : 0), // نضيف فقط للنقاط المتاحة إذا كانت إضافة وليست خصم
        totalEarnedPoints: userPoints.totalEarnedPoints + (points > 0 ? points : 0), // نضيف فقط للنقاط المكتسبة الإجمالية إذا كانت إضافة
        lastUpdated: new Date()
      })
      .where(eq(rewardPoints.id, userPoints.id))
      .returning();
    
    return updatedPoints[0];
  }
  
  async addRewardPointsHistory(history: InsertRewardPointsHistory): Promise<RewardPointsHistory> {
    const result = await db.insert(rewardPointsHistory).values(history).returning();
    
    // تحديث رصيد نقاط المستخدم
    await this.updateUserRewardPoints(history.userId, history.points);
    
    return result[0];
  }
  
  async getRewardPointsHistory(userId: number, limit?: number): Promise<RewardPointsHistory[]> {
    const query = db.select().from(rewardPointsHistory)
      .where(eq(rewardPointsHistory.userId, userId))
      .orderBy(desc(rewardPointsHistory.timestamp));
    
    if (limit) {
      query.limit(limit);
    }
    
    return await query;
  }
  
  async getRewardPointsHistoryByType(userId: number, type: string): Promise<RewardPointsHistory[]> {
    return await db.select().from(rewardPointsHistory)
      .where(and(
        eq(rewardPointsHistory.userId, userId),
        eq(rewardPointsHistory.type, type)
      ))
      .orderBy(desc(rewardPointsHistory.timestamp));
  }
  
  // الإنجازات
  async getAllAchievements(): Promise<Achievement[]> {
    return await db.select().from(achievements)
      .where(eq(achievements.isActive, true))
      .orderBy(achievements.name);
  }
  
  async getAchievement(id: number): Promise<Achievement | undefined> {
    return await db.query.achievements.findFirst({
      where: eq(achievements.id, id)
    });
  }
  
  async getAchievementsByCategory(category: string): Promise<Achievement[]> {
    return await db.select().from(achievements)
      .where(and(
        eq(achievements.category, category),
        eq(achievements.isActive, true)
      ))
      .orderBy(achievements.name);
  }
  
  async createAchievement(achievement: InsertAchievement): Promise<Achievement> {
    const result = await db.insert(achievements).values(achievement).returning();
    return result[0];
  }
  
  async updateAchievement(id: number, achievement: Partial<Achievement>): Promise<Achievement | undefined> {
    const result = await db.update(achievements)
      .set(achievement)
      .where(eq(achievements.id, id))
      .returning();
    
    return result[0];
  }
  
  // إنجازات المستخدمين
  async getUserAchievements(userId: number): Promise<UserAchievement[]> {
    return await db.select().from(userAchievements)
      .where(eq(userAchievements.userId, userId))
      .orderBy(userAchievements.awardedAt);
  }
  
  async assignAchievementToUser(userAchievement: InsertUserAchievement): Promise<UserAchievement> {
    const result = await db.insert(userAchievements).values({
      ...userAchievement,
      awardedAt: new Date(),
      isCompleted: false
    }).returning();
    
    // إنشاء إشعار للمستخدم
    const achievement = await this.getAchievement(userAchievement.achievementId);
    if (achievement) {
      await this.createNotification({
        userId: userAchievement.userId,
        title: "إنجاز جديد متاح!",
        message: `تم إضافة إنجاز جديد: ${achievement.name}. اكتشف كيفية تحقيقه!`,
        type: "info",
        timestamp: new Date(),
        link: "/achievements"
      });
    }
    
    return result[0];
  }
  
  async updateUserAchievementProgress(userId: number, achievementId: number, progress: number): Promise<UserAchievement | undefined> {
    // البحث عن إنجاز المستخدم
    const userAchievement = await db.query.userAchievements.findFirst({
      where: and(
        eq(userAchievements.userId, userId),
        eq(userAchievements.achievementId, achievementId)
      )
    });
    
    if (!userAchievement) return undefined;
    
    // تحديث التقدم
    const newProgress = Math.min(Math.max(progress, 0), 100); // ضمان أن التقدم بين 0 و 100
    const updates: Partial<UserAchievement> = { progress: newProgress };
    
    // إذا وصل التقدم إلى 100%، نعتبره مكتملاً
    if (newProgress >= 100 && !userAchievement.isCompleted) {
      updates.isCompleted = true;
      updates.completedAt = new Date();
      
      // الحصول على تفاصيل الإنجاز لإضافة النقاط
      const achievement = await this.getAchievement(achievementId);
      if (achievement) {
        // إضافة النقاط المكافأة إلى حساب المستخدم
        await this.addRewardPointsHistory({
          userId,
          points: achievement.pointsValue,
          type: "earned",
          reason: `تم تحقيق إنجاز: ${achievement.name}`,
          relatedEntityType: "achievement",
          relatedEntityId: achievementId,
          date: new Date(),
          timestamp: new Date(),
          status: "active",
          branchId: null
        });
        
        // إنشاء إشعار بتحقيق الإنجاز
        await this.createNotification({
          userId,
          title: "🎉 تهانينا! تم تحقيق إنجاز",
          message: `لقد حققت إنجاز "${achievement.name}" وكسبت ${achievement.pointsValue} نقطة!`,
          type: "success",
          timestamp: new Date(),
          link: "/achievements"
        });
      }
    }
    
    const result = await db.update(userAchievements)
      .set(updates)
      .where(eq(userAchievements.id, userAchievement.id))
      .returning();
    
    return result[0];
  }
  
  async completeUserAchievement(userId: number, achievementId: number): Promise<UserAchievement | undefined> {
    return this.updateUserAchievementProgress(userId, achievementId, 100);
  }
  
  // المكافآت
  async getAllRewards(): Promise<Reward[]> {
    return await db.select().from(rewards)
      .where(eq(rewards.isActive, true))
      .orderBy(rewards.pointsCost);
  }
  
  async getReward(id: number): Promise<Reward | undefined> {
    return await db.query.rewards.findFirst({
      where: eq(rewards.id, id)
    });
  }
  
  async getRewardsByCategory(category: string): Promise<Reward[]> {
    return await db.select().from(rewards)
      .where(and(
        eq(rewards.category, category),
        eq(rewards.isActive, true)
      ))
      .orderBy(rewards.pointsCost);
  }
  
  async createReward(reward: InsertReward): Promise<Reward> {
    const result = await db.insert(rewards).values(reward).returning();
    
    // إنشاء إشعار للجميع بالمكافأة الجديدة
    await this.createNotification({
      userId: null, // للجميع
      title: "مكافأة جديدة متاحة!",
      message: `تم إضافة مكافأة جديدة: ${reward.name}. تكلفة: ${reward.pointsCost} نقطة.`,
      type: "info",
      timestamp: new Date(),
      link: "/rewards"
    });
    
    return result[0];
  }
  
  async updateReward(id: number, reward: Partial<Reward>): Promise<Reward | undefined> {
    const result = await db.update(rewards)
      .set(reward)
      .where(eq(rewards.id, id))
      .returning();
    
    return result[0];
  }
  
  // استبدال المكافآت
  async getUserRedemptions(userId: number): Promise<RewardRedemption[]> {
    return await db.select().from(rewardRedemptions)
      .where(eq(rewardRedemptions.userId, userId))
      .orderBy(desc(rewardRedemptions.redeemedAt));
  }
  
  async createRedemption(redemption: InsertRewardRedemption): Promise<RewardRedemption> {
    // التحقق من أن المستخدم لديه نقاط كافية
    const userPoints = await this.getUserRewardPoints(redemption.userId);
    const reward = await this.getReward(redemption.rewardId);
    
    if (!userPoints || !reward) {
      throw new Error("المستخدم أو المكافأة غير موجودة");
    }
    
    if (userPoints.availablePoints < redemption.pointsUsed) {
      throw new Error("النقاط غير كافية لاستبدال هذه المكافأة");
    }
    
    // إنشاء طلب الاستبدال
    const result = await db.insert(rewardRedemptions).values({
      ...redemption,
      redeemedAt: new Date(),
      status: "pending"
    }).returning();
    
    // إنشاء إشعار للمسؤولين بطلب الاستبدال الجديد
    await this.createNotification({
      userId: null, // للمسؤولين
      title: "طلب استبدال مكافأة جديد",
      message: `قام مستخدم برقم ${redemption.userId} بطلب استبدال مكافأة "${reward.name}".`,
      type: "info",
      timestamp: new Date(),
      link: "/redemptions"
    });
    
    return result[0];
  }
  
  async approveRedemption(id: number, approverId: number): Promise<RewardRedemption | undefined> {
    const redemption = await db.query.rewardRedemptions.findFirst({
      where: eq(rewardRedemptions.id, id)
    });
    
    if (!redemption || redemption.status !== "pending") return undefined;
    
    // تحديث حالة الاستبدال
    const result = await db.update(rewardRedemptions)
      .set({
        status: "approved",
        approvedBy: approverId,
        approvedAt: new Date()
      })
      .where(eq(rewardRedemptions.id, id))
      .returning();
    
    if (result.length === 0) return undefined;
    
    // خصم النقاط من رصيد المستخدم
    await this.addRewardPointsHistory({
      userId: redemption.userId,
      points: -redemption.pointsUsed, // قيمة سالبة للخصم
      type: "redeemed",
      reason: `استبدال مكافأة بمعرف ${redemption.rewardId}`,
      relatedEntityType: "redemption",
      relatedEntityId: redemption.id,
      date: new Date(),
      timestamp: new Date(),
      status: "active",
      branchId: null
    });
    
    // الحصول على اسم المكافأة لإضافتها في الإشعار
    const reward = await this.getReward(redemption.rewardId);
    
    // إنشاء إشعار للمستخدم بالموافقة على طلب الاستبدال
    await this.createNotification({
      userId: redemption.userId,
      title: "تمت الموافقة على طلب الاستبدال",
      message: reward 
        ? `تمت الموافقة على طلب استبدال مكافأة "${reward.name}".` 
        : "تمت الموافقة على طلب استبدال المكافأة.",
      type: "success",
      timestamp: new Date(),
      link: "/rewards"
    });
    
    return result[0];
  }
  
  async rejectRedemption(id: number, notes?: string): Promise<RewardRedemption | undefined> {
    const redemption = await db.query.rewardRedemptions.findFirst({
      where: eq(rewardRedemptions.id, id)
    });
    
    if (!redemption || redemption.status !== "pending") return undefined;
    
    // تحديث حالة الاستبدال
    const result = await db.update(rewardRedemptions)
      .set({
        status: "rejected",
        notes: notes || redemption.notes
      })
      .where(eq(rewardRedemptions.id, id))
      .returning();
    
    if (result.length === 0) return undefined;
    
    // الحصول على اسم المكافأة لإضافتها في الإشعار
    const reward = await this.getReward(redemption.rewardId);
    
    // إنشاء إشعار للمستخدم برفض طلب الاستبدال
    await this.createNotification({
      userId: redemption.userId,
      title: "تم رفض طلب الاستبدال",
      message: reward
        ? `تم رفض طلب استبدال مكافأة "${reward.name}". ${notes ? `السبب: ${notes}` : ''}`
        : `تم رفض طلب استبدال المكافأة. ${notes ? `السبب: ${notes}` : ''}`,
      type: "error",
      timestamp: new Date(),
      link: "/rewards"
    });
    
    return result[0];
  }
  
  async getRedemptionsByStatus(status: string): Promise<RewardRedemption[]> {
    return await db.select().from(rewardRedemptions)
      .where(eq(rewardRedemptions.status, status))
      .orderBy(rewardRedemptions.redeemedAt);
  }
  
  // لوحة المتصدرين
  async getActiveLeaderboards(): Promise<Leaderboard[]> {
    return await db.select().from(leaderboards)
      .where(eq(leaderboards.isActive, true))
      .orderBy(leaderboards.endDate);
  }
  
  async getLeaderboard(id: number): Promise<Leaderboard | undefined> {
    return await db.query.leaderboards.findFirst({
      where: eq(leaderboards.id, id)
    });
  }
  
  async createLeaderboard(leaderboard: InsertLeaderboard): Promise<Leaderboard> {
    const result = await db.insert(leaderboards).values({
      ...leaderboard,
      createdAt: new Date()
    }).returning();
    
    // إنشاء إشعار للجميع باللوحة الجديدة
    await this.createNotification({
      userId: null, // للجميع
      title: "لوحة متصدرين جديدة متاحة!",
      message: `تم إنشاء لوحة متصدرين جديدة: "${leaderboard.name}". تبدأ من ${new Date(leaderboard.startDate).toLocaleDateString('ar-SA')}.`,
      type: "info",
      timestamp: new Date(),
      link: "/leaderboards"
    });
    
    return result[0];
  }
  
  async updateLeaderboardResults(leaderboardId: number, results: InsertLeaderboardResult[]): Promise<LeaderboardResult[]> {
    const updatedResults: LeaderboardResult[] = [];
    
    for (const result of results) {
      const existingResult = await db.query.leaderboardResults.findFirst({
        where: and(
          eq(leaderboardResults.leaderboardId, leaderboardId),
          eq(leaderboardResults.userId, result.userId)
        )
      });
      
      // تحويل score و metricValue إلى نص للتوافق مع نوع البيانات في قاعدة البيانات
      const formattedResult = {
        ...result,
        score: result.score.toString(),
        metricValue: result.metricValue.toString()
      };
      
      let currentResult;
      
      if (existingResult) {
        // تحديث النتيجة الموجودة
        const updated = await db.update(leaderboardResults)
          .set({
            ...formattedResult,
            updateDate: new Date()
          })
          .where(eq(leaderboardResults.id, existingResult.id))
          .returning();
        
        currentResult = updated[0];
      } else {
        // إنشاء نتيجة جديدة
        const inserted = await db.insert(leaderboardResults).values({
          ...formattedResult,
          leaderboardId,
          updateDate: new Date()
        }).returning();
        
        currentResult = inserted[0];
      }
      
      updatedResults.push(currentResult);
      
      // إذا كان المركز في المراكز الثلاثة الأولى، نرسل إشعاراً للمستخدم
      if (result.rank <= 3) {
        // الحصول على معلومات اللوحة
        const leaderboard = await this.getLeaderboard(leaderboardId);
        if (leaderboard) {
          let rankText = "";
          if (result.rank === 1) rankText = "الأول 🥇";
          else if (result.rank === 2) rankText = "الثاني 🥈";
          else if (result.rank === 3) rankText = "الثالث 🥉";
          
          await this.createNotification({
            userId: result.userId,
            title: "تهانينا! أنت من المتصدرين",
            message: `لقد حصلت على المركز ${rankText} في لوحة المتصدرين "${leaderboard.name}".`,
            type: "success",
            timestamp: new Date(),
            link: "/leaderboards"
          });
        }
      }
    }
    
    return updatedResults;
  }
  
  async getLeaderboardResults(leaderboardId: number): Promise<LeaderboardResult[]> {
    return await db.select().from(leaderboardResults)
      .where(eq(leaderboardResults.leaderboardId, leaderboardId))
      .orderBy(leaderboardResults.rank);
  }
  
  async getUserLeaderboardRank(leaderboardId: number, userId: number): Promise<LeaderboardResult | undefined> {
    return await db.query.leaderboardResults.findFirst({
      where: and(
        eq(leaderboardResults.leaderboardId, leaderboardId),
        eq(leaderboardResults.userId, userId)
      )
    });
  }
  
  // وظائف تحليل انخفاض المبيعات
  async analyzeSalesDrops(branchId: number, period: string): Promise<any> {
    const today = new Date();
    let startDate = new Date();
    let endDate = new Date();
    
    // تحديد الفترة الزمنية للتحليل
    if (period === 'week') {
      // الأسبوع الماضي
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
    } else if (period === 'month') {
      // الشهر الماضي
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    } else if (period === 'quarter') {
      // الربع الماضي
      startDate = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
    } else {
      // افتراضياً: آخر أسبوع
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
    }
    
    // الحصول على المبيعات خلال الفترة المحددة
    const formattedStartDate = format(startDate, 'yyyy-MM-dd');
    const formattedEndDate = format(endDate, 'yyyy-MM-dd');
    
    const sales = await this.getDailySalesByBranchAndDateRange(
      branchId, 
      formattedStartDate, 
      formattedEndDate
    );
    
    // تنظيم المبيعات حسب اليوم
    const salesByDay: { [key: string]: { total: number, count: number, average: number, date: string } } = {};
    
    for (const sale of sales) {
      const dateStr = sale.date;
      if (!salesByDay[dateStr]) {
        salesByDay[dateStr] = { total: 0, count: 0, average: 0, date: dateStr };
      }
      
      salesByDay[dateStr].total += sale.totalSales;
      salesByDay[dateStr].count += 1;
    }
    
    // حساب المتوسط اليومي
    for (const day in salesByDay) {
      salesByDay[day].average = salesByDay[day].total / salesByDay[day].count;
    }
    
    // حساب متوسط المبيعات للفترة كاملة
    const dailyTotals = Object.values(salesByDay).map(day => day.total);
    const overallAverage = dailyTotals.reduce((sum, total) => sum + total, 0) / dailyTotals.length || 0;
    
    // تحديد أيام انخفاض المبيعات (أقل من 70% من المتوسط)
    const dropThreshold = overallAverage * 0.7;
    const salesDrops = Object.values(salesByDay)
      .filter(day => day.total < dropThreshold)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // تحليل الانخفاضات وتقديم التوصيات
    const analysis = {
      totalDays: Object.keys(salesByDay).length,
      dropDays: salesDrops.length,
      dropPercentage: (salesDrops.length / Object.keys(salesByDay).length) * 100,
      worstDay: salesDrops.length > 0 ? 
        salesDrops.reduce((worst, current) => current.total < worst.total ? current : worst, salesDrops[0]) : 
        null,
      consecutiveDrops: this.checkForConsecutiveDrops(salesDrops),
      weekdayPattern: this.checkForWeekdayPattern(salesDrops),
      recommendations: this.generateDropRecommendations(salesDrops, overallAverage)
    };
    
    return {
      period,
      overallAverage,
      dropThreshold,
      salesDrops,
      salesByDay: Object.values(salesByDay),
      analysis
    };
  }
  
  // توليد توصيات لانخفاض المبيعات
  private generateDropRecommendations(salesDrops: any[], average: number): any[] {
    if (salesDrops.length === 0) return [];
    
    const recommendations = [];
    
    // فحص الاتجاه: هل الانخفاضات متتالية؟
    const consecutiveDrops = this.checkForConsecutiveDrops(salesDrops);
    if (consecutiveDrops.isConsecutive) {
      recommendations.push({
        type: 'warning',
        title: 'انخفاض مستمر في المبيعات',
        message: `لوحظ انخفاض مستمر في المبيعات لمدة ${consecutiveDrops.days} أيام متتالية.`,
        actions: [
          'مراجعة استراتيجية التسعير',
          'تخطيط حملة ترويجية عاجلة',
          'تحليل سلوك المنافسين'
        ]
      });
    }
    
    // فحص الموسمية: هل أيام محددة من الأسبوع متكررة في الانخفاضات؟
    const weekdayPattern = this.checkForWeekdayPattern(salesDrops);
    if (weekdayPattern.hasPattern) {
      recommendations.push({
        type: 'insight',
        title: 'نمط أسبوعي في انخفاض المبيعات',
        message: `يوجد انخفاض منتظم في المبيعات في أيام ${weekdayPattern.days.join(', ')}.`,
        actions: [
          'تخطيط عروض خاصة في هذه الأيام',
          'مراجعة جدول الموظفين في هذه الأيام',
          'دراسة أنماط حركة العملاء'
        ]
      });
    }
    
    // فحص شدة الانخفاض: هل هناك أيام بانخفاض شديد؟
    const severeDrops = salesDrops.filter(day => day.total < (average * 0.5));
    if (severeDrops.length > 0) {
      recommendations.push({
        type: 'critical',
        title: 'انخفاض حاد في المبيعات',
        message: `هناك ${severeDrops.length} أيام بانخفاض شديد في المبيعات (أقل من 50% من المتوسط).`,
        actions: [
          'مراجعة العوامل الخارجية (الطقس، الأحداث المحلية)',
          'التحقق من جودة المنتجات والخدمة',
          'إطلاق خصومات مستهدفة'
        ]
      });
    }
    
    // إضافة توصيات عامة
    recommendations.push({
      type: 'general',
      title: 'تحسين الأداء العام',
      message: 'توصيات لتحسين الأداء العام للمبيعات.',
      actions: [
        'مراجعة تجربة العملاء الشاملة',
        'تدريب فريق المبيعات على تقنيات البيع الفعالة',
        'تحليل ملاحظات العملاء واستجابة السوق'
      ]
    });
    
    return recommendations;
  }
  
  // فحص وجود انخفاضات متتالية
  private checkForConsecutiveDrops(salesDrops: any[]): { isConsecutive: boolean, days: number } {
    if (salesDrops.length < 2) return { isConsecutive: false, days: 0 };
    
    // ترتيب الأيام حسب التاريخ
    const sortedDrops = [...salesDrops].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let maxConsecutive = 1;
    let currentConsecutive = 1;
    
    for (let i = 1; i < sortedDrops.length; i++) {
      const prevDate = new Date(sortedDrops[i-1].date);
      const currDate = new Date(sortedDrops[i].date);
      
      // التحقق إذا كان اليوم التالي مباشرة
      const diffTime = Math.abs(currDate.getTime() - prevDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 1;
      }
    }
    
    return { isConsecutive: maxConsecutive >= 3, days: maxConsecutive };
  }
  
  // فحص وجود نمط في أيام الأسبوع
  private checkForWeekdayPattern(salesDrops: any[]): { hasPattern: boolean, days: string[] } {
    if (salesDrops.length < 3) return { hasPattern: false, days: [] };
    
    // عد تكرار كل يوم من أيام الأسبوع
    const weekdayCounts: Record<string, number> = {
      'الأحد': 0, 'الاثنين': 0, 'الثلاثاء': 0, 'الأربعاء': 0, 'الخميس': 0, 'الجمعة': 0, 'السبت': 0
    };
    
    const arabicDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    
    for (const drop of salesDrops) {
      const date = new Date(drop.date);
      const dayOfWeek = date.getDay();
      weekdayCounts[arabicDays[dayOfWeek]]++;
    }
    
    // تحديد الأيام التي تحتوي على نمط (تكرار لأكثر من مرة)
    const patternDays = Object.entries(weekdayCounts)
      .filter(([_, count]) => count >= 2)
      .map(([day, _]) => day);
    
    return { hasPattern: patternDays.length > 0, days: patternDays };
  }
  
  async generateSalesAlerts(branchId: number, threshold: number): Promise<any[]> {
    // الحصول على بيانات المبيعات للأسبوع الماضي
    const today = new Date();
    const oneWeekAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
    
    const formattedStartDate = format(oneWeekAgo, 'yyyy-MM-dd');
    const formattedEndDate = format(today, 'yyyy-MM-dd');
    
    const sales = await this.getDailySalesByBranchAndDateRange(
      branchId,
      formattedStartDate,
      formattedEndDate
    );
    
    if (sales.length === 0) return [];
    
    // الحصول على أحدث هدف شهري
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const monthlyTarget = await this.getMonthlyTargetByBranchAndDate(branchId, currentMonth, currentYear);
    
    if (!monthlyTarget) return [];
    
    // حساب متوسط المبيعات اليومية
    const totalSales = sales.reduce((sum, sale) => sum + sale.totalSales, 0);
    const avgDailySales = totalSales / sales.length;
    
    // حساب الهدف اليومي (تقسيم الهدف الشهري على عدد أيام الشهر)
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const dailyTarget = monthlyTarget.targetAmount / daysInMonth;
    
    // التحقق إذا كان متوسط المبيعات أقل من الحد الأدنى للهدف
    const alerts = [];
    
    if (avgDailySales < (dailyTarget * (threshold / 100))) {
      // إنشاء تنبيه بانخفاض المبيعات
      const percentageOfTarget = (avgDailySales / dailyTarget) * 100;
      
      const branch = await this.getBranch(branchId);
      const branchName = branch ? branch.name : `فرع #${branchId}`;
      
      alerts.push({
        id: `sales-drop-${Date.now()}`,
        branchId,
        branchName,
        date: format(today, 'yyyy-MM-dd'),
        severity: percentageOfTarget < 50 ? 'critical' : percentageOfTarget < 70 ? 'high' : 'medium',
        type: 'sales_drop',
        metric: {
          current: avgDailySales,
          expected: dailyTarget,
          difference: dailyTarget - avgDailySales,
          percentageChange: ((dailyTarget - avgDailySales) / dailyTarget) * 100
        },
        recommendations: [
          {
            id: "rec1",
            text: "إجراء تخفيضات مؤقتة على المنتجات الأكثر مبيعاً",
            priority: "high",
            impact: 80
          },
          {
            id: "rec2",
            text: "تنشيط حملة تسويق على وسائل التواصل الاجتماعي",
            priority: "medium",
            impact: 65
          },
          {
            id: "rec3",
            text: "مراجعة جدول توزيع الموظفين لضمان تغطية أوقات الذروة",
            priority: "medium",
            impact: 60
          }
        ],
        details: `متوسط المبيعات اليومي (${avgDailySales.toFixed(2)}) أقل من ${threshold}% من الهدف اليومي (${dailyTarget.toFixed(2)})`
      });
      
      // إنشاء إشعار بالانخفاض
      await this.createNotification({
        userId: null, // للمسؤولين
        title: "⚠️ تنبيه: انخفاض المبيعات",
        message: `انخفاض المبيعات في ${branchName} إلى ${percentageOfTarget.toFixed(1)}% من الهدف اليومي.`,
        type: "warning",
        timestamp: new Date(),
        link: "/smart-alerts"
      });
    }
    
    return alerts;
  }
  
  async analyzeCashierPerformanceTrends(branchId: number, period: string): Promise<any[]> {
    // الحصول على الكاشيرين في الفرع
    const users = await this.getUsers();
    const cashiers = users.filter(user => user.role === 'cashier' && user.branchId === branchId);
    
    if (cashiers.length === 0) return [];
    
    // تحديد نطاق التاريخ للتحليل
    const today = new Date();
    let startDate = new Date();
    
    if (period === 'week') {
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
    } else if (period === 'month') {
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    } else if (period === 'quarter') {
      startDate = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
    } else {
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
    }
    
    const formattedStartDate = format(startDate, 'yyyy-MM-dd');
    const formattedEndDate = format(today, 'yyyy-MM-dd');
    
    // تحليل أداء كل كاشير
    const cashiersAnalysis = [];
    
    for (const cashier of cashiers) {
      // الحصول على مبيعات الكاشير خلال الفترة
      const sales = await this.getDailySalesByBranchAndDateRange(
        branchId,
        formattedStartDate,
        formattedEndDate
      ).then(allSales => allSales.filter(sale => sale.cashierId === cashier.id));
      
      if (sales.length === 0) continue;
      
      // حساب متوسط المبيعات ونسبة الانحراف والمتوسط
      const totalSales = sales.reduce((sum, sale) => sum + sale.totalSales, 0);
      const avgSales = totalSales / sales.length;
      
      const totalTransactions = sales.reduce((sum, sale) => sum + sale.totalTransactions, 0);
      const avgTransactions = totalTransactions / sales.length;
      
      const avgTicket = totalSales / totalTransactions;
      
      // حساب متوسط الانحراف في المبالغ النقدية (القيمة المطلقة)
      const totalDiscrepancy = sales.reduce((sum, sale) => {
        return sum + (sale.discrepancy ? Math.abs(sale.discrepancy) : 0);
      }, 0);
      const avgDiscrepancy = sales.length > 0 ? totalDiscrepancy / sales.length : 0;
      
      // تحليل الاتجاه: هل أداء الكاشير يتحسن أو يتراجع؟
      const trend = this.analyzeCashierTrend(sales);
      
      // تحليل نقاط القوة والضعف
      const strengths = [];
      const weaknesses = [];
      
      if (avgTicket > 30) strengths.push('قيمة متوسط التذكرة مرتفعة');
      if (avgDiscrepancy < 5) strengths.push('انحراف نقدي منخفض');
      if (trend.salesTrend === 'up') strengths.push('اتجاه المبيعات في تحسن');
      
      if (avgTicket < 20) weaknesses.push('قيمة متوسط التذكرة منخفضة');
      if (avgDiscrepancy > 20) weaknesses.push('انحراف نقدي مرتفع');
      if (trend.salesTrend === 'down') weaknesses.push('اتجاه المبيعات في تراجع');
      
      // تقديم توصيات تدريبية
      const trainingRecommendations = [];
      
      if (avgTicket < 20) {
        trainingRecommendations.push('تدريب على تقنيات البيع المتقاطع لزيادة قيمة الطلب');
      }
      
      if (avgDiscrepancy > 20) {
        trainingRecommendations.push('تدريب على التعامل مع النقد والتدقيق في العمليات');
      }
      
      if (trend.salesTrend === 'down') {
        trainingRecommendations.push('تدريب على مهارات خدمة العملاء والبيع المتقدمة');
      }
      
      // حساب نقاط المكافأة المقترحة
      const suggestedRewardPoints = this.calculateSuggestedRewardPoints(
        avgSales, avgDiscrepancy, trend.consistency
      );
      
      cashiersAnalysis.push({
        cashierId: cashier.id,
        cashierName: cashier.name,
        period,
        metrics: {
          totalSales,
          totalTransactions,
          averageDailySales: avgSales,
          averageTicket: avgTicket,
          averageDiscrepancy: avgDiscrepancy,
          daysLogged: sales.length
        },
        trends: trend,
        performance: {
          strengths,
          weaknesses,
          trainingRecommendations,
          suggestedRewardPoints
        }
      });
    }
    
    return cashiersAnalysis;
  }
  
  // تحليل اتجاه أداء الكاشير
  private analyzeCashierTrend(sales: DailySales[]): any {
    if (sales.length < 3) {
      return { salesTrend: 'stable', consistency: 'medium' };
    }
    
    // ترتيب المبيعات حسب التاريخ
    const sortedSales = [...sales].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // تقسيم البيانات إلى النصف الأول والنصف الثاني لتحليل الاتجاه
    const halfIndex = Math.floor(sortedSales.length / 2);
    const firstHalf = sortedSales.slice(0, halfIndex);
    const secondHalf = sortedSales.slice(halfIndex);
    
    // حساب متوسط المبيعات لكل نصف
    const firstHalfAvg = firstHalf.reduce((sum, sale) => sum + sale.totalSales, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, sale) => sum + sale.totalSales, 0) / secondHalf.length;
    
    // تحديد الاتجاه
    let salesTrend = 'stable';
    if (secondHalfAvg > (firstHalfAvg * 1.1)) {
      salesTrend = 'up';
    } else if (secondHalfAvg < (firstHalfAvg * 0.9)) {
      salesTrend = 'down';
    }
    
    // تحليل الاتساق
    const allSales = sortedSales.map(sale => sale.totalSales);
    const mean = allSales.reduce((sum, val) => sum + val, 0) / allSales.length;
    
    // حساب الانحراف المعياري
    const squaredDiffs = allSales.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / squaredDiffs.length;
    const stdDev = Math.sqrt(avgSquaredDiff);
    
    // حساب معامل الاختلاف (CV)
    const cv = (stdDev / mean) * 100;
    
    // تحديد الاتساق بناءً على معامل الاختلاف
    let consistency = 'medium';
    if (cv < 15) {
      consistency = 'high';
    } else if (cv > 30) {
      consistency = 'low';
    }
    
    return {
      salesTrend,
      consistency,
      changePercentage: ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100,
      coefficientOfVariation: cv
    };
  }
  
  // حساب نقاط المكافأة المقترحة
  private calculateSuggestedRewardPoints(avgSales: number, avgDiscrepancy: number, consistency: string): number {
    let points = 0;
    
    // نقاط بناءً على متوسط المبيعات
    if (avgSales > 1000) {
      points += 30;
    } else if (avgSales > 500) {
      points += 20;
    } else if (avgSales > 250) {
      points += 10;
    }
    
    // نقاط بناءً على متوسط الانحراف
    if (avgDiscrepancy < 5) {
      points += 20;
    } else if (avgDiscrepancy < 20) {
      points += 10;
    }
    
    // نقاط بناءً على الاتساق
    if (consistency === 'high') {
      points += 20;
    } else if (consistency === 'medium') {
      points += 10;
    }
    
    return points;
  }

  // تم نقل هذه الوظيفة إلى آخر الملف

  // وظائف صندوق النقدية
  // Branch Cash Box - صندوق النقدية للفرع
  async getBranchCashBox(branchId: number): Promise<BranchCashBox | undefined> {
    try {
      const result = await db.select().from(branchCashBox).where(eq(branchCashBox.branchId, branchId));
      if (result.length === 0) return undefined;
      return result[0];
    } catch (error) {
      console.error("خطأ في الحصول على صندوق النقدية:", error);
      return undefined;
    }
  }

  async createBranchCashBox(cashBox: InsertBranchCashBox): Promise<BranchCashBox> {
    try {
      const result = await db.insert(branchCashBox).values({
        branchId: cashBox.branchId,
        currentBalance: cashBox.currentBalance,
        notes: cashBox.notes || null,
        lastUpdated: new Date()
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error("خطأ في إنشاء صندوق النقدية:", error);
      throw error;
    }
  }

  async updateBranchCashBoxBalance(branchId: number, amount: number): Promise<BranchCashBox | undefined> {
    try {
      const cashBox = await this.getBranchCashBox(branchId);
      if (!cashBox) return undefined;
      
      const result = await db.update(branchCashBox)
        .set({
          currentBalance: cashBox.currentBalance + amount,
          lastUpdated: new Date()
        })
        .where(eq(branchCashBox.branchId, branchId))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("خطأ في تحديث رصيد صندوق النقدية:", error);
      return undefined;
    }
  }

  // Cash Box Transactions - معاملات صندوق النقدية
  async getCashBoxTransactions(branchId: number): Promise<CashBoxTransaction[]> {
    try {
      const result = await db.select()
        .from(cashBoxTransactions)
        .where(eq(cashBoxTransactions.branchId, branchId))
        .orderBy(desc(cashBoxTransactions.date));
      
      return result;
    } catch (error) {
      console.error("خطأ في الحصول على معاملات صندوق النقدية:", error);
      return [];
    }
  }

  async getCashBoxTransactionsByDate(branchId: number, startDate: string, endDate: string): Promise<CashBoxTransaction[]> {
    try {
      const result = await db.select()
        .from(cashBoxTransactions)
        .where(
          and(
            eq(cashBoxTransactions.branchId, branchId),
            gte(cashBoxTransactions.date, startDate),
            lte(cashBoxTransactions.date, endDate)
          )
        )
        .orderBy(desc(cashBoxTransactions.date));
      
      return result;
    } catch (error) {
      console.error("خطأ في الحصول على معاملات صندوق النقدية بالتاريخ:", error);
      return [];
    }
  }

  async getCashBoxTransactionById(id: number): Promise<CashBoxTransaction | undefined> {
    try {
      const result = await db.select()
        .from(cashBoxTransactions)
        .where(eq(cashBoxTransactions.id, id));
      
      if (result.length === 0) return undefined;
      return result[0];
    } catch (error) {
      console.error("خطأ في الحصول على معاملة صندوق النقدية:", error);
      return undefined;
    }
  }

  async createCashBoxTransaction(transaction: InsertCashBoxTransaction): Promise<CashBoxTransaction> {
    try {
      const result = await db.insert(cashBoxTransactions).values({
        branchId: transaction.branchId,
        cashBoxId: transaction.cashBoxId,
        amount: transaction.amount,
        type: transaction.type,
        source: transaction.source,
        date: transaction.date,
        notes: transaction.notes || null,
        status: transaction.status || "completed",
        timestamp: new Date(),
        createdBy: transaction.createdBy,
        sourceId: transaction.sourceId || null,
        referenceNumber: transaction.referenceNumber || null
      }).returning();
      
      // تحديث رصيد صندوق النقدية
      let amountChange = 0;
      if (transaction.type === 'deposit') {
        amountChange = transaction.amount;
      } else if (transaction.type === 'withdrawal' || transaction.type === 'transfer_to_hq') {
        amountChange = -transaction.amount;
      }
      
      if (amountChange !== 0) {
        await this.updateBranchCashBoxBalance(transaction.branchId, amountChange);
      }
      
      return result[0];
    } catch (error) {
      console.error("خطأ في إنشاء معاملة صندوق النقدية:", error);
      throw error;
    }
  }

  // Cash Transfers to HQ - التحويلات النقدية للمركز الرئيسي
  async getCashTransfersToHQ(branchId: number): Promise<CashTransferToHQ[]> {
    try {
      const result = await db.select()
        .from(cashTransfersToHQ)
        .where(eq(cashTransfersToHQ.branchId, branchId))
        .orderBy(desc(cashTransfersToHQ.date));
      
      return result;
    } catch (error) {
      console.error("خطأ في الحصول على التحويلات النقدية:", error);
      return [];
    }
  }

  async getCashTransferToHQById(id: number): Promise<CashTransferToHQ | undefined> {
    try {
      const result = await db.select()
        .from(cashTransfersToHQ)
        .where(eq(cashTransfersToHQ.id, id));
      
      if (result.length === 0) return undefined;
      return result[0];
    } catch (error) {
      console.error("خطأ في الحصول على تحويل نقدي:", error);
      return undefined;
    }
  }

  async createCashTransferToHQ(transfer: InsertCashTransferToHQ): Promise<CashTransferToHQ> {
    try {
      const result = await db.insert(cashTransfersToHQ).values({
        branchId: transfer.branchId,
        amount: transfer.amount,
        transferMethod: transfer.transferMethod,
        status: "pending",
        date: transfer.date,
        notes: transfer.notes || null,
        referenceNumber: transfer.referenceNumber || null,
        transferredBy: transfer.transferredBy,
        transactionId: transfer.transactionId,
        approvedBy: null,
        approvedAt: null,
        rejectionReason: null,
        attachmentUrl: transfer.attachmentUrl || null
      }).returning();
      
      // إنشاء معاملة صندوق نقدية مرتبطة
      const transaction = await this.createCashBoxTransaction({
        branchId: transfer.branchId,
        cashBoxId: transfer.cashBoxId,
        amount: transfer.amount,
        type: 'transfer_to_hq',
        source: 'transfer',
        createdBy: transfer.transferredBy,
        date: transfer.date,
        notes: `تحويل إلى المركز الرئيسي: ${transfer.notes || ""}`,
        referenceNumber: `HQ-TR-${result[0].id}`
      });
      
      // تحديث معرف المعاملة في التحويل
      await db.update(cashTransfersToHQ)
        .set({ transactionId: transaction.id })
        .where(eq(cashTransfersToHQ.id, result[0].id));
      
      // الحصول على السجل المحدث
      const updatedResult = await this.getCashTransferToHQById(result[0].id);
      
      return updatedResult!;
    } catch (error) {
      console.error("خطأ في إنشاء تحويل نقدي:", error);
      throw error;
    }
  }

  async approveCashTransferToHQ(id: number, approverId: number): Promise<CashTransferToHQ | undefined> {
    try {
      const transfer = await this.getCashTransferToHQById(id);
      if (!transfer) return undefined;
      
      if (transfer.status !== "pending") {
        console.log(`التحويل النقدي ${id} ليس في حالة الانتظار`);
        return transfer;
      }
      
      const result = await db.update(cashTransfersToHQ)
        .set({
          status: "approved",
          approvedBy: approverId,
          approvedAt: new Date()
        })
        .where(eq(cashTransfersToHQ.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("خطأ في الموافقة على التحويل النقدي:", error);
      return undefined;
    }
  }

  async rejectCashTransferToHQ(id: number, notes: string): Promise<CashTransferToHQ | undefined> {
    try {
      const transfer = await this.getCashTransferToHQById(id);
      if (!transfer) return undefined;
      
      if (transfer.status !== "pending") {
        console.log(`التحويل النقدي ${id} ليس في حالة الانتظار`);
        return transfer;
      }
      
      // إعادة المبلغ إلى رصيد صندوق النقدية للفرع
      await this.createCashBoxTransaction({
        branchId: transfer.branchId,
        cashBoxId: 0, // سيتم تعديله لاحقًا
        amount: transfer.amount,
        type: 'deposit',
        source: 'manual',
        createdBy: 1, // النظام
        date: new Date().toISOString().slice(0, 10),
        notes: `إعادة مبلغ تحويل مرفوض #${id}: ${notes}`,
        referenceNumber: `REJ-${id}`
      });
      
      const result = await db.update(cashTransfersToHQ)
        .set({
          status: "rejected",
          rejectionReason: notes
        })
        .where(eq(cashTransfersToHQ.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("خطأ في رفض التحويل النقدي:", error);
      return undefined;
    }
  }

  async getCashTransfersByStatus(status: string): Promise<CashTransferToHQ[]> {
    try {
      const result = await db.select()
        .from(cashTransfersToHQ)
        .where(eq(cashTransfersToHQ.status, status))
        .orderBy(desc(cashTransfersToHQ.date));
      
      return result;
    } catch (error) {
      console.error("خطأ في الحصول على التحويلات النقدية حسب الحالة:", error);
      return [];
    }
  }

  // Cash Box Reports - تقارير صندوق النقدية
  async getBranchCashBoxBalance(branchId: number): Promise<number> {
    try {
      const cashBox = await this.getBranchCashBox(branchId);
      return cashBox ? cashBox.currentBalance : 0;
    } catch (error) {
      console.error("خطأ في الحصول على رصيد صندوق النقدية:", error);
      return 0;
    }
  }

  async getCashBoxReport(branchId: number, startDate: string, endDate: string): Promise<any> {
    try {
      // الحصول على معاملات الصندوق خلال الفترة المحددة
      const transactions = await this.getCashBoxTransactionsByDate(branchId, startDate, endDate);
      
      // الحصول على صندوق النقدية
      const cashBox = await this.getBranchCashBox(branchId);
      
      // تجميع البيانات حسب النوع
      const deposits = transactions.filter(t => t.type === 'deposit');
      const withdrawals = transactions.filter(t => t.type === 'withdrawal');
      const transfers = transactions.filter(t => t.type === 'transfer_to_hq');
      
      // حساب الإجماليات
      const totalDeposits = deposits.reduce((sum, t) => sum + t.amount, 0);
      const totalWithdrawals = withdrawals.reduce((sum, t) => sum + t.amount, 0);
      const totalTransfers = transfers.reduce((sum, t) => sum + t.amount, 0);
      
      // حساب الإجماليات حسب المصدر
      const depositsFromSales = deposits.filter(t => t.source === 'daily_sales').reduce((sum, t) => sum + t.amount, 0);
      const depositsManual = deposits.filter(t => t.source === 'manual').reduce((sum, t) => sum + t.amount, 0);
      
      // الرصيد الافتتاحي (تقريبي): الرصيد الحالي - الإيداعات + السحوبات + التحويلات
      const currentBalance = cashBox ? cashBox.currentBalance : 0;
      const estimatedOpeningBalance = currentBalance - totalDeposits + totalWithdrawals + totalTransfers;
      
      return {
        branchId,
        periodStart: startDate,
        periodEnd: endDate,
        currentBalance,
        estimatedOpeningBalance,
        totalTransactions: transactions.length,
        summary: {
          totalDeposits,
          totalWithdrawals,
          totalTransfers,
          netChange: totalDeposits - totalWithdrawals - totalTransfers
        },
        depositsBySource: {
          fromSales: depositsFromSales,
          manual: depositsManual,
          other: totalDeposits - depositsFromSales - depositsManual
        },
        transactions,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error("خطأ في إنشاء تقرير صندوق النقدية:", error);
      throw error;
    }
  }

  async getCashTransfersReport(branchId: number, startDate: string, endDate: string): Promise<any> {
    try {
      // الحصول على التحويلات خلال الفترة المحددة
      const transfers = await db.select()
        .from(cashTransfersToHQ)
        .where(
          and(
            eq(cashTransfersToHQ.branchId, branchId),
            gte(cashTransfersToHQ.date, startDate),
            lte(cashTransfersToHQ.date, endDate)
          )
        )
        .orderBy(desc(cashTransfersToHQ.date));
      
      // تجميع البيانات حسب الحالة
      const approved = transfers.filter(t => t.status === 'approved');
      const pending = transfers.filter(t => t.status === 'pending');
      const rejected = transfers.filter(t => t.status === 'rejected');
      
      // حساب الإجماليات
      const totalApproved = approved.reduce((sum, t) => sum + t.amount, 0);
      const totalPending = pending.reduce((sum, t) => sum + t.amount, 0);
      const totalRejected = rejected.reduce((sum, t) => sum + t.amount, 0);
      const totalTransfersAmount = transfers.reduce((sum, t) => sum + t.amount, 0);
      
      // تجميع البيانات حسب وسيلة التحويل
      const byTransferMethod: Record<string, { count: number, amount: number }> = {};
      
      transfers.forEach(t => {
        if (!byTransferMethod[t.transferMethod]) {
          byTransferMethod[t.transferMethod] = { count: 0, amount: 0 };
        }
        byTransferMethod[t.transferMethod].count++;
        byTransferMethod[t.transferMethod].amount += t.amount;
      });
      
      return {
        branchId,
        periodStart: startDate,
        periodEnd: endDate,
        totalTransfers: transfers.length,
        summary: {
          totalTransfersAmount,
          totalApproved,
          totalPending,
          totalRejected
        },
        statusSummary: {
          approved: {
            count: approved.length,
            amount: totalApproved
          },
          pending: {
            count: pending.length,
            amount: totalPending
          },
          rejected: {
            count: rejected.length,
            amount: totalRejected
          }
        },
        byTransferMethod,
        transfers,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error("خطأ في إنشاء تقرير التحويلات النقدية:", error);
      throw error;
    }
  }

  // Process Daily Sales to Cash Box - تحويل المبيعات اليومية إلى صندوق النقدية
  async processDailySalesToCashBox(dailySalesId: number): Promise<CashBoxTransaction | undefined> {
    try {
      // الحصول على بيانات المبيعات اليومية
      const dailySales = await this.getDailySalesById(dailySalesId);
      if (!dailySales) return undefined;
      
      // التحقق من أن المبيعات اليومية لم يتم تحويلها بالفعل
      const existingTransaction = await db.select()
        .from(cashBoxTransactions)
        .where(
          and(
            eq(cashBoxTransactions.source, 'daily_sales'),
            sql`${cashBoxTransactions.referenceNumber} LIKE ${'%DS-' + dailySalesId + '%'}`
          )
        );
      
      if (existingTransaction.length > 0) return existingTransaction[0];
      
      // الحصول على صندوق النقدية للفرع
      let cashBox = await this.getBranchCashBox(dailySales.branchId);
      
      // إنشاء صندوق نقدية للفرع إذا لم يكن موجودًا بالفعل
      if (!cashBox) {
        cashBox = await this.createBranchCashBox({
          branchId: dailySales.branchId,
          currentBalance: 0,
          notes: "تم إنشاؤه تلقائيًا"
        });
      }
      
      // إنشاء معاملة إيداع في صندوق النقدية
      const transaction = await this.createCashBoxTransaction({
        branchId: dailySales.branchId,
        cashBoxId: cashBox.id,
        amount: dailySales.totalCashSales,
        type: 'deposit',
        source: 'daily_sales',
        createdBy: dailySales.cashierId,
        date: dailySales.date,
        notes: `إيداع مبيعات نقدية: ${dailySales.date}`,
        referenceNumber: `DS-${dailySalesId}`
      });
      
      // تحديث حالة المبيعات اليومية
      await this.updateDailySalesStatus(dailySalesId, 'transferred');
      
      return transaction;
    } catch (error) {
      console.error("خطأ في تحويل المبيعات اليومية إلى صندوق النقدية:", error);
      return undefined;
    }
  }
  
  // ----- وظائف مولد موسيقى الطهي التفاعلي -----
  
  /**
   * الحصول على جميع موسيقى الطهي المتاحة
   */
  async getCookingSoundtracks(): Promise<CookingSoundtrack[]> {
    try {
      return await db.select().from(cookingSoundtracks);
    } catch (error) {
      console.error("خطأ في الحصول على موسيقى الطهي:", error);
      return [];
    }
  }
  
  /**
   * الحصول على موسيقى طهي محددة حسب المعرف
   */
  async getCookingSoundtrackById(id: number): Promise<CookingSoundtrack | undefined> {
    try {
      const results = await db
        .select()
        .from(cookingSoundtracks)
        .where(eq(cookingSoundtracks.id, id));
      
      return results.length > 0 ? results[0] : undefined;
    } catch (error) {
      console.error(`خطأ في الحصول على موسيقى الطهي بالمعرف ${id}:`, error);
      return undefined;
    }
  }
  
  /**
   * الحصول على موسيقى الطهي التي أنشأها مستخدم محدد
   */
  async getCookingSoundtracksByUser(userId: number): Promise<CookingSoundtrack[]> {
    try {
      return await db
        .select()
        .from(cookingSoundtracks)
        .where(eq(cookingSoundtracks.userId, userId));
    } catch (error) {
      console.error(`خطأ في الحصول على موسيقى الطهي للمستخدم ${userId}:`, error);
      return [];
    }
  }
  
  /**
   * الحصول على موسيقى الطهي حسب الفرع
   */
  async getCookingSoundtracksByBranch(branchId: number): Promise<CookingSoundtrack[]> {
    try {
      return await db
        .select()
        .from(cookingSoundtracks)
        .where(eq(cookingSoundtracks.branchId, branchId));
    } catch (error) {
      console.error(`خطأ في الحصول على موسيقى الطهي للفرع ${branchId}:`, error);
      return [];
    }
  }
  
  /**
   * الحصول على موسيقى الطهي حسب الحالة المزاجية
   */
  async getCookingSoundtracksByMood(mood: string): Promise<CookingSoundtrack[]> {
    try {
      return await db
        .select()
        .from(cookingSoundtracks)
        .where(eq(cookingSoundtracks.mood, mood));
    } catch (error) {
      console.error(`خطأ في الحصول على موسيقى الطهي بالحالة المزاجية ${mood}:`, error);
      return [];
    }
  }
  
  /**
   * الحصول على موسيقى الطهي حسب نوع الوصفة
   */
  async getCookingSoundtracksByRecipeType(recipeType: string): Promise<CookingSoundtrack[]> {
    try {
      return await db
        .select()
        .from(cookingSoundtracks)
        .where(eq(cookingSoundtracks.recipeType, recipeType));
    } catch (error) {
      console.error(`خطأ في الحصول على موسيقى الطهي لنوع الوصفة ${recipeType}:`, error);
      return [];
    }
  }
  
  /**
   * إنشاء موسيقى طهي جديدة
   */
  async createCookingSoundtrack(soundtrack: InsertCookingSoundtrack): Promise<CookingSoundtrack> {
    try {
      const result = await db
        .insert(cookingSoundtracks)
        .values(soundtrack)
        .returning();
      
      const newSoundtrack = result[0];
      
      // إنشاء نشاط لتتبع إنشاء موسيقى الطهي
      await this.createActivity({
        userId: soundtrack.userId,
        action: "cooking_soundtrack_created",
        details: {
          soundtrackId: newSoundtrack.id,
          name: newSoundtrack.name,
          mood: soundtrack.mood
        },
        branchId: soundtrack.branchId || null,
        timestamp: new Date()
      });
      
      return newSoundtrack;
    } catch (error) {
      console.error("خطأ في إنشاء موسيقى الطهي:", error);
      throw new Error("فشل في إنشاء موسيقى الطهي");
    }
  }
  
  /**
   * تحديث موسيقى طهي موجودة
   */
  async updateCookingSoundtrack(id: number, soundtrack: Partial<CookingSoundtrack>): Promise<CookingSoundtrack | undefined> {
    try {
      // التحقق من وجود موسيقى الطهي
      const existingSoundtrack = await this.getCookingSoundtrackById(id);
      if (!existingSoundtrack) return undefined;
      
      // تحديث موسيقى الطهي
      const result = await db
        .update(cookingSoundtracks)
        .set({
          ...soundtrack,
          updatedAt: new Date()
        })
        .where(eq(cookingSoundtracks.id, id))
        .returning();
      
      if (result.length === 0) return undefined;
      
      // إنشاء نشاط لتتبع تحديث موسيقى الطهي
      await this.createActivity({
        userId: existingSoundtrack.userId,
        action: "cooking_soundtrack_updated",
        details: {
          soundtrackId: id,
          name: existingSoundtrack.name,
          updatedFields: Object.keys(soundtrack)
        },
        branchId: existingSoundtrack.branchId || null,
        timestamp: new Date()
      });
      
      return result[0];
    } catch (error) {
      console.error(`خطأ في تحديث موسيقى الطهي بالمعرف ${id}:`, error);
      return undefined;
    }
  }
  
  /**
   * حذف موسيقى طهي
   */
  async deleteCookingSoundtrack(id: number): Promise<boolean> {
    try {
      // الحصول على موسيقى الطهي قبل الحذف
      const soundtrack = await this.getCookingSoundtrackById(id);
      if (!soundtrack) return false;
      
      // حذف موسيقى الطهي
      const result = await db
        .delete(cookingSoundtracks)
        .where(eq(cookingSoundtracks.id, id));
      
      if (result.rowCount === 0) return false;
      
      // إنشاء نشاط لتتبع حذف موسيقى الطهي
      await this.createActivity({
        userId: soundtrack.userId,
        action: "cooking_soundtrack_deleted",
        details: {
          soundtrackId: id,
          name: soundtrack.name
        },
        branchId: soundtrack.branchId || null,
        timestamp: new Date()
      });
      
      return true;
    } catch (error) {
      console.error(`خطأ في حذف موسيقى الطهي بالمعرف ${id}:`, error);
      return false;
    }
  }
}



/**
 * هذا التعليق كان مخصصًا لتنفيذ دالة getCashierPerformance التي تم إزالتها
 */

// تهيئة كائن التخزين الأساسي
const dbStorage = new DatabaseStorage();
export { dbStorage as storage };