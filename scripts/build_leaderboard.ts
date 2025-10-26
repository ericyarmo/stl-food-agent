// scripts/build_leaderboard.ts
import path from "node:path";
import { loadAllReceipts, safeWriteJSON } from "./_receipts_io.ts";

type Row = {
  school: string;
  address?: string;
  latestDate: string;
  latestScore: number;
  avg12mo: number;
  criticalsYTD: number;
};

function toStr(x: unknown): string | undefined {
  return typeof x === "string" && x.trim() ? x.trim() : undefined;
}

const receipts = loadAllReceipts();

const bySchool = new Map<
  string,
  { address?: string; rows: { date: string; score: number; criticals: number }[] }
>();

for (const r of receipts) {
  if (!r?.inspection?.date || !r?.entity?.name) continue;
  const key = String(r.entity.name);
  if (!bySchool.has(key)) {
    bySchool.set(key, { address: toStr(r.entity.address), rows: [] });
  }
  bySchool.get(key)!.rows.push({
    date: String(r.inspection.date),
    score: Number(r.inspection.score ?? 0),
    criticals: Number(r.inspection.critical_violations ?? 0),
  });
}

const now = new Date();
const thisYear = now.getFullYear();
const yearStart = `${thisYear}-01-01`;

const last12mo = new Date(now);
last12mo.setFullYear(now.getFullYear() - 1);
const last12moStr = last12mo.toISOString().slice(0, 10);

const out: Row[] = [];

for (const [school, acc] of bySchool) {
  acc.rows.sort((a, b) => (a.date < b.date ? 1 : -1));
  const latest = acc.rows[0];

  const pool12 = acc.rows.filter((r) => r.date >= last12moStr);
  const avg12mo = pool12.length
    ? pool12.reduce((s, r) => s + r.score, 0) / pool12.length
    : latest?.score ?? 0;

  const criticalsYTD = acc.rows
    .filter((r) => r.date >= yearStart)
    .reduce((s, r) => s + Number(r.criticals || 0), 0);

  out.push({
    school,
    address: acc.address,
    latestDate: latest?.date ?? "",
    latestScore: latest?.score ?? 0,
    avg12mo: Number(avg12mo.toFixed(1)),
    criticalsYTD,
  });
}

out.sort((a, b) => b.latestScore - a.latestScore);

const outPath = path.join(process.cwd(), "fixtures", "leaderboard.json");
safeWriteJSON(outPath, out, "leaderboard rows");
