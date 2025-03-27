import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { User } from '@shared/schema';

/**
 * نظام المصادقة المبسط والفعال
 * تمت إعادة هيكلة كاملة للتخلص من مشاكل الأداء والتوقف
 */

// واجهة سياق المصادقة
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

// إنشاء سياق المصادقة
const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// موفر سياق المصادقة
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // الحالة الأساسية
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // التحقق من حالة المصادقة عند تحميل التطبيق
  useEffect(() => {
    async function checkAuth() {
      try {
        // محاولة تحميل البيانات من التخزين المحلي أولاً للتجربة المبدئية السريعة
        try {
          const cachedUser = localStorage.getItem('auth_user');
          if (cachedUser) {
            setUser(JSON.parse(cachedUser));
          }
        } catch (e) {
          console.error('خطأ في قراءة بيانات المستخدم المخزنة:', e);
        }

        // التحقق من الجلسة الحالية من الخادم
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          localStorage.setItem('auth_user', JSON.stringify(userData));
        } else {
          // مسح البيانات المحلية في حالة عدم وجود جلسة صالحة
          setUser(null);
          localStorage.removeItem('auth_user');
        }
      } catch (error) {
        console.error('خطأ أثناء التحقق من المصادقة:', error);
        // الاحتفاظ بالبيانات المحلية في حالة وجود خطأ في الشبكة
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  // دالة تسجيل الدخول
  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.user) {
          setUser(data.user);
          localStorage.setItem('auth_user', JSON.stringify(data.user));
          
          toast({
            title: 'تم تسجيل الدخول بنجاح',
            description: `مرحبًا، ${data.user.name}`,
          });
          
          return true;
        } else {
          toast({
            title: 'خطأ في تسجيل الدخول',
            description: 'بيانات المستخدم غير متوفرة',
            variant: 'destructive',
          });
          return false;
        }
      } else {
        toast({
          title: 'خطأ في تسجيل الدخول',
          description: 'اسم المستخدم أو كلمة المرور غير صحيحة',
          variant: 'destructive',
        });
        
        return false;
      }
    } catch (error) {
      console.error('خطأ في تسجيل الدخول:', error);
      
      toast({
        title: 'خطأ في تسجيل الدخول',
        description: 'حدث خطأ أثناء محاولة الاتصال بالخادم',
        variant: 'destructive',
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // دالة تسجيل الخروج
  const logout = async (): Promise<void> => {
    setIsLoading(true);
    
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('خطأ أثناء تسجيل الخروج:', error);
    } finally {
      // مسح البيانات المحلية دائمًا بغض النظر عن نتيجة طلب تسجيل الخروج
      setUser(null);
      localStorage.removeItem('auth_user');
      setLocation('/login');
      setIsLoading(false);
      
      toast({
        title: 'تم تسجيل الخروج بنجاح'
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook لاستخدام سياق المصادقة
export function useAuth() {
  return useContext(AuthContext);
}