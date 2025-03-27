import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";

// إعداد اتصال قاعدة البيانات
// استخدام إما متغير البيئة DATABASE_URL أو الاتصال بقاعدة بيانات Render
const connectionString = process.env.DATABASE_URL || 
  "postgresql://bestbutter_user:cHHjOErPAfRgl3PzWUxTMk5rNllHWQnO@dpg-cvelvr8fnakc738g10q0-a.oregon-postgres.render.com/bestbutter";

// إعدادات إضافية للاتصال
const client = postgres(connectionString, {
  // عدد الاتصالات القصوى في المجمع
  max: 10,
  // تمكين SSL للاتصالات عن بُعد (مطلوب لـ Render.com)
  ssl: true,
  // زمن انتهاء الاتصال بالثواني
  idle_timeout: 20,
  // زمن الانتظار قبل الإلغاء بالثواني
  connect_timeout: 10,
});

// إنشاء كائن drizzle باستخدام العميل والمخطط
export const db = drizzle(client, { schema });