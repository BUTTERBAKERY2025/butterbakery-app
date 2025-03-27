import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import ConsolidatedDailySalesJournal from "@/components/reports/ConsolidatedDailySalesJournal";
import MainLayout from "@/components/layout/MainLayout";

export default function ConsolidatedJournal() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  return (
    <MainLayout title="يومية المبيعات المجمعة" requireAuth>
      <ConsolidatedDailySalesJournal />
    </MainLayout>
  );
}