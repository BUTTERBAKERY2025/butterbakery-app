import { Request, Response, NextFunction } from 'express';

/**
 * وسيط للتحقق من مصادقة المستخدم
 * يستخدم في الطلبات التي تتطلب تسجيل دخول
 */
export const isAuthenticated = (req: any, res: Response, next: NextFunction) => {
  try {
    // تأكد من أن الاستجابة ستكون بتنسيق JSON
    res.setHeader('Content-Type', 'application/json');
    
    // تسجيل معلومات تشخيصية
    console.log("Auth check - isAuthenticated:", req.isAuthenticated?.());
    console.log("Auth check - session:", req.session?.id);
    console.log("Auth check - session passport:", req.session?.passport ? "exists" : "missing");
    console.log("Auth check - req headers:", req.headers.cookie);
    console.log("Auth check - user:", req.user ? "Found" : "No user in request");

    // تحقق من المصادقة
    if (req.user && req.isAuthenticated && req.isAuthenticated()) {
      // المستخدم مصادق عليه، استمر للخطوة التالية
      return next();
    }
    
    // محاولة استعادة الجلسة إذا كان ذلك ممكنًا
    if (req.session && req.session.passport && req.session.passport.user && !req.user) {
      console.log("🚨 تم العثور على معرف المستخدم في الجلسة ولكن req.user مفقود - قد تكون هناك مشكلة في استعادة المستخدم");
      console.log("معرف المستخدم في الجلسة:", req.session.passport.user);
      
      // هنا يمكن إضافة منطق لاستعادة بيانات المستخدم يدويًا إذا لزم الأمر
    }
    
    // فشل المصادقة، إرجاع خطأ 401 مع استجابة JSON واضحة
    console.log("❌ فشلت المصادقة، إرجاع رمز حالة 401");
    return res.status(401).json({ 
      message: "Not authenticated",
      code: "AUTH_REQUIRED"
    });
  } catch (error) {
    console.error("❌ خطأ في وسيط المصادقة:", error);
    
    // تأكد من أن الاستجابة ستكون بتنسيق JSON حتى في حالة الخطأ
    res.setHeader('Content-Type', 'application/json');
    
    return res.status(500).json({ 
      message: "Internal server error during authentication",
      code: "AUTH_ERROR" 
    });
  }
};

/**
 * وسيط للتحقق من صلاحيات المستخدم
 * يستخدم في الطلبات التي تتطلب صلاحيات محددة
 */
export const hasRole = (roles: string[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    // تأكد من أن الاستجابة ستكون بتنسيق JSON
    res.setHeader('Content-Type', 'application/json');
    
    if (!req.isAuthenticated() || !req.user) {
      console.log("❌ المستخدم غير مصادق عليه في فحص الصلاحيات");
      return res.status(401).json({ 
        message: "Not authenticated",
        code: "AUTH_REQUIRED" 
      });
    }
    
    const userRole = req.user.role;
    console.log(`🔍 فحص صلاحية المستخدم - دور المستخدم: ${userRole}, الأدوار المطلوبة:`, roles);
    
    if (roles.includes(userRole)) {
      console.log("✅ المستخدم لديه الصلاحيات المطلوبة");
      return next();
    }
    
    console.log("⛔ المستخدم ليس لديه الصلاحيات المطلوبة");
    return res.status(403).json({ 
      message: "Forbidden: Insufficient permissions",
      code: "INSUFFICIENT_PERMISSIONS",
      requiredRoles: roles,
      userRole: userRole
    });
  };
};