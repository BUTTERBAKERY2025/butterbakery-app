import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { DateRange } from 'react-day-picker';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency, formatDate, getProgressColor } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer,
  Line,
  LineChart,
  ComposedChart
} from 'recharts';
import { CalendarIcon, TrendingUpIcon, Layers, RefreshCw, Store, Users } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ExportButton from './ExportButton';
import { ExportConfig } from './ExportUtils';

// أنواع البيانات
interface BranchPerformance {
  branchId: number;
  branchName: string;
  totalSales: number;
  previousSales: number;
  growth: number;
  transactionCount: number;
  previousTransactions: number;
  transactionGrowth: number;
  averageTicket: number;
  previousAverageTicket: number;
  ticketGrowth: number;
  targetAchievement: number;
}

interface CashierPerformance {
  cashierId: number;
  name: string;
  avatar: string;
  branchId: number;
  branchName: string;
  totalSales: number;
  previousSales: number;
  growth: number;
  transactionCount: number;
  previousTransactions: number;
  transactionGrowth: number;
  averageTicket: number;
  previousAverageTicket: number;
  ticketGrowth: number;
  discrepancy: number;
  previousDiscrepancy: number;
}

interface SalesOverTime {
  date: string;
  currentPeriodSales: number;
  previousPeriodSales: number;
  target: number;
}

interface ComparativeReportContentProps {
  selectedBranchId: number | null;
  onRefresh?: () => void;
}

const ComparativeReportContent: React.FC<ComparativeReportContentProps> = ({ 
  selectedBranchId,
  onRefresh
}) => {
  const { t } = useTranslation();
  const [comparisonType, setComparisonType] = useState<'month' | 'quarter' | 'year'>('month');
  const [activeTab, setActiveTab] = useState('branches');
  
  // نطاق التاريخ للمقارنة (الفترة الحالية)
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  });
  
  // تنسيق التاريخ للاستعلام
  const formatDateParam = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };
  
  // استعلام بيانات مقارنة الفروع
  const { 
    data: branchesData = [], 
    isLoading: isBranchesLoading,
    refetch: refetchBranches
  } = useQuery({
    queryKey: ['/api/reports/branch-comparison', { 
      branchId: selectedBranchId === 0 ? null : selectedBranchId,
      comparisonType,
      startDate: dateRange.from ? formatDateParam(dateRange.from) : '',
      endDate: dateRange.to ? formatDateParam(dateRange.to) : ''
    }],
    queryFn: async () => {
      // سنقوم بتنفيذ هذا الاستعلام لاحقًا عندما نقوم بتطوير واجهة برمجة التطبيقات
      // حاليًا نستخدم بيانات وهمية لعرض واجهة المستخدم
      
      // في حالة وجود API حقيقي، سيكون الكود كالتالي:
      // const res = await fetch(`/api/reports/branch-comparison?branchId=${selectedBranchId || ''}&comparisonType=${comparisonType}&startDate=${dateRange.from ? formatDateParam(dateRange.from) : ''}&endDate=${dateRange.to ? formatDateParam(dateRange.to) : ''}`);
      // if (!res.ok) throw new Error('Failed to fetch branch comparison data');
      // return res.json();
      
      // بيانات وهمية للعرض
      const mockData: BranchPerformance[] = [
        {
          branchId: 1,
          branchName: 'الفرع الرئيسي',
          totalSales: 125000,
          previousSales: 110000,
          growth: 13.64,
          transactionCount: 3200,
          previousTransactions: 3000,
          transactionGrowth: 6.67,
          averageTicket: 39.06,
          previousAverageTicket: 36.67,
          ticketGrowth: 6.52,
          targetAchievement: 95
        },
        {
          branchId: 2,
          branchName: 'فرع المدينة',
          totalSales: 85000,
          previousSales: 82000,
          growth: 3.66,
          transactionCount: 2100,
          previousTransactions: 2050,
          transactionGrowth: 2.44,
          averageTicket: 40.48,
          previousAverageTicket: 40,
          ticketGrowth: 1.2,
          targetAchievement: 82
        },
        {
          branchId: 3,
          branchName: 'فرع الشمال',
          totalSales: 95000,
          previousSales: 85000,
          growth: 11.76,
          transactionCount: 2300,
          previousTransactions: 2150,
          transactionGrowth: 6.98,
          averageTicket: 41.30,
          previousAverageTicket: 39.53,
          ticketGrowth: 4.48,
          targetAchievement: 88
        }
      ];
      
      // إذا تم تحديد فرع (وليس "جميع الفروع")، نقوم بتصفية البيانات
      if (selectedBranchId && selectedBranchId !== 0) {
        return mockData.filter(branch => branch.branchId === selectedBranchId);
      }
      
      return mockData;
    },
    enabled: true
  });
  
  // استعلام بيانات مقارنة الكاشيرات
  const { 
    data: cashiersData = [], 
    isLoading: isCashiersLoading,
    refetch: refetchCashiers
  } = useQuery({
    queryKey: ['/api/reports/cashier-comparison', { 
      branchId: selectedBranchId === 0 ? null : selectedBranchId,
      comparisonType,
      startDate: dateRange.from ? formatDateParam(dateRange.from) : '',
      endDate: dateRange.to ? formatDateParam(dateRange.to) : ''
    }],
    queryFn: async () => {
      // سنقوم بتنفيذ هذا الاستعلام لاحقًا عندما نقوم بتطوير واجهة برمجة التطبيقات
      // حاليًا نستخدم بيانات وهمية لعرض واجهة المستخدم
      
      // بيانات وهمية للعرض
      const mockData: CashierPerformance[] = [
        {
          cashierId: 1,
          name: 'أحمد محمد',
          avatar: '',
          branchId: 1,
          branchName: 'الفرع الرئيسي',
          totalSales: 42000,
          previousSales: 38000,
          growth: 10.53,
          transactionCount: 1100,
          previousTransactions: 1000,
          transactionGrowth: 10,
          averageTicket: 38.18,
          previousAverageTicket: 38,
          ticketGrowth: 0.47,
          discrepancy: -150,
          previousDiscrepancy: -180
        },
        {
          cashierId: 2,
          name: 'سارة علي',
          avatar: '',
          branchId: 1,
          branchName: 'الفرع الرئيسي',
          totalSales: 38000,
          previousSales: 35000,
          growth: 8.57,
          transactionCount: 980,
          previousTransactions: 920,
          transactionGrowth: 6.52,
          averageTicket: 38.78,
          previousAverageTicket: 38.04,
          ticketGrowth: 1.94,
          discrepancy: 80,
          previousDiscrepancy: 90
        },
        {
          cashierId: 3,
          name: 'محمد علي',
          avatar: '',
          branchId: 1,
          branchName: 'الفرع الرئيسي',
          totalSales: 45000,
          previousSales: 37000,
          growth: 21.62,
          transactionCount: 1120,
          previousTransactions: 980,
          transactionGrowth: 14.29,
          averageTicket: 40.18,
          previousAverageTicket: 37.76,
          ticketGrowth: 6.41,
          discrepancy: -100,
          previousDiscrepancy: -150
        },
        {
          cashierId: 4,
          name: 'عمر خالد',
          avatar: '',
          branchId: 2,
          branchName: 'فرع المدينة',
          totalSales: 42500,
          previousSales: 41000,
          growth: 3.66,
          transactionCount: 1050,
          previousTransactions: 1020,
          transactionGrowth: 2.94,
          averageTicket: 40.48,
          previousAverageTicket: 40.2,
          ticketGrowth: 0.7,
          discrepancy: -50,
          previousDiscrepancy: -80
        },
        {
          cashierId: 5,
          name: 'فاطمة محمد',
          avatar: '',
          branchId: 2,
          branchName: 'فرع المدينة',
          totalSales: 42500,
          previousSales: 41000,
          growth: 3.66,
          transactionCount: 1050,
          previousTransactions: 1030,
          transactionGrowth: 1.94,
          averageTicket: 40.48,
          previousAverageTicket: 39.81,
          ticketGrowth: 1.68,
          discrepancy: 120,
          previousDiscrepancy: 90
        },
        {
          cashierId: 6,
          name: 'علي أحمد',
          avatar: '',
          branchId: 3,
          branchName: 'فرع الشمال',
          totalSales: 48000,
          previousSales: 43000,
          growth: 11.63,
          transactionCount: 1150,
          previousTransactions: 1080,
          transactionGrowth: 6.48,
          averageTicket: 41.74,
          previousAverageTicket: 39.81,
          ticketGrowth: 4.85,
          discrepancy: -80,
          previousDiscrepancy: -120
        },
        {
          cashierId: 7,
          name: 'نورة سعيد',
          avatar: '',
          branchId: 3,
          branchName: 'فرع الشمال',
          totalSales: 47000,
          previousSales: 42000,
          growth: 11.9,
          transactionCount: 1150,
          previousTransactions: 1070,
          transactionGrowth: 7.48,
          averageTicket: 40.87,
          previousAverageTicket: 39.25,
          ticketGrowth: 4.13,
          discrepancy: 60,
          previousDiscrepancy: 90
        }
      ];
      
      // إذا تم تحديد فرع (وليس "جميع الفروع")، نقوم بتصفية البيانات
      if (selectedBranchId && selectedBranchId !== 0) {
        return mockData.filter(cashier => cashier.branchId === selectedBranchId);
      }
      
      return mockData;
    },
    enabled: true
  });
  
  // استعلام بيانات المبيعات عبر الزمن
  const { 
    data: salesOverTimeData = [], 
    isLoading: isSalesOverTimeLoading,
    refetch: refetchSalesOverTime
  } = useQuery({
    queryKey: ['/api/reports/sales-over-time', { 
      branchId: selectedBranchId === 0 ? null : selectedBranchId,
      comparisonType,
      startDate: dateRange.from ? formatDateParam(dateRange.from) : '',
      endDate: dateRange.to ? formatDateParam(dateRange.to) : ''
    }],
    queryFn: async () => {
      // سنقوم بتنفيذ هذا الاستعلام لاحقًا عندما نقوم بتطوير واجهة برمجة التطبيقات
      // حاليًا نستخدم بيانات وهمية لعرض واجهة المستخدم
      
      const currentDate = new Date();
      const monthNames = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
      ];
      
      const mockData: SalesOverTime[] = [];
      
      if (comparisonType === 'month') {
        // بيانات شهرية (أيام)
        for (let i = 0; i < 30; i++) {
          const day = new Date();
          day.setDate(currentDate.getDate() - 30 + i);
          
          mockData.push({
            date: day.getDate().toString(),
            currentPeriodSales: Math.floor(Math.random() * 2500) + 2500,
            previousPeriodSales: Math.floor(Math.random() * 2200) + 2200,
            target: 3000
          });
        }
      } else if (comparisonType === 'quarter') {
        // بيانات ربع سنوية (أسابيع)
        for (let i = 0; i < 13; i++) {
          mockData.push({
            date: `الأسبوع ${i + 1}`,
            currentPeriodSales: Math.floor(Math.random() * 15000) + 15000,
            previousPeriodSales: Math.floor(Math.random() * 14000) + 14000,
            target: 18000
          });
        }
      } else if (comparisonType === 'year') {
        // بيانات سنوية (أشهر)
        for (let i = 0; i < 12; i++) {
          mockData.push({
            date: monthNames[i],
            currentPeriodSales: Math.floor(Math.random() * 60000) + 60000,
            previousPeriodSales: Math.floor(Math.random() * 55000) + 55000,
            target: 70000
          });
        }
      }
      
      return mockData;
    },
    enabled: true
  });
  
  // معالجة التحديث
  const handleRefresh = () => {
    refetchBranches();
    refetchCashiers();
    refetchSalesOverTime();
    if (onRefresh) onRefresh();
  };
  
  // معالجة تغيير نوع المقارنة
  const handleComparisonTypeChange = (value: string) => {
    setComparisonType(value as 'month' | 'quarter' | 'year');
  };
  
  // معالجة تغيير نطاق التاريخ
  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range) {
      setDateRange(range);
    }
  };
  
  // معالجة تغيير تبويب التقارير
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  
  // بيانات للتصدير (الفروع)
  const getBranchesExportableData = () => {
    return branchesData.map((branch: BranchPerformance) => ({
      branchName: branch.branchName,
      totalSales: branch.totalSales,
      previousSales: branch.previousSales,
      growth: `${branch.growth}%`,
      transactionCount: branch.transactionCount,
      previousTransactions: branch.previousTransactions,
      transactionGrowth: `${branch.transactionGrowth}%`,
      averageTicket: branch.averageTicket,
      previousAverageTicket: branch.previousAverageTicket,
      ticketGrowth: `${branch.ticketGrowth}%`,
      targetAchievement: `${branch.targetAchievement}%`
    }));
  };
  
  // بيانات للتصدير (الكاشيرات)
  const getCashiersExportableData = () => {
    return cashiersData.map((cashier: CashierPerformance) => ({
      name: cashier.name,
      branchName: cashier.branchName,
      totalSales: cashier.totalSales,
      previousSales: cashier.previousSales,
      growth: `${cashier.growth}%`,
      transactionCount: cashier.transactionCount,
      previousTransactions: cashier.previousTransactions,
      transactionGrowth: `${cashier.transactionGrowth}%`,
      averageTicket: cashier.averageTicket,
      previousAverageTicket: cashier.previousAverageTicket,
      ticketGrowth: `${cashier.ticketGrowth}%`,
      discrepancy: cashier.discrepancy,
      previousDiscrepancy: cashier.previousDiscrepancy
    }));
  };
  
  // تكوين تصدير بيانات الفروع
  const branchesExportConfig: ExportConfig = {
    fileName: `تقرير_مقارنة_الفروع_${formatDateParam(new Date())}`,
    title: `تقرير مقارنة أداء الفروع - ${formatDate(new Date(), 'medium')}`,
    headers: [
      { key: 'branchName', label: 'اسم الفرع', width: 20 },
      { key: 'totalSales', label: 'المبيعات الحالية', width: 15 },
      { key: 'previousSales', label: 'المبيعات السابقة', width: 15 },
      { key: 'growth', label: 'نسبة النمو', width: 10 },
      { key: 'transactionCount', label: 'عدد المعاملات الحالية', width: 15 },
      { key: 'previousTransactions', label: 'عدد المعاملات السابقة', width: 15 },
      { key: 'transactionGrowth', label: 'نمو المعاملات', width: 10 },
      { key: 'averageTicket', label: 'متوسط القيمة الحالي', width: 15 },
      { key: 'previousAverageTicket', label: 'متوسط القيمة السابق', width: 15 },
      { key: 'ticketGrowth', label: 'نمو متوسط القيمة', width: 10 },
      { key: 'targetAchievement', label: 'تحقيق الهدف', width: 10 }
    ],
    format: 'A4',
    orientation: 'landscape',
    footer: `تقرير مقارنة أداء الفروع - ${formatDate(new Date(), 'medium')} - تم إنشاؤه بواسطة نظام ButterBakery`,
    arabicEnabled: true
  };
  
  // تكوين تصدير بيانات الكاشيرات
  const cashiersExportConfig: ExportConfig = {
    fileName: `تقرير_مقارنة_الكاشيرات_${formatDateParam(new Date())}`,
    title: `تقرير مقارنة أداء الكاشيرات - ${formatDate(new Date(), 'medium')}`,
    headers: [
      { key: 'name', label: 'اسم الكاشير', width: 20 },
      { key: 'branchName', label: 'اسم الفرع', width: 20 },
      { key: 'totalSales', label: 'المبيعات الحالية', width: 15 },
      { key: 'previousSales', label: 'المبيعات السابقة', width: 15 },
      { key: 'growth', label: 'نسبة النمو', width: 10 },
      { key: 'transactionCount', label: 'عدد المعاملات الحالية', width: 15 },
      { key: 'previousTransactions', label: 'عدد المعاملات السابقة', width: 15 },
      { key: 'transactionGrowth', label: 'نمو المعاملات', width: 10 },
      { key: 'averageTicket', label: 'متوسط القيمة الحالي', width: 15 },
      { key: 'previousAverageTicket', label: 'متوسط القيمة السابق', width: 15 },
      { key: 'ticketGrowth', label: 'نمو متوسط القيمة', width: 10 },
      { key: 'discrepancy', label: 'الفروقات الحالية', width: 15 },
      { key: 'previousDiscrepancy', label: 'الفروقات السابقة', width: 15 }
    ],
    format: 'A4',
    orientation: 'landscape',
    footer: `تقرير مقارنة أداء الكاشيرات - ${formatDate(new Date(), 'medium')} - تم إنشاؤه بواسطة نظام ButterBakery`,
    arabicEnabled: true
  };
  
  // رندرة الرسم البياني للمبيعات عبر الزمن
  const renderSalesOverTimeChart = () => {
    if (isSalesOverTimeLoading) {
      return <Skeleton className="h-[400px] w-full" />;
    }
    
    if (!salesOverTimeData.length) {
      return (
        <div className="flex items-center justify-center h-[400px] text-gray-500">
          {t('reports.noDataAvailable')}
        </div>
      );
    }
    
    return (
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart
          data={salesOverTimeData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <RechartsTooltip 
            formatter={(value: number, name: string) => {
              return formatCurrency(value);
            }}
          />
          <Legend />
          <Bar 
            dataKey="currentPeriodSales" 
            name={t('reports.currentPeriodSales')} 
            fill="#8884d8" 
          />
          <Bar 
            dataKey="previousPeriodSales" 
            name={t('reports.previousPeriodSales')} 
            fill="#82ca9d" 
          />
          <Line 
            type="monotone" 
            dataKey="target" 
            name={t('reports.target')} 
            stroke="#ff7300" 
            strokeWidth={2} 
          />
        </ComposedChart>
      </ResponsiveContainer>
    );
  };
  
  // رندرة جدول مقارنة الفروع
  const renderBranchesTable = () => {
    return (
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('reports.branch')}</TableHead>
              <TableHead className="text-left">{t('reports.sales')}</TableHead>
              <TableHead className="text-left">{t('reports.growth')}</TableHead>
              <TableHead className="text-left">{t('reports.transactions')}</TableHead>
              <TableHead className="text-left">{t('reports.transactionGrowth')}</TableHead>
              <TableHead className="text-left">{t('reports.averageTicket')}</TableHead>
              <TableHead className="text-left">{t('reports.ticketGrowth')}</TableHead>
              <TableHead className="text-left">{t('reports.targetAchievement')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {branchesData.map((branch: BranchPerformance, index) => (
              <TableRow key={index} className={index % 2 === 0 ? 'bg-muted/50' : undefined}>
                <TableCell className="font-medium">{branch.branchName}</TableCell>
                <TableCell className="text-left">
                  <div>
                    <div className="font-medium">{formatCurrency(branch.totalSales)}</div>
                    <div className="text-sm text-muted-foreground">
                      {t('reports.previous')}: {formatCurrency(branch.previousSales)}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-left">
                  <Badge variant={
                    branch.growth > 5 ? 'success' :
                    branch.growth > 0 ? 'warning' :
                    'destructive'
                  }>
                    {branch.growth > 0 ? '+' : ''}{branch.growth}%
                  </Badge>
                </TableCell>
                <TableCell className="text-left">
                  <div>
                    <div className="font-medium">{branch.transactionCount}</div>
                    <div className="text-sm text-muted-foreground">
                      {t('reports.previous')}: {branch.previousTransactions}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-left">
                  <Badge variant={
                    branch.transactionGrowth > 5 ? 'success' :
                    branch.transactionGrowth > 0 ? 'warning' :
                    'destructive'
                  }>
                    {branch.transactionGrowth > 0 ? '+' : ''}{branch.transactionGrowth}%
                  </Badge>
                </TableCell>
                <TableCell className="text-left">
                  <div>
                    <div className="font-medium">{formatCurrency(branch.averageTicket)}</div>
                    <div className="text-sm text-muted-foreground">
                      {t('reports.previous')}: {formatCurrency(branch.previousAverageTicket)}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-left">
                  <Badge variant={
                    branch.ticketGrowth > 5 ? 'success' :
                    branch.ticketGrowth > 0 ? 'warning' :
                    'destructive'
                  }>
                    {branch.ticketGrowth > 0 ? '+' : ''}{branch.ticketGrowth}%
                  </Badge>
                </TableCell>
                <TableCell className="text-left">
                  <div className="flex items-center space-x-2 flex-row-reverse">
                    <Progress 
                      value={branch.targetAchievement} 
                      className="h-2 w-[100px]"
                      indicatorClassName={getProgressColor(branch.targetAchievement)}
                    />
                    <span>{branch.targetAchievement}%</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };
  
  // رندرة جدول مقارنة الكاشيرات
  const renderCashiersTable = () => {
    return (
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('reports.cashier')}</TableHead>
              <TableHead className="text-left">{t('reports.branch')}</TableHead>
              <TableHead className="text-left">{t('reports.sales')}</TableHead>
              <TableHead className="text-left">{t('reports.growth')}</TableHead>
              <TableHead className="text-left">{t('reports.transactions')}</TableHead>
              <TableHead className="text-left">{t('reports.transactionGrowth')}</TableHead>
              <TableHead className="text-left">{t('reports.averageTicket')}</TableHead>
              <TableHead className="text-left">{t('reports.ticketGrowth')}</TableHead>
              <TableHead className="text-left">{t('reports.discrepancy')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cashiersData.map((cashier: CashierPerformance, index) => (
              <TableRow key={index} className={index % 2 === 0 ? 'bg-muted/50' : undefined}>
                <TableCell className="font-medium">{cashier.name}</TableCell>
                <TableCell className="text-left">{cashier.branchName}</TableCell>
                <TableCell className="text-left">
                  <div>
                    <div className="font-medium">{formatCurrency(cashier.totalSales)}</div>
                    <div className="text-sm text-muted-foreground">
                      {t('reports.previous')}: {formatCurrency(cashier.previousSales)}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-left">
                  <Badge variant={
                    cashier.growth > 5 ? 'success' :
                    cashier.growth > 0 ? 'warning' :
                    'destructive'
                  }>
                    {cashier.growth > 0 ? '+' : ''}{cashier.growth}%
                  </Badge>
                </TableCell>
                <TableCell className="text-left">
                  <div>
                    <div className="font-medium">{cashier.transactionCount}</div>
                    <div className="text-sm text-muted-foreground">
                      {t('reports.previous')}: {cashier.previousTransactions}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-left">
                  <Badge variant={
                    cashier.transactionGrowth > 5 ? 'success' :
                    cashier.transactionGrowth > 0 ? 'warning' :
                    'destructive'
                  }>
                    {cashier.transactionGrowth > 0 ? '+' : ''}{cashier.transactionGrowth}%
                  </Badge>
                </TableCell>
                <TableCell className="text-left">
                  <div>
                    <div className="font-medium">{formatCurrency(cashier.averageTicket)}</div>
                    <div className="text-sm text-muted-foreground">
                      {t('reports.previous')}: {formatCurrency(cashier.previousAverageTicket)}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-left">
                  <Badge variant={
                    cashier.ticketGrowth > 5 ? 'success' :
                    cashier.ticketGrowth > 0 ? 'warning' :
                    'destructive'
                  }>
                    {cashier.ticketGrowth > 0 ? '+' : ''}{cashier.ticketGrowth}%
                  </Badge>
                </TableCell>
                <TableCell className="text-left">
                  <div>
                    <div className={`font-medium ${cashier.discrepancy > 0 ? 'text-red-600' : cashier.discrepancy < 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      {formatCurrency(cashier.discrepancy)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t('reports.previous')}: {formatCurrency(cashier.previousDiscrepancy)}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };
  
  // رندرة رسوم بيانية للمقارنة
  const renderComparisonCharts = () => {
    if (activeTab === 'branches' && isBranchesLoading) {
      return <Skeleton className="h-[400px] w-full" />;
    }
    
    if (activeTab === 'cashiers' && isCashiersLoading) {
      return <Skeleton className="h-[400px] w-full" />;
    }
    
    if ((activeTab === 'branches' && !branchesData.length) || 
        (activeTab === 'cashiers' && !cashiersData.length)) {
      return (
        <div className="flex items-center justify-center h-[400px] text-gray-500">
          {t('reports.noDataAvailable')}
        </div>
      );
    }
    
    if (activeTab === 'branches') {
      // رسم بياني لمقارنة أداء الفروع
      const chartData = branchesData.map(branch => ({
        name: branch.branchName,
        currentSales: branch.totalSales,
        previousSales: branch.previousSales,
        growth: branch.growth,
        targetAchievement: branch.targetAchievement
      }));
      
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <RechartsTooltip 
              formatter={(value: number, name: string) => {
                if (name === 'currentSales' || name === 'previousSales') {
                  return formatCurrency(value);
                }
                return value + '%';
              }}
            />
            <Legend />
            <Bar dataKey="currentSales" name={t('reports.currentPeriodSales')} fill="#8884d8" />
            <Bar dataKey="previousSales" name={t('reports.previousPeriodSales')} fill="#82ca9d" />
            <Bar dataKey="growth" name={t('reports.growth')} fill="#ff7300" />
          </BarChart>
        </ResponsiveContainer>
      );
    } else {
      // رسم بياني لمقارنة أداء الكاشيرات
      const chartData = cashiersData.map(cashier => ({
        name: cashier.name,
        currentSales: cashier.totalSales,
        previousSales: cashier.previousSales,
        growth: cashier.growth,
        transactions: cashier.transactionCount
      }));
      
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <RechartsTooltip 
              formatter={(value: number, name: string) => {
                if (name === 'currentSales' || name === 'previousSales') {
                  return formatCurrency(value);
                }
                if (name === 'growth') {
                  return value + '%';
                }
                return value;
              }}
            />
            <Legend />
            <Bar dataKey="currentSales" name={t('reports.currentPeriodSales')} fill="#8884d8" />
            <Bar dataKey="previousSales" name={t('reports.previousPeriodSales')} fill="#82ca9d" />
            <Bar dataKey="transactions" name={t('reports.transactions')} fill="#ff7300" />
          </BarChart>
        </ResponsiveContainer>
      );
    }
  };
  
  return (
    <>
      {/* أدوات التصفية والتحكم */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pt-6 pb-3">
          <CardTitle>{t('reports.comparativeAnalysisReport')}</CardTitle>
          
          <div className="flex flex-wrap gap-2 ml-4 mt-4 sm:mt-0">
            <Select
              value={comparisonType}
              onValueChange={handleComparisonTypeChange}
            >
              <SelectTrigger className="min-w-[160px]">
                <SelectValue placeholder={t('reports.selectComparisonType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">{t('reports.monthlyComparison')}</SelectItem>
                <SelectItem value="quarter">{t('reports.quarterlyComparison')}</SelectItem>
                <SelectItem value="year">{t('reports.yearlyComparison')}</SelectItem>
              </SelectContent>
            </Select>
            
            <DatePicker
              value={dateRange}
              onChange={handleDateRangeChange}
            />
            
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>
      
      {/* تبويبات التقارير */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-6">
          <TabsTrigger value="branches">
            <Store className="ml-2 h-4 w-4" />
            {t('reports.branchComparison')}
          </TabsTrigger>
          <TabsTrigger value="cashiers">
            <Users className="ml-2 h-4 w-4" />
            {t('reports.cashierComparison')}
          </TabsTrigger>
          <TabsTrigger value="trends">
            <TrendingUpIcon className="ml-2 h-4 w-4" />
            {t('reports.salesTrends')}
          </TabsTrigger>
        </TabsList>
        
        {/* محتوى تبويب مقارنة الفروع */}
        <TabsContent value="branches">
          {/* رسم بياني مقارنة */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle>{t('reports.branchPerformanceComparison')}</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedBranchId && branchesData.length > 1 ? (
                renderComparisonCharts()
              ) : (
                <div className="text-center py-8 text-neutral-500">
                  {selectedBranchId ? 
                    t('reports.selectMultipleBranchesPrompt') : 
                    t('reports.noDataAvailable')
                  }
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* جدول مقارنة الفروع */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle>{t('reports.detailedBranchComparison')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isBranchesLoading ? (
                <Skeleton className="h-[350px] w-full" />
              ) : !branchesData.length ? (
                <div className="text-center py-8 text-neutral-500">
                  <p>{t('reports.noDataAvailable')}</p>
                </div>
              ) : (
                renderBranchesTable()
              )}
            </CardContent>
          </Card>
          
          {/* زر تصدير */}
          <div className="mt-6 flex justify-end">
            <ExportButton
              data={getBranchesExportableData()}
              config={branchesExportConfig}
              disabled={isBranchesLoading || !branchesData.length}
            />
          </div>
        </TabsContent>
        
        {/* محتوى تبويب مقارنة الكاشيرات */}
        <TabsContent value="cashiers">
          {/* رسم بياني مقارنة */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle>{t('reports.cashierPerformanceComparison')}</CardTitle>
            </CardHeader>
            <CardContent>
              {cashiersData.length > 1 ? (
                renderComparisonCharts()
              ) : (
                <div className="text-center py-8 text-neutral-500">
                  {t('reports.noDataAvailable')}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* جدول مقارنة الكاشيرات */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle>{t('reports.detailedCashierComparison')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isCashiersLoading ? (
                <Skeleton className="h-[350px] w-full" />
              ) : !cashiersData.length ? (
                <div className="text-center py-8 text-neutral-500">
                  <p>{t('reports.noDataAvailable')}</p>
                </div>
              ) : (
                renderCashiersTable()
              )}
            </CardContent>
          </Card>
          
          {/* زر تصدير */}
          <div className="mt-6 flex justify-end">
            <ExportButton
              data={getCashiersExportableData()}
              config={cashiersExportConfig}
              disabled={isCashiersLoading || !cashiersData.length}
            />
          </div>
        </TabsContent>
        
        {/* محتوى تبويب اتجاهات المبيعات */}
        <TabsContent value="trends">
          {/* رسم بياني للمبيعات عبر الزمن */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle>{t('reports.salesTrendsOverTime')}</CardTitle>
            </CardHeader>
            <CardContent>
              {renderSalesOverTimeChart()}
            </CardContent>
          </Card>
          
          {/* بطاقات ملخص الاتجاهات */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{t('reports.salesGrowth')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary mb-2">
                  {branchesData.length ? `+${branchesData.reduce((sum, branch) => sum + branch.growth, 0) / branchesData.length}%` : '0%'}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('reports.averageGrowthComparedToPrevious')}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{t('reports.transactionGrowth')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary mb-2">
                  {branchesData.length ? `+${branchesData.reduce((sum, branch) => sum + branch.transactionGrowth, 0) / branchesData.length}%` : '0%'}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('reports.moreTransactionsComparedToPrevious')}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{t('reports.targetAchievement')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary mb-2">
                  {branchesData.length ? `${branchesData.reduce((sum, branch) => sum + branch.targetAchievement, 0) / branchesData.length}%` : '0%'}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('reports.averageTargetAchievement')}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
};

export default ComparativeReportContent;