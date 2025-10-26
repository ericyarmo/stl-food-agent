// scripts/build_leaderboard.ts
import fs from "node:fs";
import path from "node:path";

type Receipt = {
  entity: { name: string; parent?: unknown; address?: string };
  inspection: { date: string; score: number; critical_violations?: number };
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
const schools = new Map<
  string,
  {
    parent?: string;
    address?: string;
    rows: { date: string; score: number; criticals: number }[];
  }
>();

const toStr = (v: unknown) =>
  typeof v === "string" ? v : v == null ? "" : "";

for (const file of walk(root)) {
  const r = JSON.parse(fs.readFileSync(file, "utf8")) as Receipt;
  if (!r?.inspection?.date || !r?.entity?.name) continue;

  const key = r.entity.name;
  if (!schools.has(key)) {
    schools.set(key, {
      parent: toStr(r.entity.parent),
      address: r.entity.address || "",
      rows: [],
    });
  }
  schools.get(key)!.rows.push({
    date: r.inspection.date,
    score: r.inspection.score,
    criticals: r.inspection.critical_violations ?? 0,
  });
}

if (!schools.size) {
  console.warn("⚠️  No receipts found. Skipping write of fixtures/leaderboard.json.");
  process.exit(0);
}

const now = new Date();
const thisYear = now.getFullYear();
const yearStart = `${thisYear}-01-01`;
const last12mo = new Date(now);
last12mo.setFullYear(now.getFullYear() - 1);
const last12moStr = last12mo.toISOString().slice(0, 10);

const out: any[] = [];
for (const [school, acc] of schools) {
  acc.rows.sort((a, b) => (a.date < b.date ? 1 : -1));
  const latest = acc.rows[0];

  const pool12 = acc.rows.filter((r) => r.date >= last12moStr);
  const avg12mo = pool12.length
    ? pool12.reduce((s, r) => s + r.score, 0) / pool12.length
    : latest?.score ?? 0;

  const criticalsYTD = acc.rows
    .filter((r) => r.date >= yearStart)
    .reduce((s, r) => s + (r.criticals || 0), 0);

  out.push({
    school,
    parent: acc.parent || "",
    address: acc.address || "",
    latestDate: latest?.date || "",
    latestScore: latest?.score ?? 0,
    avg12mo: Number(avg12mo.toFixed(1)),
    criticalsYTD,
  });
}

out.sort((a, b) => b.latestScore - a.latestScore);

const outPath = path.join(process.cwd(), "fixtures", "leaderboard.json");
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log("✅ Wrote", outPath, out.length, "rows");
