import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Textarea } from '@/components/ui/textarea';
import { insertDailySalesSchema } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import SignatureCanvas from 'react-signature-canvas';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

// Define SignatureCanvas type to fix the TypeScript error
type SignatureCanvasRef = {
  clear: () => void;
  toDataURL: (type?: string, encoderOptions?: number) => string;
};

// Extend the schema with validation rules
const dailySalesFormSchema = insertDailySalesSchema.extend({
  // تعديل المخطط لاستخدام coerce مع الأرقام للتأكد من أن القيم المدخلة تُحوَّل إلى أرقام
  totalCashSales: z.coerce.number().min(0, 'المبلغ يجب أن يكون موجبًا'),
  totalNetworkSales: z.coerce.number().min(0, 'المبلغ يجب أن يكون موجبًا'),
  actualCashInRegister: z.coerce.number().min(0, 'المبلغ يجب أن يكون موجبًا').optional().nullable(),
  totalTransactions: z.coerce.number().int().min(1, 'يجب وجود معاملة واحدة على الأقل'),
  signature: z.string().min(1, 'التوقيع مطلوب').optional().nullable(),
  // إتاحة قيم شيفت الإنهاء كاختيارية
  shiftEnd: z.date().optional().nullable(),
});

type DailySalesFormValues = z.infer<typeof dailySalesFormSchema>;

interface DailySalesFormProps {
  branchId: number;
  onSuccess?: () => void;
}

export default function DailySalesForm({ branchId, onSuccess }: DailySalesFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [sigPad, setSigPad] = useState<SignatureCanvas | null>(null);
  const [shiftStartTime, setShiftStartTime] = useState<string>(format(new Date(), 'HH:mm'));
  const [shiftEndTime, setShiftEndTime] = useState<string>('');
  
  // Fetch branch information
  const { data: branchData } = useQuery({
    queryKey: ['/api/branches', branchId],
    queryFn: async () => {
      // برانش 0 يعني "جميع الفروع"، وهذا ليس فرعًا فعليًا يمكن استعلامه
      if (branchId === 0) return { id: 0, name: t('branchSelector.allBranches') };
      if (!branchId) return null;
      const res = await fetch(`/api/branches/${branchId}`);
      if (!res.ok) throw new Error('Failed to fetch branch details');
      return res.json();
    },
    // تمكين الاستعلام حتى عندما يكون branchId = 0 (جميع الفروع)
    enabled: branchId !== null
  });
  
  // Format current date for display - using Gregorian but in Arabic
  const today = (() => {
    const date = new Date();
    // Get Gregorian date parts
    const day = date.getDate();
    const year = date.getFullYear();
    const monthIndex = date.getMonth();
    
    // Arabic month names for Gregorian calendar
    const arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    // Arabic weekday names
    const arabicDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    
    return `${arabicDays[date.getDay()]}, ${day} ${arabicMonths[monthIndex]} ${year}`;
  })();
  
  useEffect(() => {
    // Set initial shift start time when component loads
    setShiftStartTime(format(new Date(), 'HH:mm'));
  }, []);
  
  const form = useForm<DailySalesFormValues>({
    resolver: zodResolver(dailySalesFormSchema),
    defaultValues: {
      branchId,
      cashierId: user?.id || 0,
      date: format(new Date(), 'yyyy-MM-dd'),
      shiftType: 'morning', // القيمة الافتراضية للشفت (صباحي)
      shiftStart: new Date(),
      shiftEnd: null,
      startingCash: 0, // نقدية بداية الشفت
      totalCashSales: 0,
      totalNetworkSales: 0,
      totalSales: 0,
      actualCashInRegister: 0,
      totalTransactions: 0,
      signature: '',
      notes: '',
      discrepancy: 0,
      averageTicket: 0,
    },
  });

  const { reset, watch, setValue } = form;
  
  // Watch for sales changes to calculate total
  const totalCashSales = watch('totalCashSales') || 0;
  const totalNetworkSales = watch('totalNetworkSales') || 0;
  const startingCash = watch('startingCash') || 0;
  
  // Calculate total sales from cash and network payments
  const totalSales = totalCashSales + totalNetworkSales;
  const actualCashInRegister = watch('actualCashInRegister') || 0;
  
  // حساب العجز = النقدية الفعلية - (المبيعات النقدية + نقدية بداية الشفت)
  const discrepancy = actualCashInRegister - (totalCashSales + startingCash);
  const totalTransactions = watch('totalTransactions') || 0;
  const averageTicket = totalTransactions > 0 ? totalSales / totalTransactions : 0;

  const handleClearSignature = () => {
    if (sigPad) {
      sigPad.clear();
      setValue('signature', '');
    }
  };

  const handleEndSignature = () => {
    if (sigPad) {
      const signatureData = sigPad.toDataURL();
      setValue('signature', signatureData);
    }
  };

  // Handler for updating the shift end time
  const handleEndShift = () => {
    const currentTime = format(new Date(), 'HH:mm');
    setShiftEndTime(currentTime);
    
    // Create a new Date object based on today and set the hours/minutes
    const [hours, minutes] = currentTime.split(':').map(Number);
    const endTime = new Date();
    endTime.setHours(hours, minutes, 0, 0);
    
    setValue('shiftEnd', endTime);
  };
  
  // Handler for updating the shift start time
  const handleUpdateShiftStart = (time: string) => {
    setShiftStartTime(time);
    
    // Create a new Date object based on today and set the hours/minutes
    const [hours, minutes] = time.split(':').map(Number);
    const startTime = new Date();
    startTime.setHours(hours, minutes, 0, 0);
    
    setValue('shiftStart', startTime);
  };
  
  // Submit handler with validations
  const onSubmit = async (data: DailySalesFormValues) => {
    try {
      // Ensure shift end is provided
      if (!shiftEndTime) {
        toast({
          title: t('dailySales.shiftEndRequired'),
          description: t('dailySales.pleaseEndShift'),
          variant: 'destructive',
        });
        return;
      }
      
      // تحضير البيانات للإرسال
      // Parse shift start time into a Date object and convert to ISO string
      const [startHours, startMinutes] = shiftStartTime.split(':').map(Number);
      const startTime = new Date();
      startTime.setHours(startHours, startMinutes, 0, 0);
      
      // Parse shift end time into a Date object and convert to ISO string
      const [endHours, endMinutes] = shiftEndTime.split(':').map(Number);
      const endTime = new Date();
      endTime.setHours(endHours, endMinutes, 0, 0);
      
      // Update derived fields
      data.totalSales = totalSales;
      data.discrepancy = discrepancy;
      data.averageTicket = averageTicket;
      data.shiftStart = startTime;
      data.shiftEnd = endTime;
      // حقل نوع الشفت موجود بالفعل (تم اختياره من القائمة المنسدلة)
      
      // إضافة التوقيع إذا لم يكن موجودًا
      if (!data.signature && sigPad) {
        data.signature = sigPad.toDataURL();
      }
      
      console.log("Submitting data:", data);
      const response = await fetch('/api/daily-sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: "include"
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error submitting daily sales:', errorData);
        throw new Error(errorData.message || 'فشل تسجيل بيانات المبيعات');
      }
      
      const responseData = await response.json();
      
      toast({
        title: t('dailySales.successTitle'),
        description: t('dailySales.successMessage'),
        variant: 'default',
      });
      
      // Reset form and signature
      reset();
      if (sigPad) sigPad.clear();
      setShiftEndTime('');
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/daily-sales'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
      if (onSuccess) onSuccess();
    } catch (error) {
      toast({
        title: t('dailySales.errorTitle'),
        description: t('dailySales.errorMessage'),
        variant: 'destructive',
      });
      console.error('Error submitting daily sales:', error);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{t('dailySales.formTitle')}</CardTitle>
            <CardDescription className="mt-2">
              {today}
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-md px-4 py-2 bg-primary/10">
            {user?.name ? user.name : "الكاشير"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* User and Branch Info */}
        <div className="bg-gray-100 p-4 mb-6 rounded-lg border border-gray-300 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <span className="text-sm text-gray-600 font-medium">{t('dailySales.cashier')}</span>
              <span className="font-bold text-gray-800">{user?.name ? user.name : "الكاشير"}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-gray-600 font-medium">{t('dailySales.branch')}</span>
              <span className="font-bold text-gray-800">{branchData?.name || t('dailySales.unknownBranch')}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-gray-600 font-medium">{t('dailySales.date')}</span>
              <span className="font-bold text-gray-800">{format(new Date(), 'yyyy-MM-dd')}</span>
            </div>
          </div>
        </div>
        
        {/* Shift Time Controls */}
        <div className="bg-green-50 p-4 mb-6 rounded-lg border border-green-200 shadow-sm">
          <h3 className="font-medium mb-3 flex items-center text-green-800">
            <i className="fas fa-clock ml-2 text-green-700"></i>
            {t('dailySales.shiftTimes')}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <div>
              <label className="block text-sm font-medium mb-1 text-green-900">{t('dailySales.shiftStart')}</label>
              <Input 
                type="time" 
                value={shiftStartTime}
                onChange={(e) => handleUpdateShiftStart(e.target.value)}
                className="border-green-200 bg-white text-green-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-green-900">{t('dailySales.shiftEnd')}</label>
              <div className="flex gap-2">
                <Input 
                  type="time" 
                  value={shiftEndTime}
                  onChange={(e) => setShiftEndTime(e.target.value)}
                  placeholder={t('dailySales.notEndedYet')}
                  className="border-green-200 bg-white text-green-900"
                />
                <Button 
                  type="button" 
                  variant="secondary"
                  onClick={handleEndShift}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  {t('dailySales.endNow')}
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Shift Type Selection */}
            <div className="bg-amber-50 p-4 rounded-md border border-amber-200 shadow-sm mb-6">
              <h3 className="font-medium mb-3 text-amber-800">نوع الشفت</h3>
              <FormField
                control={form.control}
                name="shiftType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-800">اختر نوع الشفت</FormLabel>
                    <FormControl>
                      <Select 
                        value={field.value} 
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="border-amber-200 bg-white text-gray-900">
                          <SelectValue placeholder="اختر نوع الشفت" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="morning">شفت صباحي</SelectItem>
                          <SelectItem value="evening">شفت مسائي</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription className="text-gray-700">
                      حدد ما إذا كان هذا شفت صباحي أو مسائي
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="space-y-6">
              {/* نقدية بداية الشفت */}
              <div className="bg-indigo-50 p-4 rounded-md border border-indigo-200 shadow-sm">
                <h3 className="font-medium mb-3 text-indigo-800">نقدية بداية الشفت</h3>
                <FormField
                  control={form.control}
                  name="startingCash"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-800">المبلغ الموجود في الخزينة عند بداية الوردية</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="0.00"
                          type="number"
                          step="0.01"
                          {...field}
                          value={field.value === null ? '' : field.value}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          className="text-lg bg-white border-indigo-200 text-gray-900"
                        />
                      </FormControl>
                      <FormDescription className="text-gray-700">
                        الرصيد النقدي الموجود في الخزينة عند استلام الكاشير للوردية
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* حقول المبيعات */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="totalCashSales"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-800">{t('dailySales.cashSales')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="0.00"
                          type="number"
                          step="0.01"
                          {...field}
                          value={field.value === null ? '' : field.value}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          className="bg-white border-gray-300 text-gray-900"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="totalNetworkSales"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-800">{t('dailySales.networkSales')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="0.00"
                          type="number"
                          step="0.01"
                          {...field}
                          value={field.value === null ? '' : field.value}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          className="bg-white border-gray-300 text-gray-900"
                        />
                      </FormControl>
                      <FormDescription className="text-gray-600">{t('dailySales.networkSalesDescription')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="actualCashInRegister"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-800">{t('dailySales.actualCashInRegister')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="0.00"
                          type="number"
                          step="0.01"
                          {...field}
                          value={field.value === null ? '' : field.value}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          className="bg-white border-gray-300 text-gray-900"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="totalTransactions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-800">{t('dailySales.totalTransactions')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="0"
                          type="number"
                          {...field}
                          value={field.value === null ? '' : field.value}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          className="bg-white border-gray-300 text-gray-900"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-100 p-4 rounded-md shadow-sm border border-gray-200">
              <div>
                <h4 className="font-semibold mb-2 text-gray-800">{t('dailySales.totalSales')}</h4>
                <div className="text-2xl font-bold text-blue-700">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(totalSales)}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2 text-gray-800">{t('dailySales.cashDiscrepancy')}</h4>
                <div className={`text-2xl font-bold ${discrepancy === 0 ? 'text-green-600' : discrepancy < 0 ? 'text-[#dc2626]' : 'text-amber-600'}`}>
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(discrepancy)}
                </div>
                {discrepancy < 0 && (
                  <div className="mt-2 text-sm font-semibold text-[#dc2626] bg-red-50 p-1 rounded border border-red-200">
                    * سيتم خصم العجز من الكاشير المسؤول عن الوردية
                  </div>
                )}
              </div>
              
              <div>
                <h4 className="font-semibold mb-2 text-gray-800">{t('dailySales.averageTicket')}</h4>
                <div className="text-2xl font-bold text-purple-700">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(averageTicket)}
                </div>
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-800">{t('dailySales.notes')}</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={t('dailySales.notesPlaceholder')}
                      value={field.value || ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      disabled={field.disabled}
                      name={field.name}
                      ref={field.ref}
                      className="bg-white border-gray-300 text-gray-900"
                    />
                  </FormControl>
                  <FormDescription className="text-gray-600">{t('dailySales.notesDescription')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="signature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-800">{t('dailySales.signature')}</FormLabel>
                  <FormControl>
                    <div>
                      <div className="border border-gray-300 rounded-md p-2 bg-white shadow-sm">
                        <SignatureCanvas
                          ref={(ref) => setSigPad(ref)}
                          canvasProps={{
                            className: 'w-full h-32 bg-white',
                          }}
                          onEnd={handleEndSignature}
                        />
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="mt-2 bg-white text-gray-700 border-gray-300 hover:bg-gray-100" 
                        onClick={handleClearSignature}
                      >
                        {t('dailySales.clearSignature')}
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription className="text-gray-600">{t('dailySales.signatureDescription')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end mt-4">
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 text-base font-medium shadow-sm"
              >
                {t('dailySales.submit')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
