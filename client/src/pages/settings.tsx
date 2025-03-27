import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Settings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  
  // Only admin can access this page
  const isAdmin = user?.role === 'admin';
  
  if (!isAdmin) {
    return (
      <MainLayout title="إعدادات النظام">
        <div className="flex items-center justify-center h-full">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <div className="text-center py-8 text-neutral-500">
                <i className="fas fa-lock text-3xl mb-2"></i>
                <h3 className="text-xl font-bold text-danger mb-2">الوصول مرفوض</h3>
                <p>ليس لديك صلاحيات كافية للوصول إلى هذه الصفحة</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="إعدادات النظام">
      <Card>
        <CardHeader>
          <CardTitle>إعدادات النظام</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="general">عام</TabsTrigger>
              <TabsTrigger value="notifications">الإشعارات</TabsTrigger>
              <TabsTrigger value="backups">النسخ الاحتياطي</TabsTrigger>
              <TabsTrigger value="system">النظام</TabsTrigger>
            </TabsList>
            
            <TabsContent value="general">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">معلومات الشركة</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="companyName">اسم الشركة</Label>
                      <Input 
                        id="companyName"
                        defaultValue="شركة المخبوزات الفاخرة"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="taxNumber">الرقم الضريبي</Label>
                      <Input 
                        id="taxNumber"
                        defaultValue="30094587"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">البريد الإلكتروني</Label>
                      <Input 
                        id="email"
                        type="email"
                        defaultValue="info@butterbakery.sa"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">رقم الهاتف</Label>
                      <Input 
                        id="phone"
                        defaultValue="+966138759465"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-4">التفضيلات</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>الوضع الداكن</Label>
                        <p className="text-sm text-neutral-500">تفعيل الوضع الداكن في واجهة التطبيق</p>
                      </div>
                      <Switch defaultChecked={false} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>اللغة</Label>
                        <p className="text-sm text-neutral-500">اختر لغة واجهة المستخدم</p>
                      </div>
                      <Select defaultValue="ar">
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="اختر اللغة" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ar">العربية</SelectItem>
                          <SelectItem value="en">الإنجليزية</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button>حفظ الإعدادات</Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="notifications">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">إعدادات الإشعارات</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>إشعارات البريد الإلكتروني</Label>
                        <p className="text-sm text-neutral-500">استلام الإشعارات عبر البريد الإلكتروني</p>
                      </div>
                      <Switch defaultChecked={true} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>تنبيهات المبيعات اليومية</Label>
                        <p className="text-sm text-neutral-500">تلقي تنبيهات عند تسجيل المبيعات اليومية</p>
                      </div>
                      <Switch defaultChecked={true} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>تنبيهات تحقيق الأهداف</Label>
                        <p className="text-sm text-neutral-500">تلقي تنبيهات عند تحقيق أو تجاوز الأهداف الشهرية</p>
                      </div>
                      <Switch defaultChecked={true} />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button>حفظ إعدادات الإشعارات</Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="backups">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">إعدادات النسخ الاحتياطي</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="backupFrequency">تكرار النسخ الاحتياطي</Label>
                      <Select defaultValue="daily">
                        <SelectTrigger className="mt-1 w-full">
                          <SelectValue placeholder="اختر التكرار" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">يومي</SelectItem>
                          <SelectItem value="weekly">أسبوعي</SelectItem>
                          <SelectItem value="monthly">شهري</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="retentionPeriod">فترة الاحتفاظ</Label>
                      <Select defaultValue="30">
                        <SelectTrigger className="mt-1 w-full">
                          <SelectValue placeholder="اختر الفترة" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">7 أيام</SelectItem>
                          <SelectItem value="30">30 يوم</SelectItem>
                          <SelectItem value="90">90 يوم</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <Button variant="outline" className="mr-4">
                      <i className="fas fa-download ml-2"></i>
                      تنزيل نسخة احتياطية
                    </Button>
                    <Button>
                      <i className="fas fa-save ml-2"></i>
                      إنشاء نسخة احتياطية
                    </Button>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-4">النسخ الاحتياطية الأخيرة</h3>
                  <div className="space-y-4">
                    <div className="p-4 border rounded-md">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">نسخة احتياطية تلقائية - 2025-03-12</h4>
                          <p className="text-sm text-neutral-500">09:00 صباحاً • 24.5 ميجابايت</p>
                        </div>
                        <Button variant="ghost" size="icon">
                          <i className="fas fa-download"></i>
                        </Button>
                      </div>
                    </div>
                    <div className="p-4 border rounded-md">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">نسخة احتياطية تلقائية - 2025-03-11</h4>
                          <p className="text-sm text-neutral-500">09:00 صباحاً • 24.3 ميجابايت</p>
                        </div>
                        <Button variant="ghost" size="icon">
                          <i className="fas fa-download"></i>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="system">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">معلومات النظام</h3>
                  <div className="space-y-4">
                    <div>
                      <Label>الإصدار</Label>
                      <p className="text-sm font-medium">1.2.0</p>
                    </div>
                    <div>
                      <Label>آخر تحديث</Label>
                      <p className="text-sm font-medium">2025-03-01</p>
                    </div>
                    <div>
                      <Label>حجم قاعدة البيانات</Label>
                      <p className="text-sm font-medium">156.8 ميجابايت</p>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-4">الأداء</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <Label>استخدام قاعدة البيانات</Label>
                        <span className="text-sm font-medium">65%</span>
                      </div>
                      <Progress value={65} className="h-2" indicatorClassName="bg-blue-500" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <Label>استخدام التخزين</Label>
                        <span className="text-sm font-medium">42%</span>
                      </div>
                      <Progress value={42} className="h-2" indicatorClassName="bg-green-500" />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-4 text-danger">منطقة الخطر</h3>
                  <div className="space-y-4 border border-danger/20 rounded-md p-4 bg-danger/5">
                    <div>
                      <Label className="text-danger">إعادة تعيين النظام</Label>
                      <p className="text-sm text-neutral-600">هذا الإجراء سيؤدي إلى حذف جميع البيانات وإعادة النظام إلى حالته الأصلية. لا يمكن التراجع عن هذا الإجراء.</p>
                      <Button variant="destructive" className="mt-2">
                        <i className="fas fa-exclamation-triangle ml-2"></i>
                        إعادة تعيين النظام
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </MainLayout>
  );
}