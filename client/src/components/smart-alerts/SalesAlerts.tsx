import React, { forwardRef, useImperativeHandle } from 'react';
import { TrendingDown, AlertCircle, BarChart, ChevronDown, ChevronUp, Target, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';

interface SalesAlert {
  id: string;
  branchId: number;
  branchName: string;
  date: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'sales_drop' | 'target_risk' | 'performance_issue';
  metric: {
    current: number;
    expected: number;
    difference: number;
    percentageChange: number;
  };
  recommendations: Array<{
    id: string;
    text: string;
    priority: 'low' | 'medium' | 'high';
    impact: number; // 0-100
  }>;
  details?: string;
}

interface SalesAlertsProps {
  branchId?: number;
  onRecommendationClick?: (alertId: string, recommendationId: string) => void;
}

// تعريف واجهة المرجع
export interface SalesAlertsRef {
  refetch: () => void;
}

const SalesAlerts = forwardRef<SalesAlertsRef, SalesAlertsProps>((props, ref) => {
  const { branchId, onRecommendationClick } = props;

  // استعلام للحصول على تنبيهات المبيعات
  const { 
    data: alerts = [], 
    isLoading, 
    error,
    refetch
  } = useQuery<SalesAlert[]>({
    queryKey: [`/api/smart-alerts/sales${branchId ? `?branchId=${branchId}` : ''}`],
    enabled: true,
  });

  // إتاحة الوصول إلى دالة refetch من خلال المرجع
  useImperativeHandle(ref, () => ({
    refetch
  }));

  // تصفية التنبيهات حسب الفرع إذا كان محددًا (مع أن الواجهة الخلفية ستقوم بالفعل بتصفية البيانات)
  const filteredAlerts = alerts;

  // إظهار حالة التحميل
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart className="h-5 w-5 text-indigo-600" />
          <h2 className="text-xl font-bold">تنبيهات المبيعات</h2>
        </div>
        <Skeleton className="h-[150px] w-full" />
        <Skeleton className="h-[150px] w-full" />
      </div>
    );
  }

  // إظهار حالة الخطأ
  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BarChart className="h-5 w-5 text-indigo-600" />
            <h2 className="text-xl font-bold">تنبيهات المبيعات</h2>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            إعادة المحاولة
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>خطأ في تحميل تنبيهات المبيعات</AlertTitle>
          <AlertDescription>
            حدث خطأ أثناء محاولة تحميل تنبيهات المبيعات. يرجى المحاولة مرة أخرى.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // إذا لم تكن هناك تنبيهات
  if (filteredAlerts.length === 0) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <Activity className="h-4 w-4 text-green-500" />
        <AlertTitle>لا توجد مشكلات في المبيعات</AlertTitle>
        <AlertDescription>
          المبيعات تسير وفقًا للتوقعات ولا توجد انحرافات تتطلب انتباهك حاليًا.
        </AlertDescription>
      </Alert>
    );
  }

  // الحصول على أيقونة ولون مناسبين حسب نوع التنبيه
  const getAlertIconAndColor = (type: string, severity: string) => {
    let icon;
    let colorClass;
    
    switch (type) {
      case 'sales_drop':
        icon = <TrendingDown className="h-5 w-5" />;
        colorClass = severity === 'critical' || severity === 'high' 
          ? 'text-red-500' 
          : 'text-orange-500';
        break;
      case 'target_risk':
        icon = <Target className="h-5 w-5" />;
        colorClass = severity === 'critical' || severity === 'high' 
          ? 'text-red-500' 
          : 'text-amber-500';
        break;
      case 'performance_issue':
        icon = <Activity className="h-5 w-5" />;
        colorClass = severity === 'critical' || severity === 'high' 
          ? 'text-orange-500' 
          : 'text-amber-500';
        break;
      default:
        icon = <AlertCircle className="h-5 w-5" />;
        colorClass = 'text-gray-500';
    }
    
    return { 
      icon: React.cloneElement(icon as React.ReactElement, { className: `h-5 w-5 ${colorClass}` }),
      colorClass
    };
  };

  // ترجمة نوع التنبيه إلى العربية
  const getAlertTypeTranslation = (type: string) => {
    switch (type) {
      case 'sales_drop':
        return 'انخفاض المبيعات';
      case 'target_risk':
        return 'خطر عدم تحقيق التارجت';
      case 'performance_issue':
        return 'مشكلة في الأداء';
      default:
        return 'تنبيه';
    }
  };

  // ترجمة شدة التنبيه إلى العربية وتحديد لونه
  const getSeverityInfo = (severity: string) => {
    let label;
    let color;
    
    switch (severity) {
      case 'critical':
        label = 'حرج';
        color = 'bg-red-100 text-red-800';
        break;
      case 'high':
        label = 'عالي';
        color = 'bg-orange-100 text-orange-800';
        break;
      case 'medium':
        label = 'متوسط';
        color = 'bg-amber-100 text-amber-800';
        break;
      case 'low':
      default:
        label = 'منخفض';
        color = 'bg-blue-100 text-blue-800';
    }
    
    return { label, color };
  };

  // معالجة النقر على توصية
  const handleRecommendationClick = (alertId: string, recommendationId: string) => {
    if (onRecommendationClick) {
      onRecommendationClick(alertId, recommendationId);
    } else {
      console.log(`تم النقر على التوصية: ${recommendationId} للتنبيه: ${alertId}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <BarChart className="h-5 w-5 text-indigo-600" />
        <h2 className="text-xl font-bold">تنبيهات المبيعات</h2>
        <Badge className="bg-red-500">{filteredAlerts.length}</Badge>
      </div>

      {filteredAlerts.map(alert => {
        const { icon, colorClass } = getAlertIconAndColor(alert.type, alert.severity);
        const severityInfo = getSeverityInfo(alert.severity);
        
        return (
          <Card key={alert.id} className="mb-4 overflow-hidden border-r-4 border-r-red-500">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {icon}
                  <div>
                    <CardTitle className="text-base">
                      {getAlertTypeTranslation(alert.type)} - {alert.branchName}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {new Date(alert.date).toLocaleDateString('ar-SA')}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className={severityInfo.color}>
                  {severityInfo.label}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent>
              <p className="text-sm text-gray-700 mb-3">
                {alert.details}
              </p>
              
              <div className="flex justify-between items-center mb-1 text-sm">
                <span>الحالي: {formatCurrency(alert.metric.current)}</span>
                <span>المتوقع: {formatCurrency(alert.metric.expected)}</span>
              </div>
              
              <div className="mb-3">
                <Progress 
                  value={(alert.metric.current / alert.metric.expected) * 100} 
                  className="h-2" 
                  indicatorClassName={alert.metric.percentageChange < -20 ? "bg-red-500" : "bg-amber-500"}
                />
              </div>
              
              <div className="flex items-center gap-1 text-sm">
                <span>الاختلاف:</span>
                <span className={alert.metric.percentageChange < 0 ? "text-red-600" : "text-green-600"}>
                  {alert.metric.percentageChange < 0 ? "" : "+"}
                  {alert.metric.percentageChange.toFixed(1)}%
                  {alert.metric.percentageChange < 0 
                    ? <ChevronDown className="h-4 w-4 inline" /> 
                    : <ChevronUp className="h-4 w-4 inline" />}
                </span>
                <span className="mx-1">({formatCurrency(alert.metric.difference)})</span>
              </div>
            </CardContent>
            
            <Separator />
            
            <CardFooter className="pt-3 pb-3 flex flex-col items-start">
              <h4 className="text-sm font-medium mb-2">التوصيات المقترحة:</h4>
              
              <Accordion type="single" collapsible className="w-full">
                {alert.recommendations.map(rec => {
                  const priorityColor = 
                    rec.priority === 'high' ? 'border-l-red-500' :
                    rec.priority === 'medium' ? 'border-l-orange-500' :
                    'border-l-blue-500';
                    
                  return (
                    <AccordionItem 
                      key={rec.id} 
                      value={rec.id}
                      className={`border-l-4 pl-2 mb-2 ${priorityColor}`}
                    >
                      <AccordionTrigger className="text-sm hover:no-underline py-2">
                        {rec.text}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="pt-2 pb-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-gray-500">تأثير متوقع:</span>
                            <span className="text-xs font-medium">
                              {rec.impact}%
                            </span>
                          </div>
                          <Progress value={rec.impact} className="h-1.5" />
                          <div className="mt-3">
                            <Button 
                              size="sm" 
                              className="w-full"
                              onClick={() => handleRecommendationClick(alert.id, rec.id)}
                            >
                              تطبيق التوصية
                            </Button>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
});

export default SalesAlerts;