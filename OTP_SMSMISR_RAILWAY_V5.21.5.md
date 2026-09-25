# Loqata 5.21.5 — SMS Misr OTP

Add these Railway Variables to the backend service:

- `SMSMISR_USERNAME` = SMS Misr API username
- `SMSMISR_PASSWORD` = SMS Misr API password
- `SMSMISR_SENDER` = approved Sender Token / Sender ID
- `SMSMISR_OTP_TEMPLATE` = approved OTP template token/text required by SMS Misr
- `SMSMISR_ENVIRONMENT` = `2` for test, then `1` for live after approval

Do not put these values in GitHub Pages or api-config.js.

Flow: checkout COD -> POST /api/otp/request -> SMS Misr /api/OTP/ -> OTP modal -> POST /api/otp/verify -> verificationToken -> create order -> WhatsApp.
