import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  BrainCircuit, 
  BrainCog, 
  BadgePlus, 
  ListFilter,
  BarChart3,
  Lightbulb,
  Bell,
  PieChart
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import BranchSelector from '@/components/dashboard/BranchSelector';
import BranchPerformanceAI from '@/components/ai-analytics/BranchPerformanceAI';
import CashierPerformanceAI from '@/components/ai-analytics/CashierPerformanceAI';
import SmartRecommendationsAI from '@/components/ai-analytics/SmartRecommendationsAI';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function AIAnalytics() {
  const { t } = useTranslation();
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [activeTab, setActiveTab] = useState('sales-forecast');

  // استخدام useQuery لتحميل البيانات المطلوبة للذكاء الاصطناعي
  const { data: branchesData, isLoading: isBranchesLoading } = useQuery({
    queryKey: ['/api/branches'],
    enabled: true,
  });

  const handleRefresh = () => {
    // إعادة تحميل البيانات (سيتم توسيع هذه الوظيفة لاحقًا)
    console.log('Refreshing AI analytics data');
  };

  return (
    <MainLayout title="تحليل الذكاء الاصطناعي">
      <div className="space-y-6">
        {/* بطاقة ترحيبية وشرح */}
        <Card className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-bold text-indigo-800 flex items-center gap-2">
                <BrainCog className="h-6 w-6 text-indigo-600" />
                {t('aiAnalytics.title')}
              </CardTitle>
              <Badge variant="outline" className="bg-indigo-100 text-indigo-800 hover:bg-indigo-200">
                {t('aiAnalytics.beta')}
              </Badge>
            </div>
            <CardDescription className="text-indigo-600">
              {t('aiAnalytics.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{t('aiAnalytics.intro')}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              <div className="flex gap-2 items-center bg-white/60 p-2 rounded-lg border border-indigo-100">
                <div className="bg-indigo-100 p-2 rounded-full">
                  <BarChart3 className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-indigo-900">{t('aiAnalytics.feature1.title')}</p>
                  <p className="text-gray-600">{t('aiAnalytics.feature1.description')}</p>
                </div>
              </div>
              <div className="flex gap-2 items-center bg-white/60 p-2 rounded-lg border border-indigo-100">
                <div className="bg-indigo-100 p-2 rounded-full">
                  <Lightbulb className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-indigo-900">{t('aiAnalytics.feature2.title')}</p>
                  <p className="text-gray-600">{t('aiAnalytics.feature2.description')}</p>
                </div>
              </div>
              <div className="flex gap-2 items-center bg-white/60 p-2 rounded-lg border border-indigo-100">
                <div className="bg-indigo-100 p-2 rounded-full">
                  <Bell className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-indigo-900">{t('aiAnalytics.feature3.title')}</p>
                  <p className="text-gray-600">{t('aiAnalytics.feature3.description')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* محدد الفرع والتاريخ */}
        <BranchSelector
          selectedBranchId={selectedBranchId}
          onBranchChange={setSelectedBranchId}
          filterOptions={{
            dateRange,
            onDateRangeChange: setDateRange,
          }}
          onRefresh={handleRefresh}
        />

        {/* لوحة تبويب التحليلات */}
        <Tabs 
          defaultValue="sales-forecast" 
          className="mt-6" 
          onValueChange={setActiveTab}
        >
          <TabsList className="grid grid-cols-1 sm:grid-cols-3 mb-4">
            <TabsTrigger value="sales-forecast" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span>{t('aiAnalytics.tabs.salesForecast')}</span>
            </TabsTrigger>
            <TabsTrigger value="performance-analysis" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              <span>{t('aiAnalytics.tabs.performanceAnalysis')}</span>
            </TabsTrigger>
            <TabsTrigger value="smart-recommendations" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              <span>{t('aiAnalytics.tabs.smartRecommendations')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sales-forecast">
            <BranchPerformanceAI 
              branchId={selectedBranchId} 
              dateRange={dateRange ? { from: dateRange.from as Date, to: dateRange.to as Date } : undefined}
              onRefresh={handleRefresh}
            />
          </TabsContent>

          <TabsContent value="performance-analysis">
            <CashierPerformanceAI 
              branchId={selectedBranchId} 
              dateRange={dateRange ? { from: dateRange.from as Date, to: dateRange.to as Date } : undefined}
              onRefresh={handleRefresh}
            />
          </TabsContent>

          <TabsContent value="smart-recommendations">
            <SmartRecommendationsAI 
              branchId={selectedBranchId} 
              dateRange={dateRange ? { from: dateRange.from as Date, to: dateRange.to as Date } : undefined}
              onRefresh={handleRefresh}
            />
          </TabsContent>
        </Tabs>

        {/* معلومات إضافية */}
        <div className="mt-8 text-sm text-gray-500 border-t pt-4">
          <p className="flex items-center gap-1">
            <BrainCircuit className="h-4 w-4 text-indigo-500" />
            <span>نظام الذكاء الاصطناعي يتحسن باستمرار مع المزيد من البيانات. دقة التنبؤات قد تختلف حسب حجم البيانات المتاحة.</span>
          </p>
        </div>
      </div>
    </MainLayout>
  );
}