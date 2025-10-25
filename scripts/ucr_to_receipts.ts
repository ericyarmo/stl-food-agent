// scripts/ucr_to_receipts.ts
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Civic grammar: who/where
 * - ADDRESS_BOOK: known mailing addresses
 * - ALIASES: fold messy names to one canonical label
 * - PARENT_OF: optional parent facility for sub-sites (e.g., concessions)
 */
const ADDRESS_BOOK: Record<string, string> = {
  "Hazelwood Central Sr High School": "15875 New Halls Ferry Rd, Florissant, MO 63031",
  "Clayton High School": "1 Mark Twain Cir, Saint Louis, MO 63105-1613",
  "Clayton High School — Stuber Gymnasium Concession": "1 Mark Twain Cir, Saint Louis, MO 63105-1613",
  "Ladue Horton Watkins High School": "1201 Warson Rd, Ladue, MO 63124",
  // "Chaminade College Preparatory School": "<ADDRESS>",
};

const ALIASES: Record<string, string> = {
  "Clayton HS - Stuber Concession": "Clayton High School — Stuber Gymnasium Concession",
  "Clayton High School - Stuber Concession": "Clayton High School — Stuber Gymnasium Concession",
  "Clayton High School - Concession": "Clayton High School — Stuber Gymnasium Concession",
  "Clayton High School - Cafeteria": "Clayton High School",
};

const PARENT_OF: Record<string, string> = {
  "Clayton High School — Stuber Gymnasium Concession": "Clayton High School",
};

const canon = (name: string) => ALIASES[name] ?? name;
const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** Types that mirror the UCR JSON we ingest */
type Violation = {
  code: string;
  title: string;
  narrative: string;
  critical: boolean;
  corrected_on_site: boolean;
};

type UCR = {
  schema: string;
  subject: { type: "venue"; id: string };
  payload: {
    inspection_id?: string; // optional; we’ll stabilize if missing
    inspection_type: string;
    score_100: number;
    grade_raw?: string;
    violations: Violation[];
  };
  evidence: { source_system: string; source_url: string; checksum_sha256?: string };
  time: { observed: string; ingested: string }; // dates as ISO strings
  cid: string;
};

/** Minimal YAML emitter (deterministic, readable) */
function toYAML(obj: any, indent = 0): string {
  const pad = "  ".repeat(indent);
  if (Array.isArray(obj)) {
    return obj
      .map((v) =>
        typeof v === "object"
          ? `${pad}-\n${toYAML(v, indent + 1)}`
          : `${pad}- ${v}`
      )
      .join("\n");
  }
  return Object.entries(obj)
    .map(([k, v]) => {
      if (v === null || v === undefined) return `${pad}${k}:`;
      if (typeof v === "object") return `${pad}${k}:\n${toYAML(v, indent + 1)}`;
      if (typeof v === "string" && v.includes("\n")) {
        const body = v.split("\n").map((line) => `${pad}  ${line}`).join("\n");
        return `${pad}${k}: |-\n${body}`;
      }
      return `${pad}${k}: ${v}`;
    })
    .join("\n");
}

/** One UCR JSON -> one Markdown receipt */
function convert(u: UCR) {
  // Canonicalize the venue name early
  const venue = canon(u.subject.id);

  // Stable, boring IDs: <venue-slug>-<YYYY-MM-DD>-<rt|fu>
  const typeKey = u.payload.inspection_type.toLowerCase().includes("follow") ? "fu" : "rt";
  const fallbackId = `${slug(venue)}-${u.time.observed}-${typeKey}`;
  const inspectionId = u.payload.inspection_id || fallbackId;

  // Where to write
  const outDir = path.join("fixtures", "receipts", slug(venue));
  fs.mkdirSync(outDir, { recursive: true });

  // Payload checksum for proof
  const checksum =
    u.evidence.checksum_sha256 ||
    crypto.createHash("sha256").update(JSON.stringify(u.payload)).digest("hex");

  // Deterministic front-matter
  const fm = {
    receipt_version: 1,
    kind: "food_inspection",
    jurisdiction: "St. Louis County, MO",
    issuer: "St. Louis County Department of Public Health",
    entity: {
      type: "school",
      name: venue,
      parent: PARENT_OF[venue] ?? null,
      address: ADDRESS_BOOK[venue] ?? "",
    },
    source: {
      system: u.evidence.source_system,
      url: u.evidence.source_url,
      fetched_at: u.time.ingested,
    },
    inspection: {
      id: inspectionId,
      type: u.payload.inspection_type,
      date: u.time.observed, // YYYY-MM-DD
      score: u.payload.score_100,
      grade_raw: u.payload.grade_raw ?? null,
      critical_violations: u.payload.violations.filter((v) => v.critical).length,
      noncritical_violations: u.payload.violations.filter((v) => !v.critical).length,
      violations: u.payload.violations.map((v) => ({
        code: v.code,
        title: v.title,
        critical: v.critical,
        corrected_on_site: v.corrected_on_site,
        narrative: v.narrative,
      })),
    },
    proof: {
      method: "human-transcribed",
      attested_by: "Eric Yarmo",
      payload_checksum_sha256: checksum,
      cid: u.cid,
      schema: u.schema,
    },
  };

  const md = `---\n${toYAML(fm)}\n---\n`;
  const filePath = path.join(outDir, `${u.time.observed}.md`);
  fs.writeFileSync(filePath, md, "utf8");
  return filePath;
}

/** Walk the ingest folder and mint receipts */
function run() {
  const ingestDir = path.join("fixtures", "ingest");
  const files = fs.existsSync(ingestDir)
    ? fs.readdirSync(ingestDir).filter((f) => f.endsWith(".json"))
    : [];

  if (!files.length) {
    console.error("No ingest JSON in fixtures/ingest");
    process.exit(1);
  }

  const out = files.map((f) => {
    const json = fs.readFileSync(path.join(ingestDir, f), "utf8");
    const u = JSON.parse(json) as UCR;
    return convert(u);
  });

  console.log("Wrote:\n" + out.join("\n"));
}

run();
