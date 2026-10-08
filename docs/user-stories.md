# User Stories and Prioritised Backlog

Epics group the stories; every story maps to requirement IDs in
[requirements.md](requirements.md). These stories are mirrored as GitHub Issues on the project board
(see [board.md](board.md)); this file is the version-controlled snapshot.

Status reflects the state at MVP delivery.

## Epics

| Epic | Goal |
| ---- | ---- |
| E1 — Identity | Users can create an account and securely sign in / out. |
| E2 — Posting & Feed | Signed-in users can publish posts and read everyone's posts. |
| E3 — Delivery & Quality | Anyone can run the product locally with Docker; quality is enforced by CI. |

## Prioritised backlog

| # | ID | Story | Epic | Priority | Estimate | Status |
| - | -- | ----- | ---- | -------- | -------- | ------ |
| 1 | US-10 | Project foundation (repo, board, architecture, schema) | E3 | Must | 1 d | Done |
| 2 | US-08 | Run the whole system with Docker Compose | E3 | Must | 1 d | Done |
| 3 | US-01 | Register an account | E1 | Must | 0.5 d | Done |
| 4 | US-02 | Sign in | E1 | Must | 0.5 d | Done |
| 5 | US-07 | Credentials are stored and transported securely | E1 | Must | 0.5 d | Done |
| 6 | US-03 | Sign out | E1 | Must | 0.25 d | Done |
| 7 | US-04 | Create a post | E2 | Must | 0.5 d | Done |
| 8 | US-05 | View the feed | E2 | Must | 1 d | Done |
| 9 | US-09 | Continuous integration | E3 | Must | 0.5 d | Done |
| 10 | US-06 | Stay signed in after reload | E1 | Should | 0.25 d | Done |
| 11 | US-11 | README and demo script | E3 | Must | 0.5 d | Done |
| 12 | US-12 | Paginate the feed ("Load more") | E2 | Should | 0.5 d | Done |
| 13 | US-13 | Profile page listing a user's posts | E2 | Won't (next release) | 1 d | Backlog |
| 14 | US-14 | Delete my own post | E2 | Won't (next release) | 0.5 d | Backlog |
| 15 | US-15 | Like a post | E2 | Won't (next release) | 1 d | Backlog |
| 16 | US-16 | Follow users / personalised feed | E2 | Won't (next release) | 2 d | Backlog |

---

## E1 — Identity

### US-01 — Register an account
**As a** visitor **I want to** create an account with a username and password **so that** I can take part in the platform.
*Requirements:* FR-01, FR-02, NFR-01 · *Priority:* Must

**Acceptance criteria**
1. Given I am on the Register page, when I enter a new valid username and a password of at least 8 characters and submit, then my account is created and I land on the feed signed in.
2. Given the username already exists (in any letter case), when I submit, then I see "Username is already taken" and no account is created.
3. Given my username has invalid characters or my password is shorter than 8 characters, when I submit, then I see a message explaining the rule.

**Tasks:** DB `users` table · `POST /api/auth/register` · validation (zod) · bcrypt hashing · Register page · tests.

### US-02 — Sign in
**As a** registered user **I want to** sign in **so that** I can see and create posts.
*Requirements:* FR-03, FR-04, NFR-04 · *Priority:* Must

**Acceptance criteria**
1. Given valid credentials, when I sign in, then I am taken to the feed.
2. Given a wrong username or password, when I sign in, then I see "Invalid username or password" (same message for both).
3. Given more than 20 attempts in 15 minutes from my IP, further attempts are rejected with "Too many attempts".

**Tasks:** `POST /api/auth/login` · rate limiter · Sign-in page · tests.

### US-03 — Sign out
**As a** signed-in user **I want to** sign out **so that** nobody else using this browser can post as me.
*Requirements:* FR-05 · *Priority:* Must

**Acceptance criteria**
1. Given I am signed in, when I click "Sign out", then I return to the sign-in page.
2. After signing out, the feed URL redirects to sign-in and the API returns 401.

### US-06 — Stay signed in after reload
**As a** signed-in user **I want** my session to survive a page reload **so that** I don't have to sign in repeatedly.
*Requirements:* FR-10 · *Priority:* Should

**Acceptance criteria**
1. Given I am signed in, when I reload the page, then I still see the feed.
2. Given my session is older than 7 days, I am asked to sign in again.

**Tasks:** `GET /api/auth/me` · auth context bootstraps from `/me`.

### US-07 — Credentials are stored and transported securely
**As the** product owner **I want** passwords hashed and sessions protected **so that** a database leak or XSS bug does not expose user accounts.
*Requirements:* NFR-01, NFR-02, NFR-03, NFR-06 · *Priority:* Must

**Acceptance criteria**
1. Passwords are stored only as bcrypt hashes (cost 12).
2. The session cookie is `HttpOnly` and `SameSite=Lax`.
3. Every `/api/posts` endpoint returns 401 without a valid session.

---

## E2 — Posting & Feed

### US-04 — Create a post
**As a** signed-in user **I want to** publish a short text post **so that** others can read what I have to say.
*Requirements:* FR-06, FR-07 · *Priority:* Must

**Acceptance criteria**
1. Given I type 1–280 characters and click "Post", then the post appears at the top of the feed without reloading.
2. Given the box is empty or over 280 characters, the "Post" button is disabled and the counter shows the problem.
3. Given the API rejects the post, I see the error and my text is kept.

**Tasks:** `posts` table · `POST /api/posts` · composer component with counter · tests.

### US-05 — View the feed
**As a** signed-in user **I want to** see everyone's posts, newest first **so that** I can follow what's happening on the platform.
*Requirements:* FR-08, FR-09, NFR-05, NFR-08 · *Priority:* Must

**Acceptance criteria**
1. Each post shows author username, text and creation date/time.
2. Posts are ordered newest first.
3. HTML in a post is shown as literal text.
4. An empty feed shows a friendly "No posts yet" message.

**Tasks:** `GET /api/posts` · index on `created_at` · PostList component · tests.

### US-12 — Paginate the feed
**As a** user **I want** the feed to load in pages **so that** it stays fast as the platform grows.
*Requirements:* FR-11, NFR-08 · *Priority:* Should

**Acceptance criteria**
1. The API returns at most 50 posts and a `nextCursor` when more exist.
2. "Load more" appends the next page; it disappears when there are no more posts.

---

## E3 — Delivery & Quality

### US-08 — Run the whole system with Docker Compose
**As the** lecturer/investor demo operator **I want to** start everything with one command **so that** I can evaluate the product without installing a toolchain.
*Requirements:* NFR-07, NFR-11, NFR-13, NFR-14 · *Priority:* Must

**Acceptance criteria**
1. On a fresh clone, `docker compose up --build` starts DB, API and web UI; the UI is at http://localhost:8080.
2. After `docker compose down` and `up` again, previously created users and posts are still there.
3. The API container waits for the database to be healthy before starting.

### US-09 — Continuous integration
**As a** developer **I want** tests and builds to run automatically on every push **so that** regressions are caught before merge.
*Requirements:* NFR-12 · *Priority:* Must

**Acceptance criteria**
1. On push / PR, GitHub Actions installs dependencies, type-checks, runs backend tests (against PostgreSQL) and frontend tests, and builds both apps.
2. The workflow builds the Docker images.
3. A failing test marks the run red.

### US-10 — Project foundation
Repository, `.gitignore`, board, requirements, architecture diagram, ADRs, DB schema. *Priority:* Must.

### US-11 — README and demo script
**As the** lecturer **I want** clear setup, test and troubleshooting instructions **so that** I can reproduce the demo.
*Acceptance:* README covers prerequisites, env vars with safe examples, migrations, URLs/ports, test commands, troubleshooting.
