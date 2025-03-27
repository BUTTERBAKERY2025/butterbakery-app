import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Bell, 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  User,
  AreaChart,
  ScanFace,
  UserCheck,
  Target
} from 'lucide-react';

// نوع بيانات التنبيه الذكي
interface SmartAlert {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'success' | 'error';
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  source: 'system' | 'sales' | 'targets' | 'cashier' | 'ai';
  isRead: boolean;
  relatedTo?: {
    type: 'branch' | 'cashier' | 'target';
    id: number;
    name: string;
  };
  action?: {
    type: 'view' | 'fix' | 'approve';
    label: string;
    url?: string;
  };
}

// واجهة الخصائص المستلمة
interface AlertsSystemProps {
  userId?: number;
  branchId?: number;
  onMarkAsRead?: (alertId: string) => void;
  onActionClick?: (alertId: string, actionType: string) => void;
}

// رموز متعددة للعرض في الواجهة
const PRIORITY_COLORS = {
  critical: 'text-red-500 border-red-200',
  high: 'text-orange-500 border-orange-200',
  medium: 'text-amber-500 border-amber-200',
  low: 'text-blue-500 border-blue-200'
};

const ALERT_ICONS = {
  warning: <AlertTriangle className="h-4 w-4 text-orange-500" />,
  info: <AlertCircle className="h-4 w-4 text-blue-500" />,
  success: <CheckCircle className="h-4 w-4 text-green-500" />,
  error: <AlertCircle className="h-4 w-4 text-red-500" />
};

const SOURCE_ICONS = {
  system: <ScanFace className="h-4 w-4" />,
  sales: <AreaChart className="h-4 w-4" />,
  targets: <Target className="h-4 w-4" />,
  cashier: <UserCheck className="h-4 w-4" />,
  ai: <AlertCircle className="h-4 w-4" />
};

// تعريف واجهة المرجع
export interface AlertsSystemRef {
  refetch: () => void;
}

const AlertsSystem = forwardRef<AlertsSystemRef, AlertsSystemProps>((props, ref) => {
  const { 
    userId, 
    branchId,
    onMarkAsRead,
    onActionClick
  } = props;
  const [activeTab, setActiveTab] = useState('all');
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);

  // استعلام للحصول على التنبيهات
  const { 
    data: alertsData, 
    isLoading, 
    error,
    refetch
  } = useQuery<SmartAlert[]>({
    queryKey: [`/api/smart-alerts${userId ? `?userId=${userId}` : ''}${branchId ? `&branchId=${branchId}` : ''}`],
    enabled: true,
  });

  // إتاحة الوصول إلى دالة refetch من خلال المرجع
  useImperativeHandle(ref, () => ({
    refetch
  }));

  useEffect(() => {
    if (alertsData) {
      setAlerts(alertsData);
    }
  }, [alertsData]);

  // تصفية التنبيهات حسب التبويب النشط
  const filteredAlerts = () => {
    if (activeTab === 'all') return alerts;
    if (activeTab === 'unread') return alerts.filter(alert => !alert.isRead);
    return alerts.filter(alert => alert.type === activeTab);
  };

  // معالجة تحديث حالة "مقروء"
  const handleMarkAsRead = (alertId: string) => {
    // تحديث الحالة محليًا
    setAlerts(prevAlerts => 
      prevAlerts.map(alert => 
        alert.id === alertId ? { ...alert, isRead: true } : alert
      )
    );
    
    // استدعاء دالة callback إذا كانت موجودة
    if (onMarkAsRead) {
      onMarkAsRead(alertId);
    }
  };

  // معالجة النقر على الإجراء
  const handleActionClick = (alertId: string, actionType: string) => {
    if (onActionClick) {
      onActionClick(alertId, actionType);
    }
  };

  // تصنيف التنبيهات حسب التاريخ
  const groupAlertsByDate = (alerts: SmartAlert[]) => {
    const grouped: Record<string, SmartAlert[]> = {};
    
    alerts.forEach(alert => {
      const date = new Date(alert.timestamp).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(alert);
    });
    
    return Object.entries(grouped)
      .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
      .map(([date, alerts]) => ({
        date,
        alerts
      }));
  };

  // عرض كارت التنبيه
  const renderAlertCard = (alert: SmartAlert) => {
    return (
      <Card 
        key={alert.id} 
        className={`mb-3 border-r-4 ${
          alert.priority === 'critical' ? 'border-r-red-500' :
          alert.priority === 'high' ? 'border-r-orange-500' :
          alert.priority === 'medium' ? 'border-r-amber-500' :
          'border-r-blue-500'
        } ${!alert.isRead ? 'bg-gray-50' : ''}`}
      >
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              {ALERT_ICONS[alert.type]}
              <div>
                <CardTitle className="text-base">{alert.title}</CardTitle>
                <CardDescription className="text-xs">
                  {format(new Date(alert.timestamp), 'dd/MM/yyyy HH:mm')}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={PRIORITY_COLORS[alert.priority]}>
                {alert.priority === 'critical' ? 'حرج' :
                 alert.priority === 'high' ? 'عالي' :
                 alert.priority === 'medium' ? 'متوسط' : 'منخفض'}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                {SOURCE_ICONS[alert.source]}
                <span>
                  {alert.source === 'system' ? 'النظام' :
                   alert.source === 'sales' ? 'المبيعات' :
                   alert.source === 'targets' ? 'التارجت' :
                   alert.source === 'cashier' ? 'الكاشير' : 'الذكاء الاصطناعي'}
                </span>
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700">{alert.message}</p>
          
          {alert.relatedTo && (
            <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
              <span>متعلق بـ: </span>
              <Badge variant="secondary" className="text-xs">
                {alert.relatedTo.type === 'branch' ? 'فرع' :
                 alert.relatedTo.type === 'cashier' ? 'كاشير' : 'تارجت'}
                : {alert.relatedTo.name}
              </Badge>
            </div>
          )}
        </CardContent>
        
        {(alert.action || !alert.isRead) && (
          <CardFooter className="pt-0 flex justify-end gap-2">
            {!alert.isRead && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleMarkAsRead(alert.id)}
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                تم الاطلاع
              </Button>
            )}
            
            {alert.action && (
              <Button 
                variant="default" 
                size="sm"
                onClick={() => handleActionClick(alert.id, alert.action?.type || '')}
              >
                {alert.action.type === 'view' ? <AlertCircle className="h-3.5 w-3.5 mr-1" /> :
                 alert.action.type === 'fix' ? <AlertTriangle className="h-3.5 w-3.5 mr-1" /> :
                 <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                {alert.action.label}
              </Button>
            )}
          </CardFooter>
        )}
      </Card>
    );
  };

  // عرض مجموعة تنبيهات بحسب التاريخ
  const renderAlertGroup = (date: string, alerts: SmartAlert[]) => {
    // تنسيق تاريخ اليوم
    const today = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toDateString();
    
    // تحديد عنوان المجموعة
    let groupTitle = '';
    if (date === today) {
      groupTitle = 'اليوم';
    } else if (date === yesterdayString) {
      groupTitle = 'أمس';
    } else {
      groupTitle = format(new Date(date), 'dd/MM/yyyy');
    }
    
    return (
      <div key={date} className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-600">{groupTitle}</h3>
          <Badge>{alerts.length}</Badge>
        </div>
        
        {alerts.map(alert => renderAlertCard(alert))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[100px] w-full" />
        <Skeleton className="h-[100px] w-full" />
        <Skeleton className="h-[100px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>خطأ في تحميل التنبيهات</AlertTitle>
        <AlertDescription>
          حدث خطأ أثناء محاولة تحميل التنبيهات. يرجى المحاولة مرة أخرى.
        </AlertDescription>
      </Alert>
    );
  }

  // إذا لم تكن هناك تنبيهات
  if (!alerts || alerts.length === 0) {
    return (
      <Alert className="bg-blue-50 border-blue-200">
        <Bell className="h-4 w-4 text-blue-500" />
        <AlertTitle>لا توجد تنبيهات</AlertTitle>
        <AlertDescription>
          ليس لديك أي تنبيهات في الوقت الحالي. سنخطرك عندما تظهر أي تحديثات.
        </AlertDescription>
      </Alert>
    );
  }

  // عدد التنبيهات غير المقروءة
  const unreadCount = alerts.filter(alert => !alert.isRead).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-indigo-600" />
          <h2 className="text-xl font-bold">التنبيهات الذكية</h2>
          {unreadCount > 0 && (
            <Badge className="bg-red-500">{unreadCount} جديد</Badge>
          )}
        </div>
        
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <Bell className="h-4 w-4 mr-2" />
          تحديث
        </Button>
      </div>
      
      <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 mb-4">
          <TabsTrigger value="all" className="flex gap-1">
            <Bell className="h-4 w-4" />
            <span>الكل{' '}</span>
            <Badge variant="secondary" className="mr-1">
              {alerts.length}
            </Badge>
          </TabsTrigger>
          
          <TabsTrigger value="unread" className="flex gap-1">
            <AlertCircle className="h-4 w-4" />
            <span>غير مقروء{' '}</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="mr-1">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger value="warning" className="flex gap-1">
            <AlertTriangle className="h-4 w-4" />
            <span>تحذير</span>
          </TabsTrigger>
          
          <TabsTrigger value="error" className="flex gap-1">
            <AlertCircle className="h-4 w-4" />
            <span>خطأ</span>
          </TabsTrigger>
          
          <TabsTrigger value="success" className="flex gap-1">
            <CheckCircle className="h-4 w-4" />
            <span>إنجاز</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab}>
          <div className="space-y-4">
            {groupAlertsByDate(filteredAlerts()).map(group => 
              renderAlertGroup(group.date, group.alerts)
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      <Separator className="my-4" />
      
      <div className="text-xs text-gray-500 flex items-center gap-1">
        <AlertCircle className="h-3.5 w-3.5" />
        <p>
          يعرض نظام التنبيهات الذكية إشعارات مخصصة بناءً على تحليل البيانات وأنماط العمل.
          يمكنك تخصيص إعدادات التنبيهات من صفحة الإعدادات.
        </p>
      </div>
    </div>
  );
});

export default AlertsSystem;