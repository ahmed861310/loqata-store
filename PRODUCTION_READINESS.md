# LOQATA v5.9.0 — Production Readiness

تمت إضافة فحص جاهزية آمن قبل النشر النهائي.

## Endpoint

`GET /api/production-readiness`

لا يعرض أي secret أو API key؛ يعرض فقط حالة وجود الإعدادات المطلوبة.

## Required production configuration

- `NODE_ENV=production`
- `OTP_WEBHOOK_URL`
- `PAYMENT_PROVIDER=paymob`
- `PAYMOB_SECRET_KEY`
- `PAYMOB_PUBLIC_KEY`
- `PAYMOB_INTEGRATION_ID`
- `PAYMOB_HMAC_SECRET`
- `PAYMOB_NOTIFICATION_URL`
- `PAYMOB_REDIRECT_URL`

## Final external test

بعد نشر النسخة على HTTPS:
1. شغّل فحص `/api/production-readiness`.
2. نفّذ عملية Paymob TEST ناجحة.
3. نفّذ عملية TEST فاشلة/ملغاة.
4. تأكد من وصول webhook وتحديث حالة الدفع والطلب في لوحة الإدارة.
