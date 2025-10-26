import fs from "node:fs";
import path from "node:path";

type Receipt = {
  entity: { name: string; parent?: string; address?: string };
  inspection: { id: string; date: string; score: number; critical_violations?: number };
};

function* walk(dir: string): Generator<string> {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (p.endsWith(".json")) yield p;
  }
}

const root = path.join(process.cwd(), "fixtures", "receipts");
const map = new Map<
  string,
  { address?: string; parent?: string; rows: { date: string; score: number; criticals: number }[] }
>();

for (const file of walk(root)) {
  const r = JSON.parse(fs.readFileSync(file, "utf8")) as Receipt;
  if (!r?.inspection?.date || !r?.entity?.name) continue;

  const key = r.entity.name;
  if (!map.has(key)) map.set(key, { address: r.entity.address, parent: r.entity.parent, rows: [] });
  map.get(key)!.rows.push({
    date: r.inspection.date,
    score: r.inspection.score,
    criticals: r.inspection.critical_violations ?? 0
  });
}

if (!map.size) {
  console.warn("⚠️  No receipts found. Skipping write of fixtures/leaderboard.json.");
  process.exit(0);
}

const now = new Date();
const yearStart = `${now.getFullYear()}-01-01`;
const last12moStr = new Date(now.setFullYear(now.getFullYear() - 1)).toISOString().slice(0, 10);

const out: any[] = [];
for (const [school, acc] of map) {
  acc.rows.sort((a, b) => (a.date < b.date ? 1 : -1));
  const latest = acc.rows[0];
  const pool12 = acc.rows.filter(r => r.date >= last12moStr);
  const avg12mo = pool12.length ? pool12.reduce((s, r) => s + r.score, 0) / pool12.length : latest?.score ?? 0;
  const criticalsYTD = acc.rows.filter(r => r.date >= yearStart).reduce((s, r) => s + (r.criticals || 0), 0);

  out.push({
    school,
    parent: acc.parent || "",
    address: acc.address || "",
    latestDate: latest?.date || "",
    latestScore: latest?.score ?? 0,
    avg12mo: Number(avg12mo.toFixed(1)),
    criticalsYTD
  });
}

out.sort((a, b) => b.latestScore - a.latestScore);

const outPath = path.join(process.cwd(), "fixtures", "leaderboard.json");
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log("✅ Wrote", outPath, out.length, "rows");
