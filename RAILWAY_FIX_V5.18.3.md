# Loqata v5.18.3 Railway fix

- Railway health check is `/api/health`.
- `FRONTEND_ORIGIN` now accepts a GitHub Pages URL even if it contains a repository path; the server safely reduces it to the browser origin.
- Multiple allowed origins can be comma-separated.
- Cross-origin admin login keeps `credentials: include` and secure SameSite=None cookies.
- Added `railway.json` with Dockerfile build, start command and health check.

## Railway variables
`NODE_ENV=production`
`FRONTEND_ORIGIN=https://YOUR-USERNAME.github.io`

After Railway generates a Public Domain, put that exact HTTPS domain in `api-config.js`, then republish the frontend.
