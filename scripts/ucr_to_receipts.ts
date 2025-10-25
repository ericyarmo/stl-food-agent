// scripts/ucr_to_receipts.ts
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

type Violation = {
  code: string; title: string; narrative: string;
  critical: boolean; corrected_on_site: boolean;
};
type UCR = {
  schema: string;
  subject: { type: "venue"; id: string };
  payload: {
    inspection_id: string;
    inspection_type: string;
    score_100: number;
    grade_raw?: string;
    violations: Violation[];
  };
  evidence: { source_system: string; source_url: string; checksum_sha256?: string };
  time: { observed: string; ingested: string };
  cid: string;
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");

function toYAML(obj: any, indent = 0): string {
  const pad = "  ".repeat(indent);
  if (Array.isArray(obj)) {
    return obj.map(v => `${pad}- ${typeof v === "object" ? "\n"+toYAML(v, indent+1) : v}`).join("\n");
  }
  return Object.entries(obj).map(([k,v])=>{
    if (v === null || v === undefined) return `${pad}${k}:`;
    if (typeof v === "object") return `${pad}${k}:\n${toYAML(v, indent+1)}`;
    if (typeof v === "string" && v.includes("\n")) {
      return `${pad}${k}: |-\n${v.split("\n").map(line=>pad+"  "+line).join("\n")}`;
    }
    return `${pad}${k}: ${v}`;
  }).join("\n");
}

function convert(u: UCR) {
  const schoolId = slug(u.subject.id);
  const date = u.time.observed; // YYYY-MM-DD
  const outDir = path.join("fixtures","receipts",schoolId);
  fs.mkdirSync(outDir, { recursive: true });

  const checksum = u.evidence.checksum_sha256 ||
    crypto.createHash("sha256").update(JSON.stringify(u.payload)).digest("hex");

  const fm = {
    receipt_version: 1,
    kind: "food_inspection",
    jurisdiction: "St. Louis County, MO",
    issuer: "St. Louis County Department of Public Health",
    entity: { type: "school", name: u.subject.id, address: "" },
    source: {
      system: u.evidence.source_system,
      url: u.evidence.source_url,
      fetched_at: u.time.ingested
    },
    inspection: {
      id: u.payload.inspection_id,
      type: u.payload.inspection_type,
      date,
      score: u.payload.score_100,
      grade_raw: u.payload.grade_raw ?? null,
      critical_violations: u.payload.violations.filter(v=>v.critical).length,
      noncritical_violations: u.payload.violations.filter(v=>!v.critical).length,
      violations: u.payload.violations.map(v=>({
        code: v.code, title: v.title, critical: v.critical,
        corrected_on_site: v.corrected_on_site, narrative: v.narrative
      }))
    },
    proof: {
      method: "human-transcribed",
      attested_by: "Eric Yarmo",
      payload_checksum_sha256: checksum,
      cid: u.cid,
      schema: u.schema
    }
  };

  const md = `---\n${toYAML(fm)}\n---\n`;
  const filePath = path.join(outDir, `${date}.md`);
  fs.writeFileSync(filePath, md, "utf8");
  return filePath;
}

function run() {
  const ingestDir = path.join("fixtures","ingest");
  const files = fs.existsSync(ingestDir) ? fs.readdirSync(ingestDir).filter(f=>f.endsWith(".json")) : [];
  if (!files.length) { console.error("No ingest JSON in fixtures/ingest"); process.exit(1); }
  const out = files.map(f=>{
    const u = JSON.parse(fs.readFileSync(path.join(ingestDir,f),"utf8")) as UCR;
    return convert(u);
  });
  console.log("Wrote:\n" + out.join("\n"));
}
run();
