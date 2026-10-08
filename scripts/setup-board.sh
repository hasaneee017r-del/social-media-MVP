#!/usr/bin/env bash
# Creates the labels, user-story issues and GitHub Project board for Chirp.
#
# Prerequisites:
#   gh auth login                       # once
#   gh auth refresh -s project          # grant the "project" scope
#
# Usage:  ./scripts/setup-board.sh [owner/repo]
# Run once. Re-running creates duplicate issues.
set -euo pipefail

REPO="${1:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"
OWNER="${REPO%%/*}"
TITLE="Chirp MVP"

echo "Repository: $REPO"

# ---- labels ----
label() { gh label create "$1" --repo "$REPO" --color "$2" --description "$3" --force >/dev/null; }
label user-story   1d76db "User-facing unit of work"
label "epic:identity"  5319e7 "E1 - Identity"
label "epic:posting"   0e8a16 "E2 - Posting & Feed"
label "epic:delivery"  fbca04 "E3 - Delivery & Quality"
label "priority:must"   b60205 "MoSCoW: Must"
label "priority:should" d93f0b "MoSCoW: Should"
label "priority:wont"   cccccc "MoSCoW: Won't (this release)"

# ---- project ----
PROJECT_NUMBER=$(gh project create --owner "$OWNER" --title "$TITLE" --format json -q .number)
gh project link "$PROJECT_NUMBER" --owner "$OWNER" --repo "$REPO" >/dev/null || true
PROJECT_ID=$(gh project view "$PROJECT_NUMBER" --owner "$OWNER" --format json -q .id)
echo "Created project #$PROJECT_NUMBER"

# Replace the default Status options with the agreed workflow.
STATUS_FIELD_ID=$(gh project field-list "$PROJECT_NUMBER" --owner "$OWNER" --format json \
  -q '.fields[] | select(.name=="Status") | .id')
gh api graphql -f query='
  mutation($field: ID!) {
    updateProjectV2Field(input: {
      fieldId: $field,
      singleSelectOptions: [
        {name: "Backlog",          color: GRAY,   description: "Not yet prioritised"},
        {name: "To Do",            color: BLUE,   description: "Ready: has AC and priority"},
        {name: "In Progress",      color: YELLOW, description: "WIP limit 2 per person"},
        {name: "Review / Testing", color: ORANGE, description: "PR open, CI green"},
        {name: "Done",             color: GREEN,  description: "Merged, AC verified"}
      ]
    }) { projectV2Field { ... on ProjectV2SingleSelectField { id } } }
  }' -f field="$STATUS_FIELD_ID" >/dev/null
status_option() {
  gh project field-list "$PROJECT_NUMBER" --owner "$OWNER" --format json \
    -q ".fields[] | select(.name==\"Status\") | .options[] | select(.name==\"$1\") | .id"
}

# ---- issues ----
# story <id> <title> <epic-label> <priority-label> <status> <body>
story() {
  local id="$1" title="$2" epic="$3" prio="$4" status="$5" body="$6"
  local url item
  url=$(gh issue create --repo "$REPO" --title "$id: $title" --body "$body" \
        --label user-story --label "$epic" --label "$prio")
  item=$(gh project item-add "$PROJECT_NUMBER" --owner "$OWNER" --url "$url" --format json -q .id)
  gh project item-edit --id "$item" --project-id "$PROJECT_ID" \
    --field-id "$STATUS_FIELD_ID" --single-select-option-id "$(status_option "$status")" >/dev/null
  if [ "$status" = "Done" ]; then gh issue close "$url" --reason completed >/dev/null; fi
  echo "  $id -> $status  $url"
}

AC="See docs/user-stories.md for full acceptance criteria."

story US-10 "Project foundation (repo, board, architecture, schema)" epic:delivery priority:must Done \
"Repository, .gitignore, board, requirements, architecture diagram, ADRs, DB schema.
Requirements: docs/requirements.md, docs/architecture.md, docs/adr/"
story US-08 "Run the whole system with Docker Compose" epic:delivery priority:must Done \
"**As the** lecturer **I want to** start everything with one command **so that** I can evaluate without installing a toolchain.
Requirements: NFR-07, NFR-11, NFR-13, NFR-14
- [x] \`docker compose up --build\` serves the UI at http://localhost:8080
- [x] Data survives \`docker compose down\` / \`up\`
- [x] API waits for a healthy DB
$AC"
story US-01 "Register an account" epic:identity priority:must Done \
"**As a** visitor **I want to** create an account **so that** I can take part.
Requirements: FR-01, FR-02, NFR-01
- [x] Valid username + 8+ char password creates the account and signs in
- [x] Duplicate username (any case) is rejected
- [x] Invalid username/short password shows the rule
$AC"
story US-02 "Sign in" epic:identity priority:must Done \
"**As a** registered user **I want to** sign in **so that** I can see and create posts.
Requirements: FR-03, FR-04, NFR-04
- [x] Valid credentials lead to the feed
- [x] Wrong username or password shows the same generic error
- [x] >20 attempts / 15 min are rate limited
$AC"
story US-07 "Credentials are stored and transported securely" epic:identity priority:must Done \
"Requirements: NFR-01, NFR-02, NFR-03, NFR-06
- [x] bcrypt cost 12
- [x] HttpOnly, SameSite=Lax session cookie
- [x] /api/posts requires authentication
$AC"
story US-03 "Sign out" epic:identity priority:must Done \
"Requirements: FR-05
- [x] Sign out returns to the sign-in page
- [x] API returns 401 afterwards
$AC"
story US-04 "Create a post" epic:posting priority:must Done \
"**As a** signed-in user **I want to** publish a short text post **so that** others can read it.
Requirements: FR-06, FR-07
- [x] 1-280 chars appears at top of feed without reload
- [x] Post button disabled when empty / over limit
- [x] API errors shown and text kept
$AC"
story US-05 "View the feed" epic:posting priority:must Done \
"**As a** signed-in user **I want to** see everyone's posts newest first.
Requirements: FR-08, FR-09, NFR-05, NFR-08
- [x] Author, text and date shown
- [x] Newest first
- [x] HTML shown as literal text
- [x] Empty state message
$AC"
story US-09 "Continuous integration" epic:delivery priority:must Done \
"Requirements: NFR-12
- [x] On push/PR: install, typecheck, test (real PostgreSQL), build
- [x] Docker images built and smoke-tested
$AC"
story US-06 "Stay signed in after reload" epic:identity priority:should Done \
"Requirements: FR-10
- [x] Reload keeps the user on the feed
- [x] Session expires after 7 days
$AC"
story US-11 "README and demo script" epic:delivery priority:must Done \
"README covers prerequisites, env vars, migrations, ports, tests, troubleshooting."
story US-12 "Paginate the feed (Load more)" epic:posting priority:should Done \
"Requirements: FR-11
- [x] API returns max 50 posts + nextCursor
- [x] Load more appends next page
$AC"
story US-13 "Profile page listing a user's posts" epic:posting priority:wont Backlog \
"Next release. Requirement FR-12."
story US-14 "Delete my own post" epic:posting priority:wont Backlog "Next release."
story US-15 "Like a post" epic:posting priority:wont Backlog "Next release."
story US-16 "Follow users / personalised feed" epic:posting priority:wont Backlog "Next release."

echo "Done. Open the board: gh project view $PROJECT_NUMBER --owner $OWNER --web"
