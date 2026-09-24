# Loqata v5.15.0 — Secure Admin Authentication

## What changed
- Removed the hard-coded local admin PIN (`1234`) from the browser UI.
- Admin panel access now requires a real server-side admin session.
- Added first-time admin bootstrap using `/api/admin/bootstrap`.
- Existing `/api/admin/*` endpoints remain protected by the server-side admin role check.
- No admin credentials are stored in this release.

## First-time setup
1. Start the server.
2. Open the admin panel from the store menu.
3. Enter the admin email and a password of at least 10 characters.
4. Tap **إنشاء حساب المدير لأول مرة**.
5. After the first admin exists, use normal **دخول الإدارة**.

The bootstrap endpoint refuses to create a second admin account once one exists.
