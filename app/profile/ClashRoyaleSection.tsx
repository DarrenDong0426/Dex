// app/profile/ClashRoyaleSection.tsx
// Read-only browse of the Supercell-synced card roster + overall account
// stats (see app/admin/editors/ClashRoyaleEditor.tsx for the admin-side
// sync trigger — this just displays whatever's currently in the DB).
//
// NOTE: no owned/locked distinction here (unlike Genshin/Brawl Stars) — the
// API's `count` field is spare unused copies, not an ownership flag, so a
// maxed card commonly sits at count=0 (nothing left to upgrade into) and is
// indistinguishable from a genuinely never-found card. There's no reliable
// signal in this API to tell the two apart, so every card is just shown
// plainly with whatever level/count it reports.
"use client";

import { useState, useEffect } from "react";

type ClashRoyaleCard = {
  id: number;
  name: string;
  iconUrl: string;
  level: number;
  maxLevel: number;
  rarity: string;
  count: number;
  isSupport: boolean;
};

type ClashRoyalePlayer = {
  name: string;
  expLevel: number;
  trophies: number;
  bestTrophies: number;
  wins: number;
  losses: number;
  clanName: string | null;
  arenaName: string | null;
};

const RARITY_COLOR: Record<string, string> = {
  common: "#9aa0b0",
  rare: "#f4a13a",
  epic: "#c46ef0",
  legendary: "#f2d24a",
  champion: "#ff7043",
};

let CR_CACHE: ClashRoyaleCard[] | null = null;
let CR_PLAYER_CACHE: ClashRoyalePlayer | null | undefined;

export default function ClashRoyaleSection() {
  const [cards, setCards] = useState<ClashRoyaleCard[] | null>(CR_CACHE);
  const [player, setPlayer] = useState<ClashRoyalePlayer | null | undefined>(CR_PLAYER_CACHE);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState<string | "all">("all");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `{
          clashRoyaleCards { id name iconUrl level maxLevel rarity count isSupport }
          clashRoyalePlayer {
            name expLevel trophies bestTrophies wins losses clanName arenaName
          }
        }`,
      }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        const list = j?.data?.clashRoyaleCards;
        if (Array.isArray(list)) {
          CR_CACHE = list;
          setCards(list);
        } else {
          setError(true);
          return;
        }
        CR_PLAYER_CACHE = j?.data?.clashRoyalePlayer ?? null;
        setPlayer(CR_PLAYER_CACHE);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error)
    return (
      <div className="py-8 text-center text-[var(--muted)]">
        Couldn&apos;t load cards.
      </div>
    );
  if (!cards)
    return <div className="py-8 text-center text-[var(--muted)]">Loading…</div>;

  const rarities = Array.from(new Set(cards.map((c) => c.rarity)));
  const filtered = cards
    .filter((c) => rarityFilter === "all" || c.rarity === rarityFilter)
    .filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="flex flex-col gap-4">
      {player && <PlayerHeader player={player} />}

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
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="ml-auto w-full max-w-[200px] rounded-full border border-[var(--line)] bg-[var(--panel-2)] px-3 py-1.5 text-[12px] text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
        />
        <span className="text-[11px] text-[var(--muted)]">{cards.length} cards</span>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
        {filtered.map((c) => {
          const color = RARITY_COLOR[c.rarity] ?? "var(--line)";
          return (
            <div
              key={c.id}
              className="flex flex-col items-center gap-1 rounded-xl border p-2 text-center"
              style={{ borderColor: color, background: "var(--panel-2)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.iconUrl}
                alt={c.name}
                className="h-14 w-14 object-contain"
                loading="lazy"
              />
              <span className="w-full truncate text-[11px] font-bold text-[var(--text)]">
                {c.name}
              </span>
              <span className="text-[10px] text-[var(--muted)]">
                {c.isSupport ? "Tower Troop" : `Lv${c.level}/${c.maxLevel}`}
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

function PlayerHeader({ player }: { player: ClashRoyalePlayer }) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--line)] bg-[var(--panel-2)] p-4">
      <div className="min-w-0">
        <div className="truncate text-base font-extrabold text-[var(--text)]">
          {player.name}
        </div>
        <div className="text-xs text-[var(--muted)]">Level {player.expLevel}</div>
        {player.arenaName && (
          <div className="text-xs text-[var(--muted)]">
            Arena: <span className="text-[var(--text)]">{player.arenaName}</span>
          </div>
        )}
        {player.clanName && (
          <div className="text-xs text-[var(--muted)]">
            Clan: <span className="text-[var(--text)]">{player.clanName}</span>
          </div>
        )}
      </div>
      <div className="ml-auto flex flex-wrap gap-4">
        <Stat value={player.trophies.toLocaleString()} label="trophies" />
        <Stat value={player.bestTrophies.toLocaleString()} label="best trophies" />
        <Stat value={player.wins.toLocaleString()} label="wins" />
        <Stat value={player.losses.toLocaleString()} label="losses" />
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
