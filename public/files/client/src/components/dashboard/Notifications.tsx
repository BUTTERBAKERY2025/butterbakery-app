import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { apiRequest } from '@/lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';

interface Notification {
  id: number;
  userId?: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  timestamp: string;
  link?: string;
}

interface NotificationsProps {
  notifications: Notification[];
}

export default function Notifications({ notifications }: NotificationsProps) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  
  const formatTimeAgo = (date: string) => {
    return formatDistanceToNow(new Date(date), { 
      addSuffix: true,
      locale: i18n.language === 'ar' ? ar : enUS
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <i className="fas fa-exclamation-circle text-danger mt-1 ml-3"></i>;
      case 'warning':
        return <i className="fas fa-exclamation-triangle text-warning mt-1 ml-3"></i>;
      case 'info':
        return <i className="fas fa-info-circle text-info mt-1 ml-3"></i>;
      case 'success':
        return <i className="fas fa-check-circle text-success mt-1 ml-3"></i>;
      default:
        return <i className="fas fa-bell text-primary mt-1 ml-3"></i>;
    }
  };

  const getNotificationBackground = (type: string) => {
    switch (type) {
      case 'error':
        return 'bg-danger bg-opacity-10 border-danger';
      case 'warning':
        return 'bg-warning bg-opacity-10 border-warning';
      case 'info':
        return 'bg-info bg-opacity-10 border-info';
      case 'success':
        return 'bg-success bg-opacity-10 border-success';
      default:
        return 'bg-primary bg-opacity-10 border-primary';
    }
  };

  const getNotificationTitle = (type: string, title: string) => {
    switch (type) {
      case 'error':
        return <h4 className="font-medium text-danger">{title}</h4>;
      case 'warning':
        return <h4 className="font-medium text-warning">{title}</h4>;
      case 'info':
        return <h4 className="font-medium text-info">{title}</h4>;
      case 'success':
        return <h4 className="font-medium text-success">{title}</h4>;
      default:
        return <h4 className="font-medium text-primary">{title}</h4>;
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        await apiRequest('POST', `/api/notifications/${notification.id}/read`, {});
        // Invalidate notifications query to refresh the data
        queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      } catch (error) {
        console.error('Failed to mark notification as read', error);
      }
    }
    
    // Navigate to the link if present
    if (notification.link) {
      window.location.href = notification.link;
    }
  };

  const unreadCount = notifications.filter(notification => !notification.isRead).length;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg">{t('dashboard.notifications')}</h3>
          {unreadCount > 0 && (
            <Badge className="bg-accent text-white">
              {unreadCount} {t('dashboard.new')}
            </Badge>
          )}
        </div>

        <div className="space-y-4">
          {notifications.map((notification) => (
            <div 
              key={notification.id} 
              className={`p-4 rounded-lg border-r-4 ${getNotificationBackground(notification.type)} cursor-pointer transition-all hover:opacity-90`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start">
                {getNotificationIcon(notification.type)}
                <div>
                  {getNotificationTitle(notification.type, notification.title)}
                  <p className="text-sm text-neutral-800 mt-1">{notification.message}</p>
                  <p className="text-xs text-neutral-500 mt-2">{formatTimeAgo(notification.timestamp)}</p>
                </div>
              </div>
            </div>
          ))}

          {notifications.length === 0 && (
            <div className="text-center py-8 text-neutral-500">
              <i className="fas fa-bell-slash text-3xl mb-2"></i>
              <p>{t('dashboard.noNotifications')}</p>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <a href="/notifications" className="text-secondary hover:text-secondary-dark font-medium text-sm">
            {t('dashboard.viewAllNotifications')}
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
