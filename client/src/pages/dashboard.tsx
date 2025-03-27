import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import BranchSelector from '@/components/dashboard/BranchSelector';
import QuickStats from '@/components/dashboard/QuickStats';
import SalesAnalytics from '@/components/dashboard/SalesAnalytics';
import BranchTargetAchievement from '@/components/dashboard/BranchTargetAchievement';
import CashierPerformance from '@/components/dashboard/CashierPerformance';
import RecentActivities from '@/components/dashboard/RecentActivities';
import Notifications from '@/components/dashboard/Notifications';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { DateRange } from 'react-day-picker';

export default function Dashboard() {
  const { t } = useTranslation();
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [selectedCashierId, setSelectedCashierId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [discrepancyFilter, setDiscrepancyFilter] = useState<string | null>(null);
  
  // Build query string with all filters
  const buildFilterQueryString = (baseUrl: string) => {
    const params = new URLSearchParams();
    
    if (selectedBranchId) params.append('branchId', selectedBranchId.toString());
    if (selectedCashierId) params.append('cashierId', selectedCashierId.toString());
    if (discrepancyFilter) params.append('discrepancyFilter', discrepancyFilter);
    
    if (dateRange?.from) {
      params.append('startDate', dateRange.from.toISOString().split('T')[0]);
      if (dateRange.to) {
        params.append('endDate', dateRange.to.toISOString().split('T')[0]);
      }
    }
    
    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  };
  
  // Fetch dashboard stats
  const { 
    data: statsResponse, 
    isLoading: isStatsLoading,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['/api/dashboard/stats', { branchId: selectedBranchId, cashierId: selectedCashierId, dateRange, discrepancyFilter }],
    queryFn: async () => {
      if (!selectedBranchId) return { success: true, data: null };
      const url = buildFilterQueryString('/api/dashboard/stats');
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch dashboard stats');
      return res.json();
    },
    enabled: !!selectedBranchId
  });
  
  // استخراج البيانات من الاستجابة
  const stats = statsResponse?.data || null;
  
  // Fetch sales analytics
  const { 
    data: salesDataResponse, 
    isLoading: isSalesDataLoading,
    refetch: refetchSalesData
  } = useQuery({
    queryKey: ['/api/dashboard/sales-analytics', { branchId: selectedBranchId, period: 'weekly', dateRange }],
    queryFn: async () => {
      if (!selectedBranchId) return { success: true, data: [] };
      let url = `/api/dashboard/sales-analytics?branchId=${selectedBranchId}&period=weekly`;
      
      if (dateRange?.from) {
        url += `&startDate=${dateRange.from.toISOString().split('T')[0]}`;
        if (dateRange.to) {
          url += `&endDate=${dateRange.to.toISOString().split('T')[0]}`;
        }
      }
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch sales analytics');
      return res.json();
    },
    enabled: !!selectedBranchId
  });
  
  // استخراج البيانات من الاستجابة والتأكد من أنها مصفوفة
  const salesData = salesDataResponse?.data || [];
  
  // Fetch target achievement
  const { 
    data: branchTargetsResponse, 
    isLoading: isTargetsLoading,
    refetch: refetchTargets
  } = useQuery({
    queryKey: ['/api/dashboard/target-achievement', { dateRange }],
    queryFn: async () => {
      let url = '/api/dashboard/target-achievement';
      
      if (dateRange?.from) {
        const date = new Date(dateRange.from);
        url += `?month=${date.getMonth() + 1}&year=${date.getFullYear()}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch target achievement');
      return res.json();
    }
  });
  
  // استخراج البيانات من الاستجابة والتأكد من أنها مصفوفة
  const branchTargets = branchTargetsResponse?.data || [];
  
  // Fetch cashier performance
  const { 
    data: cashiersResponse, 
    isLoading: isCashiersLoading,
    refetch: refetchCashiers
  } = useQuery({
    queryKey: ['/api/dashboard/cashier-performance', { branchId: selectedBranchId, cashierId: selectedCashierId, dateRange, discrepancyFilter }],
    queryFn: async () => {
      if (!selectedBranchId) return { success: true, data: [] };
      const url = buildFilterQueryString('/api/dashboard/cashier-performance');
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch cashier performance');
      return res.json();
    },
    enabled: !!selectedBranchId
  });
  
  // استخراج البيانات من الاستجابة والتأكد من أنها مصفوفة
  const cashiers = cashiersResponse?.data || [];
  
  // Fetch activities
  const { 
    data: activitiesResponse, 
    isLoading: isActivitiesLoading,
    refetch: refetchActivities
  } = useQuery({
    queryKey: ['/api/activities', { limit: 5, branchId: selectedBranchId }],
    queryFn: async () => {
      let url = '/api/activities?limit=5';
      if (selectedBranchId) {
        url += `&branchId=${selectedBranchId}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch activities');
      return res.json();
    }
  });
  
  // استخراج البيانات من الاستجابة والتأكد من أنها مصفوفة
  const activities = Array.isArray(activitiesResponse) ? activitiesResponse : [];
  
  // Fetch notifications
  const { 
    data: notificationsResponse, 
    isLoading: isNotificationsLoading,
    refetch: refetchNotifications
  } = useQuery({
    queryKey: ['/api/notifications', { limit: 3 }],
    queryFn: async () => {
      const res = await fetch('/api/notifications?limit=3');
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return res.json();
    }
  });
  
  // استخراج البيانات من الاستجابة والتأكد من أنها مصفوفة
  const notifications = Array.isArray(notificationsResponse) ? notificationsResponse : [];

  const handleRefresh = () => {
    refetchStats();
    refetchSalesData();
    refetchTargets();
    refetchCashiers();
    refetchActivities();
    refetchNotifications();
  };

  return (
    <MainLayout title={t('dashboard.title')}>
      {/* Page Header with Gradient Background */}
      <div className="mb-6 bg-gradient-to-l from-amber-50 to-amber-100 p-3 rounded-lg border border-amber-200 shadow-sm">
        <div className="flex items-center">
          <div className="mr-3 text-amber-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18"/>
              <path d="M18.4 9a9 9 0 0 0-6.4-3H11V4a9 9 0 0 0-6 8.4"/>
              <path d="M14 15H4"/>
              <path d="M18 19H4"/>
              <path d="M15 11h-3.5A3.5 3.5 0 0 0 8 14.5V15h7v-4Z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-amber-900">{t('dashboard.title')}</h1>
            <p className="text-amber-700 text-sm">بتر بيكري - نظام إدارة المبيعات والأداء</p>
          </div>
        </div>
      </div>

      {/* Advanced Filter Panel */}
      <BranchSelector
        selectedBranchId={selectedBranchId}
        onBranchChange={setSelectedBranchId}
        onRefresh={handleRefresh}
        filterOptions={{
          selectedCashierId,
          onCashierChange: setSelectedCashierId,
          dateRange,
          onDateRangeChange: setDateRange,
          discrepancyFilter,
          onDiscrepancyFilterChange: setDiscrepancyFilter
        }}
      />
      
      {/* Quick Stats Cards */}
      {isStatsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[180px] rounded-lg" />
          ))}
        </div>
      ) : stats ? (
        <QuickStats stats={stats} />
      ) : (
        <div className="bg-amber-50 p-8 text-center rounded-lg mb-6 border border-amber-200 shadow-sm">
          <div className="flex flex-col items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 mb-2">
              <path d="M18 6 7 6"></path>
              <path d="m15 10-5 0"></path>
              <rect x="4" y="4" width="16" height="16" rx="2"></rect>
              <path d="M13 14h1"></path>
              <path d="M17 14h.01"></path>
              <path d="M13 17h4"></path>
            </svg>
            <h3 className="text-lg font-medium text-amber-800">{t('dashboard.selectBranchPrompt')}</h3>
            <p className="text-amber-600 text-sm mt-1">اختر فرعًا من القائمة المنسدلة أعلاه لعرض بيانات المبيعات والأداء</p>
          </div>
        </div>
      )}
      
      {/* Sales Analytics Section */}
      {isStatsLoading || isSalesDataLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Skeleton className="h-[400px] lg:col-span-2 rounded-lg" />
          <Skeleton className="h-[400px] rounded-lg" />
        </div>
      ) : stats ? (
        <div className="mb-6 bg-white rounded-lg border border-neutral-200 shadow-sm">
          <div className="p-4 border-b border-neutral-200">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 mr-2">
                <path d="M22 12V8a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4Z"/>
                <path d="M6 9v6"/>
                <path d="M10 9v6"/>
                <path d="M14 9v6"/>
                <path d="M18 9v6"/>
              </svg>
              <h2 className="text-xl font-bold text-amber-900">تحليل المبيعات والأداء</h2>
            </div>
          </div>
          <div className="p-0">
            <SalesAnalytics stats={stats} salesData={salesData} />
          </div>
        </div>
      ) : null}
      
      {/* Targets and Cashiers Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {isTargetsLoading ? (
          <Skeleton className="h-[400px] lg:col-span-2 rounded-lg" />
        ) : (
          <div className="lg:col-span-2 bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-neutral-200">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 mr-2">
                  <path d="M12 2v8"/>
                  <path d="m16 6-4 4-4-4"/>
                  <rect x="4" y="14" width="16" height="8" rx="2"/>
                </svg>
                <h2 className="text-xl font-bold text-green-800">تحقيق الأهداف الشهرية للفروع</h2>
              </div>
            </div>
            <div className="p-0">
              <BranchTargetAchievement data={branchTargets} />
            </div>
          </div>
        )}
        
        {isCashiersLoading ? (
          <Skeleton className="h-[400px] rounded-lg" />
        ) : (
          <div className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-neutral-200">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600 mr-2">
                  <circle cx="12" cy="6" r="4"/>
                  <path d="M17 10h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2"/>
                  <path d="M7 10H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2"/>
                  <path d="M19 12a7 7 0 0 1-7 7 7 7 0 0 1-7-7"/>
                </svg>
                <h2 className="text-xl font-bold text-purple-800">أداء الكاشير اليومي</h2>
              </div>
            </div>
            <div className="p-0">
              <CashierPerformance cashiers={cashiers} />
            </div>
          </div>
        )}
      </div>
      
      {/* Actions Quick Card */}
      <div className="mb-6">
        <div className="bg-gradient-to-r from-amber-50 via-amber-100 to-amber-50 rounded-lg border border-amber-200 shadow-sm p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a href="/users" className="bg-white hover:bg-amber-50 p-4 rounded-lg border border-amber-200 shadow-sm transition-all flex flex-col items-center justify-center gap-2 no-underline">
              <div className="p-3 bg-amber-100 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-700">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <span className="text-amber-800 font-medium text-sm">إدارة الموظفين</span>
            </a>

            <a href="/daily-sales" className="bg-white hover:bg-green-50 p-4 rounded-lg border border-green-200 shadow-sm transition-all flex flex-col items-center justify-center gap-2 no-underline">
              <div className="p-3 bg-green-100 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-700">
                  <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                  <line x1="2" y1="10" x2="22" y2="10"></line>
                </svg>
              </div>
              <span className="text-green-800 font-medium text-sm">المبيعات اليومية</span>
            </a>

            <a href="/reports" className="bg-white hover:bg-blue-50 p-4 rounded-lg border border-blue-200 shadow-sm transition-all flex flex-col items-center justify-center gap-2 no-underline">
              <div className="p-3 bg-blue-100 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-700">
                  <path d="M3 3v18h18"></path>
                  <path d="m8 9 3-3 1 1 3-3"></path>
                  <path d="m8 15 3-3 1 1 3-3"></path>
                </svg>
              </div>
              <span className="text-blue-800 font-medium text-sm">تقارير الأداء</span>
            </a>

            <a href="/daily-reports" className="bg-white hover:bg-purple-50 p-4 rounded-lg border border-purple-200 shadow-sm transition-all flex flex-col items-center justify-center gap-2 no-underline">
              <div className="p-3 bg-purple-100 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-700">
                  <path d="M12 20V10"></path>
                  <path d="M18 20V4"></path>
                  <path d="M6 20v-4"></path>
                </svg>
              </div>
              <span className="text-purple-800 font-medium text-sm">تحليل المبيعات</span>
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Row - Activities and Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* More Compact Activities Section - takes up less space */}
        {isActivitiesLoading ? (
          <Skeleton className="h-[280px] lg:col-span-2 rounded-lg" />
        ) : (
          <div className="lg:col-span-2 bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden">
            <div className="p-3 border-b border-neutral-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 mr-2">
                    <path d="M4.9 19.05A9 9 0 0 1 12 3a8.95 8.95 0 0 1 8.95 7.75"/>
                    <path d="M19.5 15H19a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1h-1a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1h-1a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1h-.5"/>
                  </svg>
                  <h2 className="text-lg font-bold text-blue-800">آخر النشاطات</h2>
                </div>
                <a href="/activities" className="text-xs text-blue-600 hover:text-blue-800 hover:underline">
                  عرض الكل
                </a>
              </div>
            </div>
            <div className="p-0 max-h-[220px] overflow-y-auto">
              {/* Compact version of RecentActivities */}
              <div className="divide-y divide-neutral-100">
                {activities.slice(0, 3).map((activity: any) => (
                  <div key={activity.id} className="flex items-center p-3 hover:bg-neutral-50">
                    <div className="mr-3 text-blue-600">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="m12 8 4 4-4 4"/>
                        <path d="M8 12h8"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm text-neutral-800">
                          {activity.action.includes('sales') ? 'تسجيل مبيعات' : 
                           activity.action.includes('target') ? 'تحقيق هدف' : 
                           activity.action.includes('shortage') ? 'تسجيل عجز' : 'نشاط جديد'}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {new Date(activity.timestamp).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 truncate">
                        {activity.user?.name || 'مستخدم'} - {activity.branch?.name || 'الفرع الرئيسي'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Notifications - takes up less space */}
        {isNotificationsLoading ? (
          <Skeleton className="h-[280px] rounded-lg" />
        ) : (
          <div className="lg:col-span-1 bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden">
            <div className="p-3 border-b border-neutral-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600 mr-2">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
                  </svg>
                  <h2 className="text-lg font-bold text-red-800">التنبيهات</h2>
                </div>
              </div>
            </div>
            <div className="p-0 max-h-[220px] overflow-y-auto">
              <Notifications notifications={notifications} />
            </div>
          </div>
        )}
        
        {/* New Sales Target Tracker - Modern Gauge */}
        <div className="lg:col-span-1 bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-neutral-200">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 mr-2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
              <h2 className="text-lg font-bold text-green-800">متابعة الأهداف</h2>
            </div>
          </div>
          <div className="p-4 flex flex-col items-center justify-center">
            {stats && (
              <>
                <div className="relative w-36 h-36 mb-3">
                  {/* Background circle */}
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      fill="none" 
                      stroke="#e6e6e6" 
                      strokeWidth="10"
                    />
                    {/* Progress circle */}
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      fill="none" 
                      stroke={stats.monthlyTargetPercentage >= 90 ? "#10b981" : 
                              stats.monthlyTargetPercentage >= 70 ? "#f59e0b" : 
                              "#ef4444"} 
                      strokeWidth="10"
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 - (251.2 * stats.monthlyTargetPercentage / 100)}
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                    />
                    {/* Center text */}
                    <text 
                      x="50" 
                      y="45" 
                      textAnchor="middle" 
                      fontSize="18" 
                      fontWeight="bold"
                      fill="#333"
                    >
                      {Math.round(stats.monthlyTargetPercentage)}%
                    </text>
                    <text 
                      x="50" 
                      y="65" 
                      textAnchor="middle" 
                      fontSize="10"
                      fill="#666"
                    >
                      الهدف الشهري
                    </text>
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm text-neutral-500 mb-1">الهدف: {new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(stats.monthlyTargetAmount)}</p>
                  <p className="text-sm text-neutral-800 font-medium">المبيعات: {new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(stats.monthlySalesAmount)}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
