// scripts/build_feed.ts
import fs from "node:fs";
import path from "node:path";

type Receipt = {
  entity: { name: string; address?: string };
  source: { url: string };
  inspection: {
    id: string; date: string; score: number;
    critical_violations: number; noncritical_violations: number;
  };
  proof?: { cid?: string };
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
const items: any[] = [];

for (const file of walk(root)) {
  const r = JSON.parse(fs.readFileSync(file, "utf8")) as Receipt;
  if (!r?.inspection?.date || !r?.entity?.name) continue;
  items.push({
    id: r.inspection.id,
    school: r.entity.name,
    address: r.entity.address || "",
    date: r.inspection.date,
    score: r.inspection.score,
    critical_count: r.inspection.critical_violations || 0,
    noncritical_count: r.inspection.noncritical_violations || 0,
    source_url: r.source.url,
    receipt_cid: r.proof?.cid || ""
  });
}

if (!items.length) {
  console.warn("⚠️  No receipts found. Skipping write of fixtures/feed.json to protect any hand-authored data.");
  process.exit(0);
}

items.sort((a, b) => (a.date < b.date ? 1 : -1));
const feed = items.slice(0, 20);

const outPath = path.join(process.cwd(), "fixtures", "feed.json");
fs.writeFileSync(outPath, JSON.stringify(feed, null, 2));
console.log("✅ Wrote", outPath, feed.length, "items");
