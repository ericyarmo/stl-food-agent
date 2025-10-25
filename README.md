🧭 STL Food Agent

Turning public inspection data into civic memory
Built in under 12 hours during the 2025 WashU Skandalaris Hackathon

👀 What it is

STL Food Agent is a small proof that public data can be both alive and verifiable.
We pulled St. Louis County’s food-inspection pages—tangled frames, outdated scripts, no API—and turned them into civic receipts: plain Markdown + YAML files anyone can read or reuse.

Those receipts feed a static dashboard and a chat agent that can answer:

“Show me Clayton High School’s inspections.”
“Which schools had critical violations this year?”
“Compare Ladue vs Hazelwood.”

No database, no backend. Just files and public proof.

💡 Why no-code(ish)

The goal wasn’t another dashboard—it was legibility.
Keeping data in plain text makes it transparent to students, reporters, or local officials.
A folder of receipts is readable by a human, a spreadsheet, or an LLM.
Civic infrastructure should be durable, remixable, and simple.

🧱 How we built it

12 hours of real build time inside a 40 hour window

2 people: data + architecture / design + polish

Stack: Next.js 15 · Tailwind · TypeScript · Vercel

Data: static JSON + Markdown receipts

AI layer: a tiny prompt router turning questions into queries over fixtures

Everything lives in one repo—no hidden services or credentials.

🧾 Receipts

A civic receipt is one atomic record of public trust:

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


Think of them as Git commits for civic life—verifiable, portable, append-only.

🌍 Why open source

Released under MIT so any school, city, or student group can fork it, swap in their own data, and launch a Food Agent, Parks Agent, or Safety Agent.

The primitives—receipts, proofs, a lightweight index—are reusable.
Drop new data into /fixtures/ingest and publish verified dashboards in hours.

Open sourcing makes civic infrastructure composable. Instead of rebuilding from scratch, cities can share a grammar for trust.

🧠 Toward a Civic Index

Picture every school, nonprofit, and program in St. Louis as a node in one open, verifiable ledger.
Each inspection or event becomes a receipt.
Each grant or initiative becomes a promise that can be fulfilled or amended.
Searchable by anyone, auditable by everyone.

The Food Agent is one tile in that mosaic. Multiply it by housing, health, education, arts, and you get a living memory of the city itself.
That’s the long-term vision behind Chainge — helping communities remember themselves.

🪜 Run locally
npm i
npm run ingest:receipts
npm run dev


Then open http://localhost:3000

Deploy to Vercel with one click.

🪪 License

MIT — free to fork, remix, and redeploy in your own city.

🙌 Credits

Built by Eric Yarmo and Noah Plattus
Part of the Chainge STL initiative — building civic operating systems that remember.
