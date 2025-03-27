import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FaPrint, FaFileDownload, FaLock, FaExchangeAlt, FaSync, FaSignature } from "react-icons/fa";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import BranchSelector from "../dashboard/BranchSelector";
import { DatePicker } from "@/components/ui/date-picker";
import { formatCurrency, formatDate, getProgressColor } from "@/lib/utils";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { ExportConfig, exportData } from "./ExportUtils";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// تحديد الأنواع المحتملة لحالة اليومية المجمعة
type ConsolidatedJournalStatus = 'pending' | 'approved' | 'rejected' | 'transferred' | 'closed' | 'open';

interface ConsolidatedSalesEntry {
  id: number;
  branchId: number;
  date: string;
  totalCashSales: number;
  totalNetworkSales: number;
  totalSales: number;
  totalTransactions: number;
  averageTicket: number;
  totalDiscrepancy: number;
  status: ConsolidatedJournalStatus;
  details?: any;
  createdBy: number;
  createdAt: string | Date;
  closedBy?: number | null;
  closedAt?: string | Date | null;
  branchName?: string;
  createdByName?: string;
  closedByName?: string;
}

// تحديد الأنواع المحتملة لحالة اليومية الفردية
type DailySalesJournalStatus = 'pending' | 'approved' | 'rejected' | 'transferred' | 'closed' | 'open';

interface DailySalesEntry {
  id: number;
  cashierId: number;
  cashierName: string;
  shiftType: string;
  totalCashSales: number;
  totalNetworkSales: number;
  totalSales: number;
  discrepancy: number;
  date: string;
  status: DailySalesJournalStatus;
  consolidatedId?: number | null;
  signature?: string | null; // إضافة حقل التوقيع للواجهة
}

export default function ConsolidatedDailySalesJournal() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState<any>({
    from: new Date(),
    to: new Date()
  });
  // Removida la variable de activeTab ya que no se usa por ahora
  const [loading, setLoading] = useState(false);
  const [consolidating, setConsolidating] = useState(false);
  const [closing, setClosing] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [consolidatedSales, setConsolidatedSales] = useState<ConsolidatedSalesEntry[]>([]);
  const [dailySales, setDailySales] = useState<DailySalesEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<ConsolidatedSalesEntry | null>(null);
  const [selectedEntrySales, setSelectedEntrySales] = useState<DailySalesEntry[]>([]);

  // استدعاء بيانات اليوميات المجمعة
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedBranchId) return;

      setLoading(true);
      try {
        const formattedDate = format(selectedDate, 'yyyy-MM-dd');
        
        // استدعاء اليوميات المجمعة - تصحيح مسار API
        console.log(`Fetching consolidated sales from API with branchId=${selectedBranchId}, date=${formattedDate}`);
        
        // استخدام fetch مباشرة بدلاً من apiRequest لتجنب أخطاء استدعاء API
        let consolidatedResponse = [];
        try {
          const consolidatedRes = await fetch(`/api/consolidated-sales?branchId=${selectedBranchId || 0}&date=${formattedDate}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include'
          });
          
          if (!consolidatedRes.ok) {
            throw new Error(`HTTP error! status: ${consolidatedRes.status}`);
          }
          
          consolidatedResponse = await consolidatedRes.json();
          console.log(`Received consolidated sales data: ${Array.isArray(consolidatedResponse) ? consolidatedResponse.length : 0} records`);
        } catch (error) {
          console.error("Error fetching consolidated sales data:", error);
          toast({
            title: "خطأ في استدعاء البيانات",
            description: "تعذر استدعاء بيانات اليوميات المجمعة.",
            variant: "destructive",
          });
          consolidatedResponse = [];
        }
        
        // استدعاء اليوميات الفردية
        let dailySalesResponse = [];
        try {
          const dailySalesRes = await fetch(`/api/daily-sales?branchId=${selectedBranchId}&date=${formattedDate}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include'
          });
          
          if (!dailySalesRes.ok) {
            throw new Error(`HTTP error! status: ${dailySalesRes.status}`);
          }
          
          dailySalesResponse = await dailySalesRes.json();
        } catch (error) {
          console.error("Error fetching daily sales data:", error);
          toast({
            title: "خطأ في استدعاء البيانات",
            description: "تعذر استدعاء بيانات اليوميات الفردية.",
            variant: "destructive",
          });
          dailySalesResponse = [];
        }
        
        setConsolidatedSales(consolidatedResponse);
        setDailySales(dailySalesResponse);
        
        // إذا كان هناك يومية مجمعة، اختر الأولى تلقائيًا
        if (consolidatedResponse.length > 0) {
          setSelectedEntry(consolidatedResponse[0]);
          
          // استدعاء تفاصيل اليوميات المرتبطة بهذه اليومية المجمعة
          await fetchAssociatedDailySales(consolidatedResponse[0].id);
        } else {
          setSelectedEntry(null);
          setSelectedEntrySales([]);
        }
      } catch (error) {
        console.error("Error fetching consolidated sales data:", error);
        toast({
          title: "خطأ في استدعاء البيانات",
          description: "حدث خطأ أثناء استدعاء بيانات اليوميات المجمعة.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [selectedBranchId, selectedDate]);
  
  // استدعاء اليوميات الفردية المرتبطة بيومية مجمعة محددة
  const fetchAssociatedDailySales = async (consolidatedId: number) => {
    try {
      // استخدام fetch مباشرة بدلاً من apiRequest
      const response = await fetch(`/api/daily-sales/consolidated/${consolidatedId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const salesData = await response.json();
      setSelectedEntrySales(salesData);
    } catch (error) {
      console.error("Error fetching associated daily sales:", error);
      toast({
        title: "خطأ في استدعاء البيانات",
        description: "تعذر استدعاء اليوميات المرتبطة بهذه اليومية المجمعة.",
        variant: "destructive",
      });
    }
  };
  
  // تجميع اليوميات الفردية
  const handleConsolidateSales = async () => {
    if (!selectedBranchId) {
      toast({
        title: "تنبيه",
        description: "الرجاء اختيار فرع أولاً.",
        variant: "destructive",
      });
      return;
    }
    
    setConsolidating(true);
    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      console.log(`Fetching daily sales from API with branchId=${selectedBranchId}, date=${formattedDate}`);
      
      // أولا تحقق من وجود يوميات فردية للتجميع
      const checkResponse = await fetch(`/api/daily-sales?branchId=${selectedBranchId}&date=${formattedDate}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (!checkResponse.ok) {
        throw new Error(`HTTP error when checking daily sales! status: ${checkResponse.status}`);
      }
      
      const dailySalesCheck = await checkResponse.json();
      
      // التحقق من وجود يوميات بحالة "معتمد" للتجميع
      const approvedSales = dailySalesCheck.filter((sale: any) => sale.status === "approved");
      
      if (approvedSales.length === 0) {
        toast({
          title: "لا توجد يوميات فردية معتمدة",
          description: "لا توجد يوميات فردية معتمدة لهذا الفرع والتاريخ. يجب أن تكون اليوميات معتمدة قبل التجميع.",
          variant: "destructive",
        });
        setConsolidating(false);
        return;
      }
      
      console.log(`Found ${approvedSales.length} approved daily sales for consolidation`);
      
      // استخدام fetch مباشرة بدلاً من apiRequest
      const response = await fetch('/api/consolidated-sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          branchId: selectedBranchId,
          date: formattedDate
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error consolidating sales:", errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const consolidatedResult = await response.json();
      console.log("Consolidation result:", consolidatedResult);
      
      // تحديث القائمة
      queryClient.invalidateQueries({ queryKey: ['/api/consolidated-sales'] });
      
      // اختيار اليومية المجمعة الجديدة
      setSelectedEntry(consolidatedResult);
      
      // استدعاء تفاصيل اليوميات المرتبطة بهذه اليومية المجمعة
      await fetchAssociatedDailySales(consolidatedResult.id);
      
      toast({
        title: "تم التجميع بنجاح",
        description: "تم تجميع اليوميات الفردية بنجاح.",
      });
      
      // إعادة استدعاء البيانات
      let consolidatedResponse = [];
      try {
        const consolidatedRes = await fetch(`/api/consolidated-sales?branchId=${selectedBranchId}&date=${formattedDate}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });
        
        if (!consolidatedRes.ok) {
          throw new Error(`HTTP error! status: ${consolidatedRes.status}`);
        }
        
        consolidatedResponse = await consolidatedRes.json();
      } catch (error) {
        console.error("Error refreshing consolidated sales:", error);
        consolidatedResponse = [];
      }
      
      let dailySalesResponse = [];
      try {
        const dailySalesRes = await fetch(`/api/daily-sales?branchId=${selectedBranchId}&date=${formattedDate}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });
        
        if (!dailySalesRes.ok) {
          throw new Error(`HTTP error! status: ${dailySalesRes.status}`);
        }
        
        dailySalesResponse = await dailySalesRes.json();
      } catch (error) {
        console.error("Error refreshing daily sales:", error);
        dailySalesResponse = [];
      }
      
      setConsolidatedSales(consolidatedResponse);
      setDailySales(dailySalesResponse);
      
    } catch (error) {
      console.error("Error consolidating sales:", error);
      toast({
        title: "خطأ في تجميع اليوميات",
        description: "حدث خطأ أثناء محاولة تجميع اليوميات الفردية.",
        variant: "destructive",
      });
    } finally {
      setConsolidating(false);
    }
  };
  
  // إغلاق اليومية المجمعة
  const handleCloseConsolidatedSales = async (id: number) => {
    if (!id) return;
    
    setClosing(true);
    try {
      // استخدام fetch مباشرة بدلاً من apiRequest
      const response = await fetch(`/api/consolidated-sales/${id}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const consolidatedResult = await response.json();
      
      // تحديث القائمة
      queryClient.invalidateQueries({ queryKey: ['/api/consolidated-sales'] });
      
      // تحديث اليومية المحددة
      setSelectedEntry(consolidatedResult);
      
      toast({
        title: "تم الإغلاق بنجاح",
        description: "تم إغلاق اليومية المجمعة بنجاح.",
      });
      
      // إعادة استدعاء البيانات
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      
      // استخدام fetch لإعادة الحصول على البيانات المحدثة
      try {
        const consolidatedRes = await fetch(`/api/consolidated-sales?branchId=${selectedBranchId}&date=${formattedDate}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });
        
        if (!consolidatedRes.ok) {
          throw new Error(`HTTP error! status: ${consolidatedRes.status}`);
        }
        
        const consolidatedResponse = await consolidatedRes.json();
        setConsolidatedSales(consolidatedResponse);
      } catch (error) {
        console.error("Error refreshing consolidated sales data:", error);
      }
      
    } catch (error) {
      console.error("Error closing consolidated sales:", error);
      toast({
        title: "خطأ في إغلاق اليومية",
        description: "حدث خطأ أثناء محاولة إغلاق اليومية المجمعة.",
        variant: "destructive",
      });
    } finally {
      setClosing(false);
    }
  };

  // ترحيل اليومية المجمعة إلى الحسابات
  const handleTransferConsolidatedSales = async (id: number) => {
    if (!id) return;
    
    setTransferring(true);
    try {
      // استخدام fetch مباشرة بدلاً من apiRequest
      const response = await fetch(`/api/consolidated-sales/${id}/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const consolidatedResult = await response.json();
      
      // تحديث القائمة
      queryClient.invalidateQueries({ queryKey: ['/api/consolidated-sales'] });
      
      // تحديث اليومية المحددة
      setSelectedEntry(consolidatedResult);
      
      toast({
        title: "تم الترحيل بنجاح",
        description: "تم ترحيل اليومية المجمعة إلى الحسابات بنجاح.",
      });
      
      // إعادة استدعاء البيانات
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      
      // استخدام fetch لإعادة الحصول على البيانات المحدثة
      try {
        const consolidatedRes = await fetch(`/api/consolidated-sales?branchId=${selectedBranchId}&date=${formattedDate}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });
        
        if (!consolidatedRes.ok) {
          throw new Error(`HTTP error! status: ${consolidatedRes.status}`);
        }
        
        const consolidatedResponse = await consolidatedRes.json();
        setConsolidatedSales(consolidatedResponse);
      } catch (error) {
        console.error("Error refreshing consolidated sales data:", error);
      }
      
    } catch (error) {
      console.error("Error transferring consolidated sales:", error);
      toast({
        title: "خطأ في ترحيل اليومية",
        description: "حدث خطأ أثناء محاولة ترحيل اليومية المجمعة إلى الحسابات.",
        variant: "destructive",
      });
    } finally {
      setTransferring(false);
    }
  };
  
  // تصدير اليوميات المجمعة
  const handleExportConsolidatedSales = () => {
    if (!selectedEntry) return;
    
    const formattedDate = format(new Date(selectedEntry.date), 'dd/MM/yyyy');
    
    // تحسين تكوين التصدير مع إعدادات أفضل وتوسيع العنوان
    const exportConfig: ExportConfig = {
      fileName: `يومية-مجمعة-${selectedEntry.branchName || 'الفرع'}-${formattedDate}`,
      title: `يومية مبيعات مجمعة - ${selectedEntry.branchName || 'الفرع'} - ${formattedDate}`,
      headers: [
        { key: 'cashierName', label: 'اسم الكاشير', width: 25 },
        { key: 'shiftType', label: 'الوردية', width: 15 },
        { key: 'totalCashSales', label: 'المبيعات النقدية', width: 20 },
        { key: 'totalNetworkSales', label: 'مبيعات الشبكة', width: 20 },
        { key: 'totalSales', label: 'إجمالي المبيعات', width: 20 },
        { key: 'discrepancy', label: 'فرق الصندوق', width: 18 },
        { key: 'status', label: 'الحالة', width: 15 },
        { key: 'signature', label: 'التوقيع', width: 15 },
      ],
      arabicEnabled: true,
      orientation: 'landscape',
      format: 'A4',
      footer: `تم إنشاء هذا التقرير بواسطة ${selectedEntry.createdByName || 'مستخدم النظام'} بتاريخ ${formatDate(new Date(selectedEntry.createdAt), 'long')}`,
    };

    // تجميع البيانات حسب نوع العجز لتسهيل فرزها وإبرازها في التقرير
    const sortedSales = [...selectedEntrySales].sort((a, b) => {
      // ترتيب العناصر: الكاشيرات ذوي العجز الكبير أولاً، ثم المتوازنين، ثم الزيادات
      if (a.discrepancy < 0 && b.discrepancy >= 0) return -1;
      if (a.discrepancy >= 0 && b.discrepancy < 0) return 1;
      if (a.discrepancy < 0 && b.discrepancy < 0) return b.discrepancy - a.discrepancy; // ترتيب تنازلي للعجز
      return a.cashierId - b.cashierId; // ترتيب تصاعدي برقم الكاشير للبقية
    });
    
    // تحسين معالجة البيانات للتصدير مع إضافة مؤشرات للعجز/الزيادة
    const data = sortedSales.map(sale => {
      // تحديد نوع الفرق (عجز/زيادة) ومقداره
      const hasDiscrepancy = sale.discrepancy !== 0;
      const isNegative = sale.discrepancy < 0;
      const discrepancyPrefix = isNegative ? "عجز: " : (sale.discrepancy > 0 ? "زيادة: " : "");
      
      // تنسيق المعلومات المالية بشكل أكثر وضوحاً ودقة
      return {
        id: sale.id,
        cashierId: sale.cashierId,
        cashierName: sale.cashierName,
        date: sale.date,
        consolidatedId: sale.consolidatedId,
        shiftType: sale.shiftType === 'morning' ? 'صباحية' : 'مسائية',
        status: getStatusLabel(sale.status),
        // تحسين عرض القيم المالية
        totalCashSales: formatCurrency(sale.totalCashSales, false),
        totalNetworkSales: formatCurrency(sale.totalNetworkSales, false),
        totalSales: formatCurrency(sale.totalSales, false),
        // إضافة بادئة توضح نوع الفرق (عجز/زيادة)
        discrepancy: hasDiscrepancy ? 
          `${discrepancyPrefix}${formatCurrency(Math.abs(sale.discrepancy), false)}` : 
          formatCurrency(0, false),
        signature: sale.signature || '', // إضافة حقل التوقيع إذا كان موجودًا
      };
    });
    
    // تحسين عرض صف المجاميع مع ميزة بصرية لتمييزه
    const totalDiscrepancy = selectedEntry.totalDiscrepancy || 0;
    const isNegativeTotal = totalDiscrepancy < 0;
    const discrepancyTotalPrefix = isNegativeTotal ? "إجمالي العجز: " : (totalDiscrepancy > 0 ? "إجمالي الزيادة: " : "");
    
    const summaryRow = {
      id: 0,
      cashierId: 0,
      cashierName: '** المجموع الكلي **',
      date: selectedEntry.date,
      consolidatedId: selectedEntry.id,
      shiftType: '',
      // ضمان تنسيق متناسق للأرقام المالية
      totalCashSales: formatCurrency(selectedEntry.totalCashSales, false),
      totalNetworkSales: formatCurrency(selectedEntry.totalNetworkSales, false),
      totalSales: formatCurrency(selectedEntry.totalSales, false),
      discrepancy: totalDiscrepancy !== 0 ? 
        `${discrepancyTotalPrefix}${formatCurrency(Math.abs(totalDiscrepancy), false)}` : 
        formatCurrency(0, false),
      signature: '', // لا يوجد توقيع لسطر المجاميع
      status: '',
    };
    
    // إضافة سطر المجاميع
    data.push(summaryRow);
    
    // تصدير البيانات بالتنسيق المحسن
    exportData(data, exportConfig, 'pdf');
  };
  
  // تنسيق حالة اليومية
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return t('consolidatedJournal.pending');
      case 'approved':
        return t('consolidatedJournal.approved');
      case 'rejected':
        return t('consolidatedJournal.rejected');
      case 'transferred':
        return t('consolidatedJournal.transferred');
      case 'closed':
        return t('consolidatedJournal.closed');
      case 'open':
        return t('consolidatedJournal.open');
      default:
        return status;
    }
  };
  
  // تنسيق لون حالة اليومية
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'transferred':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'open':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">{t('consolidatedJournal.title')}</h2>
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => {
              // إعادة استدعاء البيانات
              if (selectedBranchId) {
                const formattedDate = format(selectedDate, 'yyyy-MM-dd');
                
                setLoading(true);
                try {
                  const fetchConsolidatedSales = fetch(`/api/consolidated-sales?branchId=${selectedBranchId}&date=${formattedDate}`, {
                    method: 'GET',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    credentials: 'include'
                  }).then(res => {
                    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                    return res.json();
                  });
                  
                  const fetchDailySales = fetch(`/api/daily-sales?branchId=${selectedBranchId}&date=${formattedDate}`, {
                    method: 'GET',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    credentials: 'include'
                  }).then(res => {
                    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                    return res.json();
                  });
                  
                  Promise.all([fetchConsolidatedSales, fetchDailySales])
                    .then(([consolidatedResponse, dailySalesResponse]) => {
                      setConsolidatedSales(consolidatedResponse);
                      setDailySales(dailySalesResponse);
                      
                      if (consolidatedResponse.length > 0) {
                        setSelectedEntry(consolidatedResponse[0]);
                        fetchAssociatedDailySales(consolidatedResponse[0].id);
                      } else {
                        setSelectedEntry(null);
                        setSelectedEntrySales([]);
                      }
                      
                      toast({
                        title: "تم التحديث",
                        description: "تم تحديث بيانات اليوميات بنجاح",
                      });
                    })
                    .catch(error => {
                      console.error("Error refreshing data:", error);
                      toast({
                        title: "خطأ في تحديث البيانات",
                        description: "حدث خطأ أثناء محاولة تحديث بيانات اليوميات.",
                        variant: "destructive",
                      });
                    })
                    .finally(() => {
                      setLoading(false);
                    });
                } catch (error) {
                  console.error("Error setting up fetch requests:", error);
                  toast({
                    title: "خطأ في الاتصال",
                    description: "حدث خطأ أثناء محاولة الاتصال بالخادم.",
                    variant: "destructive",
                  });
                  setLoading(false);
                }
              }
            }}
            className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white px-4 py-2 rounded-md shadow-sm transition-all duration-200 ease-in-out flex items-center"
          >
            <FaSync className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="font-medium text-sm">
              {t('consolidatedJournal.refreshJournalData')}
            </span>
          </Button>
        </div>
        <BranchSelector
          selectedBranchId={selectedBranchId}
          onBranchChange={setSelectedBranchId}
          filterOptions={{
            dateRange,
            onDateRangeChange: setDateRange,
          }}
        />
      </div>
      
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>{t('branchSelector.date')}</CardTitle>
            <CardDescription>{t('consolidatedJournal.selectDate')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <DatePicker
                value={{ from: selectedDate, to: selectedDate }}
                onChange={(date) => {
                  if (date?.from) {
                    setSelectedDate(date.from);
                  }
                }}
              />
              
              <Button
                variant="default"
                onClick={handleConsolidateSales}
                disabled={consolidating || !selectedBranchId || !dailySales.length}
                className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white px-4 py-2 rounded-md shadow-md transition-all duration-200 ease-in-out flex items-center justify-center"
              >
                <FaSync className={`mr-2 h-4 w-4 ${consolidating ? 'animate-spin' : ''}`} />
                <span className="font-semibold text-sm">
                  {consolidating ? t('consolidatedJournal.loadingData') : t('consolidatedJournal.consolidateBranchJournals')}
                </span>
              </Button>
              
              {!loading && dailySales.length > 0 && !consolidatedSales.length && (
                <Alert className="mt-2">
                  <AlertTitle>{t('consolidatedJournal.readyForTransfer')}</AlertTitle>
                  <AlertDescription>
                    {t('consolidatedJournal.noConsolidatedJournal')}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('consolidatedJournal.consolidatedJournal')}</CardTitle>
              {selectedEntry && (
                <Badge className={getStatusColor(selectedEntry.status)}>
                  {getStatusLabel(selectedEntry.status)}
                </Badge>
              )}
            </div>
            <CardDescription>
              {selectedEntry ? `${selectedEntry.branchName} - ${format(new Date(selectedEntry.date), 'dd/MM/yyyy')}` : t('consolidatedJournal.noConsolidatedJournal')}
            </CardDescription>
          </CardHeader>
          
          {selectedEntry ? (
            <>
              <CardContent id="consolidated-journal-content" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border p-3">
                    <div className="text-sm font-medium text-muted-foreground">{t('consolidatedJournal.totalCashSales')}</div>
                    <div className="mt-1 text-2xl font-bold">{formatCurrency(selectedEntry.totalCashSales)}</div>
                  </div>
                  
                  <div className="rounded-lg border p-3">
                    <div className="text-sm font-medium text-muted-foreground">{t('consolidatedJournal.totalNetworkSales')}</div>
                    <div className="mt-1 text-2xl font-bold">{formatCurrency(selectedEntry.totalNetworkSales)}</div>
                  </div>
                  
                  <div className="rounded-lg border p-3">
                    <div className="text-sm font-medium text-muted-foreground">{t('consolidatedJournal.totalSales')}</div>
                    <div className="mt-1 text-2xl font-bold">{formatCurrency(selectedEntry.totalSales)}</div>
                  </div>
                  
                  <div className="rounded-lg border p-3">
                    <div className="text-sm font-medium text-muted-foreground">{t('consolidatedJournal.averageTicket')}</div>
                    <div className="mt-1 text-2xl font-bold">{formatCurrency(selectedEntry.averageTicket)}</div>
                  </div>
                  
                  <div className="rounded-lg border p-3">
                    <div className="text-sm font-medium text-muted-foreground">{t('consolidatedJournal.totalTransactions')}</div>
                    <div className="mt-1 text-2xl font-bold">{selectedEntry.totalTransactions}</div>
                  </div>
                  
                  <div className={`rounded-lg border p-3 ${selectedEntry.totalDiscrepancy !== 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                    <div className="text-sm font-medium text-muted-foreground">{t('consolidatedJournal.totalDiscrepancy')}</div>
                    <div className={`mt-1 text-2xl font-bold ${selectedEntry.totalDiscrepancy < 0 ? 'text-red-600' : selectedEntry.totalDiscrepancy > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      {formatCurrency(selectedEntry.totalDiscrepancy)}
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="mb-2 text-lg font-semibold">{t('consolidatedJournal.journalDetails')}</h3>
                  
                  {selectedEntrySales.length > 0 ? (
                    <div className="rounded-md border">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="p-2 text-right font-medium">{t('consolidatedJournal.cashierName')}</th>
                            <th className="p-2 text-right font-medium">{t('consolidatedJournal.shift')}</th>
                            <th className="p-2 text-right font-medium">{t('consolidatedJournal.totalCashSales')}</th>
                            <th className="p-2 text-right font-medium">{t('consolidatedJournal.totalNetworkSales')}</th>
                            <th className="p-2 text-right font-medium">{t('consolidatedJournal.totalSales')}</th>
                            <th className="p-2 text-right font-medium">{t('consolidatedJournal.totalDiscrepancy')}</th>
                            <th className="p-2 text-right font-medium">{t('consolidatedJournal.status')}</th>
                            <th className="p-2 text-right font-medium">{t('consolidatedJournal.signature')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedEntrySales.map((sale) => (
                            <tr key={sale.id} className={`border-b ${sale.discrepancy < 0 ? 'bg-red-50' : sale.discrepancy > 0 ? 'bg-amber-50' : ''}`}>
                              <td className="p-2 font-medium">{sale.cashierName}</td>
                              <td className="p-2">{sale.shiftType === 'morning' ? t('consolidatedJournal.morning') : t('consolidatedJournal.evening')}</td>
                              <td className="p-2">{formatCurrency(sale.totalCashSales)}</td>
                              <td className="p-2">{formatCurrency(sale.totalNetworkSales)}</td>
                              <td className="p-2 font-medium">{formatCurrency(sale.totalSales)}</td>
                              <td className={`p-2 font-bold ${sale.discrepancy < 0 ? 'text-red-600 bg-red-100 rounded-md' : sale.discrepancy > 0 ? 'text-amber-600 bg-amber-100 rounded-md' : 'text-green-600'}`}>
                                {sale.discrepancy < 0 ? `عجز: ${formatCurrency(Math.abs(sale.discrepancy))}` : 
                                 sale.discrepancy > 0 ? `زيادة: ${formatCurrency(sale.discrepancy)}` : 
                                 formatCurrency(sale.discrepancy)}
                              </td>
                              <td className="p-2">
                                <Badge variant="outline" className={getStatusColor(sale.status)}>
                                  {getStatusLabel(sale.status)}
                                </Badge>
                              </td>
                              <td className="p-2 text-center">
                                <div className="flex justify-center items-center gap-2">
                                  {sale.signature ? (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-auto p-1"
                                            onClick={() => {
                                              toast({
                                                title: "توقيع الكاشير",
                                                description: (
                                                  <div className="mt-2 flex items-center justify-center">
                                                    <div className="w-64 h-24 border border-dashed p-1 rounded-md bg-white">
                                                      <img src={sale.signature || ''} alt="توقيع الكاشير" className="w-full h-full object-contain" />
                                                    </div>
                                                  </div>
                                                ),
                                                duration: 5000,
                                              });
                                            }}
                                          >
                                            <FaSignature className="h-4 w-4 text-primary" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>عرض توقيع الكاشير</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  ) : (
                                    <Badge variant="outline" className="bg-red-50 text-red-500 border-red-200">
                                      لا يوجد توقيع
                                    </Badge>
                                  )}

                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-auto p-1"
                                          onClick={() => {
                                            // إنشاء تقرير منفصل لكل كاشير
                                            try {
                                              const formattedDate = format(new Date(sale.date), 'dd/MM/yyyy');
                                            
                                              // إنشاء محتوى HTML للتقرير الفردي
                                              const exportContent = `
                                                <div class="print-document" dir="rtl">
                                                  <div class="report-header">
                                                    <h1>بتر بيكري للحلويات</h1>
                                                    <h2>تقرير يومية الكاشير</h2>
                                                    <div>
                                                      <span>الكاشير: ${sale.cashierName}</span>
                                                      <span> - </span>
                                                      <span>التاريخ: ${formattedDate}</span>
                                                      <span> - </span>
                                                      <span>الوردية: ${sale.shiftType === 'morning' ? 'صباحية' : 'مسائية'}</span>
                                                    </div>
                                                  </div>
                                                  
                                                  <div class="summary-section">
                                                    <h3>ملخص اليومية</h3>
                                                    <table border="1" cellpadding="5" cellspacing="0">
                                                      <tr>
                                                        <th>البند</th>
                                                        <th>القيمة</th>
                                                      </tr>
                                                      <tr>
                                                        <td>المبيعات النقدية</td>
                                                        <td>${formatCurrency(sale.totalCashSales)}</td>
                                                      </tr>
                                                      <tr>
                                                        <td>مبيعات الشبكة</td>
                                                        <td>${formatCurrency(sale.totalNetworkSales)}</td>
                                                      </tr>
                                                      <tr>
                                                        <td>إجمالي المبيعات</td>
                                                        <td>${formatCurrency(sale.totalSales)}</td>
                                                      </tr>
                                                      <tr>
                                                        <td>فرق الصندوق</td>
                                                        <td class="${sale.discrepancy < 0 ? 'negative' : sale.discrepancy > 0 ? 'positive' : ''}">${sale.discrepancy < 0 ? `عجز: ${formatCurrency(Math.abs(sale.discrepancy))}` : sale.discrepancy > 0 ? `زيادة: ${formatCurrency(sale.discrepancy)}` : formatCurrency(sale.discrepancy)}</td>
                                                      </tr>
                                                    </table>
                                                  </div>
                                                  
                                                  <div class="signature-section">
                                                    <h3>توقيع الكاشير</h3>
                                                    <div class="signature-container">
                                                      ${sale.signature ? `<img src="${sale.signature}" alt="توقيع الكاشير" class="signature-image" />` : '<p class="no-signature">لا يوجد توقيع</p>'}
                                                    </div>
                                                  </div>
                                                  
                                                  <div class="report-footer">
                                                    <p>تم إنشاء هذا التقرير بتاريخ: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
                                                  </div>
                                                </div>
                                              `;
                                              
                                              // إنشاء ملف HTML مع التنسيق
                                              const blob = new Blob([`
                                                <!DOCTYPE html>
                                                <html dir="rtl" lang="ar">
                                                <head>
                                                  <meta charset="UTF-8">
                                                  <title>يومية كاشير: ${sale.cashierName} - ${formattedDate}</title>
                                                  <style>
                                                    body {
                                                      font-family: Arial, sans-serif;
                                                      direction: rtl;
                                                      padding: 20px;
                                                      line-height: 1.5;
                                                    }
                                                    
                                                    .print-document {
                                                      max-width: 800px;
                                                      margin: 0 auto;
                                                    }
                                                    
                                                    .report-header {
                                                      text-align: center;
                                                      margin-bottom: 30px;
                                                    }
                                                    
                                                    .report-header h1 {
                                                      font-size: 24px;
                                                      margin-bottom: 5px;
                                                    }
                                                    
                                                    .report-header h2 {
                                                      font-size: 18px;
                                                      margin-bottom: 10px;
                                                      color: #555;
                                                    }
                                                    
                                                    h3 {
                                                      border-bottom: 1px solid #ccc;
                                                      padding-bottom: 5px;
                                                      margin-top: 20px;
                                                    }
                                                    
                                                    table {
                                                      width: 100%;
                                                      border-collapse: collapse;
                                                      margin: 15px 0;
                                                    }
                                                    
                                                    th {
                                                      background-color: #f2f2f2;
                                                      padding: 8px;
                                                      text-align: right;
                                                    }
                                                    
                                                    td {
                                                      padding: 8px;
                                                      text-align: right;
                                                    }
                                                    
                                                    .summary-section table {
                                                      width: 60%;
                                                      margin: 15px auto;
                                                    }
                                                    
                                                    .negative {
                                                      color: red;
                                                      font-weight: bold;
                                                    }
                                                    
                                                    .positive {
                                                      color: green;
                                                      font-weight: bold;
                                                    }
                                                    
                                                    .signature-container {
                                                      border: 1px dashed #ccc;
                                                      padding: 10px;
                                                      margin: 20px auto;
                                                      width: 300px;
                                                      height: 150px;
                                                      display: flex;
                                                      align-items: center;
                                                      justify-content: center;
                                                      background-color: #f9f9f9;
                                                    }
                                                    
                                                    .signature-image {
                                                      max-width: 100%;
                                                      max-height: 100%;
                                                      object-fit: contain;
                                                    }
                                                    
                                                    .no-signature {
                                                      color: #999;
                                                      font-style: italic;
                                                    }
                                                    
                                                    .report-footer {
                                                      margin-top: 30px;
                                                      text-align: center;
                                                      font-size: 14px;
                                                      color: #666;
                                                      border-top: 1px solid #eee;
                                                      padding-top: 10px;
                                                    }
                                                  </style>
                                                </head>
                                                <body>
                                                  ${exportContent}
                                                </body>
                                                </html>
                                              `], { type: 'text/html' });
                                              
                                              // تنزيل الملف
                                              const link = document.createElement('a');
                                              link.href = URL.createObjectURL(blob);
                                              link.download = `يومية-كاشير-${sale.cashierName.replace(/\s+/g, '-')}-${format(new Date(sale.date), 'yyyy-MM-dd')}.html`;
                                              link.click();
                                              
                                              // تنظيف
                                              URL.revokeObjectURL(link.href);
                                              
                                              toast({
                                                title: "تم التصدير بنجاح",
                                                description: `تم تصدير يومية الكاشير ${sale.cashierName} بنجاح`,
                                                variant: 'default'
                                              });
                                            } catch (error) {
                                              console.error("Error exporting cashier daily report:", error);
                                              toast({
                                                title: "خطأ في التصدير",
                                                description: "حدث خطأ أثناء تصدير يومية الكاشير. حاول مرة أخرى.",
                                                variant: 'destructive'
                                              });
                                            }
                                          }}
                                        >
                                          <FaFileDownload className="h-4 w-4 text-blue-600" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>تصدير يومية الكاشير</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t bg-muted/30">
                            <td className="p-2 font-bold">{t('common.total')}</td>
                            <td className="p-2"></td>
                            <td className="p-2 font-bold">{formatCurrency(selectedEntry.totalCashSales)}</td>
                            <td className="p-2 font-bold">{formatCurrency(selectedEntry.totalNetworkSales)}</td>
                            <td className="p-2 font-bold">{formatCurrency(selectedEntry.totalSales)}</td>
                            <td className={`p-2 font-bold ${selectedEntry.totalDiscrepancy < 0 ? 'text-red-600 bg-red-100 rounded-md' : selectedEntry.totalDiscrepancy > 0 ? 'text-amber-600 bg-amber-100 rounded-md' : 'text-green-600'}`}>
                              {selectedEntry.totalDiscrepancy < 0 ? `إجمالي العجز: ${formatCurrency(Math.abs(selectedEntry.totalDiscrepancy))}` : 
                               selectedEntry.totalDiscrepancy > 0 ? `إجمالي الزيادة: ${formatCurrency(selectedEntry.totalDiscrepancy)}` : 
                               formatCurrency(selectedEntry.totalDiscrepancy)}
                            </td>
                            <td className="p-2"></td>
                            <td className="p-2"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                      {t('consolidatedJournal.noLinkedJournals')}
                    </div>
                  )}
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{t('consolidatedJournal.createdBy')}:</span>
                    <span className="font-medium text-foreground">{selectedEntry.createdByName || t('consolidatedJournal.systemUser')}</span>
                    <span>{t('consolidatedJournal.at')}</span>
                    <span className="font-medium text-foreground">{formatDate(new Date(selectedEntry.createdAt), 'medium')}</span>
                  </div>
                  
                  {selectedEntry.closedAt && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{t('consolidatedJournal.closedBy')}:</span>
                      <span className="font-medium text-foreground">{selectedEntry.closedByName || t('consolidatedJournal.systemUser')}</span>
                      <span>{t('consolidatedJournal.at')}</span>
                      <span className="font-medium text-foreground">{formatDate(new Date(selectedEntry.closedAt), 'medium')}</span>
                    </div>
                  )}
                </div>
              </CardContent>
              
              <CardFooter className="justify-between border-t p-4">
                <div className="flex flex-wrap gap-3">
                  {selectedEntry.status === 'open' && (
                    <Button
                      variant="default"
                      onClick={() => handleCloseConsolidatedSales(selectedEntry.id)}
                      disabled={closing}
                      className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-4 py-2 rounded-md shadow-md transition-all duration-200 ease-in-out transform hover:-translate-y-1 hover:shadow-lg flex items-center min-w-[150px] justify-center"
                    >
                      <FaLock className="mr-2 h-5 w-5" />
                      <span className="font-semibold text-sm">
                        {closing ? t('consolidatedJournal.loadingData') : t('consolidatedJournal.closeConsolidatedJournal')}
                      </span>
                    </Button>
                  )}
                  
                  {/* زر ترحيل اليومية بعد إغلاقها أو اعتمادها */}
                  {(selectedEntry.status === 'closed' || selectedEntry.status === 'approved') ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="default"
                            onClick={() => handleTransferConsolidatedSales(selectedEntry.id)}
                            disabled={transferring}
                            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 py-2 rounded-md shadow-md transition-all duration-200 ease-in-out transform hover:-translate-y-1 hover:shadow-lg flex items-center min-w-[150px] justify-center"
                          >
                            <FaExchangeAlt className="mr-2 h-5 w-5" />
                            <span className="font-semibold text-sm">
                              {transferring ? t('consolidatedJournal.loadingData') : t('consolidatedJournal.transferJournal')}
                            </span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>ترحيل اليومية المجمعة للحسابات بعد تدقيقها</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : null}
                </div>
                
                <div className="flex gap-3 mt-2">
                  <Button
                    variant="default"
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-md shadow-md transition-all duration-200 ease-in-out transform hover:-translate-y-1 hover:shadow-lg flex items-center min-w-[140px] justify-center"
                    onClick={() => {
                      if (!selectedEntry) {
                        toast({
                          title: "خطأ في التصدير",
                          description: "لم يتم اختيار سجل للتصدير",
                          variant: 'destructive'
                        });
                        return;
                      }

                      try {
                        // نهج محسن لتصدير البيانات مع مراعاة اللغة العربية
                        const date = format(new Date(selectedEntry.date), 'yyyy-MM-dd');
                        const formattedDate = format(new Date(), 'dd/MM/yyyy');
                        
                        // إنشاء محتوى HTML للتقرير
                        const exportContent = `
                          <div class="print-document" dir="rtl">
                            <div class="report-header">
                              <h1>بتر بيكري للحلويات</h1>
                              <h2>تقرير اليومية المجمعة</h2>
                              <div>
                                <span>الفرع: ${selectedEntry.branchName}</span>
                                <span> - </span>
                                <span>التاريخ: ${format(new Date(selectedEntry.date), 'dd/MM/yyyy')}</span>
                              </div>
                            </div>
                            
                            <div class="summary-section">
                              <h3>ملخص اليومية</h3>
                              <table border="1" cellpadding="5" cellspacing="0">
                                <tr>
                                  <th>البند</th>
                                  <th>القيمة</th>
                                </tr>
                                <tr>
                                  <td>إجمالي المبيعات النقدية</td>
                                  <td>${formatCurrency(selectedEntry.totalCashSales)}</td>
                                </tr>
                                <tr>
                                  <td>إجمالي مبيعات الشبكة</td>
                                  <td>${formatCurrency(selectedEntry.totalNetworkSales)}</td>
                                </tr>
                                <tr>
                                  <td>إجمالي المبيعات</td>
                                  <td>${formatCurrency(selectedEntry.totalSales)}</td>
                                </tr>
                                <tr>
                                  <td>عدد المعاملات</td>
                                  <td>${selectedEntry.totalTransactions}</td>
                                </tr>
                                <tr>
                                  <td>متوسط قيمة التذكرة</td>
                                  <td>${formatCurrency(selectedEntry.averageTicket)}</td>
                                </tr>
                                <tr>
                                  <td>إجمالي الفروقات</td>
                                  <td class="${selectedEntry.totalDiscrepancy < 0 ? 'negative' : selectedEntry.totalDiscrepancy > 0 ? 'positive' : ''}">${formatCurrency(selectedEntry.totalDiscrepancy)}</td>
                                </tr>
                              </table>
                            </div>
                            
                            <div class="details-section">
                              <h3>تفاصيل اليومية</h3>
                              <table border="1" cellpadding="5" cellspacing="0">
                                <thead>
                                  <tr>
                                    <th>#</th>
                                    <th>الكاشير</th>
                                    <th>الوردية</th>
                                    <th>المبيعات النقدية</th>
                                    <th>مبيعات الشبكة</th>
                                    <th>إجمالي المبيعات</th>
                                    <th>الفرق</th>
                                    <th>الحالة</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  ${selectedEntrySales.map((sale, index) => `
                                    <tr>
                                      <td>${index + 1}</td>
                                      <td>${sale.cashierName}</td>
                                      <td>${sale.shiftType === 'morning' ? 'صباحية' : 'مسائية'}</td>
                                      <td>${formatCurrency(sale.totalCashSales)}</td>
                                      <td>${formatCurrency(sale.totalNetworkSales)}</td>
                                      <td>${formatCurrency(sale.totalSales)}</td>
                                      <td class="${sale.discrepancy < 0 ? 'negative' : sale.discrepancy > 0 ? 'positive' : ''}">${formatCurrency(sale.discrepancy)}</td>
                                      <td>${getStatusLabel(sale.status)}</td>
                                    </tr>
                                  `).join('')}
                                </tbody>
                                <tfoot>
                                  <tr>
                                    <td colspan="3" style="text-align: center; font-weight: bold;">المجموع</td>
                                    <td style="font-weight: bold;">${formatCurrency(selectedEntry.totalCashSales)}</td>
                                    <td style="font-weight: bold;">${formatCurrency(selectedEntry.totalNetworkSales)}</td>
                                    <td style="font-weight: bold;">${formatCurrency(selectedEntry.totalSales)}</td>
                                    <td style="font-weight: bold;" class="${selectedEntry.totalDiscrepancy < 0 ? 'negative' : selectedEntry.totalDiscrepancy > 0 ? 'positive' : ''}">${formatCurrency(selectedEntry.totalDiscrepancy)}</td>
                                    <td></td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                            
                            <div class="report-footer">
                              <p>تم إنشاء هذا التقرير بواسطة: ${selectedEntry.createdByName || 'النظام'}</p>
                              <p>تاريخ التصدير: ${formattedDate}</p>
                            </div>
                          </div>
                        `;
                        
                        // إنشاء Blob مع تنسيق HTML
                        const blob = new Blob([`
                        <!DOCTYPE html>
                        <html dir="rtl" lang="ar">
                        <head>
                          <meta charset="UTF-8">
                          <title>تقرير اليومية المجمعة - ${selectedEntry.branchName} - ${date}</title>
                          <style>
                            body {
                              font-family: Arial, sans-serif;
                              direction: rtl;
                              padding: 20px;
                              line-height: 1.5;
                            }
                            
                            .print-document {
                              max-width: 800px;
                              margin: 0 auto;
                            }
                            
                            .report-header {
                              text-align: center;
                              margin-bottom: 30px;
                            }
                            
                            .report-header h1 {
                              font-size: 24px;
                              margin-bottom: 5px;
                            }
                            
                            .report-header h2 {
                              font-size: 18px;
                              margin-bottom: 10px;
                              color: #555;
                            }
                            
                            h3 {
                              border-bottom: 1px solid #ccc;
                              padding-bottom: 5px;
                              margin-top: 20px;
                            }
                            
                            table {
                              width: 100%;
                              border-collapse: collapse;
                              margin: 15px 0;
                            }
                            
                            th {
                              background-color: #f2f2f2;
                              padding: 8px;
                              text-align: right;
                            }
                            
                            td {
                              padding: 8px;
                              text-align: right;
                            }
                            
                            .summary-section table {
                              width: 60%;
                              margin: 15px auto;
                            }
                            
                            .negative {
                              color: red;
                            }
                            
                            .positive {
                              color: green;
                            }
                            
                            .report-footer {
                              margin-top: 30px;
                              text-align: center;
                              font-size: 14px;
                              color: #666;
                              border-top: 1px solid #eee;
                              padding-top: 10px;
                            }
                          </style>
                        </head>
                        <body>
                          ${exportContent}
                        </body>
                        </html>
                        `], { type: 'text/html' });
                        
                        console.log("تم تنزيل ملف HTML للطباعة");
                        
                        // إنشاء رابط التنزيل
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.download = `يومية-مجمعة-${selectedEntry.branchName ? selectedEntry.branchName.replace(/\s+/g, '-') : 'فرع'}-${date}.html`;
                        link.click();
                        
                        // تنظيف
                        URL.revokeObjectURL(link.href);
                        
                        toast({
                          title: "تم التصدير بنجاح",
                          description: "تم تصدير دفتر اليومية المجمعة كملف HTML للطباعة",
                          variant: 'default'
                        });
                      } catch (error) {
                        console.error("Error exporting data:", error);
                        toast({
                          title: "خطأ في التصدير",
                          description: "حدث خطأ أثناء تصدير البيانات. حاول مرة أخرى.",
                          variant: 'destructive'
                        });
                      }
                    }}
                  >
                    <FaFileDownload className="mr-2 h-5 w-5" />
                    <span className="font-semibold text-sm">{t('consolidatedJournal.export')}</span>
                  </Button>
                  <Button
                    variant="default"
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2 rounded-md shadow-md transition-all duration-200 ease-in-out transform hover:-translate-y-1 hover:shadow-lg flex items-center min-w-[140px] justify-center"
                    onClick={() => {
                      try {
                        if (!selectedEntry) {
                          console.error("لم يتم العثور على بيانات للطباعة!");
                          toast({
                            title: "خطأ في الطباعة",
                            description: "لم يتم اختيار سجل للطباعة",
                            variant: 'destructive'
                          });
                          return;
                        }
                        
                        console.log("بدء طباعة اليومية المجمعة");
                        
                        // نهج مبسط للطباعة المباشرة - إنشاء عنصر مخفي في الصفحة ثم طباعته
                        // إنشاء عنصر div مؤقت للطباعة
                        const printDiv = document.createElement('div');
                        printDiv.style.display = 'none';
                        document.body.appendChild(printDiv);
                        
                        // إنشاء محتوى HTML للتقرير مع تحسين الشكل
                        const printContent = `
                          <div style="direction: rtl; text-align: right; font-family: Arial, Tahoma, sans-serif; padding: 20px;">
                            <div style="text-align: center; margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 10px;">
                              <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">بتر بيكري للحلويات</div>
                              <div style="font-size: 18px; margin-bottom: 5px; color: #555;">دفتر اليومية المجمعة</div>
                              <div style="font-size: 14px; color: #555;">
                                ${selectedEntry.branchName || 'الفرع'} - 
                                ${format(new Date(selectedEntry.date), 'dd/MM/yyyy')}
                              </div>
                            </div>
                            
                            <div style="margin-bottom: 20px;">
                              <h3 style="border-bottom: 1px solid #eee; padding-bottom: 5px;">ملخص اليومية</h3>
                              <table style="width: 80%; margin: 0 auto; border-collapse: collapse; border: 1px solid #ddd;">
                                <tr>
                                  <th style="padding: 8px; background-color: #f5f5f5; border: 1px solid #ddd; width: 50%; text-align: right;">البند</th>
                                  <th style="padding: 8px; background-color: #f5f5f5; border: 1px solid #ddd; width: 50%; text-align: right;">القيمة</th>
                                </tr>
                                <tr>
                                  <td style="padding: 8px; border: 1px solid #ddd;">إجمالي المبيعات النقدية</td>
                                  <td style="padding: 8px; border: 1px solid #ddd;">${formatCurrency(selectedEntry.totalCashSales)}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px; border: 1px solid #ddd;">إجمالي مبيعات الشبكة</td>
                                  <td style="padding: 8px; border: 1px solid #ddd;">${formatCurrency(selectedEntry.totalNetworkSales)}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px; border: 1px solid #ddd;">إجمالي المبيعات</td>
                                  <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${formatCurrency(selectedEntry.totalSales)}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px; border: 1px solid #ddd;">عدد المعاملات</td>
                                  <td style="padding: 8px; border: 1px solid #ddd;">${selectedEntry.totalTransactions}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px; border: 1px solid #ddd;">متوسط قيمة التذكرة</td>
                                  <td style="padding: 8px; border: 1px solid #ddd;">${formatCurrency(selectedEntry.averageTicket)}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px; border: 1px solid #ddd;">إجمالي الفروقات</td>
                                  <td style="padding: 8px; border: 1px solid #ddd; ${selectedEntry.totalDiscrepancy < 0 ? 'color: red;' : selectedEntry.totalDiscrepancy > 0 ? 'color: green;' : ''}">
                                    ${formatCurrency(selectedEntry.totalDiscrepancy)}
                                  </td>
                                </tr>
                              </table>
                            </div>
                            
                            <div style="margin-bottom: 20px;">
                              <h3 style="border-bottom: 1px solid #eee; padding-bottom: 5px;">تفاصيل اليومية</h3>
                              <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
                                <thead>
                                  <tr>
                                    <th style="padding: 8px; background-color: #f5f5f5; border: 1px solid #ddd; text-align: right;">الكاشير</th>
                                    <th style="padding: 8px; background-color: #f5f5f5; border: 1px solid #ddd; text-align: right;">الوردية</th>
                                    <th style="padding: 8px; background-color: #f5f5f5; border: 1px solid #ddd; text-align: right;">المبيعات النقدية</th>
                                    <th style="padding: 8px; background-color: #f5f5f5; border: 1px solid #ddd; text-align: right;">مبيعات الشبكة</th>
                                    <th style="padding: 8px; background-color: #f5f5f5; border: 1px solid #ddd; text-align: right;">إجمالي المبيعات</th>
                                    <th style="padding: 8px; background-color: #f5f5f5; border: 1px solid #ddd; text-align: right;">الفرق</th>
                                    <th style="padding: 8px; background-color: #f5f5f5; border: 1px solid #ddd; text-align: right;">الحالة</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  ${selectedEntrySales.map(sale => `
                                    <tr>
                                      <td style="padding: 8px; border: 1px solid #ddd;">${sale.cashierName}</td>
                                      <td style="padding: 8px; border: 1px solid #ddd;">${sale.shiftType === 'morning' ? 'صباحية' : 'مسائية'}</td>
                                      <td style="padding: 8px; border: 1px solid #ddd;">${formatCurrency(sale.totalCashSales)}</td>
                                      <td style="padding: 8px; border: 1px solid #ddd;">${formatCurrency(sale.totalNetworkSales)}</td>
                                      <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${formatCurrency(sale.totalSales)}</td>
                                      <td style="padding: 8px; border: 1px solid #ddd; ${sale.discrepancy < 0 ? 'color: red;' : sale.discrepancy > 0 ? 'color: green;' : ''}">
                                        ${formatCurrency(sale.discrepancy)}
                                      </td>
                                      <td style="padding: 8px; border: 1px solid #ddd;">${getStatusLabel(sale.status)}</td>
                                    </tr>
                                  `).join('')}
                                </tbody>
                                <tfoot>
                                  <tr>
                                    <td colspan="2" style="padding: 8px; border: 1px solid #ddd; font-weight: bold; text-align: center;">المجموع</td>
                                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${formatCurrency(selectedEntry.totalCashSales)}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${formatCurrency(selectedEntry.totalNetworkSales)}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${formatCurrency(selectedEntry.totalSales)}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; ${selectedEntry.totalDiscrepancy < 0 ? 'color: red;' : selectedEntry.totalDiscrepancy > 0 ? 'color: green;' : ''}">
                                      ${formatCurrency(selectedEntry.totalDiscrepancy)}
                                    </td>
                                    <td style="padding: 8px; border: 1px solid #ddd;"></td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                            
                            <div style="text-align: center; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; font-size: 12px; color: #666;">
                              <div>تم إنشاء هذا التقرير بواسطة: ${selectedEntry.createdByName || 'النظام'}</div>
                              <div>تاريخ الطباعة: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
                            </div>
                          </div>
                        `;
                        
                        // تعيين محتوى HTML للعنصر المؤقت
                        printDiv.innerHTML = printContent;
                        
                        // حفظ محتوى الجسم الحالي وإعادة تعيينه بعد الطباعة
                        const originalContents = document.body.innerHTML;
                        
                        console.log("جاري تحضير الطباعة");
                        
                        // محاولة طباعة مباشرة باستخدام نهج iframe (أكثر توافقًا مع المتصفحات)
                        const iframe = document.createElement('iframe');
                        iframe.style.display = 'none';
                        document.body.appendChild(iframe);
                        
                        // القيام بالطباعة بمجرد تحميل الـ iframe
                        iframe.onload = function() {
                          try {
                            console.log("بدء طباعة المحتوى");
                            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                            if (!iframeDoc) throw new Error("فشل في الوصول إلى وثيقة iframe");
                            
                            // تعيين محتوى HTML للـ iframe
                            iframeDoc.open();
                            iframeDoc.write(`
                              <!DOCTYPE html>
                              <html dir="rtl">
                              <head>
                                <title>طباعة اليومية المجمعة</title>
                                <meta charset="UTF-8">
                                <style>
                                  @page { size: A4 landscape; margin: 1.5cm; }
                                  @media print {
                                    body { font-size: 12pt; }
                                    thead { display: table-header-group; }
                                    tfoot { display: table-footer-group; }
                                    tr { page-break-inside: avoid; }
                                  }
                                </style>
                              </head>
                              <body>
                                ${printContent}
                              </body>
                              </html>
                            `);
                            iframeDoc.close();
                            
                            // تنفيذ الطباعة بعد التأكد من تحميل المحتوى
                            setTimeout(() => {
                              try {
                                iframe.contentWindow?.focus();
                                iframe.contentWindow?.print();
                                console.log("اكتملت عملية الطباعة بنجاح");
                                
                                // إزالة الـ iframe بعد انتظار انتهاء الطباعة
                                setTimeout(() => {
                                  document.body.removeChild(iframe);
                                  document.body.removeChild(printDiv);
                                  console.log("تمت عملية الطباعة بنجاح");
                                  
                                  toast({
                                    title: "تمت الطباعة بنجاح",
                                    description: "تم إرسال التقرير إلى الطابعة بنجاح",
                                  });
                                }, 1000);
                              } catch (printError) {
                                console.error("خطأ أثناء تنفيذ الطباعة:", printError);
                                throw printError;
                              }
                            }, 500);
                          } catch (iframeError) {
                            console.error("خطأ في إعداد iframe:", iframeError);
                            throw iframeError;
                          }
                        };
                        
                        // خطة بديلة في حالة فشل طريقة iframe
                        iframe.onerror = function() {
                          console.error("فشلت طريقة iframe، جاري المحاولة بالطريقة التقليدية");
                          
                          // الرجوع إلى طريقة الطباعة التقليدية
                          document.body.innerHTML = printDiv.innerHTML;
                          window.print();
                          document.body.innerHTML = originalContents;
                          document.body.removeChild(printDiv);
                          
                          toast({
                            title: "تمت الطباعة",
                            description: "تم إرسال التقرير إلى الطابعة (الطريقة البديلة)",
                          });
                        };
                        
                      } catch (error) {
                        console.error("حدث خطأ خلال عملية الطباعة:", error);
                        toast({
                          title: "خطأ في الطباعة",
                          description: "حدث خطأ أثناء عملية الطباعة. حاول مرة أخرى.",
                          variant: 'destructive'
                        });
                      }
                    }}
                  >
                    <FaPrint className="mr-2 h-5 w-5" />
                    <span className="font-semibold text-sm">{t('consolidatedJournal.print')}</span>
                  </Button>
                </div>
              </CardFooter>
            </>
          ) : (
            <CardContent>
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                {loading ? (
                  t('consolidatedJournal.loadingData')
                ) : (
                  <>
                    <p className="mb-2">{t('consolidatedJournal.noJournalPrompt')}</p>
                    <Button
                      variant="default"
                      onClick={handleConsolidateSales}
                      disabled={consolidating || !selectedBranchId || !dailySales.length}
                      className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white px-6 py-2 rounded-md shadow-md transition-all duration-200 ease-in-out transform hover:-translate-y-1 hover:shadow-lg flex items-center min-w-[200px] mx-auto justify-center"
                    >
                      <FaSync className={`mr-2 h-5 w-5 ${consolidating ? 'animate-spin' : ''}`} />
                      <span className="font-semibold text-sm">
                        {consolidating ? t('consolidatedJournal.loadingData') : t('consolidatedJournal.consolidateBranchJournals')}
                      </span>
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}