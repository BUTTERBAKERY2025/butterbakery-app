import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Permissions data structure
interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

interface UserPermission {
  userId: number;
  username: string;
  name: string;
  role: string;
  customPermissions: string[];
}

// Mock permissions data - this would come from the API in a real implementation
const mockPermissions: Permission[] = [
  { id: 'view_dashboard', name: 'عرض لوحة التحكم', description: 'الوصول لعرض لوحة التحكم الرئيسية', category: 'dashboard' },
  { id: 'view_sales', name: 'عرض المبيعات', description: 'عرض بيانات المبيعات اليومية', category: 'sales' },
  { id: 'create_sales', name: 'تسجيل المبيعات', description: 'إنشاء سجلات مبيعات جديدة', category: 'sales' },
  { id: 'edit_sales', name: 'تعديل المبيعات', description: 'تعديل سجلات المبيعات الموجودة', category: 'sales' },
  { id: 'delete_sales', name: 'حذف المبيعات', description: 'حذف سجلات المبيعات', category: 'sales' },
  { id: 'view_targets', name: 'عرض الأهداف', description: 'عرض الأهداف الشهرية', category: 'targets' },
  { id: 'create_targets', name: 'إنشاء الأهداف', description: 'إنشاء أهداف شهرية جديدة', category: 'targets' },
  { id: 'edit_targets', name: 'تعديل الأهداف', description: 'تعديل الأهداف الشهرية الموجودة', category: 'targets' },
  { id: 'view_reports', name: 'عرض التقارير', description: 'الوصول لعرض التقارير والتحليلات', category: 'reports' },
  { id: 'export_reports', name: 'تصدير التقارير', description: 'تصدير التقارير بتنسيقات مختلفة', category: 'reports' },
  { id: 'view_users', name: 'عرض المستخدمين', description: 'عرض قائمة المستخدمين', category: 'users' },
  { id: 'create_users', name: 'إنشاء مستخدمين', description: 'إنشاء حسابات مستخدمين جديدة', category: 'users' },
  { id: 'edit_users', name: 'تعديل المستخدمين', description: 'تعديل حسابات المستخدمين', category: 'users' },
  { id: 'delete_users', name: 'حذف المستخدمين', description: 'حذف حسابات المستخدمين', category: 'users' },
  { id: 'view_branches', name: 'عرض الفروع', description: 'عرض قائمة الفروع', category: 'branches' },
  { id: 'create_branches', name: 'إنشاء فروع', description: 'إنشاء فروع جديدة', category: 'branches' },
  { id: 'edit_branches', name: 'تعديل الفروع', description: 'تعديل معلومات الفروع', category: 'branches' },
  { id: 'view_settings', name: 'عرض الإعدادات', description: 'الوصول لصفحة إعدادات النظام', category: 'settings' },
  { id: 'edit_settings', name: 'تعديل الإعدادات', description: 'تعديل إعدادات النظام', category: 'settings' },
  { id: 'manage_permissions', name: 'إدارة الصلاحيات', description: 'إدارة صلاحيات المستخدمين والأدوار', category: 'permissions' },
];

// Mock roles data
const mockRoles: Role[] = [
  {
    id: 'admin',
    name: 'مدير النظام',
    description: 'صلاحيات كاملة للنظام',
    permissions: mockPermissions.map(p => p.id),
  },
  {
    id: 'branch_manager',
    name: 'مدير فرع',
    description: 'إدارة المبيعات والموظفين وتقارير الفرع',
    permissions: [
      'view_dashboard', 'view_sales', 'create_sales', 'edit_sales',
      'view_targets', 'view_reports', 'export_reports', 'view_users',
      'create_users', 'edit_users', 'view_branches'
    ],
  },
  {
    id: 'cashier',
    name: 'كاشير',
    description: 'تسجيل المبيعات اليومية',
    permissions: [
      'view_dashboard', 'view_sales', 'create_sales'
    ],
  },
  {
    id: 'accountant',
    name: 'محاسب',
    description: 'الوصول للتقارير المالية وعرض المبيعات',
    permissions: [
      'view_dashboard', 'view_sales', 'view_targets', 'view_reports', 'export_reports'
    ],
  },
];

// Mock user permissions data
const mockUserPermissions: UserPermission[] = [
  {
    userId: 1,
    username: 'admin',
    name: 'مدير النظام',
    role: 'admin',
    customPermissions: [],
  },
  {
    userId: 2,
    username: 'branch_manager1',
    name: 'أحمد العنزي',
    role: 'branch_manager',
    customPermissions: ['delete_sales'],
  },
  {
    userId: 3,
    username: 'cashier1',
    name: 'محمد السعيد',
    role: 'cashier',
    customPermissions: [],
  },
  {
    userId: 4,
    username: 'accountant1',
    name: 'فيصل الدوسري',
    role: 'accountant',
    customPermissions: ['view_users'],
  },
];

// Main component
export default function Permissions() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Only admin can access this page and manage permissions
  const isAdmin = user?.role === 'admin';
  
  // Filter permissions by category and search query
  const filteredPermissions = mockPermissions.filter(permission => {
    if (selectedCategory && selectedCategory !== 'all' && permission.category !== selectedCategory) {
      return false;
    }
    
    if (searchQuery) {
      return (
        permission.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        permission.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return true;
  });
  
  // Filter users by search query
  const filteredUsers = mockUserPermissions.filter(user => {
    if (searchQuery) {
      return (
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return true;
  });
  
  // Filter roles by search query
  const filteredRoles = mockRoles.filter(role => {
    if (searchQuery) {
      return (
        role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        role.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return true;
  });
  
  // Get permission categories
  const permissionCategories = Array.from(new Set(mockPermissions.map(p => p.category)));
  
  if (!isAdmin) {
    return (
      <MainLayout title="إدارة الصلاحيات">
        <div className="flex items-center justify-center h-full">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <div className="text-center py-8 text-neutral-500">
                <i className="fas fa-lock text-3xl mb-2"></i>
                <h3 className="text-xl font-bold text-danger mb-2">الوصول مرفوض</h3>
                <p>ليس لديك صلاحيات كافية للوصول إلى هذه الصفحة</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Check if a user has a specific permission
  const hasPermission = (userPermission: UserPermission, permissionId: string) => {
    // Check if user has the permission via role
    const userRole = mockRoles.find(role => role.id === userPermission.role);
    if (userRole && userRole.permissions.includes(permissionId)) {
      return true;
    }
    
    // Check if user has the custom permission
    return userPermission.customPermissions.includes(permissionId);
  };
  
  // Toggle permission for a user
  const toggleUserPermission = (userId: number, permissionId: string) => {
    console.log(`Toggle permission ${permissionId} for user ${userId}`);
    // In a real implementation, this would update the user's permissions in the database
  };
  
  // Toggle permission for a role
  const toggleRolePermission = (roleId: string, permissionId: string) => {
    console.log(`Toggle permission ${permissionId} for role ${roleId}`);
    // In a real implementation, this would update the role's permissions in the database
  };
  
  return (
    <MainLayout title="إدارة الصلاحيات">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>إدارة الصلاحيات</CardTitle>
            <div className="relative w-72">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-500" size={18} />
              <Input
                placeholder="بحث..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-3 pr-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="users">صلاحيات المستخدمين</TabsTrigger>
              <TabsTrigger value="roles">إدارة الأدوار</TabsTrigger>
              <TabsTrigger value="permissions">قائمة الصلاحيات</TabsTrigger>
            </TabsList>
            
            {/* Users Permissions Tab */}
            <TabsContent value="users">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">المستخدم</TableHead>
                      <TableHead>الدور</TableHead>
                      <TableHead>الصلاحيات المخصصة</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((userPermission) => (
                      <TableRow key={userPermission.userId}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{userPermission.name}</div>
                            <div className="text-sm text-neutral-500">@{userPermission.username}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            userPermission.role === 'admin' ? 'bg-danger' : 
                            userPermission.role === 'branch_manager' ? 'bg-warning' :
                            userPermission.role === 'cashier' ? 'bg-success' : 'bg-primary'
                          }>
                            {mockRoles.find(r => r.id === userPermission.role)?.name || userPermission.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {userPermission.customPermissions.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {userPermission.customPermissions.map(permId => (
                                <Badge key={permId} variant="outline" className="bg-secondary bg-opacity-10 text-secondary">
                                  {mockPermissions.find(p => p.id === permId)?.name || permId}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-neutral-500">لا توجد صلاحيات مخصصة</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">تعديل الصلاحيات</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            
            {/* Roles Management Tab */}
            <TabsContent value="roles">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-1 space-y-4">
                  <h3 className="font-medium text-lg mb-2">الأدوار</h3>
                  
                  {filteredRoles.map(role => (
                    <Card 
                      key={role.id} 
                      className={`overflow-hidden cursor-pointer transition-all hover:border-primary ${selectedRole === role.id ? 'border-primary bg-primary bg-opacity-5' : ''}`}
                      onClick={() => setSelectedRole(role.id)}
                    >
                      <CardContent className="p-4">
                        <h4 className="font-bold">{role.name}</h4>
                        <p className="text-sm text-neutral-600">{role.description}</p>
                        <div className="text-xs text-neutral-500 mt-1">
                          {role.permissions.length} صلاحية
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  <Button variant="outline" className="w-full mt-4">
                    <i className="fas fa-plus-circle ml-2"></i>
                    إضافة دور جديد
                  </Button>
                </div>
                
                <div className="md:col-span-3">
                  {selectedRole ? (
                    <Card>
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle>{mockRoles.find(r => r.id === selectedRole)?.name || selectedRole}</CardTitle>
                          <div className="flex gap-2">
                            <Select
                              value={selectedCategory || ""}
                              onValueChange={(value) => setSelectedCategory(value || null)}
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="تصفية حسب الفئة" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">كل الفئات</SelectItem>
                                {permissionCategories.map(category => (
                                  <SelectItem key={category} value={category}>
                                    {category === 'dashboard' ? 'لوحة التحكم' :
                                     category === 'sales' ? 'المبيعات' :
                                     category === 'targets' ? 'الأهداف' :
                                     category === 'reports' ? 'التقارير' :
                                     category === 'users' ? 'المستخدمين' :
                                     category === 'branches' ? 'الفروع' :
                                     category === 'settings' ? 'الإعدادات' :
                                     category === 'permissions' ? 'الصلاحيات' : category}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            
                            <Button variant="outline">
                              <i className="fas fa-save ml-2"></i>
                              حفظ التغييرات
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {/* Group permissions by category */}
                          {permissionCategories
                            .filter(category => !selectedCategory || selectedCategory === 'all' || category === selectedCategory)
                            .map(category => (
                              <div key={category}>
                                <h3 className="font-medium text-lg mb-3">
                                  {category === 'dashboard' ? 'لوحة التحكم' :
                                   category === 'sales' ? 'المبيعات' :
                                   category === 'targets' ? 'الأهداف' :
                                   category === 'reports' ? 'التقارير' :
                                   category === 'users' ? 'المستخدمين' :
                                   category === 'branches' ? 'الفروع' :
                                   category === 'settings' ? 'الإعدادات' :
                                   category === 'permissions' ? 'الصلاحيات' : category}
                                </h3>
                                
                                <div className="space-y-3">
                                  {mockPermissions
                                    .filter(p => p.category === category)
                                    .filter(p => !searchQuery || 
                                      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                      p.description.toLowerCase().includes(searchQuery.toLowerCase())
                                    )
                                    .map(permission => {
                                      const role = mockRoles.find(r => r.id === selectedRole);
                                      const hasPermission = role ? role.permissions.includes(permission.id) : false;
                                      
                                      return (
                                        <div key={permission.id} className="flex items-center justify-between p-3 border rounded-lg">
                                          <div>
                                            <div className="font-medium">{permission.name}</div>
                                            <div className="text-sm text-neutral-500">{permission.description}</div>
                                          </div>
                                          <Switch 
                                            checked={hasPermission}
                                            onCheckedChange={() => toggleRolePermission(selectedRole, permission.id)}
                                          />
                                        </div>
                                      );
                                    })
                                  }
                                </div>
                                
                                <Separator className="mt-6 mb-2" />
                              </div>
                            ))
                          }
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="flex items-center justify-center h-full border rounded-lg p-10">
                      <div className="text-center text-neutral-500">
                        <i className="fas fa-user-tag text-3xl mb-2"></i>
                        <p>يرجى اختيار دور لعرض وتعديل صلاحياته</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            
            {/* Permissions List Tab */}
            <TabsContent value="permissions">
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2">
                  <Select
                    value={selectedCategory || ""}
                    onValueChange={(value) => setSelectedCategory(value || null)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="تصفية حسب الفئة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الفئات</SelectItem>
                      {permissionCategories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category === 'dashboard' ? 'لوحة التحكم' :
                           category === 'sales' ? 'المبيعات' :
                           category === 'targets' ? 'الأهداف' :
                           category === 'reports' ? 'التقارير' :
                           category === 'users' ? 'المستخدمين' :
                           category === 'branches' ? 'الفروع' :
                           category === 'settings' ? 'الإعدادات' :
                           category === 'permissions' ? 'الصلاحيات' : category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button>
                  <i className="fas fa-plus-circle ml-2"></i>
                  إضافة صلاحية جديدة
                </Button>
              </div>
              
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">اسم الصلاحية</TableHead>
                      <TableHead>الوصف</TableHead>
                      <TableHead>الفئة</TableHead>
                      <TableHead>المعرف</TableHead>
                      <TableHead className="text-left">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPermissions.map((permission) => (
                      <TableRow key={permission.id}>
                        <TableCell className="font-medium">{permission.name}</TableCell>
                        <TableCell>{permission.description}</TableCell>
                        <TableCell>
                          <Badge>
                            {permission.category === 'dashboard' ? 'لوحة التحكم' :
                             permission.category === 'sales' ? 'المبيعات' :
                             permission.category === 'targets' ? 'الأهداف' :
                             permission.category === 'reports' ? 'التقارير' :
                             permission.category === 'users' ? 'المستخدمين' :
                             permission.category === 'branches' ? 'الفروع' :
                             permission.category === 'settings' ? 'الإعدادات' :
                             permission.category === 'permissions' ? 'الصلاحيات' : permission.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-secondary bg-opacity-10 px-2 py-1 rounded">{permission.id}</code>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <i className="fas fa-edit"></i>
                            </Button>
                            <Button variant="outline" size="sm" className="text-danger hover:text-danger">
                              <i className="fas fa-trash"></i>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </MainLayout>
  );
}