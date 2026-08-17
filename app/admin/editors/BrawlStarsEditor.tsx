// app/admin/editors/BrawlStarsEditor.tsx
// Read-only viewer for the Supercell-synced brawler roster (owned + locked
// — see app/api/brawlstars/sync/route.ts for both the player-scoped owned
// sync and the master roster sync), plus the "Sync now" button. No manual
// editing — this data only ever comes from your account (or the static
// roster for locked entries).
"use client";

import { useEffect, useState } from "react";
import { gql } from "./gql";

type BrawlStarsRosterItem = {
  id: number;
  name: string;
  iconUrl: string;
  owned: boolean;
  power: number | null;
  trophies: number | null;
};

type SyncResult =
  | { ok: true; synced: number; total: number }
  | { ok: false; error: string; message: string };

export default function BrawlStarsEditor() {
  const [brawlers, setBrawlers] = useState<BrawlStarsRosterItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [query, setQuery] = useState("");
  const [ownFilter, setOwnFilter] = useState<"all" | "owned" | "missing">("all");

  function load() {
    gql(`{ brawlStarsRoster { id name iconUrl owned power trophies } }`)
      .then((d) => setBrawlers(d.brawlStarsRoster))
      .catch((e) => setError(String(e.message ?? e)));
  }

  useEffect(load, []);

  async function sync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/brawlstars/sync", { method: "POST" });
      const json = await res.json();
      setSyncResult(json);
      if (json.ok) load();
    } catch (e) {
      setSyncResult({ ok: false, error: "network", message: String(e) });
    } finally {
      setSyncing(false);
    }
  }

  if (error)
    return <p className="text-sm text-[var(--accent-2)]">Couldn&apos;t load: {error}</p>;
  if (!brawlers) return <p className="text-sm text-[var(--muted)]">Loading…</p>;

  const ownedCount = brawlers.filter((b) => b.owned).length;
  const filtered = brawlers
    .filter((b) => {
      if (ownFilter === "owned") return b.owned;
      if (ownFilter === "missing") return !b.owned;
      return true;
    })
    .filter((b) => b.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={sync}
          disabled={syncing}
          className="rounded-lg px-4 py-2 text-sm font-bold text-[#0c0a1e] transition disabled:opacity-50"
          style={{ background: "var(--accent)" }}
        >
          {syncing ? "Syncing…" : "Sync now"}
        </button>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search brawlers…"
          className="ml-auto w-full max-w-xs rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
        />
        <span className="text-xs text-[var(--muted)]">
          {ownedCount}/{brawlers.length} owned
        </span>
      </div>

      <div className="inline-flex w-fit rounded-full border border-[var(--line)] bg-[var(--panel-2)] p-0.5 text-[11px] font-semibold">
        {(
          [
            ["all", "All"],
            ["owned", "Owned"],
            ["missing", "Missing"],
          ] as [typeof ownFilter, string][]
        ).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setOwnFilter(v)}
            className="rounded-full px-2.5 py-1 transition"
            style={{
              background: ownFilter === v ? "var(--accent)" : "transparent",
              color: ownFilter === v ? "#0c0a1e" : "var(--muted)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {syncResult && !syncResult.ok && (
        <div
          className="rounded-lg border px-3 py-2 text-xs"
          style={{
            borderColor: syncResult.error === "auth" ? "var(--accent-2)" : "var(--line)",
            color: syncResult.error === "auth" ? "var(--accent-2)" : "var(--muted)",
          }}
        >
          {syncResult.error === "auth"
            ? "⚠ API key rejected — check BRAWL_STARS_API_KEY and that the proxy IP (45.79.218.79) is whitelisted."
            : `Sync failed: ${syncResult.message}`}
        </div>
      )}
      {syncResult && syncResult.ok && (
        <div className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs text-[var(--muted)]">
          Synced {syncResult.synced}/{syncResult.total} brawlers.
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {filtered.map((b) => (
          <div
            key={b.id}
            className="flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center"
            style={{ borderColor: "var(--line)", background: "var(--panel-2)" }}
          >
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b.iconUrl}
                alt={b.name}
                className="h-16 w-16 rounded-full object-cover"
                style={{ filter: b.owned ? undefined : "grayscale(1) brightness(0.5)" }}
                loading="lazy"
              />
              {!b.owned && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    className="opacity-90 drop-shadow"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
              )}
            </div>
            <span className="truncate text-xs font-bold capitalize text-[var(--text)]">
              {b.name.toLowerCase()}
            </span>
            <span className="text-[10px] text-[var(--muted)]">
              {b.owned ? `P${b.power} · 🏆${b.trophies}` : "Locked"}
            </span>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-[var(--muted)]">
            No brawlers match &quot;{query}&quot;.
          </p>
        )}
      </div>
    </div>
  );
}
