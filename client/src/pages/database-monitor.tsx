import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Database, HardDrive, Table2, FileBarChart2, Cable } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getQueryFn } from "@/lib/queryClient";
import { formatNumber } from "@/lib/utils";

// تحديد نوع بيانات ملخص قاعدة البيانات
interface DatabaseSummary {
  databaseSize: string;
  databaseSizeBytes: number;
  tableCount: number;
  totalRows: number;
  activeConnections: number;
  status: string;
  timestamp: string;
}

// تحديد نوع بيانات تفاصيل الجداول
interface TableDetail {
  table_name: string;
  total_size: string;
  data_size: string;
  external_size: string;
  size_bytes: number;
}

// تحديد نوع بيانات صفوف الجداول
interface TableRowCount {
  table_name: string;
  row_count: number;
}

// تحديد نوع بيانات إحصائيات قاعدة البيانات
interface DatabaseStats {
  resources: {
    max_connections: string;
    shared_buffers: string;
    current_db_size: string;
  };
  connections: {
    active: number;
    max: string;
  };
  database_size: string;
}

// تحديد مكون عرض بطاقة تقنية
function StatCard({ 
  title, 
  value, 
  description, 
  icon, 
  className = "" 
}: { 
  title: string; 
  value: string | number; 
  description?: string; 
  icon: React.ReactNode; 
  className?: string; 
}) {
  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="h-4 w-4 text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

// تحديد مكون عرض جدول
function DataTable({ 
  title, 
  data, 
  columns 
}: { 
  title: string; 
  data: any[]; 
  columns: { key: string; label: string; format?: (value: any) => string | number }[] 
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>({data.length} سجل)</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b">
                {columns.map((col) => (
                  <th key={col.key} className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {data.map((row, i) => (
                <tr key={i} className="border-b">
                  {columns.map((col) => (
                    <td key={col.key} className="p-4 align-middle">
                      {col.format ? col.format(row[col.key]) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// تحديد مكون رئيسي لصفحة مراقبة قاعدة البيانات
export default function DatabaseMonitorPage() {
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);

  // استعلامات الحصول على بيانات قاعدة البيانات
  const { data: summaryData, isLoading: isSummaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['/api/database/summary'],
    queryFn: getQueryFn<DatabaseSummary>({ on401: "throw" }),
    refetchInterval: refreshInterval || false
  });

  const { data: tablesData, isLoading: isTablesLoading, refetch: refetchTables } = useQuery({
    queryKey: ['/api/database/tables/sizes'],
    queryFn: getQueryFn<TableDetail[]>({ on401: "throw" }),
    refetchInterval: refreshInterval || false
  });

  const { data: rowsData, isLoading: isRowsLoading, refetch: refetchRows } = useQuery({
    queryKey: ['/api/database/tables/rows'],
    queryFn: getQueryFn<TableRowCount[]>({ on401: "throw" }),
    refetchInterval: refreshInterval || false
  });

  const { data: statsData, isLoading: isStatsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['/api/database/stats'],
    queryFn: getQueryFn<DatabaseStats>({ on401: "throw" }),
    refetchInterval: refreshInterval || false
  });

  // تعريف أعمدة جدول حجم الجداول
  const tableSizeColumns = [
    { key: 'table_name', label: 'الجدول' },
    { key: 'total_size', label: 'الحجم الكلي' },
    { key: 'data_size', label: 'حجم البيانات' },
    { key: 'external_size', label: 'الحجم الخارجي' },
  ];

  // تعريف أعمدة جدول عدد الصفوف
  const rowCountColumns = [
    { key: 'table_name', label: 'الجدول' },
    { 
      key: 'row_count', 
      label: 'عدد الصفوف',
      format: (value: number) => formatNumber(value) 
    },
  ];

  // دالة لتحديث البيانات
  const refreshAllData = () => {
    refetchSummary();
    refetchTables();
    refetchRows();
    refetchStats();
  };

  // دالة لتبديل التحديث التلقائي
  const toggleAutoRefresh = () => {
    if (refreshInterval) {
      setRefreshInterval(null);
    } else {
      setRefreshInterval(10000); // تحديث كل 10 ثواني
    }
  };

  // حساب نسبة الاتصالات المستخدمة
  const connectionPercentage = statsData?.connections
    ? (statsData.connections.active / parseInt(statsData.connections.max || '0')) * 100 
    : 0;

  // عرض رسالة تحميل إذا كانت البيانات قيد التحميل
  if (isSummaryLoading || isTablesLoading || isRowsLoading || isStatsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="mr-2 text-lg">جاري تحميل إحصائيات قاعدة البيانات...</span>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">مراقبة قاعدة البيانات</h1>
          <p className="text-muted-foreground">تحليل وإدارة قاعدة بيانات التطبيق</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshAllData}>
            تحديث البيانات
          </Button>
          <Button 
            variant={refreshInterval ? "default" : "outline"} 
            onClick={toggleAutoRefresh}
          >
            {refreshInterval ? "إيقاف التحديث التلقائي" : "تفعيل التحديث التلقائي"}
          </Button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <Badge variant={summaryData?.status === "متصل" ? "outline" : "destructive"}>
          الحالة: {summaryData?.status || "غير معروف"}
        </Badge>
        <p className="text-xs text-muted-foreground">
          آخر تحديث: {summaryData?.timestamp ? new Date(summaryData.timestamp).toLocaleString() : "غير معروف"}
        </p>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard 
          title="حجم قاعدة البيانات" 
          value={summaryData?.databaseSize || "0 kB"} 
          icon={<Database className="h-4 w-4" />} 
        />
        <StatCard 
          title="عدد الجداول" 
          value={summaryData?.tableCount || 0} 
          icon={<Table2 className="h-4 w-4" />} 
        />
        <StatCard 
          title="إجمالي الصفوف" 
          value={formatNumber(summaryData?.totalRows || 0)} 
          icon={<FileBarChart2 className="h-4 w-4" />} 
        />
        <StatCard 
          title="الاتصالات النشطة" 
          value={`${statsData?.connections?.active || 0} / ${statsData?.connections?.max || 0}`}
          icon={<Cable className="h-4 w-4" />} 
        />
      </div>

      {/* مؤشر استخدام الاتصالات */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">نسبة استخدام الاتصالات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-1">
            <Progress value={connectionPercentage} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* علامات تبويب المعلومات التفصيلية */}
      <Tabs defaultValue="table-sizes" className="mb-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="table-sizes">حجم الجداول</TabsTrigger>
          <TabsTrigger value="table-rows">عدد الصفوف</TabsTrigger>
        </TabsList>
        <TabsContent value="table-sizes">
          <DataTable 
            title="حجم الجداول" 
            data={tablesData || []} 
            columns={tableSizeColumns} 
          />
        </TabsContent>
        <TabsContent value="table-rows">
          <DataTable 
            title="عدد الصفوف" 
            data={rowsData || []} 
            columns={rowCountColumns} 
          />
        </TabsContent>
      </Tabs>

      {/* تفاصيل إضافية */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>معلومات فنية</CardTitle>
          <CardDescription>تفاصيل فنية عن قاعدة البيانات وإعداداتها</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium">ذاكرة مشتركة</h4>
                <p className="text-lg font-bold">{statsData?.resources?.shared_buffers || "غير معروف"}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium">الحد الأقصى للاتصالات</h4>
                <p className="text-lg font-bold">{statsData?.resources?.max_connections || "غير معروف"}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium">إصدار PostgreSQL</h4>
                <p className="text-lg font-bold">14.9 (Neon)</p>
              </div>
              <div>
                <h4 className="text-sm font-medium">مزود قاعدة البيانات</h4>
                <p className="text-lg font-bold">Neon Serverless Postgres</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}