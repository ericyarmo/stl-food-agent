🧭 STL Food Agent

Turning public inspection data into civic memory.
Built in under 12 hours during the 2025 WashU Skandalaris Hackathon.

👀 What it is

STL Food Agent is a compact proof that public data can be alive and verifiable.
We scraped St. Louis County’s food-inspection pages — tangled frames, old scripts, zero API — and turned them into civic receipts: clean Markdown + YAML files anyone can read, verify, or reuse.

Those receipts drive a static dashboard and a chat agent that can answer:

“Show me Clayton High School’s inspections.”
“Which schools had critical violations this year?”
“Compare Ladue vs Hazelwood.”

No database, no cloud services — just files, flow, and public proof.

💡 Why we went no-code (ish)

The goal wasn’t another web app. It was legibility.
By keeping everything in plain text, we lowered the barrier for students, reporters, or local officials to see and trust their own data.

A folder of receipts is readable by an LLM, a spreadsheet, or a human. That’s how civic infrastructure should work: durable, remixable, transparent.

🧱 How we built it

12 hours of actual build time inside a 40 hour window

2 people: one on data + architecture, one on design + visual polish

Stack: Next.js 15 / Tailwind / TypeScript / Vercel

Data: static JSON + Markdown receipts

AI layer: simple prompt router that turns questions into queries over fixtures

Everything lives in one repo — no hidden APIs or credentials.

🧾 Receipts

A civic receipt = one atomic record of public trust.

kind: food_inspection
entity:
  name: Hazelwood Central Sr High School
  address: 15875 New Halls Ferry Rd, Florissant MO 63031
inspection:
  date: 2025-10-22
  score: 100
  violations: [...]
source:
  url: https://pressagent.envisionconnect.com/insp.phtml?agency=STL&record_id=PR0003910
proof:
  attested_by: Eric Yarmo


They behave like Git commits for civic life — verifiable, portable, append-only.

🌍 Why open source

We’re releasing this under MIT so that schools, cities, and student groups can fork it, replace the data source, and instantly create their own Food Agent, Parks Agent, or Safety Agent.

The primitives — receipts, proofs, and a lightweight index — are universal.
Any city department could drop their CSVs into /fixtures/ingest and publish verified dashboards in hours, not months.

Open sourcing makes civic infrastructure composable. Instead of every agency hiring consultants to build from scratch, they can build on top of one shared grammar.

🧠 What a full Civic Index could be

Imagine every school, nonprofit, and public program in St. Louis represented as a node in one open, verifiable ledger — a Civic Index.

Each event or inspection becomes a receipt.

Each promise (a grant, an initiative) becomes a contract that can be fulfilled or amended.

Searchable by anyone, auditable by everyone.

The Food Agent is a single tile in that mosaic. Multiply it by housing, health, education, arts — and you get a living memory of civic life: something funders, volunteers, and policymakers can actually navigate.

That’s the long-term vision behind Chainge, giving communities the tools to remember themselves.

🪜 Run locally
npm i
npm run ingest:receipts
npm run dev


Then open http://localhost:3000

Deploy to Vercel with one click.

🪪 License

MIT — free to fork, remix, and redeploy in your own city.

🙌 Credits

Built by Eric Yarmo and Noah PLattus
Part of the broader Chainge STL initiative — building civic operating systems that remember.
