import { Request, Response } from "express";
import { IStorage } from "../storage";
import { formatDate } from "../utils";

/**
 * وحدة تحكم صندوق النقدية
 * توفر واجهات API للوصول لعمليات صندوق النقدية وإدارتها
 */

/**
 * الحصول على رصيد صندوق النقدية للفرع
 */
export const getBranchCashBoxBalance = async (req: Request, res: Response, storage: IStorage) => {
  try {
    const branchId = parseInt(req.params.branchId);
    if (isNaN(branchId)) {
      return res.status(400).json({ success: false, message: 'معرف الفرع غير صحيح' });
    }
    
    const balance = await storage.getBranchCashBoxBalance(branchId);
    res.json({ success: true, data: { balance } });
  } catch (error) {
    console.error('خطأ في الحصول على رصيد صندوق النقدية:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

/**
 * الحصول على تفاصيل صندوق النقدية للفرع
 */
export const getBranchCashBox = async (req: Request, res: Response, storage: IStorage) => {
  try {
    const branchId = parseInt(req.params.branchId);
    if (isNaN(branchId)) {
      return res.status(400).json({ success: false, message: 'معرف الفرع غير صحيح' });
    }
    
    const cashBox = await storage.getBranchCashBox(branchId);
    if (!cashBox) {
      return res.status(404).json({ 
        success: false, 
        message: 'صندوق النقدية غير موجود',
        data: { 
          exists: false,
          branchId
        }
      });
    }
    
    res.json({ success: true, data: cashBox });
  } catch (error) {
    console.error('خطأ في الحصول على تفاصيل صندوق النقدية:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

/**
 * إنشاء صندوق نقدية جديد للفرع
 */
export const createBranchCashBox = async (req: Request, res: Response, storage: IStorage) => {
  try {
    const { branchId, currentBalance, notes } = req.body;
    
    // التحقق من البيانات المدخلة
    if (!branchId || typeof branchId !== 'number') {
      return res.status(400).json({ success: false, message: 'يجب تحديد معرف الفرع' });
    }
    
    if (typeof currentBalance !== 'number') {
      return res.status(400).json({ success: false, message: 'يجب تحديد الرصيد الحالي' });
    }
    
    // فحص ما إذا كان صندوق النقدية موجود بالفعل
    const existingCashBox = await storage.getBranchCashBox(branchId);
    if (existingCashBox) {
      return res.status(400).json({ success: false, message: 'صندوق النقدية موجود بالفعل لهذا الفرع' });
    }
    
    // إنشاء صندوق النقدية
    const cashBox = await storage.createBranchCashBox({
      branchId,
      currentBalance,
      notes: notes || null,
      lastUpdated: new Date()
    });
    
    // إضافة نشاط جديد
    const user = req.user as any;
    await storage.createActivity({
      action: 'create_cash_box',
      details: { branchId, initialBalance: currentBalance },
      userId: user.id,
      branchId,
      timestamp: new Date()
    });
    
    res.status(201).json({ success: true, data: cashBox });
  } catch (error) {
    console.error('خطأ في إنشاء صندوق النقدية:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

/**
 * الحصول على حركات صندوق النقدية للفرع
 */
export const getCashBoxTransactions = async (req: Request, res: Response, storage: IStorage) => {
  try {
    const branchId = parseInt(req.params.branchId);
    if (isNaN(branchId)) {
      return res.status(400).json({ success: false, message: 'معرف الفرع غير صحيح' });
    }
    
    // فحص ما إذا كانت هناك معاملات فلترة للتاريخ
    const { startDate, endDate } = req.query;
    
    let transactions;
    if (startDate && endDate) {
      transactions = await storage.getCashBoxTransactionsByDate(
        branchId,
        startDate.toString(),
        endDate.toString()
      );
    } else {
      transactions = await storage.getCashBoxTransactions(branchId);
    }
    
    res.json({ success: true, data: transactions });
  } catch (error) {
    console.error('خطأ في الحصول على حركات صندوق النقدية:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

/**
 * إنشاء حركة جديدة في صندوق النقدية
 */
export const createCashBoxTransaction = async (req: Request, res: Response, storage: IStorage) => {
  try {
    const { branchId, cashBoxId, amount, type, source, date, notes } = req.body;
    
    // التحقق من البيانات المدخلة
    if (!branchId || typeof branchId !== 'number') {
      return res.status(400).json({ success: false, message: 'يجب تحديد معرف الفرع' });
    }
    
    if (!cashBoxId || typeof cashBoxId !== 'number') {
      return res.status(400).json({ success: false, message: 'يجب تحديد معرف صندوق النقدية' });
    }
    
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ success: false, message: 'يجب تحديد المبلغ بشكل صحيح' });
    }
    
    if (!type || !['deposit', 'withdrawal', 'transfer_to_hq'].includes(type)) {
      return res.status(400).json({ success: false, message: 'نوع المعاملة غير صحيح' });
    }
    
    if (!source || !['manual', 'daily_sales', 'transfer'].includes(source)) {
      return res.status(400).json({ success: false, message: 'مصدر المعاملة غير صحيح' });
    }
    
    // فحص ما إذا كان صندوق النقدية موجود
    const cashBox = await storage.getBranchCashBox(branchId);
    if (!cashBox) {
      return res.status(404).json({ success: false, message: 'صندوق النقدية غير موجود' });
    }
    
    // إنشاء حركة جديدة
    const user = req.user as any;
    const transaction = await storage.createCashBoxTransaction({
      branchId,
      cashBoxId,
      amount,
      type,
      source,
      notes: notes || null,
      createdBy: user.id,
      date: date || formatDate(new Date()),
      status: 'completed',
      timestamp: new Date(),
      referenceNumber: `TRX-${Date.now()}`
    });
    
    // تحديث رصيد صندوق النقدية
    let amountChange = type === 'deposit' ? amount : -amount;
    const updatedCashBox = await storage.updateBranchCashBoxBalance(branchId, amountChange);
    
    // إضافة نشاط جديد
    await storage.createActivity({
      action: `cash_box_${type}`,
      details: { 
        branchId, 
        amount, 
        type, 
        source, 
        transactionId: transaction.id 
      },
      userId: user.id,
      branchId,
      timestamp: new Date()
    });
    
    res.status(201).json({ 
      success: true, 
      data: { 
        transaction,
        updatedBalance: updatedCashBox?.currentBalance
      }
    });
  } catch (error) {
    console.error('خطأ في إنشاء حركة صندوق النقدية:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

/**
 * الحصول على التحويلات النقدية للمركز الرئيسي
 */
export const getCashTransfersToHQ = async (req: Request, res: Response, storage: IStorage) => {
  try {
    const branchId = parseInt(req.params.branchId);
    if (isNaN(branchId)) {
      return res.status(400).json({ success: false, message: 'معرف الفرع غير صحيح' });
    }
    
    // فحص ما إذا كانت هناك معاملات فلترة للتاريخ
    const { startDate, endDate } = req.query;
    
    let transfers;
    if (startDate && endDate) {
      // استخدام دالة فلترة التحويلات بالتاريخ
      // ملاحظة: تحتاج إلى التأكد من وجود دالة getCashTransfersByDate في واجهة IStorage
      // إذا لم تكن موجودة، يمكننا فلترة البيانات يدويًا بعد استردادها
      const allTransfers = await storage.getCashTransfersToHQ(branchId);
      
      // فلترة التحويلات حسب التاريخ
      const startDateObj = new Date(startDate.toString());
      const endDateObj = new Date(endDate.toString());
      
      transfers = allTransfers.filter(transfer => {
        const transferDate = new Date(transfer.date);
        return transferDate >= startDateObj && transferDate <= endDateObj;
      });
    } else {
      transfers = await storage.getCashTransfersToHQ(branchId);
    }
    
    res.json({ success: true, data: transfers });
  } catch (error) {
    console.error('خطأ في الحصول على التحويلات النقدية:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

/**
 * إنشاء تحويل نقدي جديد للمركز الرئيسي
 */
export const createCashTransferToHQ = async (req: Request, res: Response, storage: IStorage) => {
  try {
    const { branchId, cashBoxId, amount, transferMethod, date, notes } = req.body;
    
    // التحقق من البيانات المدخلة
    if (!branchId || typeof branchId !== 'number') {
      return res.status(400).json({ success: false, message: 'يجب تحديد معرف الفرع' });
    }
    
    if (!cashBoxId || typeof cashBoxId !== 'number') {
      return res.status(400).json({ success: false, message: 'يجب تحديد معرف صندوق النقدية' });
    }
    
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ success: false, message: 'يجب تحديد المبلغ بشكل صحيح' });
    }
    
    if (!transferMethod || !['bank_transfer', 'cash_delivery', 'other'].includes(transferMethod)) {
      return res.status(400).json({ success: false, message: 'وسيلة التحويل غير صحيحة' });
    }
    
    // فحص ما إذا كان صندوق النقدية موجود
    const cashBox = await storage.getBranchCashBox(branchId);
    if (!cashBox) {
      return res.status(404).json({ success: false, message: 'صندوق النقدية غير موجود' });
    }
    
    // التحقق من وجود رصيد كافي
    if (cashBox.currentBalance < amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'رصيد صندوق النقدية غير كافي',
        data: {
          currentBalance: cashBox.currentBalance,
          requiredAmount: amount
        }
      });
    }
    
    // إنشاء معاملة صندوق النقدية أولاً
    const user = req.user as any;
    const transaction = await storage.createCashBoxTransaction({
      branchId,
      cashBoxId,
      amount,
      type: 'transfer_to_hq',
      source: 'transfer',
      notes: notes || null,
      createdBy: user.id,
      date: date || formatDate(new Date()),
      status: 'pending',
      timestamp: new Date(),
      referenceNumber: `HQ-TRF-${Date.now()}`
    });
    
    // إنشاء تحويل نقدي للمركز الرئيسي
    const transfer = await storage.createCashTransferToHQ({
      branchId,
      amount,
      transferMethod,
      status: 'pending',
      notes: notes || null,
      date: date || formatDate(new Date()),
      transferredBy: user.id,
      transactionId: transaction.id,
      referenceNumber: `HQ-TRF-${Date.now()}`,
      attachmentUrl: null
    });
    
    // إضافة نشاط جديد
    await storage.createActivity({
      action: 'cash_transfer_to_hq',
      details: { 
        branchId, 
        amount, 
        transferMethod, 
        transferId: transfer.id,
        transactionId: transaction.id
      },
      userId: user.id,
      branchId,
      timestamp: new Date()
    });
    
    res.status(201).json({ 
      success: true, 
      data: { 
        transfer,
        transaction,
        currentBalance: cashBox.currentBalance
      }
    });
  } catch (error) {
    console.error('خطأ في إنشاء تحويل نقدي:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

/**
 * الموافقة على تحويل نقدي
 */
export const approveCashTransfer = async (req: Request, res: Response, storage: IStorage) => {
  try {
    const transferId = parseInt(req.params.transferId);
    if (isNaN(transferId)) {
      return res.status(400).json({ success: false, message: 'معرف التحويل غير صحيح' });
    }
    
    // فحص ما إذا كان التحويل موجود
    const transfer = await storage.getCashTransferToHQById(transferId);
    if (!transfer) {
      return res.status(404).json({ success: false, message: 'التحويل غير موجود' });
    }
    
    // فحص ما إذا كان التحويل بانتظار الموافقة
    if (transfer.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'لا يمكن الموافقة على هذا التحويل',
        data: {
          currentStatus: transfer.status
        }
      });
    }
    
    // الموافقة على التحويل
    const user = req.user as any;
    const approvedTransfer = await storage.approveCashTransferToHQ(transferId, user.id);
    
    // الحصول على معاملة الصندوق المرتبطة
    const transaction = await storage.getCashBoxTransactionById(transfer.transactionId);
    
    // تحديث رصيد صندوق النقدية
    await storage.updateBranchCashBoxBalance(transfer.branchId, -transfer.amount);
    
    // إضافة نشاط جديد
    await storage.createActivity({
      action: 'approve_cash_transfer',
      details: { 
        transferId: transfer.id,
        branchId: transfer.branchId,
        amount: transfer.amount
      },
      userId: user.id,
      branchId: transfer.branchId,
      timestamp: new Date()
    });
    
    res.json({ 
      success: true, 
      data: { 
        transfer: approvedTransfer,
        transaction
      }
    });
  } catch (error) {
    console.error('خطأ في الموافقة على التحويل النقدي:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

/**
 * رفض تحويل نقدي
 */
export const rejectCashTransfer = async (req: Request, res: Response, storage: IStorage) => {
  try {
    const transferId = parseInt(req.params.transferId);
    if (isNaN(transferId)) {
      return res.status(400).json({ success: false, message: 'معرف التحويل غير صحيح' });
    }
    
    const { notes } = req.body;
    
    // فحص ما إذا كان التحويل موجود
    const transfer = await storage.getCashTransferToHQById(transferId);
    if (!transfer) {
      return res.status(404).json({ success: false, message: 'التحويل غير موجود' });
    }
    
    // فحص ما إذا كان التحويل بانتظار الموافقة
    if (transfer.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'لا يمكن رفض هذا التحويل',
        data: {
          currentStatus: transfer.status
        }
      });
    }
    
    // رفض التحويل
    const user = req.user as any;
    const rejectedTransfer = await storage.rejectCashTransferToHQ(transferId, notes || '');
    
    // الحصول على معاملة الصندوق المرتبطة
    const transaction = await storage.getCashBoxTransactionById(transfer.transactionId);
    
    // إضافة نشاط جديد
    await storage.createActivity({
      action: 'reject_cash_transfer',
      details: { 
        transferId: transfer.id,
        branchId: transfer.branchId,
        amount: transfer.amount,
        reason: notes
      },
      userId: user.id,
      branchId: transfer.branchId,
      timestamp: new Date()
    });
    
    res.json({ 
      success: true, 
      data: { 
        transfer: rejectedTransfer,
        transaction
      }
    });
  } catch (error) {
    console.error('خطأ في رفض التحويل النقدي:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

/**
 * الحصول على تقرير صندوق النقدية للفترة المحددة
 */
export const getCashBoxReport = async (req: Request, res: Response, storage: IStorage) => {
  try {
    const branchId = parseInt(req.params.branchId);
    if (isNaN(branchId)) {
      return res.status(400).json({ success: false, message: 'معرف الفرع غير صحيح' });
    }
    
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'يجب تحديد فترة التقرير' });
    }
    
    const report = await storage.getCashBoxReport(
      branchId,
      startDate.toString(),
      endDate.toString()
    );
    
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('خطأ في الحصول على تقرير صندوق النقدية:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

/**
 * الحصول على تقرير التحويلات النقدية للفترة المحددة
 */
export const getCashTransfersReport = async (req: Request, res: Response, storage: IStorage) => {
  try {
    const branchId = parseInt(req.params.branchId);
    if (isNaN(branchId)) {
      return res.status(400).json({ success: false, message: 'معرف الفرع غير صحيح' });
    }
    
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'يجب تحديد فترة التقرير' });
    }
    
    const report = await storage.getCashTransfersReport(
      branchId,
      startDate.toString(),
      endDate.toString()
    );
    
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('خطأ في الحصول على تقرير التحويلات النقدية:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

/**
 * تحويل مبيعات يومية إلى صندوق النقدية
 */
export const processDailySalesToCashBox = async (req: Request, res: Response, storage: IStorage) => {
  try {
    const dailySalesId = parseInt(req.params.dailySalesId);
    if (isNaN(dailySalesId)) {
      return res.status(400).json({ success: false, message: 'معرف المبيعات اليومية غير صحيح' });
    }
    
    // التحقق من وجود معاملة صندوق سابقة لهذه المبيعات
    const existingTransaction = await storage.processDailySalesToCashBox(dailySalesId);
    
    if (!existingTransaction) {
      return res.status(404).json({ success: false, message: 'فشل في معالجة المبيعات اليومية إلى صندوق النقدية' });
    }
    
    res.json({ success: true, data: existingTransaction });
  } catch (error) {
    console.error('خطأ في تحويل المبيعات اليومية إلى صندوق النقدية:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};