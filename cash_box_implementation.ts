// Cash Box Implementation for MemStorage

// Branch Cash Box - صندوق النقدية للفرع
async getBranchCashBox(branchId: number): Promise<BranchCashBox | undefined> {
  return this.branchCashBoxes.get(branchId);
}

async createBranchCashBox(cashBox: InsertBranchCashBox): Promise<BranchCashBox> {
  // الفرع هو المعرف لصندوق النقدية
  const id = cashBox.branchId;
  const newCashBox: BranchCashBox = { 
    ...cashBox, 
    id,
    lastUpdated: new Date(),
    createdAt: new Date()
  };
  
  this.branchCashBoxes.set(id, newCashBox);
  
  // إنشاء نشاط لتتبع التحديث
  await this.createActivity({
    userId: cashBox.createdBy,
    branchId: cashBox.branchId,
    action: "cash_box_created",
    details: { 
      initialBalance: cashBox.balance,
      branchId: cashBox.branchId
    },
    timestamp: new Date()
  });
  
  return newCashBox;
}

async updateBranchCashBoxBalance(branchId: number, amount: number): Promise<BranchCashBox | undefined> {
  const cashBox = this.branchCashBoxes.get(branchId);
  if (!cashBox) return undefined;
  
  const updatedCashBox: BranchCashBox = {
    ...cashBox,
    balance: cashBox.balance + amount,
    lastUpdated: new Date()
  };
  
  this.branchCashBoxes.set(branchId, updatedCashBox);
  return updatedCashBox;
}

// Cash Box Transactions - معاملات صندوق النقدية
async getCashBoxTransactions(branchId: number): Promise<CashBoxTransaction[]> {
  return Array.from(this.cashBoxTransactions.values())
    .filter(transaction => transaction.branchId === branchId)
    .sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
}

async getCashBoxTransactionsByDate(branchId: number, startDate: string, endDate: string): Promise<CashBoxTransaction[]> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return Array.from(this.cashBoxTransactions.values())
    .filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transaction.branchId === branchId && 
        transactionDate >= start && 
        transactionDate <= end;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
}

async getCashBoxTransactionById(id: number): Promise<CashBoxTransaction | undefined> {
  return this.cashBoxTransactions.get(id);
}

async createCashBoxTransaction(transaction: InsertCashBoxTransaction): Promise<CashBoxTransaction> {
  const id = this.cashBoxTransactionCurrentId++;
  const newTransaction: CashBoxTransaction = {
    ...transaction,
    id,
    timestamp: new Date(),
    notes: transaction.notes || "",
    referenceNumber: transaction.referenceNumber || `TR-${id}`
  };
  
  this.cashBoxTransactions.set(id, newTransaction);
  
  // تحديث رصيد صندوق النقدية
  let amountChange = 0;
  if (transaction.type === 'deposit') {
    amountChange = transaction.amount;
  } else if (transaction.type === 'withdrawal' || transaction.type === 'transfer_to_hq') {
    amountChange = -transaction.amount;
  }
  
  await this.updateBranchCashBoxBalance(transaction.branchId, amountChange);
  
  // إنشاء نشاط لتتبع التحديث
  await this.createActivity({
    userId: transaction.createdBy,
    branchId: transaction.branchId,
    action: `cash_box_${transaction.type}`,
    details: { 
      amount: transaction.amount,
      type: transaction.type,
      source: transaction.source,
      notes: transaction.notes
    },
    timestamp: new Date()
  });
  
  return newTransaction;
}

// Cash Transfers to HQ - التحويلات النقدية للمركز الرئيسي
async getCashTransfersToHQ(branchId: number): Promise<CashTransferToHQ[]> {
  return Array.from(this.cashTransfersToHQ.values())
    .filter(transfer => transfer.branchId === branchId)
    .sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
}

async getCashTransferToHQById(id: number): Promise<CashTransferToHQ | undefined> {
  return this.cashTransfersToHQ.get(id);
}

async createCashTransferToHQ(transfer: InsertCashTransferToHQ): Promise<CashTransferToHQ> {
  const id = this.cashTransferToHQCurrentId++;
  const newTransfer: CashTransferToHQ = {
    ...transfer,
    id,
    status: 'pending',
    createdAt: new Date(),
    notes: transfer.notes || "",
    referenceNumber: transfer.referenceNumber || `HQ-${id}`,
    approvedAt: null,
    approvedBy: null,
    rejectionReason: null
  };
  
  this.cashTransfersToHQ.set(id, newTransfer);
  
  // إنشاء معاملة صندوق نقدية مرتبطة
  await this.createCashBoxTransaction({
    branchId: transfer.branchId,
    cashBoxId: transfer.cashBoxId,
    amount: transfer.amount,
    type: 'transfer_to_hq',
    source: 'transfer',
    createdBy: transfer.createdBy,
    date: transfer.date,
    notes: `تحويل إلى المركز الرئيسي: ${transfer.notes || ""}`,
    referenceNumber: `HQ-TR-${id}`
  });
  
  // إنشاء نشاط لتتبع التحديث
  await this.createActivity({
    userId: transfer.createdBy,
    branchId: transfer.branchId,
    action: "cash_transfer_to_hq_created",
    details: { 
      amount: transfer.amount,
      transferId: id,
      method: transfer.transferMethod
    },
    timestamp: new Date()
  });
  
  // إنشاء إشعار للإدارة
  await this.createNotification({
    userId: null, // للجميع (المستخدمين الإداريين)
    title: `تحويل نقدي جديد من الفرع #${transfer.branchId}`,
    message: `تم إنشاء تحويل نقدي جديد بمبلغ ${transfer.amount} بواسطة الفرع #${transfer.branchId}`,
    type: "info",
    timestamp: new Date(),
    link: "/cash-transfers"
  });
  
  return newTransfer;
}

async approveCashTransferToHQ(id: number, approverId: number): Promise<CashTransferToHQ | undefined> {
  const transfer = this.cashTransfersToHQ.get(id);
  if (!transfer) return undefined;
  
  const updatedTransfer: CashTransferToHQ = {
    ...transfer,
    status: 'approved',
    approvedAt: new Date(),
    approvedBy: approverId
  };
  
  this.cashTransfersToHQ.set(id, updatedTransfer);
  
  // إنشاء نشاط لتتبع التحديث
  await this.createActivity({
    userId: approverId,
    branchId: transfer.branchId,
    action: "cash_transfer_to_hq_approved",
    details: { 
      amount: transfer.amount,
      transferId: id,
      method: transfer.transferMethod
    },
    timestamp: new Date()
  });
  
  // إنشاء إشعار للفرع
  await this.createNotification({
    userId: null, // للفرع المعني
    title: `تمت الموافقة على التحويل النقدي #${id}`,
    message: `تمت الموافقة على التحويل النقدي بمبلغ ${transfer.amount} من الفرع #${transfer.branchId}`,
    type: "success",
    timestamp: new Date(),
    link: `/cash-box/${transfer.branchId}/transfers`
  });
  
  return updatedTransfer;
}

async rejectCashTransferToHQ(id: number, notes: string): Promise<CashTransferToHQ | undefined> {
  const transfer = this.cashTransfersToHQ.get(id);
  if (!transfer) return undefined;
  
  const updatedTransfer: CashTransferToHQ = {
    ...transfer,
    status: 'rejected',
    rejectionReason: notes
  };
  
  this.cashTransfersToHQ.set(id, updatedTransfer);
  
  // إعادة المبلغ إلى رصيد صندوق النقدية للفرع
  await this.createCashBoxTransaction({
    branchId: transfer.branchId,
    cashBoxId: transfer.cashBoxId,
    amount: transfer.amount,
    type: 'deposit',
    source: 'manual',
    createdBy: 1, // النظام
    date: new Date(),
    notes: `إعادة مبلغ تحويل مرفوض #${id}: ${notes}`,
    referenceNumber: `REJ-${id}`
  });
  
  // إنشاء نشاط لتتبع التحديث
  await this.createActivity({
    userId: 1, // النظام
    branchId: transfer.branchId,
    action: "cash_transfer_to_hq_rejected",
    details: { 
      amount: transfer.amount,
      transferId: id,
      reason: notes
    },
    timestamp: new Date()
  });
  
  // إنشاء إشعار للفرع
  await this.createNotification({
    userId: null, // للفرع المعني
    title: `تم رفض التحويل النقدي #${id}`,
    message: `تم رفض التحويل النقدي بمبلغ ${transfer.amount} من الفرع #${transfer.branchId}: ${notes}`,
    type: "error",
    timestamp: new Date(),
    link: `/cash-box/${transfer.branchId}/transfers`
  });
  
  return updatedTransfer;
}

async getCashTransfersByStatus(status: string): Promise<CashTransferToHQ[]> {
  return Array.from(this.cashTransfersToHQ.values())
    .filter(transfer => transfer.status === status)
    .sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
}

// Cash Box Reports - تقارير صندوق النقدية
async getBranchCashBoxBalance(branchId: number): Promise<number> {
  const cashBox = await this.getBranchCashBox(branchId);
  return cashBox ? cashBox.balance : 0;
}

async getCashBoxReport(branchId: number, startDate: string, endDate: string): Promise<any> {
  // الحصول على معاملات الصندوق خلال الفترة المحددة
  const transactions = await this.getCashBoxTransactionsByDate(branchId, startDate, endDate);
  
  // الحصول على صندوق النقدية
  const cashBox = await this.getBranchCashBox(branchId);
  
  // تجميع البيانات حسب النوع
  const deposits = transactions.filter(t => t.type === 'deposit');
  const withdrawals = transactions.filter(t => t.type === 'withdrawal');
  const transfers = transactions.filter(t => t.type === 'transfer_to_hq');
  
  // حساب الإجماليات
  const totalDeposits = deposits.reduce((sum, t) => sum + t.amount, 0);
  const totalWithdrawals = withdrawals.reduce((sum, t) => sum + t.amount, 0);
  const totalTransfers = transfers.reduce((sum, t) => sum + t.amount, 0);
  
  // حساب الإجماليات حسب المصدر
  const depositsFromSales = deposits.filter(t => t.source === 'daily_sales').reduce((sum, t) => sum + t.amount, 0);
  const depositsManual = deposits.filter(t => t.source === 'manual').reduce((sum, t) => sum + t.amount, 0);
  
  // الرصيد الافتتاحي (تقريبي): الرصيد الحالي - الإيداعات + السحوبات + التحويلات
  const currentBalance = cashBox ? cashBox.balance : 0;
  const estimatedOpeningBalance = currentBalance - totalDeposits + totalWithdrawals + totalTransfers;
  
  return {
    branchId,
    periodStart: startDate,
    periodEnd: endDate,
    currentBalance,
    estimatedOpeningBalance,
    totalTransactions: transactions.length,
    summary: {
      totalDeposits,
      totalWithdrawals,
      totalTransfers,
      netChange: totalDeposits - totalWithdrawals - totalTransfers
    },
    depositsBySource: {
      fromSales: depositsFromSales,
      manual: depositsManual,
      other: totalDeposits - depositsFromSales - depositsManual
    },
    transactions,
    generatedAt: new Date()
  };
}

async getCashTransfersReport(branchId: number, startDate: string, endDate: string): Promise<any> {
  // الحصول على التحويلات خلال الفترة المحددة
  const transfers = Array.from(this.cashTransfersToHQ.values())
    .filter(transfer => {
      const transferDate = new Date(transfer.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      return transfer.branchId === branchId && 
        transferDate >= start && 
        transferDate <= end;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
  
  // تجميع البيانات حسب الحالة
  const approved = transfers.filter(t => t.status === 'approved');
  const pending = transfers.filter(t => t.status === 'pending');
  const rejected = transfers.filter(t => t.status === 'rejected');
  
  // حساب الإجماليات
  const totalApproved = approved.reduce((sum, t) => sum + t.amount, 0);
  const totalPending = pending.reduce((sum, t) => sum + t.amount, 0);
  const totalRejected = rejected.reduce((sum, t) => sum + t.amount, 0);
  const totalTransfersAmount = transfers.reduce((sum, t) => sum + t.amount, 0);
  
  // تجميع البيانات حسب وسيلة التحويل
  const byTransferMethod: Record<string, { count: number, amount: number }> = {};
  
  transfers.forEach(t => {
    if (!byTransferMethod[t.transferMethod]) {
      byTransferMethod[t.transferMethod] = { count: 0, amount: 0 };
    }
    byTransferMethod[t.transferMethod].count++;
    byTransferMethod[t.transferMethod].amount += t.amount;
  });
  
  return {
    branchId,
    periodStart: startDate,
    periodEnd: endDate,
    totalTransfers: transfers.length,
    summary: {
      totalTransfersAmount,
      totalApproved,
      totalPending,
      totalRejected
    },
    statusSummary: {
      approved: {
        count: approved.length,
        amount: totalApproved
      },
      pending: {
        count: pending.length,
        amount: totalPending
      },
      rejected: {
        count: rejected.length,
        amount: totalRejected
      }
    },
    byTransferMethod,
    transfers,
    generatedAt: new Date()
  };
}

// Process Daily Sales to Cash Box - تحويل المبيعات اليومية إلى صندوق النقدية
async processDailySalesToCashBox(dailySalesId: number): Promise<CashBoxTransaction | undefined> {
  // الحصول على بيانات المبيعات اليومية
  const dailySales = await this.getDailySalesById(dailySalesId);
  if (!dailySales) return undefined;
  
  // التحقق من أن المبيعات اليومية لم يتم تحويلها بالفعل
  const existingTransaction = Array.from(this.cashBoxTransactions.values())
    .find(t => 
      t.source === 'daily_sales' && 
      t.referenceNumber?.includes(`DS-${dailySalesId}`)
    );
  
  if (existingTransaction) return existingTransaction;
  
  // الحصول على صندوق النقدية للفرع
  let cashBox = await this.getBranchCashBox(dailySales.branchId);
  
  // إنشاء صندوق نقدية للفرع إذا لم يكن موجودًا بالفعل
  if (!cashBox) {
    cashBox = await this.createBranchCashBox({
      branchId: dailySales.branchId,
      balance: 0,
      createdBy: dailySales.cashierId
    });
  }
  
  // إنشاء معاملة إيداع في صندوق النقدية
  const transaction = await this.createCashBoxTransaction({
    branchId: dailySales.branchId,
    cashBoxId: cashBox.id,
    amount: dailySales.totalCashSales,
    type: 'deposit',
    source: 'daily_sales',
    createdBy: dailySales.cashierId,
    date: new Date(dailySales.date),
    notes: `إيداع مبيعات نقدية: ${dailySales.date}`,
    referenceNumber: `DS-${dailySalesId}`
  });
  
  // تحديث حالة المبيعات اليومية
  await this.updateDailySalesStatus(dailySalesId, 'transferred');
  
  return transaction;
}