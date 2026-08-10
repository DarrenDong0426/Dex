// app/profile/GenshinCharactersSection.tsx
// Read-only browse of the HoYoLAB-synced roster (see app/admin/editors/
// GenshinEditor.tsx for the admin-side sync trigger — this just displays
// whatever's currently in the DB).
"use client";

import { useState, useEffect, useRef } from "react";
import { ELEMENT_COLOR, statIcon, HIDDEN_STATS } from "@/app/profile/genshinDisplay";
import { useScrollOverflow } from "@/app/profile/useScrollOverflow";

type Substat = { name: string; value: string };
type Artifact = {
  slot: string;
  setName: string;
  icon: string;
  rarity: number;
  level: number;
  mainStatName: string;
  mainStatValue: string;
  substats: Substat[];
};
type Costume = { id: number; name: string; icon: string };
// One row of the merged roster (owned + locked). Unowned rows have every
// owned-only field null — see the isOwned() guard below before reading them.
type RosterItem = {
  id: number;
  name: string;
  element: string;
  rarity: number;
  icon: string;
  owned: boolean;
  region: string;
  image: string | null;
  baseIcon: string | null;
  stats: Substat[] | null;
  level: number | null;
  constellation: number | null;
  friendship: number | null;
  normalAttackLvl: number | null;
  elementalSkillLvl: number | null;
  elementalBurstLvl: number | null;
  weaponName: string | null;
  weaponIcon: string | null;
  weaponRarity: number | null;
  weaponLevel: number | null;
  weaponRefinement: number | null;
  artifacts: Artifact[] | null;
  costumes: Costume[] | null;
  selectedCostumeId: number | null;
};

type OwnedChar = RosterItem & {
  owned: true;
  image: string;
  baseIcon: string;
  stats: Substat[];
  level: number;
  constellation: number;
  friendship: number;
  normalAttackLvl: number;
  elementalSkillLvl: number;
  elementalBurstLvl: number;
  weaponName: string;
  weaponIcon: string;
  weaponRarity: number;
  weaponLevel: number;
  weaponRefinement: number;
  artifacts: Artifact[];
  costumes: Costume[];
};

function isOwned(c: RosterItem): c is OwnedChar {
  return c.owned;
}

// chronological in-game order, with catch-all buckets last
const REGION_ORDER = [
  "Mondstadt",
  "Liyue",
  "Inazuma",
  "Sumeru",
  "Fontaine",
  "Natlan",
  "Snezhnaya",
  "Nod-Krai",
  "Fatui",
  "Traveler",
  "Other",
];

let GENSHIN_CACHE: RosterItem[] | null = null;

export default function GenshinCharactersSection() {
  const [chars, setChars] = useState<RosterItem[] | null>(GENSHIN_CACHE);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [elementFilter, setElementFilter] = useState<string | "all">("all");
  const [regionFilter, setRegionFilter] = useState<string | "all">("all");
  const [ownFilter, setOwnFilter] = useState<"all" | "owned" | "missing">("all");
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `{ genshinRoster {
          id name element rarity icon owned region image baseIcon level constellation friendship
          stats { name value }
          normalAttackLvl elementalSkillLvl elementalBurstLvl
          weaponName weaponIcon weaponRarity weaponLevel weaponRefinement
          artifacts { slot setName icon rarity level mainStatName mainStatValue substats { name value } }
          costumes { id name icon }
          selectedCostumeId
        } }`,
      }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        const list = j?.data?.genshinRoster;
        if (Array.isArray(list)) {
          GENSHIN_CACHE = list;
          setChars(list);
        } else setError(true);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error)
    return (
      <div className="py-12 text-center text-[var(--muted)]">
        Couldn&apos;t load characters.
      </div>
    );
  if (!chars)
    return (
      <div className="py-12 text-center text-[var(--muted)]">Loading…</div>
    );

  const elements = Array.from(new Set(chars.map((c) => c.element))).sort();
  const regions = Array.from(new Set(chars.map((c) => c.region))).sort(
    (a, b) => REGION_ORDER.indexOf(a) - REGION_ORDER.indexOf(b),
  );
  const ownedCount = chars.filter((c) => c.owned).length;
  const filtered = chars.filter((c) => {
    if (ownFilter === "owned" && !c.owned) return false;
    if (ownFilter === "missing" && c.owned) return false;
    if (elementFilter !== "all" && c.element !== elementFilter) return false;
    if (regionFilter !== "all" && c.region !== regionFilter) return false;
    if (!c.name.toLowerCase().includes(query.trim().toLowerCase()))
      return false;
    return true;
  });
  const selectedChar = chars.find(
    (c): c is OwnedChar => c.id === selected && isOwned(c),
  ) ?? null;

  return (
    <div className="flex flex-col gap-4">
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
        <button
          onClick={() => setElementFilter("all")}
          className="rounded-full border px-3 py-1.5 text-[12px] font-bold transition"
          style={{
            background:
              elementFilter === "all" ? "var(--accent)" : "var(--panel-2)",
            color: elementFilter === "all" ? "#0c0a1e" : "var(--muted)",
            borderColor:
              elementFilter === "all" ? "var(--accent)" : "var(--line)",
          }}
        >
          All
        </button>
        {elements.map((el) => {
          const on = elementFilter === el;
          return (
            <button
              key={el}
              onClick={() => setElementFilter(el)}
              className="rounded-full border px-3 py-1.5 text-[12px] font-bold transition"
              style={{
                background: on ? (ELEMENT_COLOR[el] ?? "var(--accent)") : "var(--panel-2)",
                color: on ? "#0c0a1e" : "var(--muted)",
                borderColor: on ? (ELEMENT_COLOR[el] ?? "var(--accent)") : "var(--line)",
              }}
            >
              {el}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setRegionFilter("all")}
          className="rounded-full border px-3 py-1.5 text-[12px] font-bold transition"
          style={{
            background:
              regionFilter === "all" ? "var(--accent)" : "var(--panel-2)",
            color: regionFilter === "all" ? "#0c0a1e" : "var(--muted)",
            borderColor:
              regionFilter === "all" ? "var(--accent)" : "var(--line)",
          }}
        >
          All regions
        </button>
        {regions.map((r) => {
          const on = regionFilter === r;
          return (
            <button
              key={r}
              onClick={() => setRegionFilter(r)}
              className="rounded-full border px-3 py-1.5 text-[12px] font-bold transition"
              style={{
                background: on ? "var(--accent)" : "var(--panel-2)",
                color: on ? "#0c0a1e" : "var(--muted)",
                borderColor: on ? "var(--accent)" : "var(--line)",
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
        <span className="text-[11px] text-[var(--muted)]">
          {ownedCount}/{chars.length} characters
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => c.owned && setSelected(c.id)}
            disabled={!c.owned}
            className="relative flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition enabled:hover:border-[var(--accent)]"
            style={{ borderColor: "var(--line)", background: "var(--panel-2)" }}
          >
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.icon}
                alt={c.name}
                className="h-14 w-14 rounded-full border-2 object-cover"
                style={{
                  borderColor: ELEMENT_COLOR[c.element] ?? "var(--line)",
                  filter: c.owned ? undefined : "grayscale(1) brightness(0.5)",
                }}
                loading="lazy"
              />
              {!c.owned && (
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
            <span className="w-full truncate text-[11px] font-bold text-[var(--text)]">
              {c.name}
            </span>
            <span className="text-[10px] text-[var(--muted)]">
              {c.owned ? `Lv${c.level} · C${c.constellation}` : "Locked"}
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-[var(--muted)]">
            No characters match this filter.
          </p>
        )}
      </div>

      {selectedChar && (
        <GenshinCharacterModal
          char={selectedChar}
          onClose={() => setSelected(null)}
          onUpdate={(updated) => {
            setChars(
              (prev) =>
                prev?.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)) ??
                prev,
            );
            if (GENSHIN_CACHE) {
              GENSHIN_CACHE = GENSHIN_CACHE.map((c) =>
                c.id === updated.id ? { ...c, ...updated } : c,
              );
            }
          }}
        />
      )}
    </div>
  );
}

function GenshinCharacterModal({
  char,
  onClose,
  onUpdate,
}: {
  char: OwnedChar;
  onClose: () => void;
  onUpdate: (patch: {
    id: number;
    icon: string;
    image: string;
    selectedCostumeId: number | null;
  }) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const elColor = ELEMENT_COLOR[char.element] ?? "var(--accent)";
  const stats = char.stats.filter((s) => !HIDDEN_STATS.has(s.name));
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasMore = useScrollOverflow(scrollRef, [char.costumes.length, char.selectedCostumeId]);

  function switchCostume(costumeId: number | null) {
    if (switching || costumeId === char.selectedCostumeId) return;
    setSwitching(true);
    setSwitchError(null);
    fetch("/api/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `mutation($id:Int!,$costumeId:Int){ setGenshinCostume(characterId:$id, costumeId:$costumeId){ id icon image selectedCostumeId } }`,
        variables: { id: char.id, costumeId },
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        ref={scrollRef}
        className="relative max-h-[92vh] w-full max-w-5xl overflow-auto rounded-2xl border p-1 shadow-2xl"
        style={{ borderColor: elColor, background: "var(--panel)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--panel-2)] text-lg leading-none text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--text)]"
        >
          ×
        </button>

        <div className="flex flex-col sm:flex-row">
          {/* left: big splash art + name/level/constellation */}
          <div
            className="relative flex-shrink-0 overflow-hidden rounded-xl sm:w-[280px]"
            style={{
              background: `linear-gradient(160deg, ${elColor}33, var(--panel-2))`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={char.image}
              alt={char.name}
              className="h-full w-full object-cover object-top"
              style={{ minHeight: 320 }}
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-10">
              <div className="text-lg font-extrabold text-white">{char.name}</div>
              <div className="text-xs text-white/80">
                Lv.{char.level}/90 · Friendship {char.friendship}
              </div>
              <div className="mt-1 text-[10px] text-white/70">
                Talents {char.normalAttackLvl}/{char.elementalSkillLvl}/
                {char.elementalBurstLvl}
              </div>
              {/* constellation pips */}
              <div className="mt-2 flex gap-1">
                {Array.from({ length: 6 }, (_, i) => (
                  <span
                    key={i}
                    className="flex h-5 w-5 items-center justify-center rounded-full border text-[9px] font-bold"
                    style={{
                      borderColor: i < char.constellation ? elColor : "#ffffff44",
                      background: i < char.constellation ? elColor : "transparent",
                      color: i < char.constellation ? "#0c0a1e" : "#ffffff88",
                    }}
                  >
                    {i + 1}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* right: weapon banner + icon-labeled stat list */}
          <div className="flex-1 p-4">
            <div className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={char.weaponIcon}
                alt={char.weaponName}
                className="h-12 w-12 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-[var(--text)]">
                  {char.weaponName}
                </div>
                <div className="text-xs text-[var(--muted)]">
                  {"★".repeat(char.weaponRarity)} · R{char.weaponRefinement} ·
                  Lv{char.weaponLevel}/90
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-col divide-y divide-[var(--line)] overflow-hidden rounded-xl border border-[var(--line)]">
              {stats.map((s) => {
                const { glyph, color } = statIcon(s.name, elColor);
                return (
                  <div
                    key={s.name}
                    className="flex items-center justify-between bg-[var(--panel-2)] px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2 text-[var(--muted)]">
                      <span style={{ color: color ?? "var(--accent)" }}>
                        {glyph}
                      </span>
                      {s.name}
                    </span>
                    <span className="font-bold text-[var(--text)]">
                      {s.value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {char.costumes.length > 0 && (
          <div className="px-4 pt-0">
            <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
              Skins
            </h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => switchCostume(null)}
                disabled={switching}
                title="Default"
                className="flex flex-col items-center gap-1 rounded-lg border p-1.5 text-left transition disabled:opacity-50"
                style={{
                  width: 64,
                  borderColor:
                    char.selectedCostumeId == null ? elColor : "var(--line)",
                  background: "var(--panel-2)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={char.baseIcon}
                  alt="Default"
                  className="h-10 w-10 rounded-md object-cover"
                />
                <span className="w-full truncate text-center text-[9px] font-semibold text-[var(--text)]">
                  Default
                </span>
              </button>
              {char.costumes.map((cs) => (
                <button
                  key={cs.id}
                  onClick={() => switchCostume(cs.id)}
                  disabled={switching}
                  title={cs.name}
                  className="flex flex-col items-center gap-1 rounded-lg border p-1.5 text-left transition disabled:opacity-50"
                  style={{
                    width: 64,
                    borderColor:
                      char.selectedCostumeId === cs.id ? elColor : "var(--line)",
                    background: "var(--panel-2)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cs.icon}
                    alt={cs.name}
                    className="h-10 w-10 rounded-md object-cover"
                  />
                  <span className="w-full truncate text-center text-[9px] font-semibold text-[var(--text)]">
                    {cs.name}
                  </span>
                </button>
              ))}
            </div>
            {switchError && (
              <p className="mt-2 text-[11px] text-[var(--accent-2)]">{switchError}</p>
            )}
          </div>
        )}

        {/* artifacts — compact strip like the reference layout */}
        <div className="grid grid-cols-2 gap-2 p-4 pt-0 sm:grid-cols-5">
          {char.artifacts.map((a) => (
            <div
              key={a.slot}
              className="rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.icon}
                alt={a.slot}
                className="mx-auto h-14 w-14 rounded-lg object-cover"
              />
              <div className="mt-1 truncate text-center text-[10.5px] font-bold text-[var(--text)]">
                {a.setName}
              </div>
              <div className="text-center text-[10px] text-[var(--muted)]">
                {a.mainStatName} {a.mainStatValue}
              </div>
              <div className="mt-1.5 flex flex-col gap-0.5">
                {a.substats.map((s, i) => {
                  const { glyph, color } = statIcon(s.name, elColor);
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between text-[9.5px] text-[var(--muted)]"
                    >
                      <span style={{ color: color ?? undefined }}>{glyph}</span>
                      <span>{s.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {char.artifacts.length === 0 && (
            <p className="col-span-full text-sm text-[var(--muted)]">
              No artifacts equipped.
            </p>
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
    </div>
  );
}
