# Loqata v5.18.2 — Production Stage 2

## Completed
- Audited the production environment contract against the actual backend code.
- Rebuilt `.env.production.example` using the variable names the application really consumes.
- Added `FRONTEND_ORIGIN` to production preflight validation and HTTPS/placeholder checks.
- Kept Paymob secrets out of source control and Render YAML (`sync: false`).
- Confirmed Render persistent storage is configured at `/var/data/db.json`.
- Confirmed health endpoint is `/api/health`.
- Confirmed Paymob notification endpoint expected by the app is `/api/payments/webhook`.
- Confirmed the payment return page is `payment-result.html`.
- Re-ran the complete E2E suite: 19/19 passed.

## External values still required before a real production payment
These cannot be invented or embedded safely in the ZIP:
1. `PAYMOB_SECRET_KEY`
2. `PAYMOB_PUBLIC_KEY`
3. `PAYMOB_INTEGRATION_ID`
4. `PAYMOB_HMAC_SECRET`
5. The deployed backend HTTPS hostname for `PAYMOB_NOTIFICATION_URL`
6. A real HTTPS SMS adapter endpoint for `OTP_WEBHOOK_URL`

## Final production verification
After deployment, run `npm run preflight:production`, then request `/api/production-readiness`. Both must report ready before a live payment test. Perform one successful and one failed/cancelled Paymob transaction and verify webhook-driven order/payment status plus stock restoration on failure.
