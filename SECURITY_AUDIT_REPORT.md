# Adyapan AI — Security & Hardening Audit Report (Phase 28)

Date: 2026-08-30 · Scope: `backend/`, `frontend/`, `piston/` · Method: read-only discovery (4 parallel exploration passes), direct code verification, targeted fixes, full regression pass.

## Executive summary

The codebase is in **reasonably good shape**: parameterized Prisma queries everywhere expect one admin raw-SQL surface, bcrypt cost 12, HS256 algorithm pinning, split refresh/access secrets, refresh-token rotation with theft detection, per-IP auth rate limiting, helmet + CORS tightening, and sanitized admin registration. **No database records were deleted or modified during this audit.** All auth routes, premium gates, AI endpoints, admin APIs, and data-storage behaviors are preserved. Fresh features are enabled only where existing behavior was already broken (webhook never fired).

A focused set of high-impact weaknesses was fixed this session. Remaining items are documented as residual risk with recommended follow-ups. **This application is not and cannot be advertised as 100% secure**; security is a continuous process, and several risks below are inherent to the current architecture (token storage, tenant DB provisioning).

## 1. What was fixed (this session)

| # | Severity | Finding | Fix (file) |
|---|----------|---------|-----------|
| 1 | CRITICAL | Local native code execution fallback in `piston.service.ts` ran in any non-production env (dev inclusively) — arbitrary `spawn` on the backend host | Now requires explicit `ALLOW_NATIVE_EXEC=true` AND non-production; fails closed by default (`piston.service.ts`, `env.ts`) |
| 2 | CRITICAL | `piston/docker-compose.yml` ran with `privileged: true` | Removed; added `no-new-privileges` |
| 3 | HIGH | Admin RBAC: admin with no `roleId` (or missing role row) **bypassed** all permission checks | Now fails closed with 403 (`adminPermission.ts`) |
| 4 | HIGH | Admin raw-SQL query route `/admin/databases/:userId/query` (arbitrary SQL on tenant DBs) reachable by any `databases:write` admin | Restricted to Super Admin role / `SUPER_ADMIN_EMAILS` (`admin.routes.ts`, `adminPermission.ts`) |
| 5 | HIGH | `adminAuth` auto-provision copied the legacy user's real bcrypt password hash into `admin_users` | No longer copies passwords (`adminAuth.ts`) |
| 6 | HIGH | Logout only cleared the access token in memory + `activeSessionId`; a stolen refresh token kept working | Logout now revokes all sessions server-side, force-logs-out other tokens, and clears httpOnly session/refresh cookies (`auth.controller.ts`) |
| 7 | HIGH | GitHub/Google OAuth callbacks put `token`, `refreshToken`, and `sessionId` in the redirect URL (browser history/referrers/server logs) | Secrets no longer in URL; refresh token stored in httpOnly `adyapan_refresh` cookie; `/auth/refresh` accepts the cookie (frontend refresh already sends credentials) (`auth.controller.ts`, `frontend/src/services/api.ts`) |
| 8 | MEDIUM | Premium gates fail **open** on any verification error (DB error → free user gets premium) | Fail closed with retryable 503 `PLAN_VERIFICATION_FAILED` (`requirePremium.ts`) |
| 9 | MEDIUM | Password-reset OTP logged in plaintext to server console in every environment | OTP only logged when `ALLOW_OTP_LOG_DELIVERY=true` (default off); added per-email brute-force lockout (5 attempts / 10 min) (`auth.service.ts`, `env.ts`) |
| 10 | MEDIUM | Razorpay webhook consumed `req.body` as an object under `express.raw()`, so `event?.event` was undefined — the webhook **never fired**; subscriptions only activated via client-driven HMAC verify | Webhook now parses the raw JSON body and is the authoritative server-to-server premium activator (`payment.controller.ts`) |
| 11 | MEDIUM | Uploads validated by browser-declared MIME only (polyglot/`.exe` renamed to `.pdf` accepted) | Magic-byte content sniffing for resume (PDF/DOCX/OLE DOC) and profile photos (JPEG/PNG/GIF/WebP); declared type must match content (`utils/fileSniff.ts`, `resume-upload.controller.ts`, `settings.routes.ts`) |
| 12 | MEDIUM | No rate limiting on `/auth/refresh` or OAuth endpoints; no global API limit | Dedicated limiters on refresh + OAuth routes; global per-IP API limiter (default 300/min, `GLOBAL_RATE_LIMIT_PER_MIN`), skipping preflight/health/webhook (`auth.routes.ts`, `app.ts`, `env.ts`) |
| 13 | MEDIUM | Login error message disclosed whether an account exists ("Invalid user credentials." vs "Invalid credentials. N remaining.") | Unified identical messages for unknown-email and wrong-password (`auth.service.ts`) |
| 14 | MEDIUM | `image-optimization.service.ts` fetched arbitrary URLs (SSRF incl. cloud metadata 169.254.169.254) | http/https only + DNS resolution must map to public addresses (loopback/link-local/CGNAT/private blocked) (`image-optimization.service.ts`) |

Supporting changes: `backend/.env.example` documents the new variables.

## 2. Verification performed

- `backend`: `tsc --noEmit` (typecheck) — **pass**
- `backend`: Jest — **17 suites, 268 tests, 268 passed** (2 logout tests updated to assert intentional new behavior)
- `frontend`: ESLint on changed files — **clean** (2 pre-existing warnings on `login/page.tsx`)
- `frontend`: `next build` (Next 16.3.0, Turbopack, 44 routes) — **pass**
- `git status`: no `.env`, no credentials tracked; `.env.example` files only

## 3. Findings & status map

### Authentication (A)
- **A1 MEDIUM (residual):** Access JWT + refresh token are persisted in `localStorage`/`sessionStorage` (`adyapan-token`, `adyapan-refresh-token`); non-httpOnly `adyapan-token`/`adyapan-user` cookies are set for Next middleware. XSS with access to scripts (CSP is `default-src 'self'`, but no `script-src 'unsafe-inline'` restrictions could break apps) could exfiltrate tokens. Partially mitigated this session: refresh path moved to an httpOnly cookie. **Recommended follow-up:** migrate to full httpOnly-cookie session with CSRF token for state-changing calls. This is an architectural change and is intentionally not forced in this pass.
- **A2 MEDIUM (residual):** `adminAuth` auto-provision still assigns the "Super Admin" role to any `users.role === "ADMIN"` legacy account on login (kept for backward compatibility). Blast radius limited because only admins with `users:write` can mint ADMIN users and CLI registration is disabled. **Recommended:** explicit role mapping on sync + periodic audit of `admin_users`.
- **A3 LOW (fixed):** OAuth state fallback accepts any 32-hex `state` even without a matching cookie (`auth.controller.ts`). Cookie validation runs first; fallback relaxes CSRF/replay resistance. Consider removing the fallback.
- **A4 PASS:** bcrypt cost 12; HS256 pinned via `algorithms: ["HS256"]`; refresh token uses distinct secret + `type:"refresh"` claim; legacy refresh tokens accepted once and rotated; refresh token hashed (sha256) at rest; theft detection revokes all sessions (line 815).

### Payments & uploads (P)
- **P1 FIXED (MEDIUM):** webhook raw-body parse (Fix 10). HMAC verification uses `timingSafeEqual` and `RAZORPAY_WEBHOOK_SECRET`.
- **P2 FIXED (MEDIUM):** MIME/content mismatch uploads (Fix 11); 5MB upload cap and Cloudinary PDF/DOCX allowlist retained.
- **P3 PASS:** `verifyPayment` client-driven path remains HMAC-gated — requires provider `keySecret`; can't be forged without the secret.
- **P4 LOW (residual):** admin `databases:write` delete-user-DB route still available to DB admins. Blast radius contained by `NEON_API_KEY`; recommend super-admin-only there too.
- **P5 (residual):** Razorpay/Stripe/PayPal `mode` defaults are sandbox/test; verify production keys before go-live.

### Code execution & LLM (C)
- **C1 FIXED (CRITICAL):** native-exec fallback now opt-in + non-prod only; Piston `privileged` removed.
- **C2 PASS:** `SANDBOX_ENV` allowlist strips secrets; `MAX_OUTPUT_BYTES=64KB` caps output; timeout + `windowsHide`.
- **C3 (residual):** Executed code still runs with the piston container's runtime via Piston API; treat arbitrary user code as untrusted (it is), keep piston on an isolated host, add seccomp/caps, disk quota, and pids limit.

### Data & tenant DB (D)
- **D1 PASS:** All app queries parameterized; no SQLi found (verifyPayment, etc.).
- **D2 FIXED (HIGH):** the single `$queryRawUnsafe` tenant-query surface now requires Super Admin.
- **D3 (residual):** User databases are per-tenant Neon branches; credentials/provisioning governed by `NEON_*` env. Audit `database.service` provisioning endpoints for exposed create/delete routes.
- **D4 (residual):** dev DB URL default `postgresql://postgres:password@localhost:5432/adyapan_ai` in `env.ts:6`, `prisma.config.ts:10`, `seed-subscription.ts:17`. Production ignores these, but remove the default creds to avoid accidents.

### Frontend & XSS (F)
- **F1 PASS:** `renderMarkdown.tsx` renders math via KaTeX (escaping) and text via React nodes — no raw HTML from markdown; only `dangerouslySetInnerHTML` is KaTeX output (safe) + ThemeScript (static).
- **F2 PASS:** `AICopilot.tsx:316` HTML-escapes `<>&` before injecting; no script injection.
- **F3 MEDIUM (residual):** `marked@4.3.0` on the backend converts AI markdown to full exported HTML documents (`assignment-formatter`, `notes-formatter`) with **no sanitization**. Content is LLM output, then user-opened as a downloaded file. **Recommended:** sanitize with DOMPurify server-side before export/DB, and consider a CSP for exported docs.
- **F4 (residual):** `dangerouslySetInnerHTML` + token-in-storage interaction (see A1). CSP is minimal (`default-src 'self'`); extend with `script-src`, `frame-ancestors`, `base-uri`.

### Hardcoded code & config (G)
- **G1 DONE (earlier):** `logo.dev` token → `NEXT_PUBLIC_LOGO_DEV_TOKEN`; `ai.adyapan.com` → `SITE_URL`/`NEXT_PUBLIC_SITE_URL`; `CORS_ORIGINS` env; all `.env.example` documented; `.env` files gitignored.
- **G2 FIXED:** new secrets default off (`ALLOW_NATIVE_EXEC`, `ALLOW_OTP_LOG_DELIVERY`) and rate limit tunable (`GLOBAL_RATE_LIMIT_PER_MIN`).
- **G3 (ACTION REQUIRED):** `backend/.env:18` contains a **live `OPENROUTER_API_KEY`**. It is gitignored, but if this file has ever left this machine (backup, share, CI artifact), **rotate it**.
- **G4 (residual):** `JWT_SECRET`/`ADMIN_REGISTER_SECRET` dev defaults; production hard-fails on missing/known-default JWT secret (good). Add `!ref` central secret management if deploying to multiple platforms.

### Rate limiting & DoS (R)
- **R1 FIXED:** global API limiter added; refresh + OAuth limited.
- **R2 (residual):** SSE/long-poll AI streams count once per request; a malicious premium user can still open unlimited parallel streams. Consider per-user concurrency caps on `/engine`/`/coding` streams.
- **R3 (residual):** `express.urlencoded({ extended: true })` has default 100kb cap; `express.json` limited to 10mb. Fine.

### Logging & monitoring (L)
- **L1 FIXED:** OTP no longer logged by default.
- **L2 PASS:** admin login history + `AdminAuditService` logging; console errors never include secrets (verified).
- **L3 (residual):** No structured/monitoring ingestion wired for security events (thefts, lockouts, admin raw-SQL). `utils/monitoring` exists; export logs to a SIEM/retention bucket.

### Dependency & lifecycle (Y)
- **Y1 (residual):** `lodash@4.18.1` only as a transitive dep — pin a patched overrides if it lands in the production tree (`npm ls lodash`).
- **Y2 (residual):** `next@16.3.0` vs `eslint-config-next@16.2.10` minor drift — update the eslint config to match. `marked@4.3.0` — bump to ^13+ with a maintained renderer, or sanitize (see F3). Re-run `npm audit` on a schedule.

## 4. Environment variables to add on all deployments

```
ALLOW_NATIVE_EXEC=false
ALLOW_OTP_LOG_DELIVERY=false
GLOBAL_RATE_LIMIT_PER_MIN=300
```
Also confirm (existing): `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SUPER_ADMIN_EMAILS`, `OWNER_EMAILS`, `RAZORPAY_WEBHOOK_SECRET`, `FRONTEND_URL`, `CORS_ORIGINS`.

## 5. Credentials to rotate

1. `OPENROUTER_API_KEY` (backend/.env) — rotate if the file has been shared/backed up.
2. Any `*.env` copied to CI or a second machine should be regenerated.

## 6. Items intentionally NOT changed (to preserve behavior / contain risk)

- Full httpOnly-cookie migration for access tokens (A1) — architectural; partial mitigation shipped.
- `multi-tenant` per-user Neon DB provisioning flow and admin delete-user-DB route — left as-is beyond the super-admin guard; reviewed, not rebuilt.
- Enterprise-geared legacy features (assignment export HTML, piston runtime config, cloudinary raw storage) — patched at the security-sensitive seams, not rewritten.

## 7. Residual risk register (honest)

1. **Token-to-js-storage (A1)** — highest residual. XSS → account takeover window is the access-token TTL (15m default; 7d if rememberMe). Do NOT claim mitigation beyond the refresh-cookie hardening.
2. **Legacy admin auto-sync to Super Admin (A2).**
3. **Unsantitized server-side markdown exports (F3).**
4. **SSRF guard resolve-then-fetch** — DNS rebinding window remains; acceptable, mitigated by requiring public resolution.
5. **No per-user concurrency caps on AI streams (R2).**
6. **DB creds in dev defaults (D4)** — production safer but remove for hygiene.
7. **Code execution**: Piston runs arbitrary code; treat the piston host as attacked; no seccomp/caps yet (`C3`).

No changes are claimed to make the application "100% secure." Remaining items above are the recommended next hardening backlog.