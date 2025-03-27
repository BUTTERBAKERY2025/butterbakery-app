import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Trophy, Medal, Award, Crown, 
  ChevronUp, TrendingUp, Users, Calendar
} from "lucide-react";
import { formatDate, formatNumber } from "@/lib/utils";
import { reshapeArabicText } from "@/lib/arabicTextUtils";

export function Leaderboard() {
  const [activeLeaderboardId, setActiveLeaderboardId] = useState<number | null>(null);
  
  // استعلام عن لوحات المتصدرين النشطة
  const { 
    data: leaderboards, 
    isLoading: isLoadingLeaderboards,
    error: leaderboardsError
  } = useQuery({
    queryKey: ['/api/leaderboards/active'],
    queryFn: () => apiRequest<any>('/api/leaderboards/active', { method: 'GET' }),
  });
  
  // استعلام عن نتائج لوحة المتصدرين المحددة
  const { 
    data: results,
    isLoading: isLoadingResults,
    error: resultsError
  } = useQuery({
    queryKey: ['/api/leaderboards/results', activeLeaderboardId],
    queryFn: () => {
      if (!activeLeaderboardId) {
        // إذا لم يتم تحديد لوحة متصدرين، نستخدم الأولى
        const firstLeaderboard = leaderboards?.[0];
        if (firstLeaderboard) {
          setActiveLeaderboardId(firstLeaderboard.id);
          return apiRequest<any>(`/api/leaderboards/${firstLeaderboard.id}/results`, { method: 'GET' });
        }
        return Promise.resolve([]);
      }
      return apiRequest<any>(`/api/leaderboards/${activeLeaderboardId}/results`, { method: 'GET' });
    },
    enabled: !!leaderboards?.length || !!activeLeaderboardId,
  });
  
  // استعلام عن مرتبة المستخدم الحالي
  const { 
    data: userRank,
    isLoading: isLoadingUserRank
  } = useQuery({
    queryKey: ['/api/leaderboards/my-rank', activeLeaderboardId],
    queryFn: () => {
      if (!activeLeaderboardId) return Promise.resolve(null);
      return apiRequest<any>(`/api/leaderboards/${activeLeaderboardId}/my-rank`, { method: 'GET' });
    },
    enabled: !!activeLeaderboardId,
  });
  
  if (isLoadingLeaderboards) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>لوحة المتصدرين</CardTitle>
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
  
  if (leaderboardsError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>خطأ في تحميل البيانات</CardTitle>
          <CardDescription>حدث خطأ أثناء تحميل بيانات لوحة المتصدرين</CardDescription>
        </CardHeader>
        <CardContent>
          <p>يرجى المحاولة مرة أخرى لاحقًا.</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!leaderboards || leaderboards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            لوحة المتصدرين
          </CardTitle>
          <CardDescription>قائمة المتصدرين في مختلف المجالات</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
          <Trophy className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 mb-2">لا توجد لوحات متصدرين نشطة حالياً</p>
          <p className="text-sm text-slate-400">سيتم إضافة لوحات جديدة قريباً</p>
        </CardContent>
      </Card>
    );
  }
  
  // حصول على أيقونة للمراكز الأولى
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return null;
  };
  
  const selectedLeaderboard = leaderboards.find(l => l.id === activeLeaderboardId) || leaderboards[0];
  
  // الحصول على اسم الفئة بالعربية
  const getCategoryName = (category: string) => {
    switch(category) {
      case 'sales':
        return 'المبيعات';
      case 'target_achievement':
        return 'تحقيق الأهداف';
      case 'customer_satisfaction':
        return 'رضا العملاء';
      default:
        return category;
    }
  };
  
  // الحصول على نوع الجدول بالعربية
  const getTypeName = (type: string) => {
    switch(type) {
      case 'daily':
        return 'يومي';
      case 'weekly':
        return 'أسبوعي';
      case 'monthly':
        return 'شهري';
      case 'quarterly':
        return 'ربع سنوي';
      case 'yearly':
        return 'سنوي';
      default:
        return type;
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          لوحة المتصدرين
        </CardTitle>
        <CardDescription>قائمة المتصدرين في مختلف المجالات</CardDescription>
      </CardHeader>
      <CardContent>
        {userRank && (
          <div className="mb-6 p-4 bg-primary/10 rounded-lg">
            <p className="font-medium">مرتبتك الحالية</p>
            <div className="flex items-center gap-3 mt-2">
              <div className="p-3 bg-white rounded-full shadow-sm">
                <Trophy className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{userRank.rank || '-'}</p>
                <p className="text-sm text-muted-foreground">{userRank.score ? `بقيمة ${formatNumber(parseFloat(userRank.score))}` : 'لم يتم التصنيف بعد'}</p>
              </div>
            </div>
          </div>
        )}
        
        <Tabs defaultValue={selectedLeaderboard.id.toString()} onValueChange={(value) => setActiveLeaderboardId(Number(value))}>
          <TabsList className="w-full mb-6">
            {leaderboards.map(leaderboard => (
              <TabsTrigger key={leaderboard.id} value={leaderboard.id.toString()} className="flex-1">
                {reshapeArabicText(leaderboard.name)}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {leaderboards.map(leaderboard => (
            <TabsContent key={leaderboard.id} value={leaderboard.id.toString()}>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-slate-50 rounded-lg flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">الفئة</p>
                      <p className="font-medium">{getCategoryName(leaderboard.category)}</p>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-slate-50 rounded-lg flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <Calendar className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">النوع</p>
                      <p className="font-medium">{getTypeName(leaderboard.type)}</p>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-slate-50 rounded-lg flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-full">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">المتنافسين</p>
                      <p className="font-medium">{results?.length || 0} مشارك</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="mb-1 text-sm text-slate-500">فترة المنافسة</p>
                  <div className="flex items-center justify-between">
                    <p className="font-medium">
                      من {formatDate(leaderboard.startDate, 'short')} إلى {formatDate(leaderboard.endDate, 'short')}
                    </p>
                    {new Date(leaderboard.endDate) > new Date() ? (
                      <Badge variant="outline" className="bg-green-100 text-green-800">جارية</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-100 text-amber-800">منتهية</Badge>
                    )}
                  </div>
                </div>
                
                {isLoadingResults ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-slate-200 rounded w-1/4"></div>
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-10 bg-slate-200 rounded"></div>
                      ))}
                    </div>
                  </div>
                ) : resultsError ? (
                  <div className="text-center py-4">
                    <p className="text-red-500">حدث خطأ أثناء تحميل النتائج</p>
                  </div>
                ) : results?.length === 0 ? (
                  <div className="text-center py-8">
                    <Trophy className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">لا توجد نتائج متاحة لهذه اللوحة حتى الآن</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16 text-center">المركز</TableHead>
                        <TableHead>الاسم</TableHead>
                        <TableHead className="text-center">القيمة</TableHead>
                        <TableHead className="text-center">النقاط</TableHead>
                        <TableHead className="text-right">آخر تحديث</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((result: any) => (
                        <TableRow key={result.id} className={result.userId === userRank?.userId ? 'bg-primary/5' : ''}>
                          <TableCell className="text-center font-medium">
                            <div className="flex justify-center items-center">
                              {getRankIcon(result.rank)}
                              <span className={result.rank <= 3 ? 'mx-1 font-bold' : 'mx-1'}>
                                {result.rank}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{result.userName || `موظف #${result.userId}`}</TableCell>
                          <TableCell className="text-center">
                            {result.metricValue && typeof result.metricValue === 'string' 
                              ? formatNumber(parseFloat(result.metricValue)) 
                              : formatNumber(result.metricValue)}
                            <span className="text-xs text-slate-500 block">{result.metricName}</span>
                          </TableCell>
                          <TableCell className="text-center font-semibold">
                            {result.score && typeof result.score === 'string' 
                              ? formatNumber(parseFloat(result.score)) 
                              : formatNumber(result.score)}
                          </TableCell>
                          <TableCell className="text-right text-slate-500 text-sm">
                            {formatDate(result.updateDate, 'short')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}