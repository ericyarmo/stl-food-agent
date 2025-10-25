// scripts/build_feed.ts
import fs from "node:fs";
import path from "node:path";

type Violation = {
  code?: string;
  title?: string;
  narrative?: string;
  critical?: boolean;
  corrected_on_site?: boolean;
};

type Receipt = {
  entity: { name: string; address?: string; parent?: string | null };
  source: { url: string };
  inspection: {
    id: string;
    date: string;        // YYYY-MM-DD
    score: number;
    critical_violations?: number;
    noncritical_violations?: number;
    violations?: unknown; // can be array | object | null (be defensive)
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

/** Coerce unknown violations shape into a flat array of Violation objects */
function normalizeViolations(v: unknown): Violation[] {
  if (!v) return [];
  if (Array.isArray(v)) return v as Violation[];

  // If it's an object, try values; sometimes YAML-lite parsers produce keyed objects
  if (typeof v === "object") {
    const vals = Object.values(v as Record<string, unknown>);
    // values might be objects or nested arrays
    const flat: Violation[] = [];
    for (const x of vals) {
      if (!x) continue;
      if (Array.isArray(x)) {
        for (const y of x) if (y && typeof y === "object") flat.push(y as Violation);
      } else if (typeof x === "object") {
        flat.push(x as Violation);
      }
    }
    return flat;
  }

  // Unknown scalar → nothing
  return [];
}

const root = path.join(process.cwd(), "fixtures", "receipts");
const items: any[] = [];

for (const file of walk(root)) {
  const r = JSON.parse(fs.readFileSync(file, "utf8")) as Receipt;
  if (!r?.inspection?.date || !r?.entity?.name) continue;

  const allViolations = normalizeViolations(r.inspection.violations);
  const crits = allViolations.filter(v => !!v.critical);
  const noncrits = allViolations.filter(v => !v.critical);

  const critical_titles = crits.map(v => `${v.code ?? ""} ${v.title ?? ""}`.trim()).filter(Boolean);

  items.push({
    id: r.inspection.id,
    school: r.entity.name,
    parent: r.entity.parent ?? null,
    address: r.entity.address || "",
    date: r.inspection.date,
    score: r.inspection.score,
    critical_count: r.inspection.critical_violations ?? crits.length ?? 0,
    noncritical_count: r.inspection.noncritical_violations ?? noncrits.length ?? 0,
    critical_titles, // richer context for the card
    source_url: (r.source.url || "").trim(),
    receipt_cid: r.proof?.cid || "",
    summary:
      `${crits.length} critical, ${noncrits.length} noncritical` +
      (crits.length ? ` — e.g., ${critical_titles.slice(0, 3).join(", ")}` : "")
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
