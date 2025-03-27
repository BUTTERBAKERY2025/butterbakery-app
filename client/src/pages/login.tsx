import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@shared/schema';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';
import '@/components/ui/logo.css';

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const { t, i18n } = useTranslation();
  const { login, isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // تهيئة نموذج تسجيل الدخول
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });
  
  // التحويل إلى لوحة التحكم في حالة كان المستخدم مسجل الدخول بالفعل
  useEffect(() => {
    if (isAuthenticated && user) {
      setLocation('/dashboard');
    }
  }, [isAuthenticated, user, setLocation]);
  
  // عملية تسجيل الدخول
  const onSubmit = async (values: LoginFormValues) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const success = await login(values.username, values.password);
      
      if (success) {
        // التحويل إلى لوحة التحكم في حالة نجاح تسجيل الدخول
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('خطأ في تسجيل الدخول:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-neutral-100 p-4">
      <div className="absolute inset-0 overflow-hidden opacity-30 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-amber-200 blur-3xl"></div>
        <div className="absolute top-1/3 -right-24 w-64 h-64 rounded-full bg-orange-200 blur-3xl"></div>
        <div className="absolute -bottom-32 left-1/4 w-72 h-72 rounded-full bg-amber-100 blur-3xl"></div>
      </div>
      <Card className="w-full max-w-md shadow-xl border-orange-100 relative z-10">
        <CardContent className="pt-8 px-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4 transform hover:scale-105 transition-transform duration-300">
              <div className="butter-bakery-logo w-64 h-32"></div>
            </div>
            <h1 className="text-3xl font-bold text-orange-600 mt-1 tracking-wide">
              <span className="text-amber-500">Butter</span>
              <span className="text-orange-600">Bakery</span>
            </h1>
            <p className="text-neutral-700 mt-2 italic font-light">
              {t('login.welcomeMessage')}
            </p>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-orange-700">{t('login.username')}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={t('login.usernamePlaceholder')}
                        className="border-orange-200 focus-visible:ring-orange-400 transition-all duration-300 rounded-lg"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-orange-600" />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-orange-700">{t('login.password')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder={t('login.passwordPlaceholder')}
                        className="border-orange-200 focus-visible:ring-orange-400 transition-all duration-300 rounded-lg"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-orange-600" />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="relative w-full overflow-hidden bg-gradient-to-r from-amber-500 to-orange-600 hover:from-orange-500 hover:to-amber-600 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300 mt-6 py-6 text-lg rounded-xl group" 
                disabled={isSubmitting}
              >
                <span className="absolute inset-0 w-full h-full transition-all duration-300 ease-out opacity-0 bg-gradient-to-br from-amber-50 to-transparent group-hover:opacity-10 group-hover:scale-110"></span>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    {t('login.loggingIn')}
                  </>
                ) : (
                  t('login.loginButton')
                )}
              </Button>
            </form>
          </Form>
          
          <div className="mt-6 text-center">
            <button
              onClick={toggleLanguage}
              className="text-sm text-orange-500 hover:text-orange-700 transition-colors duration-300 font-medium"
            >
              {i18n.language === 'ar' ? 'English' : 'العربية'}
            </button>
          </div>
          
          <div className="mt-8 text-center text-xs text-neutral-500 border-t border-orange-200 pt-4">
            <p className="font-medium">{t('login.poweredBy')} <span className="text-orange-500">ButterBakery-OP</span></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
