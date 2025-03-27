import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { insertBranchSchema } from '@shared/schema';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Extend branch schema with validation
const branchFormSchema = insertBranchSchema.extend({
  name: z.string().min(3, 'Branch name must be at least 3 characters'),
  location: z.string().min(3, 'Location must be at least 3 characters'),
});

type BranchFormValues = z.infer<typeof branchFormSchema>;

export default function Branches() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Only admins can access this page
  const isAdmin = user?.role === 'admin';
  
  // Fetch branches
  const { 
    data: branches = [], 
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['/api/branches'],
    queryFn: async () => {
      const res = await fetch('/api/branches');
      if (!res.ok) throw new Error('Failed to fetch branches');
      return res.json();
    }
  });
  
  // Fetch users for managers dropdown
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    }
  });
  
  const form = useForm<BranchFormValues>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: {
      name: '',
      location: '',
      managerId: undefined,
      isActive: true,
    },
  });
  
  const onSubmit = async (data: BranchFormValues) => {
    try {
      await apiRequest('POST', '/api/branches', data);
      
      toast({
        title: t('branches.branchCreated'),
        description: t('branches.branchCreatedDescription'),
      });
      
      // Reset form and close dialog
      form.reset();
      setIsDialogOpen(false);
      
      // Refresh branch list
      queryClient.invalidateQueries({ queryKey: ['/api/branches'] });
    } catch (error) {
      toast({
        title: t('branches.branchCreationFailed'),
        description: t('branches.branchCreationFailedDescription'),
        variant: 'destructive',
      });
      console.error('Error creating branch:', error);
    }
  };
  
  const managerOptions = users.filter((user: any) => user.role === 'branch_manager');
  
  if (!isAdmin) {
    return (
      <MainLayout title={t('branches.title')}>
        <div className="flex items-center justify-center h-full">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <div className="text-center py-8 text-neutral-500">
                <i className="fas fa-lock text-3xl mb-2"></i>
                <h3 className="text-xl font-bold text-danger mb-2">{t('common.accessDenied')}</h3>
                <p>{t('common.noPermission')}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={t('branches.title')}>
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('branches.manageBranches')}</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <i className="fas fa-plus ml-2"></i>
                {t('branches.addBranch')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('branches.addBranchTitle')}</DialogTitle>
                <DialogDescription>{t('branches.addBranchDescription')}</DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('branches.branchName')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('branches.location')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>{t('branches.locationDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="managerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('branches.manager')}</FormLabel>
                        <Select
                          value={field.value?.toString() || ''}
                          onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('branches.selectManager')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {managerOptions.map((manager: any) => (
                              <SelectItem key={manager.id} value={manager.id.toString()}>
                                {manager.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end gap-2 mt-6">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button type="submit">{t('common.save')}</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : branches.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('branches.branchName')}</TableHead>
                    <TableHead>{t('branches.location')}</TableHead>
                    <TableHead>{t('branches.manager')}</TableHead>
                    <TableHead>{t('branches.status')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches.map((branch: any) => (
                    <TableRow key={branch.id}>
                      <TableCell className="font-medium">{branch.name}</TableCell>
                      <TableCell>{branch.location || '-'}</TableCell>
                      <TableCell>
                        {branch.managerName || (branch.managerId 
                          ? users.find((u: any) => u.id === branch.managerId)?.name || `-`
                          : '-')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={branch.isActive ? 'default' : 'outline'}>
                          {branch.isActive ? t('branches.active') : t('branches.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon">
                          <i className="fas fa-pencil-alt"></i>
                        </Button>
                        <Button variant="ghost" size="icon">
                          <i className="fas fa-trash-alt text-danger"></i>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-500">
              <i className="fas fa-store text-3xl mb-2"></i>
              <p>{t('branches.noBranches')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
