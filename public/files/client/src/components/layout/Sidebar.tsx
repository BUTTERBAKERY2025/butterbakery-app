import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

const Sidebar = ({ isCollapsed, toggleSidebar }: SidebarProps) => {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path: string) => {
    return location === path;
  };

  const menuItems = [
    { 
      title: 'لوحة التحكم', 
      path: '/dashboard', 
      icon: 'fas fa-tachometer-alt' 
    },
    { 
      title: 'يومية المبيعات', 
      path: '/daily-sales', 
      icon: 'fas fa-cash-register' 
    },
    { 
      title: 'تقارير اليومية المجمعة', 
      path: '/daily-reports', 
      icon: 'fas fa-file-invoice-dollar' 
    },
    { 
      title: 'الأهداف الشهرية', 
      path: '/targets', 
      icon: 'fas fa-bullseye' 
    },
    { 
      title: 'التقارير والتحليلات', 
      path: '/reports', 
      icon: 'fas fa-chart-line' 
    },
    { 
      title: 'تحليل الذكاء الاصطناعي', 
      path: '/ai-analytics', 
      icon: 'fas fa-brain'
    },
    { 
      title: 'التنبيهات الذكية', 
      path: '/smart-alerts', 
      icon: 'fas fa-bell',
      badge: 'جديد',
      badgeColor: 'bg-indigo-500'
    },
    { 
      title: 'نظام المكافآت', 
      path: '/rewards', 
      icon: 'fas fa-gift',
      badge: 'جديد',
      badgeColor: 'bg-emerald-500'
    },
    { 
      title: 'لوحة المتصدرين', 
      path: '/leaderboards', 
      icon: 'fas fa-trophy',
      badge: 'جديد',
      badgeColor: 'bg-yellow-500'
    },
    { 
      title: 'يوميات المبيعات المجمعة', 
      path: '/consolidated-journal', 
      icon: 'fas fa-book-open',
      roles: ['admin', 'branch_manager', 'supervisor']
    },
    { 
      title: 'إدارة المستخدمين', 
      path: '/users', 
      icon: 'fas fa-users',
      roles: ['admin', 'branch_manager']
    },
    { 
      title: 'إدارة الفروع', 
      path: '/branches', 
      icon: 'fas fa-store',
      roles: ['admin']
    },
    { 
      title: 'صندوق النقدية', 
      path: '/cash-box', 
      icon: 'fas fa-money-bill-wave',
      badge: 'جديد',
      badgeColor: 'bg-green-500'
    },
  ];

  const settingsItems = [
    { 
      title: 'إدارة الصلاحيات', 
      path: '/permissions', 
      icon: 'fas fa-user-lock',
      roles: ['admin']
    },
    { 
      title: 'إعدادات النظام', 
      path: '/settings', 
      icon: 'fas fa-cog' 
    },
    { 
      title: 'الإشعارات', 
      path: '/notifications', 
      icon: 'fas fa-bell' 
    },
  ];

  return (
    <div className={cn(
      "bg-gradient-to-br from-neutral-900 to-neutral-800 text-white h-full flex-shrink-0 transition-all duration-300 ease-in-out fixed z-40 lg:static overflow-hidden shadow-xl",
      isCollapsed ? "w-20" : "w-64"
    )}>
      {/* Header with Logo */}
      <div className="p-4 flex items-center justify-between border-b border-opacity-20 border-neutral-600 bg-gradient-to-r from-neutral-900 to-neutral-800">
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="bg-gradient-to-br from-primary to-secondary p-1 rounded-lg flex-shrink-0 shadow-md">
            <img 
              src="https://images.unsplash.com/photo-1557925923-cd4648e211a0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&q=80" 
              alt="شعار بتر بيكري" 
              className="w-9 h-9 rounded-md object-cover"
            />
          </div>
          {!isCollapsed && (
            <div className="mr-1">
              <h1 className="font-bold text-lg bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">بتر بيكري</h1>
              <span className="text-xs text-neutral-400 font-medium">نظام التشغيل المتكامل</span>
            </div>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className="text-neutral-400 hover:text-white hover:bg-neutral-700 p-1.5 rounded-full transition-colors duration-200"
          title={isCollapsed ? "توسيع القائمة" : "تصغير القائمة"}
        >
          <i className={`fas fa-chevron-${isCollapsed ? 'left' : 'right'} text-xs`}></i>
        </button>
      </div>

      {/* Main Menu Items */}
      <div className="py-4 overflow-y-auto h-[calc(100%-12rem)] scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-800">
        <div className="px-4 py-2 text-xs font-medium tracking-wider text-neutral-500 uppercase">
          {!isCollapsed && 'القائمة الرئيسية'}
          {isCollapsed && <div className="flex justify-center"><i className="fas fa-th-large"></i></div>}
        </div>

        {menuItems.map((item) => {
          // Skip if item requires a role and user doesn't have it
          if (item.roles && (!user || !item.roles.includes(user.role))) {
            return null;
          }

          const active = isActive(item.path);

          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={cn(
                "flex items-center px-4 py-2.5 my-1 mx-2 rounded-md transition-all duration-200",
                active 
                  ? "text-white bg-gradient-to-r from-primary/90 to-secondary/90 shadow-md" 
                  : "text-neutral-300 hover:bg-neutral-700/50 hover:text-white"
              )}
            >
              <div className={cn(
                "flex items-center justify-center",
                active ? "text-white" : "text-neutral-400",
                isCollapsed ? "mx-auto" : "w-7 h-7"
              )}>
                <i className={`${item.icon} ${active ? 'text-white' : ''}`}></i>
              </div>
              {!isCollapsed && (
                <span className={cn(
                  "mr-3 font-medium text-sm", 
                  active && "font-semibold"
                )}>
                  {item.title}
                </span>
              )}
            </Link>
          );
        })}

        <div className="px-4 py-2 mt-4 text-xs font-medium tracking-wider text-neutral-500 uppercase">
          {!isCollapsed && 'الإعدادات'}
          {isCollapsed && <div className="flex justify-center"><i className="fas fa-cogs"></i></div>}
        </div>

        {settingsItems.map((item) => {
          // Skip if item requires a role and user doesn't have it
          if (item.roles && (!user || !item.roles.includes(user.role))) {
            return null;
          }
          
          const active = isActive(item.path);

          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={cn(
                "flex items-center px-4 py-2.5 my-1 mx-2 rounded-md transition-all duration-200",
                active 
                  ? "text-white bg-gradient-to-r from-primary/90 to-secondary/90 shadow-md" 
                  : "text-neutral-300 hover:bg-neutral-700/50 hover:text-white"
              )}
            >
              <div className={cn(
                "flex items-center justify-center",
                active ? "text-white" : "text-neutral-400",
                isCollapsed ? "mx-auto" : "w-7 h-7"
              )}>
                <i className={`${item.icon} ${active ? 'text-white' : ''}`}></i>
              </div>
              {!isCollapsed && (
                <span className={cn(
                  "mr-3 font-medium text-sm", 
                  active && "font-semibold"
                )}>
                  {item.title}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* User Profile Section */}
      <div className={cn(
        "absolute bottom-0 border-t border-neutral-700/50 w-full bg-gradient-to-r from-neutral-900 to-neutral-800",
        isCollapsed ? "w-20" : "w-64"
      )}>
        <div className="p-3">
          <div className="flex items-center">
            <div className="relative">
              <img 
                src={user?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=80&q=80"} 
                alt="صورة المستخدم" 
                className="w-9 h-9 rounded-full object-cover border-2 border-primary/30"
              />
              <div className="absolute bottom-0 left-0 w-3 h-3 bg-green-500 border-2 border-neutral-800 rounded-full"></div>
            </div>
            {!isCollapsed && (
              <>
                <div className="mr-3">
                  <div className="text-sm font-semibold text-white">{user?.name || 'مستخدم النظام'}</div>
                  <div className="text-xs text-neutral-400">{user?.role === 'admin' ? 'مدير النظام' : 'مستخدم'}</div>
                </div>
                <div className="mr-auto">
                  <button 
                    className="bg-neutral-700/50 hover:bg-red-500/20 text-neutral-300 hover:text-red-400 p-1.5 rounded-full transition-colors duration-200"
                    onClick={logout}
                    title="تسجيل الخروج"
                  >
                    <i className="fas fa-sign-out-alt text-sm"></i>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
