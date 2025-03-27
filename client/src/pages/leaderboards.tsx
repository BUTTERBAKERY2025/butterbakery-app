import React from 'react';
import { Helmet } from 'react-helmet';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Trophy, 
  Users,
  TrendingUp
} from 'lucide-react';

export default function LeaderboardsPage() {
  return (
    <MainLayout title="لوحة المتصدرين">
      <Helmet>
        <title>لوحة المتصدرين | باتر بيكري</title>
      </Helmet>
      
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            لوحة المتصدرين
          </h1>
          <p className="text-muted-foreground">تصنيف الموظفين ومتابعة أدائهم</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-primary/10 rounded-lg flex items-center gap-3">
            <div className="p-2 bg-white rounded-full">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">تحدي المبيعات</h3>
              <p className="text-sm text-muted-foreground">تصنيف أفضل الموظفين في المبيعات</p>
            </div>
          </div>
          
          <div className="p-4 bg-primary/10 rounded-lg flex items-center gap-3">
            <div className="p-2 bg-white rounded-full">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">تحدي الفريق</h3>
              <p className="text-sm text-muted-foreground">تصنيف أفضل الفروع في الأداء العام</p>
            </div>
          </div>
          
          <div className="p-4 bg-primary/10 rounded-lg flex items-center gap-3">
            <div className="p-2 bg-white rounded-full">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">كأس الأداء</h3>
              <p className="text-sm text-muted-foreground">مسابقة الأداء المتميز في خدمة العملاء</p>
            </div>
          </div>
        </div>
        
        <Leaderboard />
      </div>
    </MainLayout>
  );
}