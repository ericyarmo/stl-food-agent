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
 * Ultra-light YAML-ish parser for our emitted front-matter.
 * Supports:
 *   key: value
 *   key:
 *     sub: value
 *   list:
 *     - item
 *     - key: value
 *       another: value
 *
 * Notes:
 * - Indentation uses spaces only. Tabs are converted to 4 spaces.
 * - Multiline scalars are not needed for our receipts; everything is single line.
 */
function yamlLiteToObject(y: string): any {
  type Frame =
    | { type: "object"; value: Record<string, any> }
    | { type: "array"; value: any[] };

  const root: Record<string, any> = {};
  const stack: Frame[] = [{ type: "object", value: root }];
  const indents: number[] = [0];

  // Used to attach "- ..." items under the most recent key in an object
  let lastKey: string | null = null;

  const lines = y.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, "    ");
    if (!line.trim()) continue;

    const indent = (line.match(/^ */)![0] || "").length;
    const trimmed = line.trimStart();

    // Unwind stack to the current indent
    while (indents.length > 0 && indent < indents[indents.length - 1]) {
      indents.pop();
      stack.pop();
      // when we pop out of a key's nested block, we also forget that key
      lastKey = null;
    }

    const top = stack[stack.length - 1];

    // LIST ITEM
    if (trimmed.startsWith("- ")) {
      const itemStr = trimmed.slice(2);

      // Ensure we're inside an array; if we’re in an object, we need a lastKey to hang the array from.
      if (top.type === "object") {
        const obj = top.value;
        const keyForArray = lastKey ?? "__items"; // fallback bucket if malformed
        if (!Array.isArray(obj[keyForArray])) obj[keyForArray] = [];
        // Descend into that array if we're not already inside it at this indent
        stack.push({ type: "array", value: obj[keyForArray] });
        indents.push(indent);
      }

      const arrFrame = stack[stack.length - 1];
      if (arrFrame.type !== "array") {
        // Shouldn’t happen, but guard anyway
        continue;
      }

      if (itemStr.includes(": ")) {
        // "- key: value" (object item possibly followed by nested props)
        const [k, v] = itemStr.split(/:\s+/, 2);
        const obj: Record<string, any> = {};
        obj[k] = parseScalar(v);
        arrFrame.value.push(obj);
        // Prepare to accept nested props for this object at deeper indent
        stack.push({ type: "object", value: obj });
        indents.push(indent + 2);
        lastKey = k; // track last key within this new object
      } else {
        // "- scalar"
        arrFrame.value.push(parseScalar(itemStr));
        lastKey = null;
      }
      continue;
    }

    // KEY line: "key:" or "key: value"
    const kv = trimmed.split(/:\s*/, 2);
    const key = kv[0];

    if (kv.length === 1 || kv[1] === "") {
      // "key:" -> start a nested object
      if (top.type !== "object") {
        // If we’re inside an array and get "key:", push an object into the array first
        const obj: Record<string, any> = {};
        (top.value as any[]).push(obj);
        // Switch context to that new object
        stack.push({ type: "object", value: obj });
        indents.push(indent);
      }
      const objTop = stack[stack.length - 1] as { type: "object"; value: Record<string, any> };
      objTop.value[key] = {};
      // descend into this key's object
      stack.push({ type: "object", value: objTop.value[key] });
      indents.push(indent + 2);
      lastKey = key;
    } else {
      // "key: value"
      const value = parseScalar(kv[1]);
      if (top.type === "object") {
        top.value[key] = value;
      } else {
        // We’re inside an array; push an object with this key/value
        const obj: Record<string, any> = {};
        obj[key] = value;
        top.value.push(obj);
        // Don’t descend; single-line kv in an array stays flat unless more indented lines follow
      }
      lastKey = key;
    }
  }

  return root;
}

function parseScalar(v: string) {
  const s = v.trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
  if (s === "null") return null;
  if (s === "true") return true;
  if (s === "false") return false;
  if (/^-?\d+$/.test(s)) return Number(s);
  if (/^-?\d+\.\d+$/.test(s)) return Number(s);
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
