import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import BranchSelector from '@/components/dashboard/BranchSelector';
import DailySalesForm from '@/components/forms/DailySalesForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';

export default function DailySales() {
  const { t, i18n } = useTranslation();
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('history');
  const { user } = useAuth();
  
  // Determine if user can create sales entries
  const canCreateSales = user?.role === 'cashier' || user?.role === 'admin' || user?.role === 'branch_manager';
  
  // Automatically select the user's branch if they are a cashier
  useEffect(() => {
    if (user?.role === 'cashier' && user?.branchId) {
      setSelectedBranchId(user.branchId);
    }
  }, [user]);
  
  // Fetch daily sales for the selected branch
  const { 
    data: salesData = [], 
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['/api/daily-sales', { branchId: selectedBranchId }],
    queryFn: async () => {
      // إذا لم يتم اختيار فرع بعد، نُعيد مصفوفة فارغة
      if (selectedBranchId === null) return [];
      
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // إضافة معلمة branchId=0 للدلالة على "كل الفروع"
      console.log('Adding branch filter to request:', selectedBranchId);
      const res = await fetch(`/api/daily-sales?branchId=${selectedBranchId}&date=${today}`);
      
      if (!res.ok) throw new Error('Failed to fetch daily sales');
      
      const data = await res.json();
      console.log('Received daily sales data:', data.length, 'records');
      return data;
    },
    // تمكين الاستعلام حتى عندما يكون selectedBranchId = 0 (كل الفروع)
    enabled: selectedBranchId !== null
  });
  
  // Format date - always use English locale to ensure English numerals and Gregorian calendar
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'PPP', {
      locale: enUS // Force English locale
    });
  };
  
  // Format time - always use English locale to ensure English numerals
  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'p', {
      locale: enUS // Force English locale
    });
  };
  
  // Format currency with English numerals
  const formatCurrency = (value: number) => {
    // Force English locale for currency formatting to ensure English numerals
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SAR',
      maximumFractionDigits: 0
    }).format(value);
  };
  
  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success bg-opacity-10 text-success">تمت الموافقة</Badge>;
      case 'rejected':
        return <Badge className="bg-danger bg-opacity-10 text-danger">مرفوض</Badge>;
      default:
        return <Badge className="bg-warning bg-opacity-10 text-warning">قيد الانتظار</Badge>;
    }
  };
  
  const handleRefresh = () => {
    refetch();
  };
  
  const handleFormSuccess = () => {
    refetch();
    setActiveTab('history');
  };

  return (
    <MainLayout title={t('dailySales.title')}>
      <BranchSelector
        selectedBranchId={selectedBranchId}
        onBranchChange={setSelectedBranchId}
        onRefresh={handleRefresh}
      />
      
      {selectedBranchId === null ? (
        <div className="bg-neutral-100 p-8 text-center rounded-lg mb-6">
          <h3 className="text-lg font-medium text-neutral-600">{t('dailySales.selectBranchPrompt')}</h3>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="history">{t('dailySales.history')}</TabsTrigger>
            {canCreateSales && (
              <TabsTrigger value="create">{t('dailySales.create')}</TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>{t('dailySales.todayEntries')}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[400px] w-full" />
                ) : salesData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('dailySales.cashier')}</TableHead>
                          <TableHead>{t('dailySales.shiftTime')}</TableHead>
                          <TableHead>{t('dailySales.cashSales')}</TableHead>
                          <TableHead>{t('dailySales.networkSales')}</TableHead>
                          <TableHead>{t('dailySales.totalSales')}</TableHead>
                          <TableHead>{t('dailySales.discrepancy')}</TableHead>
                          <TableHead>{t('dailySales.status')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesData.map((sale: any) => (
                          <TableRow key={sale.id}>
                            <TableCell className="font-medium">{sale.cashierName || t('dailySales.unknown')}</TableCell>
                            <TableCell>
                              {formatTime(sale.shiftStart)} - {sale.shiftEnd ? formatTime(sale.shiftEnd) : t('dailySales.ongoing')}
                            </TableCell>
                            <TableCell>{formatCurrency(sale.totalCashSales)}</TableCell>
                            <TableCell>{formatCurrency(sale.totalNetworkSales || 0)}</TableCell>
                            <TableCell className="font-bold">{formatCurrency(sale.totalSales)}</TableCell>
                            <TableCell className={sale.discrepancy < 0 ? 'text-danger' : sale.discrepancy > 0 ? 'text-success' : ''}>
                              {formatCurrency(sale.discrepancy || 0)}
                            </TableCell>
                            <TableCell>{getStatusBadge(sale.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-neutral-500">
                    <i className="fas fa-receipt text-3xl mb-2"></i>
                    <p>{t('dailySales.noEntries')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {canCreateSales && (
            <TabsContent value="create">
              <DailySalesForm
                branchId={selectedBranchId}
                onSuccess={handleFormSuccess}
              />
            </TabsContent>
          )}
        </Tabs>
      )}
    </MainLayout>
  );
}
