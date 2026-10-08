# Requirements Specification — Chirp (Social Media MVP)

| Item        | Value                                   |
| ----------- | --------------------------------------- |
| Product     | Chirp — a lightweight "X / Twitter Lite" |
| Version     | 1.0 (MVP)                               |
| Source      | Customer statement (see §1)             |
| Status      | Baselined for MVP; changes go through the board |

## 1. Customer statement

> "We need a web or mobile application where users can create an account, log in, view all posts
> published on the platform, and create their own posts. It should be easy to use and easy to run
> locally using Docker."

The statement is deliberately thin. Gaps were filled with the assumptions in §2; each assumption is
recorded so it can be confirmed or reversed with the customer.

## 2. Assumptions

| ID   | Assumption | Rationale |
| ---- | ---------- | --------- |
| AS-01 | The product is a **web application** (responsive, usable on mobile browsers). | One codebase, no app-store install needed for an investor demo. |
| AS-02 | A user identifies with a unique **username** (3–30 chars: letters, digits, underscore) and a password. No email. | Email requires verification infrastructure that adds no demo value. |
| AS-03 | Usernames are **case-insensitive unique** (`Alice` and `alice` are the same account). | Prevents impersonation by case variation. |
| AS-04 | Passwords must be **8–128 characters**. No composition rules. | Follows NIST SP 800-63B guidance (length over complexity). |
| AS-05 | A post is **plain text, 1–280 characters** after trimming whitespace. | Mirrors the "Twitter Lite" positioning. |
| AS-06 | The feed shows **all posts from all users** (no follow graph), newest first. | Explicitly requested: "view all posts published on the platform". |
| AS-07 | Viewing the feed **requires sign-in**. | The customer journey is "create an account, log in, view posts"; keeps the platform closed during the investor phase. |
| AS-08 | Registering signs the user in immediately. | Removes a step from the core journey (usability). |
| AS-09 | Sessions last **7 days** and end on explicit sign-out. | Reasonable default for a demo platform. |
| AS-10 | The demo runs on a single machine via Docker Compose; no cloud deployment is required. | Brief makes production deployment optional. |
| AS-11 | Posts are immutable in the MVP (no edit/delete). | Not requested; kept out of scope (see §6). |

## 3. Functional requirements

Priority uses MoSCoW: **M**ust, **S**hould, **C**ould, **W**on't (this release).

| ID    | Requirement | Priority | Acceptance criteria (testable) |
| ----- | ----------- | -------- | ------------------------------ |
| FR-01 | A visitor can register an account with a username and password. | M | Given a unique valid username and an 8+ char password, when the visitor submits the form, then an account is created (HTTP 201) and the visitor is signed in. |
| FR-02 | Registration rejects invalid or duplicate usernames and weak passwords. | M | Duplicate username (any case) → HTTP 409 with a readable message. Username outside AS-02 rules or password < 8 chars → HTTP 400 with field-level message. No account is created. |
| FR-03 | A registered user can sign in. | M | Given correct credentials, sign-in returns HTTP 200 and sets a session cookie; the UI navigates to the feed. |
| FR-04 | Sign-in with wrong credentials fails without revealing which field was wrong. | M | Wrong username **or** wrong password → HTTP 401 with the same generic message "Invalid username or password". |
| FR-05 | A signed-in user can sign out. | M | After sign-out the session cookie is cleared; subsequent calls to protected endpoints return 401; the UI shows the sign-in page. |
| FR-06 | A signed-in user can create a text post. | M | Given 1–280 chars of content, the post is stored (HTTP 201) and immediately appears at the top of the feed without a page reload. |
| FR-07 | Invalid posts are rejected. | M | Empty/whitespace-only content or > 280 chars → HTTP 400; nothing stored. The UI shows a live character counter and disables "Post" when invalid. |
| FR-08 | A signed-in user can view a feed of posts from all users. | M | The feed lists posts by every user, each showing **author username, content and creation date/time**. |
| FR-09 | The feed is ordered newest first. | M | For posts A then B created in that order, B appears above A. Ties broken by descending id. |
| FR-10 | The UI keeps the user signed in across page reloads until sign-out or session expiry. | S | Reloading the browser while signed in shows the feed, not the sign-in page. |
| FR-11 | The feed is paginated. | S | The API returns at most 50 posts per page with a cursor for the next page; the UI offers "Load more". |
| FR-12 | Each user can see a profile page with only their posts. | W | Out of scope for MVP. |

## 4. Non-functional requirements

| ID     | Category | Requirement | Acceptance criteria / verification |
| ------ | -------- | ----------- | ---------------------------------- |
| NFR-01 | Security | Passwords are hashed with **bcrypt (cost ≥ 12)**; plain text is never stored or logged. | DB inspection shows `$2a$12$…` hashes only; automated test asserts stored hash ≠ password and verifies with bcrypt. |
| NFR-02 | Security | All post endpoints require authentication. | Unauthenticated `GET/POST /api/posts` → 401 (automated test). |
| NFR-03 | Security | Session tokens are signed JWTs in an **HttpOnly, SameSite=Lax** cookie, so JavaScript cannot read them. | Response `Set-Cookie` header contains `HttpOnly` and `SameSite=Lax` (automated test). |
| NFR-04 | Security | Brute-force protection on auth endpoints. | > 20 auth attempts per 15 min from one IP → HTTP 429. |
| NFR-05 | Security | User content is rendered as text, never as HTML (XSS-safe). | Posting `<script>alert(1)</script>` displays the literal text (automated UI test). |
| NFR-06 | Security | SQL queries are parameterised. | Code review: no string-concatenated SQL. |
| NFR-07 | Persistence | Users and posts survive container restarts. | `docker compose down && docker compose up` (without `-v`) keeps all data; data lives in a named volume. |
| NFR-08 | Performance | Feed API responds in < 300 ms (p95) for 10 000 posts on a developer laptop. | Index on `(created_at DESC, id DESC)`; page size capped at 50. |
| NFR-09 | Usability | Core journey (register → post → see it in feed) takes < 1 minute for a first-time user with no instructions. | Hallway test during review; forms have labels, inline errors, and keyboard support. |
| NFR-10 | Usability | Layout works from 360 px (mobile) to desktop widths. | Manual check in browser dev-tools responsive mode. |
| NFR-11 | Reproducibility | The whole system starts with **one command**: `docker compose up --build`, with no manual `.env` step required. | Fresh clone on a machine with only Docker installed reaches a working UI at http://localhost:8080. |
| NFR-12 | Maintainability | Automated tests cover auth and post flows; CI runs on every push and pull request. | GitHub Actions workflow green; failing test blocks merge. |
| NFR-13 | Configuration | No secrets are committed; configuration via environment variables with safe example values. | `.env` is git-ignored; `.env.example` documents every variable. |
| NFR-14 | Observability | The backend exposes a health endpoint used by Docker. | `GET /api/health` → 200 `{ "status": "ok" }` when the DB is reachable. |

## 5. Traceability

| Requirement | User story | Automated test |
| ----------- | ---------- | -------------- |
| FR-01, FR-02 | US-01 | `backend/tests/auth.test.ts` › register |
| FR-03, FR-04 | US-02 | `backend/tests/auth.test.ts` › login |
| FR-05 | US-03 | `backend/tests/auth.test.ts` › logout |
| FR-06, FR-07 | US-04 | `backend/tests/posts.test.ts` › create; `frontend/src/test/PostComposer.test.tsx` |
| FR-08, FR-09, FR-11 | US-05 | `backend/tests/posts.test.ts` › feed; `frontend/src/test/PostList.test.tsx` |
| FR-10 | US-06 | `backend/tests/auth.test.ts` › me |
| NFR-01, NFR-03 | US-07 | `backend/tests/auth.test.ts` › security |
| NFR-02 | US-07 | `backend/tests/posts.test.ts` › auth required |
| NFR-05 | US-05 | `frontend/src/test/PostList.test.tsx` › XSS |
| NFR-07, NFR-11 | US-08 | Manual demo script (README › Verifying persistence) |
| NFR-12 | US-09 | `.github/workflows/ci.yml` |

## 6. Out of scope (intentionally)

Following, likes, replies, reposts, images/media, editing or deleting posts, profile pages, password
reset, email verification, admin moderation, real-time push updates and production cloud deployment.
These are candidates for the next release and are kept in the **Backlog** column of the board.
