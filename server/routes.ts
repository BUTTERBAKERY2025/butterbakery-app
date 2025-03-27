import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import express from "express";
import { loginSchema, insertDailySalesSchema, insertMonthlyTargetSchema, insertUserSchema, insertBranchSchema, dailySales } from "@shared/schema";
import { format, formatISO, subDays } from "date-fns";
import { db } from "./db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import session from "express-session";
import MemoryStore from "memorystore";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import aiAnalyticsRoutes from "./routes/aiAnalyticsRoutes";
import { registerSmartAlertsRoutes } from "./routes/smartAlertsRoutes";
import { registerRewardsRoutes } from "./routes/rewardsRoutes";
import { registerLeaderboardRoutes } from "./routes/leaderboardRoutes";
import { registerDatabaseMonitorRoutes } from "./routes/databaseMonitorRoutes";
import { registerCashBoxRoutes } from "./routes/cashBoxRoutes";
import { getDailySalesReport, getConsolidatedSalesReport, getCashierPerformanceReport, 
         getBranchTargetAchievementReport, getSalesAnalyticsReport, 
         getDashboardStatsReport } from "./controllers/reportingController";

export async function registerRoutes(app: Express): Promise<Server> {
  /**
   * نقطة نهاية لفحص صحة التطبيق
   * تستخدم بواسطة AWS Elastic Beanstalk للتحقق من حالة التطبيق
   * API GET /health
   */
  app.get('/health', (req: Request, res: Response) => {
    const status = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
      db: 'connected' // تحديث الحالة بناءً على الاتصال بقاعدة البيانات
    };
    res.status(200).json(status);
  });

  /**
   * نقطة نهاية لعرض إصدار التطبيق
   * API GET /version
   */
  app.get('/version', (req: Request, res: Response) => {
    const version = {
      version: process.env.npm_package_version || '1.0.0',
      buildNumber: process.env.BUILD_NUMBER || 'development',
      builtAt: process.env.BUILD_TIMESTAMP || new Date().toISOString(),
      commitHash: process.env.COMMIT_HASH || 'unknown'
    };
    res.status(200).json(version);
  });
  const MemoryStoreSession = MemoryStore(session);
  // Session setup
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "butter-bakery-secret",
      resave: true, // تغيير إلى true لضمان حفظ الجلسة مع كل طلب
      saveUninitialized: true, // تغيير إلى true لتخزين الجلسات الجديدة
      store: new MemoryStoreSession({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days for longer sessions
        httpOnly: true,
        secure: false, // Set to false since we're not using HTTPS in the development environment
        sameSite: 'lax', // Changed to 'lax' to better support SPA
        path: '/'
      },
      name: 'connect.sid', // Using default name for better compatibility
      rolling: true // Extend the cookie lifetime with each request
    })
  );
  
  // Log session information for debugging
  app.use((req: any, res, next) => {
    console.log(`Session ID: ${req.session.id}`);
    console.log(`Session Cookie: ${JSON.stringify(req.session.cookie)}`);
    next();
  });

  // Passport setup
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Incorrect username" });
        }
        if (user.password !== password) {
          return done(null, false, { message: "Incorrect password" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    // Additional debugging for authentication issues
    console.log("requireAuth middleware called");
    console.log("isAuthenticated:", req.isAuthenticated?.());
    console.log("Session ID:", req.session?.id);
    console.log("Cookies:", req.headers.cookie);
    
    // Check if user is authenticated via Passport isAuthenticated method
    if (req.isAuthenticated && req.isAuthenticated()) {
      console.log("Request authenticated via isAuthenticated, proceeding to next middleware");
      return next();
    }
    
    // If we have a session with user ID but req.user is missing, try to recover
    if (req.session?.passport?.user && !req.user) {
      console.log("Found user ID in session but req.user is missing, attempting to recover");
      const userId = req.session.passport.user;
      
      // Try to fetch the user directly from storage
      storage.getUser(userId)
        .then(user => {
          if (user) {
            console.log("Successfully recovered user from storage");
            req.user = user;
            req.isAuthenticated = () => true;
            return next();
          } else {
            console.log("Failed to recover user from storage");
            return res.status(401).json({ message: "Unauthorized" });
          }
        })
        .catch(err => {
          console.error("Error recovering user:", err);
          return res.status(401).json({ message: "Unauthorized" });
        });
    } else {
      return res.status(401).json({ message: "Unauthorized" });
    }
  };

  const requireRole = (roles: string[]) => {
    return (req: any, res: any, next: any) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      next();
    };
  };

  // API routes
  const apiRouter = express.Router();

  // Auth routes
  apiRouter.post("/auth/login", async (req, res, next) => {
    try {
      console.log("Login attempt body:", JSON.stringify(req.body));
      
      // Validate input first
      const data = loginSchema.parse(req.body);
      console.log("Login validation passed for username:", data.username);
      
      // Check for existing session
      if (req.isAuthenticated && req.isAuthenticated()) {
        console.log("User already authenticated, returning current user");
        const userResponse = { ...req.user };
        delete userResponse.password;
        return res.json({ user: userResponse });
      }
      
      // Try to authenticate
      console.log("Calling passport.authenticate for username:", data.username);
      passport.authenticate("local", (err, user, info) => {
        if (err) {
          console.error("Passport authentication error:", err);
          return next(err);
        }
        
        if (!user) {
          console.log("Authentication failed: no user found. Info:", info);
          // Try to look up the user to see if it exists at all
          storage.getUserByUsername(data.username)
            .then(lookupUser => {
              if (lookupUser) {
                console.log("User exists in database but authentication failed - likely password mismatch");
              } else {
                console.log("User does not exist in database");
              }
            })
            .catch(err => {
              console.error("Error looking up user:", err);
            });
          
          return res.status(401).json({ message: info?.message || "Invalid credentials" });
        }

        // Log in and create session
        console.log("User found, calling req.logIn");
        req.logIn(user, (err) => {
          if (err) {
            console.error("Session login error:", err);
            return next(err);
          }

          // Create sanitized user object (remove password)
          const userResponse = { ...user };
          delete userResponse.password;
          
          console.log("User authenticated successfully:", userResponse.username);
          console.log("Session info after login:", {
            id: req.session?.id,
            passport: req.session?.passport ? JSON.stringify(req.session.passport) : 'missing'
          });
          
          return res.json({ user: userResponse });
        });
      })(req, res, next);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.message);
        return res.status(400).json({ message: error.message });
      }
      console.error("Login error:", error);
      next(error);
    }
  });

  apiRouter.get("/auth/me", (req: any, res) => {
    // تأكد من أن الاستجابة ستكون بتنسيق JSON
    res.setHeader('Content-Type', 'application/json');
    
    console.log("Auth check - isAuthenticated:", req.isAuthenticated?.());
    console.log("Auth check - session:", req.session?.id);
    console.log("Auth check - session passport:", req.session?.passport ? JSON.stringify(req.session.passport) : 'missing');
    console.log("Auth check - req headers:", req.headers.cookie || 'no cookies in header');
    console.log("Auth check - user:", req.user ? `User exists: ${req.user.username}` : "No user in request");
    
    // Try to extract and debug session data
    try {
      if (req.session && req.session.passport && req.session.passport.user) {
        console.log("Session contains user ID:", req.session.passport.user);
        
        // Attempt to get user data directly if req.user is missing
        if (!req.user) {
          console.log("Attempting to fetch user directly from storage");
          storage.getUser(req.session.passport.user)
            .then(userFromStorage => {
              if (userFromStorage) {
                console.log("User found in storage:", userFromStorage.username);
              } else {
                console.log("No user found in storage with ID:", req.session.passport.user);
              }
            })
            .catch(err => {
              console.error("Error fetching user from storage:", err);
            });
        }
      }
    } catch (error) {
      console.error("Error parsing session data:", error);
    }
    
    if (req.isAuthenticated && req.isAuthenticated()) {
      try {
        const user = { ...req.user };
        // تأكد من عدم إرسال كلمة المرور في الاستجابة
        delete user.password;
        return res.json(user);
      } catch (error) {
        console.error("❌ خطأ في معالجة بيانات المستخدم:", error);
        return res.status(500).json({ 
          message: "Error processing authenticated user", 
          code: "AUTH_PROCESSING_ERROR",
          error: error instanceof Error ? error.message : String(error)  
        });
      }
    }
    
    // إرجاع رسالة خطأ موحدة عند عدم المصادقة
    return res.status(401).json({ 
      message: "Not authenticated",
      code: "AUTH_REQUIRED" 
    });
  });

  // Add session refresh endpoint
  apiRouter.post("/auth/refresh", (req: any, res) => {
    console.log("Session refresh request - user:", req.user ? `User: ${req.user.username}` : "No user in request");
    console.log("Session refresh request - session:", req.session?.id);
    
    if (req.isAuthenticated && req.isAuthenticated()) {
      // User is authenticated, extend their session
      // Session extension is automatic due to 'rolling: true' in session config
      
      console.log("Session refreshed successfully");
      
      // Return user data
      const user = { ...req.user };
      delete user.password;
      return res.json({ 
        success: true, 
        message: "Session refreshed successfully",
        user
      });
    } else {
      // Not authenticated
      console.log("Session refresh failed - not authenticated");
      return res.status(401).json({ 
        success: false, 
        message: "Not authenticated" 
      });
    }
  });

  apiRouter.post("/auth/logout", (req: any, res) => {
    console.log("Logout request - user:", req.user ? "User exists" : "No user in request");
    console.log("Logout request - session:", req.session?.id);
    console.log("Logout request - cookies:", req.headers.cookie);
    
    if (req.isAuthenticated && req.isAuthenticated()) {
      req.logout((err) => {
        if (err) {
          console.error("Logout error:", err);
          return res.status(500).json({ success: false, message: "Logout failed" });
        }
        
        // Clear the specific cookie name we're using
        res.clearCookie('connect.sid', { 
          path: '/',
          httpOnly: true,
          secure: false,
          sameSite: 'lax' // Update to match our session settings
        });
        
        req.session.destroy((err) => {
          if (err) {
            console.error("Session destruction error:", err);
            return res.status(500).json({ success: false, message: "Session destruction failed" });
          }
          return res.json({ success: true, message: "Logged out successfully" });
        });
      });
    } else {
      // Already logged out - still clear any cookies that might be present
      res.clearCookie('connect.sid', { 
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'lax' // Update to match our session settings
      });
      res.json({ success: true, message: "Already logged out" });
    }
  });

  // Users routes
  apiRouter.get("/users", requireRole(["admin", "branch_manager"]), async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      }));
    } catch (error) {
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  apiRouter.post("/users", requireRole(["admin"]), async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const user = await storage.createUser(data);
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });
  
  apiRouter.patch("/users/:id", requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userData = req.body;
      
      // Remove confirmPassword if it exists in request body
      if ('confirmPassword' in userData) {
        delete userData.confirmPassword;
      }
      
      const updatedUser = await storage.updateUser(id, userData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });
  
  apiRouter.delete("/users/:id", requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteUser(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Branches routes
  apiRouter.get("/branches", requireAuth, async (req, res) => {
    try {
      const branches = await storage.getBranches();
      res.json(branches);
    } catch (error) {
      res.status(500).json({ message: "Failed to get branches" });
    }
  });

  apiRouter.post("/branches", requireRole(["admin"]), async (req, res) => {
    try {
      const data = insertBranchSchema.parse(req.body);
      const branch = await storage.createBranch(data);
      res.status(201).json(branch);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to create branch" });
    }
  });

  // Monthly Targets routes
  apiRouter.get("/monthly-targets", requireAuth, async (req, res) => {
    try {
      const { branchId, month, year } = req.query;
      
      if (branchId && month && year) {
        const target = await storage.getMonthlyTargetByBranchAndDate(
          Number(branchId),
          Number(month),
          Number(year)
        );
        return res.json(target || null);
      }
      
      const targets = await storage.getMonthlyTargets();
      res.json(targets);
    } catch (error) {
      res.status(500).json({ message: "Failed to get monthly targets" });
    }
  });

  apiRouter.post("/monthly-targets", requireRole(["admin", "branch_manager"]), async (req, res) => {
    try {
      console.log("Monthly target request body:", JSON.stringify(req.body));
      
      try {
        // التأكد من تهيئة جميع الحقول المطلوبة
        const targetData = {
          branchId: Number(req.body.branchId),
          month: Number(req.body.month),
          year: Number(req.body.year),
          targetAmount: Number(req.body.targetAmount),
          distributionPattern: req.body.distributionPattern || {}, 
          dailyTargets: req.body.dailyTargets || {},
          weekdayWeights: req.body.weekdayWeights || {
            0: 1.0, 1: 0.8, 2: 0.8, 3: 0.9, 4: 1.0, 5: 1.5, 6: 1.2,
          },
          specialDays: req.body.specialDays || [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // التحقق من صحة البيانات
        const data = insertMonthlyTargetSchema.parse(targetData);
        console.log("Validated data:", JSON.stringify(data));
        
        // إنشاء الهدف الشهري
        const target = await storage.createMonthlyTarget(data);
        
        // إنشاء نشاط لتتبع العملية
        if (req.user) {
          await storage.createActivity({
            userId: req.user.id,
            branchId: data.branchId,
            action: 'create_monthly_target',
            details: {
              month: data.month,
              year: data.year,
              targetAmount: data.targetAmount
            },
            timestamp: new Date()
          });
        }
        
        res.status(201).json(target);
      } catch (validationError) {
        console.error("Validation error:", validationError);
        if (validationError instanceof z.ZodError) {
          return res.status(400).json({ message: validationError.message, details: validationError.errors });
        }
        throw validationError;
      }
    } catch (error) {
      console.error("Monthly target creation error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create monthly target";
      res.status(500).json({ message: errorMessage, error: error.toString() });
    }
  });

  // Daily Sales routes - استخدام نظام التقارير المركزي المحسن
  apiRouter.get("/daily-sales", requireAuth, async (req, res) => {
    try {
      console.log("🔄 طلب تقرير المبيعات اليومية باستخدام نظام التقارير المركزي");
      
      // استخدام وحدة التحكم في التقارير للحصول على بيانات المبيعات
      const salesData = await getDailySalesReport(req, res, storage);
      
      // إرجاع البيانات للمستخدم
      return res.json(salesData);
    } catch (error) {
      console.error("❌ خطأ في الحصول على تقرير المبيعات اليومية:", error);
      res.status(500).json({ 
        message: "Failed to get daily sales", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  apiRouter.post("/daily-sales", requireAuth, async (req, res) => {
    try {
      // تحضير البيانات والمعالجة المسبقة
      const requestData = { ...req.body };
      
      // التعامل مع التوقيت وصيغة التاريخ
      if (typeof requestData.date === 'string' && !requestData.date.includes('-')) {
        // تنسيق التاريخ إلى الصيغة المطلوبة YYYY-MM-DD إذا لم يكن بهذه الصيغة
        const dateObj = new Date(requestData.date);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        requestData.date = `${year}-${month}-${day}`;
      }
      
      // تحويل shiftStart من string إلى Date إذا تم استلامه كـ string
      if (typeof requestData.shiftStart === 'string') {
        requestData.shiftStart = new Date(requestData.shiftStart);
      }
      
      // تحويل shiftEnd من string إلى Date إذا تم استلامه كـ string ولم يكن null
      if (typeof requestData.shiftEnd === 'string' && requestData.shiftEnd) {
        requestData.shiftEnd = new Date(requestData.shiftEnd);
      }
      
      // استخدام safeParse للتحقق من البيانات
      const result = insertDailySalesSchema.safeParse(requestData);
      
      if (!result.success) {
        console.error("Daily sales validation error:", result.error.errors);
        return res.status(400).json({ 
          message: "خطأ في التحقق من صحة البيانات: " + JSON.stringify(result.error.errors, null, 2) 
        });
      }
      
      const data = result.data;
      
      // التأكد من وجود القيم الأساسية وتعيين قيم افتراضية للقيم الاختيارية
      data.totalCashSales = data.totalCashSales ?? 0;
      data.totalNetworkSales = data.totalNetworkSales ?? 0;
      data.totalTransactions = data.totalTransactions ?? 0;
      
      // حساب إجمالي المبيعات (المبيعات النقدية + مبيعات الشبكة)
      data.totalSales = data.totalCashSales + data.totalNetworkSales;
      
      // حساب الفرق بين المبلغ الفعلي والمبيعات النقدية إذا توفرت المعلومات
      if (data.actualCashInRegister !== undefined && data.actualCashInRegister !== null) {
        data.discrepancy = data.actualCashInRegister - data.totalCashSales;
      } else {
        data.discrepancy = 0;
      }
      
      // حساب متوسط قيمة الفاتورة إذا كان هناك معاملات
      if (data.totalTransactions && data.totalTransactions > 0) {
        data.averageTicket = data.totalSales / data.totalTransactions;
      } else {
        data.averageTicket = 0;
      }
      
      // ضمان وجود البيانات الضرورية الأخرى
      if (!data.status) data.status = "pending";
      
      const sale = await storage.createDailySales(data);
      
      // Log activity
      await storage.createActivity({
        userId: req.user?.id,
        action: "create_daily_sales",
        details: { saleId: sale.id, amount: sale.totalSales },
        branchId: sale.branchId,
        timestamp: new Date(),
      });
      
      // If there's a discrepancy, create a notification
      if (data.discrepancy && Math.abs(data.discrepancy) > 10) {
        const discrepancyType = data.discrepancy < 0 ? "shortage" : "excess";
        const severity = Math.abs(data.discrepancy) > 50 ? "warning" : "info";
        
        await storage.createNotification({
          userId: req.user?.id,
          title: `Register ${discrepancyType} detected`,
          message: `A ${discrepancyType} of ${Math.abs(data.discrepancy)} SAR was detected in the register for branch #${data.branchId}`,
          type: severity,
          timestamp: new Date(),
          link: `/daily-sales/${sale.id}`,
        });
      }
      
      res.status(201).json(sale);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.message });
      }
      console.error("Error creating daily sales:", error);
      res.status(500).json({ message: "Failed to create daily sales record", error: error.toString() });
    }
  });

  // Activities routes
  apiRouter.get("/activities", requireAuth, async (req, res) => {
    try {
      const { branchId, limit } = req.query;
      let activities;
      
      if (branchId) {
        activities = await storage.getActivitiesByBranch(Number(branchId), limit ? Number(limit) : undefined);
      } else {
        activities = await storage.getActivities(limit ? Number(limit) : undefined);
      }
      
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to get activities" });
    }
  });

  // Notifications routes
  apiRouter.get("/notifications", requireAuth, async (req, res) => {
    try {
      const { unreadOnly, limit } = req.query;
      let notifications;
      
      if (unreadOnly === 'true') {
        notifications = await storage.getUnreadNotificationsByUser(
          req.user?.id, 
          limit ? Number(limit) : undefined
        );
      } else {
        notifications = await storage.getNotificationsByUser(
          req.user?.id, 
          limit ? Number(limit) : undefined
        );
      }
      
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to get notifications" });
    }
  });

  apiRouter.post("/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const notification = await storage.markNotificationAsRead(Number(req.params.id));
      res.json(notification);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Consolidated Daily Sales routes - استخدام نظام التقارير المركزي المحسن
  apiRouter.get("/consolidated-sales", requireAuth, async (req, res) => {
    try {
      console.log("🔄 طلب تقرير المبيعات المجمعة باستخدام نظام التقارير المركزي");
      
      // استخدام وحدة التحكم في التقارير للحصول على بيانات المبيعات المجمعة
      const consolidatedSalesData = await getConsolidatedSalesReport(req, res, storage);
      
      // إرجاع البيانات للمستخدم
      return res.json(consolidatedSalesData);
    } catch (error) {
      console.error("❌ خطأ في الحصول على تقرير المبيعات المجمعة:", error);
      res.status(500).json({ 
        message: "Failed to get consolidated daily sales", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  apiRouter.get("/consolidated-sales/:id", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const consolidatedSales = await storage.getConsolidatedDailySalesById(id);
      
      if (!consolidatedSales) {
        return res.status(404).json({ message: "Consolidated sales not found" });
      }
      
      // إضافة اسم الفرع وأسماء المستخدمين
      const branch = await storage.getBranch(consolidatedSales.branchId);
      const creator = consolidatedSales.createdBy ? await storage.getUser(consolidatedSales.createdBy) : null;
      const closer = consolidatedSales.closedBy ? await storage.getUser(consolidatedSales.closedBy) : null;
      
      const enrichedSales = {
        ...consolidatedSales,
        branchName: branch?.name || `فرع #${consolidatedSales.branchId}`,
        createdByName: creator?.name || 'مستخدم النظام',
        closedByName: closer?.name || undefined
      };
      
      res.json(enrichedSales);
    } catch (error) {
      console.error("Error getting consolidated sales by ID:", error);
      res.status(500).json({ message: "Failed to get consolidated daily sales" });
    }
  });

  apiRouter.get("/daily-sales/consolidated/:consolidatedId", requireAuth, async (req, res) => {
    try {
      const consolidatedId = Number(req.params.consolidatedId);
      
      // الحصول على تفاصيل اليومية المجمعة
      const consolidatedSales = await storage.getConsolidatedDailySalesById(consolidatedId);
      
      if (!consolidatedSales) {
        return res.status(404).json({ message: "Consolidated sales not found" });
      }
      
      // الحصول على جميع اليوميات للفرع والتاريخ المحددين
      const dailySales = await storage.getDailySalesByBranchAndDate(
        consolidatedSales.branchId,
        consolidatedSales.date
      );
      
      // تصفية اليوميات المرتبطة باليومية المجمعة المحددة
      const associatedSales = dailySales.filter(sale => sale.consolidatedId === consolidatedId);
      
      // إضافة أسماء الكاشيرية
      const enrichedSales = await Promise.all(associatedSales.map(async (sale) => {
        const cashier = await storage.getUser(sale.cashierId);
        
        return {
          ...sale,
          cashierName: cashier?.name || `كاشير #${sale.cashierId}`
        };
      }));
      
      res.json(enrichedSales);
    } catch (error) {
      console.error("Error getting daily sales by consolidated ID:", error);
      res.status(500).json({ message: "Failed to get daily sales for consolidated record" });
    }
  });
  
  apiRouter.post("/consolidated-sales", requireRole(["admin", "branch_manager", "supervisor"]), async (req, res) => {
    try {
      const { branchId, date } = req.body;
      
      if (!branchId || !date) {
        return res.status(400).json({ message: "Branch ID and date are required" });
      }
      
      // التأكد من أن التاريخ بالصيغة المناسبة (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return res.status(400).json({ message: "Date must be in format YYYY-MM-DD" });
      }
      
      // التأكد من وجود اليوميات للفرع والتاريخ المحددين
      const dailySales = await storage.getDailySalesByBranchAndDate(branchId, date);
      
      if (dailySales.length === 0) {
        return res.status(404).json({ message: "No daily sales found for this branch and date" });
      }
      
      // تجميع اليوميات
      const consolidatedSales = await storage.consolidateDailySales(branchId, date, req.user?.id);
      
      if (!consolidatedSales) {
        return res.status(500).json({ message: "Failed to consolidate daily sales" });
      }
      
      // إضافة اسم الفرع وأسماء المستخدمين
      const branch = await storage.getBranch(consolidatedSales.branchId);
      const creator = consolidatedSales.createdBy ? await storage.getUser(consolidatedSales.createdBy) : null;
      const closer = consolidatedSales.closedBy ? await storage.getUser(consolidatedSales.closedBy) : null;
      
      const enrichedSales = {
        ...consolidatedSales,
        branchName: branch?.name || `فرع #${consolidatedSales.branchId}`,
        createdByName: creator?.name || 'مستخدم النظام',
        closedByName: closer?.name || undefined
      };
      
      // إنشاء إشعار للمشرفين
      await storage.createNotification({
        userId: null, // للجميع
        title: "تم تجميع يوميات المبيعات",
        message: `تم تجميع يوميات المبيعات لفرع ${branch?.name || branchId} ليوم ${date}`,
        type: "info",
        timestamp: new Date(),
        link: `/reports/consolidated-journal`
      });
      
      res.status(201).json(enrichedSales);
    } catch (error) {
      console.error("Error consolidating daily sales:", error);
      res.status(500).json({ message: "Failed to consolidate daily sales" });
    }
  });
  
  apiRouter.post("/consolidated-sales/:id/close", requireRole(["admin", "branch_manager", "supervisor"]), async (req, res) => {
    try {
      const id = Number(req.params.id);
      
      // التحقق من وجود اليومية المجمعة
      const existingSales = await storage.getConsolidatedDailySalesById(id);
      
      if (!existingSales) {
        return res.status(404).json({ message: "Consolidated sales not found" });
      }
      
      // التحقق من أن اليومية ليست مغلقة بالفعل
      if (existingSales.status === "closed") {
        return res.status(400).json({ message: "Consolidated sales are already closed" });
      }
      
      // إغلاق اليومية المجمعة
      const closedSales = await storage.closeConsolidatedDailySales(id, req.user?.id);
      
      if (!closedSales) {
        return res.status(500).json({ message: "Failed to close consolidated sales" });
      }
      
      // إضافة اسم الفرع وأسماء المستخدمين
      const branch = await storage.getBranch(closedSales.branchId);
      const creator = closedSales.createdBy ? await storage.getUser(closedSales.createdBy) : null;
      const closer = closedSales.closedBy ? await storage.getUser(closedSales.closedBy) : null;
      
      const enrichedSales = {
        ...closedSales,
        branchName: branch?.name || `فرع #${closedSales.branchId}`,
        createdByName: creator?.name || 'مستخدم النظام',
        closedByName: closer?.name || undefined
      };
      
      // إنشاء إشعار للمشرفين
      await storage.createNotification({
        userId: null, // للجميع
        title: "تم إغلاق يومية المبيعات المجمعة",
        message: `تم إغلاق يومية المبيعات المجمعة لفرع ${branch?.name || closedSales.branchId} ليوم ${closedSales.date}`,
        type: "success",
        timestamp: new Date(),
        link: `/reports/consolidated-journal`
      });
      
      res.json(enrichedSales);
    } catch (error) {
      console.error("Error closing consolidated sales:", error);
      res.status(500).json({ message: "Failed to close consolidated sales" });
    }
  });
  
  /**
   * ترحيل اليومية المجمعة إلى الحسابات
   * API POST /api/consolidated-sales/:id/transfer
   */
  apiRouter.post("/consolidated-sales/:id/transfer", requireRole(["admin", "branch_manager", "supervisor"]), async (req, res) => {
    try {
      const id = Number(req.params.id);
      
      // التحقق من وجود اليومية المجمعة
      const existingSales = await storage.getConsolidatedDailySalesById(id);
      
      if (!existingSales) {
        return res.status(404).json({ message: "Consolidated sales not found" });
      }
      
      // التحقق من أن اليومية مغلقة وليست مرحلة بالفعل
      if (existingSales.status !== "closed") {
        return res.status(400).json({ message: "Consolidated sales must be closed before transfer" });
      }
      
      if (existingSales.status === "transferred") {
        return res.status(400).json({ message: "Consolidated sales are already transferred" });
      }
      
      // ترحيل اليومية المجمعة
      const transferredSales = await storage.transferConsolidatedDailySales(id, req.user?.id);
      
      if (!transferredSales) {
        return res.status(500).json({ message: "Failed to transfer consolidated sales" });
      }
      
      // إضافة اسم الفرع وأسماء المستخدمين
      const branch = await storage.getBranch(transferredSales.branchId);
      const creator = transferredSales.createdBy ? await storage.getUser(transferredSales.createdBy) : null;
      const closer = transferredSales.closedBy ? await storage.getUser(transferredSales.closedBy) : null;
      const transferrer = transferredSales.transferredBy ? await storage.getUser(transferredSales.transferredBy) : null;
      
      const enrichedSales = {
        ...transferredSales,
        branchName: branch?.name || `فرع #${transferredSales.branchId}`,
        createdByName: creator?.name || 'مستخدم النظام',
        closedByName: closer?.name || undefined,
        transferredByName: transferrer?.name || undefined
      };
      
      // إنشاء إشعار للمشرفين
      await storage.createNotification({
        userId: null, // للجميع
        title: "تم ترحيل يومية المبيعات المجمعة",
        message: `تم ترحيل يومية المبيعات المجمعة لفرع ${branch?.name || transferredSales.branchId} ليوم ${transferredSales.date} إلى الحسابات`,
        type: "success",
        timestamp: new Date(),
        link: `/reports/consolidated-journal`
      });
      
      res.json(enrichedSales);
    } catch (error) {
      console.error("Error transferring consolidated sales:", error);
      res.status(500).json({ message: "Failed to transfer consolidated sales" });
    }
  });
  
  // Dashboard stats - استخدام نظام التقارير المركزي المحسن
  apiRouter.get("/dashboard/stats", requireAuth, async (req, res) => {
    try {
      // تأكد من أن الاستجابة ستكون بتنسيق JSON
      res.setHeader('Content-Type', 'application/json');
      
      console.log("🔄 طلب إحصائيات لوحة التحكم باستخدام نظام التقارير المركزي");
      console.log("🧩 معلمات الطلب:", JSON.stringify({
        branchId: req.query.branchId,
        date: req.query.date
      }));
      
      // استخدام وحدة التحكم في التقارير للحصول على إحصائيات لوحة التحكم
      const dashboardStatsData = await getDashboardStatsReport(req, res, storage);
      
      console.log("✅ تم الحصول على إحصائيات لوحة التحكم بنجاح");
      
      // إرجاع البيانات للمستخدم
      return res.json({
        success: true,
        data: dashboardStatsData
      });
    } catch (error) {
      console.error("❌ خطأ في الحصول على إحصائيات لوحة التحكم:", error);
      
      // تأكد من أن الاستجابة ستكون بتنسيق JSON حتى في حالة الخطأ
      res.setHeader('Content-Type', 'application/json');
      
      return res.status(500).json({ 
        success: false,
        message: "Failed to get dashboard stats", 
        code: "DASHBOARD_STATS_ERROR",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Target achievement - استخدام نظام التقارير المركزي المحسن
  apiRouter.get("/dashboard/target-achievement", requireAuth, async (req, res) => {
    try {
      // تأكد من أن الاستجابة ستكون بتنسيق JSON
      res.setHeader('Content-Type', 'application/json');
      
      console.log("🔄 طلب تقرير إنجاز الأهداف الشهرية باستخدام نظام التقارير المركزي");
      console.log("🧩 معلمات الطلب:", JSON.stringify({
        branchId: req.query.branchId,
        month: req.query.month,
        year: req.query.year
      }));
      
      // استخدام وحدة التحكم في التقارير للحصول على بيانات إنجاز الأهداف الشهرية
      const branchTargetsData = await getBranchTargetAchievementReport(req, res, storage);
      
      console.log("✅ تم الحصول على بيانات إنجاز الأهداف الشهرية بنجاح");
      
      // إرجاع البيانات للمستخدم
      return res.json({
        success: true,
        data: branchTargetsData
      });
    } catch (error) {
      console.error("❌ خطأ في الحصول على تقرير إنجاز الأهداف الشهرية:", error);
      
      // تأكد من أن الاستجابة ستكون بتنسيق JSON حتى في حالة الخطأ
      res.setHeader('Content-Type', 'application/json');
      
      return res.status(500).json({ 
        success: false,
        message: "Failed to get target achievement data", 
        code: "TARGET_ACHIEVEMENT_ERROR",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Cashier performance - استخدام نظام التقارير المركزي المحسن
  apiRouter.get("/dashboard/cashier-performance", requireAuth, async (req, res) => {
    try {
      // تأكد من أن الاستجابة ستكون بتنسيق JSON
      res.setHeader('Content-Type', 'application/json');
      
      console.log("🔄 طلب تقرير أداء الكاشير باستخدام نظام التقارير المركزي");
      console.log("🧩 معلمات الطلب:", JSON.stringify({
        branchId: req.query.branchId,
        cashierId: req.query.cashierId,
        from: req.query.from,
        to: req.query.to
      }));
      
      // استخدام وحدة التحكم في التقارير للحصول على بيانات أداء الكاشير
      const cashierPerformanceData = await getCashierPerformanceReport(req, res, storage);
      
      console.log("✅ تم الحصول على بيانات أداء الكاشير بنجاح");
      
      // إرجاع البيانات للمستخدم
      return res.json({
        success: true,
        data: cashierPerformanceData
      });
    } catch (error) {
      console.error("❌ خطأ في الحصول على تقرير أداء الكاشير:", error);
      
      // تأكد من أن الاستجابة ستكون بتنسيق JSON حتى في حالة الخطأ
      res.setHeader('Content-Type', 'application/json');
      
      return res.status(500).json({ 
        success: false,
        message: "Failed to get cashier performance data", 
        code: "CASHIER_PERFORMANCE_ERROR",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Sales analytics - استخدام نظام التقارير المركزي المحسن
  apiRouter.get("/dashboard/sales-analytics", requireAuth, async (req, res) => {
    try {
      // تأكد من أن الاستجابة ستكون بتنسيق JSON
      res.setHeader('Content-Type', 'application/json');
      
      console.log("🔄 طلب تقرير تحليلات المبيعات باستخدام نظام التقارير المركزي");
      console.log("🧩 معلمات الطلب:", JSON.stringify({
        branchId: req.query.branchId,
        period: req.query.period,
        from: req.query.from,
        to: req.query.to
      }));
      
      // ضمان أن branchId هو رقم (يمكن أن يكون 0 لكل الفروع)
      const branchId = req.query.branchId !== undefined 
        ? Number(req.query.branchId) 
        : null;
      
      console.log("🏢 معرف الفرع المستخدم:", branchId, 
                 branchId === 0 ? "(جميع الفروع)" : "");
      
      // استخدام وحدة التحكم في التقارير للحصول على بيانات تحليلات المبيعات
      const salesAnalyticsData = await getSalesAnalyticsReport(req, res, storage);
      
      console.log("✅ تم الحصول على بيانات تحليلات المبيعات بنجاح");
      
      // إرجاع البيانات للمستخدم
      return res.json({
        success: true,
        data: salesAnalyticsData
      });
    } catch (error) {
      console.error("❌ خطأ في الحصول على تقرير تحليلات المبيعات:", error);
      
      // ضمان أن الاستجابة ستكون بتنسيق JSON حتى في حالة الخطأ
      res.setHeader('Content-Type', 'application/json');
      
      return res.status(500).json({ 
        success: false,
        message: "Failed to get sales analytics data", 
        code: "SALES_ANALYTICS_ERROR",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Initialize demo data if needed
  apiRouter.post("/initialize-demo", async (req, res) => {
    try {
      // تأكد من أن الاستجابة ستكون بتنسيق JSON
      res.setHeader('Content-Type', 'application/json');

      console.log("🚀 بدء تهيئة البيانات التجريبية...");
      await storage.initializeDemoData();
      console.log("✅ تم تهيئة البيانات التجريبية بنجاح");
      
      return res.json({ 
        success: true, 
        message: "Demo data initialized successfully" 
      });
    } catch (error) {
      console.error("❌ فشل في تهيئة البيانات التجريبية:", error);
      
      // تأكد من أن الاستجابة ستكون بتنسيق JSON حتى في حالة الخطأ
      res.setHeader('Content-Type', 'application/json');
      
      return res.status(500).json({ 
        success: false,
        message: "Failed to initialize demo data",
        code: "DEMO_INIT_ERROR",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // إضافة مسارات تحليلات الذكاء الاصطناعي
  apiRouter.use("/ai-analytics", aiAnalyticsRoutes);

  // Registrar rutas de alertas inteligentes
  registerSmartAlertsRoutes(app);
  
  // تسجيل مسارات نظام المكافآت
  registerRewardsRoutes(app);
  registerLeaderboardRoutes(app);
  registerDatabaseMonitorRoutes(app);
  
  // تسجيل مسارات إدارة صندوق النقدية
  registerCashBoxRoutes(app, storage);

  // إضافة نقطة نهاية للتحقق من نسخة التطبيق
  app.get("/version", (req, res) => {
    const version = process.env.npm_package_version || "1.0.0";
    const environment = process.env.NODE_ENV || "development";
    const buildTime = process.env.BUILD_TIME || new Date().toISOString();
    
    res.json({
      version,
      environment,
      buildTime,
      serverTime: new Date().toISOString()
    });
  });

  // إضافة نقطة نهاية لفحص صحة التطبيق (Health Endpoint) للاستخدام مع AWS Elastic Beanstalk والمراقبة
  app.get("/health", (req, res) => {
    // فحص اتصال قاعدة البيانات
    const dbCheck = async () => {
      try {
        // محاولة إجراء استعلام بسيط للتحقق من اتصال قاعدة البيانات
        await db.execute("SELECT 1");
        return true;
      } catch (error) {
        console.error("فشل فحص قاعدة البيانات:", error);
        return false;
      }
    };

    // فحص الخدمات والوظائف الحيوية الأخرى هنا
    Promise.all([dbCheck()])
      .then(([dbStatus]) => {
        const healthy = dbStatus;
        
        const statusResponse = {
          status: healthy ? "healthy" : "unhealthy",
          timestamp: new Date().toISOString(),
          services: {
            database: dbStatus ? "connected" : "disconnected",
          },
          version: process.env.npm_package_version || "1.0.0",
          environment: process.env.NODE_ENV || "development",
        };
        
        // إرسال الاستجابة مع رمز الحالة المناسب
        res.status(healthy ? 200 : 503).json(statusResponse);
      })
      .catch((error) => {
        console.error("خطأ في فحص الصحة:", error);
        res.status(500).json({
          status: "error",
          message: "حدث خطأ أثناء فحص صحة النظام",
          timestamp: new Date().toISOString(),
        });
      });
  });

  app.use("/api", apiRouter);

  const httpServer = createServer(app);
  return httpServer;
}


