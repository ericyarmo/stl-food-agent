// scripts/build_feed.ts
import fs from "node:fs";
import path from "node:path";
import { loadAllReceipts, safeWriteJSON } from "./_receipts_io.ts";

type Out = {
  id: string;
  school: string;
  parent?: string;
  address?: string;
  date: string;
  score: number;
  critical_count: number;
  noncritical_count: number;
  source_url: string;
  receipt_cid?: string;
  criticals?: { code: string; title: string }[];
};

function asArray<T = any>(x: unknown): T[] {
  if (Array.isArray(x)) return x;
  if (x && typeof x === "object") return Object.values(x as Record<string, T>);
  return [];
}

function toStr(x: unknown): string | undefined {
  return typeof x === "string" && x.trim() ? x.trim() : undefined;
}

function normUrl(u: unknown): string {
  const s = String(u ?? "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  return "https://" + s.replace(/^\/+/, "");
}

const receipts = loadAllReceipts();

const feed: Out[] = receipts
  .filter((r) => r?.inspection?.date && r?.entity?.name)
  .map((r) => {
    const list = asArray(r.inspection?.violations);
    const criticals = list
      .filter((v: any) => v && (v.critical === true || String(v.critical) === "true"))
      .map((v: any) => ({
        code: toStr(v?.code) ?? "",
        title: toStr(v?.title) ?? "",
      }))
      .filter((v) => v.code || v.title)
      .slice(0, 4);

    return {
      id: String(r.inspection.id),
      school: String(r.entity.name),
      parent: toStr((r as any).entity?.parent),
      address: toStr(r.entity.address) ?? "",
      date: String(r.inspection.date),
      score: Number(r.inspection.score ?? 0),
      critical_count: Number(r.inspection.critical_violations ?? 0),
      noncritical_count: Number(r.inspection.noncritical_violations ?? 0),
      source_url: normUrl(r.source?.url),
      receipt_cid: toStr(r.proof?.cid),
      criticals: criticals.length ? criticals : undefined,
    };
  })
  .sort((a, b) => (a.date < b.date ? 1 : -1))
  .slice(0, 30);

const outPath = path.join(process.cwd(), "fixtures", "feed.json");
safeWriteJSON(outPath, feed, "feed items");
