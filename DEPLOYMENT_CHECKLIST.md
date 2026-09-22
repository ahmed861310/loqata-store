# قائمة إطلاق متجر لقطة — v5.11.0

## قبل النشر
1. استخدم Node.js 20 أو أحدث.
2. اضبط `NODE_ENV=production`.
3. اضبط `PAYMENT_PROVIDER=paymob`.
4. أضف أسرار Paymob كـ Environment Variables في منصة الاستضافة فقط.
5. استخدم روابط HTTPS حقيقية لـ `OTP_WEBHOOK_URL` و`PAYMOB_NOTIFICATION_URL` و`PAYMOB_REDIRECT_URL`.
6. شغّل:

```bash
npm run preflight:production
```

يجب أن تكون النتيجة `ok: true`.

## بعد النشر
- `GET /api/health` يجب أن يعيد `ok: true`.
- `GET /api/production-readiness` يجب أن يعيد `ok: true`.
- نفّذ دفع Paymob TEST ناجحًا.
- نفّذ حالة فشل/إلغاء في Paymob TEST.
- تأكد أن Webhook وصل وأن لوحة التحكم تعكس الحالة.

## قواعد الأمان
- لا تضع `PAYMOB_SECRET_KEY` أو `PAYMOB_HMAC_SECRET` داخل Git أو ZIP أو ملفات الواجهة.
- لا تستخدم مفاتيح Live أثناء اختبار TEST.
- بعد نجاح الاختبارات، بدّل فقط متغيرات البيئة إلى بيانات Live مع إبقاء الكود نفسه.
