import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useTranslation } from 'react-i18next';
import { DashboardStats } from '@shared/schema';
import { cn } from '@/lib/utils';

interface QuickStatsProps {
  stats: DashboardStats;
}

export default function QuickStats({ stats }: QuickStatsProps) {
  const { t } = useTranslation();
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SAR',
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {/* Daily Sales Stats */}
      <Card className="overflow-hidden border-0 shadow-md">
        <div className="h-1 bg-gradient-to-l from-amber-400 to-amber-600"></div>
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-amber-800 text-sm font-medium">{t('dashboard.dailySales')}</p>
              <h3 className="text-3xl font-extrabold mt-2 bg-gradient-to-l from-amber-600 to-amber-800 text-transparent bg-clip-text">{formatCurrency(stats.dailySales)}</h3>
              <div className="flex items-center mt-2 text-emerald-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                  <path d="m5 12 7-7 7 7"/>
                  <path d="M12 19V5"/>
                </svg>
                <span className="text-xs font-bold">{t('dashboard.comparedToYesterday', { percentage: '12.5%' })}</span>
              </div>
            </div>
            <div className="bg-amber-100 p-3 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="M2 8h20"/>
                <path d="M6 12h4"/>
                <path d="M6 16h4"/>
                <path d="m14.5 12-1 2h3l-1 2"/>
              </svg>
            </div>
          </div>
          <div className="mt-5">
            <Progress value={stats.dailyTargetPercentage} className="h-2.5 rounded-full bg-amber-100" indicatorClassName="bg-gradient-to-l from-amber-400 to-amber-600 rounded-full" />
            <div className="flex justify-between text-xs font-medium mt-2">
              <span className="text-amber-700">{t('dashboard.dailyTarget')}: {formatCurrency(stats.dailyTarget)}</span>
              <span className="text-amber-900 font-bold">{Math.round(stats.dailyTargetPercentage)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Target Stats */}
      <Card className="overflow-hidden border-0 shadow-md">
        <div className="h-1 bg-gradient-to-l from-green-400 to-green-600"></div>
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-green-800 text-sm font-medium">{t('dashboard.monthlyTargetAchievement')}</p>
              <h3 className="text-3xl font-extrabold mt-2 bg-gradient-to-l from-green-600 to-green-800 text-transparent bg-clip-text">{formatCurrency(stats.monthlySalesAmount)}</h3>
              <div className="flex items-center mt-2 text-green-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                  <circle cx="12" cy="12" r="10"/>
                  <circle cx="12" cy="12" r="6"/>
                  <circle cx="12" cy="12" r="2"/>
                </svg>
                <span className="text-xs font-bold">{Math.round(stats.monthlyTargetPercentage)}% {t('dashboard.ofTarget')}</span>
              </div>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                <path d="m2 12 5.25 5 2-2-3.25-3 3.25-3-2-2z"/>
                <path d="m9 12 5.25 5 2-2-3.25-3 3.25-3-2-2z"/>
                <path d="m16 12 5.25 5 2-2-3.25-3 3.25-3-2-2z"/>
              </svg>
            </div>
          </div>
          <div className="mt-5">
            <Progress value={stats.monthlyTargetPercentage} className="h-2.5 rounded-full bg-green-100" indicatorClassName="bg-gradient-to-l from-green-400 to-green-600 rounded-full" />
            <div className="flex justify-between text-xs font-medium mt-2">
              <span className="text-green-700">{t('dashboard.target')}: {formatCurrency(stats.monthlyTargetAmount)}</span>
              <span className="text-green-900 font-bold">{Math.round(stats.monthlyTargetPercentage)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Average Ticket Stats */}
      <Card className="overflow-hidden border-0 shadow-md">
        <div className="h-1 bg-gradient-to-l from-blue-400 to-blue-600"></div>
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-800 text-sm font-medium">{t('dashboard.averageTicket')}</p>
              <h3 className="text-3xl font-extrabold mt-2 bg-gradient-to-l from-blue-600 to-blue-800 text-transparent bg-clip-text">{formatCurrency(stats.averageTicket)}</h3>
              <div className="flex items-center mt-2 text-rose-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                  <path d="m5 5 7 7 7-7"/>
                  <path d="M5 12h14"/>
                  <path d="m5 19 7-7 7 7"/>
                </svg>
                <span className="text-xs font-bold">2.3% {t('dashboard.comparedToLastWeek')}</span>
              </div>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                <path d="M20 9V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v2"/>
                <path d="M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2h-2v-2a2 2 0 0 0-4 0v2h-2v-2a2 2 0 0 0-4 0v2H4v-2a2 2 0 0 0-2 0Z"/>
              </svg>
            </div>
          </div>
          <div className="mt-5">
            <Progress value={65} className="h-2.5 rounded-full bg-blue-100" indicatorClassName="bg-gradient-to-l from-blue-400 to-blue-600 rounded-full" />
            <div className="flex justify-between text-xs font-medium mt-2">
              <span className="text-blue-700">{t('dashboard.target')}: {formatCurrency(85)}</span>
              <span className="text-blue-900 font-bold">65%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cash Discrepancy Stats */}
      <Card className="overflow-hidden border-0 shadow-md">
        <div className={cn(
          "h-1 bg-gradient-to-l",
          stats.cashDiscrepancy === undefined ? "from-gray-400 to-gray-600" :
          stats.cashDiscrepancy === 0 ? "from-gray-400 to-gray-600" :
          stats.cashDiscrepancy > 0 ? "from-green-400 to-green-600" :
          "from-red-400 to-red-600"
        )}></div>
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className={cn(
                "text-sm font-medium",
                stats.cashDiscrepancy === undefined ? "text-gray-800" :
                stats.cashDiscrepancy === 0 ? "text-gray-800" :
                stats.cashDiscrepancy > 0 ? "text-green-800" :
                "text-red-800"
              )}>{t('dashboard.cashDiscrepancy')}</p>
              <div className="flex items-center mt-2">
                <h3 className={cn(
                  "text-3xl font-extrabold mr-2",
                  stats.cashDiscrepancy === undefined ? "text-gray-700" :
                  stats.cashDiscrepancy === 0 ? "text-gray-700" :
                  stats.cashDiscrepancy > 0 ? "text-green-600" :
                  "text-red-600"
                )}>
                  {formatCurrency(stats.cashDiscrepancy || 0)}
                </h3>
                {stats.cashDiscrepancy !== undefined && stats.cashDiscrepancy > 0 && (
                  <span className="text-xs text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
                    {t('dailyReports.cashExcess')}
                  </span>
                )}
                {stats.cashDiscrepancy !== undefined && stats.cashDiscrepancy < 0 && (
                  <span className="text-xs text-red-700 bg-red-100 px-1.5 py-0.5 rounded-full">
                    {t('dailyReports.cashShortage')}
                  </span>
                )}
              </div>
              <div className="flex items-center mt-2">
                {stats.cashDiscrepancy !== undefined && stats.cashDiscrepancy === 0 && (
                  <span className="text-xs font-bold text-green-600">
                    {t('dashboard.perfectBalance')}
                  </span>
                )}
                {stats.cashDiscrepancy !== undefined && stats.cashDiscrepancy !== 0 && (
                  <span className={cn(
                    "text-xs font-bold",
                    stats.cashDiscrepancy > 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {stats.cashDiscrepancy > 0 
                      ? t('dashboard.excessCashFound') 
                      : t('dashboard.missingCash')}
                  </span>
                )}
              </div>
            </div>
            <div className={cn(
              "p-3 rounded-lg",
              stats.cashDiscrepancy === undefined ? "bg-gray-100" :
              stats.cashDiscrepancy === 0 ? "bg-gray-100" :
              stats.cashDiscrepancy > 0 ? "bg-green-100" :
              "bg-red-100"
            )}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn(
                stats.cashDiscrepancy === undefined ? "text-gray-600" :
                stats.cashDiscrepancy === 0 ? "text-gray-600" :
                stats.cashDiscrepancy > 0 ? "text-green-600" :
                "text-red-600"
              )}>
                {stats.cashDiscrepancy !== undefined && stats.cashDiscrepancy < 0 ? (
                  // Warning icon for missing cash
                  <>
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </>
                ) : stats.cashDiscrepancy !== undefined && stats.cashDiscrepancy > 0 ? (
                  // Money icon for excess cash
                  <>
                    <rect x="2" y="6" width="20" height="12" rx="2" />
                    <path d="M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
                    <path d="M6 12h.01M18 12h.01" />
                  </>
                ) : (
                  // Check icon for balanced cash
                  <>
                    <path d="M20 6 9 17l-5-5" />
                  </>
                )}
              </svg>
            </div>
          </div>
          <div className="mt-5">
            <Progress 
              value={stats.cashDiscrepancy === undefined ? 0 : 
                     stats.cashDiscrepancy === 0 ? 100 : 
                     Math.min(Math.abs(stats.cashDiscrepancy) / 100, 100)} 
              className={cn(
                "h-2.5 rounded-full", 
                stats.cashDiscrepancy === undefined ? "bg-gray-100" :
                stats.cashDiscrepancy === 0 ? "bg-gray-100" :
                stats.cashDiscrepancy > 0 ? "bg-green-100" :
                "bg-red-100"
              )} 
              indicatorClassName={cn(
                "rounded-full",
                stats.cashDiscrepancy === undefined ? "bg-gray-400" :
                stats.cashDiscrepancy === 0 ? "bg-gray-400" :
                stats.cashDiscrepancy > 0 ? "bg-gradient-to-l from-green-400 to-green-600" :
                "bg-gradient-to-l from-red-400 to-red-600"
              )} 
            />
            <div className="flex justify-between text-xs font-medium mt-2">
              <span className={cn(
                stats.cashDiscrepancy === undefined ? "text-gray-700" :
                stats.cashDiscrepancy === 0 ? "text-gray-700" :
                stats.cashDiscrepancy > 0 ? "text-green-700" :
                "text-red-700"
              )}>
                {stats.cashDiscrepancy === undefined || stats.cashDiscrepancy === 0 
                  ? t('dashboard.balancedCash')
                  : stats.cashDiscrepancy > 0 
                    ? t('dashboard.excessCash')
                    : t('dashboard.cashShortage')
                }
              </span>
              {stats.cashDiscrepancy !== undefined && stats.cashDiscrepancy !== 0 && (
                <span className={cn(
                  "font-bold",
                  stats.cashDiscrepancy > 0 ? "text-green-900" : "text-red-900"
                )}>
                  {Math.min(Math.abs(stats.cashDiscrepancy) / 100, 100).toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Transactions Stats */}
      <Card className="overflow-hidden border-0 shadow-md">
        <div className="h-1 bg-gradient-to-l from-purple-400 to-purple-600"></div>
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-purple-800 text-sm font-medium">{t('dashboard.dailyTransactions')}</p>
              <h3 className="text-3xl font-extrabold mt-2 bg-gradient-to-l from-purple-600 to-purple-800 text-transparent bg-clip-text">{stats.totalTransactions}</h3>
              <div className="flex items-center mt-2 text-emerald-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                  <path d="m5 12 7-7 7 7"/>
                  <path d="M12 19V5"/>
                </svg>
                <span className="text-xs font-bold">5.8% {t('dashboard.aboveAverage')}</span>
              </div>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600">
                <circle cx="9" cy="9" r="5"/>
                <path d="m17 6-3.8 3.8"/>
                <path d="M14 17H7a5 5 0 0 1-5-5"/>
                <path d="m16 7 1.9-1.9a2.5 2.5 0 0 1 3.535 3.536L19.5 10.5"/>
                <path d="M14 17a5 5 0 0 0 9.5-2"/>
              </svg>
            </div>
          </div>
          <div className="mt-5">
            <Progress value={92} className="h-2.5 rounded-full bg-purple-100" indicatorClassName="bg-gradient-to-l from-purple-400 to-purple-600 rounded-full" />
            <div className="flex justify-between text-xs font-medium mt-2">
              <span className="text-purple-700">{t('dashboard.dailyAverage')}: 180</span>
              <span className="text-purple-900 font-bold">92%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
