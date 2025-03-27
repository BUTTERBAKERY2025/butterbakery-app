import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { formatDate } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

interface Branch {
  id: number;
  name: string;
}

interface Cashier {
  id: number;
  name: string;
}

interface BranchSelectorProps {
  selectedBranchId: number | null;
  onBranchChange: (branchId: number) => void;
  onRefresh?: () => void;
  filterOptions?: {
    selectedCashierId?: number | null;
    onCashierChange?: (cashierId: number | null) => void;
    dateRange?: DateRange | null;
    onDateRangeChange?: (range: DateRange | null) => void;
    discrepancyFilter?: string | null;
    onDiscrepancyFilterChange?: (filter: string | null) => void;
  };
}

export default function BranchSelector({ 
  selectedBranchId, 
  onBranchChange, 
  onRefresh,
  filterOptions 
}: BranchSelectorProps) {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);

  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ['/api/branches'],
    queryFn: async () => {
      const res = await fetch('/api/branches');
      if (!res.ok) throw new Error('Failed to fetch branches');
      return res.json();
    }
  });

  // Fetch cashiers if a branch is selected
  const { data: cashiers = [] } = useQuery({
    queryKey: ['/api/users', { role: 'cashier', branchId: selectedBranchId }],
    queryFn: async () => {
      if (!selectedBranchId) return [];
      const res = await fetch(`/api/users?role=cashier&branchId=${selectedBranchId}`);
      if (!res.ok) throw new Error('Failed to fetch cashiers');
      return res.json();
    },
    enabled: !!selectedBranchId
  });

  // Format date in English (Gregorian) with English numerals
  const formattedDate = formatDate(currentDate, 'long');

  // Set the first branch as selected if none is selected
  useEffect(() => {
    if (!selectedBranchId && branches.length > 0) {
      onBranchChange(branches[0].id);
    }
  }, [branches, selectedBranchId, onBranchChange]);

  const handleRefresh = () => {
    setCurrentDate(new Date());
    if (onRefresh) onRefresh();
  };

  return (
    <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-sm border border-indigo-100">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600 mr-2">
              <circle cx="12" cy="12" r="8" />
              <path d="m12 2-2 1 2 1 2-1-2-1Z" />
              <path d="m12 22 2-1-2-1-2 1 2 1Z" />
              <path d="m19 5-1.5-1-2 2 1.5 1 2-2Z" />
              <path d="m5 19 1.5 1 2-2-1.5-1-2 2Z" />
              <path d="m2 12 1-2 1 2-1 2-1-2Z" />
              <path d="m22 12-1 2-1-2 1-2 1 2Z" />
              <path d="m19 19-2-2-1.5 1 2 2 1.5-1Z" />
              <path d="m5 5 2 2 1.5-1-2-2L5 5Z" />
            </svg>
            <h3 className="font-bold text-indigo-900">{t('branchSelector.chooseBranch')}</h3>
          </div>
          
          <div className="flex-1 max-w-md">
            <Select
              value={selectedBranchId?.toString() || "0"}
              onValueChange={(value) => {
                console.log('Branch selector change:', value);
                if (value === "0") {
                  onBranchChange(0); // إرسال 0 للدلالة على "جميع الفروع"
                } else {
                  onBranchChange(parseInt(value));
                }
              }}
            >
              <SelectTrigger className="w-full bg-white border-indigo-200">
                <SelectValue placeholder={t('branchSelector.selectBranch')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">{t('branchSelector.allBranches')}</SelectItem>
                {branches.map((branch: Branch) => (
                  <SelectItem key={branch.id} value={branch.id.toString()}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-white px-3 py-1.5 rounded-md border border-indigo-200">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500 mr-2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span className="text-sm font-medium text-indigo-900">{formattedDate}</span>
            </div>
            
            <Button 
              variant="outline"
              onClick={() => setIsAdvancedFiltersOpen(!isAdvancedFiltersOpen)}
              className={`border-indigo-200 hover:bg-indigo-50 ${isAdvancedFiltersOpen ? 'bg-indigo-100 text-indigo-900' : 'bg-white text-indigo-700'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              {t('branchSelector.filters')}
            </Button>
            
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleRefresh}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
                <path d="M21 12a9 9 0 0 1-9 9c-4.97 0-9-4.03-9-9s4.03-9 9-9h3" />
                <path d="M15 3v6h6" />
                <path d="M16 16v-3a3 3 0 0 0-6 0v0" />
              </svg>
              {t('branchSelector.refresh')}
            </Button>
          </div>
        </div>
        
        {isAdvancedFiltersOpen && filterOptions && (
          <div className="mt-4 pt-4 border-t border-indigo-200 grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/70 p-4 rounded-lg shadow-inner">
            {/* Cashier Filter */}
            <div className="space-y-1">
              <label className="text-sm font-medium flex items-center text-indigo-900">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                {t('dailySales.cashier')}:
              </label>
              <Select
                value={filterOptions.selectedCashierId?.toString() || ""}
                onValueChange={(value) => filterOptions.onCashierChange?.(value === "all" ? null : parseInt(value))}
              >
                <SelectTrigger className="bg-white border-indigo-200">
                  <SelectValue placeholder={t('branchSelector.selectCashier')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('branchSelector.discrepancyAll')}</SelectItem>
                  {cashiers.map((cashier: Cashier) => (
                    <SelectItem key={cashier.id} value={cashier.id.toString()}>
                      {cashier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Date Range Filter */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium flex items-center text-indigo-900">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {t('branchSelector.dateRange')}:
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-right bg-white border-indigo-200">
                    {filterOptions.dateRange?.from ? (
                      filterOptions.dateRange.to ? (
                        <>
                          {format(filterOptions.dateRange.from, "dd/MM/yyyy")} - {" "}
                          {format(filterOptions.dateRange.to, "dd/MM/yyyy")}
                        </>
                      ) : (
                        format(filterOptions.dateRange.from, "dd/MM/yyyy")
                      )
                    ) : (
                      <span>{t('branchSelector.dateRange')}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={filterOptions.dateRange || undefined}
                    onSelect={(range) => filterOptions.onDateRangeChange?.(range || null)}
                    initialFocus
                  />
                  {filterOptions.dateRange && (
                    <div className="p-2 border-t">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full"
                        onClick={() => filterOptions.onDateRangeChange?.(null)}
                      >
                        {t('branchSelector.clearFilters')}
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Discrepancy Filter */}
            <div className="space-y-1">
              <label className="text-sm font-medium flex items-center text-indigo-900">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                  <path d="M12 18V6" />
                </svg>
                {t('branchSelector.discrepancyFilter')}:
              </label>
              <Select
                value={filterOptions.discrepancyFilter || "all"}
                onValueChange={(value) => filterOptions.onDiscrepancyFilterChange?.(value === "all" ? null : value)}
              >
                <SelectTrigger className="bg-white border-indigo-200">
                  <SelectValue placeholder={t('branchSelector.discrepancyAll')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('branchSelector.discrepancyAll')}</SelectItem>
                  <SelectItem value="shortage">{t('branchSelector.discrepancyDeficit')}</SelectItem>
                  <SelectItem value="excess">{t('branchSelector.discrepancySurplus')}</SelectItem>
                  <SelectItem value="balanced">{t('branchSelector.discrepancyBalanced')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
