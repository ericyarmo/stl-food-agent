🧭 STL Food Agent

Turning public inspection data into civic memory
Built in under 12 hours at the 2025 WashU Skandalaris Hackathon

👀 What it is

STL Food Agent is a small proof that public data can be alive and verifiable.

It pulls St. Louis County’s food-inspection pages — tangled frames, legacy scripts, no API — and converts them into civic receipts: plain Markdown + YAML files that anyone can read, verify, or reuse.
Those receipts power a static dashboard and a chat agent that can answer:

“Show me Clayton High School’s inspections.”

“Which schools had critical violations this year?”

“Compare Ladue vs Hazelwood.”


No database, no backend — just files and public proof.

💡 Why no-code (ish)

The goal wasn’t another dashboard; it was legibility.
By keeping data in plain text, we make it easy for students, reporters, or local officials to see and trust their own information.

A folder of receipts is readable by a human, a spreadsheet, or an LLM.
That’s how civic infrastructure should work: durable, remixable, transparent.

🧱 How we built it
| Detail   | Summary                                                |
| :------- | :----------------------------------------------------- |
| ⏱ Time   | 12 hours of real build time inside a 40 hour window    |
| 👥 Team  | 2 people — data + architecture / design + polish       |
| 🧰 Stack | Next.js 15 · Tailwind CSS · TypeScript · Vercel        |
| 📦 Data  | Static JSON + Markdown receipts                        |
| 🤖 AI    | Simple prompt-router that turns questions into queries |

Everything lives in one repo. No hidden services or credentials.

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
  

They behave like Git commits for civic life — verifiable, portable, append-only.

🌍 Why open source

This project is MIT-licensed so any school, city, or student group can fork it, swap in new data, and instantly create their own Food Agent, Parks Agent, or Safety Agent.

The primitives — receipts, proofs, and a lightweight index — are universal.
Drop data into /fixtures/ingest, run one command, and publish a verified dashboard in hours.

Open sourcing makes civic infrastructure composable.
Instead of rebuilding from scratch, cities can build on a shared grammar for trust.

🧠 Toward a Civic Index

Imagine every school, nonprofit, and program in St. Louis represented in one open, verifiable ledger:
Each inspection or event becomes a receipt.

Each grant or initiative becomes a promise that can be fulfilled or amended.
Searchable by anyone, auditable by everyone.

The Food Agent is one tile in that mosaic. Multiply it by housing, health, education, and arts — and you get a living memory of civic life.
That’s the long-term vision behind Chainge: giving communities the tools to remember themselves.

🪜 Run locally

npm i
npm run ingest:receipts
npm run dev
Then open http://localhost:3000
Deploy to Vercel in a single click.

🪪 License

MIT — free to fork, remix, and redeploy in your own city.

🙌 Credits

Built by Eric Yarmo and Noah Plattus.
Part of the Chainge STL initiative — building civic operating systems that remember.
