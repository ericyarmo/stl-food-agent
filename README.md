🧭 STL Food Agent

Turning public inspection data into civic memory.
Built in under 12 hours during the 2025 STL Civic Hackathon.

👀 What it is

STL Food Agent is a tiny proof of what civic infrastructure could feel like if it were built with the same care as commercial software.
It takes St. Louis County food-inspection pages — those hidden, frame-nested, barely human-readable HTML tables — and converts them into verifiable civic receipts.

Each inspection becomes a Markdown + YAML file with a checksum and link back to its source.
Those receipts power a public leaderboard and a chat agent that can answer questions like:

“Show me Clayton High School’s inspections.”
“Which schools had critical violations this year?”
“Compare Clayton vs Ladue.”

No external database. No back end. Just files and flow.

💡 Why we went no-code(ish)

We didn’t need more dashboards — we needed proof.
By structuring data in plain text, anyone can inspect, verify, or extend it without a stack of dependencies.
Students, journalists, or public-health staff can open a folder and immediately see how clean their schools are.

This approach shows that infrastructure isn’t always code-heavy. Sometimes it’s a shared grammar — receipts, promises, proofs — that lets ordinary people collaborate on truth.

⏱ How we built it

48 hours total hackathon window

< 12 hours of actual build time

2 people: one handled data + architecture, the other handled design + visual polish

Tech stack: Next.js 15 / Tailwind / TypeScript / Vercel

Data layer: static JSON + Markdown receipts

AI layer: simple LLM prompt router (optional) for natural-language questions

All code lives in one repo.
No hidden services, no API keys, no database credentials.

📂 Structure
fixtures/
  ingest/        # raw UCR JSONs
  receipts/      # normalized civic receipts (Markdown+YAML)
  leaderboard.json
  feed.json
src/
  app/           # Next.js routes: / and /chat
  lib/           # small data helpers
  ui/            # Verify modal, table components
docs/
  PLAYBOOK.md
  RECEIPT_SCHEMA.md

🧾 Receipts

A civic receipt is a tiny unit of verifiable memory:

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


It’s not just data — it’s a civic artifact you can trust, fork, or verify.

🧠 Why it matters

We built this to show that young builders can serve their city directly.
Give them a clear grammar — receipts, promises, verifications — and they’ll produce civic software that feels as tight as any startup’s product.

If a couple of students can turn messy public HTML into a functioning civic ledger overnight, imagine what every city could do with the right incentives and open data culture.

🪜 Run locally
npm i
npm run ingest:receipts
npm run dev


Then open http://localhost:3000
.

Deploy on Vercel with one click.

🪪 License

MIT — open for remixing, civic reuse, and learning.

🙌 Credits

Built by Eric Yarmo and teammates at the 2025 STL Civic Hackathon.
Part of the broader Chainge vision — building civic operating systems that remember.