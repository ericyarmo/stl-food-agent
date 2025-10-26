import fs from "node:fs";
import path from "node:path";

type Receipt = {
  entity?: { name?: string };
  source?: { url?: string };
  inspection?: { id?: string };
};

const root = path.join(process.cwd(), "fixtures", "receipts");
const overridesPath = path.join(process.cwd(), "scripts", "source_overrides.json");

// ---- helpers -------------------------------------------------------------

function normalizeUrl(u: string | undefined | null): string {
  if (!u) return "";
  const s = u.trim();
  if (!s) return "";
  if (s.startsWith("https://")) return s;
  if (s.startsWith("http://")) return "https://" + s.slice("http://".length);
  if (s.startsWith("//")) return "https:" + s;
  return "https://" + s.replace(/^\/+/, "");
}

function* walk(dir: string): Generator<string> {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (p.endsWith(".json")) yield p;
  }
}

// ---- load overrides ------------------------------------------------------

let overrides: Record<string, string> = {};
if (fs.existsSync(overridesPath)) {
  try {
    const raw = fs.readFileSync(overridesPath, "utf8");
    overrides = JSON.parse(raw);
  } catch (e) {
    console.error("❌ Could not parse scripts/source_overrides.json. Is it valid JSON (no comments)?");
    throw e;
  }
} else {
  console.warn("⚠️  scripts/source_overrides.json not found. Only normalization will run.");
}

// ---- patch receipts ------------------------------------------------------

const DEFAULT_COUNTY_PORTAL =
  "https://stlouiscountymo.gov/st-louis-county-departments/public-health/food-and-restaurants/inspections/";

let changed = 0;
for (const file of walk(root)) {
  const r = JSON.parse(fs.readFileSync(file, "utf8")) as Receipt;

  const id = r.inspection?.id?.trim() || "";
  const name = r.entity?.name?.trim() || "";
  const original = r.source?.url || "";

  // choose best source: overrides by id, then by name, else normalize existing, else county portal
  const override =
    (id && overrides[id]) ||
    (name && overrides[name]) ||
    "";

  const candidate = override || normalizeUrl(original) || DEFAULT_COUNTY_PORTAL;

  if (!r.source) r.source = {};
  if (r.source.url !== candidate) {
    r.source.url = candidate;
    fs.writeFileSync(file, JSON.stringify(r, null, 2));
    changed++;
    console.log("🔗 patched", path.relative(process.cwd(), file));
  }
}

console.log(`✅ Source URL patch complete. Files changed: ${changed}`);
