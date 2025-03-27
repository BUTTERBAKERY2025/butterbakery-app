import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { 
  AlertCircle, 
  TrendingUp,
  Award,
  ThumbsUp,
  AlertTriangle,
  FileBarChart,
  RefreshCw,
  User,
  Users
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface CashierPerformanceProps {
  branchId: number | null;
  dateRange?: { from: Date; to: Date } | null;
  onRefresh?: () => void;
}

interface CashierData {
  cashierId: number;
  name: string;
  role: string;
  avatar: string | null;
  performance: {
    totalSales: number;
    transactionCount: number;
    averageTicket: number;
    salesCount: number;
    averageDiscrepancy: number;
    performanceScore: number;
  };
  insights: {
    strengths: string[];
    areas_to_improve: string[];
    trends: string[];
  };
  recommendations: string[];
}

interface PerformanceResponse {
  periodInfo: {
    startDate: string;
    endDate: string;
    totalDays: number;
  };
  cashierCount: number;
  overallPerformance: {
    averageScore: number;
    topPerformer: {
      name: string;
      score: number;
    } | null;
    improvementAreas: string[];
  };
  cashierPerformance: CashierData[];
}

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

const CashierPerformanceAI: React.FC<CashierPerformanceProps> = ({ 
  branchId, 
  dateRange,
  onRefresh 
}) => {
  // استخدام useQuery للحصول على بيانات أداء الكاشيرين
  const { 
    data: performanceData, 
    isLoading, 
    error,
    refetch
  } = useQuery<PerformanceResponse>({
    queryKey: [`/api/ai-analytics/cashier-performance/${branchId}`],
    enabled: branchId !== null, // تمكين الاستعلام إذا كان معرف الفرع محدد أو 0 (جميع الفروع)
  });

  // معالجة تحديث البيانات
  const handleRefresh = () => {
    if (branchId === null) return; // فقط تحقق من أن branchId ليس null (يمكن أن يكون 0 لجميع الفروع)
    refetch();
    if (onRefresh) onRefresh();
  };

  // رندر مؤشر الأداء
  const renderPerformanceIndicator = (score: number) => {
    let color = 'bg-yellow-200';
    if (score >= 90) color = 'bg-green-200';
    else if (score >= 75) color = 'bg-blue-200';
    else if (score < 60) color = 'bg-red-200';

    return (
      <div className="flex items-center gap-2 mt-1">
        <Progress value={score} className={`h-2 w-16 ${color}`} />
        <span className="text-xs text-gray-600">{score}%</span>
      </div>
    );
  };

  // رندر بطاقات الكاشيرين
  const renderCashierCards = () => {
    if (!performanceData || performanceData.cashierPerformance.length === 0) {
      return (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle>لا يوجد بيانات كافية</AlertTitle>
          <AlertDescription>
            لا توجد بيانات لتحليل أداء الكاشيرين حاليًا. يرجى التأكد من وجود سجلات مبيعات للفرع.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {performanceData.cashierPerformance.map((cashier, index) => (
          <Card key={cashier.cashierId} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex gap-3 items-center">
                  <Avatar className="h-10 w-10 border">
                    {cashier.avatar ? (
                      <AvatarImage src={cashier.avatar} alt={cashier.name} />
                    ) : (
                      <AvatarFallback className="bg-indigo-100 text-indigo-800">
                        {cashier.name.substring(0, 2)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <CardTitle className="text-base font-medium">
                      {cashier.name}
                      {index === 0 && performanceData.cashierPerformance.length > 1 && (
                        <Badge className="ml-2 bg-amber-500">الأفضل أداءً</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {cashier.role === 'cashier' ? 'كاشير' : 'مشرف'}
                    </CardDescription>
                  </div>
                </div>
                <Badge 
                  variant={
                    cashier.performance.performanceScore >= 85 ? 'default' :
                    cashier.performance.performanceScore >= 70 ? 'secondary' :
                    'destructive'
                  }
                >
                  {cashier.performance.performanceScore}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 p-2 rounded-md">
                  <p className="text-xs text-gray-500">المبيعات الإجمالية</p>
                  <p className="font-medium">{formatCurrency(cashier.performance.totalSales)}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded-md">
                  <p className="text-xs text-gray-500">عدد المعاملات</p>
                  <p className="font-medium">{cashier.performance.transactionCount}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded-md">
                  <p className="text-xs text-gray-500">متوسط الفاتورة</p>
                  <p className="font-medium">{formatCurrency(cashier.performance.averageTicket)}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded-md">
                  <p className="text-xs text-gray-500">متوسط الفرق النقدي</p>
                  <p className={`font-medium ${cashier.performance.averageDiscrepancy > 0 ? 'text-green-600' : cashier.performance.averageDiscrepancy < 0 ? 'text-red-600' : ''}`}>
                    {formatCurrency(cashier.performance.averageDiscrepancy)}
                  </p>
                </div>
              </div>

              {/* نقاط القوة والضعف */}
              {cashier.insights && (
                <div className="mt-4">
                  {cashier.insights.strengths && cashier.insights.strengths.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                        <ThumbsUp className="h-3.5 w-3.5 text-green-600" />
                        <span>نقاط القوة</span>
                      </h4>
                      <ul className="text-sm space-y-1 list-disc list-inside text-gray-700">
                        {cashier.insights.strengths.slice(0, 2).map((strength, idx) => (
                          <li key={idx}>{strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {cashier.insights.areas_to_improve && cashier.insights.areas_to_improve.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        <span>مجالات التحسين</span>
                      </h4>
                      <ul className="text-sm space-y-1 list-disc list-inside text-gray-700">
                        {cashier.insights.areas_to_improve.slice(0, 2).map((area: string, idx: number) => (
                          <li key={idx}>{area}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // رندر تحليل الأداء العام للفريق
  const renderTeamAnalysis = () => {
    if (!performanceData) return null;

    // تحويل بيانات الكاشيرين لتناسب مخطط الرادار
    const radarData = performanceData.cashierPerformance.map(cashier => ({
      name: cashier.name,
      'المبيعات': Math.min(100, (cashier.performance.totalSales / 5000) * 100),
      'خدمة العملاء': Math.min(100, cashier.performance.performanceScore),
      'السرعة': Math.min(100, (100 - Math.abs(cashier.performance.averageDiscrepancy) * 10)),
      'دقة الحساب': Math.min(100, (cashier.performance.performanceScore + 20) * 0.8),
      'متوسط الفاتورة': Math.min(100, (cashier.performance.averageTicket / 100) * 100)
    }));

    // تحويل البيانات لمخطط دائري
    const performanceDistribution = [
      { name: 'ممتاز (90%+)', value: performanceData.cashierPerformance.filter(c => c.performance.performanceScore >= 90).length },
      { name: 'جيد جداً (80-89%)', value: performanceData.cashierPerformance.filter(c => c.performance.performanceScore >= 80 && c.performance.performanceScore < 90).length },
      { name: 'جيد (70-79%)', value: performanceData.cashierPerformance.filter(c => c.performance.performanceScore >= 70 && c.performance.performanceScore < 80).length },
      { name: 'متوسط (60-69%)', value: performanceData.cashierPerformance.filter(c => c.performance.performanceScore >= 60 && c.performance.performanceScore < 70).length },
      { name: 'ضعيف (<60%)', value: performanceData.cashierPerformance.filter(c => c.performance.performanceScore < 60).length }
    ].filter(segment => segment.value > 0);

    return (
      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold mb-4">مؤشرات الأداء العامة</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500">متوسط الأداء</p>
                    <p className="text-2xl font-bold">{Math.round(performanceData.overallPerformance.averageScore)}%</p>
                  </div>
                  <FileBarChart className="h-8 w-8 text-indigo-600 opacity-80" />
                </div>
                {renderPerformanceIndicator(performanceData.overallPerformance.averageScore)}
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500">أفضل كاشير</p>
                    <p className="text-lg font-bold">
                      {performanceData.overallPerformance.topPerformer?.name || "لا يوجد"}
                    </p>
                  </div>
                  <Award className="h-8 w-8 text-amber-500 opacity-80" />
                </div>
                {performanceData.overallPerformance.topPerformer && (
                  <p className="text-xs text-gray-500 mt-1">
                    بمعدل أداء {performanceData.overallPerformance.topPerformer.score}%
                  </p>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500">إجمالي المبيعات</p>
                    <p className="text-lg font-bold">
                      {formatCurrency(performanceData.cashierPerformance.reduce(
                        (sum, cashier) => sum + cashier.performance.totalSales, 0
                      ))}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600 opacity-80" />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  لفترة {performanceData.periodInfo.totalDays} يوم
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500">عدد الكاشيرين</p>
                    <p className="text-2xl font-bold">{performanceData.cashierCount}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600 opacity-80" />
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-medium mb-2">توزيع مستويات الأداء</h4>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={performanceDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {performanceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} كاشير`, 'العدد']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">مقارنة المبيعات</h4>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceData.cashierPerformance.map(c => ({
                    name: c.name,
                    مبيعات: c.performance.totalSales,
                    معاملات: c.performance.transactionCount,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => {
                      // التأكد من أن القيمة رقمية قبل تنسيقها
                      const numericValue = typeof value === 'number' ? value : parseFloat(String(value));
                      return [formatCurrency(numericValue), 'المبيعات'];
                    }} />
                    <Legend />
                    <Bar dataKey="مبيعات" fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {performanceData.cashierPerformance.length >= 3 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">تحليل مهارات الفريق</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  {radarData.map((_, index) => (
                    <Radar
                      key={index}
                      name={performanceData.cashierPerformance[index].name}
                      dataKey={Object.keys(radarData[0]).filter(key => key !== 'name')[index % 5]}
                      stroke={COLORS[index % COLORS.length]}
                      fill={COLORS[index % COLORS.length]}
                      fillOpacity={0.2}
                    />
                  ))}
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        
        {performanceData.overallPerformance.improvementAreas && 
         performanceData.overallPerformance.improvementAreas.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2">مجالات تحسين أداء الفريق</h3>
            <Card className="border-dashed bg-gray-50">
              <CardContent className="pt-6">
                <ul className="space-y-2">
                  {performanceData.overallPerformance.improvementAreas.map((area, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-sm">{area}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-indigo-600" />
          <h2 className="text-xl font-bold">تحليل أداء الكاشيرين</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'جاري التحليل...' : 'تحديث التحليل'}
        </Button>
      </div>

      {branchId === null ? (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle>يجب اختيار الفرع أولاً</AlertTitle>
          <AlertDescription>
            اختر الفرع لعرض تحليلات أداء الكاشيرين.
          </AlertDescription>
        </Alert>
      ) : isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-[200px] w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-[180px] w-full" />
            <Skeleton className="h-[180px] w-full" />
          </div>
          <Skeleton className="h-[300px] w-full" />
        </div>
      ) : error ? (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle>خطأ في تحميل البيانات</AlertTitle>
          <AlertDescription>
            حدث خطأ أثناء تحميل بيانات أداء الكاشيرين. يرجى المحاولة مرة أخرى.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Alert className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
            <User className="h-4 w-4 text-indigo-600" />
            <AlertTitle>تحليل ذكي لأداء الكاشيرين</AlertTitle>
            <AlertDescription>
              تحليل أداء الكاشيرين باستخدام الذكاء الاصطناعي يساعد في تحديد نقاط القوة ومجالات التحسين.
            </AlertDescription>
          </Alert>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">تحليل أداء الكاشيرين</h3>
              {renderCashierCards()}
            </div>

            <Separator />

            {renderTeamAnalysis()}
          </div>
        </>
      )}
    </div>
  );
};

export default CashierPerformanceAI;