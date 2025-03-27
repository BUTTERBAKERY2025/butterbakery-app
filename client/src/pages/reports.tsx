import React, { useState, useCallback } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import BranchSelector from '@/components/dashboard/BranchSelector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { DateRange } from 'react-day-picker';
import SalesReportContent from '@/components/reports/SalesReportContent';
import TargetsReportContent from '@/components/reports/TargetsReportContent';
import CashierReportContent from '@/components/reports/CashierReportContent';
import ComparativeReportContent from '@/components/reports/ComparativeReportContent';
import ConsolidatedDailySalesJournal from '@/components/reports/ConsolidatedDailySalesJournal';
import DailySalesDetailedReport from '@/components/reports/DailySalesDetailedReport';
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, FileText, PieChart, RefreshCcw, TrendingUp, Printer, FileSpreadsheet, CalendarDays } from "lucide-react";

export default function Reports() {
  const { t } = useTranslation();
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('sales');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setDate(new Date().getDate() - 7)),
    to: new Date()
  });
  
  // معالجة تغيير الفرع
  const handleBranchChange = (branchId: number) => {
    setSelectedBranchId(branchId);
  };
  
  // معالجة التحديث
  const handleRefresh = () => {
    // تحديث جميع أقسام التقارير
  };
  
  // معالجة تغيير نطاق التاريخ
  const handleDateRangeChange = (range: DateRange | null) => {
    if (range) {
      setDateRange(range);
    }
  };
  
  // معالجة تغيير تبويب التقارير
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  
  // معالج تحديث التقارير مع محسن الأداء
  const handleRefreshWithFeedback = useCallback(() => {
    handleRefresh();
    // التعليق هنا لمنع إعادة تحميل التقارير
  }, []);

  return (
    <MainLayout title={t('reports.title')}>
      {/* بطاقة ترحيبية ودليل سريع */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-bold text-blue-800">
              {t('reports.analyticsAndReports')}
            </CardTitle>
            <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
              {new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">استخدم أدوات التصدير المتاحة لتحميل التقارير بالتنسيق المناسب لك. يمكنك تصفية البيانات حسب الفرع والتاريخ.</p>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" size="sm" className="text-green-600 border-green-200 bg-green-50 hover:bg-green-100 hover:text-green-700">
              <FileSpreadsheet className="h-4 w-4 mr-1" />
              Excel
            </Button>
            <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:text-blue-700">
              <FileText className="h-4 w-4 mr-1" />
              PDF
            </Button>
            <Button variant="outline" size="sm" className="text-purple-600 border-purple-200 bg-purple-50 hover:bg-purple-100 hover:text-purple-700">
              <Printer className="h-4 w-4 mr-1" />
              طباعة
            </Button>
            <Button variant="outline" size="sm" className="mr-auto text-gray-600 border-gray-200 hover:bg-gray-100" onClick={handleRefreshWithFeedback}>
              <RefreshCcw className="h-4 w-4 mr-1" />
              تحديث
            </Button>
          </div>
        </CardContent>
      </Card>

      <BranchSelector
        selectedBranchId={selectedBranchId}
        onBranchChange={handleBranchChange}
        onRefresh={handleRefreshWithFeedback}
        filterOptions={{
          dateRange,
          onDateRangeChange: handleDateRangeChange
        }}
      />
      
      <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-4">
        <TabsList className="mb-6 bg-white p-1 border rounded-lg">
          <TabsTrigger value="sales" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <BarChart className="h-4 w-4 mr-1" />
            {t('reports.salesReports')}
          </TabsTrigger>
          <TabsTrigger value="daily_sales_detailed" className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700">
            <CalendarDays className="h-4 w-4 mr-1" />
            تقرير المبيعات اليومية المفصل
          </TabsTrigger>
          <TabsTrigger value="targets" className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700">
            <TrendingUp className="h-4 w-4 mr-1" />
            {t('reports.targetsReports')}
          </TabsTrigger>
          <TabsTrigger value="cashiers" className="data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700">
            <FileText className="h-4 w-4 mr-1" />
            {t('reports.cashierReports')}
          </TabsTrigger>
          <TabsTrigger value="comparisons" className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700">
            <PieChart className="h-4 w-4 mr-1" />
            {t('reports.comparativeReports')}
          </TabsTrigger>
          <TabsTrigger value="consolidated" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            يوميات المبيعات المجمعة
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="sales">
          <SalesReportContent 
            selectedBranchId={selectedBranchId}
            onRefresh={handleRefresh}
          />
        </TabsContent>

        <TabsContent value="daily_sales_detailed">
          <DailySalesDetailedReport 
            selectedBranchId={selectedBranchId}
            onRefresh={handleRefresh}
          />
        </TabsContent>
        
        <TabsContent value="targets">
          <TargetsReportContent 
            selectedBranchId={selectedBranchId}
            onRefresh={handleRefresh}
          />
        </TabsContent>
        
        <TabsContent value="cashiers">
          <CashierReportContent 
            selectedBranchId={selectedBranchId}
            onRefresh={handleRefresh}
          />
        </TabsContent>
        
        <TabsContent value="comparisons">
          <ComparativeReportContent 
            selectedBranchId={selectedBranchId}
            onRefresh={handleRefresh}
          />
        </TabsContent>
        
        <TabsContent value="consolidated">
          <ConsolidatedDailySalesJournal />
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
