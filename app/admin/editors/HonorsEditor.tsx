// app/admin/editors/HonorsEditor.tsx
// Two tabs (not stacked sections — a long "Other honors" list would push
// the other tab's content below the fold): fan honors (one row per
// character — rank cumulatively unlocks 4 near-identical low/middle/high
// /highest honors, so this is a single combined 0-32 level instead of 4
// separate near-duplicate rows), and everything else as a flat list (not
// the frontend's collapsed display ladder — admin edits raw rows). Event
// ranking-ladder honors ("1st"/"Top N"/...) aren't here at all — they sync
// automatically from the recorded rank on the Events tab. Thumbnails use
// the plain honor image helper, not the hard-won frame/SVG render logic in
// app/honor.ts.
"use client";

import { useEffect, useState } from "react";
import { honorImageUrl } from "@/app/honor";
import { charaIcon } from "@/app/profile/images";
import { gql } from "./gql";

type FanHonor = {
  characterId: number;
  name: string;
  level: number;
  maxLevel: number;
  rarity: string | null;
  tierLevel: number | null;
  tierMaxLevel: number | null;
};

type AdminHonor = {
  id: number;
  name: string;
  assetbundleName: string;
  honorRarity: string | null;
  groupName: string | null;
  owned: boolean;
  level: number | null;
};

const TIER_LABEL: Record<string, string> = {
  low: "Low",
  middle: "Middle",
  high: "High",
  highest: "Highest",
};

export default function HonorsEditor() {
  const [fanHonors, setFanHonors] = useState<FanHonor[] | null>(null);
  const [honors, setHonors] = useState<AdminHonor[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savingCharId, setSavingCharId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [ownFilter, setOwnFilter] = useState<"all" | "owned" | "missing">("all");
  const [tab, setTab] = useState<"fan" | "other">("fan");

  useEffect(() => {
    gql(
      `{
        adminFanHonors { characterId name level maxLevel rarity tierLevel tierMaxLevel }
        adminHonors { id name assetbundleName honorRarity groupName owned level }
      }`,
    )
      .then((d) => {
        setFanHonors(d.adminFanHonors);
        setHonors(d.adminHonors);
      })
      .catch((e) => setError(String(e.message ?? e)));
  }, []);

  async function saveFanLevel(characterId: number, level: number) {
    setSavingCharId(characterId);
    setFanHonors(
      (prev) =>
        prev?.map((f) =>
          f.characterId === characterId ? { ...f, level } : f,
        ) ?? prev,
    );
    try {
      const d = await gql(
        `mutation($id:Int!,$lvl:Int!){
           setFanHonorLevel(characterId:$id, level:$lvl){ characterId level rarity tierLevel tierMaxLevel }
         }`,
        { id: characterId, lvl: level },
      );
      setFanHonors(
        (prev) =>
          prev?.map((f) =>
            f.characterId === characterId
              ? { ...f, ...d.setFanHonorLevel }
              : f,
          ) ?? prev,
      );
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setSavingCharId(null);
    }
  }

  async function save(id: number, patch: { owned: boolean; level?: number | null }) {
    setSavingId(id);
    setHonors(
      (prev) => prev?.map((h) => (h.id === id ? { ...h, ...patch } : h)) ?? prev,
    );
    try {
      await gql(
        `mutation($id:Int!,$owned:Boolean!,$lvl:Int){
           setHonorEdit(honorId:$id, owned:$owned, level:$lvl){ id }
         }`,
        { id, owned: patch.owned, lvl: patch.level },
      );
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setSavingId(null);
    }
  }

  if (error)
    return (
      <p className="text-sm text-[var(--accent-2)]">Couldn&apos;t load: {error}</p>
    );
  if (!honors || !fanHonors)
    return <p className="text-sm text-[var(--muted)]">Loading…</p>;

  const filtered = honors.filter((h) => {
    if (!h.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
    if (ownFilter === "owned" && !h.owned) return false;
    if (ownFilter === "missing" && h.owned) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="inline-flex w-fit rounded-full border border-[var(--line)] bg-[var(--panel-2)] p-0.5 text-[12.5px] font-bold">
        {(
          [
            ["fan", `Fan honors (${fanHonors.length})`],
            ["other", `Other honors (${honors.length})`],
          ] as [typeof tab, string][]
        ).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            className="rounded-full px-3.5 py-1.5 transition"
            style={{
              background: tab === v ? "var(--accent)" : "transparent",
              color: tab === v ? "#0c0a1e" : "var(--muted)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "fan" && (
        <div>
          <p className="mb-3 text-xs text-[var(--muted)]">
            One combined level per character (0–32) — cumulatively unlocks
            the low/middle/high/highest tiers, same as reaching that
            character rank in-game.
          </p>
          <div className="flex flex-col gap-2">
          {fanHonors.map((f) => (
            <div
              key={f.characterId}
              className="flex items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={charaIcon(f.name)}
                alt=""
                className="h-9 w-9 rounded-full border border-[var(--line)] object-cover"
                loading="lazy"
              />
              <span className="w-40 truncate text-sm font-semibold text-[var(--text)]">
                {f.name}
              </span>
              <span className="w-32 text-xs text-[var(--muted)]">
                {f.rarity
                  ? `${TIER_LABEL[f.rarity]} ${f.tierLevel}/${f.tierMaxLevel}`
                  : "None yet"}
              </span>
              <label className="ml-auto flex items-center gap-1.5 text-xs text-[var(--muted)]">
                Level
                <input
                  type="number"
                  min={0}
                  max={f.maxLevel}
                  defaultValue={f.level}
                  key={f.level}
                  onBlur={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!Number.isNaN(v) && v !== f.level)
                      saveFanLevel(
                        f.characterId,
                        Math.max(0, Math.min(v, f.maxLevel)),
                      );
                  }}
                  className="w-16 rounded border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-right text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
                />
                <span className="text-[var(--muted)]">/{f.maxLevel}</span>
              </label>
              <span className="w-4 text-xs text-[var(--accent)]">
                {savingCharId === f.characterId ? "…" : ""}
              </span>
            </div>
          ))}
          </div>
        </div>
      )}

      {tab === "other" && (
        <div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search honors…"
            className="w-full max-w-xs rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
          />
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
        </div>

        <div className="mt-3 flex flex-col gap-3">
          {filtered.map((h) => (
            <div
              key={h.id}
              className="flex items-center gap-4 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={honorImageUrl(h.assetbundleName)}
                alt=""
                className="h-16 w-32 flex-shrink-0 rounded-lg bg-[var(--panel)] object-contain"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.visibility = "hidden";
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-semibold text-[var(--text)]">
                  {h.name}
                </div>
                {h.groupName && (
                  <div className="truncate text-xs text-[var(--muted)]">
                    {h.groupName}
                  </div>
                )}
              </div>
              {h.owned && (
                <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                  Lvl
                  <input
                    type="number"
                    min={1}
                    defaultValue={h.level ?? 1}
                    key={h.level}
                    onBlur={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!Number.isNaN(v) && v !== h.level)
                        save(h.id, { owned: true, level: v });
                    }}
                    className="w-16 rounded border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-right text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
                  />
                </label>
              )}
              <button
                onClick={() => save(h.id, { owned: !h.owned, level: h.level ?? 1 })}
                className="rounded-md border px-3 py-1.5 text-xs font-semibold transition"
                style={{
                  background: h.owned ? "var(--accent)" : "transparent",
                  borderColor: h.owned ? "var(--accent)" : "var(--line)",
                  color: h.owned ? "#0c0a1e" : "var(--muted)",
                }}
              >
                {h.owned ? "Owned" : "Not owned"}
              </button>
              <span className="w-4 text-xs text-[var(--accent)]">
                {savingId === h.id ? "…" : ""}
              </span>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="py-6 text-center text-sm text-[var(--muted)]">
              No honors match this filter.
            </p>
          )}
        </div>
        </div>
      )}
    </div>
  );
}
