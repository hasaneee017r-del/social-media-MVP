# ADR-0001: Monolithic backend with a separate SPA frontend

- **Status:** Accepted
- **Date:** 2026-10-08
- **Deciders:** Project team

## Context

The customer needs an investor-demo MVP within a few weeks: register, sign in/out, view all posts,
create posts, runnable locally with Docker. The team is 1–2 people. The domain is small (two
entities: users and posts) and there is no requirement for independent scaling or independent
release of parts of the system. The lecturer must be able to start everything with one command.

## Decision

Build a **single backend service (monolith)** in Node.js/Express/TypeScript, organised internally
into modules (`auth`, `posts`) with clear boundaries, plus a **separately built React SPA** served by
Nginx, and **PostgreSQL** as the only data store. All three run as containers under one
`compose.yaml`.

## Alternatives considered

| Option | Pros | Cons | Verdict |
| ------ | ---- | ---- | ------- |
| **Microservices** (auth service, posts service, API gateway) | Independent scaling and deployment; team autonomy. | Network calls between services, distributed auth, more containers, more CI pipelines, harder local debugging. No team or scale to justify it. | Rejected |
| **Server-rendered monolith** (e.g. Express + templates, one container) | Fewest moving parts. | Less interactive UX (full page reloads), harder to evolve into a mobile client later. | Rejected |
| **Full-stack framework** (e.g. Next.js) | One project for UI and API. | Couples UI and API deployment; framework-specific conventions to learn within the deadline. | Rejected |
| **Monolith API + SPA** | Simple to run and debug; clean REST API reusable by a future mobile app; frontend/back-end can be tested independently. | Two build pipelines; the SPA must be served and proxied. | **Chosen** |

## Consequences

- **Positive:** one codebase per tier; one database transaction boundary; in-process calls between
  modules; trivial local debugging; easy Docker Compose story. The REST API is a ready contract for a
  future mobile client.
- **Negative:** the backend scales as one unit; a defect in one module can take down the whole API.
  Acceptable at MVP scale.
- **Mitigation / evolution path:** modules talk only through their own route/SQL code, so `posts`
  could be extracted into its own service later if load or team structure demands it.
- Nginx proxies `/api` so the browser sees a single origin, avoiding CORS configuration and allowing
  `SameSite=Lax` cookies.
