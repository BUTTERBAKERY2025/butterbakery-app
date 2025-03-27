import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { Progress } from '@/components/ui/progress';
import { Area, AreaChart, LineChart, Line, BarChart, Bar, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DashboardStats } from '@shared/schema';

interface SalesAnalyticsProps {
  stats: DashboardStats;
  salesData: Array<{
    date: string;
    cashSales: number;
    networkSales: number;
    totalSales: number;
    target: number;
  }>;
}

export default function SalesAnalytics({ stats = { 
  dailySales: 0,
  dailyTarget: 0,
  dailyTargetPercentage: 0,
  monthlyTargetAmount: 0,
  monthlySalesAmount: 0,
  monthlyTargetPercentage: 0,
  averageTicket: 0,
  totalTransactions: 0,
  cashDiscrepancy: 0,
  paymentMethodsBreakdown: {
    cash: { amount: 0, percentage: 0 },
    network: { amount: 0, percentage: 0 }
  }
}, salesData = [] }: SalesAnalyticsProps) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [activeView, setActiveView] = useState<'overview' | 'trends' | 'comparison'>('overview');

  // Format currency using Arabic locale for proper RTL display
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Calculate growth rate compared to previous period
  const calculateGrowth = () => {
    if (salesData.length < 2) return 0;
    
    const lastDays = salesData.slice(-3);
    const previousDays = salesData.slice(-6, -3);
    
    const lastTotal = lastDays.reduce((sum, day) => sum + day.totalSales, 0);
    const previousTotal = previousDays.reduce((sum, day) => sum + day.totalSales, 0);
    
    if (previousTotal === 0) return 0;
    return ((lastTotal - previousTotal) / previousTotal) * 100;
  };

  const growthRate = calculateGrowth();

  const renderContent = () => {
    switch (activeView) {
      case 'trends':
        return (
          <div className="p-4">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={salesData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickFormatter={(value) => typeof value === 'number' ? value.toFixed(0).replace(/B(?=(d{3})+(?!d))/g, ",") : value}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      borderColor: '#e5e7eb',
                      borderRadius: '0.375rem',
                      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
                    }}
                    labelFormatter={(label) => t('dashboard.date') + ': ' + label}
                  />
                  <Legend 
                    verticalAlign="top"
                    height={30}
                    formatter={(value) => <span style={{ color: '#4b5563', fontSize: '0.75rem' }}>{value}</span>}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="totalSales" 
                    name={t('dashboard.totalSales')}
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ stroke: '#10b981', strokeWidth: 2, fill: 'white', r: 3 }}
                    activeDot={{ stroke: '#10b981', strokeWidth: 2, fill: 'white', r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cashSales" 
                    name={t('dashboard.cashSales')}
                    stroke="#6366f1" 
                    strokeWidth={2}
                    dot={{ stroke: '#6366f1', strokeWidth: 2, fill: 'white', r: 3 }}
                    activeDot={{ stroke: '#6366f1', strokeWidth: 2, fill: 'white', r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="networkSales" 
                    name={t('dashboard.networkSales')}
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    dot={{ stroke: '#8b5cf6', strokeWidth: 2, fill: 'white', r: 3 }}
                    activeDot={{ stroke: '#8b5cf6', strokeWidth: 2, fill: 'white', r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="target" 
                    name={t('dashboard.target')}
                    stroke="#f59e0b" 
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    dot={{ stroke: '#f59e0b', strokeWidth: 2, fill: 'white', r: 3 }}
                    activeDot={{ stroke: '#f59e0b', strokeWidth: 2, fill: 'white', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      case 'comparison':
        return (
          <div className="p-4">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={salesData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  barSize={20}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickFormatter={(value) => typeof value === 'number' ? value.toFixed(0).replace(/B(?=(d{3})+(?!d))/g, ",") : value}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      borderColor: '#e5e7eb',
                      borderRadius: '0.375rem',
                      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
                    }}
                    labelFormatter={(label) => t('dashboard.date') + ': ' + label}
                  />
                  <Legend 
                    verticalAlign="top"
                    height={30}
                    formatter={(value) => <span style={{ color: '#4b5563', fontSize: '0.75rem' }}>{value}</span>}
                  />
                  <Bar 
                    dataKey="totalSales" 
                    name={t('dashboard.totalSales')}
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="target" 
                    name={t('dashboard.target')}
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      case 'overview':
      default:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
            {/* Sales Chart */}
            <div className="lg:col-span-2 border-b lg:border-b-0 lg:border-l border-indigo-100">
              <div className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-base text-indigo-900">{t('dashboard.salesTrend')}</h4>
                  
                  {/* Growth rate indicator */}
                  <div className={`px-2 py-1 rounded-full text-xs ${growthRate > 0 ? 'bg-green-100 text-green-800' : growthRate < 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                    <div className="flex items-center">
                      {growthRate > 0 ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                          <path d="m18 15-6-6-6 6"/>
                        </svg>
                      ) : growthRate < 0 ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                          <path d="m6 9 6 6 6-6"/>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                          <path d="M5 12h14"/>
                        </svg>
                      )}
                      {growthRate > 0 
                        ? `+${Math.abs(growthRate).toFixed(1)}%` 
                        : growthRate < 0 
                          ? `-${Math.abs(growthRate).toFixed(1)}%`
                          : `0%`}
                    </div>
                  </div>
                </div>

                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={salesData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="colorCard" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#6b7280"
                        fontSize={12}
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb' }}
                      />
                      <YAxis 
                        stroke="#6b7280"
                        fontSize={12}
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb' }}
                        tickFormatter={(value) => typeof value === 'number' ? value.toFixed(0).replace(/B(?=(d{3})+(?!d))/g, ",") : value}
                      />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          borderColor: '#e5e7eb',
                          borderRadius: '0.375rem',
                          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
                        }}
                        labelFormatter={(label) => t('dashboard.date') + ': ' + label}
                      />
                      <Legend 
                        verticalAlign="top"
                        height={30}
                        formatter={(value) => <span style={{ color: '#4b5563', fontSize: '0.75rem' }}>{value}</span>}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="cashSales" 
                        name={t('dashboard.cashSales')}
                        stroke="#6366f1" 
                        fillOpacity={1} 
                        fill="url(#colorCash)"
                        strokeWidth={2}
                        dot={{ stroke: '#6366f1', strokeWidth: 2, fill: 'white', r: 3 }}
                        activeDot={{ stroke: '#6366f1', strokeWidth: 2, fill: 'white', r: 4 }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="networkSales" 
                        name={t('dashboard.networkSales')}
                        stroke="#8b5cf6" 
                        fillOpacity={1} 
                        fill="url(#colorCard)"
                        strokeWidth={2}
                        dot={{ stroke: '#8b5cf6', strokeWidth: 2, fill: 'white', r: 3 }}
                        activeDot={{ stroke: '#8b5cf6', strokeWidth: 2, fill: 'white', r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="totalSales" 
                        name={t('dashboard.totalSales')}
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ stroke: '#10b981', strokeWidth: 2, fill: 'white', r: 3 }}
                        activeDot={{ stroke: '#10b981', strokeWidth: 2, fill: 'white', r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="target" 
                        name={t('dashboard.target')}
                        stroke="#f59e0b" 
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        dot={{ stroke: '#f59e0b', strokeWidth: 2, fill: 'white', r: 3 }}
                        activeDot={{ stroke: '#f59e0b', strokeWidth: 2, fill: 'white', r: 4 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="p-4">
              <h4 className="font-medium text-base text-indigo-900 mb-4">{t('dashboard.paymentDistribution')}</h4>
              <div className="space-y-6 px-1 py-2">
                {/* Cash Payments */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center">
                      <div className="bg-indigo-100 p-2 rounded-full ml-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
                          <rect width="20" height="12" x="2" y="6" rx="2" />
                          <circle cx="12" cy="12" r="2" />
                          <path d="M6 12h.01M18 12h.01" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-indigo-900">{t('dashboard.cash')}</p>
                        <p className="text-sm text-indigo-600">{formatCurrency(stats.paymentMethodsBreakdown.cash.amount)}</p>
                      </div>
                    </div>
                    <span className="font-medium text-sm bg-indigo-100 text-indigo-800 px-2 py-1 rounded-md">
                      {stats.paymentMethodsBreakdown.cash.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="relative">
                    <Progress 
                      value={stats.paymentMethodsBreakdown.cash.percentage * 100} 
                      className="h-2.5 bg-indigo-100 rounded-md" 
                      indicatorClassName="bg-indigo-500 rounded-md"
                    />
                  </div>
                </div>

                {/* Network Payments */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center">
                      <div className="bg-purple-100 p-2 rounded-full ml-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600">
                          <rect width="20" height="14" x="2" y="5" rx="2" />
                          <line x1="2" x2="22" y1="10" y2="10" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-purple-900">{t('dashboard.network')}</p>
                        <p className="text-sm text-purple-600">{formatCurrency(stats.paymentMethodsBreakdown.network.amount)}</p>
                      </div>
                    </div>
                    <span className="font-medium text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded-md">
                      {stats.paymentMethodsBreakdown.network.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="relative">
                    <Progress 
                      value={stats.paymentMethodsBreakdown.network.percentage * 100} 
                      className="h-2.5 bg-purple-100 rounded-md" 
                      indicatorClassName="bg-purple-500 rounded-md"
                    />
                  </div>
                </div>

                {/* Key Statistics */}
                <div className="mt-8 pt-4 border-t border-indigo-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-indigo-50 rounded-lg p-3 shadow-sm border border-indigo-100">
                      <div className="flex items-center mb-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600 mr-2">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        <span className="text-xs font-medium text-indigo-800">{t('dashboard.transactions')}</span>
                      </div>
                      <div className="text-xl font-bold text-indigo-900">{stats.totalTransactions}</div>
                    </div>
                    
                    <div className="bg-green-50 rounded-lg p-3 shadow-sm border border-green-100">
                      <div className="flex items-center mb-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 mr-2">
                          <line x1="2" x2="5" y1="12" y2="12" />
                          <line x1="19" x2="22" y1="12" y2="12" />
                          <line x1="12" x2="12" y1="2" y2="5" />
                          <line x1="12" x2="12" y1="19" y2="22" />
                          <circle cx="12" cy="12" r="7" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        <span className="text-xs font-medium text-green-800">{t('dashboard.averageTicket')}</span>
                      </div>
                      <div className="text-xl font-bold text-green-900">{formatCurrency(stats.averageTicket)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="mb-6">
      <Card className="overflow-hidden bg-white border border-indigo-100 shadow-sm">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-3 border-b border-indigo-100">
          <div className="flex justify-between items-center flex-wrap">
            <div className="flex items-center mb-2 md:mb-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600 mr-2">
                <path d="M3 3v18h18"/>
                <path d="m8 9 3-3 1 1 3-3"/>
                <path d="m8 15 3-3 1 1 3-3"/>
              </svg>
              <h3 className="font-bold text-xl text-indigo-900">{t('dashboard.salesAnalysis')}</h3>
            </div>
            
            <div className="flex space-x-1 space-x-reverse bg-white p-1 rounded-lg border border-indigo-100 shadow-sm">
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => setActiveView('overview')}
                className={`px-3 py-1 text-xs ${activeView === 'overview' ? 'bg-indigo-100 text-indigo-900' : 'text-indigo-600'}`}
              >
                {t('dashboard.overview')}
              </Button>
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => setActiveView('trends')}
                className={`px-3 py-1 text-xs ${activeView === 'trends' ? 'bg-indigo-100 text-indigo-900' : 'text-indigo-600'}`}
              >
                {t('dashboard.trends')}
              </Button>
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => setActiveView('comparison')}
                className={`px-3 py-1 text-xs ${activeView === 'comparison' ? 'bg-indigo-100 text-indigo-900' : 'text-indigo-600'}`}
              >
                {t('dashboard.comparison')}
              </Button>
            </div>
            
            <div className="flex space-x-1 space-x-reverse bg-white p-1 rounded-lg border border-indigo-100 shadow-sm">
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => setPeriod('weekly')}
                className={`px-3 py-1 text-xs ${period === 'weekly' ? 'bg-indigo-100 text-indigo-900' : 'text-indigo-600'}`}
              >
                {t('dashboard.weekly')}
              </Button>
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => setPeriod('monthly')}
                className={`px-3 py-1 text-xs ${period === 'monthly' ? 'bg-indigo-100 text-indigo-900' : 'text-indigo-600'}`}
              >
                {t('dashboard.monthly')}
              </Button>
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => setPeriod('yearly')}
                className={`px-3 py-1 text-xs ${period === 'yearly' ? 'bg-indigo-100 text-indigo-900' : 'text-indigo-600'}`}
              >
                {t('dashboard.yearly')}
              </Button>
            </div>
          </div>
        </div>
        
        <CardContent className="p-0">
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}