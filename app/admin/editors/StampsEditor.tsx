// app/admin/editors/StampsEditor.tsx
// Same grid/filter layout as the frontend's StampsSection, but clicking a
// stamp toggles ownership instead of just displaying it.
"use client";

import { useEffect, useState } from "react";
import { charaIcon, stampUrl } from "@/app/profile/images";
import { UNIT_ORDER } from "@/app/profile/types";
import { gql } from "./gql";

type AdminChar = { characterId: number; name: string; unit: string };
type StampItem = {
  id: number;
  name: string;
  assetbundleName: string;
  characterId: number | null;
  isDuo: boolean;
  owned: boolean;
};

export default function StampsEditor() {
  const [chars, setChars] = useState<AdminChar[] | null>(null);
  const [stamps, setStamps] = useState<StampItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [charFilter, setCharFilter] = useState<number | "all">("all");
  const [ownFilter, setOwnFilter] = useState<"all" | "owned" | "missing">("all");
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    gql(
      `{
        adminCharacters { characterId name unit }
        stampList { id name assetbundleName characterId isDuo owned }
      }`,
    )
      .then((d) => {
        setChars(d.adminCharacters);
        setStamps(d.stampList);
      })
      .catch((e) => setError(String(e.message ?? e)));
  }, []);

  async function toggle(stampId: number, owned: boolean) {
    setSavingId(stampId);
    setStamps(
      (prev) => prev?.map((s) => (s.id === stampId ? { ...s, owned } : s)) ?? prev,
    );
    try {
      await gql(
        `mutation($id:Int!,$owned:Boolean!){ setStampEdit(stampId:$id, owned:$owned){ id } }`,
        { id: stampId, owned },
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
  if (!chars || !stamps) return <p className="text-sm text-[var(--muted)]">Loading…</p>;

  const filtered = stamps.filter((s) => {
    if (charFilter !== "all" && s.characterId !== charFilter) return false;
    if (ownFilter === "owned" && !s.owned) return false;
    if (ownFilter === "missing" && s.owned) return false;
    return true;
  });
  const ownedCount = stamps.filter((s) => s.owned).length;

  const orderedChars = [...chars].sort((a, b) => {
    const ua = UNIT_ORDER.indexOf(a.unit ?? "");
    const ub = UNIT_ORDER.indexOf(b.unit ?? "");
    return ua - ub || a.characterId - b.characterId;
  });

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
        <div className="ml-auto flex items-center gap-2">
          <div className="h-2 w-28 overflow-hidden rounded-full bg-[var(--panel)]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${stamps.length ? Math.round((ownedCount / stamps.length) * 100) : 0}%`,
                background: "var(--accent)",
              }}
            />
          </div>
          <span className="text-[12px] font-bold text-[var(--text)]">
            {ownedCount}/{stamps.length}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setCharFilter("all")}
          className="rounded-full border px-3 py-1.5 text-[12px] font-bold transition"
          style={{
            background: charFilter === "all" ? "var(--accent)" : "var(--panel-2)",
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

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
        {filtered.map((s) => (
          <button
            key={s.id}
            onClick={() => toggle(s.id, !s.owned)}
            title={s.name}
            className="relative aspect-square overflow-hidden rounded-xl border p-1.5 transition"
            style={{
              borderColor: s.owned ? "var(--line)" : "#2a2e4a",
              background: "var(--panel-2)",
              opacity: savingId === s.id ? 0.5 : 1,
            }}
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
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-8 text-center text-[13px] text-[var(--muted)]">
            No stamps match this filter.
          </div>
        )}
      </div>
    </div>
  );
}
