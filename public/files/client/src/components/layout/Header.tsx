import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface HeaderProps {
  onMobileMenuToggle: () => void;
  pageTitle?: string;
}

export default function Header({ onMobileMenuToggle, pageTitle = 'لوحة التحكم' }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [location] = useLocation();
  const { toast } = useToast();
  
  // Get unread notifications count
  const { data: notifications } = useQuery({
    queryKey: ['/api/notifications', { unreadOnly: true }],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(`${queryKey[0]}?unreadOnly=true`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
  });

  const unreadCount = notifications?.length || 0;

  const handleLanguageToggle = (checked: boolean) => {
    const newLang = checked ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
    // Direction and language are now handled by i18n.on('languageChanged') in i18n.ts
    // This will also save the preference to localStorage
    
    // Show a toast notification about the language change
    toast({
      title: newLang === 'ar' ? 'تم تغيير اللغة' : 'Language Changed',
      description: newLang === 'ar' ? 'تم التبديل إلى اللغة العربية' : 'Switched to English',
      variant: 'default',
    });
  };

  return (
    <header className="bg-white border-b border-neutral-200 h-16 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center">
        <button 
          onClick={onMobileMenuToggle}
          className="lg:hidden mr-2"
        >
          <i className="fas fa-bars text-neutral-600"></i>
        </button>
        <h2 className="text-xl font-bold text-neutral-800">{pageTitle}</h2>
      </div>
      
      <div className="flex items-center space-x-4 space-x-reverse">
        <div className="relative">
          <div className="flex items-center border rounded px-2 py-1">
            <Switch 
              id="language-toggle" 
              onCheckedChange={handleLanguageToggle}
              checked={i18n.language === 'en'}
              className="ml-2"
            />
            <Label 
              htmlFor="language-toggle"
              className="mr-1 text-sm font-medium text-neutral-700 cursor-pointer select-none"
            >
              {i18n.language === 'ar' ? 'العربية' : 'English'}
            </Label>
          </div>
        </div>
        
        <div className="relative">
          <button 
            className="text-neutral-600 hover:text-neutral-800"
            onClick={() => {
              if (unreadCount > 0) {
                window.location.href = '/notifications';
              }
            }}
          >
            <i className="fas fa-bell text-xl"></i>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-accent text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
        
        <div className="relative">
          <button className="text-neutral-600 hover:text-neutral-800">
            <i className="fas fa-search text-xl"></i>
          </button>
        </div>
      </div>
    </header>
  );
}
