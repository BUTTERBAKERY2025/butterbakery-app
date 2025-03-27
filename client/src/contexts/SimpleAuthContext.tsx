import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { toast } from '@/hooks/use-toast';

// تعريف نوع المستخدم
interface User {
  id: number;
  username: string;
  name: string;
  role: string;
  branchId: number | null;
  avatar?: string; // إضافة حقل الصورة الرمزية كحقل اختياري
}

// تعريف نوع الأدوات المساعدة للمصادقة
interface AuthUtils {
  /**
   * دالة مساعدة لإرفاق معلومات المصادقة في رأس الطلب
   * تستخدم في الطلبات التي تتطلب مصادقة
   */
  getAuthHeaders: () => HeadersInit;
  
  /**
   * دالة مساعدة لإجراء طلب مع إرفاق معلومات المصادقة
   * @param url رابط الطلب
   * @param options خيارات الطلب
   */
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

// سياق المصادقة - مبسط
interface AuthContextType extends AuthUtils {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  // دالة تسجيل الدخول - مبسطة
  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // استدعاء API تسجيل الدخول
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.user) {
          // تعيين المستخدم في السياق
          setUser(data.user);
          
          // حفظ المستخدم في التخزين المحلي للمتصفح
          try {
            localStorage.setItem('auth_user', JSON.stringify(data.user));
            console.log('[Auth] Saved user data to local storage', data.user.id);
          } catch (err) {
            console.error('[Auth] Error saving user data to local storage:', err);
          }
          
          // عرض رسالة نجاح تسجيل الدخول
          toast({
            title: 'تم تسجيل الدخول بنجاح',
            description: `مرحبًا، ${data.user.name}`,
          });
          
          return true;
        }
      }
      
      // في حالة فشل تسجيل الدخول
      toast({
        title: 'خطأ في تسجيل الدخول',
        description: 'اسم المستخدم أو كلمة المرور غير صحيحة',
        variant: 'destructive',
      });
      
      return false;
    } catch (error) {
      console.error('خطأ أثناء تسجيل الدخول:', error);
      
      toast({
        title: 'خطأ في الاتصال',
        description: 'لا يمكن الاتصال بالخادم',
        variant: 'destructive',
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // دالة تسجيل الخروج - مبسطة
  const logout = async (): Promise<void> => {
    setIsLoading(true);
    
    try {
      // استدعاء API تسجيل الخروج
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      // مسح بيانات المستخدم من التخزين المحلي
      try {
        localStorage.removeItem('auth_user');
        console.log('[Auth] Removed user data from local storage');
      } catch (err) {
        console.error('[Auth] Error removing user data from local storage:', err);
      }
    } catch (error) {
      console.error('خطأ أثناء تسجيل الخروج:', error);
    } finally {
      // إعادة تعيين حالة المستخدم وتوجيه المستخدم إلى صفحة تسجيل الدخول
      setUser(null);
      setLocation('/login');
      setIsLoading(false);
    }
  };

  // التحقق من حالة المصادقة عند بدء التطبيق
  useEffect(() => {
    const checkSession = async () => {
      setIsLoading(true);
      
      try {
        // محاولة استرداد بيانات المستخدم من التخزين المحلي أولاً
        let storedUserData = null;
        try {
          const userDataStr = localStorage.getItem('auth_user');
          if (userDataStr) {
            storedUserData = JSON.parse(userDataStr);
            console.log('[Auth] Found stored user data:', storedUserData.id);
          }
        } catch (err) {
          console.error('[Auth] Error reading user data from local storage:', err);
        }
        
        // التحقق من API المستخدم الحالي
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          headers: storedUserData?.id ? 
            { 'Authorization': `Bearer ${storedUserData.id}` } : 
            {}
        });
        
        if (response.ok) {
          // إذا كان الاتصال بالخادم ناجحًا، استخدم البيانات من الخادم
          const userData = await response.json();
          setUser(userData);
          
          // تحديث البيانات المخزنة محليًا
          try {
            localStorage.setItem('auth_user', JSON.stringify(userData));
            console.log('[Auth] Updated stored user data');
          } catch (err) {
            console.error('[Auth] Error updating stored user data:', err);
          }
        } else if (storedUserData) {
          // إذا فشل الاتصال بالخادم ولكن هناك بيانات مخزنة، استخدم البيانات المخزنة
          console.log('[Auth] Using stored user data as fallback');
          setUser(storedUserData);
        } else {
          // لا توجد بيانات صالحة
          setUser(null);
        }
      } catch (error) {
        console.error('خطأ في التحقق من حالة الجلسة:', error);
        
        // محاولة استخدام البيانات المخزنة محليًا كحل بديل
        try {
          const userDataStr = localStorage.getItem('auth_user');
          if (userDataStr) {
            const userData = JSON.parse(userDataStr);
            console.log('[Auth] Network error, using stored user data');
            setUser(userData);
          } else {
            setUser(null);
          }
        } catch (err) {
          console.error('[Auth] Error reading stored user data:', err);
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSession();
  }, []);

  // دالة للحصول على ترويسات المصادقة
  const getAuthHeaders = (): HeadersInit => {
    // إضافة ترويسة المصادقة مع معرف المستخدم
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    
    // إضافة ترويسة المصادقة إذا كان المستخدم مسجل الدخول
    if (user?.id) {
      headers['Authorization'] = `Bearer ${user.id}`;
    }
    
    return headers;
  };
  
  // دالة لإجراء طلب مع معلومات المصادقة
  const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    // دمج الترويسات المخصصة مع ترويسات المصادقة
    const headers = {
      ...getAuthHeaders(),
      ...(options.headers || {})
    };
    
    // إجراء الطلب مع إضافة الكوكيز
    return fetch(url, {
      ...options,
      headers,
      credentials: 'include'
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        getAuthHeaders,
        authenticatedFetch
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// وظيفة للحصول على بيانات المستخدم المخزنة محلياً
export function getStoredAuthUser(): User | null {
  try {
    const userDataStr = localStorage.getItem('auth_user');
    if (userDataStr) {
      return JSON.parse(userDataStr);
    }
  } catch (err) {
    console.error('[Auth] Error reading stored user data:', err);
  }
  return null;
}

// Hook لاستخدام سياق المصادقة
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('يجب استخدام useAuth داخل AuthProvider');
  }
  return context;
}