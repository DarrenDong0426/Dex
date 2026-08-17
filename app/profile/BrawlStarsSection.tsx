// app/profile/BrawlStarsSection.tsx
// Read-only browse of the Supercell-synced brawler roster (owned + locked)
// + overall account stats (see app/admin/editors/BrawlStarsEditor.tsx for
// the admin-side sync trigger — this just displays whatever's in the DB).
"use client";

import { useState, useEffect } from "react";

type BrawlStarsRosterItem = {
  id: number;
  name: string;
  iconUrl: string;
  owned: boolean;
  power: number | null;
  trophies: number | null;
};

type BrawlStarsPlayer = {
  name: string;
  expLevel: number;
  trophies: number;
  highestTrophies: number;
  victories3v3: number;
  soloVictories: number;
  duoVictories: number;
  clubName: string | null;
  iconUrl: string;
};

let BS_CACHE: BrawlStarsRosterItem[] | null = null;
let BS_PLAYER_CACHE: BrawlStarsPlayer | null | undefined;

export default function BrawlStarsSection() {
  const [brawlers, setBrawlers] = useState<BrawlStarsRosterItem[] | null>(BS_CACHE);
  const [player, setPlayer] = useState<BrawlStarsPlayer | null | undefined>(BS_PLAYER_CACHE);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [ownFilter, setOwnFilter] = useState<"all" | "owned" | "missing">("all");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `{
          brawlStarsRoster { id name iconUrl owned power trophies }
          brawlStarsPlayer {
            name expLevel trophies highestTrophies victories3v3 soloVictories duoVictories clubName iconUrl
          }
        }`,
      }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        const list = j?.data?.brawlStarsRoster;
        if (Array.isArray(list)) {
          BS_CACHE = list;
          setBrawlers(list);
        } else {
          setError(true);
          return;
        }
        BS_PLAYER_CACHE = j?.data?.brawlStarsPlayer ?? null;
        setPlayer(BS_PLAYER_CACHE);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error)
    return (
      <div className="py-8 text-center text-[var(--muted)]">
        Couldn&apos;t load brawlers.
      </div>
    );
  if (!brawlers)
    return <div className="py-8 text-center text-[var(--muted)]">Loading…</div>;

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
      {player && <PlayerHeader player={player} />}

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full border border-[var(--line)] bg-[var(--panel-2)] p-0.5 text-[11px] font-semibold">
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
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="ml-auto w-full max-w-[200px] rounded-full border border-[var(--line)] bg-[var(--panel-2)] px-3 py-1.5 text-[12px] text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
        />
        <span className="text-[11px] text-[var(--muted)]">
          {ownedCount}/{brawlers.length} brawlers
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
        {filtered.map((b) => (
          <div
            key={b.id}
            className="flex flex-col items-center gap-1 rounded-xl border border-[var(--line)] p-2 text-center"
            style={{ background: "var(--panel-2)" }}
          >
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b.iconUrl}
                alt={b.name}
                className="h-14 w-14 rounded-full object-cover"
                style={{ filter: b.owned ? undefined : "grayscale(1) brightness(0.5)" }}
                loading="lazy"
              />
              {!b.owned && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg
                    width="16"
                    height="16"
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
            <span className="w-full truncate text-[11px] font-bold capitalize text-[var(--text)]">
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

function PlayerHeader({ player }: { player: BrawlStarsPlayer }) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--line)] bg-[var(--panel-2)] p-4">
      <div className="flex flex-shrink-0 flex-col items-center gap-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={player.iconUrl}
          alt="Profile icon"
          title="Your Brawl Stars profile icon"
          className="h-16 w-16 rounded-full border-2 object-cover"
          style={{ borderColor: "var(--accent)" }}
        />
        <span className="text-[9px] uppercase tracking-wide text-[var(--muted)]">
          Profile icon
        </span>
      </div>
      <div className="min-w-0">
        <div className="truncate text-base font-extrabold capitalize text-[var(--text)]">
          {player.name.toLowerCase()}
        </div>
        <div className="text-xs text-[var(--muted)]">Level {player.expLevel}</div>
        {player.clubName && (
          <div className="text-xs text-[var(--muted)]">
            Club: <span className="text-[var(--text)]">{player.clubName}</span>
          </div>
        )}
      </div>
      <div className="ml-auto flex flex-wrap gap-4">
        <Stat value={player.trophies.toLocaleString()} label="trophies" />
        <Stat value={player.highestTrophies.toLocaleString()} label="best trophies" />
        <Stat value={player.victories3v3.toLocaleString()} label="3v3 wins" />
        <Stat value={player.soloVictories.toLocaleString()} label="solo wins" />
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-lg font-extrabold text-[var(--accent)]">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">{label}</div>
    </div>
  );
}
