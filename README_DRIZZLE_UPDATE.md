# تحديث إصدارات Drizzle

## ملخص التغييرات
تم إجراء تحديث على إصدارات حزم Drizzle المستخدمة في المشروع لحل مشكلة عدم التوافق التي كانت تسبب فشل عملية البناء.

## الإصدارات الجديدة المتوافقة
- `drizzle-orm`: 0.30.6
- `drizzle-zod`: 0.5.1
- `drizzle-kit`: 0.30.4

## كيفية تطبيق التحديث

### إذا كنت تستخدم npm
```bash
# إزالة الحزم المتعارضة
npm uninstall drizzle-orm drizzle-zod drizzle-kit

# تثبيت الإصدارات المتوافقة
npm install drizzle-orm@0.30.6 drizzle-zod@0.5.1 drizzle-kit@0.30.4
```

### إذا كنت تستخدم yarn
```bash
# إزالة الحزم المتعارضة
yarn remove drizzle-orm drizzle-zod drizzle-kit

# تثبيت الإصدارات المتوافقة
yarn add drizzle-orm@0.30.6 drizzle-zod@0.5.1
yarn add -D drizzle-kit@0.30.4
```

### إذا كنت تستخدم pnpm
```bash
# إزالة الحزم المتعارضة
pnpm remove drizzle-orm drizzle-zod drizzle-kit

# تثبيت الإصدارات المتوافقة
pnpm add drizzle-orm@0.30.6 drizzle-zod@0.5.1
pnpm add -D drizzle-kit@0.30.4
```

## ملاحظات هامة
- تأكد من عدم تحديث هذه الإصدارات بشكل فردي، حيث أن تحديث واحدة منها بدون الأخرى قد يؤدي إلى عودة مشاكل التوافق.
- إذا كنت تستخدم نسخة Render.com، فقد تم تطبيق هذا الإصلاح تلقائيًا وليس عليك اتخاذ أي إجراء.
- للمزيد من المعلومات حول توافق الإصدارات، يرجى مراجعة [VERSION_COMPATIBILITY_NOTES.md](./VERSION_COMPATIBILITY_NOTES.md).

---

تاريخ التحديث: 28 مارس 2025