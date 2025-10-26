"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import feedData from "../../fixtures/feed.json" assert { type: "json" };
import boardData from "../../fixtures/leaderboard.json" assert { type: "json" };

type FeedItem = {
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

type Row = {
  school: string;
  parent?: string;
  address?: string;
  latestDate: string;
  latestScore: number;
  avg12mo: number;
  criticalsYTD: number;
};

function normalizeUrl(u: string) {
  if (!u) return "#";
  const s = u.trim();
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("//")) return "https:" + s;
  return "https://" + s.replace(/^\/+/, "");
}

function Chip({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs border ${className}`}>
      {children}
    </span>
  );
}

function FeedCard({
  item,
  onVerify,
}: {
  item: FeedItem;
  onVerify: (it: FeedItem) => void;
}) {
  const parent =
    typeof item.parent === "string" && item.parent.trim() ? item.parent : "";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold leading-tight text-black">
            {item.school}
          </h3>
          {parent && <div className="text-xs text-gray-500">{parent}</div>}
          {item.address && (
            <div className="text-sm text-gray-500">{item.address}</div>
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold leading-none text-emerald-600">
            {item.score}
          </div>
          <div className="text-xs text-gray-500">score</div>
        </div>
      </div>

      {item.criticals && item.criticals.length > 0 && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
          <div className="font-medium mb-1">Latest criticals</div>
          <ul className="list-disc pl-5 space-y-0.5">
            {item.criticals.map((c, i) => (
              <li key={i}>
                <span className="font-mono">{c.code}</span> · {c.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{item.date}</span>
        <div className="flex items-center gap-2">
          <Chip className="border-red-600 text-red-600">
            {item.critical_count} critical
          </Chip>
          <button
            onClick={() => onVerify(item)}
            className="underline text-black hover:text-gray-700"
          >
            Verify
          </button>
        </div>
      </div>

      <div className="pt-2 border-t text-sm">
        <a
            className="underline text-black hover:text-gray-700"
            href={normalizeUrl(item.source_url)}
            target="_blank"
            rel="noopener noreferrer"
          >
            County portal (PressAgent)
        </a>
      </div>
    </div>
  );
}

function VerifyModal({
  item,
  onClose,
}: {
  item: FeedItem | null;
  onClose: () => void;
}) {
  if (!item) return null;
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
            <span>Date</span>
            <span className="col-span-2">{item.date}</span>
            <span>Score</span>
            <span className="col-span-2">{item.score}</span>
            <span>Criticals</span>
            <span className="col-span-2">{item.critical_count}</span>
          </div>

          {item.criticals && item.criticals.length > 0 && (
            <>
              <div className="h-px bg-gray-200" />
              <div>
                <div className="font-semibold mb-1">Critical items</div>
                <ul className="list-disc pl-5 space-y-0.5">
                  {item.criticals.map((c, i) => (
                    <li key={i}>
                      <span className="font-mono">{c.code}</span> · {c.title}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          <div className="h-px bg-gray-200" />
          <div className="grid grid-cols-3 gap-2">
            <span>Source</span>
            <span className="col-span-2 break-all">
              <a
                href={normalizeUrl(item.source_url)}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-black hover:text-gray-700"
              >
                County portal (PressAgent)
              </a>
            </span>
            {item.receipt_cid && (
              <>
                <span>Receipt CID</span>
                <span className="col-span-2 font-mono text-xs">
                  {item.receipt_cid}
                </span>
              </>
            )}
          </div>
          <p className="text-xs text-gray-600">
            Normalized snapshot from public records. Receipts are
            Markdown+YAML so anyone can audit.
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

function Feed({ data }: { data: FeedItem[] }) {
  const [query, setQuery] = useState("");
  const [verify, setVerify] = useState<FeedItem | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const f = q
      ? data.filter(
          (d) =>
            d.school.toLowerCase().includes(q) ||
            (typeof d.parent === "string" &&
              d.parent.toLowerCase().includes(q))
        )
      : data;
    return [...f].sort((a, b) => (a.date < b.date ? 1 : -1));
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
        {list.map((it) => (
          <FeedCard key={it.id} item={it} onVerify={setVerify} />
        ))}
      </div>
      <VerifyModal item={verify} onClose={() => setVerify(null)} />
    </div>
  );
}

function Leaderboard({ rows }: { rows: Row[] }) {
  const [sort, setSort] =
    useState<"latest" | "avg" | "criticals">("latest");
  const sorted = useMemo(() => {
    const c = [...rows];
    if (sort === "latest") c.sort((a, b) => b.latestScore - a.latestScore);
    if (sort === "avg") c.sort((a, b) => b.avg12mo - a.avg12mo);
    if (sort === "criticals")
      c.sort((a, b) => a.criticalsYTD - b.criticalsYTD);
    return c;
  }, [rows, sort]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-black/60">SORT BY</span>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as any)}
          className="rounded-lg border border-white/30 bg-white/20 text-black/90 text-sm px-3 py-1.5"
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
                <td className="px-3 py-2 font-semibold text-gray-700">
                  <div>{r.school}</div>
                  {typeof r.parent === "string" && r.parent && (
                    <div className="text-xs text-gray-500">{r.parent}</div>
                  )}
                  {r.address && (
                    <div className="text-xs text-gray-500">{r.address}</div>
                  )}
                </td>
                <td className="px-3 py-2 font-semibold text-emerald-600">
                  {r.latestScore}
                </td>
                <td className="px-3 py-2 text-emerald-600">
                  {r.avg12mo.toFixed(1)}
                </td>
                <td className="px-3 py-2 font-semibold text-red-600">
                  {r.criticalsYTD}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** simple, client-only chat demo (no API) */
function ChatDemo() {
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([
    {
      role: "assistant",
      text:
        "Hi! Ask about a school’s latest inspection, critical items, or average score. (This is a static demo.)",
    },
  ]);
  const inputRef = useRef<HTMLInputElement>(null);

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: "user", text }]);
    // fake reply
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text:
            "If this were live, I’d pull from your receipts and the county portal, then cite the exact source.",
        },
      ]);
    }, 300);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {[
          "Show Clayton’s latest criticals",
          "Compare Ladue vs Kirkwood this year",
          "Map nearby schools with 95+",
          "Explain the 'critical' label",
        ].map((p) => (
          <button
            key={p}
            onClick={() => send(p)}
            className="px-3 py-1.5 rounded-full bg-#4c97d8 border hover:bg-gray-900" 
          >
            {p}
          </button>
        ))}
      </div>
      <div className="rounded-2xl bg-white/90 border p-3 h-[320px] overflow-y-auto">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`my-1 ${
              m.role === "user" ? "text-right" : "text-left"
            }`}
          >
            <span
              className={`inline-block px-3 py-1.5 rounded-xl ${
                m.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              {m.text}
            </span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          placeholder="Ask something…"
          className="flex-1 rounded-xl border px-3 py-2 bg-white/90"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              send((e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).value = "";
            }
          }}
        />
        <button
          onClick={() => {
            const v = inputRef.current?.value ?? "";
            send(v);
            if (inputRef.current) inputRef.current.value = "";
          }}
          className="px-4 py-2 rounded-xl bg-black text-white"
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default function Page() {
  const [tab, setTab] =
    useState<"feed" | "leaderboard" | "chat">("feed");

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-6 space-y-6">
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
              Public school inspections as verifiable receipts. Ask
              questions, check the proof.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href="https://stlouiscountymo.gov/st-louis-county-departments/public-health/food-and-restaurants/inspections/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 bg-white/70"
          >
            County Portal
          </a>
        </div>
      </header>

      <div className="flex gap-2 mb-2">
        {(["feed", "leaderboard", "chat"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-xl text-sm border ${
              tab === t
                ? "bg-white text-black border-white"
                : "bg-black text-white border-white/40"
            }`}
          >
            {t === "feed" ? "Feed" : t === "leaderboard" ? "Leaderboard" : "Chat"}
          </button>
        ))}
      </div>

      <footer className="mt-6 text-center text-sm text-gray-500">
    <a
      href="https://github.com/ericyarmo/stl-food-agent"
      target="_blank"
      rel="noreferrer"
      className="underline hover:text-gray-700"
    >
      github.com/ericyarmo/stl-food-agent
    </a>
  </footer>

      <div className="mt-2 p-3 rounded-md bg-white/60 shadow-sm text-sm text-gray-800">
        <p className="font-semibold text-gray-900 mb-1">
          Understanding Inspection Scores
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
      </div>

      {tab === "feed" ? (
        <Feed data={feedData as FeedItem[]} />
      ) : tab === "leaderboard" ? (
        <Leaderboard rows={boardData as Row[]} />
      ) : (
        <ChatDemo />
      )}

      <footer className="pt-8 text-xs text-gray-600">
        Built in under 12 hours · MIT License · Data from St. Louis County DPH
      </footer>
    </main>
  );
}
