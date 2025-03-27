import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

/**
 * مهمة هذا الملف هي تنزيل الخطوط العربية اللازمة للـ PDF عند تشغيل التطبيق
 */
export async function downloadArabicFont() {
  try {
    const fontDir = path.join(process.cwd(), 'public', 'fonts');

    // التأكد من وجود مجلد الخطوط
    if (!fs.existsSync(fontDir)) {
      fs.mkdirSync(fontDir, { recursive: true });
    }

    // مسار الخط المراد تنزيله
    const fontPath = path.join(fontDir, 'NotoSansArabic-Regular.ttf');

    // إذا كان الخط موجودًا بالفعل، لا داعي لتنزيله مرة أخرى
    if (fs.existsSync(fontPath)) {
      console.log('Arabic font already exists. Skipping download.');
      return;
    }

    // تنزيل الخط من Google Fonts
    const fontUrl = 'https://fonts.gstatic.com/s/notosansarabic/v18/nwpxtLGrOAZMl5nJ_wfgRg3DrWFZWsnVBJ_sS6tlqHHFlhQ5l3sQWIHPqzCfyGyvu3CBFQLaig.ttf';
    
    console.log('Downloading Arabic font...');
    const response = await fetch(fontUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download font: ${response.statusText}`);
    }

    // حفظ الخط في المجلد المحدد
    await pipeline(
      response.body as any,
      fs.createWriteStream(fontPath)
    );

    console.log('Arabic font downloaded successfully');
  } catch (error) {
    console.error('Error downloading Arabic font:', error);
  }
}