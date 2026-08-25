# Coding Standards & Workflow Rules

These rules apply to every session and every project in this workspace.

## Code Changes

- **Check vs Fix**: When asked to "check" code, only review and report. When asked to "fix" or "change" code, analyze the full codebase map first, then make clean changes.
- **Full analysis before changes**: Always map dependencies and component relationships before making modifications.
- **No side effects**: Changes must not break other components. Validate that frontend and backend remain compatible.
- **Conflict-free**: No import conflicts, type mismatches, or duplicate declarations between frontend and backend.
- **Deploy-ready**: Both frontend and backend must build cleanly and independently after any change.
- **Clean code**: All changes must be clear, well-structured, and free of errors and bugs.

## Git Workflow

- **Never push to main/master directly.** Always create a new branch first.
- Branch naming: use descriptive names like `feature/description` or `fix/description`.
- Commit changes to the new branch before any push.
- Use `git push -u origin <branch-name>` to push new branches.
- Only create pull requests to merge into main — never direct pushes.

## Security (Priority Focus)

Security is the primary concern. Every code review and change must include thorough vulnerability checks.

### Always Check For:

**Authentication & Authorization**
- Broken authentication (weak tokens, missing expiry, no refresh rotation)
- Broken access control (missing role checks, IDOR vulnerabilities, privilege escalation)
- Missing or weak session management
- JWT misconfigurations (algorithm confusion, missing signature verification, excessive expiry)

**Injection Attacks**
- SQL injection (use parameterized queries, never string concatenation)
- NoSQL injection
- Command injection (sanitize all shell inputs)
- XSS (cross-site scripting) — stored, reflected, and DOM-based
- Template injection (server-side and client-side)
- LDAP injection, XML injection, Header injection

**Data Exposure**
- Sensitive data in logs, error messages, or API responses
- Secrets hardcoded in source (API keys, passwords, tokens)
- Missing encryption for data at rest and in transit
- PII leakage in URLs, query params, or client-side storage
- Overly permissive CORS configuration

**API Security**
- Missing rate limiting
- Missing input validation and sanitization on all endpoints
- Mass assignment vulnerabilities
- Insecure direct object references (IDOR)
- Missing or improper error handling that leaks internals
- GraphQL-specific: introspection enabled in production, excessive query depth

**Frontend Security**
- XSS via dangerouslySetInnerHTML or unsanitized user input
- Open redirects
- Clickjacking (missing X-Frame-Options / CSP frame-ancestors)
- Insecure storage of tokens (localStorage vs httpOnly cookies)
- CSRF protection missing on state-changing requests
- Subresource integrity (SRI) for third-party scripts

**Infrastructure & Config**
- Exposed debug endpoints or admin panels
- Missing security headers (CSP, HSTS, X-Content-Type-Options, etc.)
- Insecure dependencies (known CVEs in packages)
- Dockerfile security (running as root, exposed secrets in layers)
- Environment variable leaks in client-side bundles (NEXT_PUBLIC_ exposure)

**Business Logic**
- Race conditions in payment or state-changing flows
- Insufficient validation of business rules
- Insecure file upload handling (type validation, size limits, path traversal)
- Denial of service vectors (unbounded loops, large payloads, regex DoS)

### Security Rules for Code Changes:
- Never introduce a change that weakens existing security controls.
- All user input must be validated and sanitized before use.
- All database queries must use parameterized statements.
- All sensitive operations must have proper authorization checks.
- All API endpoints must have rate limiting considerations noted.
- All secrets must come from environment variables, never hardcoded.
- Flag any finding with severity: CRITICAL, HIGH, MEDIUM, LOW.

## Deployment Safety

- Verify no conflicts exist between frontend and backend before any deployment-related changes.
- Ensure both projects can build independently without errors.
- Check for environment variable consistency across frontend and backend.
- Verify no secrets or sensitive data are exposed in build artifacts or client bundles.
- Confirm security headers are configured for production environments.
