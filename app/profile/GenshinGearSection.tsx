// app/profile/GenshinGearSection.tsx
// Read-only browse of the full artifact/weapon inventory (equipped + benched)
// imported from a .GOOD scan — see app/api/genshin/import-good/route.ts and
// the admin upload area in app/admin/editors/GenshinEditor.tsx. Distinct from
// the "Characters" tab, which only shows HoYoLAB's equipped-only sync.
"use client";

import { useState, useEffect } from "react";

type WeaponItem = {
  id: number;
  level: number;
  ascension: number;
  refinement: number;
  lock: boolean;
  location: string | null;
  weapon: { id: number; name: string; icon: string; rarity: number; weaponType: string };
};

type ArtifactItem = {
  id: number;
  slotKey: string;
  level: number;
  rarity: number;
  lock: boolean;
  location: string | null;
  mainStatKey: string;
  substats: { key: string; value: number }[];
  set: { id: number; name: string; icon: string; rarity: number; onePiece: string | null; twoPiece: string | null; fourPiece: string | null };
};

const RARITY_COLOR: Record<number, string> = {
  5: "#c9a24b",
  4: "#a25ce0",
  3: "#5c8ce0",
  2: "#5cc06e",
  1: "#8a8a8a",
};

function RarityStars({ rarity }: { rarity: number }) {
  return (
    <span style={{ color: RARITY_COLOR[rarity] ?? "var(--muted)" }} className="text-[11px]">
      {"★".repeat(Math.max(0, rarity))}
    </span>
  );
}

let WEAPON_CACHE: WeaponItem[] | null = null;
let ARTIFACT_CACHE: ArtifactItem[] | null = null;

export default function GenshinGearSection() {
  const [tab, setTab] = useState<"weapons" | "artifacts">("weapons");
  const [weapons, setWeapons] = useState<WeaponItem[] | null>(WEAPON_CACHE);
  const [artifacts, setArtifacts] = useState<ArtifactItem[] | null>(ARTIFACT_CACHE);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `{
          genshinWeaponInventory {
            id level ascension refinement lock location
            weapon { id name icon rarity weaponType }
          }
          genshinArtifactInventory {
            id slotKey level rarity lock location mainStatKey
            substats { key value }
            set { id name icon rarity onePiece twoPiece fourPiece }
          }
        }`,
      }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        const w = j?.data?.genshinWeaponInventory;
        const a = j?.data?.genshinArtifactInventory;
        if (Array.isArray(w) && Array.isArray(a)) {
          WEAPON_CACHE = w;
          ARTIFACT_CACHE = a;
          setWeapons(w);
          setArtifacts(a);
        } else setError(true);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error)
    return <div className="py-12 text-center text-[var(--muted)]">Couldn&apos;t load gear.</div>;
  if (!weapons || !artifacts)
    return <div className="py-12 text-center text-[var(--muted)]">Loading…</div>;

  if (weapons.length === 0 && artifacts.length === 0) {
    return (
      <div className="py-12 text-center text-[var(--muted)]">
        No gear imported yet — upload a .GOOD file from the admin Genshin editor.
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const filteredWeapons = weapons.filter((w) => w.weapon.name.toLowerCase().includes(q));
  const filteredArtifacts = artifacts.filter(
    (a) => a.set.name.toLowerCase().includes(q) || a.slotKey.toLowerCase().includes(q),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full border border-[var(--line)] bg-[var(--panel-2)] p-0.5 text-[11px] font-semibold">
          {(
            [
              ["weapons", `Weapons (${weapons.length})`],
              ["artifacts", `Artifacts (${artifacts.length})`],
            ] as [typeof tab, string][]
          ).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setTab(v)}
              className="rounded-full px-3 py-1 transition"
              style={{
                background: tab === v ? "var(--accent)" : "transparent",
                color: tab === v ? "#0c0a1e" : "var(--muted)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tab === "weapons" ? "Search weapons…" : "Search artifact sets…"}
          className="ml-auto w-full max-w-xs rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
        />
      </div>

      {tab === "weapons" && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
          {filteredWeapons.map((w) => (
            <div
              key={w.id}
              className="flex flex-col items-center gap-1 rounded-xl border p-2.5 text-center"
              style={{ borderColor: "var(--line)", background: "var(--panel-2)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={w.weapon.icon}
                alt={w.weapon.name}
                className="h-14 w-14 rounded-lg object-cover"
                loading="lazy"
              />
              <span className="w-full truncate text-[11px] font-bold text-[var(--text)]">
                {w.weapon.name}
              </span>
              <RarityStars rarity={w.weapon.rarity} />
              <span className="text-[10px] text-[var(--muted)]">
                Lv{w.level} · R{w.refinement}
              </span>
              {w.location && (
                <span className="truncate text-[9px] text-[var(--accent)]">{w.location}</span>
              )}
              {w.lock && <span className="text-[9px] text-[var(--muted)]">🔒</span>}
            </div>
          ))}
          {filteredWeapons.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-[var(--muted)]">
              No weapons match &quot;{query}&quot;.
            </p>
          )}
        </div>
      )}

      {tab === "artifacts" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {filteredArtifacts.map((a) => (
            <div
              key={a.id}
              className="flex flex-col items-center gap-1 rounded-xl border p-2.5 text-center"
              style={{ borderColor: "var(--line)", background: "var(--panel-2)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.set.icon}
                alt={a.set.name}
                className="h-14 w-14 rounded-lg object-cover"
                loading="lazy"
              />
              <span className="w-full truncate text-[11px] font-bold text-[var(--text)]">
                {a.set.name}
              </span>
              <RarityStars rarity={a.rarity} />
              <span className="text-[10px] uppercase text-[var(--muted)]">
                {a.slotKey} · +{a.level}
              </span>
              <span className="text-[10px] text-[var(--muted)]">{a.mainStatKey}</span>
              <div className="flex flex-col gap-0.5">
                {a.substats.map((s, i) => (
                  <span key={i} className="text-[9px] text-[var(--muted)]">
                    {s.key} +{s.value}
                  </span>
                ))}
              </div>
              {a.location && (
                <span className="truncate text-[9px] text-[var(--accent)]">{a.location}</span>
              )}
              {a.lock && <span className="text-[9px] text-[var(--muted)]">🔒</span>}
            </div>
          ))}
          {filteredArtifacts.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-[var(--muted)]">
              No artifacts match &quot;{query}&quot;.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
