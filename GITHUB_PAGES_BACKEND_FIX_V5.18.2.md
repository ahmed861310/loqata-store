# إصلاح إنشاء حساب المدير — v5.18.2

## المشكلة
GitHub Pages يشغّل ملفات الواجهة فقط ولا يشغّل `server.js` أو قاعدة البيانات. لذلك زر إنشاء المدير في الواجهة القديمة كان يرسل الطلب إلى `/api/admin/bootstrap` على نطاق GitHub Pages، فلا يجد الخادم.

## ما تم إصلاحه
- إضافة `api-config.js` لتحديد رابط Backend الحقيقي.
- عند تشغيل المشروع من `server.js` يبقى الرابط فارغًا ويستخدم نفس النطاق تلقائيًا.
- عند تشغيل الواجهة على GitHub Pages يمكن وضع رابط Backend HTTPS في `API_BASE_URL`.
- زر إنشاء المدير أصبح يتحول أولًا إلى وضع **إنشاء حساب المدير** داخل نفس النافذة، ثم يرسل طلب الإنشاء عند الضغط على زر الإنشاء.
- عند عدم اتصال Backend تظهر رسالة واضحة بدل خطأ اتصال عام.
- دعم CORS وCookies الآمنة عند استخدام Backend منفصل، عبر `FRONTEND_ORIGIN`.
- لا يتم وضع أي مفتاح Paymob أو سر داخل `api-config.js`.

## تشغيل محلي
اترك:
```js
API_BASE_URL: ""
```
ثم:
```bash
npm start
```
وافتح:
```text
http://localhost:3000
```

## GitHub Pages + Backend
1. انشر مجلد المشروع الخلفي على استضافة Node.js تدعم HTTPS.
2. اجعل متغير البيئة:
```text
FRONTEND_ORIGIN=https://ahmed861310.github.io
```
3. انسخ رابط Backend HTTPS إلى `api-config.js`:
```js
window.LOQATA_CONFIG = { API_BASE_URL: "https://YOUR-BACKEND-DOMAIN" };
```
4. أعد نشر GitHub Pages.
5. افتح **⋮ → 📊 لوحة التحكم → إنشاء حساب المدير لأول مرة**.

> GitHub Pages وحده لا يستطيع إنشاء حساب مدير حقيقي لأن الحساب محفوظ في قاعدة بيانات الخادم.
