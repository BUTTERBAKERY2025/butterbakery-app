import { pgTable, text, serial, integer, boolean, timestamp, json, real, date, numeric, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { format } from "date-fns";

// User model with roles
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("cashier"), // admin, branch_manager, accountant, supervisor, cashier
  email: text("email"),
  avatar: text("avatar"),
  branchId: integer("branch_id"),
  lastLogin: timestamp("last_login"),
  isActive: boolean("is_active").default(true),
});

// Branch model
export const branches = pgTable("branches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location"),
  managerId: integer("manager_id"),
  isActive: boolean("is_active").default(true),
});

// Monthly target model
export const monthlyTargets = pgTable("monthly_targets", {
  id: serial("id").primaryKey(), 
  branchId: integer("branch_id").notNull(),
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
  targetAmount: real("target_amount").notNull(),
  distributionPattern: json("distribution_pattern"), // JSON object with day weights
  dailyTargets: json("daily_targets").default({}), // JSON object with daily target amounts
  weekdayWeights: json("weekday_weights").default({}), // JSON object with weight per weekday
  specialDays: json("special_days").default([]), // Array of special days (holidays, etc.)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Daily sales model
export const dailySales = pgTable("daily_sales", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull(),
  cashierId: integer("cashier_id").notNull(),
  date: date("date").notNull(),
  shiftType: text("shift_type").notNull().default("morning"), // morning, evening
  shiftStart: timestamp("shift_start").notNull(),
  shiftEnd: timestamp("shift_end"),
  startingCash: real("starting_cash").notNull().default(0), // نقدية بداية الشفت
  totalCashSales: real("total_cash_sales").notNull().default(0),
  totalNetworkSales: real("total_network_sales").notNull().default(0), // مبيعات الشبكات (مدى وغيره)
  totalSales: real("total_sales").notNull().default(0),
  actualCashInRegister: real("actual_cash_in_register"),
  discrepancy: real("discrepancy"),
  totalTransactions: integer("total_transactions").notNull().default(0),
  averageTicket: real("average_ticket"),
  signature: text("signature"), // Base64 encoded signature
  status: text("status").default("pending"), // pending, approved, rejected, transferred, closed
  notes: text("notes"),
  hasDiscrepancyAcknowledgment: boolean("has_discrepancy_acknowledgment").default(false), // توقيع إقرار العجز
  consolidatedId: integer("consolidated_id"), // رقم اليومية المجمعة إذا تم ترحيلها
  isSubmitted: boolean("is_submitted").default(false), // تم ارسال اليومية للمراجعة
  reviewedBy: integer("reviewed_by"), // معرف المستخدم الذي راجع اليومية
  reviewedAt: timestamp("reviewed_at"), // وقت المراجعة
});

// Activities for logging
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  action: text("action").notNull(),
  details: json("details"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  branchId: integer("branch_id"),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // info, warning, error, success
  isRead: boolean("is_read").default(false),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  link: text("link"),
});

// Consolidated daily sales for branch managers
export const consolidatedDailySales = pgTable("consolidated_daily_sales", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull(),
  date: date("date").notNull(),
  totalCashSales: real("total_cash_sales").notNull().default(0),
  totalNetworkSales: real("total_network_sales").notNull().default(0),
  totalSales: real("total_sales").notNull().default(0),
  totalTransactions: integer("total_transactions").notNull().default(0),
  averageTicket: real("average_ticket"),
  totalDiscrepancy: real("total_discrepancy").default(0),
  status: text("status").default("open"), // open, closed
  closedBy: integer("closed_by"), // معرف المستخدم الذي أغلق اليومية المجمعة
  closedAt: timestamp("closed_at"), // وقت إغلاق اليومية المجمعة
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by"), // المستخدم الذي أنشأ اليومية المجمعة
});

// نظام النقاط والمكافآت للموظفين
export const rewardPoints = pgTable("reward_points", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  points: integer("points").notNull().default(0),
  availablePoints: integer("available_points").notNull().default(0), // النقاط المتاحة للاستبدال
  totalEarnedPoints: integer("total_earned_points").notNull().default(0), // إجمالي النقاط المكتسبة
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// سجل نقاط المكافآت وتفاصيل كسبها وصرفها
export const rewardPointsHistory = pgTable("reward_points_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  branchId: integer("branch_id"),
  points: integer("points").notNull(), // يمكن أن تكون موجبة (المكتسبة) أو سالبة (المستخدمة)
  type: text("type").notNull(), // earned, redeemed, expired, adjusted
  reason: text("reason").notNull(), // e.g., "تحقيق هدف المبيعات اليومي", "استبدال إجازة"
  relatedEntityType: text("related_entity_type"), // daily_sales, monthly_target, etc.
  relatedEntityId: integer("related_entity_id"), // معرف الكيان المرتبط
  date: date("date").notNull().defaultNow(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  status: text("status").notNull().default("active"), // active, canceled
});

// إنجازات (Achievements) الموظفين
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // sales, attendance, quality, etc.
  icon: text("icon"),
  pointsValue: integer("points_value").notNull().default(0),
  criteria: json("criteria"), // معايير الحصول على الإنجاز (شروط)
  isActive: boolean("is_active").default(true),
});

// إنجازات المستخدمين (ربط المستخدمين بالإنجازات التي حققوها)
export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  achievementId: integer("achievement_id").notNull(),
  awardedAt: timestamp("awarded_at").notNull().defaultNow(),
  progress: numeric("progress").notNull().default("0"), // نسبة التقدم (0-100)
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
});

// مكافآت يمكن استبدال النقاط بها
export const rewards = pgTable("rewards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  pointsCost: integer("points_cost").notNull(), // تكلفة المكافأة بالنقاط
  category: text("category").notNull(), // time_off, financial, gifts, etc.
  icon: text("icon"),
  isActive: boolean("is_active").default(true),
  availableQuantity: integer("available_quantity"), // الكمية المتاحة (اختياري)
  expiryDate: date("expiry_date"), // تاريخ انتهاء العرض (اختياري)
});

// سجل استبدال المكافآت
export const rewardRedemptions = pgTable("reward_redemptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  rewardId: integer("reward_id").notNull(),
  pointsUsed: integer("points_used").notNull(),
  redeemedAt: timestamp("redeemed_at").notNull().defaultNow(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected, fulfilled
  approvedBy: integer("approved_by"), // الموظف الذي وافق على الطلب
  approvedAt: timestamp("approved_at"),
  notes: text("notes"),
});

// لوحة المتصدرين (Leaderboard)
export const leaderboards = pgTable("leaderboards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // daily, weekly, monthly, quarterly, yearly
  category: text("category").notNull(), // sales, target_achievement, customer_satisfaction
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// نتائج لوحة المتصدرين
export const leaderboardResults = pgTable("leaderboard_results", {
  id: serial("id").primaryKey(),
  leaderboardId: integer("leaderboard_id").notNull(),
  userId: integer("user_id").notNull(),
  branchId: integer("branch_id"),
  rank: integer("rank").notNull(),
  score: numeric("score").notNull().default("0"), // النتيجة/القيمة المستخدمة للتصنيف
  metricName: text("metric_name").notNull(), // اسم المقياس (مبيعات، نسبة تحقيق الهدف، إلخ)
  metricValue: numeric("metric_value").notNull().default("0"), // قيمة المقياس
  updateDate: timestamp("update_date").notNull().defaultNow(),
});

// صندوق النقدية للفرع
export const branchCashBox = pgTable("branch_cash_box", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull(),
  currentBalance: doublePrecision("current_balance").notNull().default(0), // الرصيد الحالي
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  notes: text("notes"),
});

// حركات صندوق النقدية
export const cashBoxTransactions = pgTable("cash_box_transactions", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull(),
  cashBoxId: integer("cash_box_id").notNull(), // معرف صندوق النقدية
  amount: doublePrecision("amount").notNull(), // المبلغ (موجب للإيداع، سالب للسحب)
  type: text("type").notNull(), // deposit, withdrawal, transfer_to_hq
  source: text("source").notNull(), // daily_sales, manual, transfer
  sourceId: integer("source_id"), // معرف المصدر (مثلاً معرف اليومية)
  date: date("date").notNull().defaultNow(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  createdBy: integer("created_by").notNull(), // معرف المستخدم الذي أنشأ الحركة
  status: text("status").notNull().default("completed"), // pending, completed, canceled
  notes: text("notes"),
  referenceNumber: text("reference_number"), // رقم مرجعي للتحويل البنكي
});

// تحويلات النقدية للمركز الرئيسي
export const cashTransfersToHQ = pgTable("cash_transfers_to_hq", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull(),
  amount: doublePrecision("amount").notNull(),
  date: date("date").notNull().defaultNow(),
  transactionId: integer("transaction_id").notNull(), // معرف حركة صندوق النقدية
  transferMethod: text("transfer_method").notNull(), // bank_transfer, cash_delivery, etc.
  bankName: text("bank_name"),
  accountNumber: text("account_number"),
  referenceNumber: text("reference_number"), // رقم مرجعي للتحويل البنكي
  transferredBy: integer("transferred_by").notNull(), // معرف المستخدم الذي أجرى التحويل
  approvedBy: integer("approved_by"), // معرف المستخدم الذي وافق على التحويل
  approvedAt: timestamp("approved_at"),
  status: text("status").notNull().default("pending"), // pending, completed, rejected
  notes: text("notes"),
  attachmentUrl: text("attachment_url"), // رابط إيصال التحويل أو المستند المرفق
});

// مولد موسيقى الطهي التفاعلي
export const cookingSoundtracks = pgTable("cooking_soundtracks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  userId: integer("user_id").notNull(), // المستخدم الذي أنشأ الموسيقى
  branchId: integer("branch_id"), // الفرع المرتبط (اختياري)
  mood: text("mood").notNull(), // الحالة المزاجية: energetic, relaxing, focused, cheerful
  tempo: integer("tempo").notNull(), // السرعة (BPM)
  duration: integer("duration").notNull(), // المدة بالثواني
  ingredients: json("ingredients"), // مكونات الوصفة المرتبطة
  recipeType: text("recipe_type"), // نوع الوصفة
  audioPath: text("audio_path"), // مسار ملف الصوت
  isPublic: boolean("is_public").default(true), // متاح للجميع أم خاص
  tags: json("tags").default([]), // وسوم للبحث
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertBranchSchema = createInsertSchema(branches).omit({ id: true });
// تعديل مخطط إدخال الأهداف الشهرية
export const insertMonthlyTargetSchema = createInsertSchema(monthlyTargets)
  .omit({ id: true })
  .extend({
    // ضمان معالجة الحقول JSON بشكل صحيح
    weekdayWeights: z.record(z.string(), z.number()).nullable().optional().default({}),
    dailyTargets: z.record(z.string(), z.number()).nullable().optional().default({}),
    specialDays: z.array(
      z.object({
        date: z.union([z.string(), z.date()]),
        name: z.string(),
        multiplier: z.number(),
        type: z.enum(['holiday', 'promotion', 'event'])
      })
    ).nullable().optional().default([]),
    distributionPattern: z.any().nullable().optional().default({})
  });

// تعديل مخطط إدخال المبيعات اليومية لجعل بعض الحقول اختيارية
export const insertDailySalesSchema = createInsertSchema(dailySales)
  .omit({ id: true })
  .extend({
    // قبول تاريخ أو نص لحقول التوقيت
    shiftStart: z.union([z.date(), z.string()]),
    shiftEnd: z.union([z.date(), z.string(), z.null()]).nullable().optional(),
    
    // نوع الشفت
    shiftType: z.enum(["morning", "evening"]).default("morning"), // شفت صباحي، شفت مسائي
    
    // حقول المبيعات والمعاملات المالية
    startingCash: z.number().default(0), // نقدية بداية الشفت
    signature: z.string().optional().nullable(),
    actualCashInRegister: z.number().optional().nullable(),
    discrepancy: z.number().optional().nullable(),
    averageTicket: z.number().optional().nullable(),
    totalCashSales: z.number().default(0),
    totalNetworkSales: z.number().default(0),
    totalSales: z.number().default(0),
    totalTransactions: z.number().default(0),
    
    // حقول إضافية
    notes: z.string().optional().nullable(),
    status: z.enum(["pending", "approved", "rejected", "transferred", "closed"]).default("pending"),
    hasDiscrepancyAcknowledgment: z.boolean().nullable().optional(),
    consolidatedId: z.number().nullable().optional()
  });

export const insertActivitySchema = createInsertSchema(activities).omit({ id: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true });

// مخطط إدخال اليوميات المجمعة
export const insertConsolidatedDailySalesSchema = createInsertSchema(consolidatedDailySales)
  .omit({ id: true })
  .extend({
    totalCashSales: z.number().default(0),
    totalNetworkSales: z.number().default(0),
    totalSales: z.number().default(0),
    totalTransactions: z.number().default(0),
    averageTicket: z.number().optional().nullable(),
    totalDiscrepancy: z.number().default(0),
    status: z.enum(["open", "closed"]).default("open"),
    notes: z.string().optional().nullable(),
  });

// مخططات إدخال نظام المكافآت والحوافز
export const insertRewardPointsSchema = createInsertSchema(rewardPoints)
  .omit({ id: true })
  .extend({
    points: z.number().default(0),
    availablePoints: z.number().default(0),
    totalEarnedPoints: z.number().default(0),
  });

export const insertRewardPointsHistorySchema = createInsertSchema(rewardPointsHistory)
  .omit({ id: true })
  .extend({
    type: z.enum(["earned", "redeemed", "expired", "adjusted"]),
    points: z.number(),
    date: z.union([z.date(), z.string()]).default(new Date()),
  });

export const insertAchievementSchema = createInsertSchema(achievements)
  .omit({ id: true })
  .extend({
    category: z.enum(["sales", "attendance", "quality", "customer_service", "team_work"]),
    criteria: z.record(z.string(), z.any()).nullable().optional(),
  });

export const insertUserAchievementSchema = createInsertSchema(userAchievements)
  .omit({ id: true })
  .extend({
    progress: z.number().min(0).max(100).default(0),
    completedAt: z.union([z.date(), z.string(), z.null()]).nullable().optional(),
  });

export const insertRewardSchema = createInsertSchema(rewards)
  .omit({ id: true })
  .extend({
    category: z.enum(["time_off", "financial", "gifts", "training", "other"]),
    availableQuantity: z.number().nullable().optional(),
    expiryDate: z.union([z.date(), z.string(), z.null()]).nullable().optional(),
  });

export const insertRewardRedemptionSchema = createInsertSchema(rewardRedemptions)
  .omit({ id: true })
  .extend({
    status: z.enum(["pending", "approved", "rejected", "fulfilled"]).default("pending"),
    approvedAt: z.union([z.date(), z.string(), z.null()]).nullable().optional(),
  });

export const insertLeaderboardSchema = createInsertSchema(leaderboards)
  .omit({ id: true })
  .extend({
    type: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]),
    category: z.enum(["sales", "target_achievement", "customer_satisfaction", "general"]),
    startDate: z.union([z.date(), z.string()]),
    endDate: z.union([z.date(), z.string()]),
  });

export const insertLeaderboardResultSchema = createInsertSchema(leaderboardResults)
  .omit({ id: true })
  .extend({
    rank: z.number().int().positive(),
    score: z.number(),
    metricValue: z.number(),
  });

// مخططات إدخال صندوق النقدية
export const insertBranchCashBoxSchema = createInsertSchema(branchCashBox)
  .omit({ id: true })
  .extend({
    currentBalance: z.number().default(0),
    notes: z.string().nullable().optional(),
  });

export const insertCashBoxTransactionSchema = createInsertSchema(cashBoxTransactions)
  .omit({ id: true })
  .extend({
    amount: z.number(),
    type: z.enum(["deposit", "withdrawal", "transfer_to_hq"]),
    source: z.enum(["daily_sales", "manual", "transfer"]),
    sourceId: z.number().nullable().optional(),
    date: z.union([z.date(), z.string()]).default(new Date()),
    referenceNumber: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  });

export const insertCashTransferToHQSchema = createInsertSchema(cashTransfersToHQ)
  .omit({ id: true })
  .extend({
    amount: z.number().positive("يجب أن يكون المبلغ أكبر من صفر"),
    transferMethod: z.enum(["bank_transfer", "cash_delivery", "other"]),
    bankName: z.string().nullable().optional(),
    accountNumber: z.string().nullable().optional(),
    referenceNumber: z.string().nullable().optional(),
    status: z.enum(["pending", "completed", "rejected"]).default("pending"),
    approvedAt: z.union([z.date(), z.string(), z.null()]).nullable().optional(),
    notes: z.string().nullable().optional(),
    attachmentUrl: z.string().nullable().optional(),
  });

// مخطط إدخال موسيقى الطهي التفاعلية
export const insertCookingSoundtrackSchema = createInsertSchema(cookingSoundtracks)
  .omit({ id: true })
  .extend({
    mood: z.enum(["energetic", "relaxing", "focused", "cheerful"]),
    tempo: z.number().int().min(60).max(200),
    duration: z.number().int().min(30).max(600),
    ingredients: z.array(z.string()).nullable().optional(),
    recipeType: z.enum(["bread", "pastry", "cake", "cookie", "other"]).nullable().optional(),
    tags: z.array(z.string()).nullable().optional().default([]),
  });

// Login schema
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Branch = typeof branches.$inferSelect;
export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type MonthlyTarget = typeof monthlyTargets.$inferSelect;
export type InsertMonthlyTarget = z.infer<typeof insertMonthlyTargetSchema>;
export type DailySales = typeof dailySales.$inferSelect;
export type InsertDailySales = z.infer<typeof insertDailySalesSchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type ConsolidatedDailySales = typeof consolidatedDailySales.$inferSelect;
export type InsertConsolidatedDailySales = z.infer<typeof insertConsolidatedDailySalesSchema>;
export type Login = z.infer<typeof loginSchema>;

// أنواع بيانات نظام المكافآت والحوافز
export type RewardPoints = typeof rewardPoints.$inferSelect;
export type InsertRewardPoints = z.infer<typeof insertRewardPointsSchema>;
export type RewardPointsHistory = typeof rewardPointsHistory.$inferSelect;
export type InsertRewardPointsHistory = z.infer<typeof insertRewardPointsHistorySchema>;
export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;
export type Reward = typeof rewards.$inferSelect;
export type InsertReward = z.infer<typeof insertRewardSchema>;
export type RewardRedemption = typeof rewardRedemptions.$inferSelect;
export type InsertRewardRedemption = z.infer<typeof insertRewardRedemptionSchema>;
export type Leaderboard = typeof leaderboards.$inferSelect;
export type InsertLeaderboard = z.infer<typeof insertLeaderboardSchema>;
export type LeaderboardResult = typeof leaderboardResults.$inferSelect;
export type InsertLeaderboardResult = z.infer<typeof insertLeaderboardResultSchema>;

// أنواع بيانات صندوق النقدية
export type BranchCashBox = typeof branchCashBox.$inferSelect;
export type InsertBranchCashBox = z.infer<typeof insertBranchCashBoxSchema>;
export type CashBoxTransaction = typeof cashBoxTransactions.$inferSelect;
export type InsertCashBoxTransaction = z.infer<typeof insertCashBoxTransactionSchema>;
export type CashTransferToHQ = typeof cashTransfersToHQ.$inferSelect;
export type InsertCashTransferToHQ = z.infer<typeof insertCashTransferToHQSchema>;

// أنواع بيانات موسيقى الطهي التفاعلية
export type CookingSoundtrack = typeof cookingSoundtracks.$inferSelect;
export type InsertCookingSoundtrack = z.infer<typeof insertCookingSoundtrackSchema>;

// Dashboard Stats
export type DashboardStats = {
  dailySales: number;
  dailyTarget: number;
  dailyTargetPercentage: number;
  monthlyTargetAmount: number;
  monthlySalesAmount: number;
  monthlyTargetPercentage: number;
  averageTicket: number;
  totalTransactions: number;
  cashDiscrepancy?: number;
  paymentMethodsBreakdown: {
    cash: { amount: number, percentage: number },
    network: { amount: number, percentage: number }
  }
};
