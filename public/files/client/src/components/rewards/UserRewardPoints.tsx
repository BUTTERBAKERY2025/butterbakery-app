import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CircleCheck, Star, Clock, CircleDollarSign, 
  TrendingUp, Award, Gift, Coins 
} from "lucide-react";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { reshapeArabicText } from "@/lib/arabicTextUtils";

interface UserRewardPointsProps {
  userId?: number;
}

export function UserRewardPoints({ userId }: UserRewardPointsProps) {
  const queryClient = useQueryClient();
  
  // استعلام عن نقاط المستخدم
  const { 
    data: userPoints, 
    isLoading: isLoadingPoints,
    error: pointsError
  } = useQuery({
    queryKey: ['/api/rewards/points', userId],
    queryFn: () => apiRequest<any>(`/api/rewards/points${userId ? `/${userId}` : '/me'}`, { method: 'GET' }),
  });
  
  // استعلام عن سجل نقاط المستخدم
  const { 
    data: pointsHistory, 
    isLoading: isLoadingHistory,
    error: historyError
  } = useQuery({
    queryKey: ['/api/rewards/points/history', userId],
    queryFn: () => apiRequest<any>(`/api/rewards/points/history${userId ? `/${userId}` : '/me'}`, { method: 'GET' }),
  });
  
  if (isLoadingPoints || isLoadingHistory) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>نقاط المكافآت</CardTitle>
          <CardDescription>جار تحميل البيانات...</CardDescription>
        </CardHeader>
        <CardContent className="h-40 flex items-center justify-center">
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-full bg-slate-200 h-10 w-10"></div>
            <div className="flex-1 space-y-6 py-1">
              <div className="h-2 bg-slate-200 rounded"></div>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-2 bg-slate-200 rounded col-span-2"></div>
                  <div className="h-2 bg-slate-200 rounded col-span-1"></div>
                </div>
                <div className="h-2 bg-slate-200 rounded"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (pointsError || historyError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>خطأ في تحميل البيانات</CardTitle>
          <CardDescription>حدث خطأ أثناء تحميل بيانات النقاط</CardDescription>
        </CardHeader>
        <CardContent>
          <p>يرجى المحاولة مرة أخرى لاحقًا.</p>
        </CardContent>
      </Card>
    );
  }
  
  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'earned':
        return <CircleCheck className="h-4 w-4 text-green-500" />;
      case 'redeemed':
        return <Gift className="h-4 w-4 text-purple-500" />;
      case 'expired':
        return <Clock className="h-4 w-4 text-red-500" />;
      case 'adjusted':
        return <CircleDollarSign className="h-4 w-4 text-blue-500" />;
      default:
        return <Star className="h-4 w-4 text-yellow-500" />;
    }
  };
  
  const getTypeText = (type: string) => {
    switch(type) {
      case 'earned':
        return 'مكتسبة';
      case 'redeemed':
        return 'مستبدلة';
      case 'expired':
        return 'منتهية';
      case 'adjusted':
        return 'معدلة';
      default:
        return type;
    }
  };
  
  const getTypeColor = (type: string) => {
    switch(type) {
      case 'earned':
        return 'bg-green-100 text-green-800';
      case 'redeemed':
        return 'bg-purple-100 text-purple-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'adjusted':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-6 w-6 text-yellow-500" />
            نقاط المكافآت
          </CardTitle>
          <CardDescription>رصيد النقاط وتفاصيل الحساب</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <h3 className="text-sm font-medium text-slate-500 mb-1">النقاط الحالية</h3>
              <p className="text-3xl font-bold text-primary flex justify-center items-center">
                <Coins className="h-6 w-6 ml-2 text-yellow-500" />
                {formatNumber(userPoints?.points || 0)}
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <h3 className="text-sm font-medium text-slate-500 mb-1">النقاط المتاحة للاستبدال</h3>
              <p className="text-3xl font-bold text-primary">
                {formatNumber(userPoints?.availablePoints || 0)}
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <h3 className="text-sm font-medium text-slate-500 mb-1">إجمالي النقاط المكتسبة</h3>
              <p className="text-3xl font-bold text-primary">
                {formatNumber(userPoints?.totalEarnedPoints || 0)}
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-slate-500">
            آخر تحديث: {formatDate(userPoints?.lastUpdated || new Date(), 'medium')}
          </p>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-blue-500" />
            سجل النقاط
          </CardTitle>
          <CardDescription>تاريخ اكتساب وصرف النقاط</CardDescription>
        </CardHeader>
        <CardContent>
          {pointsHistory && pointsHistory.length > 0 ? (
            <Table>
              <TableCaption>سجل النقاط لغاية {formatDate(new Date(), 'short')}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>النقاط</TableHead>
                  <TableHead className="w-[300px]">السبب</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pointsHistory.map((history: any) => (
                  <TableRow key={history.id}>
                    <TableCell>{formatDate(history.date || history.timestamp, 'short')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getTypeIcon(history.type)}
                        <Badge variant="outline" className={getTypeColor(history.type)}>
                          {getTypeText(history.type)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className={history.points >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {history.points >= 0 ? '+' : ''}{formatNumber(history.points)}
                    </TableCell>
                    <TableCell dir="rtl">{reshapeArabicText(history.reason)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-500">لا توجد بيانات سجل نقاط متاحة</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}