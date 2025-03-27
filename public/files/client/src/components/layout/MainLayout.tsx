import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  requireAuth?: boolean;
}

export default function MainLayout({ 
  children, 
  title = 'لوحة التحكم',
  requireAuth = true
}: MainLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // معالجة تغيير حجم الشاشة
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarCollapsed(true);
        setIsMobileSidebarOpen(false);
      } else {
        setIsSidebarCollapsed(false);
      }
    };

    // تعيين الحالة الأولية
    handleResize();

    // إضافة مستمع الحدث
    window.addEventListener('resize', handleResize);

    // تنظيف
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // التحقق من المصادقة والتوجيه إلى صفحة تسجيل الدخول إذا لزم الأمر
  useEffect(() => {
    if (requireAuth && !isLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [requireAuth, isLoading, isAuthenticated, setLocation]);

  const toggleSidebar = () => {
    if (window.innerWidth >= 1024) {
      setIsSidebarCollapsed(prev => !prev);
    } else {
      setIsMobileSidebarOpen(prev => !prev);
    }
  };

  // عرض مؤشر التحميل أثناء التحقق من المصادقة
  if (requireAuth && isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-neutral-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-gray-600">جاري تحميل البيانات...</p>
      </div>
    );
  }

  // إعادة التوجيه إلى صفحة تسجيل الدخول إذا لم يكن المستخدم مصادقا عليه
  if (requireAuth && !isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-neutral-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-gray-600">جاري التوجيه إلى صفحة تسجيل الدخول...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Backdrop for mobile */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div className={`lg:flex ${isMobileSidebarOpen ? 'flex' : 'hidden'}`}>
        <Sidebar 
          isCollapsed={isSidebarCollapsed} 
          toggleSidebar={toggleSidebar} 
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          onMobileMenuToggle={() => setIsMobileSidebarOpen(prev => !prev)} 
          pageTitle={title}
        />
        <main className="flex-1 overflow-y-auto p-6 bg-neutral-100 scrollbar-hide">
          {children}
        </main>
      </div>
    </div>
  );
}
