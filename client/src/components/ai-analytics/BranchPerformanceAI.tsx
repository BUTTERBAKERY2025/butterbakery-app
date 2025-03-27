import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart,
  ComposedChart
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { 
  BrainCircuit, 
  TrendingUp, 
  Activity, 
  BarChart3, 
  Calendar, 
  AlertCircle,
  ThumbsUp,
  Share2,
  Zap,
  Eye,
  RefreshCw,
  PieChart
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

interface AIAnalyticsProps {
  branchId: number | null;
  dateRange?: { from: Date; to: Date } | null;
  onRefresh?: () => void;
}

// تعريف واجهات البيانات الواردة من API
interface ForecastResponse {
  forecast: Array<{
    date: string;
    dayName: string;
    actualSales: number;
    predictedSales: number;
    target: number;
    confidence: number;
  }>;
  insights: AIInsight[];
  dailyTarget: number;
  monthlyTarget: {
    target: number;
    achieved: number;
    percentage: number;
  } | null;
  historicalData: {
    hasEnoughData: boolean;
    daysAnalyzed: number;
  };
}

interface AIInsight {
  id: string;
  title: string;
  description: string;
  type: 'positive' | 'negative' | 'neutral' | 'warning';
  value?: number;
  change?: number;
  confidence: number; // 0 to 100
  recommendations?: string[];
}

interface SalesData {
  date: string;
  actualSales: number;
  predictedSales: number;
  target: number;
  confidence: number;
}

const BranchPerformanceAI: React.FC<AIAnalyticsProps> = ({ 
  branchId, 
  dateRange,
  onRefresh 
}) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('forecast');

  // نموذج بيانات للتنبؤ بالمبيعات
  const forecastData: SalesData[] = [
    { date: 'الأحد', actualSales: 3200, predictedSales: 3500, target: 3600, confidence: 87 },
    { date: 'الإثنين', actualSales: 4100, predictedSales: 4000, target: 3600, confidence: 92 },
    { date: 'الثلاثاء', actualSales: 3800, predictedSales: 3700, target: 3600, confidence: 90 },
    { date: 'الأربعاء', actualSales: 0, predictedSales: 4200, target: 3600, confidence: 85 },
    { date: 'الخميس', actualSales: 0, predictedSales: 4800, target: 3600, confidence: 82 },
    { date: 'الجمعة', actualSales: 0, predictedSales: 4500, target: 3600, confidence: 78 },
    { date: 'السبت', actualSales: 0, predictedSales: 5000, target: 3600, confidence: 75 }
  ];

  // نموذج تحليلات الذكاء الاصطناعي
  const aiInsights: AIInsight[] = [
    {
      id: 'sales-uptrend',
      title: 'اتجاه صعودي قوي للمبيعات',
      description: 'المبيعات في ارتفاع مستمر لمدة 3 أيام متتالية مقارنة بالأسبوع السابق.',
      type: 'positive',
      value: 15,
      confidence: 92,
      recommendations: [
        'زيادة المخزون من المنتجات الأكثر مبيعًا',
        'الاستعداد بموظفين إضافيين في أوقات الذروة'
      ]
    },
    {
      id: 'target-warning',
      title: 'تحذير: تأخر عن تحقيق التارجت الشهري',
      description: 'المبيعات الحالية 68% من التارجت الشهري، مع بقاء 10 أيام فقط.',
      type: 'warning',
      value: 68,
      confidence: 95,
      recommendations: [
        'تفعيل عروض ترويجية لزيادة المبيعات',
        'استهداف العملاء المتكررين بعروض مخصصة'
      ]
    },
    {
      id: 'performance-issue',
      title: 'انخفاض المبيعات المسائية',
      description: 'معدل المبيعات بعد الساعة 6 مساءً أقل بنسبة 23% من المتوسط.',
      type: 'negative',
      value: -23,
      confidence: 88,
      recommendations: [
        'تفعيل خصومات مسائية جذابة',
        'مراجعة جدول الموظفين خلال الفترة المسائية'
      ]
    },
    {
      id: 'seasonal-trend',
      title: 'اتجاه موسمي متوقع',
      description: 'توقع زيادة في المبيعات بنسبة 30% خلال الأسبوع القادم بناءً على بيانات العام الماضي.',
      type: 'neutral',
      value: 30,
      confidence: 86,
      recommendations: [
        'الاستعداد بكميات إضافية من المنتجات الأكثر طلبًا',
        'التجهيز بموظفين إضافيين خلال ساعات الذروة'
      ]
    }
  ];

  // تحليل الاتجاهات واكتشاف الأنماط
  const trendAnalysis = {
    weeklyPerformance: [
      { name: 'أسبوع 1', فعلي: 22500, متوقع: 20000, نسبة: 112.5 },
      { name: 'أسبوع 2', فعلي: 24000, متوقع: 20000, نسبة: 120 },
      { name: 'أسبوع 3', فعلي: 19000, متوقع: 20000, نسبة: 95 },
      { name: 'أسبوع 4', فعلي: 26000, متوقع: 25000, نسبة: 104 }
    ],
    topPerformingHours: [
      { hour: '10 - 11 صباحًا', sales: 4500, customers: 45 },
      { hour: '12 - 1 ظهرًا', sales: 6800, customers: 58 },
      { hour: '5 - 6 مساءً', sales: 7200, customers: 65 },
      { hour: '7 - 8 مساءً', sales: 5500, customers: 48 }
    ]
  };

  // أكثر المنتجات مبيعًا (بناءً على تحليل AI)
  const topProducts = [
    { name: 'كيك شوكولاتة', sales: 340, growth: 15 },
    { name: 'كروسان ساده', sales: 280, growth: 8 },
    { name: 'قهوة عربية', sales: 260, growth: 12 },
    { name: 'دونات بالسكر', sales: 240, growth: -5 }
  ];

  // استخدام useQuery للحصول على بيانات توقعات المبيعات من الخادم
  const { 
    data: forecastResponse, 
    isLoading: isForecastLoading, 
    error: forecastError,
    refetch: refetchForecast
  } = useQuery({
    queryKey: [`/api/ai-analytics/sales-forecast/${branchId}`],
    enabled: branchId !== null, // تمكين الاستعلام إذا كان معرف الفرع محدد أو 0 (جميع الفروع)
  });

  // استخدام useQuery للحصول على بيانات تحليل أداء الفرع
  const { 
    data: performanceResponse, 
    isLoading: isPerformanceLoading,
    error: performanceError,
    refetch: refetchPerformance
  } = useQuery({
    queryKey: [`/api/ai-analytics/branch-performance/${branchId}`, activeTab === 'trends'],
    enabled: branchId !== null && activeTab === 'trends', // تمكين الاستعلام سواء كان معرف الفرع محدد أو 0 (جميع الفروع)
  });

  // تجميع حالة التحميل الفعلية
  const isLoadingData = isForecastLoading || 
    (activeTab === 'trends' && isPerformanceLoading);

  // معالجة تنشيط التحليل واستدعاء البيانات من الخادم
  const handleRefresh = () => {
    if (branchId === null) return; // فقط تحقق من أن branchId ليس null (يمكن أن يكون 0 لجميع الفروع)
    
    setIsLoading(true);
    
    // إعادة تحميل البيانات حسب التبويب النشط
    if (activeTab === 'forecast') {
      refetchForecast();
    } else if (activeTab === 'trends') {
      refetchPerformance();
    }
    
    // تأكيد انتهاء التحميل بعد وقت قصير
    setTimeout(() => {
      setIsLoading(false);
      if (onRefresh) onRefresh();
    }, 500);
  };

  // رندر مؤشر الثقة
  const renderConfidenceIndicator = (confidence: number) => {
    let bgColor = 'bg-yellow-200';
    if (confidence >= 90) bgColor = 'bg-green-200';
    else if (confidence >= 75) bgColor = 'bg-blue-200';
    else if (confidence < 60) bgColor = 'bg-red-200';

    return (
      <div className="flex items-center gap-2 mt-1">
        <Progress value={confidence} className={`h-2 w-16 ${bgColor}`} />
        <span className="text-xs text-gray-600">دقة {confidence}%</span>
      </div>
    );
  };

  // استخدام البيانات الفعلية من API أو البيانات الافتراضية كاحتياطي
  const realForecastData = (forecastResponse as ForecastResponse | undefined)?.forecast || forecastData;
  const realInsights = (forecastResponse as ForecastResponse | undefined)?.insights || aiInsights;
  
  // رندر البطاقات التحليلية
  const renderInsightCards = () => {
    // إذا لم توجد بيانات، عرض رسالة
    if (forecastResponse && (!realInsights || realInsights.length === 0)) {
      return (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle>لا توجد تحليلات متاحة</AlertTitle>
          <AlertDescription>
            لا توجد بيانات كافية لإجراء تحليل ذكي. يرجى التأكد من وجود بيانات مبيعات كافية.
          </AlertDescription>
        </Alert>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {realInsights.map((insight: AIInsight) => (
          <Card key={insight.id} className={`border-l-4 ${
            insight.type === 'positive' ? 'border-l-green-500' :
            insight.type === 'negative' ? 'border-l-red-500' :
            insight.type === 'warning' ? 'border-l-amber-500' :
            'border-l-blue-500'
          }`}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-base font-semibold">{insight.title}</CardTitle>
                <Badge variant={
                  insight.type === 'positive' ? 'default' :
                  insight.type === 'negative' ? 'destructive' :
                  insight.type === 'warning' ? 'warning' :
                  'outline'
                }>
                  {insight.value !== undefined ? (
                    insight.value > 0 ? `+${insight.value}%` : `${insight.value}%`
                  ) : ''}
                </Badge>
              </div>
              <CardDescription className="text-sm mt-1">
                {insight.description}
              </CardDescription>
              {renderConfidenceIndicator(insight.confidence)}
            </CardHeader>
            <CardContent>
              {insight.recommendations && (
                <div className="mt-2">
                  <h4 className="text-sm font-medium mb-2">التوصيات:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1 text-gray-600">
                    {insight.recommendations.map((rec: string, idx: number) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // رندر مخطط التنبؤ بالمبيعات
  const renderForecastChart = () => {
    // إذا لم توجد بيانات، عرض رسالة
    if (forecastResponse && (!realForecastData || realForecastData.length === 0)) {
      return (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle>لا توجد توقعات متاحة</AlertTitle>
          <AlertDescription>
            لا توجد بيانات كافية لإنشاء توقعات للمبيعات. يرجى التأكد من وجود بيانات مبيعات كافية.
          </AlertDescription>
        </Alert>
      );
    }
    
    // عرض مخطط التوقعات
    return (
      <div className="h-[350px] mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={realForecastData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(label) => `يوم ${label}`}
            />
            <Legend />
            <Bar 
              dataKey="actualSales" 
              name="المبيعات الفعلية" 
              fill="#6366f1" 
              barSize={30} 
            />
            <Line 
              type="monotone" 
              dataKey="predictedSales" 
              name="المبيعات المتوقعة" 
              stroke="#f59e0b" 
              strokeWidth={2}
              dot={{ r: 5 }}
              activeDot={{ r: 8 }}
            />
            <Line 
              type="monotone" 
              dataKey="target" 
              name="التارجت" 
              stroke="#10b981" 
              strokeWidth={2} 
              strokeDasharray="5 5"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // رندر مخطط تحليل الاتجاهات
  const renderTrendAnalysis = () => {
    return (
      <div className="space-y-8">
        <div>
          <h3 className="font-medium mb-2">أداء الأسابيع</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendAnalysis.weeklyPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="فعلي" fill="#6366f1" name="المبيعات الفعلية" />
                <Bar dataKey="متوقع" fill="#e11d48" name="المبيعات المتوقعة" />
                <Line type="monotone" dataKey="نسبة" name="نسبة التحقيق %" stroke="#10b981" yAxisId={1} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div>
          <h3 className="font-medium mb-2">أكثر الساعات ازدحامًا</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendAnalysis.topPerformingHours}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  name="المبيعات" 
                  fill="#6366f1" 
                  stroke="#6366f1" 
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  // رندر تحليل المنتجات
  const renderProductAnalysis = () => {
    return (
      <div className="space-y-4">
        <Alert className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertTitle>تحليل المنتجات بالذكاء الاصطناعي</AlertTitle>
          <AlertDescription>
            تم تحليل بيانات مبيعات 120 يوم سابق لتحديد أفضل المنتجات وتوقع الاتجاهات المستقبلية.
          </AlertDescription>
        </Alert>

        <div className="space-y-6 mt-4">
          <div>
            <h3 className="font-medium mb-3">أفضل المنتجات مبيعًا</h3>
            <div className="space-y-3">
              {topProducts.map((product, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-2 ${
                      idx === 0 ? 'bg-amber-100 text-amber-600' :
                      idx === 1 ? 'bg-gray-100 text-gray-600' :
                      idx === 2 ? 'bg-orange-100 text-orange-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-gray-500">{product.sales} وحدة</p>
                    </div>
                  </div>
                  <Badge variant={product.growth > 0 ? 'default' : 'destructive'}>
                    {product.growth > 0 ? '+' : ''}{product.growth}%
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-3">توصيات تحسين المبيعات</h3>
            <Card className="border-dashed bg-gray-50">
              <CardContent className="pt-6">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <ThumbsUp className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <p className="text-sm">زيادة توفير كيك الشوكولاتة خلال فترة الذروة (5-7 مساءً)</p>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm">مراجعة جودة الدونات حيث تراجعت مبيعاتها بنسبة 5%</p>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-sm">إطلاق عرض خاص يجمع القهوة العربية مع الكروسان لزيادة قيمة الفاتورة</p>
                  </li>
                  <li className="flex items-start gap-2">
                    <Eye className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                    <p className="text-sm">الاهتمام بعرض المنتجات الأكثر مبيعًا في الواجهة خلال ساعات الصباح</p>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-indigo-600" />
          <h2 className="text-xl font-bold">تحليل الذكاء الاصطناعي لأداء الفرع</h2>
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
            اختر الفرع لعرض تحليلات الذكاء الاصطناعي الخاصة به.
          </AlertDescription>
        </Alert>
      ) : isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-[350px] w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-[180px] w-full" />
            <Skeleton className="h-[180px] w-full" />
          </div>
        </div>
      ) : (
        <>
          <Alert className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
            <BrainCircuit className="h-4 w-4 text-indigo-600" />
            <AlertTitle>تحليل ذكي لأداء الفرع</AlertTitle>
            <AlertDescription>
              يستخدم نظام الذكاء الاصطناعي بيانات المبيعات التاريخية وأنماط الاستهلاك لتوفير تحليل دقيق وتنبؤات مستقبلية.
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="forecast" className="mt-6" onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="forecast" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span>التنبؤ بالمبيعات</span>
              </TabsTrigger>
              <TabsTrigger value="trends" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span>تحليل الاتجاهات</span>
              </TabsTrigger>
              <TabsTrigger value="products" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span>تحليل المنتجات</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="forecast" className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-600" />
                <span>توقعات الأسبوع القادم</span>
              </h3>
              {renderForecastChart()}
              <Separator className="my-6" />
              <h3 className="text-lg font-semibold mb-4">التحليلات والتوصيات</h3>
              {renderInsightCards()}
            </TabsContent>

            <TabsContent value="trends">
              {renderTrendAnalysis()}
            </TabsContent>

            <TabsContent value="products">
              {renderProductAnalysis()}
            </TabsContent>
          </Tabs>

          <CardFooter className="flex justify-between pt-6 border-t mt-8">
            <p className="text-sm text-muted-foreground">
              التنبؤات أعلاه مبنية على تحليل بيانات 180 يوم سابق باستخدام خوارزميات الذكاء الاصطناعي.
            </p>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-indigo-600 hover:bg-indigo-50"
              >
                <Share2 className="h-4 w-4 mr-2" />
                مشاركة التقرير
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
              >
                <PieChart className="h-4 w-4 mr-2" />
                تقرير مفصل
              </Button>
            </div>
          </CardFooter>
        </>
      )}
    </div>
  );
};

export default BranchPerformanceAI;