import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslation } from 'react-i18next';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, getMonthName } from '@/lib/utils';

interface BranchTarget {
  branchId: number;
  branchName: string;
  target: number;
  achieved: number;
  percentage: number;
  status: string;
}

interface BranchTargetAchievementProps {
  data: BranchTarget[];
}

export default function BranchTargetAchievement({ data = [] }: BranchTargetAchievementProps) {
  const { t } = useTranslation();
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth() + 1 + '/' + new Date().getFullYear());

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ممتاز': return 'bg-success bg-opacity-10 text-success';
      case 'جيد جدًا': return 'bg-info bg-opacity-10 text-info';
      case 'جيد': return 'bg-warning bg-opacity-10 text-warning';
      case 'يحتاج تحسين': return 'bg-danger bg-opacity-10 text-danger';
      default: return 'bg-neutral-200 text-neutral-700';
    }
  };

  const renderMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    // Add current month and previous 5 months
    for (let i = 0; i < 6; i++) {
      let month = currentMonth - i;
      let year = currentYear;
      
      if (month <= 0) {
        month += 12;
        year -= 1;
      }
      
      const monthName = getMonthName(month);
      options.push(
        <SelectItem key={`${month}/${year}`} value={`${month}/${year}`}>
          {monthName} {year}
        </SelectItem>
      );
    }
    
    return options;
  };

  return (
    <Card className="mb-6 lg:col-span-2">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg">{t('dashboard.monthlyTargetAchievement')}</h3>
          <Select
            value={selectedMonth}
            onValueChange={setSelectedMonth}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('dashboard.selectMonth')} />
            </SelectTrigger>
            <SelectContent>
              {renderMonthOptions()}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">{t('dashboard.branch')}</TableHead>
                <TableHead className="text-right">{t('dashboard.target')}</TableHead>
                <TableHead className="text-right">{t('dashboard.achieved')}</TableHead>
                <TableHead className="text-right">{t('dashboard.achievementPercentage')}</TableHead>
                <TableHead className="text-right">{t('dashboard.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((branch) => (
                <TableRow key={branch.branchId}>
                  <TableCell className="font-medium">{branch.branchName}</TableCell>
                  <TableCell>{formatCurrency(branch.target)}</TableCell>
                  <TableCell>{formatCurrency(branch.achieved)}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <div className="w-full bg-neutral-200 rounded-full h-2 ml-2">
                        <div 
                          className={`h-2 rounded-full ${
                            typeof branch.percentage !== 'number' ? 'bg-neutral-400' :
                            branch.percentage >= 90 ? 'bg-success' : 
                            branch.percentage >= 75 ? 'bg-info' : 
                            branch.percentage >= 60 ? 'bg-warning' : 'bg-danger'
                          }`} 
                          style={{ width: `${Math.min(100, branch.percentage || 0)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-neutral-900">
                        {typeof branch.percentage === 'number' ? branch.percentage.toFixed(1) : '0.0'}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(branch.status || 'غير محدد')}>
                      {branch.status || 'غير محدد'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
