/**
 * وحدة تحكم مراقبة قاعدة البيانات
 * توفر واجهات API للوصول لإحصائيات ومعلومات قاعدة البيانات
 */
import { Request, Response } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";

/**
 * الحصول على معلومات حجم قاعدة البيانات
 */
export const getDatabaseSize = async (_req: Request, res: Response) => {
  try {
    // استعلام حجم قاعدة البيانات بالبايت
    const sizeResult = await db.execute(sql`
      SELECT pg_database_size(current_database()) as size;
    `);

    // تحويل الحجم لوحدة مناسبة
    const sizeInBytes = Number(sizeResult[0]?.size || 0);
    let formattedSize = '';
    
    if (sizeInBytes < 1024) {
      formattedSize = `${sizeInBytes} B`;
    } else if (sizeInBytes < 1024 * 1024) {
      formattedSize = `${(sizeInBytes / 1024).toFixed(2)} KB`;
    } else if (sizeInBytes < 1024 * 1024 * 1024) {
      formattedSize = `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
    } else {
      formattedSize = `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }

    res.json({
      databaseSize: formattedSize,
      databaseSizeBytes: sizeInBytes
    });
  } catch (error) {
    console.error('خطأ في الحصول على حجم قاعدة البيانات:', error);
    res.status(500).json({
      error: 'فشل في الحصول على حجم قاعدة البيانات',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * الحصول على معلومات الجداول وحجمها
 */
export const getTableSizes = async (_req: Request, res: Response) => {
  try {
    // استعلام معلومات الجداول
    const tableResult = await db.execute(sql`
      SELECT
        t.table_name,
        pg_size_pretty(pg_total_relation_size(quote_ident(t.table_name))) AS total_size,
        pg_size_pretty(pg_relation_size(quote_ident(t.table_name))) AS data_size,
        pg_size_pretty(pg_total_relation_size(quote_ident(t.table_name)) - pg_relation_size(quote_ident(t.table_name))) AS external_size,
        pg_total_relation_size(quote_ident(t.table_name)) AS size_bytes
      FROM
        information_schema.tables t
      WHERE
        t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
      ORDER BY
        pg_total_relation_size(quote_ident(t.table_name)) DESC;
    `);

    res.json(tableResult);
  } catch (error) {
    console.error('خطأ في الحصول على معلومات الجداول:', error);
    res.status(500).json({
      error: 'فشل في الحصول على معلومات الجداول',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * الحصول على عدد الصفوف في كل جدول
 */
export const getTableRowCounts = async (_req: Request, res: Response) => {
  try {
    // استعلام عدد الصفوف في الجداول
    // للحصول على أرقام دقيقة نستخدم count(*)
    const rowsResult = await db.execute(sql`
      SELECT
        relname AS table_name,
        n_live_tup AS row_count
      FROM
        pg_stat_user_tables
      ORDER BY
        n_live_tup DESC;
    `);

    res.json(rowsResult);
  } catch (error) {
    console.error('خطأ في الحصول على عدد الصفوف:', error);
    res.status(500).json({
      error: 'فشل في الحصول على عدد الصفوف',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * الحصول على معلومات الموارد والإحصائيات
 */
export const getDatabaseStats = async (_req: Request, res: Response) => {
  try {
    // معلومات الموارد
    const resourcesResult = await db.execute(sql`
      SELECT
        (SELECT setting FROM pg_settings WHERE name = 'max_connections') AS max_connections,
        (SELECT setting FROM pg_settings WHERE name = 'shared_buffers') AS shared_buffers,
        pg_size_pretty(pg_database_size(current_database())) AS current_db_size;
    `);

    // معلومات الاتصالات النشطة
    const connectionsResult = await db.execute(sql`
      SELECT
        count(*) AS active
      FROM
        pg_stat_activity
      WHERE
        state = 'active';
    `);

    res.json({
      resources: resourcesResult[0] || {},
      connections: {
        active: parseInt(String(connectionsResult[0]?.active || '0')),
        max: String(resourcesResult[0]?.max_connections || '0')
      },
      database_size: String(resourcesResult[0]?.current_db_size || '0 MB')
    });
  } catch (error) {
    console.error('خطأ في الحصول على إحصائيات قاعدة البيانات:', error);
    res.status(500).json({
      error: 'فشل في الحصول على إحصائيات قاعدة البيانات',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * الحصول على ملخص شامل لحالة قاعدة البيانات
 */
export const getDatabaseSummary = async (_req: Request, res: Response) => {
  try {
    // حجم قاعدة البيانات
    const sizeResult = await db.execute(sql`
      SELECT pg_database_size(current_database()) as size;
    `);
    const sizeInBytes = Number(sizeResult[0]?.size || 0);
    
    // تحويل الحجم لوحدة مناسبة
    let formattedSize = '';
    if (sizeInBytes < 1024) {
      formattedSize = `${sizeInBytes} B`;
    } else if (sizeInBytes < 1024 * 1024) {
      formattedSize = `${(sizeInBytes / 1024).toFixed(2)} KB`;
    } else if (sizeInBytes < 1024 * 1024 * 1024) {
      formattedSize = `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
    } else {
      formattedSize = `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    
    // عدد الجداول
    const tableCountResult = await db.execute(sql`
      SELECT count(*) as count FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `);
    
    // إجمالي عدد الصفوف
    const totalRowsResult = await db.execute(sql`
      SELECT sum(n_live_tup) as total FROM pg_stat_user_tables;
    `);
    
    // الاتصالات النشطة
    const connectionsResult = await db.execute(sql`
      SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active';
    `);
    
    // التحقق من حالة قاعدة البيانات
    const statusResult = await db.execute(sql`SELECT 1 as connected`);
    const isConnected = statusResult.length > 0 && statusResult[0].connected === 1;
    
    res.json({
      databaseSize: formattedSize,
      databaseSizeBytes: sizeInBytes,
      tableCount: parseInt(String(tableCountResult[0]?.count || '0')),
      totalRows: parseInt(String(totalRowsResult[0]?.total || '0')),
      activeConnections: parseInt(String(connectionsResult[0]?.count || '0')),
      status: isConnected ? "متصل" : "غير متصل",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('خطأ في الحصول على ملخص قاعدة البيانات:', error);
    res.status(500).json({
      error: 'فشل في الحصول على ملخص قاعدة البيانات',
      details: error instanceof Error ? error.message : String(error),
      databaseSize: "غير متاح",
      databaseSizeBytes: 0,
      tableCount: 0,
      totalRows: 0,
      activeConnections: 0,
      status: "غير متصل",
      timestamp: new Date().toISOString()
    });
  }
};