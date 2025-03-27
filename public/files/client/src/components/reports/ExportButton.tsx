import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DownloadIcon, 
  FileSpreadsheetIcon,
  FileTextIcon,
  PrinterIcon,
  LoaderIcon,
  FileIcon
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup
} from '@/components/ui/dropdown-menu';
import { useTranslation } from 'react-i18next';
import { ExportableData, ExportConfig, exportData, exportToPdf } from './ExportUtils';
import { toast } from '@/hooks/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ExportButtonProps {
  data: ExportableData;
  config: ExportConfig;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  disabled?: boolean;
}

const ExportButton: React.FC<ExportButtonProps> = ({ 
  data, 
  config, 
  className = '', 
  variant = 'default',
  disabled = false
}) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  
  // معالجة فتح مربع حوار الطباعة
  const handlePrintClick = () => {
    setShowPrintDialog(true);
  };
  
  // معالجة الطباعة من مربع الحوار
  const handlePrintConfirm = () => {
    try {
      // إغلاق مربع الحوار
      setShowPrintDialog(false);
      
      // عرض توجيهات للمستخدم
      toast({
        title: "جاري فتح نافذة الطباعة",
        description: "سيتم فتح نافذة طباعة مباشرة مع معاينة التقرير.",
        variant: 'default',
        duration: 3000 // عرض لمدة 3 ثوان
      });
      
      // استخدام الطباعة المباشرة من النافذة بدلاً من تنزيل PDF
      handleExportWithPrinting('pdf', true);
    } catch (error) {
      console.error("Error in print confirmation:", error);
      toast({
        title: "خطأ في الطباعة",
        description: "حدث خطأ أثناء محاولة فتح نافذة الطباعة. سيتم محاولة استخدام الطريقة البديلة.",
        variant: 'destructive'
      });
      // محاولة تحميل الملف بدلاً من الطباعة في حالة الخطأ
      handleExport('pdf');
    }
  };
  
  // معالجة تصدير البيانات مع خيار الطباعة
  const handleExportWithPrinting = async (
    format: 'pdf' | 'excel' | 'arabic-pdf',
    print: boolean = false
  ) => {
    if (disabled || isLoading || !data || data.length === 0) return;
    
    try {
      setIsLoading(true);
      
      // تأخير قصير لعرض حالة التحميل
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // تعديل اسم الملف ليشمل التاريخ الحالي للتحسين
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const enhancedConfig = {
        ...config,
        fileName: `${config.fileName}_${dateStr}`
      };
      
      // معالجة خاصة للبيانات قبل التصدير - تبسيط التوقيعات
      const processedData = data.map(item => {
        const newItem = { ...item };
        // تبسيط حقول التوقيع للتعامل بشكل أفضل في PDF
        if (newItem.signature && typeof newItem.signature === 'string' && 
            (newItem.signature.startsWith('data:image') || newItem.signature.length > 200)) {
          newItem.signature = '✓ تم التوقيع';
        }
        return newItem;
      });
      
      // تصدير البيانات حسب التنسيق المطلوب
      if (format === 'pdf') {
        exportToPdf(processedData, enhancedConfig);
      } else if (format === 'excel') {
        exportData(processedData, enhancedConfig, 'excel');
      } else if (format === 'arabic-pdf') {
        // استخدام PDF عادي بدلاً من PDF عربي
        exportToPdf(processedData, enhancedConfig);
      }
      
      // عرض رسالة نجاح
      toast({
        title: print ? "تم فتح نافذة الطباعة" : t('common.exportSuccess'),
        description: print ? "تم فتح نافذة الطباعة مباشرة. تأكد من تحديد الإعدادات المناسبة قبل الطباعة." : t('common.exportSuccessDescription', { type: format === 'arabic-pdf' ? 'PDF (Arabic)' : format.toUpperCase() }),
        variant: 'default'
      });
    } catch (error) {
      console.error('Error during export:', error);
      
      // عرض رسالة خطأ
      toast({
        title: t('common.exportError'),
        description: t('common.exportErrorDescription'),
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // مختصر لمعالجة التصدير بدون طباعة
  const handleExport = (format: 'pdf' | 'excel' | 'arabic-pdf') => {
    handleExportWithPrinting(format, false);
  };
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size="sm"
            className={cn("gap-2 relative bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-md shadow-md transition-all duration-200 ease-in-out transform hover:-translate-y-1 hover:shadow-lg", className)}
            disabled={disabled || isLoading || !data || data.length === 0}
            title="تصدير التقرير"
          >
            {isLoading ? <LoaderIcon className="h-5 w-5 animate-spin" /> : <DownloadIcon className="h-5 w-5" />}
            <span className="font-semibold text-sm">
              {isLoading ? t('common.preparing') : "تصدير التقرير"}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[250px] border-blue-100 shadow-md">
          <DropdownMenuLabel className="text-center font-bold text-blue-800 bg-blue-50 rounded-t-sm py-2">
            خيارات التصدير والطباعة
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuGroup>
            <DropdownMenuItem 
              onClick={() => handleExport('pdf')}
              className="gap-2 items-center cursor-pointer hover:bg-blue-50 p-3 transition-all duration-150 rounded-md my-1 mx-1"
            >
              <div className="bg-blue-100 p-2 rounded-full">
                <FileTextIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">تقرير PDF</span>
                <span className="text-xs text-gray-500">تقرير احترافي يتضمن التاريخ والوقت</span>
              </div>
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              onClick={() => handleExport('excel')}
              className="gap-2 items-center cursor-pointer hover:bg-green-50 p-3 transition-all duration-150 rounded-md my-1 mx-1"
            >
              <div className="bg-green-100 p-2 rounded-full">
                <FileSpreadsheetIcon className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">ملف Excel</span>
                <span className="text-xs text-gray-500">بيانات قابلة للتحرير والتحليل</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          
          <DropdownMenuSeparator className="mb-1" />
          
          <DropdownMenuItem 
            onClick={handlePrintClick}
            className="gap-2 items-center cursor-pointer hover:bg-purple-50 p-3 transition-all duration-150 rounded-md my-1 mx-1"
          >
            <div className="bg-purple-100 p-2 rounded-full">
              <PrinterIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">طباعة مباشرة</span>
              <span className="text-xs text-gray-500">معاينة وطباعة مباشرة من المتصفح</span>
            </div>
          </DropdownMenuItem>
          
          <div className="p-3 text-xs font-medium text-gray-600 bg-gradient-to-r from-gray-50 to-blue-50 rounded-b-sm text-center border-t border-gray-100">
            <span className="flex items-center justify-center gap-1">
              <FileIcon className="h-3 w-3 text-gray-500" /> 
              جميع التقارير تتضمن التاريخ والوقت وتفاصيل الفرع
            </span>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* مربع حوار تحديد صفحات الطباعة */}
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>خيارات الطباعة المباشرة</DialogTitle>
            <DialogDescription>
              ستفتح نافذة طباعة مباشرة من المتصفح بدلاً من تنزيل ملف PDF
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-center py-2">
              <div className="bg-purple-100 p-3 rounded-full">
                <PrinterIcon className="h-10 w-10 text-purple-600" />
              </div>
            </div>
            <div className="text-sm text-muted-foreground pr-4 bg-accent/30 p-2 rounded-md">
              <p>
                ستفتح نافذة المعاينة للطباعة مباشرة في المتصفح، مع عرض التقرير بتنسيق
                أنيق وإمكانية تعديل خيارات الطباعة من خلال نافذة المتصفح القياسية.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowPrintDialog(false)}
              className="border-gray-300 hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-md transition-all duration-200 ease-in-out flex items-center gap-2"
            >
              <span className="font-medium text-sm">إلغاء</span>
            </Button>
            <Button 
              type="button" 
              onClick={handlePrintConfirm}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2 rounded-md shadow-md transition-all duration-200 ease-in-out gap-2 flex items-center"
            >
              <PrinterIcon className="h-5 w-5" />
              <span className="font-semibold text-sm">طباعة</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ExportButton;