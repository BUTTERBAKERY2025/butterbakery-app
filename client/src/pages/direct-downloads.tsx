import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  FileIcon, 
  DownloadIcon, 
  FileTextIcon, 
  ServerIcon, 
  GithubIcon,
  CheckCircleIcon,
  AlertCircleIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DownloadFile {
  name: string;
  size: number;
  created: string;
  modified: string;
  url: string;
}

interface DownloadOption {
  name: string;
  url: string;
  description: string;
}

export default function DirectDownloads() {
  const [files, setFiles] = useState<DownloadFile[]>([]);
  const [options, setOptions] = useState<DownloadOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<{[key: string]: 'pending' | 'success' | 'error'}>({});
  
  const { toast } = useToast();

  useEffect(() => {
    // Fetch available files for download
    fetch('/download/list')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch download list');
        }
        return response.json();
      })
      .then(data => {
        setFiles(data.files || []);
        setOptions(data.downloadOptions || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching download list:', err);
        setError('Cannot fetch download list. Download system may not be ready yet.');
        setLoading(false);
      });
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = (url: string, name: string) => {
    setDownloadStatus({ ...downloadStatus, [name]: 'pending' });

    // Create a new link element
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', ''); // This helps in some browsers
    link.target = '_blank'; // Open in a new tab
    
    // Append to the document
    document.body.appendChild(link);
    
    // Trigger click event
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    
    toast({
      title: "Download Started",
      description: `${name} download has been initiated.`,
    });

    // Set a success status after a short delay (to give visual feedback)
    setTimeout(() => {
      setDownloadStatus({ ...downloadStatus, [name]: 'success' });
    }, 1500);
  };

  const handleDirectLink = (url: string) => {
    window.open(url, '_blank');
  };

  // Utility function to get icon for download status
  const getStatusIcon = (name: string) => {
    const status = downloadStatus[name];
    if (status === 'success') {
      return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
    } else if (status === 'pending') {
      return <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-blue-500 animate-spin"></div>;
    } else if (status === 'error') {
      return <AlertCircleIcon className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center h-64">
          <div className="h-8 w-8 rounded-full border-4 border-t-transparent border-primary animate-spin"></div>
          <span className="mr-4">جاري تحميل قائمة الملفات...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertTitle>خطأ في التحميل</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">تحميل مباشر للملفات</h1>
        <p className="text-muted-foreground">
          استخدم هذه الصفحة لتنزيل الملفات مباشرة من الخادم دون مصادقة
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {options.map((option) => (
          <Card key={option.name} className="overflow-hidden">
            <CardHeader className="bg-muted/50">
              <CardTitle className="flex items-center gap-2">
                {option.name === 'GitHub Package' ? <GithubIcon className="h-5 w-5" /> : <ServerIcon className="h-5 w-5" />}
                {option.name}
              </CardTitle>
              <CardDescription>{option.description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <FileIcon className="h-5 w-5" />
                  <span className="text-sm">{option.url.split('/').pop()}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="default"
                className="flex items-center gap-2"
                onClick={() => handleDownload(option.url, option.name)}
              >
                <DownloadIcon className="h-4 w-4" />
                تنزيل
                {getStatusIcon(option.name)}
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => handleDirectLink(option.url)}
              >
                <FileTextIcon className="h-4 w-4" />
                فتح مباشر
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Alert className="mb-6">
        <AlertDescription>
          جميع الملفات متاحة للتنزيل مباشرة من هذه الصفحة. في حالة مواجهة مشاكل في التنزيل، 
          استخدم نافذة جديدة أو انسخ الرابط واستخدمه مباشرة.
        </AlertDescription>
      </Alert>

      <div className="bg-muted p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">جميع الملفات المتاحة</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="pb-3 pr-4">اسم الملف</th>
                <th className="pb-3 pr-4">الحجم</th>
                <th className="pb-3 pr-4">تاريخ التعديل</th>
                <th className="pb-3 pr-4">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {files.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-muted-foreground">
                    لا توجد ملفات متاحة للتنزيل
                  </td>
                </tr>
              ) : (
                files.map((file) => (
                  <tr key={file.name} className="border-b">
                    <td className="py-3 pr-4">{file.name}</td>
                    <td className="py-3 pr-4">{formatFileSize(file.size)}</td>
                    <td className="py-3 pr-4">{new Date(file.modified).toLocaleString()}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex items-center gap-1"
                          onClick={() => handleDownload(file.url, file.name)}
                        >
                          <DownloadIcon className="h-4 w-4" />
                          تنزيل
                          {getStatusIcon(file.name)}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}