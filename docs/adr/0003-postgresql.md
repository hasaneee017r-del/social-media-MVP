# ADR-0003: PostgreSQL in a container with a named volume

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

Users and posts must survive application restarts. The data is relational (each post has exactly one
author) and the feed needs efficient "newest first" ordering. Everything must run locally via Docker.

## Decision

Use **PostgreSQL 16** (official `postgres:16-alpine` image) with data stored on the named Docker
volume `pgdata`. The schema is created by idempotent SQL migrations that the API runs on start-up
(tracked in a `schema_migrations` table). Access uses the `pg` driver with parameterised queries
only; no ORM.

## Alternatives considered

| Option | Pros | Cons |
| ------ | ---- | ---- |
| SQLite file on a volume | Zero extra container. | Single-writer; behaves differently from production databases; awkward with multiple API replicas. |
| MongoDB | Flexible schema. | Data is clearly relational; joins (post → author) are natural in SQL. |
| ORM (Prisma / TypeORM) | Type-safe models, migration tooling. | Extra build step (Prisma generate) and learning curve; two tables don't justify it. |

## Consequences

- Data persists across `docker compose down` / `up`; it is deleted only with `docker compose down -v`.
- Case-insensitive unique usernames are enforced by a unique index on `lower(username)`.
- A `CHECK` constraint enforces post length in the database as well as in the API (defence in depth).
- CI runs the backend test-suite against a real PostgreSQL service container, so tests exercise the
  same SQL as production.
