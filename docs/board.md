# Project Board

Work is tracked on a **GitHub Projects** board linked to this repository
(see [methodology.md](methodology.md) for the workflow and WIP limits).

## Columns

`Backlog → To Do → In Progress → Review / Testing → Done`

## Card conventions

- Each card is a GitHub Issue created from the **User story** template
  (`.github/ISSUE_TEMPLATE/user-story.md`) with: description, acceptance criteria (checkboxes),
  priority label (`priority:must|should|wont`), epic label and linked requirement IDs.
- A branch per story: `feature/US-xx-short-name`.
- The PR body contains `Closes #<issue>`, so merging moves the card to **Done** automatically
  (enable the *Item closed → Done* workflow in the project settings).

## Creating the board

The board, labels and all user-story issues from [user-stories.md](user-stories.md) can be created
in one step:

```bash
gh auth login
gh auth refresh -s project
./scripts/setup-board.sh            # or: ./scripts/setup-board.sh Hasib-17/social-media-mvp
```

## Traceability

Requirement (FR/NFR) → user story (US) → issue → PR → test. The mapping table is in
[requirements.md §5](requirements.md#5-traceability).
