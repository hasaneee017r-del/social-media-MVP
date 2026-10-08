# Methodology Selection — Kanban (with weekly cadence)

## Decision

We use **Kanban**, with a lightweight weekly cadence borrowed from Scrum (planning + review), on a
GitHub Projects board.

## Why Kanban fits this project

| Project characteristic | Implication | How Kanban addresses it |
| ---------------------- | ----------- | ----------------------- |
| **Team of 1–2 people** | Scrum roles (PO, SM, Dev Team) and ceremonies (daily stand-up, retro, sprint review) cost more than they return. | Kanban prescribes no roles and no mandatory ceremonies; the board *is* the process. |
| **Uncertain, thin requirements** | Priorities will shift as assumptions (docs/requirements.md §2) are confirmed or reversed. | Work is pulled continuously from a re-orderable backlog; no sprint commitment to break. |
| **Short, fixed delivery window (a few weeks)** | We need a working demo early and must avoid half-finished work at the deadline. | **WIP limits** force finishing over starting; the MVP is always close to demonstrable. |
| **Must show evidence of process** | The assessor needs traceability. | Every card links requirement → story → PR → test; column history shows flow. |

### Alternatives considered

- **Waterfall** — rejected. Requirements are explicitly incomplete; a big-design-up-front phase
  would front-load guesses and leave testing/Docker/CI risk to the very end.
- **Scrum** — viable but heavyweight for 1–2 people. Fixed sprints add little when the whole project
  is ~4 weeks; we keep Scrum's useful parts (weekly planning and review) without the overhead.

## Board workflow

```
Backlog → To Do → In Progress → Review / Testing → Done
```

| Column | Entry rule (Definition of Ready / Done) | WIP limit |
| ------ | --------------------------------------- | --------- |
| Backlog | Any idea, story or bug. Unordered below the top 10. | — |
| To Do | Story has description, acceptance criteria, priority and linked requirement IDs. Ordered by priority. | 5 |
| In Progress | Someone is assigned and a branch exists. | 2 per person |
| Review / Testing | PR open, CI green, acceptance criteria self-checked. | 3 |
| Done | PR merged to `main`, CI green on `main`, acceptance criteria verified. | — |

## Planning, prioritisation and review

- **Prioritisation:** MoSCoW. All **Must** stories are pulled before any **Should**; **Won't**
  items stay in Backlog. Within a priority, risk-first (e.g. Docker + DB persistence early, since
  they are mandatory and hard to retrofit).
- **Weekly planning (15 min):** re-order To Do, split any story estimated over 1 day.
- **Weekly review (15 min):** demo what reached Done; update assumptions; note lessons.
- **Metrics:** cycle time per card (from GitHub Projects history) to spot blockages.

## Iteration plan (cadence, not sprints)

| Week | Focus | Stories |
| ---- | ----- | ------- |
| 1 — Foundation | Requirements, repo, board, architecture, DB schema, Docker skeleton | US-08, US-10 (+ docs) |
| 2 — Identity | Registration, login/logout, session persistence, password hashing | US-01, US-02, US-03, US-06, US-07 |
| 3 — Social posts | Create post, feed, frontend integration | US-04, US-05 |
| 4 — Quality and delivery | Tests, CI, README, demo rehearsal | US-09, US-11 |

## Git workflow

- `main` is always releasable and protected; work happens on short-lived branches
  `feature/US-xx-short-name`.
- Commits follow **Conventional Commits** (`feat:`, `fix:`, `docs:`, `test:`, `ci:`, `chore:`).
- PR description references the story (`Closes #<issue>`), which moves the card to Done on merge.
