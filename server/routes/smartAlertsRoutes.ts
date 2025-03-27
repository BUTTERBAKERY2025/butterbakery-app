import { Express, Request, Response } from 'express';
import { isAuthenticated } from '../middlewares/auth';
import { storage } from '../storage';

/**
 * تسجيل الطرق الخاصة بالتنبيهات الذكية
 * @param app 
 */
export function registerSmartAlertsRoutes(app: Express) {
  /**
   * الحصول على جميع التنبيهات الذكية
   * @route GET /api/smart-alerts
   * @group Smart Alerts - التنبيهات الذكية
   * @param {number} userId.query - ترشيح حسب معرف المستخدم
   * @param {number} branchId.query - ترشيح حسب معرف الفرع
   * @param {string} startDate.query - تاريخ البداية (YYYY-MM-DD)
   * @param {string} endDate.query - تاريخ النهاية (YYYY-MM-DD)
   * @param {string} priority.query - ترشيح حسب الأولوية (critical, high, medium, low)
   * @param {boolean} unreadOnly.query - عرض التنبيهات غير المقروءة فقط
   * @returns {object} 200 - قائمة التنبيهات
   * @returns {Error} 401 - غير مصرح
   * @returns {Error} 500 - خطأ في الخادم
   */
  // تعليق المصادقة مؤقتًا للتطوير (ستتم إعادتها في الإنتاج)
  app.get('/api/smart-alerts', async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const branchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const priority = req.query.priority as string;
      const unreadOnly = req.query.unreadOnly === 'true';

      // نموذج مؤقت للبيانات - سيتم استبداله بطلب من قاعدة البيانات
      const alerts = [
        {
          id: 'alert1',
          title: 'انخفاض المبيعات اليومية',
          message: 'انخفضت مبيعات الفرع الرئيسي بنسبة 30% عن المعدل اليومي المتوقع.',
          type: 'warning',
          priority: 'high',
          timestamp: new Date().toISOString(),
          source: 'ai',
          isRead: false,
          relatedTo: {
            type: 'branch',
            id: 1,
            name: 'الفرع الرئيسي'
          },
          action: {
            type: 'view',
            label: 'عرض التفاصيل',
            url: '/dashboard'
          }
        },
        {
          id: 'alert2',
          title: 'هدف شهري في خطر',
          message: 'المبيعات الحالية أقل من المستهدف الشهري بنسبة 15%. يرجى مراجعة خطة المبيعات.',
          type: 'error',
          priority: 'critical',
          timestamp: new Date().toISOString(),
          source: 'targets',
          isRead: false,
          relatedTo: {
            type: 'branch',
            id: 1,
            name: 'الفرع الرئيسي'
          },
          action: {
            type: 'fix',
            label: 'تعديل الخطة',
            url: '/targets'
          }
        },
        {
          id: 'alert3',
          title: 'تنبيه أداء كاشير',
          message: 'سجل الكاشير "محمد أحمد" فرق نقدية سالب لليوم الثالث على التوالي.',
          type: 'warning',
          priority: 'medium',
          timestamp: new Date(Date.now() - 86400000).toISOString(), // أمس
          source: 'cashier',
          isRead: true,
          relatedTo: {
            type: 'cashier',
            id: 5,
            name: 'محمد أحمد'
          },
          action: {
            type: 'view',
            label: 'مراجعة الأداء',
            url: '/cashier/5'
          }
        },
        {
          id: 'alert4',
          title: 'تم تحقيق هدف المبيعات',
          message: 'تم تجاوز هدف المبيعات اليومي للفرع الرئيسي بنسبة 5%. أداء ممتاز!',
          type: 'success',
          priority: 'low',
          timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), // قبل يومين
          source: 'sales',
          isRead: true,
          relatedTo: {
            type: 'branch',
            id: 1,
            name: 'الفرع الرئيسي'
          }
        }
      ];

      // تطبيق مرشحات البحث
      let filteredAlerts = [...alerts];
      
      if (userId) {
        // تصفية حسب المستخدم (مثال: عرض التنبيهات المخصصة للمستخدم فقط)
        filteredAlerts = filteredAlerts.filter(alert => 
          alert.source === 'system' || 
          (alert.relatedTo?.type === 'branch' && alert.relatedTo.id === 1) // بشكل مؤقت: نفترض أن المستخدم 1 مرتبط بالفرع 1
        );
      }
      
      if (branchId) {
        // تصفية حسب الفرع
        filteredAlerts = filteredAlerts.filter(alert => 
          alert.relatedTo?.type === 'branch' && alert.relatedTo.id === branchId
        );
      }
      
      if (startDate && endDate) {
        // تصفية حسب نطاق التاريخ
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        filteredAlerts = filteredAlerts.filter(alert => {
          const alertTime = new Date(alert.timestamp).getTime();
          return alertTime >= start && alertTime <= end;
        });
      }
      
      if (priority) {
        // تصفية حسب الأولوية
        filteredAlerts = filteredAlerts.filter(alert => alert.priority === priority);
      }
      
      if (unreadOnly) {
        // تصفية لعرض التنبيهات غير المقروءة فقط
        filteredAlerts = filteredAlerts.filter(alert => !alert.isRead);
      }

      res.json(filteredAlerts);
    } catch (error) {
      console.error('Error fetching smart alerts:', error);
      res.status(500).json({ error: 'فشل في جلب التنبيهات الذكية' });
    }
  });

  /**
   * تحديث حالة التنبيه (مقروء/غير مقروء)
   * @route PATCH /api/smart-alerts/:id/read
   * @group Smart Alerts - التنبيهات الذكية
   * @param {string} id.path.required - معرف التنبيه
   * @returns {object} 200 - تم تحديث الحالة بنجاح
   * @returns {Error} 401 - غير مصرح
   * @returns {Error} 404 - لم يتم العثور على التنبيه
   * @returns {Error} 500 - خطأ في الخادم
   */
  // تعليق المصادقة مؤقتًا للتطوير
  app.patch('/api/smart-alerts/:id/read', async (req: Request, res: Response) => {
    try {
      const alertId = req.params.id;
      
      // تنفيذ تحديث حالة التنبيه في قاعدة البيانات (هنا نسخة مبسطة)
      // في التطبيق الحقيقي سيتم استدعاء دالة من storage
      
      res.json({ 
        success: true, 
        message: 'تم تحديث حالة التنبيه بنجاح',
        alertId
      });
    } catch (error) {
      console.error('Error updating alert read status:', error);
      res.status(500).json({ error: 'فشل في تحديث حالة التنبيه' });
    }
  });

  /**
   * الحصول على إحصائيات التنبيهات
   * @route GET /api/smart-alerts/stats
   * @group Smart Alerts - التنبيهات الذكية
   * @param {number} branchId.query - ترشيح حسب معرف الفرع
   * @returns {object} 200 - إحصائيات التنبيهات
   * @returns {Error} 401 - غير مصرح
   * @returns {Error} 500 - خطأ في الخادم
   */
  // تعليق المصادقة مؤقتًا للتطوير
  app.get('/api/smart-alerts/stats', async (req: Request, res: Response) => {
    try {
      // إحصائيات نموذجية للتنبيهات
      const stats = {
        total: 28,
        unread: 12,
        byPriority: {
          critical: 4,
          high: 7,
          medium: 12,
          low: 5
        },
        byType: {
          warning: 14,
          error: 6,
          info: 5,
          success: 3
        },
        bySource: {
          system: 3,
          sales: 8,
          targets: 5,
          cashier: 9,
          ai: 3
        }
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Error fetching alert stats:', error);
      res.status(500).json({ error: 'فشل في جلب إحصائيات التنبيهات' });
    }
  });

  /**
   * تنفيذ إجراء على تنبيه
   * @route POST /api/smart-alerts/:id/action
   * @group Smart Alerts - التنبيهات الذكية
   * @param {string} id.path.required - معرف التنبيه
   * @param {string} actionType.body.required - نوع الإجراء (view, fix, approve)
   * @returns {object} 200 - تم تنفيذ الإجراء بنجاح
   * @returns {Error} 401 - غير مصرح
   * @returns {Error} 404 - لم يتم العثور على التنبيه
   * @returns {Error} 500 - خطأ في الخادم
   */
  // تعليق المصادقة مؤقتًا للتطوير
  app.post('/api/smart-alerts/:id/action', async (req: Request, res: Response) => {
    try {
      const alertId = req.params.id;
      const { actionType } = req.body;
      
      if (!actionType) {
        return res.status(400).json({ error: 'نوع الإجراء مطلوب' });
      }
      
      // تنفيذ الإجراء حسب نوعه
      let result;
      switch (actionType) {
        case 'view':
          // منطق عرض التفاصيل
          result = { status: 'viewed', message: 'تم عرض التفاصيل' };
          break;
        case 'fix':
          // منطق تصحيح المشكلة
          result = { status: 'fixed', message: 'تم تصحيح المشكلة' };
          break;
        case 'approve':
          // منطق الموافقة على التنبيه
          result = { status: 'approved', message: 'تمت الموافقة' };
          break;
        default:
          return res.status(400).json({ error: 'نوع إجراء غير صالح' });
      }
      
      res.json({ 
        success: true,
        alertId,
        actionType,
        result
      });
    } catch (error) {
      console.error('Error executing alert action:', error);
      res.status(500).json({ error: 'فشل في تنفيذ الإجراء على التنبيه' });
    }
  });

  /**
   * الحصول على تنبيهات المبيعات
   * @route GET /api/smart-alerts/sales
   * @group Smart Alerts - التنبيهات الذكية
   * @param {number} branchId.query - ترشيح حسب معرف الفرع
   * @returns {object} 200 - تنبيهات المبيعات
   * @returns {Error} 401 - غير مصرح
   * @returns {Error} 500 - خطأ في الخادم
   */
  // تعليق المصادقة مؤقتًا للتطوير
  app.get('/api/smart-alerts/sales', async (req: Request, res: Response) => {
    try {
      const branchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      
      // نموذج بيانات مؤقت لتنبيهات المبيعات
      const salesAlerts = [
        {
          id: 'sa1',
          branchId: 1,
          branchName: 'الفرع الرئيسي',
          date: new Date().toISOString(),
          severity: 'high',
          type: 'sales_drop',
          metric: {
            current: 2500,
            expected: 4200,
            difference: -1700,
            percentageChange: -40.5
          },
          recommendations: [
            {
              id: 'rec1',
              text: 'تفعيل عرض خصم 15% على المنتجات الأكثر مبيعًا',
              priority: 'high',
              impact: 80
            },
            {
              id: 'rec2',
              text: 'مراجعة جدول الموظفين وزيادة عدد الكاشيرين خلال ساعات الذروة',
              priority: 'medium',
              impact: 65
            }
          ],
          details: 'انخفاض المبيعات عن المتوقع بنسبة 40% على مدار اليومين الماضيين. يجب اتخاذ إجراء عاجل.'
        },
        {
          id: 'sa2',
          branchId: 2,
          branchName: 'فرع المدينة',
          date: new Date().toISOString(),
          severity: 'medium',
          type: 'target_risk',
          metric: {
            current: 38000,
            expected: 45000,
            difference: -7000,
            percentageChange: -15.5
          },
          recommendations: [
            {
              id: 'rec3',
              text: 'إطلاق حملة ترويجية على وسائل التواصل الاجتماعي',
              priority: 'medium',
              impact: 70
            }
          ],
          details: 'خطر عدم تحقيق التارجت الشهري، الأداء أقل من المتوقع بنسبة 15%.'
        }
      ];
      
      // تصفية حسب الفرع إذا كان محددًا
      const filteredAlerts = branchId 
        ? salesAlerts.filter(alert => alert.branchId === branchId)
        : salesAlerts;
      
      res.json(filteredAlerts);
    } catch (error) {
      console.error('Error fetching sales alerts:', error);
      res.status(500).json({ error: 'فشل في جلب تنبيهات المبيعات' });
    }
  });

  /**
   * الحصول على تنبيهات الكاشيرين
   * @route GET /api/smart-alerts/cashiers
   * @group Smart Alerts - التنبيهات الذكية
   * @param {number} branchId.query - ترشيح حسب معرف الفرع
   * @returns {object} 200 - تنبيهات الكاشيرين
   * @returns {Error} 401 - غير مصرح
   * @returns {Error} 500 - خطأ في الخادم
   */
  // تعليق المصادقة مؤقتًا للتطوير
  app.get('/api/smart-alerts/cashiers', async (req: Request, res: Response) => {
    try {
      const branchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      
      // نموذج بيانات مؤقت لتنبيهات الكاشيرين
      const cashierAlerts = [
        {
          id: 'ca1',
          cashierId: 5,
          cashierName: 'محمد أحمد',
          branchId: 1,
          branchName: 'الفرع الرئيسي',
          date: new Date().toISOString(),
          type: 'performance',
          severity: 'high',
          metric: {
            name: 'متوسط وقت المعاملة',
            value: 5.2,
            target: 3,
            unit: 'دقيقة'
          },
          description: 'متوسط وقت معاملات الكاشير أعلى بكثير من المستهدف، مما يؤثر على رضا العملاء وطوابير الانتظار.',
          suggestion: 'يُنصح بمراجعة أداء الكاشير وتقديم تدريب إضافي على نظام نقاط البيع.',
          action: {
            type: 'train',
            label: 'جدولة تدريب'
          }
        },
        {
          id: 'ca2',
          cashierId: 6,
          cashierName: 'سارة عبدالله',
          branchId: 1,
          branchName: 'الفرع الرئيسي',
          date: new Date().toISOString(),
          type: 'discrepancy',
          severity: 'critical',
          metric: {
            name: 'فرق النقدية',
            value: 350,
            target: 50,
            unit: 'ريال'
          },
          description: 'تم رصد فرق كبير في النقدية لليوم الثالث على التوالي، مما يستدعي مراجعة عاجلة.',
          action: {
            type: 'review',
            label: 'مراجعة السجلات'
          }
        },
        {
          id: 'ca3',
          cashierId: 8,
          cashierName: 'فهد محمد',
          branchId: 2,
          branchName: 'فرع المدينة',
          date: new Date().toISOString(),
          type: 'attendance',
          severity: 'medium',
          description: 'تأخر الكاشير عن موعد الدوام 4 مرات خلال الأسبوع الماضي.',
          action: {
            type: 'contact',
            label: 'التواصل مع الكاشير'
          }
        }
      ];
      
      // تصفية حسب الفرع إذا كان محددًا
      const filteredAlerts = branchId 
        ? cashierAlerts.filter(alert => alert.branchId === branchId)
        : cashierAlerts;
      
      res.json(filteredAlerts);
    } catch (error) {
      console.error('Error fetching cashier alerts:', error);
      res.status(500).json({ error: 'فشل في جلب تنبيهات الكاشيرين' });
    }
  });
}