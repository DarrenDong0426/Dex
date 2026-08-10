// app/admin/editors/GenshinEditor.tsx
// Read-only viewer for the HoYoLAB-synced roster, plus the "Sync now" button
// that triggers app/api/genshin/sync/route.ts. No manual editing — this data
// only ever comes from your account, not from admin input.
"use client";

import { useEffect, useState } from "react";
import { gql } from "./gql";
import { ELEMENT_COLOR, statIcon, HIDDEN_STATS } from "@/app/profile/genshinDisplay";

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
type GenshinCharacter = {
  id: number;
  name: string;
  element: string;
  rarity: number;
  icon: string;
  image: string;
  stats: Substat[];
  level: number;
  constellation: number;
  friendship: number;
  normalAttackLvl: number;
  elementalSkillLvl: number;
  elementalBurstLvl: number;
  weaponId: number;
  weaponName: string;
  weaponIcon: string;
  weaponRarity: number;
  weaponLevel: number;
  weaponRefinement: number;
  isFavorite: boolean;
  artifacts: Artifact[];
  costumes: Costume[];
  updatedAt: string;
};


type SyncResult =
  | { ok: true; synced: number; total: number }
  | { ok: false; error: string; message: string };

export default function GenshinEditor() {
  const [chars, setChars] = useState<GenshinCharacter[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<number | null>(null);

  function load() {
    gql(
      `{ genshinCharacters {
        id name element rarity icon image level constellation friendship
        stats { name value }
        normalAttackLvl elementalSkillLvl elementalBurstLvl
        weaponId weaponName weaponIcon weaponRarity weaponLevel weaponRefinement
        isFavorite
        artifacts { slot setName icon rarity level mainStatName mainStatValue substats { name value } }
        costumes { id name icon }
        updatedAt
      } }`,
    )
      .then((d) => setChars(d.genshinCharacters))
      .catch((e) => setError(String(e.message ?? e)));
  }

  useEffect(load, []);

  const favoriteCount = chars?.filter((c) => c.isFavorite).length ?? 0;

  async function toggleFavorite(characterId: number, favorite: boolean) {
    setFavoriteError(null);
    setChars(
      (prev) =>
        prev?.map((c) =>
          c.id === characterId ? { ...c, isFavorite: favorite } : c,
        ) ?? prev,
    );
    try {
      await gql(
        `mutation($id:Int!,$fav:Boolean!){ setGenshinFavorite(characterId:$id, favorite:$fav){ id } }`,
        { id: characterId, fav: favorite },
      );
    } catch (e) {
      // revert optimistic update on failure
      setChars(
        (prev) =>
          prev?.map((c) =>
            c.id === characterId ? { ...c, isFavorite: !favorite } : c,
          ) ?? prev,
      );
      setFavoriteError(String((e as Error).message ?? e));
    }
  }

  async function sync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/genshin/sync", { method: "POST" });
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
    return (
      <p className="text-sm text-[var(--accent-2)]">Couldn&apos;t load: {error}</p>
    );
  if (!chars) return <p className="text-sm text-[var(--muted)]">Loading…</p>;

  const filtered = chars.filter((c) =>
    c.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const lastSynced = chars.length
    ? new Date(Math.max(...chars.map((c) => Number(c.updatedAt))))
    : null;
  const selectedChar = chars.find((c) => c.id === selected) ?? null;

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
          placeholder="Search characters…"
          className="ml-auto w-full max-w-xs rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
        />
        <span className="text-xs text-[var(--muted)]">
          ★ {favoriteCount} favorited
        </span>
      </div>

      {favoriteError && (
        <div className="rounded-lg border border-[var(--accent-2)] px-3 py-2 text-xs text-[var(--accent-2)]">
          {favoriteError}
        </div>
      )}

      {syncResult && !syncResult.ok && (
        <div
          className="rounded-lg border px-3 py-2 text-xs"
          style={{
            borderColor:
              syncResult.error === "auth" ? "var(--accent-2)" : "var(--line)",
            color:
              syncResult.error === "auth" ? "var(--accent-2)" : "var(--muted)",
          }}
        >
          {syncResult.error === "auth"
            ? "⚠ Cookie expired — re-extract HOYOLAB_COOKIE and update .env."
            : `Sync failed: ${syncResult.message}`}
        </div>
      )}
      {syncResult && syncResult.ok && (
        <div className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs text-[var(--muted)]">
          Synced {syncResult.synced}/{syncResult.total} characters.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelected(c.id)}
            className="relative flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition"
            style={{ borderColor: "var(--line)", background: "var(--panel-2)" }}
          >
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(c.id, !c.isFavorite);
              }}
              title={c.isFavorite ? "Unfavorite" : "Favorite"}
              className="absolute right-1.5 top-1.5 text-lg leading-none"
              style={{ color: c.isFavorite ? "#f0d15a" : "var(--line)" }}
            >
              {c.isFavorite ? "★" : "☆"}
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.icon}
              alt={c.name}
              className="h-16 w-16 rounded-full border-2 object-cover"
              style={{ borderColor: ELEMENT_COLOR[c.element] ?? "var(--line)" }}
              loading="lazy"
            />
            <span className="truncate text-xs font-bold text-[var(--text)]">
              {c.name}
            </span>
            <span className="text-[10px] text-[var(--muted)]">
              Lv{c.level} · C{c.constellation}
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-[var(--muted)]">
            No characters match &quot;{query}&quot;.
          </p>
        )}
      </div>

      {selectedChar && (
        <GenshinModal
          char={selectedChar}
          onClose={() => setSelected(null)}
          onToggleFavorite={() =>
            toggleFavorite(selectedChar.id, !selectedChar.isFavorite)
          }
        />
      )}
    </div>
  );
}

function GenshinModal({
  char,
  onClose,
  onToggleFavorite,
}: {
  char: GenshinCharacter;
  onClose: () => void;
  onToggleFavorite: () => void;
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-5xl overflow-auto rounded-2xl border p-1 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]"
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
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold text-white">
                  {char.name}
                </span>
                <button
                  onClick={onToggleFavorite}
                  title={char.isFavorite ? "Unfavorite" : "Favorite"}
                  className="text-lg leading-none"
                  style={{ color: char.isFavorite ? "#f0d15a" : "#ffffff88" }}
                >
                  {char.isFavorite ? "★" : "☆"}
                </button>
              </div>
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
              {char.costumes.map((cs) => (
                <div
                  key={cs.id}
                  title={cs.name}
                  className="flex flex-col items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] p-1.5"
                  style={{ width: 64 }}
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
                </div>
              ))}
            </div>
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
      </div>
    </div>
  );
}
