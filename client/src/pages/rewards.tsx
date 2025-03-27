import React from 'react';
import { Helmet } from 'react-helmet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserRewardPoints } from '@/components/rewards/UserRewardPoints';
import { RewardSystem } from '@/components/rewards/RewardSystem';
import { UserAchievements } from '@/components/achievements/UserAchievements';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Gift, 
  Trophy, 
  Coins, 
  Award 
} from 'lucide-react';

export default function RewardsPage() {
  return (
    <MainLayout title="نظام المكافآت والحوافز">
      <Helmet>
        <title>نظام المكافآت والحوافز | باتر بيكري</title>
      </Helmet>
      
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold mb-1">نظام المكافآت والحوافز</h1>
          <p className="text-muted-foreground">استبدل نقاطك وحقق إنجازات جديدة</p>
        </div>
        
        <Tabs defaultValue="rewards" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="rewards" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              <span className="hidden sm:inline">المكافآت</span>
            </TabsTrigger>
            <TabsTrigger value="points" className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              <span className="hidden sm:inline">النقاط</span>
            </TabsTrigger>
            <TabsTrigger value="achievements" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              <span className="hidden sm:inline">الإنجازات</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="rewards">
            <RewardSystem />
          </TabsContent>
          
          <TabsContent value="points">
            <UserRewardPoints />
          </TabsContent>
          
          <TabsContent value="achievements">
            <UserAchievements />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}