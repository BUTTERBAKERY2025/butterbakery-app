import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  PlusCircle, 
  Banknote, 
  CreditCard, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar as CalendarIcon,
  Check,
  X
} from 'lucide-react';

import { queryClient } from '@/lib/queryClient';
import { reshapeArabicText } from '@/lib/arabicTextUtils';

// Cash Box - صندوق النقدية
export default function CashBox() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('transactions');
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [isCreateTransactionOpen, setIsCreateTransactionOpen] = useState(false);
  const [isCreateTransferOpen, setIsCreateTransferOpen] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  
  // الاستعلام عن الفروع
  const { data: branches, isLoading: branchesLoading } = useQuery({
    queryKey: ['/api/branches'],
    enabled: true,
  });
  
  // اختيار أول فرع افتراضيًا عند تحميل الفروع
  useEffect(() => {
    if (branches && branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);
  
  // إعادة تحميل البيانات عند تغيير الفرع المحدد
  useEffect(() => {
    if (selectedBranchId) {
      // تحديث البيانات عند تغيير الفرع
      queryClient.invalidateQueries({ queryKey: ['/api/cash-box', selectedBranchId] });
      queryClient.invalidateQueries({ queryKey: ['/api/cash-box', selectedBranchId, 'transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cash-box', selectedBranchId, 'transfers'] });
      
      console.log(`تحديث بيانات الصندوق للفرع رقم ${selectedBranchId}`);
    }
  }, [selectedBranchId]);
  
  // الاستعلام عن صندوق النقدية
  const { data: cashBox, isLoading: cashBoxLoading } = useQuery({
    queryKey: ['/api/cash-box', selectedBranchId],
    queryFn: async () => {
      if (!selectedBranchId) return null;
      const response = await fetch(`/api/cash-box/${selectedBranchId}`);
      if (!response.ok) throw new Error('فشل في جلب بيانات الصندوق');
      const data = await response.json();
      return data?.data || data;
    },
    enabled: !!selectedBranchId,
  });
  
  // الاستعلام عن معاملات صندوق النقدية
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['/api/cash-box', selectedBranchId, 'transactions', isFiltering ? format(startDate, 'yyyy-MM-dd') : null, isFiltering ? format(endDate, 'yyyy-MM-dd') : null],
    queryFn: async () => {
      if (!selectedBranchId) return null;
      
      let url = `/api/cash-box/${selectedBranchId}/transactions`;
      
      // إضافة معلمات التصفية بالتاريخ إذا كانت التصفية مفعلة
      if (isFiltering && startDate && endDate) {
        const params = new URLSearchParams({
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd')
        });
        url = `${url}?${params.toString()}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('فشل في جلب بيانات المعاملات');
      const data = await response.json();
      return data?.data || data;
    },
    enabled: !!selectedBranchId,
  });
  
  // الاستعلام عن التحويلات النقدية للمركز الرئيسي
  const { data: transfers, isLoading: transfersLoading } = useQuery({
    queryKey: ['/api/cash-box', selectedBranchId, 'transfers', isFiltering ? format(startDate, 'yyyy-MM-dd') : null, isFiltering ? format(endDate, 'yyyy-MM-dd') : null],
    queryFn: async () => {
      if (!selectedBranchId) return null;
      
      let url = `/api/cash-box/${selectedBranchId}/transfers`;
      
      // إضافة معلمات التصفية بالتاريخ إذا كانت التصفية مفعلة
      if (isFiltering && startDate && endDate) {
        const params = new URLSearchParams({
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd')
        });
        url = `${url}?${params.toString()}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('فشل في جلب بيانات التحويلات');
      const data = await response.json();
      return data?.data || data;
    },
    enabled: !!selectedBranchId,
  });
  
  // إنشاء معاملة صندوق نقدية جديدة
  const handleCreateTransaction = async (data: any) => {
    try {
      const response = await fetch('/api/cash-box/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('حدث خطأ أثناء إنشاء المعاملة');
      }
      
      toast({
        title: 'تم إنشاء المعاملة بنجاح',
        description: `تمت إضافة معاملة ${data.type === 'deposit' ? 'إيداع' : 'سحب'} بمبلغ ${data.amount} بنجاح`,
      });
      
      // تحديث البيانات
      queryClient.invalidateQueries({ queryKey: ['/api/cash-box', selectedBranchId] });
      queryClient.invalidateQueries({ queryKey: ['/api/cash-box', selectedBranchId, 'transactions'] });
      
      setIsCreateTransactionOpen(false);
    } catch (error) {
      console.error('خطأ في إنشاء المعاملة:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إنشاء المعاملة، يرجى المحاولة مرة أخرى',
        variant: 'destructive',
      });
    }
  };
  
  // إنشاء تحويل نقدي للمركز الرئيسي
  const handleCreateTransfer = async (data: any) => {
    try {
      const response = await fetch('/api/cash-box/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('حدث خطأ أثناء إنشاء التحويل');
      }
      
      toast({
        title: 'تم إنشاء التحويل بنجاح',
        description: `تم إنشاء تحويل نقدي للمركز الرئيسي بمبلغ ${data.amount} بنجاح`,
      });
      
      // تحديث البيانات
      queryClient.invalidateQueries({ queryKey: ['/api/cash-box', selectedBranchId] });
      queryClient.invalidateQueries({ queryKey: ['/api/cash-box', selectedBranchId, 'transfers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cash-box', selectedBranchId, 'transactions'] });
      
      setIsCreateTransferOpen(false);
    } catch (error) {
      console.error('خطأ في إنشاء التحويل:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إنشاء التحويل، يرجى المحاولة مرة أخرى',
        variant: 'destructive',
      });
    }
  };

  // إذا كانت البيانات قيد التحميل، عرض رسالة تحميل
  if (branchesLoading || (selectedBranchId && cashBoxLoading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-primary border-solid rounded-full border-t-transparent animate-spin"></div>
        <p className="mt-4 text-lg">جاري تحميل البيانات...</p>
      </div>
    );
  }
  
  // إذا لم يكن هناك فروع، عرض رسالة
  if (!branches || branches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-xl">لا توجد فروع متاحة</p>
      </div>
    );
  }
  
  // الفرع المحدد
  const selectedBranch = branches.find((branch: any) => branch.id === selectedBranchId);
  
  return (
    <MainLayout title="صندوق النقدية">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">صندوق النقدية</h1>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDateFilterOpen(!isDateFilterOpen)}
            className="ml-2"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            تصفية بالتاريخ
          </Button>
          <Select
            value={selectedBranchId?.toString()}
            onValueChange={(value) => setSelectedBranchId(parseInt(value))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="اختر الفرع" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch: any) => (
                <SelectItem key={branch.id} value={branch.id.toString()}>
                  {reshapeArabicText(branch.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {isDateFilterOpen && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">تصفية بالتاريخ</CardTitle>
            <CardDescription>حدد نطاق التاريخ لعرض البيانات</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 rtl:space-x-reverse">
              <div className="flex flex-col space-y-2">
                <Label>من تاريخ</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {format(startDate, 'yyyy-MM-dd')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex flex-col space-y-2">
                <Label>إلى تاريخ</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {format(endDate, 'yyyy-MM-dd')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && setEndDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={() => {
                    setIsFiltering(true);
                    // Call API to filter by date
                    queryClient.invalidateQueries({ 
                      queryKey: ['/api/cash-box', selectedBranchId, 'transactions', 
                                format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')] 
                    });
                    queryClient.invalidateQueries({ 
                      queryKey: ['/api/cash-box', selectedBranchId, 'transfers', 
                                format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')] 
                    });
                  }}
                >
                  تطبيق التصفية
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">رصيد الصندوق</CardTitle>
            <CardDescription>الرصيد الحالي في صندوق النقدية</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Wallet className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {cashBox ? cashBox.balance.toLocaleString() : 0} ريال
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">الإيداعات</CardTitle>
            <CardDescription>إجمالي الإيداعات النقدية</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <ArrowDownLeft className="mr-2 h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold text-green-500">
                {transactions
                  ? transactions
                      .filter((t: any) => t.type === 'deposit')
                      .reduce((sum: number, t: any) => sum + t.amount, 0)
                      .toLocaleString()
                  : 0} ريال
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">السحوبات والتحويلات</CardTitle>
            <CardDescription>إجمالي المبالغ المخرجة من الصندوق</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <ArrowUpRight className="mr-2 h-4 w-4 text-red-500" />
              <span className="text-2xl font-bold text-red-500">
                {transactions
                  ? transactions
                      .filter((t: any) => t.type === 'withdrawal' || t.type === 'transfer_to_hq')
                      .reduce((sum: number, t: any) => sum + t.amount, 0)
                      .toLocaleString()
                  : 0} ريال
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex justify-end gap-4 mb-4">
        <Button variant="outline" onClick={() => setIsCreateTransactionOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> إنشاء معاملة
        </Button>
        <Button onClick={() => setIsCreateTransferOpen(true)}>
          <Banknote className="mr-2 h-4 w-4" /> تحويل للمركز الرئيسي
        </Button>
      </div>
      
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transactions">معاملات الصندوق</TabsTrigger>
          <TabsTrigger value="transfers">التحويلات للمركز الرئيسي</TabsTrigger>
        </TabsList>
        
        <TabsContent value="transactions">
          {transactionsLoading ? (
            <div className="flex justify-center p-4">
              <div className="w-8 h-8 border-4 border-primary border-solid rounded-full border-t-transparent animate-spin"></div>
            </div>
          ) : !transactions || transactions.length === 0 ? (
            <div className="text-center p-8">
              <p className="mb-4">لا توجد معاملات في صندوق النقدية</p>
              <Button variant="outline" onClick={() => setIsCreateTransactionOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> إنشاء معاملة جديدة
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableCaption>معاملات صندوق النقدية للفرع {reshapeArabicText(selectedBranch?.name)}</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>المصدر</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>الملاحظات</TableHead>
                    <TableHead>المرجع</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction: any) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{format(new Date(transaction.date), 'yyyy-MM-dd')}</TableCell>
                      <TableCell>
                        {transaction.type === 'deposit' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <ArrowDownLeft className="mr-1 h-3 w-3" /> إيداع
                          </span>
                        ) : transaction.type === 'withdrawal' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <ArrowUpRight className="mr-1 h-3 w-3" /> سحب
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <Banknote className="mr-1 h-3 w-3" /> تحويل
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {transaction.source === 'daily_sales' ? 'مبيعات يومية' : 
                         transaction.source === 'manual' ? 'يدوي' : 
                         transaction.source === 'transfer' ? 'تحويل' : transaction.source}
                      </TableCell>
                      <TableCell className={
                        transaction.type === 'deposit' 
                          ? 'text-green-600 font-medium' 
                          : 'text-red-600 font-medium'
                      }>
                        {transaction.type === 'deposit' ? '+' : '-'}{transaction.amount.toLocaleString()} ريال
                      </TableCell>
                      <TableCell>{reshapeArabicText(transaction.notes || '-')}</TableCell>
                      <TableCell>{transaction.referenceNumber || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="transfers">
          {transfersLoading ? (
            <div className="flex justify-center p-4">
              <div className="w-8 h-8 border-4 border-primary border-solid rounded-full border-t-transparent animate-spin"></div>
            </div>
          ) : !transfers || transfers.length === 0 ? (
            <div className="text-center p-8">
              <p className="mb-4">لا توجد تحويلات نقدية للمركز الرئيسي</p>
              <Button onClick={() => setIsCreateTransferOpen(true)}>
                <Banknote className="mr-2 h-4 w-4" /> إنشاء تحويل جديد
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableCaption>التحويلات النقدية للمركز الرئيسي من فرع {reshapeArabicText(selectedBranch?.name)}</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>وسيلة التحويل</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الملاحظات</TableHead>
                    <TableHead>المرجع</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer: any) => (
                    <TableRow key={transfer.id}>
                      <TableCell>{format(new Date(transfer.date), 'yyyy-MM-dd')}</TableCell>
                      <TableCell className="font-medium">{transfer.amount.toLocaleString()} ريال</TableCell>
                      <TableCell>
                        {transfer.transferMethod === 'bank_transfer' ? 'تحويل بنكي' : 
                         transfer.transferMethod === 'cash' ? 'نقدي' : 
                         transfer.transferMethod === 'cheque' ? 'شيك' : transfer.transferMethod}
                      </TableCell>
                      <TableCell>
                        {transfer.status === 'pending' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            قيد الانتظار
                          </span>
                        ) : transfer.status === 'approved' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Check className="mr-1 h-3 w-3" /> مقبول
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <X className="mr-1 h-3 w-3" /> مرفوض
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{reshapeArabicText(transfer.notes || '-')}</TableCell>
                      <TableCell>{transfer.referenceNumber || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* حوار إنشاء معاملة صندوق نقدية */}
      <TransactionDialog 
        open={isCreateTransactionOpen} 
        onOpenChange={setIsCreateTransactionOpen}
        onSubmit={handleCreateTransaction}
        branchId={selectedBranchId || 0}
        cashBoxId={cashBox?.id || 0}
      />
      
      {/* حوار إنشاء تحويل نقدي للمركز الرئيسي */}
      <TransferDialog 
        open={isCreateTransferOpen} 
        onOpenChange={setIsCreateTransferOpen}
        onSubmit={handleCreateTransfer}
        branchId={selectedBranchId || 0}
        cashBoxId={cashBox?.id || 0}
      />
    </MainLayout>
  );
}

// مكون حوار إنشاء معاملة صندوق نقدية
function TransactionDialog({ 
  open, 
  onOpenChange, 
  onSubmit,
  branchId,
  cashBoxId
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  branchId: number;
  cashBoxId: number;
}) {
  const [amount, setAmount] = useState<string>('');
  const [type, setType] = useState<string>('deposit');
  const [source, setSource] = useState<string>('manual');
  const [notes, setNotes] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return;
    }
    
    onSubmit({
      branchId,
      cashBoxId,
      amount: parseFloat(amount),
      type,
      source,
      notes,
      createdBy: 1, // يجب استبداله بمعرف المستخدم الحالي
      date: format(date, 'yyyy-MM-dd')
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>إنشاء معاملة صندوق نقدية</DialogTitle>
          <DialogDescription>
            أدخل تفاصيل المعاملة النقدية أدناه
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                نوع المعاملة
              </Label>
              <Select
                value={type}
                onValueChange={setType}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="اختر نوع المعاملة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">إيداع</SelectItem>
                  <SelectItem value="withdrawal">سحب</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="source" className="text-right">
                المصدر
              </Label>
              <Select
                value={source}
                onValueChange={setSource}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="اختر مصدر المعاملة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">يدوي</SelectItem>
                  <SelectItem value="daily_sales">مبيعات يومية</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                المبلغ
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="col-span-3"
                placeholder="أدخل المبلغ"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                التاريخ
              </Label>
              <div className="col-span-3">
                <div className="relative">
                  <Input
                    id="date"
                    type="text"
                    value={format(date, 'yyyy-MM-dd')}
                    readOnly
                    className="pl-10"
                  />
                  <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                </div>
                <div className="mt-2">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(date) => date && setDate(date)}
                    locale={ar}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                ملاحظات
              </Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="col-span-3"
                placeholder="أدخل ملاحظات إضافية (اختياري)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">إنشاء المعاملة</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// مكون حوار إنشاء تحويل نقدي للمركز الرئيسي
function TransferDialog({ 
  open, 
  onOpenChange, 
  onSubmit,
  branchId,
  cashBoxId
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  branchId: number;
  cashBoxId: number;
}) {
  const [amount, setAmount] = useState<string>('');
  const [transferMethod, setTransferMethod] = useState<string>('bank_transfer');
  const [notes, setNotes] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return;
    }
    
    onSubmit({
      branchId,
      cashBoxId,
      amount: parseFloat(amount),
      transferMethod,
      notes,
      createdBy: 1, // يجب استبداله بمعرف المستخدم الحالي
      date: format(date, 'yyyy-MM-dd')
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>إنشاء تحويل نقدي للمركز الرئيسي</DialogTitle>
          <DialogDescription>
            أدخل تفاصيل التحويل النقدي أدناه
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                المبلغ
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="col-span-3"
                placeholder="أدخل المبلغ"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="transferMethod" className="text-right">
                وسيلة التحويل
              </Label>
              <Select
                value={transferMethod}
                onValueChange={setTransferMethod}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="اختر وسيلة التحويل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                  <SelectItem value="cash">نقدي</SelectItem>
                  <SelectItem value="cheque">شيك</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                التاريخ
              </Label>
              <div className="col-span-3">
                <div className="relative">
                  <Input
                    id="date"
                    type="text"
                    value={format(date, 'yyyy-MM-dd')}
                    readOnly
                    className="pl-10"
                  />
                  <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                </div>
                <div className="mt-2">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(date) => date && setDate(date)}
                    locale={ar}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                ملاحظات
              </Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="col-span-3"
                placeholder="أدخل ملاحظات إضافية (اختياري)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">إنشاء التحويل</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}