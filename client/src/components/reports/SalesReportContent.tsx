import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useTranslation } from 'react-i18next';
import { DateRange } from 'react-day-picker';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, BarChart3, PieChart, TrendingUp, RefreshCw } from 'lucide-react';
import { 
  Area, 
  AreaChart, 
  CartesianGrid, 
  Legend, 
  Line, 
  LineChart, 
  PieChart as RechartsPieChart, 
  Bar, 
  BarChart,
  Pie, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  XAxis, 
  YAxis 
} from 'recharts';
import ExportButton from './ExportButton';
import { ExportConfig } from './ExportUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// أنواع البيانات
interface SalesDataItem {
  date: string;
  cashSales: number;
  networkSales: number;
  totalSales: number;
  target: number;
  transactionCount?: number;
  averageTicket?: number;
}

interface SalesReportContentProps {
  selectedBranchId: number | null;
  onRefresh?: () => void;
}

const SalesReportContent: React.FC<SalesReportContentProps> = ({ 
  selectedBranchId,
  onRefresh
}) => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [chartType, setChartType] = useState<'area' | 'line' | 'bar'>('area');
  const [detailsTab, setDetailsTab] = useState<'overview' | 'payment' | 'hourly'>('overview');
  const [showFullTable, setShowFullTable] = useState<boolean>(false);
  
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setDate(new Date().getDate() - 7)),
    to: new Date()
  });
  
  // تنسيق التاريخ للاستعلام
  const formatDateParam = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };
  
  // استعلام بيانات المبيعات
  const { 
    data: salesResponse, 
    isLoading: isSalesLoading,
    refetch: refetchSales
  } = useQuery({
    queryKey: ['/api/daily-sales', { 
      branchId: selectedBranchId === 0 ? 0 : selectedBranchId, 
      period,
      startDate: dateRange.from ? formatDateParam(dateRange.from) : undefined,
      endDate: dateRange.to ? formatDateParam(dateRange.to) : undefined 
    }],
    queryFn: async () => {
      if (!selectedBranchId && selectedBranchId !== 0) {
        console.log("No branch selected, returning empty array");
        return {data: []};
      }
      
      // بناء سلسلة استعلام آمنة
      const params = new URLSearchParams();
      
      // تعيين الفرع
      console.log("Adding branch filter to request:", selectedBranchId);
      params.append('branchId', selectedBranchId.toString());
      
      // تعيين نطاق التاريخ
      if (dateRange.from) {
        params.append('startDate', formatDateParam(dateRange.from));
      }
      
      if (dateRange.to) {
        params.append('endDate', formatDateParam(dateRange.to));
      }
      
      if (dateRange.from) {
        params.append('from', formatDateParam(dateRange.from));
      }
      
      if (dateRange.to) {
        params.append('to', formatDateParam(dateRange.to));
      }
      
      // تعديل مهم: استخدام مسار API المبيعات اليومية بدلاً من sales-analytics
      console.log(`Fetching daily sales data from URL:`, `/api/daily-sales?${params.toString()}`);
      const res = await fetch(`/api/daily-sales?${params.toString()}`);
      
      if (!res.ok) {
        console.error("Error fetching daily sales data:", res.status, res.statusText);
        return { data: [] };
      }
      
      const data = await res.json();
      console.log(`Received daily sales data:`, Array.isArray(data) ? data.length : 0, `records`);

      // تنسيق البيانات إلى الشكل المتوقع
      const formattedData = Array.isArray(data) ? data.map(item => ({
        date: item.date,
        cashSales: item.totalCashSales || 0,
        networkSales: item.totalNetworkSales || 0,
        totalSales: item.totalSales || 0,
        target: item.target || 0,
        transactionCount: item.totalTransactions || 0,
        averageTicket: item.averageTicket || 0
      })) : [];

      return { data: formattedData };
    },
    enabled: !!selectedBranchId
  });
  
  // معالجة التحديث
  const handleRefresh = () => {
    refetchSales();
    if (onRefresh) onRefresh();
  };
  
  // معالجة تغيير نطاق التاريخ
  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range) {
      setDateRange(range);
    }
  };
  
  // استخراج بيانات المبيعات من الاستجابة
  const salesData = Array.isArray(salesResponse?.data) ? salesResponse.data : [];
  
  // حساب مجاميع البيانات
  const calculateTotals = () => {
    if (!salesData || !salesData.length) return {
      totalSales: 0,
      totalCashSales: 0,
      totalNetworkSales: 0,
      totalTarget: 0,
      avgDailySales: 0,
      maxSalesDay: { date: '', amount: 0 },
      minSalesDay: { date: '', amount: 0 },
      totalTransactions: 0,
      avgTicket: 0
    };
    
    const totalSales = salesData.reduce((sum: number, item: SalesDataItem) => sum + item.totalSales, 0);
    const totalCashSales = salesData.reduce((sum: number, item: SalesDataItem) => sum + item.cashSales, 0);
    const totalNetworkSales = salesData.reduce((sum: number, item: SalesDataItem) => sum + item.networkSales, 0);
    const totalTarget = salesData.reduce((sum: number, item: SalesDataItem) => sum + item.target, 0);
    const totalTransactions = salesData.reduce((sum: number, item: SalesDataItem) => sum + (item.transactionCount || 0), 0);
    
    const avgDailySales = totalSales / salesData.length;
    const avgTicket = totalTransactions > 0 ? totalSales / totalTransactions : 0;
    
    type SalesDay = { date: string; amount: number };
    
    const maxSalesDay = salesData.reduce((max: SalesDay, item: SalesDataItem) => 
      item.totalSales > max.amount ? { date: item.date, amount: item.totalSales } : max, 
      { date: '', amount: 0 }
    );
    
    const minSalesDay = salesData.reduce((min: SalesDay, item: SalesDataItem) => 
      (item.totalSales < min.amount || min.amount === 0) ? { date: item.date, amount: item.totalSales } : min, 
      { date: '', amount: 0 }
    );
    
    return {
      totalSales,
      totalCashSales,
      totalNetworkSales,
      totalTarget,
      avgDailySales,
      maxSalesDay,
      minSalesDay,
      totalTransactions,
      avgTicket
    };
  };
  
  // بيانات للتصدير
  const getExportableData = () => {
    return salesData.map((item: SalesDataItem) => ({
      date: item.date,
      cashSales: item.cashSales,
      networkSales: item.networkSales,
      totalSales: item.totalSales,
      target: item.target,
      transactionCount: item.transactionCount || 0,
      averageTicket: item.averageTicket || 0,
      achievement: item.target ? ((item.totalSales / item.target) * 100).toFixed(1) + '%' : 'N/A'
    }));
  };
  
  // تكوين تصدير البيانات
  const exportConfig: ExportConfig = {
    fileName: `تقرير_المبيعات_${period}`,
    title: `تقرير المبيعات ${period === 'daily' ? 'اليومي' : 
      period === 'weekly' ? 'الأسبوعي' : 
      period === 'monthly' ? 'الشهري' : 'السنوي'
    }`,
    headers: [
      { key: 'date', label: 'التاريخ', width: 15 },
      { key: 'cashSales', label: 'المبيعات النقدية', width: 15 },
      { key: 'networkSales', label: 'مبيعات الشبكة', width: 15 },
      { key: 'totalSales', label: 'إجمالي المبيعات', width: 15 },
      { key: 'target', label: 'الهدف', width: 15 },
      { key: 'achievement', label: 'نسبة الإنجاز', width: 15 },
      { key: 'transactionCount', label: 'عدد المعاملات', width: 15 },
      { key: 'averageTicket', label: 'متوسط قيمة الفاتورة', width: 15 }
    ],
    format: 'A4' as 'A4' | 'A3' | 'letter',
    orientation: 'landscape' as 'portrait' | 'landscape',
    footer: 'تم إنشاء هذا التقرير بواسطة نظام ButterBakery',
    arabicEnabled: true
  };
  
  // بيانات الرسم البياني للدفعات
  const getPaymentMethodsData = () => {
    const totals = calculateTotals();
    return [
      { name: 'نقدي', value: totals.totalCashSales, fill: '#FFC107' },
      { name: 'شبكة', value: totals.totalNetworkSales, fill: '#6B5B95' }
    ];
  };
  
  // رندرة الرسم البياني المناسب
  const renderChart = () => {
    if (isSalesLoading) {
      return <Skeleton className="h-[400px] w-full" />;
    }
    
    if (!salesData.length) {
      return (
        <div className="flex items-center justify-center h-[400px] text-gray-500">
          {t('reports.noDataAvailable')}
        </div>
      );
    }
    
    switch (chartType) {
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart
              data={salesData}
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FFC107" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#FFC107" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorNetwork" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6B5B95" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#6B5B95" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF6B6B" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#FF6B6B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <RechartsTooltip 
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => `${t('reports.date')}: ${label}`}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="cashSales" 
                name={t('reports.cashSales')}
                stroke="#FFC107" 
                fillOpacity={1} 
                fill="url(#colorCash)" 
              />
              <Area 
                type="monotone" 
                dataKey="networkSales" 
                name={t('reports.networkSales')}
                stroke="#6B5B95" 
                fillOpacity={1} 
                fill="url(#colorNetwork)" 
              />
              <Area 
                type="monotone" 
                dataKey="totalSales" 
                name={t('reports.totalSales')}
                stroke="#FF6B6B" 
                fillOpacity={1} 
                fill="url(#colorTotal)" 
              />
              <Area 
                type="monotone" 
                dataKey="target" 
                name={t('reports.target')}
                stroke="#ADB5BD" 
                strokeDasharray="5 5"
                fill="none" 
              />
            </AreaChart>
          </ResponsiveContainer>
        );
        
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart
              data={salesData}
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <RechartsTooltip 
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => `${t('reports.date')}: ${label}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="cashSales" 
                name={t('reports.cashSales')}
                stroke="#FFC107" 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="networkSales" 
                name={t('reports.networkSales')}
                stroke="#6B5B95" 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="totalSales" 
                name={t('reports.totalSales')}
                stroke="#FF6B6B" 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="target" 
                name={t('reports.target')}
                stroke="#ADB5BD" 
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
        
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={salesData}
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <RechartsTooltip 
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => `${t('reports.date')}: ${label}`}
              />
              <Legend />
              <Bar 
                dataKey="cashSales" 
                name={t('reports.cashSales')}
                fill="#FFC107" 
                stackId="a"
              />
              <Bar 
                dataKey="networkSales" 
                name={t('reports.networkSales')}
                fill="#6B5B95" 
                stackId="a"
              />
              <Line 
                type="monotone" 
                dataKey="target" 
                name={t('reports.target')}
                stroke="#ADB5BD" 
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </BarChart>
          </ResponsiveContainer>
        );
        
      default:
        return null;
    }
  };
  
  // رندرة قسم نظرة عامة
  const renderOverviewTab = () => {
    const totals = calculateTotals();
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t('reports.salesSummary')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between border-b pb-2">
                <span>{t('reports.totalSales')}</span>
                <span className="font-bold">{formatCurrency(totals.totalSales)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>{t('reports.targetSales')}</span>
                <span className="font-bold">{formatCurrency(totals.totalTarget)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>{t('reports.achievement')}</span>
                <span className="font-bold">
                  {totals.totalTarget > 0 
                    ? `${((totals.totalSales / totals.totalTarget) * 100).toFixed(1)}%` 
                    : 'N/A'
                  }
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>{t('reports.averageDailySales')}</span>
                <span className="font-bold">{formatCurrency(totals.avgDailySales)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('reports.highestSalesDay')}</span>
                <span className="font-bold">
                  {totals.maxSalesDay.date 
                    ? `${totals.maxSalesDay.date} (${formatCurrency(totals.maxSalesDay.amount)})`
                    : '-'
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t('reports.paymentMethodsSummary')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-4">
              <div className="flex justify-between border-b pb-2">
                <span>{t('reports.cashSales')}</span>
                <span className="font-bold">{formatCurrency(totals.totalCashSales)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>{t('reports.networkSales')}</span>
                <span className="font-bold">{formatCurrency(totals.totalNetworkSales)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('reports.cashPercentage')}</span>
                <span className="font-bold">
                  {totals.totalSales > 0 
                    ? `${((totals.totalCashSales / totals.totalSales) * 100).toFixed(1)}%` 
                    : '0%'
                  }
                </span>
              </div>
            </div>
            
            {/* رسم بياني دائري */}
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={getPaymentMethodsData()}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  />
                  <RechartsTooltip 
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t('reports.transactionAnalysis')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between border-b pb-2">
                <span>{t('reports.totalTransactions')}</span>
                <span className="font-bold">{totals.totalTransactions.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>{t('reports.averageTicket')}</span>
                <span className="font-bold">{formatCurrency(totals.avgTicket)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>{t('reports.averageTransactionsPerDay')}</span>
                <span className="font-bold">
                  {salesData.length > 0 
                    ? Math.round(totals.totalTransactions / salesData.length).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") 
                    : '0'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span>{t('reports.lowestSalesDay')}</span>
                <span className="font-bold">
                  {totals.minSalesDay.date 
                    ? `${totals.minSalesDay.date} (${formatCurrency(totals.minSalesDay.amount)})`
                    : '-'
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  // رندرة قسم وسائل الدفع
  const renderPaymentMethodsTab = () => {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t('reports.paymentTrendsAnalysis')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={salesData}
                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="colorCashOnly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFC107" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#FFC107" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorNetworkOnly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6B5B95" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#6B5B95" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <RechartsTooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => `${t('reports.date')}: ${label}`}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="cashSales" 
                  name={t('reports.cashSales')}
                  stroke="#FFC107" 
                  fillOpacity={1} 
                  fill="url(#colorCashOnly)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="networkSales" 
                  name={t('reports.networkSales')}
                  stroke="#6B5B95" 
                  fillOpacity={1} 
                  fill="url(#colorNetworkOnly)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{t('reports.paymentMethodDistribution')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={getPaymentMethodsData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    />
                    <RechartsTooltip 
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{t('reports.paymentMethodAnalysis')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* إحصائيات وسائل الدفع */}
                {getPaymentMethodsData().map((method, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between">
                      <span>{method.name}</span>
                      <span className="font-bold">{formatCurrency(method.value)}</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full" 
                        style={{ 
                          width: `${(method.value / calculateTotals().totalSales * 100) || 0}%`,
                          backgroundColor: method.fill
                        }}
                      ></div>
                    </div>
                    <div className="text-sm text-gray-500 text-left">
                      {`${((method.value / calculateTotals().totalSales) * 100).toFixed(1)}% من إجمالي المبيعات`}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };
  
  // رندرة قسم ساعات العمل
  const renderHourlyAnalysisTab = () => {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t('reports.hourlyAnalysis')}</CardTitle>
          </CardHeader>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">{t('reports.hourlyAnalysisComingSoon')}</p>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  // رندرة جدول البيانات التفصيلي
  const renderDetailedTable = () => {
    return (
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('reports.date')}</TableHead>
              <TableHead className="text-left">{t('reports.cashSales')}</TableHead>
              <TableHead className="text-left">{t('reports.networkSales')}</TableHead>
              <TableHead className="text-left">{t('reports.totalSales')}</TableHead>
              <TableHead className="text-left">{t('reports.target')}</TableHead>
              <TableHead className="text-left">{t('reports.achievement')}</TableHead>
              <TableHead className="text-left">{t('reports.transactions')}</TableHead>
              <TableHead className="text-left">{t('reports.averageTicket')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.isArray(salesData) && salesData.slice(0, showFullTable ? undefined : 5).map((item: SalesDataItem, index: number) => (
              <TableRow key={index}>
                <TableCell>{item.date}</TableCell>
                <TableCell className="text-left">{formatCurrency(item.cashSales)}</TableCell>
                <TableCell className="text-left">{formatCurrency(item.networkSales)}</TableCell>
                <TableCell className="text-left font-medium">{formatCurrency(item.totalSales)}</TableCell>
                <TableCell className="text-left">{formatCurrency(item.target)}</TableCell>
                <TableCell className="text-left">
                  <Badge variant={
                    (item.target && (item.totalSales / item.target) >= 1 ? 'success' :
                    item.target && (item.totalSales / item.target) >= 0.9 ? 'warning' :
                    'destructive') as "default" | "destructive" | "outline" | "secondary" | "success" | "warning"
                  }>
                    {item.target ? `${((item.totalSales / item.target) * 100).toFixed(1)}%` : 'N/A'}
                  </Badge>
                </TableCell>
                <TableCell className="text-left">{item.transactionCount || 0}</TableCell>
                <TableCell className="text-left">{formatCurrency(item.averageTicket || 0)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {salesData.length > 5 && !showFullTable && (
          <div className="p-2 text-center">
            <Button variant="link" onClick={() => setShowFullTable(true)}>
              {t('reports.showAllEntries', { count: salesData.length })}
            </Button>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <>
      {/* أدوات التصفية والتحكم */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pt-6 pb-3">
          <CardTitle>{t('reports.salesReports')}</CardTitle>
          
          <div className="flex flex-wrap gap-2 ml-4 mt-4 sm:mt-0">
            <Select
              value={period}
              onValueChange={(value: any) => setPeriod(value)}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder={t('reports.selectPeriod')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{t('reports.daily')}</SelectItem>
                <SelectItem value="weekly">{t('reports.weekly')}</SelectItem>
                <SelectItem value="monthly">{t('reports.monthly')}</SelectItem>
                <SelectItem value="yearly">{t('reports.yearly')}</SelectItem>
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
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="h-4 w-4 ml-2" />
                  {t('reports.viewFullData')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>{t('reports.detailedSalesData')}</DialogTitle>
                  <p className="text-sm text-muted-foreground">{t('reports.detailedSalesDataDescription') || 'عرض بيانات المبيعات التفصيلية'}</p>
                </DialogHeader>
                <div className="mt-2">
                  {renderDetailedTable()}
                </div>
                <div className="text-right mt-4">
                  <ExportButton
                    data={getExportableData()}
                    config={exportConfig}
                    variant="default"
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>
      
      {/* رسم بياني للمبيعات */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>{t('reports.salesOverTime')}</CardTitle>
          <div className="flex gap-1">
            <Button
              variant={chartType === 'area' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('area')}
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant={chartType === 'line' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('line')}
            >
              <TrendingUp className="h-4 w-4" />
            </Button>
            <Button
              variant={chartType === 'bar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('bar')}
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedBranchId ? (
            <div className="text-center py-8 text-neutral-500">
              <p>{t('reports.selectBranchPrompt')}</p>
            </div>
          ) : (
            renderChart()
          )}
        </CardContent>
      </Card>
      
      {/* تفاصيل التحليل */}
      <Tabs value={detailsTab} onValueChange={(tab: any) => setDetailsTab(tab)}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">{t('reports.overview')}</TabsTrigger>
          <TabsTrigger value="payment">{t('reports.paymentMethods')}</TabsTrigger>
          <TabsTrigger value="hourly">{t('reports.hourlyAnalysis')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          {!selectedBranchId ? (
            <div className="text-center py-8 text-neutral-500">
              <p>{t('reports.selectBranchPrompt')}</p>
            </div>
          ) : isSalesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Skeleton className="h-[300px] w-full" />
              <Skeleton className="h-[300px] w-full" />
              <Skeleton className="h-[300px] w-full" />
            </div>
          ) : (
            renderOverviewTab()
          )}
        </TabsContent>
        
        <TabsContent value="payment">
          {!selectedBranchId ? (
            <div className="text-center py-8 text-neutral-500">
              <p>{t('reports.selectBranchPrompt')}</p>
            </div>
          ) : isSalesLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-[300px] w-full" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-[250px] w-full" />
                <Skeleton className="h-[250px] w-full" />
              </div>
            </div>
          ) : (
            renderPaymentMethodsTab()
          )}
        </TabsContent>
        
        <TabsContent value="hourly">
          {!selectedBranchId ? (
            <div className="text-center py-8 text-neutral-500">
              <p>{t('reports.selectBranchPrompt')}</p>
            </div>
          ) : (
            renderHourlyAnalysisTab()
          )}
        </TabsContent>
      </Tabs>
      
      {/* زر تصدير */}
      <div className="mt-6 flex justify-end">
        <ExportButton
          data={getExportableData()}
          config={exportConfig}
          disabled={!selectedBranchId || isSalesLoading || !salesData.length}
        />
      </div>
    </>
  );
};

export default SalesReportContent;