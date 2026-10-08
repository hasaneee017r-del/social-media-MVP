<<<<<<< HEAD
# Chirp — Social Media MVP (X / Twitter Lite)

[![CI](https://github.com/Hasib-17/social-media-mvp/actions/workflows/ci.yml/badge.svg)](https://github.com/Hasib-17/social-media-mvp/actions/workflows/ci.yml)

Chirp is a lightweight social media web app. Users can **register**, **sign in / sign out**,
**publish short posts** (up to 280 characters) and read a **feed of everyone's posts, newest first**.
The whole stack runs locally with one Docker command.

## Quick start (Docker)

**Prerequisites:** Docker Engine 24+ with Docker Compose v2 (Docker Desktop is fine). Nothing else.

```bash
git clone https://github.com/Hasib-17/social-media-mvp.git
cd social-media-mvp
docker compose up --build
```

Open **http://localhost:8080**, click *Create an account*, and start posting.

No `.env` file is needed: every setting has a safe local default. Stop with `Ctrl+C` or
`docker compose down`.

| URL | What |
| --- | ---- |
| http://localhost:8080 | Web app |
| http://localhost:8080/api/health | API health check |

## Features

- Register with username + password (username is unique, case-insensitive)
- Sign in, stay signed in across reloads (7-day session), sign out
- Create posts (1–280 characters, live character counter)
- Feed of all users' posts with author, text and date, newest first, with "Load more"
- Passwords hashed with bcrypt (cost 12); session in an HttpOnly cookie; login rate limiting

Out-of-scope items (likes, follows, profiles, editing…) are listed in
[docs/requirements.md §6](docs/requirements.md#6-out-of-scope-intentionally).

## Architecture

```mermaid
flowchart LR
    B([Browser]) -->|:8080| W["web<br/>nginx + React SPA"]
    W -->|/api/*| A["api<br/>Node.js + Express"]
    A -->|SQL| D[("db<br/>PostgreSQL 16")]
    D --- V[("volume: pgdata")]
```

Monolithic REST API + single-page frontend + PostgreSQL, each in its own container.
Details: [docs/architecture.md](docs/architecture.md).

| Layer | Technology |
| ----- | ---------- |
| Frontend | React 18, TypeScript, Vite, React Router |
| Backend | Node.js 22, Express 4, TypeScript, zod |
| Database | PostgreSQL 16 (`pg` driver, SQL migrations) |
| Auth | bcrypt + JWT in HttpOnly cookie |
| Tests | Vitest, Supertest, Testing Library |
| Delivery | Docker, Docker Compose, GitHub Actions |

## Project documents

| Document | Contents |
| -------- | -------- |
| [docs/requirements.md](docs/requirements.md) | Functional & non-functional requirements, assumptions, acceptance criteria, traceability |
| [docs/methodology.md](docs/methodology.md) | Kanban: why it was chosen, workflow, WIP limits, planning & review |
| [docs/user-stories.md](docs/user-stories.md) | Epics, user stories, prioritised backlog |
| [docs/board.md](docs/board.md) | GitHub Projects board conventions and setup script |
| [docs/architecture.md](docs/architecture.md) | Architecture & sequence diagrams, data model, REST API |
| [docs/adr/](docs/adr/) | Architecture Decision Records (monolith, authentication, PostgreSQL) |

## Repository layout

```
.
├── backend/                 Express REST API (TypeScript)
│   ├── src/
│   │   ├── routes/          auth.ts, posts.ts
│   │   ├── app.ts           Express app wiring
│   │   ├── auth.ts          session cookie + requireAuth middleware
│   │   ├── migrate.ts       schema migrations (run on start-up)
│   │   └── index.ts         entry point
│   ├── tests/               API integration tests (real PostgreSQL)
│   └── Dockerfile
├── frontend/                React SPA (TypeScript, Vite)
│   ├── src/
│   │   ├── pages/  components/
│   │   └── test/            component & flow tests
│   ├── nginx.conf           serves SPA, proxies /api
│   └── Dockerfile
├── docs/                    requirements, methodology, stories, architecture, ADRs
├── scripts/setup-board.sh   creates GitHub Project board + issues
├── .github/workflows/ci.yml CI pipeline
├── compose.yaml
└── .env.example
```

## Configuration

All variables are optional for local use. To change them: `cp .env.example .env`, edit, and re-run
`docker compose up --build`.

| Variable | Default (safe local example) | Purpose |
| -------- | ---------------------------- | ------- |
| `POSTGRES_USER` | `chirp` | Database user |
| `POSTGRES_PASSWORD` | `chirp_dev_password` | Database password |
| `POSTGRES_DB` | `chirp` | Database name |
| `JWT_SECRET` | `dev-only-insecure-secret-change-me` | Signs session tokens. **Set a random value** (`openssl rand -hex 32`) anywhere other than a local demo. |
| `WEB_PORT` | `8080` | Host port for the web app |

Backend-only variables (set in `compose.yaml`): `DATABASE_URL`, `PORT` (3000), `COOKIE_SECURE`
(`true` behind HTTPS), `TRUST_PROXY` (1 behind nginx), `BCRYPT_COST` (12), `AUTH_RATE_LIMIT` (20
per 15 min).

`.env` is git-ignored. Never commit real secrets.

## Database and migrations

Migrations run **automatically** when the API starts (`backend/src/migrate.ts`, tracked in the
`schema_migrations` table). There is no seed data: create accounts through the UI.

Inspect the database:

```bash
docker compose exec db psql -U chirp -d chirp -c "SELECT id, username, left(password_hash, 7) FROM users;"
```

### Verifying persistence

```bash
docker compose down      # stops and removes containers, KEEPS the pgdata volume
docker compose up        # users and posts are still there
docker compose down -v   # removes the volume too: full reset
```

## Running tests

### Backend (needs PostgreSQL)

```bash
cd backend
npm ci
npm run test:db          # starts a throwaway PostgreSQL on localhost:54329
npm test                 # 25 integration tests
npm run test:db:stop
```

To use another database: `DATABASE_URL=postgres://user:pass@host:port/db npm test`.
**The tests truncate the tables**, so never point them at real data.

### Frontend

```bash
cd frontend
npm ci
npm test                 # 10 component and flow tests
```

## Local development without Docker

Requires Node.js 18.18+ (22 recommended) and a PostgreSQL instance.

```bash
# terminal 1 - API on :3000
cd backend && npm ci
DATABASE_URL=postgres://chirp:chirp@localhost:54329/chirp_test npm run dev

# terminal 2 - UI on :5173, proxies /api to :3000
cd frontend && npm ci && npm run dev
```

## Continuous integration

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push and pull request:

1. **Backend:** `npm ci` → typecheck → tests against a PostgreSQL service container → build
2. **Frontend:** `npm ci` → tests → typecheck + production build
3. **Docker:** builds all images with `docker compose up --build --wait`, then smoke-tests
   register → post → feed through nginx

Results appear in the repository's **Actions** tab and on each commit/PR.

## Troubleshooting

| Problem | Fix |
| ------- | --- |
| `port is already allocated` on 8080 | Another app uses the port. Run `WEB_PORT=8081 docker compose up --build` and open http://localhost:8081. |
| Page loads but sign-in says "Could not reach the server" | The API is still starting or crashed: `docker compose ps` and `docker compose logs api`. |
| `api` container keeps restarting | Usually DB credentials changed after the volume was created. Reset with `docker compose down -v` (deletes data). |
| Signed out unexpectedly after `down -v` | Expected: the account no longer exists. Register again. |
| "Too many attempts" on sign-in | Rate limit (20 per 15 min per IP). Wait, or `docker compose restart api`. |
| Changes to code not visible | Rebuild: `docker compose up --build`. |
| Backend tests fail with `ECONNREFUSED` | Start the test DB first: `npm run test:db`. |

## Assumptions and scope

Key assumptions (full list in [docs/requirements.md §2](docs/requirements.md#2-assumptions)):
web app only; username + password (no email); posts are plain text ≤ 280 chars; feed shows all
users' posts and requires sign-in; posts cannot be edited or deleted in the MVP.

## AI assistance disclosure

Parts of this project were drafted with the help of an AI coding assistant (Claude Code) and then
reviewed, tested and adapted by the author, in line with the course's academic-integrity policy.

## License

MIT
=======
# social-media-MVP
>>>>>>> e2d97a84b8b86c5452f2703240d8c43790fc9005
