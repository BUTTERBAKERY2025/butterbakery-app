import { Express, Request, Response } from "express";
import { IStorage } from "../storage";
import { isAuthenticated } from "../middlewares/auth";
import { 
  getBranchCashBoxBalance,
  getBranchCashBox,
  createBranchCashBox,
  getCashBoxTransactions, 
  createCashBoxTransaction,
  getCashTransfersToHQ,
  createCashTransferToHQ,
  approveCashTransfer,
  rejectCashTransfer,
  getCashBoxReport,
  getCashTransfersReport,
  processDailySalesToCashBox
} from "../controllers/cashBoxController";

/**
 * مسارات واجهة برمجة تطبيقات (API) لصندوق النقدية
 * توفر الوصول إلى عمليات صندوق النقدية وإدارتها
 */

/**
 * تسجيل مسارات صندوق النقدية
 */
export function registerCashBoxRoutes(app: Express, storage: IStorage) {
  /**
   * الحصول على رصيد صندوق النقدية للفرع
   * @route GET /api/cash-box/:branchId/balance
   */
  app.get('/api/cash-box/:branchId/balance', isAuthenticated, (req: Request, res: Response) => {
    getBranchCashBoxBalance(req, res, storage);
  });

  /**
   * الحصول على تفاصيل صندوق النقدية للفرع
   * @route GET /api/cash-box/:branchId
   */
  app.get('/api/cash-box/:branchId', isAuthenticated, (req: Request, res: Response) => {
    getBranchCashBox(req, res, storage);
  });

  /**
   * إنشاء صندوق نقدية جديد للفرع
   * @route POST /api/cash-box
   */
  app.post('/api/cash-box', isAuthenticated, (req: Request, res: Response) => {
    createBranchCashBox(req, res, storage);
  });

  /**
   * الحصول على حركات صندوق النقدية للفرع
   * @route GET /api/cash-box/:branchId/transactions
   */
  app.get('/api/cash-box/:branchId/transactions', isAuthenticated, (req: Request, res: Response) => {
    getCashBoxTransactions(req, res, storage);
  });

  /**
   * إنشاء حركة جديدة في صندوق النقدية
   * @route POST /api/cash-box/transactions
   */
  app.post('/api/cash-box/transactions', isAuthenticated, (req: Request, res: Response) => {
    createCashBoxTransaction(req, res, storage);
  });

  /**
   * الحصول على التحويلات النقدية للمركز الرئيسي
   * @route GET /api/cash-box/:branchId/transfers
   */
  app.get('/api/cash-box/:branchId/transfers', isAuthenticated, (req: Request, res: Response) => {
    getCashTransfersToHQ(req, res, storage);
  });

  /**
   * الحصول على التحويلات النقدية حسب الحالة
   * @route GET /api/cash-box/transfers/status/:status
   */
  app.get('/api/cash-box/transfers/status/:status', isAuthenticated, (req: Request, res: Response) => {
    const { status } = req.params;
    if (!status) {
      return res.status(400).json({ success: false, message: 'الرجاء تحديد الحالة' });
    }
    
    storage.getCashTransfersByStatus(status)
      .then(transfers => {
        res.json({ success: true, data: transfers });
      })
      .catch(error => {
        console.error('خطأ في الحصول على التحويلات النقدية:', error);
        res.status(500).json({ success: false, message: 'خطأ في الخادم' });
      });
  });

  /**
   * إنشاء تحويل نقدي جديد للمركز الرئيسي
   * @route POST /api/cash-box/transfers
   */
  app.post('/api/cash-box/transfers', isAuthenticated, (req: Request, res: Response) => {
    createCashTransferToHQ(req, res, storage);
  });

  /**
   * الموافقة على تحويل نقدي
   * @route POST /api/cash-box/transfers/:transferId/approve
   */
  app.post('/api/cash-box/transfers/:transferId/approve', isAuthenticated, (req: Request, res: Response) => {
    approveCashTransfer(req, res, storage);
  });

  /**
   * رفض تحويل نقدي
   * @route POST /api/cash-box/transfers/:transferId/reject
   */
  app.post('/api/cash-box/transfers/:transferId/reject', isAuthenticated, (req: Request, res: Response) => {
    rejectCashTransfer(req, res, storage);
  });

  /**
   * الحصول على تقرير صندوق النقدية للفترة المحددة
   * @route GET /api/cash-box/:branchId/reports/transactions
   */
  app.get('/api/cash-box/:branchId/reports/transactions', isAuthenticated, (req: Request, res: Response) => {
    getCashBoxReport(req, res, storage);
  });

  /**
   * الحصول على تقرير التحويلات النقدية للفترة المحددة
   * @route GET /api/cash-box/:branchId/reports/transfers
   */
  app.get('/api/cash-box/:branchId/reports/transfers', isAuthenticated, (req: Request, res: Response) => {
    getCashTransfersReport(req, res, storage);
  });

  /**
   * تحويل مبيعات يومية إلى صندوق النقدية
   * @route POST /api/cash-box/process-sales/:dailySalesId
   */
  app.post('/api/cash-box/process-sales/:dailySalesId', isAuthenticated, (req: Request, res: Response) => {
    processDailySalesToCashBox(req, res, storage);
  });
}