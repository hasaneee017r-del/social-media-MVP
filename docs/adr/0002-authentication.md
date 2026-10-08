# ADR-0002: bcrypt password hashing and JWT sessions in an HttpOnly cookie

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

The brief requires industry-standard password hashing and that protected operations require
authentication. The UI is a browser SPA on the same origin as the API (via the Nginx proxy). We want
no extra infrastructure (e.g. Redis) for the MVP.

## Decision

1. **Password hashing:** bcrypt with cost factor **12** (via `bcryptjs`, a pure-JS implementation
   that needs no native build tools in Docker/CI).
2. **Session:** on register/login the API issues a **JWT** (HS256, 7-day expiry, subject = user id)
   in a cookie named `chirp_session` with `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` when
   `COOKIE_SECURE=true` (behind HTTPS).
3. **Sign-out** clears the cookie.
4. **Brute force:** `express-rate-limit`, 20 requests / 15 min / IP on `/api/auth/register` and
   `/api/auth/login`.
5. Login failures return the same generic message whether the username or the password is wrong.

## Alternatives considered

| Option | Pros | Cons |
| ------ | ---- | ---- |
| Argon2id | Current OWASP first choice; memory-hard. | Native module complicates Docker/CI builds; bcrypt cost 12 is still OWASP-acceptable. |
| Server-side sessions (express-session + DB/Redis store) | Instant revocation. | Needs a session table or Redis; more moving parts. |
| JWT in `localStorage` + `Authorization` header | Simple for mobile clients. | Readable by any injected script (XSS steals tokens). |
| Third-party identity (Auth0, Clerk, Keycloak) | Offloads security work. | External account/network dependency breaks the "run locally with Docker" requirement. |

## Consequences

- No session store; the API stays stateless and horizontally scalable.
- Sign-out cannot revoke a token that was copied elsewhere before expiry. Accepted for MVP; a
  `token_version` column on `users` is the planned mitigation.
- `SameSite=Lax` plus JSON-only endpoints mitigates CSRF for state-changing requests (a cross-site
  form cannot send `application/json`, and Lax blocks cross-site cookies on POST).
- `JWT_SECRET` must be set to a strong random value outside local demos; a safe-to-commit placeholder
  is used by default so the one-command demo works.
