docs/RECEIPT_SCHEMA.md
Civic Receipt Schema — Food Inspection (v1)

A receipt is a small, signed story: who/what/when, where it came from, and enough detail to verify it later.

Receipts live as Markdown with YAML front-matter (human), and as a JSON twin (machine).
File name: fixtures/receipts/<school-slug>/<YYYY-MM-DD>.md

YAML front-matter (required keys)
---
receipt_version: 1
kind: food_inspection
jurisdiction: St. Louis County, MO
issuer: St. Louis County Department of Public Health

entity:
  type: school
  name: Clayton High School
  parent: # optional, for sub-sites like concessions
  address: 1 Mark Twain Cir, Saint Louis, MO 63105-1613

source:
  system: EnvisionConnect PressAgent (DecadeOnline) – St. Louis County
  url: https://pressagent.envisionconnect.com/insp.phtml?agency=STL&record_id=PR0010809
  fetched_at: 2025-10-25T17:10:00Z

inspection:
  id: clayton-2025-09-29             # stable id, deterministic if possible
  type: ROUTINE INSPECTION           # or FOLLOW UP INSPECTION, etc.
  date: 2025-09-29                   # YYYY-MM-DD
  score: 90                          # integer 0–100
  grade_raw: 90%                     # optional as shown on site
  critical_violations: 5             # counts (redundant but handy)
  noncritical_violations: 5
  violations:
    - code: F009
      title: Adequate hand-washing facilities supplied and accessible
      critical: true
      corrected_on_site: true
      narrative: |-
        Handwashing signs not available at handsinks. Corrected on site.
    - code: F022
      title: Proper hot holding
      critical: true
      corrected_on_site: false
      narrative: |-
        Hot foods held below 135°F. Using time as control; discard after 4 hours.

proof:
  method: human-transcribed
  attested_by: Eric Yarmo
  payload_checksum_sha256: 466740700dbf9bc6ec78690b10a2a5c8e4a9eb568a2c02b83ecdfd27801d06bf
  cid: stub-clayton-2025-09-29       # content id or short hash
  schema: UCR/Action/health_inspection@v1
---


Markdown body (below the ---) is optional and ignored by builders. Use it for notes if needed.

JSON twin

Each .md has a machine twin emitted to .json with the same basename.
Emit with:

npm run data:emit-json


The JSON mirrors YAML fields 1-to-1 and is what the builders read.

Field reference
Top-level

receipt_version (number, required) — set to 1.

kind (string, required) — "food_inspection".

jurisdiction (string, required) — e.g., "St. Louis County, MO".

issuer (string, required) — the agency name.

entity

type (string, required) — "school".

name (string, required) — display name.

parent (string, optional) — parent facility (e.g., “Clayton High School” for concessions).

address (string, required) — full postal address.

source

system (string, required) — where the data lives.

url (string, required) — deep link to the school inspection page (not one specific inspection).

fetched_at (ISO datetime, required) — when you captured it.

inspection

id (string, required) — stable per inspection (recommend <slug>-<YYYY-MM-DD>).

type (enum, required) — ROUTINE INSPECTION | FOLLOW UP INSPECTION | other label from site.

date (YYYY-MM-DD, required) — inspection date.

score (int 0–100, required).

grade_raw (string, optional) — e.g., "99%".

critical_violations (int, recommended) — quick count.

noncritical_violations (int, recommended) — quick count.

violations (array, recommended) — full detail.

Violation object:

code (string, required) — e.g., F022.

title (string, required) — short label.

critical (boolean, required).

corrected_on_site (boolean, required).

narrative (string, optional) — multi-line ok.

proof

method (string, required) — e.g., human-transcribed.

attested_by (string, required) — who typed/validated it.

payload_checksum_sha256 (string, recommended) — SHA-256 of the inspection payload for tamper-evidence.

cid (string, recommended) — short content id / hash.

schema (string, required) — points back to the upstream UCR.

File naming

Folder: fixtures/receipts/<school-slug>/

File: YYYY-MM-DD.md (the inspection date)

Use the same date in inspection.date.

Versioning

Increment receipt_version when the receipt format changes.

Additive changes are fine; removing/renaming keys is a breaking change.

Builders are defensive (normalize violations), but keep keys stable for downstream users.

Validation (quick)

inspection.date is YYYY-MM-DD.

score is 0–100 integer.

violations[].critical and corrected_on_site are booleans.

source.url is an absolute https:// URL.

Why both .md and .json?

Markdown is legible to people; easy to PR/review.

JSON is legible to code; fast for UIs and scripts.

We keep them synced via npm run data:emit-json.

Minimal example (Ladue, routine)
---
receipt_version: 1
kind: food_inspection
jurisdiction: St. Louis County, MO
issuer: St. Louis County Department of Public Health
entity:
  type: school
  name: Ladue Horton Watkins High School
  address: 1201 Warson Rd, Ladue, MO 63124
source:
  system: EnvisionConnect PressAgent (DecadeOnline) – St. Louis County
  url: https://pressagent.envisionconnect.com/insp.phtml?agency=STL&record_id=PR0012101
  fetched_at: 2025-10-25T17:20:00Z
inspection:
  id: ladue-2024-12-13
  type: ROUTINE INSPECTION
  date: 2024-12-13
  score: 99
  critical_violations: 0
  noncritical_violations: 1
  violations:
    - code: F042
      title: Warewashing test strips provided
      critical: false
      corrected_on_site: false
      narrative: Test kit not available to measure sanitizer concentration.
proof:
  method: human-transcribed
  attested_by: Eric Yarmo
  payload_checksum_sha256: <sha256>
  cid: stub-ladue-2024-12-13
  schema: UCR/Action/health_inspection@v1
---

Output contracts (what builders write)
Feed item
{
  "id": "clayton-2025-09-29",
  "school": "Clayton High School",
  "address": "1 Mark Twain Cir, Saint Louis, MO 63105-1613",
  "date": "2025-09-29",
  "score": 90,
  "critical_count": 5,
  "noncritical_count": 5,
  "critical_titles": ["F009 Adequate hand-washing facilities supplied and accessible","F015 Food contact surfaces cleaned and sanitized","F022 Proper hot holding"],
  "summary": "5 critical, 5 noncritical — e.g., F009, F015, F022",
  "source_url": "https://pressagent.envisionconnect.com/insp.phtml?agency=STL&record_id=PR0010809",
  "receipt_cid": "stub-clayton-2025-09-29"
}

Leaderboard row
{
  "school": "Clayton High School",
  "address": "1 Mark Twain Cir, Saint Louis, MO 63105-1613",
  "latestDate": "2025-10-13",
  "latestScore": 96,
  "avg12mo": 94.7,
  "criticalsYTD": 8,
  "latestCriticals": [
    {"code":"F009","title":"Adequate hand-washing facilities supplied and accessible"},
    {"code":"F022","title":"Proper hot holding"}
  ]
}
