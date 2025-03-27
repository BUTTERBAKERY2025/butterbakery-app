import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { 
  AlertCircle, 
  BadgePercent,
  Clock,
  RefreshCw,
  Lightbulb,
  Award,
  AlertTriangle,
  Zap,
  TrendingUp,
  Coffee,
  Sun,
  DollarSign,
  Users,
  Calendar
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';

interface SmartRecommendationsProps {
  branchId: number | null;
  dateRange?: { from: Date; to: Date } | null;
  onRefresh?: () => void;
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  type: 'sales' | 'operations' | 'staffing' | 'inventory' | 'marketing';
  impact: number; // من 1 إلى 100
  effort: number; // من 1 إلى 100
  priority: number; // من 1 إلى 5
  expectedLift: number; // نسبة التحسن المتوقعة
  timeframe: 'immediate' | 'short-term' | 'mid-term' | 'long-term';
  actionItems: string[];
}

interface OpportunityArea {
  name: string;
  score: number;
  description: string;
  recommendations: string[];
}

interface RecommendationsResponse {
  branchInfo: {
    id: number;
    name: string;
  };
  analysisBasedOn: {
    dateRange: string;
    dataPoints: number;
    confidence: number;
  };
  recommendations: Recommendation[];
  opportunityAreas?: OpportunityArea[];
}

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

const TYPE_ICONS: Record<string, any> = {
  sales: <DollarSign className="h-4 w-4" />,
  operations: <Zap className="h-4 w-4" />,
  staffing: <Users className="h-4 w-4" />,
  inventory: <Coffee className="h-4 w-4" />,
  marketing: <BadgePercent className="h-4 w-4" />
};

const TIMEFRAME_LABELS: Record<string, string> = {
  immediate: 'فوري',
  'short-term': 'قصير المدى',
  'mid-term': 'متوسط المدى',
  'long-term': 'طويل المدى'
};

const SmartRecommendationsAI: React.FC<SmartRecommendationsProps> = ({ 
  branchId,
  dateRange,
  onRefresh
}) => {
  // استخدام useQuery للحصول على بيانات التوصيات الذكية
  const { 
    data: recommendationsData, 
    isLoading, 
    error,
    refetch
  } = useQuery<RecommendationsResponse>({
    queryKey: [`/api/ai-analytics/smart-recommendations/${branchId}`],
    enabled: branchId !== null, // تمكين الاستعلام إذا كان معرف الفرع محدد أو 0 (جميع الفروع)
  });

  // معالجة تحديث البيانات
  const handleRefresh = () => {
    if (branchId === null) return; // فقط تحقق من أن branchId ليس null (يمكن أن يكون 0 لجميع الفروع)
    refetch();
    if (onRefresh) onRefresh();
  };

  // عرض جدول التوصيات ذات الأولوية
  const renderPriorityRecommendations = () => {
    if (!recommendationsData || !recommendationsData.recommendations) {
      return (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle>لا توجد توصيات متاحة</AlertTitle>
          <AlertDescription>
            لا توجد بيانات كافية لتوليد توصيات ذكية. يرجى التأكد من وجود بيانات مبيعات كافية.
          </AlertDescription>
        </Alert>
      );
    }

    // ترتيب التوصيات حسب الأولوية (من الأعلى للأقل)
    const priorityRecs = [...recommendationsData.recommendations].sort((a, b) => 
      b.priority - a.priority || b.impact - a.impact
    );

    return (
      <div className="space-y-4">
        {priorityRecs.map((rec) => (
          <Card key={rec.id} className={`
            border-r-4
            ${rec.priority >= 5 ? 'border-r-red-500' : 
              rec.priority >= 4 ? 'border-r-orange-500' : 
              rec.priority >= 3 ? 'border-r-amber-500' : 
              rec.priority >= 2 ? 'border-r-blue-500' : 'border-r-green-500'}
          `}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className={`
                    p-2 rounded-full
                    ${rec.priority >= 4 ? 'bg-red-100 text-red-700' : 
                      rec.priority >= 3 ? 'bg-amber-100 text-amber-700' : 
                      'bg-indigo-100 text-indigo-700'}
                  `}>
                    {TYPE_ICONS[rec.type]}
                  </div>
                  <div>
                    <h3 className="font-medium">{rec.title}</h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                      <Badge variant="outline" className="text-xs">
                        {rec.type === 'sales' ? 'المبيعات' : 
                         rec.type === 'operations' ? 'العمليات' : 
                         rec.type === 'staffing' ? 'الموظفين' : 
                         rec.type === 'inventory' ? 'المخزون' : 'التسويق'}
                      </Badge>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {TIMEFRAME_LABELS[rec.timeframe]}
                      </span>
                    </div>
                  </div>
                </div>
                <Badge className={`
                  ${rec.priority >= 4 ? 'bg-red-500' : 
                    rec.priority >= 3 ? 'bg-amber-500' : 
                    rec.priority >= 2 ? 'bg-blue-500' : 'bg-green-500'}
                `}>
                  أولوية {rec.priority}/5
                </Badge>
              </div>
              
              <p className="text-gray-700 mb-4">{rec.description}</p>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">التأثير المتوقع</p>
                  <div className="flex items-center gap-2">
                    <Progress value={rec.impact} className="h-2" />
                    <span className="text-xs">{rec.impact}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">الجهد المطلوب</p>
                  <div className="flex items-center gap-2">
                    <Progress value={rec.effort} className={`h-2 ${rec.effort > 70 ? 'bg-red-200' : rec.effort > 40 ? 'bg-amber-200' : 'bg-green-200'}`} />
                    <span className="text-xs">{rec.effort}%</span>
                  </div>
                </div>
              </div>
              
              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">خطوات التنفيذ:</p>
                <ul className="text-sm space-y-1">
                  {rec.actionItems.map((action, idx) => (
                    <li key={idx} className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 bg-gray-700 rounded-full flex-shrink-0 mt-1.5"></span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // رندر مخطط فرص التحسين
  const renderOpportunityAreas = () => {
    if (!recommendationsData || !recommendationsData.opportunityAreas) {
      return null;
    }

    const data = recommendationsData.opportunityAreas;

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">مجالات الفرص</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.map((area, idx) => (
            <Card key={idx} className="bg-gradient-to-br from-white to-gray-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`
                    p-2 rounded-full
                    ${area.score > 80 ? 'bg-red-100 text-red-700' : 
                      area.score > 60 ? 'bg-amber-100 text-amber-700' : 
                      area.score > 40 ? 'bg-blue-100 text-blue-700' : 
                      'bg-green-100 text-green-700'}
                  `}>
                    {idx === 0 ? <TrendingUp className="h-5 w-5" /> : 
                     idx === 1 ? <Users className="h-5 w-5" /> : 
                     idx === 2 ? <Calendar className="h-5 w-5" /> : 
                     <Coffee className="h-5 w-5" />}
                  </div>
                  <div>
                    <h4 className="font-medium">{area.name}</h4>
                    <div className="flex items-center gap-1 mt-1">
                      <Progress 
                        value={area.score} 
                        className={`h-1.5 w-12 
                          ${area.score > 80 ? 'bg-red-500' : 
                            area.score > 60 ? 'bg-amber-500' : 
                            area.score > 40 ? 'bg-blue-500' : 'bg-green-500'}
                        `} 
                      />
                      <span className="text-xs text-gray-600">{area.score}%</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mb-3">{area.description}</p>
                {area.recommendations.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">الإجراءات المقترحة:</p>
                    <ul className="text-xs space-y-1">
                      {area.recommendations.slice(0, 2).map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <Lightbulb className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  // رندر مخطط تحليل الأولويات
  const renderPriorityAnalysis = () => {
    if (!recommendationsData || !recommendationsData.recommendations) {
      return null;
    }

    // تجميع التوصيات حسب النوع
    const typeCount: Record<string, number> = {
      sales: 0,
      operations: 0,
      staffing: 0,
      inventory: 0,
      marketing: 0
    };

    recommendationsData.recommendations.forEach(rec => {
      typeCount[rec.type]++;
    });

    const typeData = Object.entries(typeCount).map(([key, value]) => ({
      name: key === 'sales' ? 'المبيعات' : 
            key === 'operations' ? 'العمليات' : 
            key === 'staffing' ? 'الموظفين' : 
            key === 'inventory' ? 'المخزون' : 'التسويق',
      value
    })).filter(item => item.value > 0);

    // تجميع التوصيات حسب الإطار الزمني
    const timeframeCount: Record<string, number> = {
      immediate: 0,
      'short-term': 0,
      'mid-term': 0,
      'long-term': 0
    };

    recommendationsData.recommendations.forEach(rec => {
      timeframeCount[rec.timeframe]++;
    });

    const timeframeData = Object.entries(timeframeCount).map(([key, value]) => ({
      name: TIMEFRAME_LABELS[key],
      value
    })).filter(item => item.value > 0);

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">تحليل التوصيات</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-medium mb-2 text-center">توزيع التوصيات حسب النوع</h4>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} توصية`, 'العدد']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2 text-center">توزيع التوصيات حسب الإطار الزمني</h4>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeframeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value} توصية`, 'العدد']} />
                    <Bar dataKey="value" fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-600" />
          <h2 className="text-xl font-bold">التوصيات الذكية</h2>
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
            اختر الفرع لعرض التوصيات الذكية الخاصة به.
          </AlertDescription>
        </Alert>
      ) : isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-[200px] w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-[180px] w-full" />
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
            حدث خطأ أثناء تحميل التوصيات الذكية. يرجى المحاولة مرة أخرى.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Alert className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
            <Lightbulb className="h-4 w-4 text-amber-600" />
            <AlertTitle>توصيات ذكية لتحسين الأداء</AlertTitle>
            <AlertDescription>
              تم تحليل بيانات {recommendationsData?.analysisBasedOn?.dataPoints || 0} يوم بنسبة ثقة {recommendationsData?.analysisBasedOn?.confidence || 0}% لتقديم توصيات مخصصة.
            </AlertDescription>
          </Alert>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">التوصيات ذات الأولوية</h3>
              {renderPriorityRecommendations()}
            </div>

            <Separator />

            {renderOpportunityAreas()}

            <Separator />

            {renderPriorityAnalysis()}
          </div>

          <CardFooter className="flex justify-between pt-6 border-t mt-8">
            <p className="text-sm text-muted-foreground">
              التوصيات أعلاه مبنية على تحليل بيانات {recommendationsData?.analysisBasedOn?.dateRange || ''} باستخدام خوارزميات الذكاء الاصطناعي.
            </p>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-amber-600 hover:bg-amber-50"
              >
                <Award className="h-4 w-4 mr-2" />
                اقتراحات جديدة
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="border-amber-200 text-amber-600 hover:bg-amber-50"
              >
                <Zap className="h-4 w-4 mr-2" />
                تحليل متقدم
              </Button>
            </div>
          </CardFooter>
        </>
      )}
    </div>
  );
};

export default SmartRecommendationsAI;