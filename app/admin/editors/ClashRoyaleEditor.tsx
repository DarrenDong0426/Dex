// app/admin/editors/ClashRoyaleEditor.tsx
// Read-only viewer for the Supercell-synced card roster, plus the "Sync now"
// button that triggers app/api/clashroyale/sync/route.ts. No manual editing
// — this data only ever comes from your account.
//
// NOTE: no owned/locked distinction here (unlike Genshin/Brawl Stars) — the
// API's `count` field is spare unused copies, not an ownership flag, so a
// maxed card commonly sits at count=0 (nothing left to upgrade into) and is
// indistinguishable from a genuinely never-found card. There's no reliable
// signal in this API to tell the two apart, so every card is just shown
// plainly with whatever level/count it reports.
"use client";

import { useEffect, useState } from "react";
import { gql } from "./gql";

type ClashRoyaleCard = {
  id: number;
  name: string;
  iconUrl: string;
  level: number;
  maxLevel: number;
  rarity: string;
  count: number;
  isSupport: boolean;
  updatedAt: string;
};

const RARITY_COLOR: Record<string, string> = {
  common: "#9aa0b0",
  rare: "#f4a13a",
  epic: "#c46ef0",
  legendary: "#f2d24a",
  champion: "#ff7043",
};

type SyncResult =
  | { ok: true; synced: number; total: number }
  | { ok: false; error: string; message: string };

export default function ClashRoyaleEditor() {
  const [cards, setCards] = useState<ClashRoyaleCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [query, setQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState<string | "all">("all");

  function load() {
    gql(
      `{ clashRoyaleCards {
        id name iconUrl level maxLevel rarity count isSupport updatedAt
      } }`,
    )
      .then((d) => setCards(d.clashRoyaleCards))
      .catch((e) => setError(String(e.message ?? e)));
  }

  useEffect(load, []);

  async function sync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/clashroyale/sync", { method: "POST" });
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
  if (!cards) return <p className="text-sm text-[var(--muted)]">Loading…</p>;

  const rarities = Array.from(new Set(cards.map((c) => c.rarity)));
  const filtered = cards
    .filter((c) => rarityFilter === "all" || c.rarity === rarityFilter)
    .filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()));
  const lastSynced = cards.length
    ? new Date(Math.max(...cards.map((c) => Number(c.updatedAt))))
    : null;

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
        {lastSynced && (
          <span className="text-xs text-[var(--muted)]">
            Last synced: {lastSynced.toLocaleString()}
          </span>
        )}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search cards…"
          className="ml-auto w-full max-w-xs rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setRarityFilter("all")}
          className="rounded-full border px-3 py-1.5 text-[12px] font-bold transition"
          style={{
            background: rarityFilter === "all" ? "var(--accent)" : "var(--panel-2)",
            color: rarityFilter === "all" ? "#0c0a1e" : "var(--muted)",
            borderColor: rarityFilter === "all" ? "var(--accent)" : "var(--line)",
          }}
        >
          All
        </button>
        {rarities.map((r) => {
          const on = rarityFilter === r;
          const c = RARITY_COLOR[r] ?? "var(--accent)";
          return (
            <button
              key={r}
              onClick={() => setRarityFilter(r)}
              className="rounded-full border px-3 py-1.5 text-[12px] font-bold capitalize transition"
              style={{
                background: on ? c : "var(--panel-2)",
                color: on ? "#0c0a1e" : "var(--muted)",
                borderColor: on ? c : "var(--line)",
              }}
            >
              {r}
            </button>
          );
        })}
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
            ? "⚠ API key rejected — check CLASH_ROYALE_API_KEY and that the proxy IP (45.79.218.79) is whitelisted."
            : `Sync failed: ${syncResult.message}`}
        </div>
      )}
      {syncResult && syncResult.ok && (
        <div className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs text-[var(--muted)]">
          Synced {syncResult.synced}/{syncResult.total} cards.
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {filtered.map((c) => {
          const color = RARITY_COLOR[c.rarity] ?? "var(--line)";
          return (
            <div
              key={c.id}
              className="flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center"
              style={{ borderColor: color, background: "var(--panel-2)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.iconUrl}
                alt={c.name}
                className="h-16 w-16 object-contain"
                loading="lazy"
              />
              <span className="truncate text-xs font-bold text-[var(--text)]">{c.name}</span>
              <span className="text-[10px] text-[var(--muted)]">
                {c.isSupport ? "Tower Troop" : `Lv${c.level}/${c.maxLevel}`} · x{c.count}
              </span>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-[var(--muted)]">
            No cards match this filter.
          </p>
        )}
      </div>
    </div>
  );
}
