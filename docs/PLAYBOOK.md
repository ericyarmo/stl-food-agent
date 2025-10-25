STL Food Agent — Playbook

Goal: turn public inspection pages into verifiable civic receipts, then render a clean feed + leaderboard.
Reality: no API, frames, old scripts. We keep it boring: Markdown, JSON, and a couple TypeScript files.

Repo layout
fixtures/
  receipts/<school-slug>/<YYYY-MM-DD>.md        # human receipt
  receipts/<school-slug>/<YYYY-MM-DD>.json      # machine sibling (emitted)
  feed.json                                      # 20 most recent inspections
  leaderboard.json                               # per-school rollups
docs/
  PLAYBOOK.md
  RECEIPT_SCHEMA.md
scripts/
  ucr_to_receipts.ts        # UCR JSON → .md (+ optional .json)
  emit_receipt_json.ts      # .md → .json
  build_feed.ts             # receipts → feed.json
  build_leaderboard.ts      # receipts → leaderboard.json
src/                         # Next.js app

Day-of demo commands
# 1) If you added new .md receipts, emit machine JSON:
npm run data:emit-json

# 2) Rebuild feed + leaderboard:
npm run data

# 3) Run the site:
npm run dev   # http://localhost:3000

# 4) Deploy (Vercel):
npx vercel --prod

Data lifecycle (keep it simple)

Capture a page → transcribe to UCR JSON (one inspection).

Normalize with scripts/ucr_to_receipts.ts → .md receipts (human) and optionally .json.

Emit .json from .md (idempotent) with npm run data:emit-json.

Project → feed.json (latest 20) and leaderboard.json (per-school metrics).

Display: Next.js reads fixtures/*.json statically.

Verify: every card links to the source URL; modal shows checksum + CID.

Adding a school (10 minutes)

Create dir: fixtures/receipts/<school-slug>/

Add one or more YYYY-MM-DD.md receipts (see schema doc).

Run:

npm run data:emit-json
npm run data


Refresh homepage. Done.

What the UI expects
Feed card (fixtures/feed.json)

school, address, date, score

critical_count, noncritical_count

critical_titles (e.g., "F009 Adequate hand-washing...")

summary (one-liner)

source_url, receipt_cid (for Verify)

Leaderboard row (fixtures/leaderboard.json)

school, address

latestDate, latestScore

avg12mo, criticalsYTD

latestCriticals: [{code,title}]

Name + slug rules

Folder: slug("Clayton High School") → clayton-high-school

File: inspection date as YYYY-MM-DD.md

Stable inspection id inside the receipt (e.g., clayton-2025-09-29).

Quality checks (60 seconds)

Feed shows real critical titles, not just counts.

Leaderboard sorts; latestCriticals populates for recent rows.

Source link opens the county page in a new tab.

Verify modal shows: source_url, cid, payload_checksum_sha256.

Troubleshooting

Feed build fails with .filter → your violations wasn’t an array. Fixed via normalizeViolations() in build_feed.ts. Re-run.

Links don’t open → use plain <a target="_blank" rel="noopener noreferrer">.

Zero rows → you forgot npm run data:emit-json before npm run data.

Why this works (and scales)

Files are the API. No DB, no keys.

Receipts are append-only and verifiable (checksums).

Any department can drop receipts into /fixtures/receipts/** and instantly get a feed + leaderboard.