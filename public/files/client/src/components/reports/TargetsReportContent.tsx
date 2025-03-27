import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency, getMonthName, getProgressColor } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CalendarIcon, RefreshCw, TrendingUp } from 'lucide-react';
import { 
  Area, 
  AreaChart, 
  Bar,
  BarChart,
  CartesianGrid, 
  Legend, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  XAxis, 
  YAxis 
} from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ExportButton from './ExportButton';
import { ExportConfig } from './ExportUtils';

// أنواع البيانات
interface BranchTarget {
  branchId: number;
  branchName: string;
  target: number;
  achieved: number;
  percentage: number;
  status: string;
}

interface MonthlyTarget {
  month: number;
  year: number;
  branches: BranchTarget[];
}

interface TargetsReportContentProps {
  selectedBranchId: number | null;
  onRefresh?: () => void;
}

const TargetsReportContent: React.FC<TargetsReportContentProps> = ({ 
  selectedBranchId,
  onRefresh
}) => {
  const { t } = useTranslation();
  const [chartType, setChartType] = useState<'bar' | 'area'>('bar');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  
  // استعلام بيانات الأهداف
  const { 
    data: targetData = [], 
    isLoading: isTargetLoading,
    refetch: refetchTargets
  } = useQuery({
    queryKey: ['/api/dashboard/target-achievement', { month, year }],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/target-achievement?month=${month}&year=${year}`);
      if (!res.ok) throw new Error('Failed to fetch target achievement data');
      return res.json();
    }
  });
  
  // معالجة التحديث
  const handleRefresh = () => {
    refetchTargets();
    if (onRefresh) onRefresh();
  };
  
  // معالجة اختيار الشهر
  const handleMonthChange = (value: string) => {
    setMonth(parseInt(value));
  };
  
  // معالجة اختيار السنة
  const handleYearChange = (value: string) => {
    setYear(parseInt(value));
  };
  
  // تصفية البيانات حسب اختيار الفرع
  const filteredData = selectedBranchId 
    ? targetData.filter((branch: BranchTarget) => branch.branchId === selectedBranchId)
    : targetData;
  
  // ترتيب البيانات حسب نسبة الإنجاز (تنازلي)
  const sortedData = [...filteredData].sort((a: BranchTarget, b: BranchTarget) => b.percentage - a.percentage);
  
  // بيانات للرسم البياني
  const getChartData = () => {
    if (selectedBranchId) {
      // مجموعة أشهر لفرع واحد (نحتاج بيانات أكثر من الخلفية)
      return Array.from({ length: 12 }, (_, i) => ({
        month: getMonthName(i + 1),
        target: Math.random() * 100000, // بيانات افتراضية للعرض
        achieved: Math.random() * 100000, // بيانات افتراضية للعرض
      }));
    } else {
      // مقارنة بين الفروع لشهر واحد
      return targetData.map((branch: BranchTarget) => ({
        name: branch.branchName,
        target: branch.target,
        achieved: branch.achieved,
        percentage: branch.percentage
      }));
    }
  };
  
  // بيانات للتصدير
  const getExportableData = () => {
    return targetData.map((branch: BranchTarget) => ({
      branchName: branch.branchName,
      target: branch.target,
      achieved: branch.achieved,
      percentage: `${branch.percentage.toFixed(1)}%`,
      status: branch.status,
      remaining: branch.target - branch.achieved
    }));
  };
  
  // تكوين تصدير البيانات
  const exportConfig: ExportConfig = {
    fileName: `تقرير_الأهداف_${getMonthName(month)}_${year}`,
    title: `تقرير أهداف الفروع - ${getMonthName(month)} ${year}`,
    headers: [
      { key: 'branchName', label: 'اسم الفرع', width: 25 },
      { key: 'target', label: 'المستهدف', width: 15 },
      { key: 'achieved', label: 'المحقق', width: 15 },
      { key: 'percentage', label: 'نسبة الإنجاز', width: 15 },
      { key: 'remaining', label: 'المتبقي', width: 15 },
      { key: 'status', label: 'الحالة', width: 15 }
    ],
    format: 'A4',
    orientation: 'portrait',
    footer: `تقرير أهداف الفروع لشهر ${getMonthName(month)} ${year} - تم إنشاؤه بواسطة نظام ButterBakery`,
    arabicEnabled: true
  };
  
  // رندرة الرسم البياني المناسب
  const renderChart = () => {
    if (isTargetLoading) {
      return <Skeleton className="h-[400px] w-full" />;
    }
    
    if (!filteredData.length) {
      return (
        <div className="flex items-center justify-center h-[400px] text-gray-500">
          {t('reports.noDataAvailable')}
        </div>
      );
    }
    
    const chartData = getChartData();
    
    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={selectedBranchId ? "month" : "name"} />
            <YAxis />
            <RechartsTooltip 
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend />
            <Bar dataKey="target" name={t('reports.target')} fill="#8884d8" />
            <Bar dataKey="achieved" name={t('reports.achieved')} fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      );
    } else {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorAchieved" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={selectedBranchId ? "month" : "name"} />
            <YAxis />
            <RechartsTooltip 
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="target" 
              name={t('reports.target')} 
              stroke="#8884d8" 
              fillOpacity={1} 
              fill="url(#colorTarget)" 
            />
            <Area 
              type="monotone" 
              dataKey="achieved" 
              name={t('reports.achieved')} 
              stroke="#82ca9d" 
              fillOpacity={1} 
              fill="url(#colorAchieved)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    }
  };
  
  // رندرة جدول مقارنة الفروع
  const renderBranchesTable = () => {
    return (
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('reports.branch')}</TableHead>
              <TableHead className="text-left">{t('reports.target')}</TableHead>
              <TableHead className="text-left">{t('reports.achieved')}</TableHead>
              <TableHead className="text-left">{t('reports.remaining')}</TableHead>
              <TableHead className="text-left">{t('reports.percentage')}</TableHead>
              <TableHead className="text-left">{t('reports.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((branch: BranchTarget, index) => (
              <TableRow key={index}>
                <TableCell>{branch.branchName}</TableCell>
                <TableCell className="text-left">{formatCurrency(branch.target)}</TableCell>
                <TableCell className="text-left">{formatCurrency(branch.achieved)}</TableCell>
                <TableCell className="text-left">{formatCurrency(branch.target - branch.achieved)}</TableCell>
                <TableCell className="text-left">
                  <Badge variant={
                    branch.percentage >= 100 ? 'success' :
                    branch.percentage >= 90 ? 'warning' :
                    branch.percentage >= 75 ? 'secondary' :
                    'destructive'
                  }>
                    {`${branch.percentage.toFixed(1)}%`}
                  </Badge>
                </TableCell>
                <TableCell className="text-left">{branch.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };
  
  // رندرة بطاقات تقدم الأهداف
  const renderTargetProgressCards = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedData.slice(0, 6).map((branch: BranchTarget, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex justify-between items-center">
                <span>{branch.branchName}</span>
                <Badge variant={
                  branch.percentage >= 100 ? 'success' :
                  branch.percentage >= 90 ? 'warning' :
                  branch.percentage >= 75 ? 'secondary' :
                  'destructive'
                }>
                  {`${branch.percentage.toFixed(1)}%`}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>{t('reports.achieved')}</span>
                  <span>{formatCurrency(branch.achieved)}</span>
                </div>
                <Progress 
                  value={Math.min(branch.percentage, 100)} 
                  className="h-2" 
                  indicatorClassName={`bg-${getProgressColor(branch.percentage)}`} 
                />
                <div className="flex justify-between text-sm">
                  <span>{t('reports.target')}</span>
                  <span>{formatCurrency(branch.target)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t('reports.remaining')}</span>
                  <span className={branch.percentage >= 100 ? "text-green-600 font-bold" : ""}>
                    {branch.percentage >= 100 
                      ? t('reports.targetReached') 
                      : formatCurrency(branch.target - branch.achieved)
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };
  
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  
  return (
    <>
      {/* أدوات التصفية والتحكم */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pt-6 pb-3">
          <CardTitle>{t('reports.targetsReports')}</CardTitle>
          
          <div className="flex flex-wrap gap-2 ml-4 mt-4 sm:mt-0">
            <Select
              value={month.toString()}
              onValueChange={handleMonthChange}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder={t('reports.selectMonth')} />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m} value={m.toString()}>
                    {getMonthName(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select
              value={year.toString()}
              onValueChange={handleYearChange}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder={t('reports.selectYear')} />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
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
                  <DialogTitle>{t('reports.detailedTargetData')}</DialogTitle>
                </DialogHeader>
                <div className="mt-2">
                  {renderBranchesTable()}
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
      
      {/* رسم بياني للأهداف */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>
            {selectedBranchId 
              ? t('reports.branchTargetAnalysis') 
              : t('reports.branchesTargetComparison')
            }
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant={chartType === 'bar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('bar')}
            >
              <TrendingUp className="h-4 w-4" />
            </Button>
            <Button
              variant={chartType === 'area' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('area')}
            >
              <TrendingUp className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {renderChart()}
        </CardContent>
      </Card>
      
      {/* بطاقات الأهداف */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle>{t('reports.branchesTargetProgress')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isTargetLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Skeleton className="h-[150px] w-full" />
              <Skeleton className="h-[150px] w-full" />
              <Skeleton className="h-[150px] w-full" />
              <Skeleton className="h-[150px] w-full" />
              <Skeleton className="h-[150px] w-full" />
              <Skeleton className="h-[150px] w-full" />
            </div>
          ) : !targetData.length ? (
            <div className="text-center py-8 text-neutral-500">
              <p>{t('reports.noDataAvailable')}</p>
            </div>
          ) : (
            renderTargetProgressCards()
          )}
        </CardContent>
      </Card>
      
      {/* جدول مقارنة الفروع الكامل */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle>{t('reports.branchesTargetComparison')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isTargetLoading ? (
            <Skeleton className="h-[350px] w-full" />
          ) : !targetData.length ? (
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
          data={getExportableData()}
          config={exportConfig}
          disabled={isTargetLoading || !targetData.length}
        />
      </div>
    </>
  );
};

export default TargetsReportContent;