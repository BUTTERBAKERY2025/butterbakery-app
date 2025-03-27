import React, { useState, useMemo } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import BranchSelector from '@/components/dashboard/BranchSelector';
import TargetForm from '@/components/forms/TargetForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { format, getDaysInMonth, addDays, subDays, isToday, isSameDay } from 'date-fns';
import { ar } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, AreaChart, Area } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { CalendarIcon, ChevronRight, ChevronLeft, BarChart3, PieChart, LineChart as LineChartIcon, Maximize2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { PopoverTrigger, PopoverContent, Popover } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

export default function Targets() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('view');
  const [selectedViewMode, setSelectedViewMode] = useState<'overview' | 'daily' | 'analysis'>('overview');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1) + '/' + new Date().getFullYear());
  const { user } = useAuth();
  
  // Determine if user can create targets
  const canCreateTargets = user?.role === 'admin' || user?.role === 'branch_manager';
  
  // Calculate month and year values
  const [monthNum, yearNum] = selectedMonth.split('/').map(Number);
  const daysInCurrentMonth = getDaysInMonth(new Date(yearNum, monthNum - 1));
  
  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ['/api/branches'],
    queryFn: async () => {
      const res = await fetch('/api/branches');
      if (!res.ok) throw new Error('Failed to fetch branches');
      return res.json();
    }
  });
  
  // Fetch monthly targets achievement
  const { 
    data: branchTargetsResponse, 
    isLoading,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['/api/dashboard/target-achievement', selectedMonth],
    queryFn: async () => {
      const [month, year] = selectedMonth.split('/');
      const res = await fetch(`/api/dashboard/target-achievement?month=${month}&year=${year}`);
      if (!res.ok) throw new Error('Failed to fetch target achievement');
      return res.json();
    },
    // إضافة إعادة تحميل عند تغيير الشهر المحدد
    enabled: selectedMonth !== ''
  });
  
  // استخراج البيانات من الاستجابة والتأكد من أنها مصفوفة
  const branchTargets = Array.isArray(branchTargetsResponse?.data) ? branchTargetsResponse?.data : [];
  
  // Generate month options
  const generateMonthOptions = () => {
    const months = [];
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    // Add options for current month and previous 5 months
    for (let i = 0; i < 6; i++) {
      let month = currentMonth - i;
      let year = currentYear;
      
      if (month <= 0) {
        month += 12;
        year -= 1;
      }
      
      months.push({
        value: `${month}/${year}`,
        label: `${getMonthName(month, true)} ${year}`
      });
    }
    
    return months;
  };
  
  // Get month name (always use Gregorian calendar)
  const getMonthName = (month: number, useEnglish = false) => {
    const date = new Date();
    date.setMonth(month - 1);
    // Always use en-US locale for Gregorian months, translate if needed
    const englishMonth = date.toLocaleString('en-US', { month: 'long' });
    
    // Translation map for Arabic
    if (!useEnglish) {
      const arabicMonths = {
        'January': 'يناير',
        'February': 'فبراير',
        'March': 'مارس',
        'April': 'أبريل',
        'May': 'مايو',
        'June': 'يونيو',
        'July': 'يوليو',
        'August': 'أغسطس',
        'September': 'سبتمبر',
        'October': 'أكتوبر',
        'November': 'نوفمبر',
        'December': 'ديسمبر'
      };
      return arabicMonths[englishMonth as keyof typeof arabicMonths] || englishMonth;
    }
    
    return englishMonth;
  };
  
  // Get status badge
  const getStatusBadge = (status: string) => {
    // Map Arabic status to English
    let englishStatus = status;
    if (status === 'ممتاز') englishStatus = 'Excellent';
    if (status === 'جيد جدًا') englishStatus = 'Very Good';
    if (status === 'جيد') englishStatus = 'Good';
    if (status === 'يحتاج تحسين') englishStatus = 'Needs Improvement';
    
    switch (status) {
      case 'ممتاز':
        return <Badge className="bg-green-100 text-green-600">{status}</Badge>;
      case 'جيد جدًا':
        return <Badge className="bg-blue-100 text-blue-600">{status}</Badge>;
      case 'جيد':
        return <Badge className="bg-amber-100 text-amber-600">{status}</Badge>;
      case 'يحتاج تحسين':
        return <Badge className="bg-red-100 text-red-600">{status}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  // Handle refresh
  const handleRefresh = async () => {
    try {
      await refetch();
      // إضافة إشعار بنجاح التحديث
      toast({
        title: t('common.refreshed'),
        description: t('targets.dataRefreshed'),
        variant: "default",
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      // إشعار بفشل التحديث
      toast({
        title: t('common.error'),
        description: t('targets.refreshError'),
        variant: "destructive",
      });
    }
  };
  
  // Handle form success
  const handleFormSuccess = () => {
    refetch();
    setActiveTab('view');
  };
  
  // Month options
  const monthOptions = generateMonthOptions();
  
  // Get progress color based on percentage
  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-500'; 
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };
  
  // Simulated data for daily view (demo purposes)
  const getDailyTargetData = useMemo(() => {
    // For the selected month, generate daily data
    const result = [];
    
    // Get the first day of selected month
    const firstDay = new Date(yearNum, monthNum - 1, 1);
    const startDate = firstDay;
    
    // Get days in month
    const daysInMonth = getDaysInMonth(new Date(yearNum, monthNum - 1));
    
    // Generate artificial data - this would be replaced with actual API data
    for (let i = 0; i < daysInMonth; i++) {
      const currentDate = addDays(startDate, i);
      const dayOfWeek = currentDate.getDay();
      
      // Weekends have higher targets
      let weightMultiplier = 1.0;
      if (dayOfWeek === 5) weightMultiplier = 1.5; // Friday
      if (dayOfWeek === 6) weightMultiplier = 1.3; // Saturday
      
      // Base daily target (in real app, would come from API)
      const baseTarget = 10000; // SAR
      const dailyTarget = baseTarget * weightMultiplier;
      
      // Historical data for past days, projected for future days
      let actualSales = 0;
      const today = new Date();
      
      if (currentDate < today) {
        // Past day: simulate actual sales
        // Base achievement level on how far from today (more recent = more accurate)
        const distance = Math.abs(today.getTime() - currentDate.getTime());
        const distanceDays = Math.ceil(distance / (1000 * 3600 * 24));
        
        // Random factor for variation
        const randomFactor = 0.7 + Math.random() * 0.6; // 0.7 to 1.3
        
        // Achievement percentage varies by day of week
        let achievementPercent = 0.85; // baseline 85%
        if (dayOfWeek === 5) achievementPercent = 0.95; // Fridays do better
        if (dayOfWeek === 0) achievementPercent = 0.75; // Sundays do worse
        
        // Calculate sales with some natural variation
        actualSales = dailyTarget * achievementPercent * randomFactor;
      }
      
      // Format the day as YYYY-MM-DD
      const formattedDate = format(currentDate, 'yyyy-MM-dd');
      
      result.push({
        date: formattedDate,
        dayOfMonth: currentDate.getDate(),
        dayName: format(currentDate, 'EEEE', { locale: ar }),
        isWeekend: dayOfWeek === 5 || dayOfWeek === 6,
        isToday: isSameDay(currentDate, today),
        isPast: currentDate < today,
        isFuture: currentDate > today,
        target: dailyTarget,
        sales: actualSales,
        achievement: actualSales > 0 ? (actualSales / dailyTarget) * 100 : 0
      });
    }
    
    return result;
  }, [monthNum, yearNum]);
  
  // Selected branch data
  const selectedBranchData = useMemo(() => {
    if (!selectedBranchId || branchTargets.length === 0) return null;
    return branchTargets.find((branch: any) => branch.branchId === selectedBranchId);
  }, [selectedBranchId, branchTargets]);
  
  // Get month summary stats for the selected branch
  const getMonthSummary = (branchData: any) => {
    if (!branchData) return null;
    
    // Calculate days passed and days remaining
    const now = new Date();
    const currentDay = now.getDate();
    const totalDays = daysInCurrentMonth;
    const daysElapsed = Math.min(currentDay, totalDays);
    const daysRemaining = totalDays - daysElapsed;
    
    // Calculate daily averages
    const dailyTargetAvg = branchData.target / totalDays;
    const dailySalesAvg = branchData.achieved / daysElapsed;
    
    // Calculate projection
    const projectedMonthTotal = dailySalesAvg * totalDays;
    const projectedAchievement = (projectedMonthTotal / branchData.target) * 100;
    
    // Calculate required daily sales to meet target
    const remainingAmount = branchData.target - branchData.achieved;
    const requiredDailyAvg = daysRemaining > 0 ? remainingAmount / daysRemaining : 0;
    
    return {
      daysElapsed,
      daysRemaining,
      dailyTargetAvg,
      dailySalesAvg,
      projectedMonthTotal,
      projectedAchievement,
      remainingAmount,
      requiredDailyAvg
    };
  };
  
  // Get performance metrics
  const getPerformanceLabel = (percentage: number, isProjected = false) => {
    const prefix = isProjected ? t('targets.projectedStatus') : '';
    
    if (percentage >= 100) {
      return `${prefix} ${t('targets.excellentStatus')}`;
    } else if (percentage >= 90) {
      return `${prefix} ${t('targets.veryGoodStatus')}`;
    } else if (percentage >= 75) {
      return `${prefix} ${t('targets.goodStatus')}`;
    } else {
      return `${prefix} ${t('targets.needsImprovementStatus')}`;
    }
  };
  
  // Get assessment and recommendations
  const getRecommendations = (branchData: any, summary: any) => {
    if (!branchData || !summary) return [];
    
    const recommendations = [];
    
    // Analyze current performance
    if (summary.projectedAchievement < 100) {
      // If projected to miss target
      const deficit = ((100 - summary.projectedAchievement) / 100) * branchData.target;
      
      recommendations.push({
        type: 'warning',
        message: t('targets.projectedDeficitWarning', { 
          amount: formatCurrency(deficit), 
          percentage: (100 - summary.projectedAchievement).toFixed(1) 
        })
      });
      
      // Add tactical recommendations
      if (summary.daysRemaining > 0) {
        recommendations.push({
          type: 'action',
          message: t('targets.requiredDailySalesRecommendation', { 
            amount: formatCurrency(summary.requiredDailyAvg),
            days: summary.daysRemaining
          })
        });
      }
      
      // Add strategic recommendations
      if (summary.projectedAchievement < 75) {
        recommendations.push({
          type: 'strategy',
          message: t('targets.majorInterventionRecommendation')
        });
      } else {
        recommendations.push({
          type: 'strategy',
          message: t('targets.minorInterventionRecommendation')
        });
      }
    } else {
      // If on track or exceeding target
      recommendations.push({
        type: 'success',
        message: t('targets.onTrackMessage', {
          percentage: summary.projectedAchievement.toFixed(1)
        })
      });
      
      // Additional positive reinforcement
      if (summary.projectedAchievement > 110) {
        recommendations.push({
          type: 'bonus',
          message: t('targets.exceptionalPerformanceMessage')
        });
      }
    }
    
    return recommendations;
  };
  
  // Render data visualization for daily view
  const renderDailyVisualization = () => {
    if (!getDailyTargetData || getDailyTargetData.length === 0) return null;
    
    return (
      <div className="space-y-6">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={getDailyTargetData}
              margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="dayOfMonth" 
                label={{ 
                  value: t('targets.dayOfMonth'), 
                  position: 'insideBottom', 
                  offset: -15 
                }} 
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value)}
                label={{ 
                  value: t('targets.amount'), 
                  angle: -90, 
                  position: 'insideLeft',
                  dy: -50 // إضافة هذا المتغير لتفادي التداخل
                }} 
              />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), ""]}
                labelFormatter={(label) => `${t('targets.day')} ${label}`}
              />
              <Legend />
              <Bar 
                dataKey="target" 
                name={t('targets.dailyTarget')}
                fill="#4f46e5" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="sales" 
                name={t('targets.actualSales')}
                fill="#10b981" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="border rounded-lg">
          <div className="grid grid-cols-7 gap-1 p-2 text-center text-xs font-medium border-b">
            <div className="text-red-600">{t('targets.sunday')}</div>
            <div>{t('targets.monday')}</div>
            <div>{t('targets.tuesday')}</div>
            <div>{t('targets.wednesday')}</div>
            <div>{t('targets.thursday')}</div>
            <div className="text-blue-600">{t('targets.friday')}</div>
            <div className="text-green-600">{t('targets.saturday')}</div>
          </div>
          
          <div className="grid grid-cols-7 gap-1 p-2">
            {/* Generate calendar layout */}
            {(() => {
              const firstDay = new Date(yearNum, monthNum - 1, 1);
              const startingDayOfWeek = firstDay.getDay();
              const cells = [];
              
              // Add empty cells for days before start of month
              for (let i = 0; i < startingDayOfWeek; i++) {
                cells.push(<div key={`empty-start-${i}`} className="aspect-square p-1" />);
              }
              
              // Add cells for each day of the month
              for (let day = 1; day <= daysInCurrentMonth; day++) {
                const date = new Date(yearNum, monthNum - 1, day);
                const dayData = getDailyTargetData.find(d => 
                  new Date(d.date).getDate() === day
                );
                
                // Determine styling based on day type
                const isWeekend = date.getDay() === 5 || date.getDay() === 6;
                const isCurrentDay = isToday(date);
                
                // Status colors
                let statusColor = 'bg-gray-100';
                let textColor = isWeekend ? 'text-blue-600' : '';
                
                if (dayData && dayData.isPast) {
                  if (dayData.achievement >= 100) {
                    statusColor = 'bg-green-100';
                    textColor = 'text-green-700';
                  } else if (dayData.achievement >= 80) {
                    statusColor = 'bg-amber-100';
                    textColor = 'text-amber-700';
                  } else {
                    statusColor = 'bg-red-100';
                    textColor = 'text-red-700';
                  }
                }
                
                // Current day highlight
                if (isCurrentDay) {
                  statusColor = 'bg-blue-100 ring-2 ring-blue-500';
                  textColor = 'text-blue-700 font-bold';
                }
                
                cells.push(
                  <div 
                    key={day} 
                    className={`aspect-square p-1 rounded ${statusColor} hover:bg-opacity-80 transition-all cursor-pointer flex flex-col`}
                    onClick={() => setSelectedDate(date)}
                  >
                    <div className={`text-center text-sm font-medium ${textColor}`}>
                      {day}
                    </div>
                    {dayData && dayData.isPast && (
                      <div className="mt-auto text-center text-xs font-medium">
                        {dayData.achievement.toFixed(0)}%
                      </div>
                    )}
                  </div>
                );
              }
              
              // Add empty cells for days after end of month
              const totalCells = 7 * Math.ceil((startingDayOfWeek + daysInCurrentMonth) / 7);
              for (let i = startingDayOfWeek + daysInCurrentMonth; i < totalCells; i++) {
                cells.push(<div key={`empty-end-${i}`} className="aspect-square p-1" />);
              }
              
              return cells;
            })()}
          </div>
        </div>
        
        {/* Day detail view */}
        {(() => {
          const selectedDayData = getDailyTargetData.find(d => 
            format(new Date(d.date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
          );
          
          if (!selectedDayData) return null;
          
          return (
            <div className="border rounded-lg p-4 bg-white shadow-sm">
              <h3 className="text-lg font-semibold mb-2">
                {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: ar })}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-blue-700 text-sm">{t('targets.dailyTarget')}</div>
                  <div className="font-bold text-lg">{formatCurrency(selectedDayData.target)}</div>
                </div>
                
                {selectedDayData.isPast ? (
                  <>
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-green-700 text-sm">{t('targets.actualSales')}</div>
                      <div className="font-bold text-lg">{formatCurrency(selectedDayData.sales)}</div>
                    </div>
                    
                    <div className={`${
                      selectedDayData.achievement >= 100 ? 'bg-green-50 text-green-700' :
                      selectedDayData.achievement >= 80 ? 'bg-amber-50 text-amber-700' :
                      'bg-red-50 text-red-700'
                    } rounded-lg p-3`}>
                      <div className="text-sm">{t('targets.achievement')}</div>
                      <div className="font-bold text-lg">{selectedDayData.achievement.toFixed(1)}%</div>
                    </div>
                  </>
                ) : (
                  <div className="md:col-span-2 bg-gray-50 rounded-lg p-3 flex items-center justify-center">
                    <div className="text-gray-500 text-center">
                      {selectedDayData.isToday ? 
                        t('targets.todayMessage') : 
                        t('targets.futureMessage')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    );
  };
  
  // Render detail view for a specific branch
  const renderBranchDetailView = (branch: any) => {
    if (!branch) return null;
    
    const summary = getMonthSummary(branch);
    if (!summary) return null;
    
    // Get recommendations
    const recommendations = getRecommendations(branch, summary);
    
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">{branch.branchName}</h2>
              <p className="text-gray-500">{getMonthName(monthNum)} {yearNum}</p>
            </div>
            
            <div className="flex items-center mt-2 md:mt-0">
              {getStatusBadge(branch.status)}
              <span className="mr-2 text-sm font-medium">{t('targets.status')}:</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="text-sm text-gray-500">{t('targets.target')}</h4>
              <p className="text-2xl font-bold">{formatCurrency(branch.target)}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-md">
              <h4 className="text-sm text-blue-700">{t('targets.achieved')}</h4>
              <p className="text-2xl font-bold">{formatCurrency(branch.achieved)}</p>
              <p className="text-xs text-blue-600 mt-1">
                {t('targets.outOf')} {formatCurrency(branch.target)}
              </p>
            </div>
            <div className="bg-amber-50 p-4 rounded-md">
              <h4 className="text-sm text-amber-700">{t('targets.remaining')}</h4>
              <p className="text-2xl font-bold">{formatCurrency(Math.max(0, branch.target - branch.achieved))}</p>
              <p className="text-xs text-amber-600 mt-1">
                {summary.daysRemaining} {t('targets.daysRemaining')}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-md">
              <h4 className="text-sm text-purple-700">{t('targets.projectedTotal')}</h4>
              <p className="text-2xl font-bold">{formatCurrency(summary.projectedMonthTotal)}</p>
              <p className="text-xs text-purple-600 mt-1">
                ({summary.projectedAchievement.toFixed(1)}% {t('targets.ofTarget')})
              </p>
            </div>
          </div>
          
          <div className="mb-1 flex justify-between text-sm">
            <span>{t('targets.progress')}</span>
            <span>{typeof branch.percentage === 'number' ? branch.percentage.toFixed(1) : '0.0'}%</span>
          </div>
          <Progress 
            value={typeof branch.percentage === 'number' ? branch.percentage : 0} 
            className="h-3" 
            indicatorClassName={getProgressColor(typeof branch.percentage === 'number' ? branch.percentage : 0)}
          />
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">{t('targets.currentPerformance')}</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <div className="text-sm text-gray-600">{t('targets.daysElapsed')}</div>
                  <div className="font-medium">{summary.daysElapsed} / {daysInCurrentMonth}</div>
                </div>
                <div className="flex justify-between">
                  <div className="text-sm text-gray-600">{t('targets.dailyTargetAvg')}</div>
                  <div className="font-medium">{formatCurrency(summary.dailyTargetAvg)}</div>
                </div>
                <div className="flex justify-between">
                  <div className="text-sm text-gray-600">{t('targets.actualDailyAvg')}</div>
                  <div className="font-medium">{formatCurrency(summary.dailySalesAvg)}</div>
                </div>
                <div className="flex justify-between">
                  <div className="text-sm text-gray-600">{t('targets.dailyAvgDifference')}</div>
                  <div className={`font-medium ${summary.dailySalesAvg >= summary.dailyTargetAvg ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(summary.dailySalesAvg - summary.dailyTargetAvg)}
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">{t('targets.projections')}</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <div className="text-sm text-gray-600">{t('targets.requiredPerDay')}</div>
                  <div className="font-medium">{formatCurrency(summary.requiredDailyAvg)}</div>
                </div>
                <div className="flex justify-between">
                  <div className="text-sm text-gray-600">{t('targets.projectedAchievement')}</div>
                  <div className={`font-medium ${summary.projectedAchievement >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                    {summary.projectedAchievement.toFixed(1)}%
                  </div>
                </div>
                <div className="flex justify-between">
                  <div className="text-sm text-gray-600">{t('targets.projectedStatus')}</div>
                  <div className={`font-medium ${
                    summary.projectedAchievement >= 100 ? 'text-green-600' : 
                    summary.projectedAchievement >= 90 ? 'text-blue-600' :
                    summary.projectedAchievement >= 75 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {getPerformanceLabel(summary.projectedAchievement, true)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Recommendations */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-lg font-semibold mb-4">{t('targets.recommendationsTitle')}</h3>
          
          <div className="space-y-3">
            {recommendations.map((rec, idx) => {
              let bgColor = 'bg-gray-50';
              let iconClass = '';
              
              switch (rec.type) {
                case 'warning':
                  bgColor = 'bg-amber-50 border-amber-200';
                  iconClass = '⚠️';
                  break;
                case 'action':
                  bgColor = 'bg-blue-50 border-blue-200';
                  iconClass = '🎯';
                  break;
                case 'strategy':
                  bgColor = 'bg-purple-50 border-purple-200';
                  iconClass = '📊';
                  break;
                case 'success':
                  bgColor = 'bg-green-50 border-green-200';
                  iconClass = '✅';
                  break;
                case 'bonus':
                  bgColor = 'bg-indigo-50 border-indigo-200';
                  iconClass = '🏆';
                  break;
              }
              
              return (
                <div key={idx} className={`p-3 rounded-md border ${bgColor} flex items-start`}>
                  <span className="mr-2 text-lg">{iconClass}</span>
                  <div>{rec.message}</div>
                </div>
              );
            })}
            
            {recommendations.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                {t('targets.noRecommendations')}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <MainLayout title={t('targets.title')}>
      <div className="mb-6 bg-gradient-to-l from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200 shadow-sm">
        <div className="flex items-center">
          <div className="mr-3 text-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{t('targets.title')}</h1>
            <p className="text-sm text-gray-600">{t('targets.subtitle')}</p>
          </div>
        </div>
      </div>
      
      <div className="mb-4 flex flex-col md:flex-row justify-between gap-4 items-start">
        <BranchSelector
          selectedBranchId={selectedBranchId}
          onBranchChange={setSelectedBranchId}
          onRefresh={handleRefresh}
        />
        
        <div className="flex items-center space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center gap-1">
                <CalendarIcon className="h-4 w-4" />
                <span>{getMonthName(monthNum)}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Select
                value={selectedMonth}
                onValueChange={setSelectedMonth}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={t('targets.selectMonth')} />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PopoverContent>
          </Popover>
          
          {/* View mode toggle for targets - only visible when in view tab */}
          {activeTab === 'view' && (
            <div className="border rounded-md overflow-hidden">
              <div className="flex divide-x">
                <Button 
                  variant={selectedViewMode === 'overview' ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setSelectedViewMode('overview')}
                  className="rounded-none"
                >
                  <BarChart3 className="h-4 w-4 mr-1" />
                  {t('targets.overview')}
                </Button>
                <Button 
                  variant={selectedViewMode === 'daily' ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setSelectedViewMode('daily')}
                  className="rounded-none"
                >
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  {t('targets.daily')}
                </Button>
                <Button 
                  variant={selectedViewMode === 'analysis' ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setSelectedViewMode('analysis')}
                  className="rounded-none"
                >
                  <LineChartIcon className="h-4 w-4 mr-1" />
                  {t('targets.analysis')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="view">{t('targets.view')}</TabsTrigger>
          {canCreateTargets && (
            <TabsTrigger value="create">{t('targets.create')}</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="view">
          {selectedViewMode === 'overview' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t('targets.monthlyTargets')}</CardTitle>
                  <CardDescription>
                    {getMonthName(monthNum)} {yearNum}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : branchTargets.length > 0 ? (
                  <>
                    {/* If a branch is selected, show detailed view */}
                    {selectedBranchId && selectedBranchData ? (
                      renderBranchDetailView(selectedBranchData)
                    ) : (
                      /* Otherwise show all branches overview */
                      <div className="space-y-6">
                        {branchTargets.map((branch: any) => (
                          <div 
                            key={branch.branchId} 
                            className="border border-neutral-200 rounded-lg p-4 transition-all hover:shadow-md cursor-pointer"
                            onClick={() => setSelectedBranchId(branch.branchId)}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center">
                                <h3 className="font-bold text-lg">{branch.branchName}</h3>
                                <ChevronRight className="h-5 w-5 ml-1 text-gray-400" />
                              </div>
                              {getStatusBadge(branch.status)}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                              <div>
                                <p className="text-sm text-neutral-600">{t('targets.target')}</p>
                                <p className="text-xl font-bold">{formatCurrency(branch.target)}</p>
                              </div>
                              <div>
                                <p className="text-sm text-neutral-600">{t('targets.achieved')}</p>
                                <p className="text-xl font-bold">{formatCurrency(branch.achieved)}</p>
                              </div>
                              <div>
                                <p className="text-sm text-neutral-600">{t('targets.remaining')}</p>
                                <p className="text-xl font-bold">{formatCurrency(Math.max(0, branch.target - branch.achieved))}</p>
                              </div>
                              <div>
                                <p className="text-sm text-neutral-600">{t('targets.daysLeft')}</p>
                                <p className="text-xl font-bold">{daysInCurrentMonth - new Date().getDate() + 1}</p>
                              </div>
                            </div>
                            
                            <div className="mb-1 flex justify-between text-sm">
                              <span>{t('targets.progress')}</span>
                              <span>{typeof branch.percentage === 'number' ? branch.percentage.toFixed(1) : '0.0'}%</span>
                            </div>
                            <Progress 
                              value={typeof branch.percentage === 'number' ? branch.percentage : 0} 
                              className="h-3" 
                              indicatorClassName={getProgressColor(typeof branch.percentage === 'number' ? branch.percentage : 0)}
                            />
                          </div>
                        ))}
                        
                        {/* Branch comparison chart */}
                        <div className="border rounded-lg p-6 mt-6">
                          <h3 className="font-semibold mb-4">{t('targets.branchComparison')}</h3>
                          <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={branchTargets.map((branch: any) => ({
                                  name: branch.branchName,
                                  target: branch.target,
                                  achieved: branch.achieved,
                                  percentage: branch.percentage
                                }))}
                                margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                  dataKey="name" 
                                  label={{ 
                                    value: t('targets.branchName'), 
                                    position: 'insideBottom', 
                                    offset: -15 
                                  }} 
                                />
                                <YAxis 
                                  tickFormatter={(value) => formatCurrency(value)}
                                  label={{ 
                                    value: t('targets.amount'), 
                                    angle: -90, 
                                    position: 'insideLeft',
                                    dy: -50
                                  }} 
                                />
                                <Tooltip 
                                  formatter={(value: number) => [formatCurrency(value), ""]}
                                  labelFormatter={(label) => label}
                                />
                                <Legend />
                                <Bar 
                                  dataKey="target" 
                                  name={t('targets.target')}
                                  fill="#4f46e5" 
                                  radius={[4, 4, 0, 0]}
                                />
                                <Bar 
                                  dataKey="achieved" 
                                  name={t('targets.achieved')}
                                  fill="#10b981" 
                                  radius={[4, 4, 0, 0]}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          
                          <div className="h-[300px] w-full mt-6">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={branchTargets.map((branch: any) => ({
                                  name: branch.branchName,
                                  percentage: branch.percentage
                                }))}
                                margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                  dataKey="name" 
                                  label={{ 
                                    value: t('targets.branchName'), 
                                    position: 'insideBottom', 
                                    offset: -15 
                                  }} 
                                />
                                <YAxis 
                                  tickFormatter={(value) => `${value}%`}
                                  label={{ 
                                    value: t('targets.achievementPercentage'), 
                                    angle: -90, 
                                    position: 'insideLeft' 
                                  }}
                                  domain={[0, 100]} 
                                />
                                <Tooltip 
                                  formatter={(value: number) => [`${value.toFixed(1)}%`, t('targets.achievement')]}
                                  labelFormatter={(label) => label}
                                />
                                <Legend />
                                <Bar 
                                  dataKey="percentage" 
                                  name={t('targets.achievementPercentage')}
                                  fill="#ec4899" 
                                  radius={[4, 4, 0, 0]}
                                />
                                <Tooltip cursor={false} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-neutral-500">
                    <div className="text-4xl mb-2">🎯</div>
                    <p>{t('targets.noTargets')}</p>
                    {canCreateTargets && (
                      <Button 
                        className="mt-4" 
                        onClick={() => setActiveTab('create')}
                      >
                        {t('targets.createNow')}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {selectedViewMode === 'daily' && (
            <Card>
              <CardHeader>
                <CardTitle>{t('targets.dailyTargets')}</CardTitle>
                <CardDescription>
                  {t('targets.dailyBreakdownDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderDailyVisualization()}
              </CardContent>
            </Card>
          )}
          
          {selectedViewMode === 'analysis' && (
            <Card>
              <CardHeader>
                <CardTitle>{t('targets.analysis')}</CardTitle>
                <CardDescription>
                  {t('targets.analysisDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedBranchId && selectedBranchData ? (
                  <div className="space-y-6">
                    <div className="border rounded-lg p-6">
                      <h3 className="font-semibold mb-4">{t('targets.trendAnalysis')}</h3>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={getDailyTargetData.filter(d => d.isPast)}
                            margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="dayOfMonth" 
                              label={{ 
                                value: t('targets.dayOfMonth'), 
                                position: 'insideBottom', 
                                offset: -15 
                              }}
                            />
                            <YAxis
                              yAxisId="left"
                              tickFormatter={(value) => formatCurrency(value)}
                              label={{ 
                                value: t('targets.amount'), 
                                angle: -90, 
                                position: 'insideLeft',
                                dy: -50
                              }}
                            />
                            <YAxis
                              yAxisId="right"
                              orientation="right"
                              tickFormatter={(value) => `${value}%`}
                              domain={[0, 120]}
                            />
                            <Tooltip
                              formatter={(value: any, name: string) => {
                                if (name === 'achievement') return [`${value.toFixed(1)}%`, t('targets.achievement')];
                                return [formatCurrency(value), name === 'target' ? t('targets.target') : t('targets.sales')];
                              }}
                              labelFormatter={(label) => `${t('targets.day')} ${label}`}
                            />
                            <Legend />
                            <Line 
                              yAxisId="left"
                              type="monotone" 
                              dataKey="target" 
                              name={t('targets.target')}
                              stroke="#4f46e5" 
                              strokeWidth={2}
                              dot={{ r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                            <Line 
                              yAxisId="left"
                              type="monotone" 
                              dataKey="sales" 
                              name={t('targets.sales')}
                              stroke="#10b981" 
                              strokeWidth={2}
                              dot={{ r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                            <Line 
                              yAxisId="right"
                              type="monotone" 
                              dataKey="achievement" 
                              name={t('targets.achievement')}
                              stroke="#ec4899" 
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              dot={{ r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-6">
                      <h3 className="font-semibold mb-4">{t('targets.weekdayPerformance')}</h3>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={[0, 1, 2, 3, 4, 5, 6].map(day => {
                              const dayData = getDailyTargetData
                                .filter(d => d.isPast && new Date(d.date).getDay() === day);
                              
                              const avgTarget = dayData.reduce((sum, d) => sum + d.target, 0) / (dayData.length || 1);
                              const avgSales = dayData.reduce((sum, d) => sum + d.sales, 0) / (dayData.length || 1);
                              const avgAchievement = dayData.reduce((sum, d) => sum + d.achievement, 0) / (dayData.length || 1);
                              
                              return {
                                dayOfWeek: day,
                                dayName: ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"][day],
                                avgTarget,
                                avgSales,
                                avgAchievement
                              };
                            })}
                            margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="dayName" 
                              label={{ 
                                value: t('targets.dayOfWeek'), 
                                position: 'insideBottom', 
                                offset: -15 
                              }}
                            />
                            <YAxis
                              tickFormatter={(value) => formatCurrency(value)}
                              label={{ 
                                value: t('targets.averageAmount'), 
                                angle: -90, 
                                position: 'insideLeft',
                                dy: -50
                              }}
                            />
                            <Tooltip
                              formatter={(value: any, name: string) => {
                                if (name === 'avgAchievement') return [`${value.toFixed(1)}%`, t('targets.avgAchievement')];
                                return [formatCurrency(value), name === 'avgTarget' ? t('targets.avgTarget') : t('targets.avgSales')];
                              }}
                            />
                            <Legend />
                            <Bar 
                              dataKey="avgTarget" 
                              name={t('targets.avgTarget')}
                              fill="#4f46e5" 
                              radius={[4, 4, 0, 0]}
                            />
                            <Bar 
                              dataKey="avgSales" 
                              name={t('targets.avgSales')}
                              fill="#10b981" 
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-6">
                      <h3 className="font-semibold mb-4">{t('targets.performanceInsights')}</h3>
                      <div className="space-y-4">
                        {/* Best day */}
                        <div className="flex flex-col md:flex-row gap-4">
                          <div className="flex-1 bg-green-50 p-4 rounded-lg">
                            <div className="text-sm text-green-600">{t('targets.bestPerformanceDay')}</div>
                            {(() => {
                              const pastDays = getDailyTargetData.filter(d => d.isPast);
                              if (pastDays.length === 0) return <div>-</div>;
                              
                              const bestDay = pastDays.reduce((best, current) => 
                                current.achievement > best.achievement ? current : best, pastDays[0]);
                              
                              return (
                                <>
                                  <div className="font-bold text-xl">{format(new Date(bestDay.date), 'EEEE', { locale: ar })}</div>
                                  <div className="text-sm mt-1">
                                    {format(new Date(bestDay.date), 'PPP', { locale: ar })}
                                  </div>
                                  <div className="flex justify-between mt-2">
                                    <div className="text-sm">
                                      {formatCurrency(bestDay.sales)} / {formatCurrency(bestDay.target)}
                                    </div>
                                    <div className="text-green-600 font-bold">{bestDay.achievement.toFixed(1)}%</div>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                          
                          <div className="flex-1 bg-red-50 p-4 rounded-lg">
                            <div className="text-sm text-red-600">{t('targets.worstPerformanceDay')}</div>
                            {(() => {
                              const pastDays = getDailyTargetData.filter(d => d.isPast);
                              if (pastDays.length === 0) return <div>-</div>;
                              
                              const worstDay = pastDays.reduce((worst, current) => 
                                current.achievement < worst.achievement ? current : worst, pastDays[0]);
                              
                              return (
                                <>
                                  <div className="font-bold text-xl">{format(new Date(worstDay.date), 'EEEE', { locale: ar })}</div>
                                  <div className="text-sm mt-1">
                                    {format(new Date(worstDay.date), 'PPP', { locale: ar })}
                                  </div>
                                  <div className="flex justify-between mt-2">
                                    <div className="text-sm">
                                      {formatCurrency(worstDay.sales)} / {formatCurrency(worstDay.target)}
                                    </div>
                                    <div className="text-red-600 font-bold">{worstDay.achievement.toFixed(1)}%</div>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                        
                        {/* Performance by day type */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                          {(() => {
                            const pastDays = getDailyTargetData.filter(d => d.isPast);
                            if (pastDays.length === 0) return null;
                            
                            // Group by weekday/weekend
                            const weekdays = pastDays.filter(d => ![5, 6].includes(new Date(d.date).getDay()));
                            const weekends = pastDays.filter(d => [5, 6].includes(new Date(d.date).getDay()));
                            
                            const avgWeekdayAchievement = weekdays.reduce((sum, d) => sum + d.achievement, 0) / (weekdays.length || 1);
                            const avgWeekendAchievement = weekends.reduce((sum, d) => sum + d.achievement, 0) / (weekends.length || 1);
                            
                            return (
                              <>
                                <div className="bg-blue-50 p-4 rounded-lg">
                                  <div className="text-sm text-blue-600">{t('targets.weekdayAvg')}</div>
                                  <div className="font-bold text-xl">{avgWeekdayAchievement.toFixed(1)}%</div>
                                  <div className="text-sm mt-1">
                                    {weekdays.length} {t('targets.days')}
                                  </div>
                                </div>
                                
                                <div className="bg-purple-50 p-4 rounded-lg">
                                  <div className="text-sm text-purple-600">{t('targets.weekendAvg')}</div>
                                  <div className="font-bold text-xl">{avgWeekendAchievement.toFixed(1)}%</div>
                                  <div className="text-sm mt-1">
                                    {weekends.length} {t('targets.days')}
                                  </div>
                                </div>
                                
                                <div className={`${
                                  avgWeekendAchievement > avgWeekdayAchievement ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                                } p-4 rounded-lg`}>
                                  <div className="text-sm">{t('targets.weekendVsWeekday')}</div>
                                  <div className="font-bold text-xl">
                                    {avgWeekendAchievement > avgWeekdayAchievement ? '+' : ''}
                                    {(avgWeekendAchievement - avgWeekdayAchievement).toFixed(1)}%
                                  </div>
                                  <div className="text-sm mt-1">
                                    {avgWeekendAchievement > avgWeekdayAchievement 
                                      ? t('targets.weekendsBetter')
                                      : t('targets.weekdaysBetter')}
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-5xl mb-3">📊</div>
                    <p>{t('targets.selectBranchForAnalysis')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {canCreateTargets && (
          <TabsContent value="create">
            <TargetForm
              selectedBranchId={selectedBranchId ?? undefined}
              onSuccess={handleFormSuccess}
            />
          </TabsContent>
        )}
      </Tabs>
    </MainLayout>
  );
}
