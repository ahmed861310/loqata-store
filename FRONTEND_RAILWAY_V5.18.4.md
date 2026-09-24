# Loqata v5.18.4 — Frontend Railway connection

Frontend API endpoint is configured in `api-config.js` as:

`https://loqata-backend-production.up.railway.app`

The frontend loads `api-config.js` before `app.js`, and API requests use this base URL.

Validation performed:
- `node --check app.js` PASS
- `node --check server.js` PASS
- `index.html` script order verified
- Railway API URL verified in source

Production environment variables and live endpoint availability must still be valid on Railway.
