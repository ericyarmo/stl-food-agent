// scripts/build_leaderboard.ts
import fs from "node:fs";
import path from "node:path";

type Violation = { code: string; title: string; critical: boolean };
type Receipt = {
  entity: { name: string; address?: string };
  inspection: { date: string; score: number; critical_violations?: number; violations?: Violation[] };
  source?: { url: string };
};

function* walk(dir: string): Generator<string> {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (p.endsWith(".json")) yield p;
  }
}

/** Find the JSON file for a school's latest date and return its criticals */
function findLatestCriticalsForSchool(school: string, latestDate: string): { code: string; title: string }[] {
  const root = path.join(process.cwd(), "fixtures", "receipts");
  for (const dirent of fs.readdirSync(root, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue;
    const dir = path.join(root, dirent.name);
    const candidate = path.join(dir, `${latestDate}.json`);
    if (!fs.existsSync(candidate)) continue;
    try {
      const rec = JSON.parse(fs.readFileSync(candidate, "utf8"));
      if (rec?.entity?.name === school) {
        const list: Violation[] = (rec.inspection?.violations || []).filter((v: any) => v.critical);
        return list.map(v => ({ code: v.code, title: v.title }));
      }
    } catch {
      /* ignore and continue */
    }
  }
  return [];
}

const receiptsRoot = path.join(process.cwd(), "fixtures", "receipts");
const map = new Map<string, { address?: string; rows: { date: string; score: number; criticals: number }[] }>();

for (const file of walk(receiptsRoot)) {
  const r = JSON.parse(fs.readFileSync(file, "utf8")) as Receipt;
  if (!r?.inspection?.date || !r?.entity?.name) continue;

  const key = r.entity.name;
  if (!map.has(key)) map.set(key, { address: r.entity.address, rows: [] });
  map.get(key)!.rows.push({
    date: r.inspection.date,
    score: r.inspection.score,
    criticals: r.inspection.critical_violations ?? (r.inspection.violations || []).filter(v => v.critical).length ?? 0
  });
}

if (!map.size) {
  console.warn("⚠️  No receipts found. Skipping write of fixtures/leaderboard.json to protect any hand-authored data.");
  process.exit(0);
}

const now = new Date();
const thisYear = now.getFullYear();
const yearStart = `${thisYear}-01-01`;
const last12mo = new Date(now);
last12mo.setFullYear(now.getFullYear() - 1);
const last12moStr = last12mo.toISOString().slice(0, 10);

const out: any[] = [];
for (const [school, acc] of map) {
  acc.rows.sort((a, b) => (a.date < b.date ? 1 : -1));
  const latest = acc.rows[0];

  const pool12 = acc.rows.filter(r => r.date >= last12moStr);
  const avg12mo = pool12.length ? pool12.reduce((s, r) => s + r.score, 0) / pool12.length : latest?.score ?? 0;

  const criticalsYTD = acc.rows
    .filter(r => r.date >= yearStart)
    .reduce((s, r) => s + (r.criticals || 0), 0);

  const latestCriticals = latest?.date ? findLatestCriticalsForSchool(school, latest.date) : [];

  out.push({
    school,
    address: acc.address || "",
    latestDate: latest?.date || "",
    latestScore: latest?.score ?? 0,
    avg12mo: Number(avg12mo.toFixed(1)),
    criticalsYTD,
    latestCriticals // NEW: [{code,title},...]
  });
}

out.sort((a, b) => b.latestScore - a.latestScore);

const outPath = path.join(process.cwd(), "fixtures", "leaderboard.json");
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log("✅ Wrote", outPath, out.length, "rows");
