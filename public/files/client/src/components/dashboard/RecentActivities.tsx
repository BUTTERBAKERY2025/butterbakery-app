import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface Activity {
  id: number;
  userId?: number;
  action: string;
  details: any;
  timestamp: string;
  branchId?: number;
  user?: {
    name: string;
    role: string;
  };
  branch?: {
    name: string;
  };
}

interface RecentActivitiesProps {
  activities: Activity[];
}

export default function RecentActivities({ activities }: RecentActivitiesProps) {
  const { t, i18n } = useTranslation();
  
  const formatTimeAgo = (date: string) => {
    return formatDistanceToNow(new Date(date), { 
      addSuffix: true,
      locale: enUS
    });
  };

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'create_daily_sales':
        return <i className="fas fa-cash-register text-primary text-sm"></i>;
      case 'register_shortage':
        return <i className="fas fa-exclamation-triangle text-danger text-sm"></i>;
      case 'daily_target_achieved':
        return <i className="fas fa-check-circle text-success text-sm"></i>;
      case 'user_update':
        return <i className="fas fa-user-edit text-secondary text-sm"></i>;
      case 'report_generated':
        return <i className="fas fa-chart-pie text-info text-sm"></i>;
      default:
        return <i className="fas fa-info-circle text-primary text-sm"></i>;
    }
  };

  const getActivityBackground = (action: string) => {
    switch (action) {
      case 'create_daily_sales':
        return 'bg-primary-light';
      case 'register_shortage':
        return 'bg-danger-light';
      case 'daily_target_achieved':
        return 'bg-success-light';
      case 'user_update':
        return 'bg-secondary-light';
      case 'report_generated':
        return 'bg-info-light';
      default:
        return 'bg-primary-light';
    }
  };

  const getActivityTitle = (activity: Activity) => {
    switch (activity.action) {
      case 'create_daily_sales':
        return t('activities.newSalesRegistered');
      case 'register_shortage':
        return t('activities.registerShortage');
      case 'daily_target_achieved':
        return t('activities.dailyTargetAchieved');
      case 'user_update':
        return t('activities.userDataUpdated');
      case 'report_generated':
        return t('activities.newReportGenerated');
      default:
        return t('activities.newActivity');
    }
  };

  const getActivityDescription = (activity: Activity) => {
    switch (activity.action) {
      case 'create_daily_sales':
        return (
          <p className="text-sm text-neutral-600 mt-1">
            {t('activities.salesRegisteredByUser', {
              user: activity.user?.name || t('activities.unknownUser'),
              amount: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(activity.details.amount || 0),
              branch: activity.branch?.name || t('activities.unknownBranch')
            })}
          </p>
        );
      case 'register_shortage':
        return (
          <p className="text-sm text-neutral-600 mt-1">
            {t('activities.shortageRegistered', {
              amount: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(activity.details.amount || 0),
              branch: activity.branch?.name || t('activities.unknownBranch')
            })}
          </p>
        );
      case 'daily_target_achieved':
        return (
          <p className="text-sm text-neutral-600 mt-1">
            {t('activities.targetAchieved', {
              branch: activity.branch?.name || t('activities.unknownBranch'),
              percentage: activity.details.percentage || '100'
            })}
          </p>
        );
      case 'user_update':
        return (
          <p className="text-sm text-neutral-600 mt-1">
            {t('activities.userPermissionsUpdated', {
              admin: activity.details.updatedBy || t('activities.systemAdmin'),
              user: activity.details.userId || t('activities.unknownUser')
            })}
          </p>
        );
      case 'report_generated':
        return (
          <p className="text-sm text-neutral-600 mt-1">
            {t('activities.reportWasGenerated', {
              report: activity.details.reportType === 'weekly_sales' 
                ? t('activities.weeklySalesReport') 
                : t('activities.report')
            })}
          </p>
        );
      default:
        return <p className="text-sm text-neutral-600 mt-1">{t('activities.noDetails')}</p>;
    }
  };

  return (
    <Card className="lg:col-span-2">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg">{t('dashboard.recentActivities')}</h3>
          <Button variant="ghost" size="icon">
            <i className="fas fa-sync-alt"></i>
          </Button>
        </div>

        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start py-3 border-b border-neutral-100">
              <div className={`${getActivityBackground(activity.action)} p-2 rounded-full ml-4 mt-1`}>
                {getActivityIcon(activity.action)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{getActivityTitle(activity)}</h4>
                  <span className="text-xs text-neutral-500">{formatTimeAgo(activity.timestamp)}</span>
                </div>
                {getActivityDescription(activity)}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <a href="/activities" className="text-secondary hover:text-secondary-dark font-medium text-sm">
            {t('dashboard.viewAllActivities')}
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
