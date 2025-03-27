import React, { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Gift, Coins, Award, Clock, Check, 
  AlertCircle, ChevronLeft, ChevronRight
} from "lucide-react";
import { formatDate, formatNumber } from "@/lib/utils";
import { reshapeArabicText } from "@/lib/arabicTextUtils";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function RewardSystem() {
  const [activeTab, setActiveTab] = useState("available");
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // استعلام عن نقاط المستخدم
  const { 
    data: userPoints, 
    isLoading: isLoadingPoints
  } = useQuery({
    queryKey: ['/api/rewards/points/me'],
    queryFn: () => apiRequest<any>('/api/rewards/points/me', { method: 'GET' }),
  });
  
  // استعلام عن المكافآت المتاحة
  const { 
    data: rewards, 
    isLoading: isLoadingRewards,
    error: rewardsError
  } = useQuery({
    queryKey: ['/api/rewards'],
    queryFn: () => apiRequest<any>('/api/rewards', { method: 'GET' }),
  });
  
  // استعلام عن طلبات استبدال المستخدم
  const { 
    data: userRedemptions, 
    isLoading: isLoadingRedemptions
  } = useQuery({
    queryKey: ['/api/rewards/redemptions/me'],
    queryFn: () => apiRequest<any>('/api/rewards/redemptions/me', { method: 'GET' }),
  });
  
  // دالة الاستبدال للمكافآت
  const redeemMutation = useMutation({
    mutationFn: (rewardId: number) => {
      return apiRequest<any>('/api/rewards/redeem', {
        method: 'POST',
        data: {
          rewardId,
          pointsUsed: selectedReward.pointsCost
        }
      });
    },
    onSuccess: () => {
      toast({
        title: "تم تقديم طلب الاستبدال بنجاح",
        description: "سيتم مراجعة طلبك من قبل الإدارة قريباً.",
        variant: "default",
      });
      setRedeemDialogOpen(false);
      // تحديث البيانات
      queryClient.invalidateQueries({ queryKey: ['/api/rewards/points/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rewards/redemptions/me'] });
    },
    onError: (error) => {
      toast({
        title: "حدث خطأ أثناء تقديم الطلب",
        description: "يرجى المحاولة مرة أخرى لاحقاً أو التواصل مع الدعم.",
        variant: "destructive",
      });
    }
  });
  
  // تجميع المكافآت حسب الفئة
  const groupedRewards = React.useMemo(() => {
    if (!rewards) return {};
    
    const grouped: Record<string, any[]> = {};
    rewards.forEach((reward: any) => {
      if (!grouped[reward.category]) {
        grouped[reward.category] = [];
      }
      grouped[reward.category].push(reward);
    });
    
    return grouped;
  }, [rewards]);
  
  // الحصول على اسم الفئة بالعربية
  const getCategoryName = (category: string) => {
    switch(category) {
      case 'time_off':
        return 'إجازات';
      case 'financial':
        return 'مكافآت مالية';
      case 'gifts':
        return 'هدايا';
      case 'training':
        return 'تدريب وتطوير';
      case 'other':
        return 'أخرى';
      default:
        return category;
    }
  };
  
  // الحصول على حالة طلب الاستبدال بالعربية
  const getStatusText = (status: string) => {
    switch(status) {
      case 'pending':
        return 'قيد المراجعة';
      case 'approved':
        return 'تمت الموافقة';
      case 'rejected':
        return 'مرفوض';
      case 'fulfilled':
        return 'تم التسليم';
      default:
        return status;
    }
  };
  
  // الحصول على لون حالة طلب الاستبدال
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'fulfilled':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // الحصول على أيقونة حالة طلب الاستبدال
  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <Check className="h-4 w-4" />;
      case 'rejected':
        return <AlertCircle className="h-4 w-4" />;
      case 'fulfilled':
        return <Gift className="h-4 w-4" />;
      default:
        return null;
    }
  };
  
  // التحقق مما إذا كانت النقاط كافية للاستبدال
  const hasEnoughPoints = (rewardCost: number) => {
    if (!userPoints) return false;
    return userPoints.availablePoints >= rewardCost;
  };
  
  // فتح مربع حوار الاستبدال
  const openRedeemDialog = (reward: any) => {
    setSelectedReward(reward);
    setRedeemDialogOpen(true);
  };
  
  // استبدال المكافأة
  const handleRedeem = () => {
    if (!selectedReward) return;
    redeemMutation.mutate(selectedReward.id);
  };
  
  if (isLoadingPoints || isLoadingRewards) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>نظام المكافآت</CardTitle>
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
  
  if (rewardsError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>خطأ في تحميل البيانات</CardTitle>
          <CardDescription>حدث خطأ أثناء تحميل بيانات المكافآت</CardDescription>
        </CardHeader>
        <CardContent>
          <p>يرجى المحاولة مرة أخرى لاحقًا.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-6 w-6 text-purple-500" />
            نظام المكافآت
          </CardTitle>
          <CardDescription>استبدل نقاطك بمكافآت وحوافز متنوعة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-primary/10 rounded-lg mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">رصيد النقاط المتاح للاستبدال</p>
              <div className="flex items-center mt-1">
                <Coins className="h-5 w-5 text-yellow-500 mr-2" />
                <span className="text-2xl font-bold">{formatNumber(userPoints?.availablePoints || 0)}</span>
                <span className="text-sm text-slate-500 mr-2"> نقطة</span>
              </div>
            </div>
            <Button variant="outline" className="gap-2" onClick={() => setActiveTab('points')}>
              سجل النقاط
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full mb-6">
              <TabsTrigger value="available" className="flex-1">المكافآت المتاحة</TabsTrigger>
              <TabsTrigger value="my-redemptions" className="flex-1">طلبات الاستبدال</TabsTrigger>
            </TabsList>
            
            <TabsContent value="available">
              {Object.keys(groupedRewards).length === 0 ? (
                <div className="text-center py-8">
                  <Gift className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">لا توجد مكافآت متاحة حالياً</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(groupedRewards).map(([category, categoryRewards]) => (
                    <div key={category} className="space-y-4">
                      <h3 className="text-lg font-medium">{getCategoryName(category)}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categoryRewards.map((reward: any) => (
                          <Card key={reward.id} className="overflow-hidden">
                            <div className="bg-gradient-to-r from-primary/20 to-primary/5 h-2"></div>
                            <CardHeader className="pb-2">
                              <div className="flex justify-between">
                                <CardTitle className="text-base">
                                  {reshapeArabicText(reward.name)}
                                </CardTitle>
                                {reward.availableQuantity !== null && (
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                    المتبقي: {reward.availableQuantity}
                                  </Badge>
                                )}
                              </div>
                              <CardDescription>
                                {reshapeArabicText(reward.description)}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-center mb-4">
                                <Coins className="h-5 w-5 text-yellow-500 mr-2" />
                                <span className="text-xl font-bold">{formatNumber(reward.pointsCost)}</span>
                                <span className="text-sm text-slate-500 mr-1"> نقطة</span>
                              </div>
                              
                              {reward.expiryDate && (
                                <div className="flex items-center text-sm text-slate-500 mb-4">
                                  <Clock className="h-4 w-4 mr-1" />
                                  <span>متاح حتى {formatDate(reward.expiryDate, 'short')}</span>
                                </div>
                              )}
                            </CardContent>
                            <CardFooter>
                              <Button 
                                onClick={() => openRedeemDialog(reward)}
                                disabled={!hasEnoughPoints(reward.pointsCost) || 
                                  (reward.availableQuantity !== null && reward.availableQuantity <= 0)}
                                className="w-full"
                              >
                                {hasEnoughPoints(reward.pointsCost) 
                                  ? (reward.availableQuantity !== null && reward.availableQuantity <= 0 
                                    ? 'نفدت الكمية' 
                                    : 'استبدال') 
                                  : 'نقاط غير كافية'}
                              </Button>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="my-redemptions">
              {isLoadingRedemptions ? (
                <div className="animate-pulse space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-24 bg-slate-200 rounded"></div>
                  ))}
                </div>
              ) : !userRedemptions || userRedemptions.length === 0 ? (
                <div className="text-center py-8">
                  <Award className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">لم تقم باستبدال أي مكافآت بعد</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userRedemptions.map((redemption: any) => (
                    <Card key={redemption.id} className="overflow-hidden">
                      <div className={`h-1.5 ${
                        redemption.status === 'approved' ? 'bg-green-500' :
                        redemption.status === 'rejected' ? 'bg-red-500' :
                        redemption.status === 'fulfilled' ? 'bg-blue-500' :
                        'bg-yellow-500'
                      }`}></div>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-base">
                              {reshapeArabicText(redemption.rewardName || `مكافأة #${redemption.rewardId}`)}
                            </CardTitle>
                            <CardDescription>
                              تم الطلب في {formatDate(redemption.redeemedAt, 'medium')}
                            </CardDescription>
                          </div>
                          <Badge className={`ml-2 flex items-center gap-1 ${getStatusColor(redemption.status)}`}>
                            {getStatusIcon(redemption.status)}
                            {getStatusText(redemption.status)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <Coins className="h-5 w-5 text-yellow-500 mr-2" />
                            <span>{redemption.pointsUsed} نقطة</span>
                          </div>
                          
                          {redemption.approvedAt && (
                            <div className="text-sm text-slate-500">
                              {redemption.status === 'approved' ? 'تمت الموافقة في ' : 'تم التسليم في '}
                              {formatDate(redemption.approvedAt, 'short')}
                            </div>
                          )}
                        </div>
                        
                        {redemption.notes && (
                          <div className="mt-3 p-2 bg-slate-50 rounded-md text-sm">
                            <p className="font-medium">ملاحظات:</p>
                            <p className="text-slate-600">{reshapeArabicText(redemption.notes)}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <Dialog open={redeemDialogOpen} onOpenChange={setRedeemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد استبدال المكافأة</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من رغبتك في استبدال هذه المكافأة؟
            </DialogDescription>
          </DialogHeader>
          
          {selectedReward && (
            <div className="py-4">
              <div className="p-4 bg-slate-50 rounded-lg mb-4">
                <h3 className="font-medium text-lg mb-1">{reshapeArabicText(selectedReward.name)}</h3>
                <p className="text-slate-600 text-sm mb-3">{reshapeArabicText(selectedReward.description)}</p>
                <div className="flex items-center">
                  <Coins className="h-5 w-5 text-yellow-500 mr-2" />
                  <span className="text-xl font-bold">{formatNumber(selectedReward.pointsCost)}</span>
                  <span className="text-sm text-slate-500 mr-1"> نقطة</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-2 bg-primary/10 rounded-md">
                <span>رصيدك الحالي</span>
                <span className="font-bold">{formatNumber(userPoints?.availablePoints || 0)} نقطة</span>
              </div>
              <div className="flex items-center justify-between p-2">
                <span>المبلغ المخصوم</span>
                <span className="font-bold text-red-600">- {formatNumber(selectedReward.pointsCost)} نقطة</span>
              </div>
              <div className="flex items-center justify-between p-2 font-bold border-t">
                <span>الرصيد المتبقي</span>
                <span>{formatNumber((userPoints?.availablePoints || 0) - selectedReward.pointsCost)} نقطة</span>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRedeemDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleRedeem} 
              disabled={redeemMutation.isPending}
            >
              {redeemMutation.isPending ? 'جار التنفيذ...' : 'تأكيد الاستبدال'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}