import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { insertUserSchema } from '@shared/schema';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Extend user schema with validation
const userFormSchema = insertUserSchema.extend({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type UserFormValues = z.infer<typeof userFormSchema>;

export default function Users() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Only admins can access this page
  const isAdmin = user?.role === 'admin';
  const isBranchManager = user?.role === 'branch_manager';
  
  // Fetch users
  const { 
    data: users = [], 
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    }
  });
  
  // Fetch branches for dropdown
  const { data: branches = [] } = useQuery({
    queryKey: ['/api/branches'],
    queryFn: async () => {
      const res = await fetch('/api/branches');
      if (!res.ok) throw new Error('Failed to fetch branches');
      return res.json();
    }
  });
  
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
      name: '',
      role: 'cashier',
      email: '',
    },
  });
  
  const onSubmit = async (data: UserFormValues) => {
    try {
      // Remove confirmPassword as it's not in the API schema
      const { confirmPassword, ...userData } = data;
      
      await apiRequest('POST', '/api/users', userData);
      
      toast({
        title: t('users.userCreated'),
        description: t('users.userCreatedDescription'),
      });
      
      // Reset form and close dialog
      form.reset();
      setIsDialogOpen(false);
      
      // Refresh user list
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    } catch (error) {
      toast({
        title: t('users.userCreationFailed'),
        description: t('users.userCreationFailedDescription'),
        variant: 'destructive',
      });
      console.error('Error creating user:', error);
    }
  };
  
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-secondary bg-opacity-10 text-secondary">{t('users.roles.admin')}</Badge>;
      case 'branch_manager':
        return <Badge className="bg-primary bg-opacity-10 text-primary">{t('users.roles.branchManager')}</Badge>;
      case 'accountant':
        return <Badge className="bg-info bg-opacity-10 text-info">{t('users.roles.accountant')}</Badge>;
      case 'supervisor':
        return <Badge className="bg-warning bg-opacity-10 text-warning">{t('users.roles.supervisor')}</Badge>;
      case 'cashier':
        return <Badge className="bg-success bg-opacity-10 text-success">{t('users.roles.cashier')}</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };
  
  if (!isAdmin && !isBranchManager) {
    return (
      <MainLayout title={t('users.title')}>
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
    <MainLayout title={t('users.title')}>
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('users.manageUsers')}</CardTitle>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <i className="fas fa-plus ml-2"></i>
                  {t('users.addUser')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('users.addUserTitle')}</DialogTitle>
                  <DialogDescription>{t('users.addUserDescription')}</DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('users.fullName')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('users.username')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>{t('users.usernameDescription')}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('users.password')}</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('users.confirmPassword')}</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('users.email')}</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('users.role')}</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('users.selectRole')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="admin">{t('users.roles.admin')}</SelectItem>
                                <SelectItem value="branch_manager">{t('users.roles.branchManager')}</SelectItem>
                                <SelectItem value="accountant">{t('users.roles.accountant')}</SelectItem>
                                <SelectItem value="supervisor">{t('users.roles.supervisor')}</SelectItem>
                                <SelectItem value="cashier">{t('users.roles.cashier')}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="branchId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('users.branch')}</FormLabel>
                            <Select
                              value={field.value?.toString() || ''}
                              onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('users.selectBranch')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {branches.map((branch: any) => (
                                  <SelectItem key={branch.id} value={branch.id.toString()}>
                                    {branch.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
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
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : users.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('users.user')}</TableHead>
                    <TableHead>{t('users.username')}</TableHead>
                    <TableHead>{t('users.role')}</TableHead>
                    <TableHead>{t('users.email')}</TableHead>
                    <TableHead>{t('users.branch')}</TableHead>
                    <TableHead>{t('users.status')}</TableHead>
                    {isAdmin && <TableHead className="text-right">{t('common.actions')}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar>
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{user.email || '-'}</TableCell>
                      <TableCell>
                        {user.branchName || (user.branchId 
                          ? branches.find((b: any) => b.id === user.branchId)?.name || `-`
                          : '-')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? 'default' : 'outline'}>
                          {user.isActive ? t('users.active') : t('users.inactive')}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon">
                            <i className="fas fa-pencil-alt"></i>
                          </Button>
                          <Button variant="ghost" size="icon">
                            <i className="fas fa-trash-alt text-danger"></i>
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-500">
              <i className="fas fa-users text-3xl mb-2"></i>
              <p>{t('users.noUsers')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
