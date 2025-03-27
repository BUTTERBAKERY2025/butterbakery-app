import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { useTranslation } from 'react-i18next';
import { DateRange } from 'react-day-picker';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { reshapeArabicText, formatTextForReport } from '@/lib/arabicTextUtils';
import { 
  CalendarIcon, 
  FilterIcon, 
  RefreshCw, 
  UserIcon, 
  EyeIcon, 
  PrinterIcon, 
  ClipboardIcon, 
  FileTextIcon,
  CheckCircle2Icon
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Bar, 
  BarChart, 
  CartesianGrid, 
  Legend, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  XAxis, 
  YAxis 
} from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ExportButton from './ExportButton';
import { ExportConfig, exportToPdf } from './ExportUtils';

// أنواع البيانات
interface Cashier {
  cashierId: number;
  name: string;
  avatar: string;
  shiftStart: string;
  shiftEnd: string;
  totalSales: number;
  discrepancy: number;
  totalTransactions: number;
  averageTicket: number;
  performance: number;
}

interface CashierReportContentProps {
  selectedBranchId: number | null;
  onRefresh?: () => void;
}

const CashierReportContent: React.FC<CashierReportContentProps> = ({ 
  selectedBranchId,
  onRefresh
}) => {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setDate(new Date().getDate() - 7)),
    to: new Date()
  });
  const [selectedCashierId, setSelectedCashierId] = useState<number | null>(null);
  
  // تنسيق التاريخ للاستعلام
  const formatDateParam = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };
  
  // استعلام لجلب قائمة الكاشيرين حسب الفرع المحدد
  const {
    data: cashiers = [],
    isLoading: isCashiersListLoading
  } = useQuery({
    queryKey: ['/api/users', { role: 'cashier', branchId: selectedBranchId }],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      const users = await res.json();
      // تصفية المستخدمين للحصول على الكاشيرين فقط
      return users.filter((user: any) => 
        // إما أن يكون نوع المستخدم كاشير أو أن يكون مرتبط بالفرع المحدد
        // سنقوم باعتبار كل المستخدمين كاشيرين لأغراض التقرير ما لم يكن النوع admin
        user.role !== 'admin' && 
        (!selectedBranchId || selectedBranchId === 0 || user.branchId === selectedBranchId || !user.branchId)
      ).map((user: any) => ({
        id: user.id,
        name: user.name
      }));
    },
    enabled: true
  });
  
  // استعلام بيانات الكاشير
  const { 
    data: cashiersResponse = { success: false, data: [] }, 
    isLoading: isCashiersLoading,
    refetch: refetchCashiers
  } = useQuery({
    queryKey: ['/api/dashboard/cashier-performance', { 
      branchId: selectedBranchId,
      cashierId: selectedCashierId,
      startDate: dateRange.from ? formatDateParam(dateRange.from) : undefined,
      endDate: dateRange.to ? formatDateParam(dateRange.to) : undefined
    }],
    queryFn: async () => {
      // إذا تم تحديد الفرع نقوم بإحضار بيانات كاشير هذا الفرع
      // وإلا نقوم بإحضار بيانات كاشير جميع الفروع (branchId=0)
      const branchParam = selectedBranchId ? `branchId=${selectedBranchId}` : 'branchId=0';
      
      // إضافة فلتر الكاشير إذا كان محددًا
      const cashierParam = selectedCashierId ? `cashierId=${selectedCashierId}` : '';
      
      // استخدام نطاق تاريخ كامل
      const startDateParam = dateRange.from ? `startDate=${formatDateParam(dateRange.from)}` : '';
      const endDateParam = dateRange.to ? `endDate=${formatDateParam(dateRange.to)}` : '';
      
      const url = `/api/dashboard/cashier-performance?${branchParam}`;
      const urlWithParams = [url, cashierParam, startDateParam, endDateParam].filter(Boolean).join('&');
      
      console.log("Fetching cashier data from:", urlWithParams);
      
      const res = await fetch(urlWithParams);
      if (!res.ok) throw new Error('Failed to fetch cashier performance data');
      const responseData = await res.json();
      
      // التحقق من صيغة البيانات المرجعة (تنسيق API موحد)
      if (responseData.success !== undefined && Array.isArray(responseData.data)) {
        return responseData;
      } else if (Array.isArray(responseData)) {
        return { success: true, data: responseData };
      } else {
        console.error("Invalid response format from API:", responseData);
        return { success: false, data: [] };
      }
    },
    enabled: true // نغير هذا لتمكين الاستعلام دائمًا (حتى مع كل الفروع)
  });
  
  // استخراج البيانات الفعلية من الاستجابة
  const cashiersData = Array.isArray(cashiersResponse.data) ? cashiersResponse.data : [];
  
  // معالجة التحديث
  const handleRefresh = () => {
    refetchCashiers();
    if (onRefresh) onRefresh();
  };
  
  // معالجة تغيير نطاق التاريخ
  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range) {
      setDateRange(range);
    }
  };
  
  // معالجة تغيير الكاشير المحدد
  const handleCashierChange = (cashierId: string) => {
    setSelectedCashierId(cashierId === "all" ? null : parseInt(cashierId));
  };
  
  // ترتيب البيانات حسب قيمة المبيعات (تنازلي) مع معالجة البيانات الفارغة
  const sortedData = Array.isArray(cashiersData) 
    ? [...cashiersData].sort((a: Cashier, b: Cashier) => b.totalSales - a.totalSales)
    : [];
  
  // بيانات للرسم البياني مع التحقق من توفر البيانات
  const getChartData = () => {
    if (!Array.isArray(sortedData) || sortedData.length === 0) {
      return [];
    }
    return sortedData.map((cashier: Cashier) => ({
      name: cashier.name,
      sales: cashier.totalSales,
      transactions: cashier.totalTransactions,
      avgTicket: cashier.averageTicket,
      discrepancy: Math.abs(cashier.discrepancy)
    }));
  };
  
  // بيانات للتصدير
  const getExportableData = () => {
    if (!Array.isArray(sortedData) || sortedData.length === 0) {
      return [];
    }
    
    return sortedData.map((cashier: Cashier) => ({
      name: cashier.name,
      shiftStart: cashier.shiftStart ? formatDate(new Date(cashier.shiftStart), 'short') : '---',
      shiftEnd: cashier.shiftEnd ? formatDate(new Date(cashier.shiftEnd), 'short') : 'مستمر',
      totalSales: cashier.totalSales,
      transactions: cashier.totalTransactions,
      averageTicket: cashier.averageTicket,
      discrepancy: cashier.discrepancy,
      performance: `${cashier.performance}%`
    }));
  };
  
  // الحصول على اسم الفرع
  const branchName = selectedBranchId ? 
    `الفرع ${selectedBranchId}` : 
    'كل الفروع';
  
  // تكوين تصدير البيانات مع تحسينات
  const exportConfig: ExportConfig = {
    fileName: `تقرير_أداء_الكاشير_${branchName}_${formatDateParam(new Date())}`,
    title: `تقرير أداء الكاشير - ${branchName} - ${formatDate(new Date(), 'medium')}`,
    headers: [
      { key: 'name', label: 'اسم الكاشير', width: 25 },
      { key: 'shiftStart', label: 'بداية الشفت', width: 15 },
      { key: 'shiftEnd', label: 'نهاية الشفت', width: 15 },
      { key: 'totalSales', label: 'إجمالي المبيعات', width: 18 },
      { key: 'transactions', label: 'عدد المعاملات', width: 15 },
      { key: 'averageTicket', label: 'متوسط قيمة الفاتورة', width: 18 },
      { key: 'discrepancy', label: 'الفروقات', width: 15 },
      { key: 'performance', label: 'الأداء', width: 15 }
    ],
    format: 'A4',
    orientation: 'landscape',
    footer: `تقرير أداء الكاشير - ${branchName} - ${formatDate(new Date(), 'medium')} - تم إنشاؤه بواسطة نظام ButterBakery`,
    arabicEnabled: true
  };
  
  // رندرة جدول الكاشير
  const renderCashiersTable = () => {
    return (
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('reports.cashier')}</TableHead>
              <TableHead className="text-left">{t('reports.shiftTime')}</TableHead>
              <TableHead className="text-left">{t('reports.totalSales')}</TableHead>
              <TableHead className="text-left">{t('reports.transactions')}</TableHead>
              <TableHead className="text-left">{t('reports.averageTicket')}</TableHead>
              <TableHead className="text-left">{t('reports.discrepancy')}</TableHead>
              <TableHead className="text-left">{t('reports.performance')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((cashier: Cashier, index) => (
              <TableRow key={index}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={cashier.avatar} />
                      <AvatarFallback>{cashier.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <span>{cashier.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-left">
                  {cashier.shiftStart ? formatDate(new Date(cashier.shiftStart), 'short') : '---'}
                  {cashier.shiftEnd ? ` - ${formatDate(new Date(cashier.shiftEnd), 'short')}` : ''}
                </TableCell>
                <TableCell className="text-left font-medium">{formatCurrency(cashier.totalSales)}</TableCell>
                <TableCell className="text-left">{cashier.totalTransactions}</TableCell>
                <TableCell className="text-left">{formatCurrency(cashier.averageTicket)}</TableCell>
                <TableCell className="text-left">
                  <Badge variant={
                    cashier.discrepancy === 0 ? 'outline' :
                    cashier.discrepancy > 0 ? 'success' :
                    Math.abs(cashier.discrepancy) < 10 ? 'warning' :
                    'destructive'
                  }>
                    {formatCurrency(cashier.discrepancy)}
                  </Badge>
                </TableCell>
                <TableCell className="text-left">
                  <Badge variant={
                    cashier.performance >= 95 ? 'success' :
                    cashier.performance >= 80 ? 'warning' :
                    'secondary'
                  }>
                    {`${cashier.performance}%`}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };
  
  // رندرة بطاقات أداء الكاشير مع إضافة قابلية النقر لعرض التفاصيل وزر العرض
  const renderCashierCards = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedData.map((cashier: Cashier, index) => (
          <div key={index} className="transition-transform hover:shadow-lg group">
            <Card className="overflow-hidden border-blue-100 group-hover:border-blue-300">
              <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="text-lg flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Avatar>
                      <AvatarImage src={cashier.avatar} />
                      <AvatarFallback>{cashier.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <span>{cashier.name}</span>
                  </div>
                  <Badge variant={
                    cashier.performance >= 95 ? 'success' :
                    cashier.performance >= 80 ? 'warning' :
                    'secondary'
                  }>
                    {`${cashier.performance}%`}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>{t('reports.shiftTime')}</span>
                    <span>
                      {cashier.shiftStart ? formatDate(new Date(cashier.shiftStart), 'short') : '---'}
                      {cashier.shiftEnd ? ` - ${formatDate(new Date(cashier.shiftEnd), 'short')}` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('reports.totalSales')}</span>
                    <span className="font-bold">{formatCurrency(cashier.totalSales)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('reports.transactions')}</span>
                    <span>{cashier.totalTransactions}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('reports.averageTicket')}</span>
                    <span>{formatCurrency(cashier.averageTicket)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('reports.discrepancy')}</span>
                    <span className={
                      cashier.discrepancy === 0 ? "text-neutral-500" : 
                      cashier.discrepancy > 0 ? "text-green-600" : 
                      "text-red-600"
                    }>
                      {formatCurrency(cashier.discrepancy)}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between p-2 border-t bg-gray-50">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                  onClick={() => setSelectedCashier(cashier)}
                >
                  <EyeIcon className="h-4 w-4 mr-1" />
                  عرض التفاصيل
                </Button>
                <Badge 
                  variant="outline" 
                  className="text-xs bg-white"
                >
                  {formatDate(new Date(), 'short')}
                </Badge>
              </CardFooter>
            </Card>
          </div>
        ))}
      </div>
    );
  };
  
  // رندرة الرسم البياني
  const renderChart = () => {
    if (isCashiersLoading) {
      return <Skeleton className="h-[400px] w-full" />;
    }
    
    if (!sortedData.length) {
      return (
        <div className="flex items-center justify-center h-[400px] text-gray-500">
          {t('reports.noDataAvailable')}
        </div>
      );
    }
    
    const chartData = getChartData();
    
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
              if (name === 'sales' || name === 'avgTicket') {
                return formatCurrency(value);
              }
              return value;
            }}
          />
          <Legend />
          <Bar dataKey="sales" name={t('reports.totalSales')} fill="#8884d8" />
          <Bar dataKey="transactions" name={t('reports.transactions')} fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    );
  };
  
  // كشف حساب كاشير مفصل
  const [selectedCashier, setSelectedCashier] = useState<Cashier | null>(null);
  
  // عرض كشف حساب كاشير مفصل مع توقيع
  const renderCashierStatement = (cashier: Cashier) => {
    return (
      <div className="space-y-6">
        {/* ترويسة الكشف مع شعار النظام */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100 mb-6">
          <div className="flex items-center justify-between">
            <div className="font-bold text-xl text-blue-800">Butter Bakery</div>
            <div className="text-sm text-gray-500">
              {formatDate(new Date(), 'long')}
            </div>
          </div>
          <div className="text-center mt-3 mb-1">
            <h2 className="text-xl font-bold text-gray-900 mb-1">كشف حساب كاشير</h2>
            <div className="text-sm text-gray-600">يعتبر هذا المستند رسمياً ويحتوي على توقيع الكاشير</div>
          </div>
        </div>
      
        {/* معلومات الكاشير */}
        <div className="flex items-center gap-4 mb-4 p-4 border rounded-lg bg-white shadow-sm">
          <Avatar className="h-16 w-16">
            <AvatarImage src={cashier.avatar} />
            <AvatarFallback>{cashier.name.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-xl font-bold">{cashier.name}</h3>
            <p className="text-sm text-gray-500">
              وردية عمل: {cashier.shiftStart ? formatDate(new Date(cashier.shiftStart), 'short') : '---'} 
              {cashier.shiftEnd ? ` - ${formatDate(new Date(cashier.shiftEnd), 'short')}` : ''}
            </p>
          </div>
          
          <div className="mr-auto mt-2 border border-blue-200 rounded-md py-1 px-3 bg-blue-50 text-blue-800 text-sm">
            رقم الكاشير: {cashier.cashierId}
          </div>
        </div>
        
        {/* ملخص الأداء */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t('reports.performanceSummary')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-gray-500">{t('reports.totalSales')}</p>
                <p className="text-2xl font-bold">{formatCurrency(cashier.totalSales)}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-500">{t('reports.transactions')}</p>
                <p className="text-2xl font-bold">{cashier.totalTransactions}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-500">{t('reports.averageTicket')}</p>
                <p className="text-2xl font-bold">{formatCurrency(cashier.averageTicket)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* فروق النقدية */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t('reports.cashDiscrepancy')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">{t('reports.cashDiscrepancyAmount')}</span>
                <span className={
                  cashier.discrepancy === 0 ? "text-neutral-500 font-bold" : 
                  cashier.discrepancy > 0 ? "text-green-600 font-bold" : 
                  "text-red-600 font-bold"
                }>
                  {formatCurrency(cashier.discrepancy)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">{t('reports.discrepancyStatus')}</span>
                <Badge variant={
                  cashier.discrepancy === 0 ? 'outline' :
                  cashier.discrepancy > 0 ? 'success' :
                  Math.abs(cashier.discrepancy) < 10 ? 'warning' :
                  'destructive'
                }>
                  {cashier.discrepancy === 0 ? t('reports.balanced') : 
                   cashier.discrepancy > 0 ? t('reports.surplus') : 
                   t('reports.deficit')}
                </Badge>
              </div>
              <div className="mt-4">
                <div className="text-sm text-gray-500 mb-2">{t('reports.discrepancyPercentage')}</div>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={Math.min(100, Math.abs(cashier.discrepancy) / cashier.totalSales * 100)} 
                    indicatorClassName={cashier.discrepancy > 0 ? "bg-green-600" : "bg-red-600"}
                    className="bg-muted"
                  />
                  <span className="text-sm">
                    {(Math.abs(cashier.discrepancy) / cashier.totalSales * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
              
              {/* إذا كان هناك فرق، نعرض الإجراءات المقترحة */}
              {cashier.discrepancy !== 0 && (
                <div className="mt-6 p-3 border rounded-md bg-muted/50">
                  <h4 className="font-medium mb-2">{t('reports.suggestedActions')}</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>{cashier.discrepancy > 0 ? t('reports.surplusAction1') : t('reports.deficitAction1')}</li>
                    <li>{cashier.discrepancy > 0 ? t('reports.surplusAction2') : t('reports.deficitAction2')}</li>
                    <li>{t('reports.generalAction')}</li>
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* النصائح والتوصيات */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t('reports.recommendations')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {cashier.discrepancy === 0 && (
                <p className="text-green-600">
                  {t('reports.balancedRecommendation')} ✓
                </p>
              )}
              {cashier.discrepancy > 0 && (
                <p className="text-amber-600">
                  {t('reports.surplusRecommendation')} ⚠️
                </p>
              )}
              {cashier.discrepancy < 0 && (
                <p className="text-red-600">
                  {t('reports.deficitRecommendation')} ❌
                </p>
              )}
              <p className="text-gray-500 text-sm mt-4">
                {t('reports.performanceNote')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* توقيع الكاشير */}
        <Card className="mb-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">توقيع الكاشير</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 border border-dashed rounded-md bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="w-1/3">
                  <p className="text-sm text-gray-500">اسم الكاشير</p>
                  <p className="font-medium">{cashier.name}</p>
                </div>
                <div className="w-1/3 text-center">
                  <div className="border-b border-gray-400 pb-1 mt-4 mx-auto w-32">
                    <div className="h-10 flex items-center justify-center">
                      <span className="font-arabic text-blue-800 font-bold">توقيع</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">التوقيع</p>
                </div>
                <div className="w-1/3 text-right">
                  <p className="text-sm text-gray-500">التاريخ</p>
                  <p className="font-medium">{formatDate(new Date(), 'medium')}</p>
                </div>
              </div>

              <div className="mt-6 flex gap-2 justify-end">
                <Badge variant="outline" className="bg-gray-100">
                  <CheckCircle2Icon className="h-3 w-3 mr-1 text-green-600" />
                  تم التوقيع
                </Badge>
                <Badge variant="outline" className="bg-gray-100">
                  ID: {cashier.cashierId}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <>
      {/* أدوات التصفية والتحكم */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pt-6 pb-3">
          <CardTitle>{t('reports.cashierPerformanceReport')}</CardTitle>
          
          <div className="flex flex-wrap gap-2 ml-4 mt-4 sm:mt-0">
            <div className="flex gap-2">
              {/* تحديد الكاشير */}
              <Select
                value={selectedCashierId ? selectedCashierId.toString() : "all"}
                onValueChange={handleCashierChange}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('reports.selectCashier')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('reports.allCashiers')}</SelectItem>
                  {cashiers.map((cashier: any) => (
                    <SelectItem key={cashier.id} value={cashier.id.toString()}>
                      {cashier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* تحديد نطاق التاريخ */}
              <DatePicker
                value={dateRange}
                onChange={handleDateRangeChange}
              />
              
              <Button
                variant="default"
                size="icon"
                onClick={handleRefresh}
                className="ml-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-md shadow-sm transition-all duration-200 ease-in-out"
              >
                <RefreshCw className={`h-5 w-5 ${isCashiersLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-md transition-all duration-200 ease-in-out flex items-center gap-2 shadow-sm"
                >
                  <UserIcon className="h-5 w-5" />
                  <span className="font-medium">{t('reports.viewAllCashiers')}</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>{t('reports.detailedCashierData')}</DialogTitle>
                </DialogHeader>
                <div className="mt-2">
                  {renderCashiersTable()}
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
      
      {/* نافذة كشف حساب الكاشير المفصل */}
      <Dialog open={!!selectedCashier} onOpenChange={(open) => !open && setSelectedCashier(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('reports.cashierDetailedStatement')}</DialogTitle>
          </DialogHeader>
          {selectedCashier && (
            <div className="py-4">
              {renderCashierStatement(selectedCashier)}
            </div>
          )}
          <div className="flex justify-between mt-4">
            <Button 
              variant="outline" 
              onClick={() => setSelectedCashier(null)}
              className="border-gray-300 hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-md transition-all duration-200 ease-in-out flex items-center gap-2"
            >
              <span className="font-medium text-sm">{t('common.close')}</span>
            </Button>
            <Button 
              variant="default" 
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2 rounded-md shadow-md transition-all duration-200 ease-in-out transform hover:-translate-y-1 hover:shadow-lg flex items-center gap-2"
              onClick={() => {
                // طباعة كشف حساب الكاشير مباشرة باستخدام المكتبة المحسنة
                if (selectedCashier) {
                  // استيراد مكتبة الطباعة المحسنة
                  import('@/lib/printing').then(({ printReport }) => {
                    console.log("بدء طباعة كشف حساب الكاشير المحسن");
                    
                    // إعداد خيارات الطباعة
                    printReport({
                      // استخدام محدد للنافذة الظاهرة
                      selector: '[role="dialog"] > div > div',
                      
                      // إضافة ترويسة التقرير
                      header: {
                        title: `كشف حساب كاشير: ${selectedCashier.name}`,
                        subtitle: `تاريخ المناوبة: ${formatDate(new Date(selectedCashier.shiftStart), 'long')}`,
                        date: true
                      },
                      
                      // إضافة تذييل التقرير
                      footer: `تم إنشاء هذا التقرير بواسطة نظام بتر بيكري - فرع ${selectedBranchId}`,
                      
                      // إعدادات الورق
                      paperSize: 'a4',
                      orientation: 'portrait',
                      
                      // إضافة ترقيم الصفحات
                      pageNumbers: true,
                      
                      // إخفاء عناصر التحكم
                      hideControls: true,
                      
                      // إعدادات الجداول
                      tables: {
                        repeatHeaders: true,
                        preventRowSplit: true
                      },
                      
                      // دوال قبل وبعد الطباعة
                      beforePrint: () => {
                        console.log("جاري تحضير الطباعة");
                      },
                      
                      afterPrint: () => {
                        console.log("اكتملت عملية الطباعة بنجاح");
                      }
                    });
                  }).catch(error => {
                    console.error("حدث خطأ أثناء استيراد مكتبة الطباعة:", error);
                    
                    // في حالة فشل استيراد المكتبة، نستخدم طريقة الطباعة البسيطة
                    console.log("استخدام طريقة الطباعة البسيطة");
                    window.print();
                  });
                }
              }}
            >
              <PrinterIcon className="h-5 w-5" />
              <span className="font-semibold text-sm">طباعة الكشف</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* رسم بياني للكاشير */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle>{t('reports.cashierSalesComparison')}</CardTitle>
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
      
      {/* بطاقات أداء الكاشير */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle>{t('reports.cashierPerformanceCards')}</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedBranchId ? (
            <div className="text-center py-8 text-neutral-500">
              <p>{t('reports.selectBranchPrompt')}</p>
            </div>
          ) : isCashiersLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Skeleton className="h-[200px] w-full" />
              <Skeleton className="h-[200px] w-full" />
              <Skeleton className="h-[200px] w-full" />
            </div>
          ) : !sortedData.length ? (
            <div className="text-center py-8 text-neutral-500">
              <p>{t('reports.noDataAvailable')}</p>
            </div>
          ) : (
            renderCashierCards()
          )}
        </CardContent>
      </Card>
      
      {/* جدول مقارنة الكاشير */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle>{t('reports.cashierDetailedComparison')}</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedBranchId ? (
            <div className="text-center py-8 text-neutral-500">
              <p>{t('reports.selectBranchPrompt')}</p>
            </div>
          ) : isCashiersLoading ? (
            <Skeleton className="h-[350px] w-full" />
          ) : !sortedData.length ? (
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
          data={getExportableData()}
          config={exportConfig}
          disabled={!selectedBranchId || isCashiersLoading || !sortedData.length}
        />
      </div>
    </>
  );
};

export default CashierReportContent;