import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { insertMonthlyTargetSchema, monthlyTargets } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { PopoverTrigger, PopoverContent, Popover } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

// Weekday names will be loaded from translations
const WEEKDAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

// Types
type WeekdayWeights = {
  [key: string]: number; // 0 = Sunday, 6 = Saturday
  0: number;
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
  6: number;
};

type SpecialDay = {
  date: Date | string;
  name: string;
  multiplier: number; // > 1 means higher sales, < 1 means lower sales
  type: 'holiday' | 'promotion' | 'event'; // Type of special day
};

type DailyTarget = {
  [key: string]: number; // YYYY-MM-DD: amount
};

// Create a new schema for the form
const targetFormSchema = z.object({
  branchId: z.union([z.number(), z.string().transform(v => parseInt(v))]),
  month: z.union([z.number(), z.string().transform(v => parseInt(v))]),
  year: z.union([z.number(), z.string().transform(v => parseInt(v))]),
  targetAmount: z.union([z.number(), z.string().transform(v => parseFloat(v))]).refine(val => val > 0, {
    message: "Target amount must be positive"
  }),
  distributionPattern: z.any().optional(),
  weekdayWeights: z.object({
    0: z.number().min(0).default(1.0), // Sunday
    1: z.number().min(0).default(0.8), // Monday
    2: z.number().min(0).default(0.8), // Tuesday
    3: z.number().min(0).default(0.9), // Wednesday
    4: z.number().min(0).default(1.0), // Thursday
    5: z.number().min(0).default(1.5), // Friday
    6: z.number().min(0).default(1.2), // Saturday
  }).default({
    0: 1.0, // Sunday
    1: 0.8, // Monday
    2: 0.8, // Tuesday
    3: 0.9, // Wednesday
    4: 1.0, // Thursday
    5: 1.5, // Friday
    6: 1.2, // Saturday
  }),
  specialDays: z.array(
    z.object({
      date: z.union([z.date(), z.string()]),
      name: z.string(),
      multiplier: z.union([z.number(), z.string().transform(v => parseFloat(v))]).refine(val => val >= 0, {
        message: "Multiplier must be non-negative"
      }),
      type: z.enum(['holiday', 'promotion', 'event'])
    })
  ).default([]),
  dailyTargets: z.record(z.string(), z.number()).default({})
});

type TargetFormValues = z.infer<typeof targetFormSchema>;

interface TargetFormProps {
  selectedBranchId?: number;
  onSuccess?: () => void;
}

export default function TargetForm({ selectedBranchId, onSuccess }: TargetFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('basic');
  const [dailyDistributionData, setDailyDistributionData] = useState<any[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  
  // Get current month and year
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const currentYear = currentDate.getFullYear();
  
  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ['/api/branches'],
    queryFn: async () => {
      const res = await fetch('/api/branches');
      if (!res.ok) throw new Error('Failed to fetch branches');
      return res.json();
    }
  });
  
  const form = useForm<TargetFormValues>({
    resolver: zodResolver(targetFormSchema),
    defaultValues: {
      branchId: selectedBranchId || 0,
      month: currentMonth,
      year: currentYear,
      targetAmount: 0,
      distributionPattern: null,
      weekdayWeights: {
        0: 1.0, // Sunday
        1: 0.8, // Monday
        2: 0.8, // Tuesday
        3: 0.9, // Wednesday
        4: 1.0, // Thursday
        5: 1.5, // Friday
        6: 1.2, // Saturday
      },
      specialDays: [],
      dailyTargets: {}
    },
  });
  
  // Watch form values for reactive updates
  const month = form.watch('month');
  const year = form.watch('year');
  const targetAmount = form.watch('targetAmount');
  const weekdayWeights = form.watch('weekdayWeights');
  const specialDays = form.watch('specialDays');

  // Generate month options
  const generateMonthOptions = () => {
    const months = [];
    
    // Add options for current month and next 11 months
    for (let i = 0; i < 12; i++) {
      let monthNum = currentMonth + i;
      let yearNum = currentYear;
      
      if (monthNum > 12) {
        monthNum -= 12;
        yearNum += 1;
      }
      
      months.push({ value: monthNum, label: getMonthName(monthNum), year: yearNum });
    }
    
    return months;
  };
  
  const getMonthName = (month: number) => {
    const date = new Date();
    date.setMonth(month - 1);
    // Always use Gregorian calendar, but show Arabic month names
    const englishMonth = date.toLocaleString('en-US', { month: 'long' });
    
    // Translation map for Arabic
    const arabicMonths = {
      'January': 'يناير',
      'February': 'فبراير',
      'March': 'مارس',
      'April': 'أبريل',
      'May': 'مايو',
      'June': 'يونيو',
      'July': 'يوليو',
      'August': 'أغسطس',
      'September': 'سبتمبر',
      'October': 'أكتوبر',
      'November': 'نوفمبر',
      'December': 'ديسمبر'
    };
    
    return arabicMonths[englishMonth as keyof typeof arabicMonths] || englishMonth;
  };

  // Generate days in month
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month, 0).getDate();
  };

  // Calculate daily target distribution
  const calculateDailyTargets = () => {
    if (!targetAmount || targetAmount <= 0) return {};
    
    const daysInMonth = getDaysInMonth(month, year);
    const dailyTargets: DailyTarget = {};
    let totalWeight = 0;
    
    // Calculate total weights for all days in the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const weekday = date.getDay(); // 0-6, where 0 is Sunday
      const dateString = format(date, 'yyyy-MM-dd');
      
      // Check if this is a special day
      const specialDay = specialDays.find(sd => {
        const sdDate = typeof sd.date === 'string' ? new Date(sd.date) : sd.date;
        return format(sdDate, 'yyyy-MM-dd') === dateString;
      });
      
      // Use special day multiplier or weekday weight
      const weekdayKey = weekday as unknown as keyof typeof weekdayWeights;
      const dayMultiplier = specialDay ? specialDay.multiplier : weekdayWeights[weekdayKey] || 1.0;
      totalWeight += dayMultiplier;
    }
    
    // Calculate individual daily targets
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const weekday = date.getDay(); // 0-6, where 0 is Sunday
      const dateString = format(date, 'yyyy-MM-dd');
      
      // Check if this is a special day
      const specialDay = specialDays.find(sd => {
        const sdDate = typeof sd.date === 'string' ? new Date(sd.date) : sd.date;
        return format(sdDate, 'yyyy-MM-dd') === dateString;
      });
      
      // Use special day multiplier or weekday weight
      const weekdayKey = weekday as unknown as keyof typeof weekdayWeights;
      const dayMultiplier = specialDay ? specialDay.multiplier : weekdayWeights[weekdayKey] || 1.0;
      
      // Calculate daily target
      dailyTargets[dateString] = (targetAmount * dayMultiplier) / totalWeight;
    }
    
    return dailyTargets;
  };

  // Update daily distribution preview
  useEffect(() => {
    if (targetAmount > 0) {
      const dailyTargets = calculateDailyTargets();
      form.setValue('dailyTargets', dailyTargets);
      
      // Create chart data
      const chartData = Object.entries(dailyTargets).map(([date, amount]) => {
        const dayDate = new Date(date);
        const dayOfMonth = dayDate.getDate();
        const weekday = dayDate.getDay();
        
        // Check if it's a special day
        const specialDay = specialDays.find(sd => {
          const sdDate = typeof sd.date === 'string' ? new Date(sd.date) : sd.date;
          return format(sdDate, 'yyyy-MM-dd') === date;
        });
        
        return {
          date: dayOfMonth,
          weekday: t(`targets.${WEEKDAY_KEYS[weekday]}`),
          target: amount,
          isSpecialDay: !!specialDay,
          specialDayName: specialDay?.name || '',
          specialDayType: specialDay?.type || ''
        };
      });
      
      setDailyDistributionData(chartData);
      setPreviewVisible(true);
    } else {
      setPreviewVisible(false);
    }
  }, [targetAmount, month, year, weekdayWeights, specialDays]);

  // Add a special day
  const addSpecialDay = (date: Date, name: string, multiplier: number, type: 'holiday' | 'promotion' | 'event') => {
    const updatedSpecialDays = [...specialDays, { date, name, multiplier, type }];
    form.setValue('specialDays', updatedSpecialDays);
  };

  // Remove a special day
  const removeSpecialDay = (index: number) => {
    const updatedSpecialDays = [...specialDays];
    updatedSpecialDays.splice(index, 1);
    form.setValue('specialDays', updatedSpecialDays);
  };

  // Handle form submission
  const onSubmit = async (data: TargetFormValues) => {
    // Calculate final daily targets
    const dailyTargets = calculateDailyTargets();
    
    // التأكد من صحة البيانات قبل الإرسال
    const formattedData = {
      branchId: Number(data.branchId),
      month: Number(data.month),
      year: Number(data.year),
      targetAmount: Number(data.targetAmount),
      // تحويل التواريخ في الأيام الخاصة إلى سلاسل نصية
      specialDays: data.specialDays.map(day => ({
        ...day,
        date: typeof day.date === 'string' ? day.date : format(day.date, 'yyyy-MM-dd'),
        multiplier: Number(day.multiplier)
      })),
      // تعيين الأهداف اليومية المحسوبة
      dailyTargets: dailyTargets,
      // تعيين أوزان أيام الأسبوع
      weekdayWeights: data.weekdayWeights,
      // قيمة distributionPattern افتراضية كائن فارغ
      distributionPattern: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('Formatted data before submission:', formattedData);
    
    try {
      await apiRequest('POST', '/api/monthly-targets', formattedData);
      
      toast({
        title: t('targets.successTitle'),
        description: t('targets.successMessage'),
      });
      
      // Reset form
      form.reset({
        branchId: selectedBranchId || 0,
        month: currentMonth,
        year: currentYear,
        targetAmount: 0,
        distributionPattern: null,
        weekdayWeights: {
          0: 1.0, // Sunday
          1: 0.8, // Monday
          2: 0.8, // Tuesday
          3: 0.9, // Wednesday
          4: 1.0, // Thursday
          5: 1.5, // Friday
          6: 1.2, // Saturday
        },
        specialDays: [],
        dailyTargets: {}
      });
      
      // Reset UI state
      setPreviewVisible(false);
      setActiveTab('basic');
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/monthly-targets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/target-achievement'] });
      
      if (onSuccess) onSuccess();
    } catch (error) {
      toast({
        title: t('targets.errorTitle'),
        description: t('targets.errorMessage'),
        variant: 'destructive',
      });
      console.error('Error submitting monthly target:', error);
    }
  };
  
  const monthOptions = generateMonthOptions();
  
  // Get days in selected month for chart preview
  const daysInSelectedMonth = useMemo(() => 
    getDaysInMonth(month, year), [month, year]);

  // Format for chart tooltip
  const formatTooltipValue = (value: number) => {
    return formatCurrency(value);
  };

  // Render day badge with special day indicator
  const renderDayBadge = (day: number) => {
    const date = new Date(year, month - 1, day);
    const dateString = format(date, 'yyyy-MM-dd');
    
    // Check if this is a special day
    const specialDay = specialDays.find(sd => {
      const sdDate = typeof sd.date === 'string' ? new Date(sd.date) : sd.date;
      return format(sdDate, 'yyyy-MM-dd') === dateString;
    });
    
    const weekday = date.getDay();
    const weekdayColor = weekday === 5 ? 'bg-blue-100 text-blue-600' : 
                        weekday === 6 ? 'bg-green-100 text-green-600' : 
                        'bg-gray-100 text-gray-600';
    
    if (specialDay) {
      let badgeColor = '';
      switch (specialDay.type) {
        case 'holiday':
          badgeColor = 'bg-red-100 text-red-600 border-red-200';
          break;
        case 'promotion':
          badgeColor = 'bg-purple-100 text-purple-600 border-purple-200';
          break;
        case 'event':
          badgeColor = 'bg-amber-100 text-amber-600 border-amber-200';
          break;
      }
      
      return (
        <Badge className={`${badgeColor} hover:bg-opacity-90 cursor-pointer`}>
          {day}
        </Badge>
      );
    }
    
    return (
      <Badge className={`${weekdayColor} hover:bg-opacity-90`}>
        {day}
      </Badge>
    );
  };

  // Monthly preview section
  const renderMonthlyPreview = () => {
    if (!previewVisible) return null;
    
    // Calculate monthly stats
    const dailyTargets = form.getValues('dailyTargets');
    const totalTarget = Object.values(dailyTargets).reduce((sum, amount) => sum + amount, 0);
    const avgDailyTarget = totalTarget / daysInSelectedMonth;
    const maxDailyTarget = Math.max(...Object.values(dailyTargets));
    const minDailyTarget = Math.min(...Object.values(dailyTargets));
    
    return (
      <div className="bg-white p-6 rounded-lg border shadow-sm mt-6">
        <h3 className="text-xl font-semibold mb-4">{t('targets.monthlyPreview')}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-md">
            <h4 className="text-sm text-blue-700">{t('targets.totalMonthlyTarget')}</h4>
            <p className="text-2xl font-bold">{formatCurrency(totalTarget)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-md">
            <h4 className="text-sm text-green-700">{t('targets.avgDailyTarget')}</h4>
            <p className="text-2xl font-bold">{formatCurrency(avgDailyTarget)}</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-md">
            <h4 className="text-sm text-amber-700">{t('targets.maxDailyTarget')}</h4>
            <p className="text-2xl font-bold">{formatCurrency(maxDailyTarget)}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-md">
            <h4 className="text-sm text-purple-700">{t('targets.minDailyTarget')}</h4>
            <p className="text-2xl font-bold">{formatCurrency(minDailyTarget)}</p>
          </div>
        </div>
        
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dailyDistributionData}
              margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                label={{ 
                  value: t('targets.dayOfMonth'), 
                  position: 'insideBottom', 
                  offset: -15 
                }} 
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value, false)}
                label={{ 
                  value: t('targets.dailyTargetAmount'), 
                  angle: -90, 
                  position: 'insideLeft' 
                }} 
              />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), t('targets.dailyTarget')]}
                labelFormatter={(label) => `${t('targets.day')} ${label}`}
              />
              <Legend />
              <Bar 
                dataKey="target" 
                name={t('targets.dailyTarget')}
                fill="#4f46e5" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-6">
          <h4 className="font-medium mb-2">{t('targets.specialDaysLegend')}</h4>
          <div className="flex flex-wrap gap-2">
            {specialDays.map((day, index) => {
              const date = typeof day.date === 'string' ? new Date(day.date) : day.date;
              const formattedDate = format(date, 'yyyy-MM-dd');
              
              let badgeColor = '';
              switch (day.type) {
                case 'holiday':
                  badgeColor = 'bg-red-100 text-red-600 border-red-200';
                  break;
                case 'promotion':
                  badgeColor = 'bg-purple-100 text-purple-600 border-purple-200';
                  break;
                case 'event':
                  badgeColor = 'bg-amber-100 text-amber-600 border-amber-200';
                  break;
              }
              
              return (
                <Badge 
                  key={index} 
                  className={`${badgeColor} cursor-pointer flex items-center`}
                  onClick={() => removeSpecialDay(index)}
                >
                  {day.name} ({formattedDate}) x{day.multiplier}
                  <span className="ml-1 text-xs">🗑️</span>
                </Badge>
              );
            })}
            {specialDays.length === 0 && (
              <span className="text-gray-500 text-sm">{t('targets.noSpecialDays')}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Special days form
  const [newSpecialDay, setNewSpecialDay] = useState<{
    date: Date;
    name: string;
    multiplier: number;
    type: 'holiday' | 'promotion' | 'event';
  }>({
    date: new Date(),
    name: '',
    multiplier: 1.5,
    type: 'holiday'
  });

  // Add new special day
  const handleAddSpecialDay = () => {
    if (newSpecialDay.name.trim() && newSpecialDay.multiplier > 0) {
      addSpecialDay(
        newSpecialDay.date,
        newSpecialDay.name,
        newSpecialDay.multiplier,
        newSpecialDay.type
      );
      
      // Reset form
      setNewSpecialDay({
        date: new Date(),
        name: '',
        multiplier: 1.5,
        type: 'holiday'
      });
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{t('targets.formTitle')}</CardTitle>
        <CardDescription>
          {t('targets.formDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="basic">{t('targets.basicInfo')}</TabsTrigger>
                <TabsTrigger value="distribution">{t('targets.distributionPattern')}</TabsTrigger>
                <TabsTrigger value="specialDays">{t('targets.specialDays')}</TabsTrigger>
                {previewVisible && (
                  <TabsTrigger value="preview">{t('targets.preview')}</TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="basic">
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="branchId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('targets.branch')}</FormLabel>
                        <Select
                          value={field.value.toString()}
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('targets.selectBranch')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {branches.map((branch: any) => (
                              <SelectItem key={branch.id} value={branch.id.toString()}>
                                {branch.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="month"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('targets.month')}</FormLabel>
                          <Select
                            value={field.value.toString()}
                            onValueChange={(value) => {
                              field.onChange(parseInt(value));
                              
                              // Update year based on the selected month
                              const selectedOption = monthOptions.find(m => m.value === parseInt(value));
                              if (selectedOption) {
                                form.setValue('year', selectedOption.year);
                              }
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('targets.selectMonth')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {monthOptions.map((month) => (
                                <SelectItem key={`${month.value}-${month.year}`} value={month.value.toString()}>
                                  {month.label} {month.year}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="targetAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('targets.targetAmount')}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="0.00"
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormDescription>
                            {t('targets.targetAmountDescription')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="bg-amber-50 p-4 rounded-md">
                    <h4 className="font-medium mb-2">{t('targets.monthDaysInfo')}</h4>
                    <p className="text-sm text-amber-800">
                      {t('targets.monthInfoDescription', { 
                        month: getMonthName(month), 
                        year, 
                        days: daysInSelectedMonth 
                      })}
                    </p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="distribution">
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-md mb-4">
                    <h4 className="font-medium mb-2">{t('targets.distributionPattern')}</h4>
                    <p className="text-sm text-blue-700 mb-2">
                      {t('targets.distributionPatternDescription')}
                    </p>
                    <p className="text-xs text-blue-600">
                      {t('targets.distributionNote')}
                    </p>
                  </div>
                  
                  <div className="space-y-6">
                    {WEEKDAY_KEYS.map((dayKey, index) => (
                      <FormField
                        key={index}
                        control={form.control}
                        name={`weekdayWeights.${index}` as any}
                        render={({ field }) => (
                          <FormItem>
                            <div className="grid grid-cols-12 gap-2 items-center">
                              <div className="col-span-3 md:col-span-2">
                                <FormLabel>
                                  {t(`targets.${dayKey}`)}
                                </FormLabel>
                              </div>
                              <div className="col-span-7 md:col-span-8">
                                <FormControl>
                                  <Slider
                                    value={[field.value]}
                                    min={0.5}
                                    max={2.5}
                                    step={0.1}
                                    onValueChange={(value) => field.onChange(value[0])}
                                  />
                                </FormControl>
                              </div>
                              <div className="col-span-2 text-right">
                                <Badge 
                                  className={
                                    field.value > 1.3 ? "bg-blue-100 text-blue-600" : 
                                    field.value < 0.8 ? "bg-red-100 text-red-600" : 
                                    "bg-gray-100 text-gray-600"
                                  }
                                >
                                  x{field.value.toFixed(1)}
                                </Badge>
                              </div>
                            </div>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  
                  <div className="bg-white p-4 rounded-md mt-4 border">
                    <h4 className="font-medium mb-2">{t('targets.weekdayExplanation')}</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><span className="font-medium">x1.0</span>: {t('targets.normalDay')}</li>
                      <li><span className="font-medium">x1.5</span>: {t('targets.highDay')}</li>
                      <li><span className="font-medium">x0.7</span>: {t('targets.lowDay')}</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="specialDays">
                <div className="space-y-6">
                  <div className="bg-purple-50 p-4 rounded-md mb-4">
                    <h4 className="font-medium mb-2">{t('targets.specialDaysTitle')}</h4>
                    <p className="text-sm text-purple-700">
                      {t('targets.specialDaysDescription')}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium">{t('targets.addSpecialDay')}</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-1 block">
                            {t('targets.specialDayDate')}
                          </label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left"
                              >
                                {format(newSpecialDay.date, 'yyyy-MM-dd')}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={newSpecialDay.date}
                                onSelect={(date) => date && setNewSpecialDay({...newSpecialDay, date})}
                                initialFocus
                                month={new Date(year, month - 1).getMonth()}
                                year={new Date(year, month - 1).getFullYear()}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium mb-1 block">
                            {t('targets.specialDayName')}
                          </label>
                          <Input
                            value={newSpecialDay.name}
                            onChange={(e) => setNewSpecialDay({...newSpecialDay, name: e.target.value})}
                            placeholder={t('targets.specialDayNamePlaceholder')}
                          />
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium mb-1 block">
                            {t('targets.specialDayType')}
                          </label>
                          <Select
                            value={newSpecialDay.type}
                            onValueChange={(value: 'holiday' | 'promotion' | 'event') => 
                              setNewSpecialDay({...newSpecialDay, type: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('targets.selectSpecialDayType')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="holiday">{t('targets.holiday')}</SelectItem>
                              <SelectItem value="promotion">{t('targets.promotion')}</SelectItem>
                              <SelectItem value="event">{t('targets.event')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium mb-1 block">
                            {t('targets.multiplier')}
                          </label>
                          <div className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-9">
                              <Slider
                                value={[newSpecialDay.multiplier]}
                                min={0.5}
                                max={3.0}
                                step={0.1}
                                onValueChange={(value) => 
                                  setNewSpecialDay({...newSpecialDay, multiplier: value[0]})}
                              />
                            </div>
                            <div className="col-span-3 text-right">
                              <Badge 
                                className={
                                  newSpecialDay.multiplier > 1.5 ? "bg-blue-100 text-blue-600" : 
                                  newSpecialDay.multiplier < 0.8 ? "bg-red-100 text-red-600" : 
                                  "bg-green-100 text-green-600"
                                }
                              >
                                x{newSpecialDay.multiplier.toFixed(1)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <Button 
                          type="button"
                          onClick={handleAddSpecialDay}
                          disabled={!newSpecialDay.name.trim() || newSpecialDay.multiplier <= 0}
                        >
                          {t('targets.addSpecialDay')}
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-4">{t('targets.currentSpecialDays')}</h4>
                      
                      {specialDays.length > 0 ? (
                        <div className="space-y-3">
                          {specialDays.map((day, index) => {
                            const date = typeof day.date === 'string' ? new Date(day.date) : day.date;
                            const formattedDate = format(date, 'yyyy-MM-dd');
                            
                            let badgeColor = '';
                            let badgeIcon = '';
                            
                            switch (day.type) {
                              case 'holiday':
                                badgeColor = 'bg-red-50 border-red-200 text-red-700';
                                badgeIcon = '🎉';
                                break;
                              case 'promotion':
                                badgeColor = 'bg-purple-50 border-purple-200 text-purple-700';
                                badgeIcon = '🏷️';
                                break;
                              case 'event':
                                badgeColor = 'bg-amber-50 border-amber-200 text-amber-700';
                                badgeIcon = '📅';
                                break;
                            }
                            
                            return (
                              <div 
                                key={index} 
                                className={`p-3 rounded-md border flex justify-between items-center ${badgeColor}`}
                              >
                                <div>
                                  <div className="font-medium flex items-center">
                                    <span className="mr-1">{badgeIcon}</span>
                                    {day.name}
                                  </div>
                                  <div className="text-sm">{formattedDate}</div>
                                  <div className="text-xs mt-1">
                                    {t('targets.multiplierValue', { value: day.multiplier.toFixed(1) })}
                                  </div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => removeSpecialDay(index)}
                                >
                                  ✖️
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 border rounded-md text-gray-500">
                          <div className="text-3xl mb-2">📅</div>
                          <p>{t('targets.noSpecialDaysAdded')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              {previewVisible && (
                <TabsContent value="preview">
                  {renderMonthlyPreview()}
                </TabsContent>
              )}
            </Tabs>
            
            <Separator />
            
            <div className="flex justify-between">
              {activeTab !== 'basic' && (
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    const tabs = ['basic', 'distribution', 'specialDays', 'preview'];
                    const currentIndex = tabs.indexOf(activeTab);
                    if (currentIndex > 0) {
                      setActiveTab(tabs[currentIndex - 1]);
                    }
                  }}
                >
                  {t('targets.previous')}
                </Button>
              )}
              
              <div className="flex gap-2">
                {activeTab !== (previewVisible ? 'preview' : 'specialDays') && (
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      const tabs = ['basic', 'distribution', 'specialDays', 'preview'];
                      const currentIndex = tabs.indexOf(activeTab);
                      const maxIndex = previewVisible ? 3 : 2;
                      if (currentIndex < maxIndex) {
                        setActiveTab(tabs[currentIndex + 1]);
                      }
                    }}
                  >
                    {t('targets.next')}
                  </Button>
                )}
                
                <Button type="submit">
                  {t('targets.submit')}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
