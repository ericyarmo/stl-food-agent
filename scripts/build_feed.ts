// scripts/build_feed.ts
import fs from "node:fs";
import path from "node:path";

type Violation = { code: string; title: string; critical?: boolean } | null | undefined;

type Receipt = {
  entity: { name: string; parent?: string; address?: string };
  source?: { url?: string };
  inspection: {
    id: string; date: string; score: number;
    critical_violations?: number; noncritical_violations?: number;
    violations?: Violation[] | null;
  };
  proof?: { cid?: string };
};

const ROOT = path.join(process.cwd(), "fixtures", "receipts");
const FEED_OUT = path.join(process.cwd(), "fixtures", "feed.json");
const OVERRIDES_PATH = path.join(process.cwd(), "fixtures", "source_overrides.json");
const COUNTY_PORTAL = "https://stlouiscountymo.gov/st-louis-county-departments/public-health/food-and-restaurants/inspections/";

const overrides = fs.existsSync(OVERRIDES_PATH)
  ? JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf8"))
  : {};

function* walk(dir: string): Generator<string> {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (p.endsWith(".json")) yield p;
  }
}

function slugify(s: string) {
  return s.toLowerCase().trim()
    .replace(/—/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeUrl(u?: string) {
  if (!u) return "";
  const s = u.trim();
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("//")) return "https:" + s;
  return "https://" + s.replace(/^\/+/, "");
}

function pickSourceUrl(r: Receipt) {
  const id = r.inspection?.id || "";
  const name = r.entity?.name || "";
  const slug = slugify(name);

  const fromOverride =
    (id && overrides[id]) ||
    (name && overrides[name]) ||
    (slug && overrides[slug]) ||
    "";

  const chosen = normalizeUrl(fromOverride || r.source?.url || COUNTY_PORTAL);
  return chosen;
}

const items: any[] = [];
for (const file of walk(ROOT)) {
  const r = JSON.parse(fs.readFileSync(file, "utf8")) as Receipt;
  if (!r?.inspection?.date || !r?.entity?.name) continue;

  const v = Array.isArray(r.inspection.violations) ? r.inspection.violations.filter(Boolean) as Violation[] : [];
  const criticals = v.filter(x => x?.critical).map(x => ({ code: x!.code, title: x!.title }));

  items.push({
    id: r.inspection.id,
    school: r.entity.name,
    parent: r.entity.parent || "",
    address: r.entity.address || "",
    date: r.inspection.date,
    score: r.inspection.score,
    critical_count: r.inspection.critical_violations ?? criticals.length,
    noncritical_count: r.inspection.noncritical_violations ?? Math.max(0, v.length - criticals.length),
    source_url: pickSourceUrl(r),
    receipt_cid: r.proof?.cid || "",
    criticals
  });
}

if (!items.length) {
  console.warn("⚠️  No receipts found. Skipping write of fixtures/feed.json.");
  process.exit(0);
}

items.sort((a, b) => (a.date < b.date ? 1 : -1));
const feed = items.slice(0, 60);

fs.writeFileSync(FEED_OUT, JSON.stringify(feed, null, 2));
console.log("✅ Wrote", FEED_OUT, feed.length, "items");
