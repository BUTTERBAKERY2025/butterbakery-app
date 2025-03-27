import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useTranslation } from 'react-i18next';

interface Cashier {
  cashierId: number;
  name: string;
  avatar: string;
  shiftStart: string;
  shiftEnd: string;
  totalSales: number;
  discrepancy: number;
  totalTransactions: number;
  averageTicket: number;
  performance: number;
}

interface CashierPerformanceProps {
  cashiers: Cashier[];
}

export default function CashierPerformance({ cashiers = [] }: CashierPerformanceProps) {
  const { t } = useTranslation();
  
  // Ensure currency is displayed in English format regardless of user locale
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SAR',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Ensure time is displayed in English format regardless of user locale
  const formatShiftTime = (datetime: string) => {
    return new Date(datetime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getDiscrepancyText = (discrepancy: number) => {
    if (discrepancy === 0) return (
      <span className="text-xs text-success">0 عجز</span>
    );
    
    if (discrepancy < 0) return (
      <span className="text-xs text-danger">{formatCurrency(Math.abs(discrepancy))} عجز</span>
    );
    
    return (
      <span className="text-xs text-success">+{formatCurrency(discrepancy)} زيادة</span>
    );
  };

  const getPerformanceColor = (performance: number) => {
    if (performance >= 95) return 'bg-success';
    if (performance >= 85) return 'bg-info';
    if (performance >= 75) return 'bg-warning';
    return 'bg-danger';
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg">{t('dashboard.cashierDailyPerformance')}</h3>
          <button className="text-neutral-500 hover:text-neutral-700">
            <i className="fas fa-ellipsis-v"></i>
          </button>
        </div>

        <div className="space-y-6">
          {cashiers.map((cashier) => (
            <div key={cashier.cashierId}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <img 
                    src={cashier.avatar} 
                    alt={`صورة ${cashier.name}`} 
                    className="w-10 h-10 rounded-full ml-3"
                  />
                  <div>
                    <p className="font-medium">{cashier.name}</p>
                    <p className="text-xs text-neutral-500">
                      {cashier.shiftStart ? 
                        `${formatShiftTime(cashier.shiftStart)} إلى ${formatShiftTime(cashier.shiftEnd || new Date().toString())}` :
                        t('dashboard.notStarted')
                      }
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(cashier.totalSales)}</p>
                  {getDiscrepancyText(cashier.discrepancy)}
                </div>
              </div>
              <Progress 
                value={cashier.performance} 
                className={`h-2 ${getPerformanceColor(cashier.performance)}`} 
              />
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <a href="/daily-sales" className="text-secondary hover:text-secondary-dark font-medium text-sm">
            {t('dashboard.viewAllCashiers')}
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
