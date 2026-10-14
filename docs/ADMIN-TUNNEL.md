# Admin pilot tunnel (application login)

The admin hostname now uses the existing application's admin login without Cloudflare Access. Anyone can reach the login page; admin APIs still require an authenticated admin session. HTTPS cookies remain Secure, HttpOnly and SameSite=Lax. Auth endpoints at this gateway are limited to 10 requests per minute per client IP, with a burst of 10 and HTTP 429 on excess requests.

Run `bash scripts/admin-tunnel-up.sh` in the web repository. Docker access is needed. This builds the admin services, validates nginx, restarts the admin gateway and checks that anonymous admin API requests return 401. No database reset is performed.

In the existing Cloudflare tunnel's published application routes, use:
- Subdomain: admin
- Domain: servicecam.org
- Path: blank
- Service: HTTP admin-tunnel-gateway:8080
- Protect with Access: disabled

If an Access application was already created for this hostname, remove that specific application to stop its edge login requirement. Do not change unrelated applications or the public servicecam.org route.

Open https://admin.servicecam.org in a private browser window. The normal admin login should appear. Sign in and verify feedback/requests; logout should require login again. Local http://localhost:8081 remains available. The public servicecam.org gateway still excludes admin routes, and Mailpit, database and monitoring remain local.

For full-stack updates use compose.yaml, compose.tunnel.yaml and compose.admin-tunnel.yaml together, with CLOUDFLARED_IMAGE loaded from .env.tunnel-image. To disable remote admin, remove only its published route and stop admin-tunnel-gateway.

Tests verify local session cookie behavior and probe requests. The Docker check verifies origin routing/authentication; the final external browser login remains a manual check.
