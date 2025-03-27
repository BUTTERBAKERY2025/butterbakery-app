import React, { forwardRef, useImperativeHandle } from 'react';
import { UserX, AlertCircle, User, Clock, DollarSign, ReceiptText, UserCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatCurrency, getInitials } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';

interface CashierAlert {
  id: string;
  cashierId: number;
  cashierName: string;
  cashierAvatar?: string;
  branchId: number;
  branchName: string;
  date: string;
  type: 'attendance' | 'performance' | 'discrepancy' | 'training';
  severity: 'low' | 'medium' | 'high' | 'critical';
  metric?: {
    name: string;
    value: number;
    target: number;
    unit: string;
  };
  description: string;
  suggestion?: string;
  action?: {
    type: 'contact' | 'review' | 'train' | 'warning';
    label: string;
  };
}

interface CashierAlertsProps {
  branchId?: number;
  onActionClick?: (alertId: string, actionType: string, cashierId: number) => void;
}

// تعريف واجهة المرجع
export interface CashierAlertsRef {
  refetch: () => void;
}

const CashierAlerts = forwardRef<CashierAlertsRef, CashierAlertsProps>((props, ref) => {
  const { branchId, onActionClick } = props;

  // استعلام للحصول على تنبيهات الكاشيرين
  const { 
    data: alerts = [], 
    isLoading, 
    error,
    refetch
  } = useQuery<CashierAlert[]>({
    queryKey: [`/api/smart-alerts/cashiers${branchId ? `?branchId=${branchId}` : ''}`],
    enabled: true,
  });

  // إتاحة الوصول إلى دالة refetch من خلال المرجع
  useImperativeHandle(ref, () => ({
    refetch
  }));

  // تصفية التنبيهات حسب الفرع إذا كان محددًا
  const filteredAlerts = alerts;

  // إظهار حالة التحميل
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-indigo-600" />
          <h2 className="text-xl font-bold">تنبيهات الكاشيرين</h2>
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
            <User className="h-5 w-5 text-indigo-600" />
            <h2 className="text-xl font-bold">تنبيهات الكاشيرين</h2>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            إعادة المحاولة
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>خطأ في تحميل تنبيهات الكاشيرين</AlertTitle>
          <AlertDescription>
            حدث خطأ أثناء محاولة تحميل تنبيهات الكاشيرين. يرجى المحاولة مرة أخرى.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // إذا لم تكن هناك تنبيهات
  if (filteredAlerts.length === 0) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <UserCheck className="h-4 w-4 text-green-500" />
        <AlertTitle>لا توجد تنبيهات متعلقة بالكاشيرين</AlertTitle>
        <AlertDescription>
          أداء جميع الكاشيرين ضمن المعدلات المطلوبة، ولا توجد مشكلات تتطلب انتباهك حاليًا.
        </AlertDescription>
      </Alert>
    );
  }

  // الحصول على أيقونة ولون مناسبين حسب نوع التنبيه
  const getAlertIconAndColor = (type: string) => {
    let icon;
    let colorClass;
    
    switch (type) {
      case 'attendance':
        icon = <Clock className="h-5 w-5" />;
        colorClass = 'text-amber-500';
        break;
      case 'performance':
        icon = <ReceiptText className="h-5 w-5" />;
        colorClass = 'text-orange-500';
        break;
      case 'discrepancy':
        icon = <DollarSign className="h-5 w-5" />;
        colorClass = 'text-red-500';
        break;
      case 'training':
        icon = <UserX className="h-5 w-5" />;
        colorClass = 'text-blue-500';
        break;
      default:
        icon = <User className="h-5 w-5" />;
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
      case 'attendance':
        return 'مشكلة حضور';
      case 'performance':
        return 'أداء ضعيف';
      case 'discrepancy':
        return 'فرق نقدية';
      case 'training':
        return 'تدريب مطلوب';
      default:
        return 'تنبيه الكاشير';
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

  // معالجة النقر على إجراء
  const handleActionClick = (alertId: string, actionType: string, cashierId: number) => {
    if (onActionClick) {
      onActionClick(alertId, actionType, cashierId);
    } else {
      console.log(`تم النقر على الإجراء: ${actionType} للتنبيه: ${alertId}, للكاشير: ${cashierId}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <User className="h-5 w-5 text-indigo-600" />
        <h2 className="text-xl font-bold">تنبيهات الكاشيرين</h2>
        <Badge className="bg-red-500">{filteredAlerts.length}</Badge>
      </div>

      {filteredAlerts.map(alert => {
        const { icon, colorClass } = getAlertIconAndColor(alert.type);
        const severityInfo = getSeverityInfo(alert.severity);
        
        // تحديد لون الحدود حسب شدة التنبيه
        const borderColor = 
          alert.severity === 'critical' ? 'border-r-red-500' :
          alert.severity === 'high' ? 'border-r-orange-500' :
          alert.severity === 'medium' ? 'border-r-amber-500' : 
          'border-r-blue-500';
        
        return (
          <Card key={alert.id} className={`mb-4 overflow-hidden border-r-4 ${borderColor}`}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {icon}
                  <div>
                    <CardTitle className="text-base">
                      {getAlertTypeTranslation(alert.type)}
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
              <div className="flex items-center gap-3 mb-3">
                <Avatar>
                  <AvatarImage src={alert.cashierAvatar} />
                  <AvatarFallback>{getInitials(alert.cashierName)}</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="text-sm font-medium">{alert.cashierName}</h4>
                  <p className="text-xs text-gray-500">{alert.branchName}</p>
                </div>
              </div>
              
              <p className="text-sm text-gray-700 mb-3">
                {alert.description}
              </p>
              
              {alert.metric && (
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1 text-sm">
                    <span>{alert.metric.name}: {alert.metric.value} {alert.metric.unit}</span>
                    <span>الهدف: {alert.metric.target} {alert.metric.unit}</span>
                  </div>
                  
                  <Progress 
                    value={Math.min((alert.metric.value / alert.metric.target) * 100, 100)} 
                    className="h-2" 
                    indicatorClassName={
                      alert.type === 'discrepancy' ? 'bg-red-500' : 
                      (alert.metric.value > alert.metric.target ? 'bg-amber-500' : 'bg-green-500')
                    }
                  />
                </div>
              )}
              
              {alert.suggestion && (
                <Alert className="mt-3 py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {alert.suggestion}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            
            {alert.action && (
              <>
                <Separator />
                <CardFooter className="pt-3 pb-3 flex justify-end">
                  <Button 
                    variant={alert.severity === 'critical' ? 'destructive' : 'default'} 
                    size="sm"
                    onClick={() => handleActionClick(alert.id, alert.action?.type || '', alert.cashierId)}
                  >
                    {alert.action.label}
                  </Button>
                </CardFooter>
              </>
            )}
          </Card>
        );
      })}
    </div>
  );
});

export default CashierAlerts;