import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import {
  Alert,
  AlertTitle,
  AlertDescription
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useTranslation } from 'react-i18next';
import { DateRange } from 'react-day-picker';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency, formatNumber, getProgressColor } from '@/lib/utils';
import { reshapeArabicText } from '@/lib/arabicTextUtils';
import { 
  BarChart, 
  Printer, 
  FileText, 
  Download, 
  RefreshCw, 
  TrendingUp,
  TrendingDown,
  AlertCircle,
  DollarSign,
  CalendarDays,
  CheckCircle,
  AlertTriangle,
  Minus as MinusIcon
} from 'lucide-react';
import { 
  Area, 
  AreaChart, 
  CartesianGrid, 
  Legend, 
  Line, 
  LineChart, 
  PieChart as RechartsPieChart, 
  Bar, 
  BarChart as RechartsBarChart,
  Pie, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  XAxis, 
  YAxis 
} from 'recharts';
import ExportButton from './ExportButton';
import { ExportConfig } from './ExportUtils';
import { format } from 'date-fns';
import { exportToExcel, exportToPdf } from './ExportUtils';
import { printContent } from './PrintUtils';

// أنواع البيانات
interface DailySalesReportItem {
  id: number;
  branchId: number;
  branchName: string;
  date: string;
  cashierId: number;
  cashierName: string;
  totalCashSales: number;
  totalNetworkSales: number;
  totalSales: number;
  transactionCount: number;
  averageTicket: number;
  discrepancy: number;
  status: string;
  dailyTarget: number; // الهدف اليومي
  targetAchievement: number; // نسبة تحقيق الهدف
}

interface BranchSummary {
  branchId: number;
  branchName: string;
  totalSales: number;
  totalCashSales: number;
  totalNetworkSales: number;
  totalTransactions: number;
  avgTicket: number;
  totalTarget: number;
  targetAchievement: number;
  totalDiscrepancy: number;
}

interface Branch {
  id: number;
  name: string;
}

interface DailySalesDetailedReportProps {
  selectedBranchId: number | null;
  selectedDate?: Date;
  onRefresh?: () => void;
}

const DailySalesDetailedReport: React.FC<DailySalesDetailedReportProps> = ({ 
  selectedBranchId,
  selectedDate = new Date(),
  onRefresh
}) => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setDate(new Date().getDate() - 7)),
    to: new Date()
  });
  
  const printRef = useRef<HTMLDivElement>(null);
  
  // تنسيق التاريخ للاستعلام
  const formatDateParam = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };
  
  // استعلام بيانات المبيعات اليومية
  const { 
    data: dailySalesData = [], 
    isLoading: isDataLoading,
    refetch: refetchDailySales
  } = useQuery({
    queryKey: ['/api/daily-sales/detailed', { 
      branchId: selectedBranchId === 0 ? null : selectedBranchId, 
      startDate: dateRange.from ? formatDateParam(dateRange.from) : undefined,
      endDate: dateRange.to ? formatDateParam(dateRange.to) : undefined 
    }],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (selectedBranchId !== null && selectedBranchId !== 0) {
        params.append('branchId', selectedBranchId.toString());
      }
      
      if (dateRange.from) {
        params.append('startDate', formatDateParam(dateRange.from));
      }
      
      if (dateRange.to) {
        params.append('endDate', formatDateParam(dateRange.to));
      }
      
      // استخدم الواجهة البرمجية الموجودة كنقطة بداية
      const res = await fetch(`/api/daily-sales?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch daily sales data');
      
      const data = await res.json();
      
      // إغناء البيانات بالحقول المطلوبة
      return data.map((item: any) => {
        // حساب الهدف اليومي والإنجاز بناءً على نسبة التقدم
        // يمكن تحديث هذا لاستدعاء واجهة برمجية أكثر تخصصًا عندما تتوفر
        const dailyTarget = item.target || 0;
        const targetAchievement = dailyTarget > 0 ? (item.totalSales / dailyTarget) * 100 : 0;
        
        // إضافة اسم الفرع
        return {
          ...item,
          branchName: item.branchName || `فرع ${item.branchId}`,
          dailyTarget,
          targetAchievement,
          // تحويل الرصيد إلى أرقام لضمان عمليات حسابية صحيحة
          totalCashSales: Number(item.totalCashSales || 0),
          totalNetworkSales: Number(item.totalNetworkSales || 0),
          totalSales: Number(item.totalSales || 0),
          discrepancy: Number(item.discrepancy || 0),
          transactionCount: Number(item.transactionCount || item.totalTransactions || 0),
          averageTicket: Number(item.averageTicket || 0)
        };
      });
    },
    enabled: selectedBranchId !== null || selectedBranchId === 0
  });
  
  // استعلام بيانات المبيعات للشهر الماضي (للمقارنة)
  const getLastMonthDateRange = (): { from: Date, to: Date } => {
    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    // تاريخ بداية ونهاية من الشهر الماضي بنفس الفترة المحددة حالياً
    const daysInCurrentRange = dateRange.from && dateRange.to 
      ? Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) 
      : 7; // افتراضي: أسبوع
      
    const lastMonthTo = new Date(lastMonth);
    const lastMonthFrom = new Date(lastMonthTo);
    lastMonthFrom.setDate(lastMonthTo.getDate() - daysInCurrentRange);
    
    return { from: lastMonthFrom, to: lastMonthTo };
  };
  
  const lastMonthDateRange = getLastMonthDateRange();
  
  // استعلام بيانات الشهر الماضي للمقارنة
  const { 
    data: lastMonthSalesData = [], 
    isLoading: isLastMonthDataLoading 
  } = useQuery({
    queryKey: ['/api/daily-sales/detailed/last-month', { 
      branchId: selectedBranchId === 0 ? null : selectedBranchId, 
      startDate: formatDateParam(lastMonthDateRange.from),
      endDate: formatDateParam(lastMonthDateRange.to)
    }],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (selectedBranchId !== null && selectedBranchId !== 0) {
        params.append('branchId', selectedBranchId.toString());
      }
      
      params.append('startDate', formatDateParam(lastMonthDateRange.from));
      params.append('endDate', formatDateParam(lastMonthDateRange.to));
      
      try {
        const res = await fetch(`/api/daily-sales?${params.toString()}`);
        if (!res.ok) return [];
        
        const data = await res.json();
        
        return data.map((item: any) => {
          const dailyTarget = item.target || 0;
          const targetAchievement = dailyTarget > 0 ? (item.totalSales / dailyTarget) * 100 : 0;
          
          return {
            ...item,
            branchName: item.branchName || `فرع ${item.branchId}`,
            dailyTarget,
            targetAchievement,
            totalCashSales: Number(item.totalCashSales || 0),
            totalNetworkSales: Number(item.totalNetworkSales || 0),
            totalSales: Number(item.totalSales || 0),
            discrepancy: Number(item.discrepancy || 0),
            transactionCount: Number(item.transactionCount || item.totalTransactions || 0),
            averageTicket: Number(item.averageTicket || 0)
          };
        });
      } catch (error) {
        console.error('Error fetching last month data:', error);
        return [];
      }
    },
    enabled: selectedBranchId !== null || selectedBranchId === 0
  });
  
  // استعلام بيانات الفروع
  const { 
    data: branches = [], 
    isLoading: isBranchesLoading
  } = useQuery({
    queryKey: ['/api/branches'],
    queryFn: async () => {
      const res = await fetch('/api/branches');
      if (!res.ok) throw new Error('Failed to fetch branches');
      return res.json();
    }
  });
  
  // معالجة التحديث
  const handleRefresh = () => {
    refetchDailySales();
    if (onRefresh) onRefresh();
  };
  
  // معالجة تغيير نطاق التاريخ
  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range) {
      setDateRange(range);
    }
  };
  
  // حساب ملخص لكل فرع
  const calculateBranchSummaries = (): BranchSummary[] => {
    if (!dailySalesData.length) return [];
    
    // تجميع البيانات حسب الفرع
    const branchMap = new Map<number, BranchSummary>();
    
    dailySalesData.forEach((item: DailySalesReportItem) => {
      const branchId = item.branchId;
      
      if (!branchMap.has(branchId)) {
        branchMap.set(branchId, {
          branchId,
          branchName: item.branchName,
          totalSales: 0,
          totalCashSales: 0,
          totalNetworkSales: 0,
          totalTransactions: 0,
          avgTicket: 0,
          totalTarget: 0,
          targetAchievement: 0,
          totalDiscrepancy: 0
        });
      }
      
      const branch = branchMap.get(branchId)!;
      branch.totalSales += item.totalSales;
      branch.totalCashSales += item.totalCashSales;
      branch.totalNetworkSales += item.totalNetworkSales;
      branch.totalTransactions += item.transactionCount;
      branch.totalTarget += item.dailyTarget;
      branch.totalDiscrepancy += item.discrepancy;
    });
    
    // حساب المعدلات ونسب الإنجاز
    const summaries = Array.from(branchMap.values()).map(branch => {
      branch.avgTicket = branch.totalTransactions > 0 
        ? branch.totalSales / branch.totalTransactions 
        : 0;
      
      branch.targetAchievement = branch.totalTarget > 0 
        ? (branch.totalSales / branch.totalTarget) * 100 
        : 0;
      
      return branch;
    });
    
    // ترتيب الفروع حسب المبيعات
    return summaries.sort((a, b) => b.totalSales - a.totalSales);
  };
  
  // حساب ملخص إجمالي المبيعات
  const calculateTotalSummary = () => {
    if (!dailySalesData.length) return {
      totalSales: 0,
      totalCashSales: 0,
      totalNetworkSales: 0,
      totalTransactions: 0,
      avgTicket: 0,
      totalTarget: 0,
      targetAchievement: 0,
      totalDiscrepancy: 0,
      branchCount: 0,
      cashierCount: 0
    };
    
    const totalSales = dailySalesData.reduce((sum: number, item: DailySalesReportItem) => sum + item.totalSales, 0);
    const totalCashSales = dailySalesData.reduce((sum: number, item: DailySalesReportItem) => sum + item.totalCashSales, 0);
    const totalNetworkSales = dailySalesData.reduce((sum: number, item: DailySalesReportItem) => sum + item.totalNetworkSales, 0);
    const totalTransactions = dailySalesData.reduce((sum: number, item: DailySalesReportItem) => sum + item.transactionCount, 0);
    const totalTarget = dailySalesData.reduce((sum: number, item: DailySalesReportItem) => sum + item.dailyTarget, 0);
    const totalDiscrepancy = dailySalesData.reduce((sum: number, item: DailySalesReportItem) => sum + item.discrepancy, 0);
    
    // عدد الفروع المتميزة
    const uniqueBranches = new Set(dailySalesData.map((item: DailySalesReportItem) => item.branchId));
    const branchCount = uniqueBranches.size;
    
    // عدد الكاشير المتميز
    const uniqueCashiers = new Set(dailySalesData.map((item: DailySalesReportItem) => item.cashierId));
    const cashierCount = uniqueCashiers.size;
    
    const avgTicket = totalTransactions > 0 ? totalSales / totalTransactions : 0;
    const targetAchievement = totalTarget > 0 ? (totalSales / totalTarget) * 100 : 0;
    
    return {
      totalSales,
      totalCashSales,
      totalNetworkSales,
      totalTransactions,
      avgTicket,
      totalTarget,
      targetAchievement,
      totalDiscrepancy,
      branchCount,
      cashierCount
    };
  };
  
  // بيانات للتصدير
  const getExportableData = () => {
    return dailySalesData.map((item: DailySalesReportItem) => ({
      date: item.date,
      branchName: item.branchName,
      cashierName: item.cashierName,
      totalCashSales: item.totalCashSales,
      totalNetworkSales: item.totalNetworkSales,
      totalSales: item.totalSales,
      transactionCount: item.transactionCount,
      averageTicket: item.averageTicket,
      dailyTarget: item.dailyTarget,
      targetAchievement: `${item.targetAchievement.toFixed(1)}%`,
      discrepancy: item.discrepancy,
      status: item.status === 'completed' ? 'مكتمل' : 
              item.status === 'pending' ? 'قيد الانتظار' : 
              item.status === 'consolidated' ? 'مجمّع' : item.status
    }));
  };
  
  // تكوين تصدير البيانات
  const exportConfig: ExportConfig = {
    fileName: `تقرير_المبيعات_اليومية_المفصل`,
    title: `تقرير المبيعات اليومية المفصل - الفترة: ${dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : ''} إلى ${dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : ''}`,
    headers: [
      { key: 'date', label: 'التاريخ', width: 12 },
      { key: 'branchName', label: 'الفرع', width: 15 },
      { key: 'cashierName', label: 'الكاشير', width: 15 },
      { key: 'totalCashSales', label: 'المبيعات النقدية', width: 15 },
      { key: 'totalNetworkSales', label: 'مبيعات الشبكة', width: 15 },
      { key: 'totalSales', label: 'إجمالي المبيعات', width: 15 },
      { key: 'dailyTarget', label: 'الهدف اليومي', width: 15 },
      { key: 'targetAchievement', label: 'نسبة الإنجاز', width: 12 },
      { key: 'transactionCount', label: 'عدد المعاملات', width: 15 },
      { key: 'averageTicket', label: 'متوسط قيمة الفاتورة', width: 15 },
      { key: 'discrepancy', label: 'الفروقات', width: 12 },
      { key: 'status', label: 'الحالة', width: 12 }
    ],
    format: 'A4' as 'A4' | 'A3' | 'letter',
    orientation: 'landscape' as 'portrait' | 'landscape',
    footer: 'تم إنشاء هذا التقرير بواسطة نظام ButterBakery',
    arabicEnabled: true
  };
  
  // استخدام المكتبة المساعدة للطباعة
  const printReport = () => {
    if (printRef.current) {
      printContent(printRef.current, 'تقرير المبيعات اليومية المفصل');
    }
  };
  
  // بيانات الرسم البياني للدفعات
  const getPaymentMethodsData = () => {
    const summary = calculateTotalSummary();
    return [
      { name: 'نقدي', value: summary.totalCashSales, fill: '#FFC107' },
      { name: 'شبكة', value: summary.totalNetworkSales, fill: '#6B5B95' }
    ];
  };
  
  // بيانات الأداء حسب الفرع
  const getBranchPerformanceData = () => {
    return calculateBranchSummaries().map(branch => ({
      name: branch.branchName,
      sales: branch.totalSales,
      target: branch.totalTarget,
      achievement: branch.targetAchievement
    }));
  };
  
  if (isDataLoading || isBranchesLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-2/3" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
            <Skeleton className="h-[400px]" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const branchSummaries = calculateBranchSummaries();
  const totalSummary = calculateTotalSummary();
  
  return (
    <div className="space-y-6">
      {/* التحكم والفلاتر */}
      <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <DatePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            className="w-auto"
          />
          
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-1" />
            تحديث
          </Button>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-green-600 border-green-200 bg-green-50 hover:bg-green-100 hover:text-green-700"
            onClick={() => {
              try {
                // استيراد دالة التصدير من ExportUtils
                import('./ExportUtils').then(module => {
                  module.exportToExcel(getExportableData(), exportConfig);
                });
              } catch (error) {
                console.error('Export error:', error);
              }
            }}
          >
            <FileText className="h-4 w-4 mr-1" />
            إكسل
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:text-blue-700"
            onClick={() => {
              try {
                // استيراد دالة التصدير من ExportUtils
                import('./ExportUtils').then(module => {
                  module.exportToPdf(getExportableData(), exportConfig);
                });
              } catch (error) {
                console.error('Export error:', error);
              }
            }}
          >
            <FileText className="h-4 w-4 mr-1" />
            PDF
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={printReport}
            className="text-purple-600 border-purple-200 bg-purple-50 hover:bg-purple-100 hover:text-purple-700"
          >
            <Printer className="h-4 w-4 mr-1" />
            طباعة
          </Button>
          
          <Select
            value={viewMode}
            onValueChange={(value: 'table' | 'cards') => setViewMode(value)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="طريقة العرض" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cards">بطاقات</SelectItem>
              <SelectItem value="table">جدول</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* المحتوى القابل للطباعة */}
      <div ref={printRef}>
        {/* ملخص المبيعات */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle>ملخص المبيعات اليومية</CardTitle>
              <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                {dateRange.from && dateRange.to ? (
                  <>
                    {format(dateRange.from, 'yyyy-MM-dd')}
                    {dateRange.from.getTime() !== dateRange.to.getTime() && ` إلى ${format(dateRange.to, 'yyyy-MM-dd')}`}
                  </>
                ) : 'جميع التواريخ'}
              </Badge>
            </div>
            <CardDescription>
              إجمالي {dailySalesData.length} سجل مبيعات من {totalSummary.branchCount} فرع و {totalSummary.cashierCount} كاشير
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {/* إجمالي المبيعات */}
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <div className="text-sm font-medium text-green-800">إجمالي المبيعات</div>
                  </div>
                  <div className="mt-2">
                    <div className="text-2xl font-bold text-green-700">{formatCurrency(totalSummary.totalSales)}</div>
                    <div className="text-xs text-green-600 mt-1">
                      نقدي: {formatCurrency(totalSummary.totalCashSales)} | شبكة: {formatCurrency(totalSummary.totalNetworkSales)}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* الهدف والإنجاز */}
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    <div className="text-sm font-medium text-blue-800">تحقيق الهدف</div>
                  </div>
                  <div className="mt-2">
                    <div className="text-2xl font-bold text-blue-700">{totalSummary.targetAchievement.toFixed(1)}%</div>
                    <div className="mt-1">
                      <Progress
                        value={totalSummary.targetAchievement > 100 ? 100 : totalSummary.targetAchievement}
                        className="h-2 bg-blue-100"
                        indicatorClassName={getProgressColor(totalSummary.targetAchievement)}
                      />
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      الهدف: {formatCurrency(totalSummary.totalTarget)}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* متوسط قيمة الفاتورة */}
              <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <BarChart className="h-5 w-5 text-amber-600" />
                    <div className="text-sm font-medium text-amber-800">متوسط قيمة الفاتورة</div>
                  </div>
                  <div className="mt-2">
                    <div className="text-2xl font-bold text-amber-700">{formatCurrency(totalSummary.avgTicket)}</div>
                    <div className="text-xs text-amber-600 mt-1">
                      عدد المعاملات: {formatNumber(totalSummary.totalTransactions)}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* الفروقات */}
              <Card className="bg-gradient-to-br from-purple-50 to-fuchsia-50 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-purple-600" />
                    <div className="text-sm font-medium text-purple-800">الفروقات</div>
                  </div>
                  <div className="mt-2">
                    <div className={`text-2xl font-bold ${
                      totalSummary.totalDiscrepancy < 0 ? 'text-red-600' : 
                      totalSummary.totalDiscrepancy > 0 ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {formatCurrency(totalSummary.totalDiscrepancy)}
                    </div>
                    <div className="text-xs text-purple-600 mt-1">
                      {totalSummary.totalDiscrepancy < 0 ? 'عجز' : totalSummary.totalDiscrepancy > 0 ? 'زيادة' : 'متوازن'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* الرسوم البيانية */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* توزيع طرق الدفع */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">توزيع طرق الدفع</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="h-[300px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={getPaymentMethodsData()}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                          labelLine={false}
                        />
                        <RechartsTooltip 
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="text-center">
                      <div className="text-sm text-gray-500">نقدي</div>
                      <div className="text-lg font-bold">{formatCurrency(totalSummary.totalCashSales)}</div>
                      <div className="text-xs text-gray-500">
                        {totalSummary.totalSales > 0 
                          ? `${((totalSummary.totalCashSales / totalSummary.totalSales) * 100).toFixed(1)}%` 
                          : '0%'
                        }
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-500">شبكة</div>
                      <div className="text-lg font-bold">{formatCurrency(totalSummary.totalNetworkSales)}</div>
                      <div className="text-xs text-gray-500">
                        {totalSummary.totalSales > 0 
                          ? `${((totalSummary.totalNetworkSales / totalSummary.totalSales) * 100).toFixed(1)}%` 
                          : '0%'
                        }
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* أداء الفروع */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">أداء الفروع مقابل الأهداف</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart
                        data={getBranchPerformanceData()}
                        margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <RechartsTooltip 
                          formatter={(value: number, name: string) => [
                            name === 'sales' ? formatCurrency(value) : 
                            name === 'target' ? formatCurrency(value) : 
                            `${value.toFixed(1)}%`,
                            name === 'sales' ? 'المبيعات' : 
                            name === 'target' ? 'الهدف' : 
                            'نسبة الإنجاز'
                          ]}
                        />
                        <Legend 
                          payload={[
                            { value: 'المبيعات', type: 'rect', color: '#4F46E5' },
                            { value: 'الهدف', type: 'rect', color: '#FB7185' },
                            { value: 'نسبة الإنجاز', type: 'rect', color: '#10B981' }
                          ]}
                        />
                        <Bar dataKey="sales" name="المبيعات" fill="#4F46E5" />
                        <Bar dataKey="target" name="الهدف" fill="#FB7185" />
                        <Line 
                          type="monotone" 
                          dataKey="achievement" 
                          name="نسبة الإنجاز" 
                          stroke="#10B981" 
                          strokeWidth={2}
                          yAxisId={1}
                        />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* قسم المقارنة مع الشهر الماضي */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">مقارنة الأداء مع الشهر الماضي</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* مقارنة إجمالي المبيعات */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">مقارنة إجمالي المبيعات</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLastMonthDataLoading ? (
                      <Skeleton className="h-[200px]" />
                    ) : (
                      <>
                        {/* احسب إجمالي مبيعات الفترة السابقة */}
                        {(() => {
                          const currentTotal = totalSummary.totalSales;
                          const lastMonthTotal = lastMonthSalesData.reduce(
                            (sum: number, item: any) => sum + Number(item.totalSales || 0), 0
                          );
                          const percentChange = lastMonthTotal > 0 
                            ? ((currentTotal - lastMonthTotal) / lastMonthTotal) * 100 
                            : 0;
                          
                          const changeDirection = 
                            percentChange > 0 ? 'ارتفاع' :
                            percentChange < 0 ? 'انخفاض' : 'ثبات';
                            
                          const changeColor = 
                            percentChange > 0 ? 'text-green-600' :
                            percentChange < 0 ? 'text-red-600' : 'text-gray-600';
                            
                          const changeIcon = 
                            percentChange > 0 ? <TrendingUp className="h-5 w-5" /> :
                            percentChange < 0 ? <TrendingDown className="h-5 w-5" /> :
                            <MinusIcon className="h-5 w-5" />;
                          
                          return (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="border rounded-lg p-4 bg-blue-50">
                                  <div className="text-sm text-gray-600 mb-1">الفترة الحالية</div>
                                  <div className="text-2xl font-bold">{formatCurrency(currentTotal)}</div>
                                </div>
                                <div className="border rounded-lg p-4 bg-gray-50">
                                  <div className="text-sm text-gray-600 mb-1">الفترة السابقة</div>
                                  <div className="text-2xl font-bold">{formatCurrency(lastMonthTotal)}</div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 p-3 border rounded-lg bg-gray-50">
                                <div className={`p-2 rounded-full ${
                                  percentChange > 0 ? 'bg-green-100' :
                                  percentChange < 0 ? 'bg-red-100' : 'bg-gray-100'
                                }`}>
                                  {changeIcon}
                                </div>
                                <div>
                                  <div className={`text-lg font-bold ${changeColor}`}>
                                    {Math.abs(percentChange).toFixed(1)}%
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {changeDirection} عن الشهر الماضي
                                  </div>
                                </div>
                              </div>
                              
                              <Alert variant={percentChange >= 0 ? "default" : "destructive"} className="mt-2">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>
                                  {percentChange >= 0 
                                    ? "أداء إيجابي مقارنة بالفترة السابقة" 
                                    : "انخفاض في الأداء مقارنة بالفترة السابقة"}
                                </AlertTitle>
                                <AlertDescription>
                                  {percentChange >= 5 
                                    ? "نمو ممتاز في المبيعات. استمر في الاستراتيجيات الحالية." 
                                    : percentChange >= 0 
                                    ? "تحسن في المبيعات. فرصة للنمو أكثر." 
                                    : percentChange >= -5 
                                    ? "انخفاض طفيف. راجع الأسباب واتخذ إجراءات تصحيحية." 
                                    : "انخفاض كبير يتطلب مراجعة عاجلة للاستراتيجيات."}
                                </AlertDescription>
                              </Alert>
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </CardContent>
                </Card>
                
                {/* اتجاهات الأداء */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">تحليل اتجاهات الأداء</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isDataLoading ? (
                      <Skeleton className="h-[200px]" />
                    ) : (
                      <div className="space-y-4">
                        {/* تحليل الاتجاه العام */}
                        <div className="border rounded-lg p-4">
                          <h4 className="text-sm font-semibold mb-2">الاتجاه العام للمبيعات</h4>
                          
                          {(() => {
                            // سنستخدم البيانات المتاحة لتحليل الاتجاه
                            const salesData = [...dailySalesData].sort((a: any, b: any) => 
                              new Date(a.date).getTime() - new Date(b.date).getTime()
                            );
                            
                            if (salesData.length < 2) {
                              return (
                                <div className="text-sm text-gray-600">
                                  لا تتوفر بيانات كافية لتحليل الاتجاه
                                </div>
                              );
                            }
                            
                            // حساب معدل النمو
                            const firstDayTotal = salesData[0].totalSales;
                            const lastDayTotal = salesData[salesData.length - 1].totalSales;
                            const growth = firstDayTotal > 0 
                              ? ((lastDayTotal - firstDayTotal) / firstDayTotal) * 100 
                              : 0;
                            
                            // تحليل التذبذب
                            const isVolatile = salesData.some((sale, i) => {
                              if (i === 0) return false;
                              const prevSale = salesData[i - 1];
                              const change = Math.abs((sale.totalSales - prevSale.totalSales) / prevSale.totalSales);
                              return change > 0.2; // تغير بأكثر من 20%
                            });
                            
                            // تحليل الاتجاه
                            const trend = 
                              growth > 5 ? "صعودي قوي" :
                              growth > 0 ? "صعودي معتدل" :
                              growth > -5 ? "ثابت نسبياً" : "هبوطي";
                            
                            const trendClass = 
                              growth > 0 ? "text-green-600" :
                              growth === 0 ? "text-gray-600" : "text-red-600";
                            
                            // تحليل الاستقرار
                            const stability = isVolatile ? "غير مستقر" : "مستقر";
                            
                            return (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm">الاتجاه:</span>
                                  <Badge className={`${
                                    growth > 0 ? 'bg-green-100 text-green-800' :
                                    growth === 0 ? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {trend}
                                  </Badge>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <span className="text-sm">معدل النمو:</span>
                                  <span className={`font-semibold ${trendClass}`}>
                                    {growth > 0 ? "+" : ""}{growth.toFixed(1)}%
                                  </span>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <span className="text-sm">الاستقرار:</span>
                                  <Badge variant="outline" className={`${
                                    isVolatile ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                                  }`}>
                                    {stability}
                                  </Badge>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                        
                        {/* توصيات معتمدة على التحليل */}
                        <div className="border rounded-lg p-4 bg-slate-50">
                          <h4 className="text-sm font-semibold mb-2">توصيات الأداء</h4>
                          
                          {(() => {
                            // حساب نسبة تحقيق الهدف
                            const achievementRate = totalSummary.targetAchievement;
                            
                            // توصيات بناءً على الأداء
                            if (achievementRate >= 100) {
                              return (
                                <div className="space-y-2">
                                  <div className="text-sm text-green-700">
                                    <CheckCircle className="h-4 w-4 inline-block mr-1" />
                                    تم تحقيق الهدف بنسبة {achievementRate.toFixed(1)}%
                                  </div>
                                  <div className="text-sm">
                                    <ul className="list-disc list-inside space-y-1">
                                      <li>فرصة لزيادة الأهداف للشهر القادم</li>
                                      <li>مراجعة استراتيجيات النجاح ومشاركتها مع الفروع الأخرى</li>
                                      <li>النظر في تقديم حوافز إضافية للموظفين</li>
                                    </ul>
                                  </div>
                                </div>
                              );
                            } else if (achievementRate >= 85) {
                              return (
                                <div className="space-y-2">
                                  <div className="text-sm text-amber-700">
                                    <AlertCircle className="h-4 w-4 inline-block mr-1" />
                                    أداء جيد بنسبة {achievementRate.toFixed(1)}% من الهدف
                                  </div>
                                  <div className="text-sm">
                                    <ul className="list-disc list-inside space-y-1">
                                      <li>التركيز على زيادة متوسط قيمة الفاتورة</li>
                                      <li>استهداف أيام الضعف بعروض خاصة</li>
                                      <li>تدريب الموظفين على تقنيات المبيعات المتقاطعة</li>
                                    </ul>
                                  </div>
                                </div>
                              );
                            } else {
                              return (
                                <div className="space-y-2">
                                  <div className="text-sm text-red-700">
                                    <AlertTriangle className="h-4 w-4 inline-block mr-1" />
                                    أداء يحتاج تحسين: {achievementRate.toFixed(1)}% من الهدف
                                  </div>
                                  <div className="text-sm">
                                    <ul className="list-disc list-inside space-y-1">
                                      <li>مراجعة استراتيجية التسعير وعروض المنتجات</li>
                                      <li>تحليل أداء ساعات العمل وتوزيع الموظفين</li>
                                      <li>دراسة أداء المنافسين وأسباب انخفاض المبيعات</li>
                                      <li>تنفيذ حملات تسويقية استهدافية</li>
                                    </ul>
                                  </div>
                                </div>
                              );
                            }
                          })()}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* عرض البيانات التفصيلية */}
        {viewMode === 'table' ? (
          <Card>
            <CardHeader>
              <CardTitle>تفاصيل المبيعات اليومية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[100px]">التاريخ</TableHead>
                      <TableHead>الفرع</TableHead>
                      <TableHead>الكاشير</TableHead>
                      <TableHead>نقدي</TableHead>
                      <TableHead>شبكة</TableHead>
                      <TableHead>الإجمالي</TableHead>
                      <TableHead>الهدف</TableHead>
                      <TableHead className="text-center">نسبة الإنجاز</TableHead>
                      <TableHead>المعاملات</TableHead>
                      <TableHead>متوسط الفاتورة</TableHead>
                      <TableHead>الفروقات</TableHead>
                      <TableHead>الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailySalesData.map((sale: DailySalesReportItem) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">
                          {format(new Date(sale.date), 'yyyy-MM-dd')}
                        </TableCell>
                        <TableCell>{reshapeArabicText(sale.branchName)}</TableCell>
                        <TableCell>{reshapeArabicText(sale.cashierName)}</TableCell>
                        <TableCell>{formatCurrency(sale.totalCashSales)}</TableCell>
                        <TableCell>{formatCurrency(sale.totalNetworkSales)}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(sale.totalSales)}</TableCell>
                        <TableCell>{formatCurrency(sale.dailyTarget)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center">
                            <Badge className={`${
                              sale.targetAchievement >= 100 ? 'bg-green-100 text-green-800' :
                              sale.targetAchievement >= 75 ? 'bg-amber-100 text-amber-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {sale.targetAchievement.toFixed(1)}%
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{formatNumber(sale.transactionCount)}</TableCell>
                        <TableCell>{formatCurrency(sale.averageTicket)}</TableCell>
                        <TableCell className={`${
                          sale.discrepancy < 0 ? 'text-red-600' :
                          sale.discrepancy > 0 ? 'text-green-600' :
                          'text-gray-600'
                        }`}>
                          {formatCurrency(sale.discrepancy)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${
                            sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                            sale.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                            sale.status === 'consolidated' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {sale.status === 'completed' ? 'مكتمل' :
                             sale.status === 'pending' ? 'قيد الانتظار' :
                             sale.status === 'consolidated' ? 'مجمّع' :
                             sale.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {dailySalesData.map((sale: DailySalesReportItem) => (
              <Card key={sale.id} className="overflow-hidden">
                <div className={`h-1.5 ${
                  sale.targetAchievement >= 100 ? 'bg-green-500' :
                  sale.targetAchievement >= 75 ? 'bg-amber-500' :
                  'bg-red-500'
                }`}></div>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">
                      {format(new Date(sale.date), 'yyyy-MM-dd')}
                    </CardTitle>
                    <Badge variant="outline" className={`${
                      sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                      sale.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                      sale.status === 'consolidated' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {sale.status === 'completed' ? 'مكتمل' :
                       sale.status === 'pending' ? 'قيد الانتظار' :
                       sale.status === 'consolidated' ? 'مجمّع' :
                       sale.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <CardDescription className="text-base">
                      {reshapeArabicText(sale.branchName)}
                    </CardDescription>
                    <CardDescription>
                      {reshapeArabicText(sale.cashierName)}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex justify-between mb-3">
                    <div className="text-sm text-gray-500">إجمالي المبيعات</div>
                    <div className="font-bold">{formatCurrency(sale.totalSales)}</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="text-sm">
                      <div className="text-gray-500">نقدي</div>
                      <div>{formatCurrency(sale.totalCashSales)}</div>
                    </div>
                    <div className="text-sm">
                      <div className="text-gray-500">شبكة</div>
                      <div>{formatCurrency(sale.totalNetworkSales)}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="text-sm">
                      <div className="text-gray-500">المعاملات</div>
                      <div>{formatNumber(sale.transactionCount)}</div>
                    </div>
                    <div className="text-sm">
                      <div className="text-gray-500">متوسط الفاتورة</div>
                      <div>{formatCurrency(sale.averageTicket)}</div>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex justify-between mb-1">
                      <div className="text-sm text-gray-500">تحقيق الهدف</div>
                      <div className="text-sm font-medium">
                        {sale.targetAchievement.toFixed(1)}%
                      </div>
                    </div>
                    <Progress
                      value={sale.targetAchievement > 100 ? 100 : sale.targetAchievement}
                      className="h-2 bg-gray-100"
                      indicatorClassName={getProgressColor(sale.targetAchievement)}
                    />
                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                      <div>الهدف: {formatCurrency(sale.dailyTarget)}</div>
                      <div>
                        {sale.targetAchievement < 100 ? 
                          `متبقي: ${formatCurrency(sale.dailyTarget - sale.totalSales)}` : 
                          `زيادة: ${formatCurrency(sale.totalSales - sale.dailyTarget)}`
                        }
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-0 mt-4 border-t pt-2">
                    <div className="flex justify-between">
                      <div className="text-sm text-gray-500">الفروقات</div>
                      <div className={`font-medium ${
                        sale.discrepancy < 0 ? 'text-red-600' :
                        sale.discrepancy > 0 ? 'text-green-600' :
                        'text-gray-600'
                      }`}>
                        {formatCurrency(sale.discrepancy)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DailySalesDetailedReport;