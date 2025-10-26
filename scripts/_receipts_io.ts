// scripts/_receipts_io.ts
import fs from "node:fs";
import path from "node:path";

export type Receipt = {
  jurisdiction: string;
  issuer: string;
  entity: { type: "school"; name: string; parent?: string | null; address?: string };
  source: { system: string; url: string; fetched_at?: string };
  inspection: {
    id: string;
    type: string;
    date: string; // YYYY-MM-DD
    score: number;
    grade_raw?: string | null;
    critical_violations: number;
    noncritical_violations: number;
    violations?: {
      code: string;
      title: string;
      narrative: string;
      critical: boolean;
      corrected_on_site: boolean;
    }[];
  };
  proof?: { cid?: string };
};

/** Walk a directory tree and yield file paths */
export function* walk(dir: string): Generator<string> {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else yield p;
  }
}

/** Parse front-matter block from a Markdown file (between first two ---) */
function readFrontMatter(md: string): string | null {
  const m = md.match(/^---\n([\s\S]*?)\n---\n/);
  return m ? m[1] : null;
}

/**
 * Ultra-light YAML-ish parser for our own emitted front-matter.
 * Handles only the scalars/arrays/objects we emit.
 * If ingest changes, prefer emitting JSON and skip this.
 */
function yamlLiteToObject(y: string): any {
  const out: any = {};
  const lines = y.split(/\r?\n/);
  const stack: any[] = [out];
  const indents: number[] = [0];
  let currentKey: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, "    ");
    if (!line.trim()) continue;

    const indent = line.match(/^ */)![0].length;
    while (indent < indents[indents.length - 1]) {
      indents.pop();
      stack.pop();
    }

    const cur = stack[stack.length - 1];

    // list item
    if (line.trimStart().startsWith("- ")) {
      const itemStr = line.trimStart().slice(2);

      // Ensure we have an array to push into
      if (!Array.isArray(cur)) {
        const k = currentKey ?? "__items";
        if (typeof cur[k] === "undefined") cur[k] = [];
        // Focus on that array
        stack.push(cur[k]);
        indents.push(indent);
      }
      const arr = stack[stack.length - 1] as any[];

      if (itemStr.includes(": ")) {
        const [k, v] = itemStr.split(/:\s+/, 2);
        const obj: any = {};
        obj[k] = parseScalar(v);
        arr.push(obj);
        // Next deeper props will attach to this object
        stack.push(obj);
        indents.push(indent + 2);
      } else {
        arr.push(parseScalar(itemStr));
      }
      continue;
    }

    // key: value  OR  key:
    const kv = line.trimStart().split(/:\s*/, 2);
    const key = kv[0];
    currentKey = key;

    if (kv.length === 1 || kv[1] === "") {
      // start new nested object
      cur[key] = {};
      stack.push(cur[key]);
      indents.push(indent + 2);
    } else {
      cur[key] = parseScalar(kv[1]);
    }
  }
  return out;
}

function parseScalar(v: string) {
  const s = v.trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
  if (s === "null") return null;
  if (s === "true") return true;
  if (s === "false") return false;
  if (/^\d+$/.test(s)) return Number(s);
  if (/^\d+\.\d+$/.test(s)) return Number(s);
  return s;
}

/** Load a single receipt (prefer .json, fallback to .md front-matter) */
export function loadReceiptFromPair(dir: string, date: string): Receipt | null {
  const jsonPath = path.join(dir, `${date}.json`);
  const mdPath = path.join(dir, `${date}.md`);

  if (fs.existsSync(jsonPath)) {
    try {
      return JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    } catch {
      /* fall through */
    }
  }
  if (fs.existsSync(mdPath)) {
    const raw = fs.readFileSync(mdPath, "utf8");
    const fm = readFrontMatter(raw);
    if (!fm) return null;
    const obj = yamlLiteToObject(fm);
    return obj as Receipt;
  }
  return null;
}

/** Gather all receipts under fixtures/receipts */
export function loadAllReceipts(): Receipt[] {
  const root = path.join(process.cwd(), "fixtures", "receipts");
  const out: Receipt[] = [];
  if (!fs.existsSync(root)) return out;

  for (const schoolDir of fs.readdirSync(root, { withFileTypes: true })) {
    if (!schoolDir.isDirectory()) continue;
    const sdir = path.join(root, schoolDir.name);
    // collect dates present (dedupe .md/.json pairs)
    const dates = new Set(
      fs
        .readdirSync(sdir)
        .filter((n) => /\.(md|json)$/i.test(n))
        .map((n) => n.replace(/\.(md|json)$/i, ""))
    );
    for (const date of dates) {
      const r = loadReceiptFromPair(sdir, date);
      if (r && r.inspection?.date && r.entity?.name) out.push(r);
    }
  }
  return out;
}

/** Write JSON safely: don’t clobber with empty input */
export function safeWriteJSON(outPath: string, data: any[], label: string) {
  if (!data.length) {
    console.warn(`⚠️  No ${label} found. Skipping write to keep existing file intact: ${outPath}`);
    return;
  }
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`✅ Wrote ${outPath} · ${data.length} ${label}`);
}
