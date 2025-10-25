"use client";

import { useMemo, useState } from "react";

// Static imports keep this serverless and fast
import feed from "../../fixtures/feed.json" assert { type: "json" };
import leaderboard from "../../fixtures/leaderboard.json" assert { type: "json" };

type FeedItem = {
  id: string;
  school: string;
  address?: string;
  date: string;         // YYYY-MM-DD
  score: number;        // 0..100
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

function Tabs({ value, onChange }: { value: "feed"|"leaderboard"; onChange:(v:any)=>void }) {
  return (
    <div className="flex gap-2 mb-4">
      {(["feed","leaderboard"] as const).map(key => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-3 py-1.5 rounded-xl text-sm border transition ${
            value===key ? "bg-black text-white border-black" : "bg-white text-black border-gray-300 hover:border-black"
          }`}
        >
          {key === "feed" ? "Feed" : "Leaderboard"}
        </button>
      ))}
    </div>
  );
}

function VerifyModal({ open, onClose, item }: { open: boolean; onClose:()=>void; item: FeedItem | null }) {
  if (!open || !item) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-gray-200" onClick={e=>e.stopPropagation()}>
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Verify receipt</h3>
          <p className="text-sm text-gray-500">{item.school}</p>
        </div>
        <div className="p-4 space-y-3 text-sm">
          <div className="grid grid-cols-3 gap-2">
            <span className="text-gray-500">Date</span><span className="col-span-2">{item.date}</span>
            <span className="text-gray-500">Score</span><span className="col-span-2">{item.score}</span>
            <span className="text-gray-500">Criticals</span><span className="col-span-2">{item.critical_count}</span>
          </div>
          <div className="h-px bg-gray-200" />
          <div className="grid grid-cols-3 gap-2">
            <span className="text-gray-500">Source</span>
            <span className="col-span-2 break-all">
              <a href={item.source_url} target="_blank" className="underline">PressAgent facility page</a>
            </span>
            {item.receipt_cid && (
              <>
                <span className="text-gray-500">Receipt CID</span>
                <span className="col-span-2 font-mono text-xs">{item.receipt_cid}</span>
              </>
            )}
          </div>
          <p className="text-gray-500 text-xs">
            Normalized snapshot from public records. Receipts are Markdown+YAML so anyone can audit.
          </p>
        </div>
        <div className="p-4 flex justify-end gap-2 border-t">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg border">Close</button>
        </div>
      </div>
    </div>
  );
}

function FeedCard({ item, onVerify }: { item: FeedItem; onVerify:(it:FeedItem)=>void }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold leading-tight">{item.school}</h3>
          {item.address && <p className="text-sm text-gray-500">{item.address}</p>}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold leading-none">{item.score}</div>
          <div className="text-xs text-gray-500">score</div>
        </div>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{item.date}</span>
        <div className="flex items-center gap-2">
          <span className="rounded-full border px-2 py-0.5 text-xs">{item.critical_count} critical</span>
          <button onClick={()=>onVerify(item)} className="text-sm underline underline-offset-2">Verify</button>
        </div>
      </div>
      <div className="pt-2 border-t text-sm">
        <a className="underline" href={item.source_url} target="_blank">View source</a>
      </div>
    </div>
  );
}

function FeedView({ data }: { data: FeedItem[] }) {
  const [query, setQuery] = useState("");
  const [verifyItem, setVerifyItem] = useState<FeedItem|null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? data.filter(d => d.school.toLowerCase().includes(q)) : data;
    return [...filtered].sort((a,b)=> (a.date < b.date ? 1 : -1));
  }, [data, query]);

  return (
    <div className="space-y-4">
      <input
        value={query}
        onChange={(e)=>setQuery(e.target.value)}
        placeholder="Search schools…"
        className="w-full rounded-xl border px-3 py-2"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map(item => <FeedCard key={item.id} item={item} onVerify={setVerifyItem} />)}
      </div>
      <VerifyModal open={!!verifyItem} onClose={()=>setVerifyItem(null)} item={verifyItem} />
    </div>
  );
}

function LeaderboardView({ rows }: { rows: LeaderRow[] }) {
  const [sort, setSort] = useState<"latest"|"avg"|"criticals">("latest");
  const sorted = useMemo(()=>{
    const copy = [...rows];
    if (sort==="latest") copy.sort((a,b)=> b.latestScore - a.latestScore);
    if (sort==="avg") copy.sort((a,b)=> b.avg12mo - a.avg12mo);
    if (sort==="criticals") copy.sort((a,b)=> a.criticalsYTD - b.criticalsYTD);
    return copy;
  }, [rows, sort]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Sort by</span>
        <select value={sort} onChange={e=>setSort(e.target.value as any)} className="rounded-lg border px-2 py-1 text-sm">
          <option value="latest">Latest score</option>
          <option value="avg">Avg last 12 mo</option>
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
            {sorted.map(r=>(
              <tr key={r.school} className="bg-white rounded-xl shadow-sm">
                <td className="px-3 py-2">
                  <div className="font-medium">{r.school}</div>
                  {r.address && <div className="text-xs text-gray-500">{r.address}</div>}
                </td>
                <td className="px-3 py-2 font-semibold">{r.latestScore}</td>
                <td className="px-3 py-2">{r.avg12mo.toFixed(1)}</td>
                <td className="px-3 py-2">{r.criticalsYTD}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Page() {
  const [tab, setTab] = useState<"feed"|"leaderboard">("feed");
  return (
    <main className="mx-auto max-w-6xl p-4 md:p-6 space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">STL Food Agent</h1>
          <p className="text-gray-600 max-w-prose">Public school inspections as verifiable receipts. Ask questions, check the proof.</p>
        </div>
        <div className="flex gap-2">
          <a href="https://pressagent.envisionconnect.com/" target="_blank" className="px-3 py-1.5 rounded-xl border hover:bg-gray-50">County Portal</a>
        </div>
      </header>

      <Tabs value={tab} onChange={setTab} />
      {tab === "feed" ? <FeedView data={feed as FeedItem[]} /> : <LeaderboardView rows={leaderboard as LeaderRow[]} />}

      <footer className="pt-8 text-xs text-gray-500">Built in under 12 hours · MIT License · Data from St. Louis County DPH</footer>
    </main>
  );
}
