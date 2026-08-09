// app/profile/StampsSection.tsx
"use client";

import { useState, useEffect } from "react";
import type { CharacterSummary, StampItem } from "./types";
import { UNIT_ORDER } from "./types";
import { charaIcon, stampUrl } from "./images";

let STAMP_CACHE: StampItem[] | null = null;

export default function StampsSection({
  characters,
}: {
  characters: CharacterSummary[];
}) {
  const [stamps, setStamps] = useState<StampItem[] | null>(STAMP_CACHE);
  const [error, setError] = useState(false);
  const [charFilter, setCharFilter] = useState<number | "all">("all");
  const [ownFilter, setOwnFilter] = useState<"all" | "owned" | "missing">(
    "all",
  );
  const [typeFilter, setTypeFilter] = useState<"all" | "single" | "duo">("all");

  useEffect(() => {
    if (STAMP_CACHE) return;
    let cancelled = false;
    fetch("/api/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `{ stampList { id name assetbundleName characterId isDuo owned } }`,
      }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        const list = j?.data?.stampList;
        if (Array.isArray(list)) {
          STAMP_CACHE = list;
          setStamps(list);
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
        Couldn&apos;t load stamps.
      </div>
    );
  if (!stamps)
    return (
      <div className="py-12 text-center text-[var(--muted)]">Loading…</div>
    );

  const filtered = stamps.filter((s) => {
    if (charFilter !== "all" && s.characterId !== charFilter) return false;
    if (ownFilter === "owned" && !s.owned) return false;
    if (ownFilter === "missing" && s.owned) return false;
    if (typeFilter === "single" && s.isDuo) return false;
    if (typeFilter === "duo" && !s.isDuo) return false;
    return true;
  });

  // completion reflects char + type scope (not the ownership toggle), so it
  // always shows true progress even when viewing "Missing"
  const scope = stamps.filter((s) => {
    if (charFilter !== "all" && s.characterId !== charFilter) return false;
    if (typeFilter === "single" && s.isDuo) return false;
    if (typeFilter === "duo" && !s.isDuo) return false;
    return true;
  });
  const ownedCount = scope.filter((s) => s.owned).length;
  const pct = scope.length ? Math.round((ownedCount / scope.length) * 100) : 0;

  // characters ordered by unit for the filter bar
  const orderedChars = [...characters].sort((a, b) => {
    const ua = UNIT_ORDER.indexOf(a.unit ?? "");
    const ub = UNIT_ORDER.indexOf(b.unit ?? "");
    return ua - ub || a.characterId - b.characterId;
  });

  return (
    <div className="flex flex-col gap-4">
      {/* ownership + type toggles */}
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
              ["all", "All"],
              ["single", "Single"],
              ["duo", "Double"],
            ] as [typeof typeFilter, string][]
          ).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setTypeFilter(v)}
              className="rounded-full px-2.5 py-1 transition"
              style={{
                background: typeFilter === v ? "var(--accent)" : "transparent",
                color: typeFilter === v ? "#0c0a1e" : "var(--muted)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* completion */}
        <div className="ml-auto flex items-center gap-2">
          <div className="h-2 w-28 overflow-hidden rounded-full bg-[var(--panel-2)]">
            <div
              className="h-full rounded-full"
              style={{ width: `${pct}%`, background: "var(--accent)" }}
            />
          </div>
          <span className="text-[12px] font-bold text-[var(--text)]">
            {ownedCount}/{scope.length}
          </span>
        </div>
      </div>

      {/* character filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setCharFilter("all")}
          className="rounded-full border px-3 py-1.5 text-[12px] font-bold transition"
          style={{
            background:
              charFilter === "all" ? "var(--accent)" : "var(--panel-2)",
            color: charFilter === "all" ? "#0c0a1e" : "var(--muted)",
            borderColor: charFilter === "all" ? "var(--accent)" : "var(--line)",
          }}
        >
          All
        </button>
        {orderedChars.map((c) => {
          const on = charFilter === c.characterId;
          return (
            <button
              key={c.characterId}
              onClick={() => setCharFilter(c.characterId)}
              className="flex items-center rounded-full border p-0.5 transition"
              style={{
                borderColor: on ? "var(--accent)" : "var(--line)",
                background: on ? "var(--panel-2)" : "transparent",
                boxShadow: on ? "0 0 12px -4px var(--accent)" : undefined,
              }}
              title={c.name}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={charaIcon(c.name)}
                alt={c.name}
                className="h-8 w-8 rounded-full object-cover"
                style={{ opacity: on ? 1 : 0.6 }}
                loading="lazy"
              />
            </button>
          );
        })}
      </div>

      {/* stamp grid */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
        {filtered.map((s) => (
          <div
            key={s.id}
            className="relative aspect-square overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-1.5"
            title={s.name}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={stampUrl(s.assetbundleName)}
              alt={s.name}
              className="h-full w-full object-contain"
              style={{
                filter: s.owned ? undefined : "grayscale(1) brightness(0.4)",
              }}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.visibility = "hidden";
              }}
            />
            {!s.owned && (
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  width="20"
                  height="20"
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
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-8 text-center text-[13px] text-[var(--muted)]">
            No stamps.
          </div>
        )}
      </div>
    </div>
  );
}
