// app/profile/BrawlStarsSection.tsx
// Read-only browse of the Supercell-synced brawler roster (owned + locked)
// + overall account stats (see app/admin/editors/BrawlStarsEditor.tsx for
// the admin-side sync trigger — this just displays whatever's in the DB).
"use client";

import { useState, useEffect } from "react";
import {
  gadgetIconUrl,
  starPowerIconUrl,
  gearIconUrl,
  UNIVERSAL_GEAR_NAMES,
} from "@/app/profile/brawlStarsImages";

type Gadget = { id: number; name: string };
type Gear = { id: number; name: string; level: number };

type BrawlStarsRosterItem = {
  id: number;
  name: string;
  iconUrl: string;
  owned: boolean;
  power: number | null;
  trophies: number | null;
  highestTrophies: number | null;
  gadgets: Gadget[] | null;
  starPowers: Gadget[] | null;
  gears: Gear[] | null;
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

type SortMode = "name" | "trophies" | "power" | "owned";

let BS_CACHE: BrawlStarsRosterItem[] | null = null;
let BS_PLAYER_CACHE: BrawlStarsPlayer | null | undefined;

export default function BrawlStarsSection() {
  const [brawlers, setBrawlers] = useState<BrawlStarsRosterItem[] | null>(BS_CACHE);
  const [player, setPlayer] = useState<BrawlStarsPlayer | null | undefined>(BS_PLAYER_CACHE);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [ownFilter, setOwnFilter] = useState<"all" | "owned" | "missing">("all");
  const [sort, setSort] = useState<SortMode>("name");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `{
          brawlStarsRoster {
            id name iconUrl owned power trophies highestTrophies
            gadgets { id name }
            starPowers { id name }
            gears { id name level }
          }
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
    .filter((b) => b.name.toLowerCase().includes(query.trim().toLowerCase()))
    .slice()
    .sort((a, b) => {
      if (sort === "owned") {
        if (a.owned !== b.owned) return a.owned ? -1 : 1;
        return a.name.localeCompare(b.name);
      }
      // trophies/power: locked brawlers have neither (null → 0), which
      // naturally sinks them to the bottom of a descending sort without
      // needing a separate owned-first tiebreak
      if (sort === "trophies") return (b.trophies ?? 0) - (a.trophies ?? 0);
      if (sort === "power") return (b.power ?? 0) - (a.power ?? 0);
      return a.name.localeCompare(b.name);
    });

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

        <div className="inline-flex rounded-full border border-[var(--line)] bg-[var(--panel-2)] p-0.5 text-[11px] font-semibold">
          {(
            [
              ["name", "Name"],
              ["trophies", "Trophies"],
              ["power", "Power"],
              ["owned", "Owned"],
            ] as [SortMode, string][]
          ).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setSort(v)}
              className="rounded-full px-2.5 py-1 transition"
              style={{
                background: sort === v ? "var(--accent)" : "transparent",
                color: sort === v ? "#0c0a1e" : "var(--muted)",
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
          <button
            key={b.id}
            onClick={() => b.owned && setSelectedId(b.id)}
            disabled={!b.owned}
            className="flex flex-col items-center gap-1 rounded-xl border border-[var(--line)] p-2 text-center transition enabled:hover:border-[var(--accent)]"
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
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-[var(--muted)]">
            No brawlers match &quot;{query}&quot;.
          </p>
        )}
      </div>

      {selectedId != null && (
        <BrawlerModal
          brawler={brawlers.find((b) => b.id === selectedId)!}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

function BrawlerModal({
  brawler,
  onClose,
}: {
  brawler: BrawlStarsRosterItem;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-lg overflow-auto rounded-2xl border border-[var(--line)] p-1 shadow-2xl"
        style={{ background: "var(--panel)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--panel-2)] text-lg leading-none text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--text)]"
        >
          ×
        </button>

        <div className="flex flex-col items-center gap-2 p-5 pb-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brawler.iconUrl}
            alt={brawler.name}
            className="h-24 w-24 rounded-full border-2 object-cover"
            style={{ borderColor: "var(--accent)" }}
          />
          <div className="text-lg font-extrabold capitalize text-[var(--text)]">
            {brawler.name.toLowerCase()}
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            <Stat value={`P${brawler.power ?? "–"}`} label="power" />
            <Stat value={(brawler.trophies ?? 0).toLocaleString()} label="trophies" />
            <Stat
              value={(brawler.highestTrophies ?? 0).toLocaleString()}
              label="best trophies"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 p-4 pt-0">
          <AccessoryGroup title="Gadgets" empty={brawler.gadgets?.length === 0}>
            {(brawler.gadgets ?? []).map((g) => (
              <AccessoryTile
                key={g.id}
                iconUrl={gadgetIconUrl(g.id)}
                name={g.name}
              />
            ))}
          </AccessoryGroup>
          <AccessoryGroup title="Star Powers" empty={brawler.starPowers?.length === 0}>
            {(brawler.starPowers ?? []).map((sp) => (
              <AccessoryTile
                key={sp.id}
                iconUrl={starPowerIconUrl(sp.id)}
                name={sp.name}
              />
            ))}
          </AccessoryGroup>
          {/* every brawler at Power 8+ can equip any of the 6 universal
              gears — shown as a full set (owned in color, unowned grayed
              out + locked) the same way the roster grid shows locked
              brawlers, rather than only listing whichever ones happen to
              be bought already. Epic/Mythic gears (Pet Power, Thicc Head,
              etc.) are real but brawler-specific — only shown when
              actually owned, since there's no verified per-brawler
              eligibility list to know which brawlers should show them
              as "locked" vs. not applicable at all. */}
          <AccessoryGroup title="Gears">
            {UNIVERSAL_GEAR_NAMES.map((name) => {
              const owned = (brawler.gears ?? []).find(
                (g) => g.name.toUpperCase() === name,
              );
              return (
                <AccessoryTile
                  key={name}
                  iconUrl={gearIconUrl(name)}
                  name={name}
                  sub={owned ? `Lv${owned.level}` : undefined}
                  locked={!owned}
                />
              );
            })}
            {(brawler.gears ?? [])
              .filter((g) => !UNIVERSAL_GEAR_NAMES.includes(g.name.toUpperCase()))
              .map((g) => (
                <AccessoryTile
                  key={g.id}
                  iconUrl={gearIconUrl(g.name)}
                  name={g.name}
                  sub={`Lv${g.level}`}
                />
              ))}
          </AccessoryGroup>
        </div>
      </div>
    </div>
  );
}

// real icon art, styled after Brawl Stars' own in-game accessory row.
// `locked` (grayscale + lock badge) mirrors the same visual language the
// brawler roster grid already uses for brawlers you don't own.
function AccessoryTile({
  iconUrl,
  name,
  sub,
  locked,
}: {
  iconUrl?: string;
  name: string;
  sub?: string;
  locked?: boolean;
}) {
  return (
    <div
      className="flex w-16 flex-shrink-0 flex-col items-center gap-1 rounded-xl border border-[var(--line)] p-1.5 text-center"
      style={{ background: "var(--panel-2)", opacity: locked ? 0.5 : 1 }}
      title={name}
    >
      <div className="relative h-10 w-10">
        {iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={iconUrl}
            alt={name}
            className="h-10 w-10 object-contain"
            style={{ filter: locked ? "grayscale(1) brightness(0.6)" : undefined }}
          />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center text-xl">
            ⚙️
          </span>
        )}
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              width="14"
              height="14"
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
      <span className="w-full truncate text-[9px] font-bold capitalize text-[var(--text)]">
        {name.toLowerCase()}
      </span>
      {sub && (
        <span className="text-[9px] font-semibold text-[var(--muted)]">{sub}</span>
      )}
    </div>
  );
}

function AccessoryGroup({
  title,
  empty,
  children,
}: {
  title: string;
  empty?: boolean;
  children: React.ReactNode;
}) {
  if (empty) return null;
  return (
    <div>
      <h4 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
        {title}
      </h4>
      <div className="flex flex-wrap gap-2">{children}</div>
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
