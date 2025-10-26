"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

// Static imports keep this serverless and fast
import feed from "../../fixtures/feed.json" assert { type: "json" };
import leaderboard from "../../fixtures/leaderboard.json" assert { type: "json" };

type FeedItem = {
  id: string;
  school: string;
  address?: string;
  date: string; // YYYY-MM-DD
  score: number; // 0..100
  critical_count: number;
  noncritical_count?: number;
  source_url: string;
  receipt_cid?: string;
};

type LeaderRow = {
  school: string;
  address?: string;
  latestDate: string;
  latestScore: number;
  avg12mo: number;
  criticalsYTD: number;
};

function Tabs({
  value,
  onChange,
}: {
  value: "feed" | "leaderboard";
  onChange: (v: any) => void;
}) {
  return (
    <div className="flex gap-2 mb-4">
      {(["feed", "leaderboard"] as const).map((key) => {
        const isActive = value === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`px-3 py-1.5 rounded-xl text-sm border transition ${
              isActive
                ? "bg-white text-black border-white shadow-sm"
                : "bg-black text-white border-white/40 hover:border-white"
            }`}
          >
            {key === "feed" ? "Feed" : "Leaderboard"}
          </button>
        );
      })}
    </div>
  );
}

function VerifyModal({
  open,
  onClose,
  item,
}: {
  open: boolean;
  onClose: () => void;
  item: FeedItem | null;
}) {
  if (!open || !item) return null;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold text-black">Verify receipt</h3>
          <p className="text-sm text-black">{item.school}</p>
        </div>
        <div className="p-4 space-y-3 text-sm text-black">
          <div className="grid grid-cols-3 gap-2">
            <span className="text-black">Date</span>
            <span className="col-span-2 text-black">{item.date}</span>
            <span className="text-black">Score</span>
            <span className="col-span-2 text-black">{item.score}</span>
            <span className="text-black">Criticals</span>
            <span className="col-span-2 text-black">{item.critical_count}</span>
          </div>
          <div className="h-px bg-gray-200" />
          <div className="grid grid-cols-3 gap-2">
            <span className="text-black">Source</span>
            <span className="col-span-2 break-all">
              <a
                href={item.source_url}
                target="_blank"
                className="underline text-black hover:text-gray-700"
              >
                PressAgent facility page
              </a>
            </span>
            {item.receipt_cid && (
              <>
                <span className="text-black">Receipt CID</span>
                <span className="col-span-2 font-mono text-xs text-black">
                  {item.receipt_cid}
                </span>
              </>
            )}
          </div>
          <p className="text-xs text-black">
            Normalized snapshot from public records. Receipts are Markdown+YAML
            so anyone can audit.
          </p>
        </div>
        <div className="p-4 flex justify-end gap-2 border-t">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border text-black hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function FeedCard({
  item,
  onVerify,
}: {
  item: FeedItem;
  onVerify: (it: FeedItem) => void;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          {/* School name bold & black */}
          <h3 className="font-semibold leading-tight text-black">
            {item.school}
          </h3>
          {item.address && (
            <p className="text-sm text-gray-500">{item.address}</p>
          )}
        </div>
        <div className="text-right">
          {/* Score green */}
          <div className="text-2xl font-bold leading-none text-emerald-600">
            {item.score}
          </div>
          <div className="text-xs text-gray-500">score</div>
        </div>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{item.date}</span>
        <div className="flex items-center gap-2">
          {/* Critical count in red */}
          <span className="rounded-full border border-red-600 text-red-600 px-2 py-0.5 text-xs">
            {item.critical_count} critical
          </span>
          {/* Verify in black */}
          <button
            onClick={() => onVerify(item)}
            className="text-sm text-black underline underline-offset-2 hover:text-gray-700"
          >
            Verify
          </button>
        </div>
      </div>
      {/* View source in black */}
      <div className="pt-2 border-t text-sm">
        <a
          className="underline text-black hover:text-gray-700"
          href={item.source_url}
          target="_blank"
        >
          View source
        </a>
      </div>
    </div>
  );
}

function FeedView({ data }: { data: FeedItem[] }) {
  const [query, setQuery] = useState("");
  const [verifyItem, setVerifyItem] = useState<FeedItem | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? data.filter((d) => d.school.toLowerCase().includes(q))
      : data;
    return [...filtered].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [data, query]);

  return (
    <div className="space-y-4">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search schools…"
        className="w-full rounded-xl border-2 border-white/70 bg-white/80 backdrop-blur-sm text-gray-900 placeholder-gray-500 px-4 py-2 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map((item) => (
          <FeedCard key={item.id} item={item} onVerify={setVerifyItem} />
        ))}
      </div>
      <VerifyModal
        open={!!verifyItem}
        onClose={() => setVerifyItem(null)}
        item={verifyItem}
      />
    </div>
  );
}

function LeaderboardView({ rows }: { rows: LeaderRow[] }) {
  const [sort, setSort] = useState<"latest" | "avg" | "criticals">("latest");
  const sorted = useMemo(() => {
    const copy = [...rows];
    if (sort === "latest") copy.sort((a, b) => b.latestScore - a.latestScore);
    if (sort === "avg") copy.sort((a, b) => b.avg12mo - a.avg12mo);
    if (sort === "criticals") copy.sort((a, b) => a.criticalsYTD - b.criticalsYTD);
    return copy;
  }, [rows, sort]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-black/60">SORT BY</span>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as any)}
          className="rounded-lg border border-white/30 bg-white/20 text-black/90 text-sm px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-white/40 hover:bg-white/25 transition"
        >
          <option value="latest">Latest Score</option>
          <option value="avg">Avg Last 12 Mo</option>
          <option value="criticals">Criticals YTD</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left text-xs uppercase text-gray-500">
              <th className="px-3">School</th>
              <th className="px-3">Latest</th>
              <th className="px-3">Avg 12 mo</th>
              <th className="px-3">Criticals YTD</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.school} className="bg-white rounded-xl shadow-sm">
                <td className="px-3 py-2 font-semibold text-gray-600">
                  <div className="font-medium">{r.school}</div>
                  {r.address && (
                    <div className="text-xs text-gray-500">{r.address}</div>
                  )}
                </td>
                <td className="px-3 py-2 font-semibold text-emerald-600">{r.latestScore}</td>
                <td className="px-3 py-2 text-emerald-600">{r.avg12mo.toFixed(1)}</td>
                <td className="px-3 py-2 font-semibold text-red-600">{r.criticalsYTD}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Page() {
  const [tab, setTab] = useState<"feed" | "leaderboard">("feed");
  return (
    <main className="mx-auto max-w-6xl p-4 md:p-6 space-y-6">
      {/* Header with logo inline */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Image
            src="/ChaingeLogo.png"
            alt="Chainge Logo"
            width={48}
            height={48}
            priority
            className="rounded-md"
          />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              STL Food Agent
            </h1>
            <p className="max-w-prose text-white/80">
              Public school inspections as verifiable receipts. Ask questions,
              check the proof.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href="https://pressagent.envisionconnect.com/"
            target="_blank"
            className="px-3 py-1.5 rounded-xl border hover:bg-gray-50"
          >
            County Portal
          </a>
        </div>
      </header>

      <Tabs value={tab} onChange={setTab} />

      {/* ⬇️ Add this block right here ⬇️ */}
      <div className="mt-2 p-3 rounded-md bg-white/60 shadow-sm text-sm text-gray-800">
        <p className="font-semibold text-gray-900 mb-1">Understanding Inspection Scores</p>
        <p className="mb-2 text-gray-700">
          St. Louis County assigns food inspection grades based on sanitation and safety standards.
          Scores translate into letter grades as follows:
        </p>
        <div className="flex flex-wrap gap-3 items-center">
          <span className="px-2 py-1 rounded bg-green-200 text-green-800 font-medium">
            A · 90–100 · Excellent
          </span>
          <span className="px-2 py-1 rounded bg-yellow-200 text-yellow-800 font-medium">
            B · 80–89 · Satisfactory
          </span>
          <span className="px-2 py-1 rounded bg-red-200 text-red-800 font-medium">
            C · Below 80 · Requires Correction
          </span>
        </div>
        <p className="mt-2 text-gray-700">
          Inspections are unannounced and focus on food handling, temperature control,
          sanitation, and pest management.
        </p>
      </div>
      {/* ⬆️ End of score key block ⬆️ */}

      {tab === "feed" ? (
        <FeedView data={feed as FeedItem[]} />
      ) : (
        <LeaderboardView rows={leaderboard as LeaderRow[]} />
      )}

      <footer className="pt-8 text-xs text-gray-500">
        Built in under 12 hours · MIT License · Data from St. Louis County DPH
      </footer>
    </main>
  );
}