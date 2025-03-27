import React, { useState, useRef } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useReactToPrint } from 'react-to-print';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Image } from '@react-pdf/renderer';

// Create PDF styles
const pdfStyles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#fff',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 8,
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#111827',
  },
  subheading: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#374151',
    textAlign: 'center',
  },
  text: {
    fontSize: 12,
    marginBottom: 5,
    color: '#4B5563',
    textAlign: 'right',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    width: '100%',
    marginTop: 10,
    marginBottom: 10,
  },
  section: {
    margin: 10,
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1F2937',
    textAlign: 'right',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryCard: {
    width: '48%',
    padding: 8,
    marginBottom: 10,
    backgroundColor: '#FFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 4,
    textAlign: 'right',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'right',
  },
  positiveValue: {
    color: '#059669',
  },
  negativeValue: {
    color: '#DC2626',
  },
  boldText: {
    fontWeight: 'bold',
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderStyle: 'solid',
    marginVertical: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableCol: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  tableHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    padding: 8,
    backgroundColor: '#F3F4F6',
    color: '#1F2937',
    textAlign: 'right',
  },
  tableCell: {
    fontSize: 9,
    padding: 6,
    color: '#4B5563',
    textAlign: 'right',
  },
  tableFooter: {
    backgroundColor: '#F3F4F6',
  },
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    marginBottom: 30,
  },
  signatureBox: {
    width: '45%',
    alignItems: 'center',
  },
  signatureLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#374151',
  },
  signaturePlaceholder: {
    height: 60,
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#9CA3AF',
    marginBottom: 5,
  },
  signatureImage: {
    height: 60,
    width: '100%',
    objectFit: 'contain',
    marginBottom: 5,
  },
  signatureName: {
    fontSize: 10,
    color: '#4B5563',
    textAlign: 'center',
  },
  footer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 8,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

// Define interfaces
interface SaleItem {
  id?: number;
  date?: string;
  createdAt?: string;
  // حقول قديمة للتوافق
  cashAmount?: number;
  networkAmount?: number;
  totalAmount?: number;
  // حقول API الفعلية
  totalCashSales?: number;
  totalNetworkSales?: number;
  totalSales?: number;
  discrepancy?: number;
  cashierName?: string;
  signature?: string;
  transactionCount?: number;
  totalTransactions?: number;
  transactionDetails?: any;
  branchId?: number;
  // حقول إضافية متوقعة من API
  cashierId?: number;
  shiftType?: string; // إضافة حقل نوع الشفت (صباحي/مسائي)
  shiftStart?: string;
  shiftEnd?: string;
  startingCash?: number;
  actualCashInRegister?: number;
  averageTicket?: number;
  status?: string;
  notes?: string;
  hasDiscrepancyAcknowledgment?: boolean;
}

interface Branch {
  id: number;
  name: string;
}

interface SalesTotals {
  totalCash: number;
  totalNetwork: number;
  totalSales: number;
  totalDiscrepancy: number;
}

interface DailyReportPDFProps {
  data: SaleItem[];
  branch?: Branch | null;
  dateRange?: DateRange | undefined | null;
  totals: SalesTotals;
}

// Function to recalculate totals for PDF to ensure consistency
const calculatePDFTotals = (data: SaleItem[]): SalesTotals => {
  if (!data || data.length === 0) {
    return { totalCash: 0, totalNetwork: 0, totalSales: 0, totalDiscrepancy: 0 };
  }
  
  // Calculate totals accurately for PDF export
  const totals = data.reduce((acc: SalesTotals, item: SaleItem) => {
    // استخدم الحقول الصحيحة من API
    const cashAmount = typeof item.totalCashSales === 'number' ? item.totalCashSales : 
                       (typeof item.cashAmount === 'number' ? item.cashAmount : 0);
                       
    const networkAmount = typeof item.totalNetworkSales === 'number' ? item.totalNetworkSales : 
                         (typeof item.networkAmount === 'number' ? item.networkAmount : 0);
    
    // استخدم إجمالي المبيعات المسجلة من الخادم
    const totalSales = typeof item.totalSales === 'number' ? item.totalSales :
                      (typeof item.totalAmount === 'number' ? item.totalAmount : cashAmount + networkAmount);
    
    // Get discrepancy from the API
    const discrepancy = typeof item.discrepancy === 'number' ? item.discrepancy : 0;
    
    acc.totalCash += cashAmount;
    acc.totalNetwork += networkAmount;
    acc.totalSales += totalSales;
    acc.totalDiscrepancy += discrepancy;
    
    return acc;
  }, { totalCash: 0, totalNetwork: 0, totalSales: 0, totalDiscrepancy: 0 });
  
  // Round to 2 decimal places for consistency
  return {
    totalCash: Math.round(totals.totalCash * 100) / 100,
    totalNetwork: Math.round(totals.totalNetwork * 100) / 100,
    totalSales: Math.round(totals.totalSales * 100) / 100,
    totalDiscrepancy: Math.round(totals.totalDiscrepancy * 100) / 100
  };
};

// Create PDF Document component
const DailyReportPDF = ({ data, branch, dateRange, totals: providedTotals }: DailyReportPDFProps) => {
  // Recalculate totals to ensure consistency
  const totals = calculatePDFTotals(data);
  
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Header Section */}
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.logo}>باتر باكيري</Text>
          <Text style={pdfStyles.heading}>تقرير المبيعات اليومية المجمع</Text>
          <Text style={pdfStyles.subheading}>الفرع: {branch?.name || 'جميع الفروع'}</Text>
          <Text style={pdfStyles.text}>
            التاريخ: {dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : ''} 
            {dateRange?.to && dateRange.to !== dateRange.from ? ` - ${format(dateRange.to, 'yyyy-MM-dd')}` : ''}
          </Text>
          <View style={pdfStyles.divider} />
        </View>
        
        {/* Summary Section */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>ملخص المبيعات</Text>
          <View style={pdfStyles.summaryGrid}>
            {/* Total Sales */}
            <View style={pdfStyles.summaryCard}>
              <Text style={pdfStyles.summaryLabel}>إجمالي المبيعات</Text>
              <Text style={pdfStyles.summaryValue}>{totals.totalSales.toFixed(2)} SAR</Text>
            </View>
            
            {/* Cash Sales */}
            <View style={pdfStyles.summaryCard}>
              <Text style={pdfStyles.summaryLabel}>المبيعات النقدية</Text>
              <Text style={pdfStyles.summaryValue}>{totals.totalCash.toFixed(2)} SAR</Text>
            </View>
            
            {/* Network Sales */}
            <View style={pdfStyles.summaryCard}>
              <Text style={pdfStyles.summaryLabel}>مبيعات البطاقات</Text>
              <Text style={pdfStyles.summaryValue}>{totals.totalNetwork.toFixed(2)} SAR</Text>
            </View>
            
            {/* Discrepancy */}
            <View style={pdfStyles.summaryCard}>
              <Text style={pdfStyles.summaryLabel}>الفروقات</Text>
              <Text style={[
                pdfStyles.summaryValue,
                totals.totalDiscrepancy < 0 ? pdfStyles.negativeValue : 
                totals.totalDiscrepancy > 0 ? pdfStyles.positiveValue : {}
              ]}>
                {totals.totalDiscrepancy.toFixed(2)} SAR
              </Text>
            </View>
          </View>
        </View>
        
        {/* Shifts Details Section */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>تفاصيل الورديات</Text>
          <View style={pdfStyles.table}>
            {/* Table Header */}
            <View style={pdfStyles.tableRow}>
              <View style={pdfStyles.tableCol}>
                <Text style={pdfStyles.tableHeader}>التاريخ/الوقت</Text>
              </View>
              <View style={pdfStyles.tableCol}>
                <Text style={pdfStyles.tableHeader}>الكاشير</Text>
              </View>
              <View style={pdfStyles.tableCol}>
                <Text style={pdfStyles.tableHeader}>الوردية</Text>
              </View>
              <View style={pdfStyles.tableCol}>
                <Text style={pdfStyles.tableHeader}>النقدي</Text>
              </View>
              <View style={pdfStyles.tableCol}>
                <Text style={pdfStyles.tableHeader}>البطاقات</Text>
              </View>
              <View style={pdfStyles.tableCol}>
                <Text style={pdfStyles.tableHeader}>الإجمالي</Text>
              </View>
              <View style={pdfStyles.tableCol}>
                <Text style={pdfStyles.tableHeader}>الفروقات</Text>
              </View>
            </View>
            
            {/* Table Data */}
            {data.map((sale, index) => (
              <View key={index} style={pdfStyles.tableRow}>
                <View style={pdfStyles.tableCol}>
                  <Text style={pdfStyles.tableCell}>
                    {sale.date ? format(new Date(sale.date), 'yyyy-MM-dd') : '-'}
                    {sale.createdAt ? ' ' + format(new Date(sale.createdAt), 'hh:mm a') : ''}
                  </Text>
                </View>
                <View style={pdfStyles.tableCol}>
                  <Text style={pdfStyles.tableCell}>{sale.cashierName || 'غير معروف'}</Text>
                </View>
                <View style={pdfStyles.tableCol}>
                  <Text style={pdfStyles.tableCell}>
                    {sale.shiftType === 'morning' ? 'صباحية' : 
                     sale.shiftType === 'evening' ? 'مسائية' : 
                     'غير محدد'}
                  </Text>
                </View>
                <View style={pdfStyles.tableCol}>
                  <Text style={pdfStyles.tableCell}>{
                    (sale.totalCashSales !== undefined ? sale.totalCashSales : (sale.cashAmount || 0)).toFixed(2)
                  } SAR</Text>
                </View>
                <View style={pdfStyles.tableCol}>
                  <Text style={pdfStyles.tableCell}>{
                    (sale.totalNetworkSales !== undefined ? sale.totalNetworkSales : (sale.networkAmount || 0)).toFixed(2)
                  } SAR</Text>
                </View>
                <View style={pdfStyles.tableCol}>
                  <Text style={[pdfStyles.tableCell, pdfStyles.boldText]}>
                    {(sale.totalSales !== undefined ? sale.totalSales : 
                      ((sale.totalCashSales !== undefined ? sale.totalCashSales : sale.cashAmount || 0) + 
                       (sale.totalNetworkSales !== undefined ? sale.totalNetworkSales : sale.networkAmount || 0))
                    ).toFixed(2)} SAR
                  </Text>
                </View>
                <View style={pdfStyles.tableCol}>
                  <Text style={[
                    pdfStyles.tableCell, 
                    (sale.discrepancy || 0) < 0 ? pdfStyles.negativeValue : 
                    (sale.discrepancy || 0) > 0 ? pdfStyles.positiveValue : {}
                  ]}>
                    {(sale.discrepancy || 0).toFixed(2)} SAR
                  </Text>
                </View>
              </View>
            ))}
            
            {/* Table Footer (Totals) */}
            <View style={[pdfStyles.tableRow, pdfStyles.tableFooter]}>
              <View style={pdfStyles.tableCol}>
                <Text style={[pdfStyles.tableCell, pdfStyles.boldText]}>الإجمالي</Text>
              </View>
              <View style={pdfStyles.tableCol}>
                <Text style={pdfStyles.tableCell}>{data.length} وردية</Text>
              </View>
              <View style={pdfStyles.tableCol}>
                <Text style={pdfStyles.tableCell}>-</Text>
              </View>
              <View style={pdfStyles.tableCol}>
                <Text style={[pdfStyles.tableCell, pdfStyles.boldText]}>{totals.totalCash.toFixed(2)} SAR</Text>
              </View>
              <View style={pdfStyles.tableCol}>
                <Text style={[pdfStyles.tableCell, pdfStyles.boldText]}>{totals.totalNetwork.toFixed(2)} SAR</Text>
              </View>
              <View style={pdfStyles.tableCol}>
                <Text style={[pdfStyles.tableCell, pdfStyles.boldText]}>{totals.totalSales.toFixed(2)} SAR</Text>
              </View>
              <View style={pdfStyles.tableCol}>
                <Text style={[
                  pdfStyles.tableCell, 
                  pdfStyles.boldText,
                  totals.totalDiscrepancy < 0 ? pdfStyles.negativeValue : 
                  totals.totalDiscrepancy > 0 ? pdfStyles.positiveValue : {}
                ]}>
                  {totals.totalDiscrepancy.toFixed(2)} SAR
                </Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Transaction Details (If we have only one shift) */}
        {data.length === 1 && data[0]?.transactionDetails && (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>تفاصيل المعاملات</Text>
            <Text style={pdfStyles.text}>عدد المعاملات: {data[0]?.totalTransactions || data[0]?.transactionCount || 0}</Text>
            <Text style={pdfStyles.text}>
              متوسط قيمة الفاتورة: {
                ((data[0]?.totalTransactions || data[0]?.transactionCount) && 
                ((data[0]?.totalTransactions || 0) > 0 || (data[0]?.transactionCount || 0) > 0) && 
                (data[0]?.totalSales || data[0]?.totalAmount))
                  ? ((data[0]?.totalSales || data[0]?.totalAmount || 0) / 
                    (data[0]?.totalTransactions || data[0]?.transactionCount || 1)).toFixed(2) 
                  : ((data[0]?.averageTicket || 0).toFixed(2))
              } SAR
            </Text>
          </View>
        )}
        
        {/* Signature Section */}
        <View style={pdfStyles.signatureSection}>
          <View style={pdfStyles.signatureBox}>
            <Text style={pdfStyles.signatureLabel}>توقيع الكاشير</Text>
            {data.length === 1 && data[0]?.signature ? (
              <Image 
                src={data[0]?.signature} 
                style={pdfStyles.signatureImage} 
              />
            ) : (
              <View style={pdfStyles.signaturePlaceholder} />
            )}
            <Text style={pdfStyles.signatureName}>{data.length === 1 ? data[0]?.cashierName || '' : ''}</Text>
          </View>
          
          <View style={pdfStyles.signatureBox}>
            <Text style={pdfStyles.signatureLabel}>توقيع المدير</Text>
            <View style={pdfStyles.signaturePlaceholder} />
            <Text style={pdfStyles.signatureName}>{''}</Text>
          </View>
        </View>
        
        {/* Footer */}
        <View style={pdfStyles.footer}>
          <Text style={pdfStyles.footerText}>تم إنشاء هذا التقرير بواسطة نظام باتر باكيري</Text>
          <Text style={pdfStyles.footerText}>تاريخ الطباعة: {format(new Date(), 'yyyy-MM-dd hh:mm a')}</Text>
        </View>
      </Page>
    </Document>
  );
};

export default function DailyReports() {
  const { t } = useTranslation();
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date()
  });
  const [activeTab, setActiveTab] = useState<string>('summary');
  
  // References for printing
  const summaryRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  
  // Global print handler
  const handlePrint = () => {
    window.print();
  };

  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ['/api/branches'],
    queryFn: async () => {
      const res = await fetch('/api/branches');
      if (!res.ok) throw new Error('Failed to fetch branches');
      return res.json();
    }
  });

  // Fetch daily sales data
  const { 
    data: dailySalesData = [], 
    isLoading: isLoadingDailySales,
    refetch: refetchDailySales
  } = useQuery({
    queryKey: ['/api/daily-sales', { branchId: selectedBranchId, dateRange }],
    queryFn: async () => {
      // لا نعود هنا - ينبغي أن نقوم بطلب كل البيانات إذا لم يتم تحديد أي فرع أو نطاق زمني
      // if (!selectedBranchId && !dateRange) return [];
      
      let url = '/api/daily-sales';
      let params = new URLSearchParams();
      
      // أرسل معرف الفرع فقط إذا تم اختيار فرع محدد
      if (selectedBranchId !== null && selectedBranchId > 0) {
        console.log('Adding branch filter to request:', selectedBranchId);
        params.append('branchId', selectedBranchId.toString());
      } else {
        // إذا تم اختيار "جميع الفروع"، سنمرر قيمة محددة (0) لإعلام الخادم
        console.log('Adding "all branches" filter to request (branchId=0)');
        params.append('branchId', '0');
      }
      
      if (dateRange?.from) {
        params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
      }
      
      if (dateRange?.to) {
        params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
      }
      
      const queryUrl = `${url}?${params.toString()}`;
      console.log('Fetching daily sales data from URL:', queryUrl);
      
      const res = await fetch(queryUrl);
      if (!res.ok) throw new Error('Failed to fetch daily sales data');
      const data = await res.json();
      console.log('Received daily sales data:', data.length, 'records');
      return data;
    },
    // تمكين الاستعلام دائمًا، بغض النظر عن الفلاتر
    // Enable query when date range is present, even if no branch selected
    enabled: Boolean(dateRange?.from && dateRange?.to)
  });
  
  // Get selected branch name
  const selectedBranch = branches.find((branch: Branch) => branch.id === selectedBranchId) || null;
  
  // Function to handle branch selection
  const handleBranchChange = (value: string) => {
    console.log('Selected branch value:', value);
    
    // إذا كان الاختيار هو "0"، استخدم القيمة 0 للدلالة على جميع الفروع
    if (value === '0') {
      console.log('Setting branch ID to 0 for All Branches');
      setSelectedBranchId(0); // استخدم 0 للدلالة على جميع الفروع
    } else {
      console.log('Setting branch ID to', parseInt(value));
      setSelectedBranchId(parseInt(value));
    }
    
    // تحديث البيانات بعد تغيير الفرع
    setTimeout(() => {
      console.log('Refreshing data after branch change. Branch ID:', parseInt(value));
      refetchDailySales();
    }, 100);
  };
  
  // Function to handle date range selection
  const handleDateRangeChange = (range: DateRange | undefined) => {
    console.log('Date range changed:', range);
    setDateRange(range);
    
    // تحديث البيانات بعد تغيير التاريخ
    if (range?.from && range?.to) {
      setTimeout(() => {
        console.log('Refreshing data after date range change');
        refetchDailySales();
      }, 100);
    }
  };
  
  // Function to handle refresh
  const handleRefresh = () => {
    refetchDailySales();
  };
  
  // Function to group sales by date for summary view
  const groupSalesByDate = () => {
    if (!dailySalesData || dailySalesData.length === 0) return {};
    
    const grouped: Record<string, SaleItem[]> = {};
    
    dailySalesData.forEach((sale: SaleItem) => {
      const dateKey = sale.date || (sale.createdAt ? format(new Date(sale.createdAt), 'yyyy-MM-dd') : 'unknown');
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      
      grouped[dateKey].push(sale);
    });
    
    return grouped;
  };
  
  // Function to calculate shift totals
  const calculateShiftTotals = (shifts: SaleItem[] | undefined): SalesTotals => {
    if (!shifts || shifts.length === 0) {
      return {
        totalCash: 0,
        totalNetwork: 0,
        totalSales: 0,
        totalDiscrepancy: 0
      };
    }
    
    console.log('Calculating shift totals from data:', shifts);
    
    const totals = shifts.reduce((acc: SalesTotals, shift: SaleItem) => {
      // استخرج القيم بشكل آمن مع التأكد من أنها أرقام - استخدم الحقول الصحيحة من API
      const cashAmount = typeof shift.totalCashSales === 'number' ? shift.totalCashSales : 
                        (shift.totalCashSales === '' ? 0 : Number(shift.totalCashSales) || 0);
      
      const networkAmount = typeof shift.totalNetworkSales === 'number' ? shift.totalNetworkSales : 
                          (shift.totalNetworkSales === '' ? 0 : Number(shift.totalNetworkSales) || 0);
      
      const totalSales = typeof shift.totalSales === 'number' ? shift.totalSales : 
                        (shift.totalSales === '' ? 0 : Number(shift.totalSales) || 0);
      
      const discrepancy = typeof shift.discrepancy === 'number' ? shift.discrepancy : 
                         (shift.discrepancy === '' ? 0 : Number(shift.discrepancy) || 0);
      
      console.log(`Shift - ID ${shift.id}: Cash=${cashAmount}, Network=${networkAmount}, TotalSales=${totalSales}, Discrepancy=${discrepancy}`);
      
      acc.totalCash += cashAmount;
      acc.totalNetwork += networkAmount;
      acc.totalSales += totalSales;  // استخدم إجمالي المبيعات المسجلة من الخادم
      acc.totalDiscrepancy += discrepancy;
      
      return acc;
    }, {
      totalCash: 0,
      totalNetwork: 0,
      totalSales: 0,
      totalDiscrepancy: 0
    });
    
    // Round to 2 decimal places for consistency
    const result = {
      totalCash: Math.round(totals.totalCash * 100) / 100,
      totalNetwork: Math.round(totals.totalNetwork * 100) / 100,
      totalSales: Math.round(totals.totalSales * 100) / 100,
      totalDiscrepancy: Math.round(totals.totalDiscrepancy * 100) / 100
    };
    
    console.log('Shift final calculated totals:', result);
    
    return result;
  };
  
  // Function to calculate daily totals
  const calculateDailyTotals = (): SalesTotals => {
    if (!dailySalesData || dailySalesData.length === 0) {
      return {
        totalCash: 0,
        totalNetwork: 0,
        totalSales: 0,
        totalDiscrepancy: 0
      };
    }
    
    console.log('Calculating totals from data:', dailySalesData);
    
    const totals = dailySalesData.reduce((acc: SalesTotals, sale: SaleItem) => {
      // استخرج القيم بشكل آمن مع التأكد من أنها أرقام - استخدم الحقول الصحيحة من API
      const cashAmount = typeof sale.totalCashSales === 'number' ? sale.totalCashSales : 
                        (sale.totalCashSales === '' ? 0 : Number(sale.totalCashSales) || 0);
      
      const networkAmount = typeof sale.totalNetworkSales === 'number' ? sale.totalNetworkSales : 
                          (sale.totalNetworkSales === '' ? 0 : Number(sale.totalNetworkSales) || 0);
      
      const totalSales = typeof sale.totalSales === 'number' ? sale.totalSales : 
                        (sale.totalSales === '' ? 0 : Number(sale.totalSales) || 0);
      
      const discrepancy = typeof sale.discrepancy === 'number' ? sale.discrepancy : 
                         (sale.discrepancy === '' ? 0 : Number(sale.discrepancy) || 0);
      
      // سجل البيانات للتصحيح
      console.log(`Sale ID ${sale.id}: Cash=${cashAmount}, Network=${networkAmount}, TotalSales=${totalSales}, Discrepancy=${discrepancy}`);
      
      acc.totalCash += cashAmount;
      acc.totalNetwork += networkAmount;
      acc.totalSales += totalSales;  // استخدم إجمالي المبيعات المسجلة من الخادم
      acc.totalDiscrepancy += discrepancy;
      
      // سجل المجاميع المتراكمة
      console.log(`Accumulated totals: Cash=${acc.totalCash}, Network=${acc.totalNetwork}, Sales=${acc.totalSales}, Discrepancy=${acc.totalDiscrepancy}`);
      
      return acc;
    }, {
      totalCash: 0,
      totalNetwork: 0,
      totalSales: 0,
      totalDiscrepancy: 0
    });
    
    // Round to 2 decimal places for consistency
    const result = {
      totalCash: Math.round(totals.totalCash * 100) / 100,
      totalNetwork: Math.round(totals.totalNetwork * 100) / 100,
      totalSales: Math.round(totals.totalSales * 100) / 100,
      totalDiscrepancy: Math.round(totals.totalDiscrepancy * 100) / 100
    };
    
    console.log('Final calculated totals:', result);
    
    return result;
  };
  
  // Calculate average discrepancy percentage
  const calculateDiscrepancyPercentage = (discrepancy: number, totalSales: number) => {
    if (totalSales === 0) return 0;
    return (discrepancy / totalSales) * 100;
  };

  const totals = calculateDailyTotals();
  const groupedSales = groupSalesByDate();
  
  // Print handler for PDF
  const handlePrintPDF = useReactToPrint({
    documentTitle: "تقرير المبيعات اليومية - باتر باكيري",
    onAfterPrint: () => console.log("تم طباعة التقرير بنجاح"),
  });
  
  return (
    <MainLayout title={t('dailyReports.title')}>
      {/* Page Header with Gradient Background */}
      <div className="mb-6 bg-gradient-to-l from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200 shadow-sm">
        <div className="flex items-center">
          <div className="mr-3 text-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{t('dailyReports.title')}</h1>
            <p className="text-sm text-gray-600">{t('dailyReports.subtitle')}</p>
          </div>
        </div>
      </div>
      
      {/* Filter Controls */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 items-start">
        <div className="w-full md:w-1/4">
          <Select 
            onValueChange={handleBranchChange}
            value={selectedBranchId?.toString() || '0'}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('dailyReports.selectBranch')} />
            </SelectTrigger>
            <SelectContent>
              {/* إضافة خيار "جميع الفروع" في بداية القائمة مع قيمة 0 */}
              <SelectItem key="all" value="0">
                جميع الفروع
              </SelectItem>
              {branches.map((branch: Branch) => (
                <SelectItem key={branch.id} value={branch.id.toString()}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="w-full md:w-2/4">
          <DatePicker 
            value={dateRange}
            onChange={handleDateRangeChange}
            className="w-full"
          />
        </div>
        
        <div className="w-full md:w-1/4 flex gap-2">
          <Button 
            variant="outline" 
            className="w-1/2"
            onClick={handleRefresh}
          >
            {t('common.refresh')}
          </Button>
          
          <PDFDownloadLink 
            document={
              <DailyReportPDF 
                data={dailySalesData} 
                branch={selectedBranch}
                dateRange={dateRange}
                totals={totals}
              />
            } 
            fileName={`daily-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`}
            className="w-1/2"
          >
            {({ loading }) => (
              <Button disabled={loading || dailySalesData.length === 0}>
                {loading ? t('common.preparing') : t('common.downloadPDF')}
              </Button>
            )}
          </PDFDownloadLink>
        </div>
      </div>
      
      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 w-full sm:w-auto">
          <TabsTrigger value="summary">{t('dailyReports.summaryTab')}</TabsTrigger>
          <TabsTrigger value="details">{t('dailyReports.detailsTab')}</TabsTrigger>
        </TabsList>
        
        {/* Summary Tab */}
        <TabsContent value="summary">
          <Card>
            <CardContent className="p-6">
              {isLoadingDailySales ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-64 w-full" />
                  <Skeleton className="h-48 w-full" />
                </div>
              ) : dailySalesData.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto h-12 w-12 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">{t('dailyReports.noData')}</h3>
                  <p className="mt-1 text-sm text-gray-500">{t('dailyReports.selectFilters')}</p>
                </div>
              ) : (
                <div ref={summaryRef}>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {/* Total Sales */}
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 bg-green-100 p-3 rounded-full">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="mr-4">
                          <p className="text-sm font-medium text-gray-500">{t('dailyReports.totalSales')}</p>
                          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totals.totalSales)}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Cash Sales */}
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 bg-blue-100 p-3 rounded-full">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <div className="mr-4">
                          <p className="text-sm font-medium text-gray-500">{t('dailySales.cashAmount')}</p>
                          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totals.totalCash)}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Network Sales */}
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 bg-purple-100 p-3 rounded-full">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                        </div>
                        <div className="mr-4">
                          <p className="text-sm font-medium text-gray-500">{t('dailySales.networkAmount')}</p>
                          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totals.totalNetwork)}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Discrepancy */}
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                      <div className="flex items-center">
                        <div className={cn(
                          "flex-shrink-0 p-3 rounded-full",
                          totals.totalDiscrepancy < 0 ? "bg-red-100" : 
                          totals.totalDiscrepancy > 0 ? "bg-yellow-100" : 
                          "bg-gray-100"
                        )}>
                          <svg xmlns="http://www.w3.org/2000/svg" className={cn(
                            "h-6 w-6",
                            totals.totalDiscrepancy < 0 ? "text-red-600" : 
                            totals.totalDiscrepancy > 0 ? "text-yellow-600" : 
                            "text-gray-600"
                          )} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <div className="mr-4">
                          <p className="text-sm font-medium text-gray-500">{t('dailyReports.discrepancy')}</p>
                          <div className="flex items-center">
                            <p className={cn(
                              "text-2xl font-bold",
                              totals.totalDiscrepancy < 0 ? "text-red-600" : 
                              totals.totalDiscrepancy > 0 ? "text-green-600" : 
                              "text-gray-600"
                            )}>
                              {formatCurrency(totals.totalDiscrepancy)}
                            </p>
                            {totals.totalDiscrepancy > 0 && (
                              <span className="mr-2 text-xs text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full mr-2">
                                {t('dailyReports.cashExcess')}
                              </span>
                            )}
                            {totals.totalDiscrepancy < 0 && (
                              <span className="mr-2 text-xs text-red-700 bg-red-100 px-1.5 py-0.5 rounded-full mr-2">
                                {t('dailyReports.cashShortage')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Summary Table */}
                  <div className="mb-8">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">{t('dailyReports.dailySummary')}</h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('dailyReports.date')}</TableHead>
                            <TableHead>{t('dailyReports.shiftsCount')}</TableHead>
                            <TableHead>{t('dailySales.cashAmount')}</TableHead>
                            <TableHead>{t('dailySales.networkAmount')}</TableHead>
                            <TableHead>{t('dailyReports.totalAmount')}</TableHead>
                            <TableHead>{t('dailyReports.discrepancy')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(groupedSales).map(([date, shifts]) => {
                            const shiftTotals = calculateShiftTotals(shifts);
                            
                            return (
                              <TableRow key={date}>
                                <TableCell className="font-medium">{date !== 'unknown' ? format(new Date(date), 'yyyy-MM-dd') : 'غير محدد'}</TableCell>
                                <TableCell>{shifts.length}</TableCell>
                                <TableCell>{formatCurrency(shiftTotals.totalCash)}</TableCell>
                                <TableCell>{formatCurrency(shiftTotals.totalNetwork)}</TableCell>
                                <TableCell className="font-semibold">{formatCurrency(shiftTotals.totalCash + shiftTotals.totalNetwork)}</TableCell>
                                <TableCell className={cn(
                                  "font-medium",
                                  shiftTotals.totalDiscrepancy < 0 ? "text-red-600" : 
                                  shiftTotals.totalDiscrepancy > 0 ? "text-yellow-600" : 
                                  "text-gray-600"
                                )}>
                                  {formatCurrency(shiftTotals.totalDiscrepancy)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  
                  {/* Discrepancy Analysis */}
                  <div className="mb-8">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">{t('dailyReports.discrepancyAnalysis')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Discrepancy Percentage Card */}
                      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                        <h4 className="text-sm font-medium text-gray-600 mb-2">{t('dailyReports.discrepancyPercentage')}</h4>
                        <div className="flex items-end space-x-2 mb-4">
                          <span className={cn(
                            "text-3xl font-bold",
                            calculateDiscrepancyPercentage(totals.totalDiscrepancy, totals.totalSales) < -1 ? "text-red-600" :
                            calculateDiscrepancyPercentage(totals.totalDiscrepancy, totals.totalSales) > 1 ? "text-yellow-600" :
                            "text-green-600"
                          )}>
                            {Math.abs(calculateDiscrepancyPercentage(totals.totalDiscrepancy, totals.totalSales)).toFixed(2)}%
                          </span>
                          <span className="text-sm text-gray-500">
                            {totals.totalDiscrepancy < 0 ? t('dailyReports.shortage') : t('dailyReports.surplus')}
                          </span>
                        </div>
                        <Progress value={Math.min(Math.abs(calculateDiscrepancyPercentage(totals.totalDiscrepancy, totals.totalSales)), 10) * 10} 
                          className={cn(
                            "h-2",
                            calculateDiscrepancyPercentage(totals.totalDiscrepancy, totals.totalSales) < -1 ? "bg-red-200" :
                            calculateDiscrepancyPercentage(totals.totalDiscrepancy, totals.totalSales) > 1 ? "bg-yellow-200" :
                            "bg-green-200"
                          )}
                          indicatorClassName={cn(
                            calculateDiscrepancyPercentage(totals.totalDiscrepancy, totals.totalSales) < -1 ? "bg-red-600" :
                            calculateDiscrepancyPercentage(totals.totalDiscrepancy, totals.totalSales) > 1 ? "bg-yellow-600" :
                            "bg-green-600"
                          )}
                        />
                        <p className="text-sm text-gray-500 mt-2">
                          {calculateDiscrepancyPercentage(totals.totalDiscrepancy, totals.totalSales) < -1 ? 
                            t('dailyReports.highDiscrepancyWarning') : 
                            calculateDiscrepancyPercentage(totals.totalDiscrepancy, totals.totalSales) > 1 ?
                              t('dailyReports.surplusWarning') :
                              t('dailyReports.healthyBalance')
                          }
                        </p>
                      </div>
                      
                      {/* Discrepancy Over Time */}
                      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                        <h4 className="text-sm font-medium text-gray-600 mb-2">{t('dailyReports.discrepancyOverTime')}</h4>
                        <div className="h-40 flex items-end space-x-1">
                          {Object.entries(groupedSales).map(([date, shifts]) => {
                            const shiftTotals = calculateShiftTotals(shifts);
                            const height = Math.min(Math.abs(calculateDiscrepancyPercentage(shiftTotals.totalDiscrepancy, shiftTotals.totalSales)) * 4, 100);
                            
                            return (
                              <div key={date} className="flex flex-col items-center flex-1">
                                <div className="w-full flex justify-center mb-1">
                                  <div 
                                    className={cn(
                                      "w-full max-w-[30px]",
                                      shiftTotals.totalDiscrepancy < 0 ? "bg-red-500" : 
                                      shiftTotals.totalDiscrepancy > 0 ? "bg-yellow-500" : 
                                      "bg-green-500"
                                    )}
                                    style={{ height: `${height}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-500 whitespace-nowrap overflow-hidden text-ellipsis w-full text-center">
                                  {date !== 'unknown' ? format(new Date(date), 'dd/MM') : 'غ/م'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Signature Section */}
                  <div className="mt-10 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">{t('dailyReports.signatures')}</h3>
                    <div className="flex flex-col md:flex-row justify-between gap-8">
                      <div className="flex-1">
                        <p className="text-sm mb-6">{t('dailyReports.accountant')}:</p>
                        <div className="border-b"></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm mb-6">{t('dailyReports.branchManager')}:</p>
                        <div className="border-b"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Details Tab */}
        <TabsContent value="details">
          <Card>
            <CardContent className="p-6">
              {isLoadingDailySales ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-64 w-full" />
                </div>
              ) : dailySalesData.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto h-12 w-12 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">{t('dailyReports.noData')}</h3>
                  <p className="mt-1 text-sm text-gray-500">{t('dailyReports.selectFilters')}</p>
                </div>
              ) : (
                <div ref={detailsRef}>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">{t('dailyReports.shiftDetails')}</h3>
                  
                  {/* Detailed Table */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('dailyReports.date')}</TableHead>
                          <TableHead>{t('dailyReports.time')}</TableHead>
                          <TableHead>{t('dailyReports.cashier')}</TableHead>
                          <TableHead>{t('dailyReports.shiftType')}</TableHead>
                          <TableHead>{t('dailySales.cashAmount')}</TableHead>
                          <TableHead>{t('dailySales.networkAmount')}</TableHead>
                          <TableHead>{t('dailyReports.totalAmount')}</TableHead>
                          <TableHead>{t('dailyReports.discrepancy')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dailySalesData.map((sale: SaleItem) => (
                          <TableRow key={sale.id}>
                            <TableCell>
                              {sale.date ? format(new Date(sale.date), 'yyyy-MM-dd') : 
                               sale.createdAt ? format(new Date(sale.createdAt), 'yyyy-MM-dd') : '-'}
                            </TableCell>
                            <TableCell>
                              {sale.createdAt ? format(new Date(sale.createdAt), 'hh:mm a') : 'غير متوفر'}
                            </TableCell>
                            <TableCell>
                              {sale.cashierName || t('dailyReports.unknown')}
                            </TableCell>
                            <TableCell>
                              {sale.shiftType === 'morning' ? t('dailySales.morningShift') : 
                               sale.shiftType === 'evening' ? t('dailySales.eveningShift') : 
                               t('dailyReports.notSpecified')}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(sale.cashAmount || 0)}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(sale.networkAmount || 0)}
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{formatCurrency((sale.cashAmount || 0) + (sale.networkAmount || 0))}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <span className={cn(
                                  "font-medium",
                                  (sale.discrepancy || 0) < 0 ? "text-red-600" : 
                                  (sale.discrepancy || 0) > 0 ? "text-green-600" : 
                                  "text-gray-600"
                                )}>
                                  {formatCurrency(sale.discrepancy || 0)}
                                </span>
                                {(sale.discrepancy || 0) > 0 && (
                                  <span className="mr-2 text-xs text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full mr-2">
                                    {t('dailyReports.cashExcess')}
                                  </span>
                                )}
                                {(sale.discrepancy || 0) < 0 && (
                                  <span className="mr-2 text-xs text-red-700 bg-red-100 px-1.5 py-0.5 rounded-full mr-2">
                                    {t('dailyReports.cashShortage')}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Signature Section for the Details page */}
                  <div className="mt-10 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">{t('dailyReports.signatures')}</h3>
                    <div className="flex flex-col md:flex-row justify-between gap-8">
                      <div className="flex-1">
                        <p className="text-sm mb-6">{t('dailyReports.accountant')}:</p>
                        <div className="border-b"></div>
                      </div>
                      <div>
                        <p className="text-sm mb-6">{t('dailyReports.branchManager')}:</p>
                        <div className="border-b"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}