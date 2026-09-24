/*
 * Loqata Store API connection.
 *
 * Local/server deployment: leave API_BASE_URL empty so the app uses the same origin.
 * GitHub Pages: set this to the public HTTPS URL of the Loqata Node.js backend,
 * for example: "https://api.example.com".
 * Never put Paymob secrets in this file.
 */
window.LOQATA_CONFIG = window.LOQATA_CONFIG || {
  API_BASE_URL: "https://loqata-backend-production-14f7.up.railway.app"
};
