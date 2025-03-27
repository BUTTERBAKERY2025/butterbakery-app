import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import SmartDashboard from '@/components/smart-alerts/SmartDashboard';
import { useAuth } from '@/contexts/AuthContext';

export default function SmartAlertsPage() {
  const { user } = useAuth();

  return (
    <MainLayout title="التنبيهات الذكية" requireAuth>
      <SmartDashboard userId={user?.id} />
    </MainLayout>
  );
}