// scripts/receipts_to_json.ts
import fs from "node:fs";
import path from "node:path";

/** Walk a directory and yield file paths */
function* walk(dir: string): Generator<string> {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

/** Extract the first front-matter block between --- ... --- */
function readFrontMatter(md: string): string | null {
  const m = md.match(/^---\n([\s\S]*?)\n---\n?/);
  return m ? m[1] : null;
}

/** Very small YAML-lite parser for our receipts’ front-matter */
function yamlLiteToObject(y: string): any {
  const root: any = {};
  const stack: any[] = [root];
  const indents: number[] = [0];

  const lines = y.split(/\r?\n/);
  let lastKey: string | null = null;

  for (let raw of lines) {
    if (!raw.trim()) continue;
    const indent = raw.match(/^ */)![0].length;
    const line = raw.trim();

    // unwind indentation
    while (indent < indents[indents.length - 1]) {
      indents.pop();
      stack.pop();
    }
    const cur = stack[stack.length - 1];

    // list item
    if (line.startsWith("- ")) {
      const content = line.slice(2);
      if (!Array.isArray(cur)) {
        // current container should be an object with lastKey -> array
        if (lastKey && !Array.isArray(cur[lastKey])) cur[lastKey] = [];
        stack.push(cur[lastKey]);
        indents.push(indent);
      }
      const arr = stack[stack.length - 1] as any[];

      if (content.includes(": ")) {
        // "- key: value" starts an object
        const [k, v] = content.split(/:\s+/, 2);
        const obj: any = {};
        obj[k] = parseScalar(v);
        arr.push(obj);
        // next deeper lines (greater indent) will belong to this object
        stack.push(obj);
        indents.push(indent + 2);
      } else {
        arr.push(parseScalar(content));
      }
      continue;
    }

    // key: value  OR  key:
    const kv = line.split(/:\s*/, 2);
    const key = kv[0];
    lastKey = key;

    if (kv.length === 1 || kv[1] === "") {
      // start nested object
      cur[key] = {};
      stack.push(cur[key]);
      indents.push(indent + 2);
    } else {
      cur[key] = parseScalar(kv[1]);
    }
  }
  return root;
}

function parseScalar(v: string) {
  if (v === "null" || v === "") return null;
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^\d+$/.test(v)) return Number(v);
  if (/^\d+\.\d+$/.test(v)) return Number(v);
  return v;
}

const root = path.join(process.cwd(), "fixtures", "receipts");
if (!fs.existsSync(root)) {
  console.error("No receipts folder at fixtures/receipts");
  process.exit(1);
}

let wrote = 0;
for (const file of walk(root)) {
  if (!file.endsWith(".md")) continue;

  const md = fs.readFileSync(file, "utf8");
  const fm = readFrontMatter(md);
  if (!fm) {
    console.warn("No front-matter in", file);
    continue;
  }
  const obj = yamlLiteToObject(fm);

  const out = file.replace(/\.md$/i, ".json");
  fs.writeFileSync(out, JSON.stringify(obj, null, 2));
  wrote++;
}

if (wrote === 0) {
  console.warn("⚠️  Found no .md receipts to convert.");
} else {
  console.log(`✅ Wrote ${wrote} JSON files next to Markdown receipts.`);
}
