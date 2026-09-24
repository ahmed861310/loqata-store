# ربط Backend متجر لقطة — v5.18.2

## الحالة
الواجهة مجهزة للعمل من GitHub Pages مع Backend منفصل عبر `api-config.js`.
ملف `render.yaml` يجهز Backend على Render مع HTTPS، فحص صحة، وقرص دائم لملف `data/db.json`.

## النشر
1. ارفع هذه النسخة إلى مستودع GitHub (يفضل نفس مستودع المشروع أو مستودع خاص للـ backend).
2. في Render اختر **New → Blueprint** واربط المستودع.
3. اختر `render.yaml` ثم Deploy Blueprint.
4. بعد نجاح النشر سيظهر رابط مثل:
   `https://loqata-backend.onrender.com`
5. افتح `api-config.js` في نسخة الواجهة المنشورة على GitHub Pages واجعل:
   `API_BASE_URL: "https://رابط-backend-الفعلي.onrender.com"`
6. أعد نشر GitHub Pages.
7. اختبر:
   `https://رابط-backend-الفعلي.onrender.com/api/health`
   ويجب أن يعيد JSON يحتوي `ok: true`.

## حساب المدير
بعد اتصال الواجهة بالـ Backend:
**⋮ → لوحة التحكم → إنشاء حساب المدير لأول مرة**.
الحساب يُحفظ في قاعدة بيانات الخادم.

## مهم
- لا تضع أي Paymob Secret/HMAC داخل GitHub أو `api-config.js`.
- القيم السرية تُضاف من Environment Variables في Render.
- ملف `db.json` يستخدم قرص Render الدائم حتى لا يختفي حساب المدير والطلبات بعد إعادة التشغيل. Render يوضح أن نظام الملفات الافتراضي للخدمات مؤقت، وأن القرص الدائم يحتاج خدمة مدفوعة. 
- لا تستخدم أكثر من instance واحد مع هذا التخزين المحلي.
