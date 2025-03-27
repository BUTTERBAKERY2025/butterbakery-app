import React, { useState, useRef } from 'react';
import { Bell, BarChart2, UserCheck, Calendar, Filter, LayoutDashboard, ChevronDown, RefreshCcw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DatePicker } from '@/components/ui/date-picker';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';
import { DateRange } from 'react-day-picker';
import { format, subDays } from 'date-fns';

import AlertsSystem, { AlertsSystemRef } from './AlertsSystem';
import SalesAlerts, { SalesAlertsRef } from './SalesAlerts';
import CashierAlerts, { CashierAlertsRef } from './CashierAlerts';

interface Branch {
  id: number;
  name: string;
}

interface SmartDashboardProps {
  userId?: number;
}

// واجهة بيانات إحصائيات التنبيهات
interface AlertStatistics {
  byPriority?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  byType?: {
    sales: number;
    cashiers: number;
    system: number;
  };
  byStatus?: {
    unread: number;
    read: number;
  };
  total?: number;
}

// فلتر تاريخ افتراضي (آخر 7 أيام)
const getDefaultDateRange = (): DateRange => {
  const today = new Date();
  const sevenDaysAgo = subDays(today, 7);
  return {
    from: sevenDaysAgo,
    to: today
  };
};

const SmartDashboard: React.FC<SmartDashboardProps> = ({ userId }) => {
  // حالة التبويب النشط
  const [activeTab, setActiveTab] = useState('all');
  // حالة الفرع المحدد
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  // حالة نطاق التاريخ
  const [dateRange, setDateRange] = useState<DateRange | undefined>(getDefaultDateRange());
  // حالة التصفية حسب الأولوية
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  
  // مراجع لمكونات التنبيهات المختلفة لإمكانية تحديثها
  const alertsSystemRef = useRef<AlertsSystemRef>(null);
  const salesAlertsRef = useRef<SalesAlertsRef>(null);
  const cashierAlertsRef = useRef<CashierAlertsRef>(null);

  // استعلام للحصول على الفروع
  const { 
    data: branches = [],
    isLoading: isLoadingBranches
  } = useQuery<Branch[]>({
    queryKey: ['/api/branches'],
    enabled: true,
  });

  // معالجة تغيير الفرع
  const handleBranchChange = (value: string) => {
    const branchId = value === 'all' ? null : parseInt(value, 10);
    setSelectedBranchId(branchId);
  };

  // معالجة تغيير نطاق التاريخ
  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
  };

  // معالجة تغيير فلتر الأولوية
  const handlePriorityFilterChange = (value: string) => {
    setPriorityFilter(value === 'all' ? null : value);
  };

  // معالجة تحديث البيانات
  const handleRefresh = () => {
    // إعادة تحميل البيانات من واجهة برمجة التطبيقات
    refetchAlertStats();
    
    // استخدام المراجع لتحديث جميع المكونات
    if (alertsSystemRef.current && alertsSystemRef.current.refetch) {
      alertsSystemRef.current.refetch();
    }
    
    if (salesAlertsRef.current && salesAlertsRef.current.refetch) {
      salesAlertsRef.current.refetch();
    }
    
    if (cashierAlertsRef.current && cashierAlertsRef.current.refetch) {
      cashierAlertsRef.current.refetch();
    }
    
    console.log('تم تحديث جميع البيانات في لوحة التنبيهات');
  };

  // استعلام لإحصائيات التنبيهات
  const {
    data: alertStats,
    isLoading: isLoadingAlertStats,
    error: alertStatsError,
    refetch: refetchAlertStats
  } = useQuery<AlertStatistics>({
    queryKey: ['/api/smart-alerts/stats', selectedBranchId],
    enabled: true,
  });

  // معالجة وضع علامة "مقروء" على التنبيه
  const handleMarkAsRead = async (alertId: string) => {
    try {
      const response = await fetch(`/api/smart-alerts/${alertId}/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        // إعادة تحميل البيانات بعد نجاح العملية
        console.log(`تم تحديث حالة التنبيه ${alertId} إلى مقروء`);
      } else {
        console.error('فشل في تحديث حالة التنبيه');
      }
    } catch (error) {
      console.error('خطأ في تحديث حالة التنبيه:', error);
    }
  };

  // معالجة النقر على إجراء التنبيه
  const handleAlertAction = async (alertId: string, actionType: string) => {
    try {
      const response = await fetch(`/api/smart-alerts/${alertId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ actionType })
      });
      
      if (response.ok) {
        // إعادة تحميل البيانات بعد نجاح العملية
        console.log(`تم تنفيذ إجراء ${actionType} للتنبيه ${alertId}`);
      } else {
        console.error('فشل في تنفيذ الإجراء على التنبيه');
      }
    } catch (error) {
      console.error('خطأ في تنفيذ الإجراء على التنبيه:', error);
    }
  };

  // معالجة النقر على توصية مبيعات
  const handleSalesRecommendation = (alertId: string, recommendationId: string) => {
    console.log(`تطبيق التوصية ${recommendationId} للتنبيه ${alertId}`);
    // هنا يمكن إضافة المنطق لتطبيق التوصية
  };

  // معالجة النقر على إجراء متعلق بالكاشير
  const handleCashierAction = (alertId: string, actionType: string, cashierId: number) => {
    console.log(`تنفيذ إجراء ${actionType} للكاشير ${cashierId}`);
    // هنا يمكن إضافة المنطق لمعالجة الإجراءات المتعلقة بالكاشير
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-indigo-600" />
          <h1 className="text-2xl font-bold">لوحة التنبيهات الذكية</h1>
        </div>
        
        <Button onClick={handleRefresh} variant="outline">
          <Bell className="h-4 w-4 mr-2" />
          تحديث
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">تصفية التنبيهات</CardTitle>
            <CardDescription>تخصيص عرض التنبيهات حسب احتياجاتك</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">الفرع</label>
              <Select onValueChange={handleBranchChange} defaultValue="all">
                <SelectTrigger>
                  <SelectValue placeholder="جميع الفروع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفروع</SelectItem>
                  {branches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">نطاق التاريخ</label>
              <DatePicker 
                value={dateRange} 
                onChange={handleDateRangeChange}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">الأولوية</label>
              <Select onValueChange={handlePriorityFilterChange} defaultValue="all">
                <SelectTrigger>
                  <SelectValue placeholder="جميع الأولويات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأولويات</SelectItem>
                  <SelectItem value="critical">حرج</SelectItem>
                  <SelectItem value="high">عالي</SelectItem>
                  <SelectItem value="medium">متوسط</SelectItem>
                  <SelectItem value="low">منخفض</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">إحصائيات التنبيهات</CardTitle>
            <CardDescription>نظرة عامة على التنبيهات النشطة</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingAlertStats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((_, index) => (
                  <div key={index} className="text-center p-3 bg-gray-50 rounded-lg animate-pulse h-16">
                    <div className="h-7 bg-gray-200 rounded-md w-10 mx-auto mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded-md w-20 mx-auto"></div>
                  </div>
                ))}
              </div>
            ) : alertStatsError ? (
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-red-500">حدث خطأ في تحميل الإحصائيات. الرجاء المحاولة مرة أخرى.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <span className="text-2xl font-bold text-red-600">
                    {alertStats?.byPriority?.critical || 0}
                  </span>
                  <p className="text-xs text-gray-500">تنبيهات حرجة</p>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <span className="text-2xl font-bold text-orange-600">
                    {alertStats?.byPriority?.high || 0}
                  </span>
                  <p className="text-xs text-gray-500">تنبيهات عالية</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <span className="text-2xl font-bold text-amber-600">
                    {alertStats?.byPriority?.medium || 0}
                  </span>
                  <p className="text-xs text-gray-500">تنبيهات متوسطة</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-2xl font-bold text-blue-600">
                    {alertStats?.byPriority?.low || 0}
                  </span>
                  <p className="text-xs text-gray-500">تنبيهات منخفضة</p>
                </div>
              </div>
            )}
            
            <div className="mt-4 flex items-center justify-between text-sm">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-gray-500">
                  {dateRange?.from && dateRange.to
                    ? `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`
                    : 'جميع التواريخ'}
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-gray-500">
                  {selectedBranchId ? `فرع: ${branches.find(b => b.id === selectedBranchId)?.name}` : 'جميع الفروع'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full md:w-[600px]">
          <TabsTrigger value="all" className="flex gap-1">
            <Bell className="h-4 w-4" />
            <span>جميع التنبيهات</span>
          </TabsTrigger>
          <TabsTrigger value="sales" className="flex gap-1">
            <BarChart2 className="h-4 w-4" />
            <span>المبيعات</span>
          </TabsTrigger>
          <TabsTrigger value="cashiers" className="flex gap-1">
            <UserCheck className="h-4 w-4" />
            <span>الكاشيرين</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex gap-1">
            <Bell className="h-4 w-4" />
            <span>النظام</span>
          </TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
          <TabsContent value="all" className="space-y-8">
            <SalesAlerts 
              ref={salesAlertsRef}
              branchId={selectedBranchId || undefined} 
              onRecommendationClick={handleSalesRecommendation}
            />
            <Separator />
            <CashierAlerts 
              ref={cashierAlertsRef}
              branchId={selectedBranchId || undefined} 
              onActionClick={handleCashierAction}
            />
            <Separator />
            <AlertsSystem 
              ref={alertsSystemRef}
              userId={userId} 
              branchId={selectedBranchId || undefined}
              onMarkAsRead={handleMarkAsRead}
              onActionClick={handleAlertAction}
            />
          </TabsContent>
          
          <TabsContent value="sales">
            <SalesAlerts 
              ref={salesAlertsRef}
              branchId={selectedBranchId || undefined} 
              onRecommendationClick={handleSalesRecommendation}
            />
          </TabsContent>
          
          <TabsContent value="cashiers">
            <CashierAlerts 
              ref={cashierAlertsRef}
              branchId={selectedBranchId || undefined} 
              onActionClick={handleCashierAction}
            />
          </TabsContent>
          
          <TabsContent value="system">
            <AlertsSystem 
              ref={alertsSystemRef}
              userId={userId} 
              branchId={selectedBranchId || undefined}
              onMarkAsRead={handleMarkAsRead}
              onActionClick={handleAlertAction}
            />
          </TabsContent>
        </div>
      </Tabs>
      
      <Alert className="bg-indigo-50 border-indigo-100">
        <Bell className="h-4 w-4 text-indigo-500" />
        <AlertTitle>تلميح</AlertTitle>
        <AlertDescription>
          يمكنك تخصيص نوع التنبيهات التي تريد تلقيها وطريقة إرسالها من خلال صفحة الإعدادات.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default SmartDashboard;