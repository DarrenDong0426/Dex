// app/profile/GenshinFavoritesSummary.tsx
// Favorited characters (set via the admin Genshin editor) — a compact grid
// of icons so many favorites fit without scrolling; hovering a tile pops up
// the full card (splash art, weapon, stats, skin picker, artifacts).
"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ELEMENT_COLOR, statIcon, HIDDEN_STATS } from "@/app/profile/genshinDisplay";
import { useScrollOverflow } from "@/app/profile/useScrollOverflow";

type Substat = { name: string; value: string };
type Artifact = {
  slot: string;
  setName: string;
  icon: string;
  mainStatName: string;
  mainStatValue: string;
  substats: Substat[];
};
type Costume = { id: number; name: string; icon: string };
type GenshinCharacter = {
  id: number;
  name: string;
  element: string;
  rarity: number;
  icon: string;
  image: string;
  baseIcon: string;
  stats: Substat[];
  level: number;
  constellation: number;
  friendship: number;
  weaponName: string;
  weaponIcon: string;
  weaponRarity: number;
  weaponLevel: number;
  weaponRefinement: number;
  isFavorite: boolean;
  artifacts: Artifact[];
  costumes: Costume[];
  selectedCostumeId: number | null;
};

let FAVORITES_CACHE: GenshinCharacter[] | null = null;

export default function GenshinFavoritesSummary() {
  const [chars, setChars] = useState<GenshinCharacter[] | null>(FAVORITES_CACHE);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `{ genshinCharacters {
          id name element rarity icon image baseIcon level constellation friendship isFavorite
          stats { name value }
          weaponName weaponIcon weaponRarity weaponLevel weaponRefinement
          artifacts { slot setName icon mainStatName mainStatValue substats { name value } }
          costumes { id name icon }
          selectedCostumeId
        } }`,
      }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        const list = j?.data?.genshinCharacters;
        if (Array.isArray(list)) {
          const favorites = list.filter((c: GenshinCharacter) => c.isFavorite);
          FAVORITES_CACHE = favorites;
          setChars(favorites);
        } else setError(true);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error)
    return (
      <div className="py-8 text-center text-[var(--muted)]">
        Couldn&apos;t load favorites.
      </div>
    );
  if (!chars)
    return <div className="py-8 text-center text-[var(--muted)]">Loading…</div>;
  if (chars.length === 0)
    return (
      <div className="py-8 text-center text-[var(--muted)]">
        No favorite characters yet — pick some in the admin panel.
      </div>
    );

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
      {chars.map((c) => (
        <FavoriteTile
          key={c.id}
          c={c}
          onUpdate={(updated) => {
            setChars(
              (prev) =>
                prev?.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)) ??
                prev,
            );
            if (FAVORITES_CACHE) {
              FAVORITES_CACHE = FAVORITES_CACHE.map((x) =>
                x.id === updated.id ? { ...x, ...updated } : x,
              );
            }
          }}
        />
      ))}
    </div>
  );
}

function FavoriteTile({
  c,
  onUpdate,
}: {
  c: GenshinCharacter;
  onUpdate: (patch: {
    id: number;
    icon: string;
    image: string;
    selectedCostumeId: number | null;
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const elColor = ELEMENT_COLOR[c.element] ?? "var(--accent)";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full flex-col items-center gap-1 rounded-xl border p-2 text-center transition hover:border-[var(--accent)]"
        style={{ borderColor: "var(--line)", background: "var(--panel-2)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={c.icon}
          alt={c.name}
          className="h-14 w-14 rounded-full border-2 object-cover"
          style={{ borderColor: elColor }}
        />
        <span className="w-full truncate text-[11px] font-bold text-[var(--text)]">
          {c.name}
        </span>
        <span className="text-[10px] text-[var(--muted)]">
          Lv{c.level} · C{c.constellation}
        </span>
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setOpen(false)}
          >
            <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
              <FavoriteCard c={c} onUpdate={onUpdate} />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function FavoriteCard({
  c,
  onUpdate,
}: {
  c: GenshinCharacter;
  onUpdate: (patch: {
    id: number;
    icon: string;
    image: string;
    selectedCostumeId: number | null;
  }) => void;
}) {
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const elColor = ELEMENT_COLOR[c.element] ?? "var(--accent)";
  const stats = c.stats.filter((s) => !HIDDEN_STATS.has(s.name));
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasMore = useScrollOverflow(scrollRef, [c.costumes.length, c.selectedCostumeId]);

  function switchCostume(costumeId: number | null) {
    if (switching || costumeId === c.selectedCostumeId) return;
    setSwitching(true);
    setSwitchError(null);
    fetch("/api/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `mutation($id:Int!,$costumeId:Int){ setGenshinCostume(characterId:$id, costumeId:$costumeId){ id icon image selectedCostumeId } }`,
        variables: { id: c.id, costumeId },
      }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.errors?.length) throw new Error(j.errors[0].message);
        onUpdate(j.data.setGenshinCostume);
      })
      .catch((e) => setSwitchError(String(e.message ?? e)))
      .finally(() => setSwitching(false));
  }

  return (
    <div
      ref={scrollRef}
      className="max-h-[85vh] overflow-auto rounded-2xl border shadow-2xl"
      style={{ borderColor: elColor, background: "var(--panel-2)" }}
    >
      <div className="flex flex-row">
        {/* splash art thumbnail + name/level/constellation overlay */}
        <div
          className="relative w-[220px] flex-shrink-0 overflow-hidden"
          style={{
            background: `linear-gradient(160deg, ${elColor}33, var(--panel-2))`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={c.image}
            alt={c.name}
            className="h-full w-full object-cover object-top"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
            <div className="text-xl font-extrabold text-white">{c.name}</div>
            <div className="text-sm text-white/80">
              Lv.{c.level}/90 · C{c.constellation}
            </div>
          </div>
        </div>

        <div className="flex-1 p-3">
          <div className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 py-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.weaponIcon}
              alt={c.weaponName}
              className="h-9 w-9 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-bold text-[var(--text)]">
                {c.weaponName}
              </div>
              <div className="text-sm text-[var(--muted)]">
                {"★".repeat(c.weaponRarity)} · R{c.weaponRefinement} · Lv
                {c.weaponLevel}/90
              </div>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-2">
            {stats.map((s) => {
              const { glyph, color } = statIcon(s.name, elColor);
              return (
                <div
                  key={s.name}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="flex items-center gap-1 text-[var(--muted)]">
                    <span style={{ color: color ?? "var(--accent)" }}>
                      {glyph}
                    </span>
                    {s.name}
                  </span>
                  <span className="text-xl font-extrabold text-[var(--text)]">
                    {s.value}
                  </span>
                </div>
              );
            })}
          </div>

          {c.costumes.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => switchCostume(null)}
                disabled={switching}
                title="Default"
                className="h-7 w-7 flex-shrink-0 overflow-hidden rounded-full border-2 transition disabled:opacity-50"
                style={{
                  borderColor: c.selectedCostumeId == null ? elColor : "var(--line)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.baseIcon} alt="Default" className="h-full w-full object-cover" />
              </button>
              {c.costumes.map((cs) => (
                <button
                  key={cs.id}
                  onClick={() => switchCostume(cs.id)}
                  disabled={switching}
                  title={cs.name}
                  className="h-7 w-7 flex-shrink-0 overflow-hidden rounded-full border-2 transition disabled:opacity-50"
                  style={{
                    borderColor: c.selectedCostumeId === cs.id ? elColor : "var(--line)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cs.icon} alt={cs.name} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          {switchError && (
            <p className="mt-1 text-[11px] text-[var(--accent-2)]">{switchError}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2 p-3 pt-0">
        {c.artifacts.map((a) => (
          <div
            key={a.slot}
            title={`${a.setName} — ${a.mainStatName}: ${a.mainStatValue}`}
            className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-1.5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={a.icon}
              alt={a.slot}
              className="mx-auto h-9 w-9 rounded-md object-cover"
            />
            <div className="mt-1 truncate text-center text-[11px] font-semibold text-[var(--muted)]">
              {a.setName}
            </div>
            <div className="truncate text-center text-sm font-bold text-[var(--text)]">
              {a.mainStatValue}
            </div>
            <div className="mt-1 flex flex-col gap-0.5">
              {a.substats.map((s, i) => {
                const { glyph, color } = statIcon(s.name, elColor);
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between text-[11px] text-[var(--muted)]"
                  >
                    <span style={{ color: color ?? undefined }}>{glyph}</span>
                    <span>{s.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {c.artifacts.length === 0 && (
          <div className="col-span-5 text-center text-sm text-[var(--muted)]">
            No artifacts equipped.
          </div>
        )}
      </div>

      {hasMore && (
        <div className="pointer-events-none sticky bottom-2 z-10 flex justify-center">
          <span className="animate-bounce rounded-full border border-[var(--line)] bg-[var(--panel)] px-3 py-1 text-[11px] font-bold text-[var(--muted)] shadow-lg">
            ↓ Scroll for more
          </span>
        </div>
      )}
    </div>
  );
}
