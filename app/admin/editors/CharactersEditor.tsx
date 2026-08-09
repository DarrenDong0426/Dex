// app/admin/editors/CharactersEditor.tsx
// Lists all characters; edit favorite tier (Oshi / Favorite / HM / none) and
// character rank inline. Saves via GraphQL mutation.
"use client";

import { useEffect, useState } from "react";
import { charaIcon } from "@/app/profile/images";
import { gql } from "./gql";

type AdminChar = {
  characterId: number;
  name: string;
  unit: string;
  characterRank: number;
  favoriteTier: number | null;
};

const TIERS: { value: number | null; label: string }[] = [
  { value: null, label: "—" },
  { value: 1, label: "Oshi" },
  { value: 2, label: "Favorite" },
  { value: 3, label: "HM" },
];

export default function CharactersEditor() {
  const [chars, setChars] = useState<AdminChar[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    gql(
      `{ adminCharacters { characterId name unit characterRank favoriteTier } }`,
    )
      .then((d) => setChars(d.adminCharacters))
      .catch((e) => setError(String(e.message ?? e)));
  }, []);

  async function save(
    characterId: number,
    patch: { favoriteTier?: number | null; characterRank?: number },
  ) {
    setSavingId(characterId);
    setChars(
      (prev) =>
        prev?.map((c) =>
          c.characterId === characterId ? { ...c, ...patch } : c,
        ) ?? prev,
    );
    try {
      await gql(
        `mutation($id:Int!,$tier:Int,$rank:Int){
           setCharacterEdit(characterId:$id, favoriteTier:$tier, characterRank:$rank){ characterId }
         }`,
        {
          id: characterId,
          tier: patch.favoriteTier ?? null,
          rank: patch.characterRank,
        },
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
  if (!chars) return <p className="text-sm text-[var(--muted)]">Loading…</p>;

  const filtered = chars.filter((c) =>
    c.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search characters…"
        className="w-full max-w-xs rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
      />
      <div className="flex flex-col gap-2">
        {filtered.map((c) => (
          <div
            key={c.characterId}
            className="flex items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={charaIcon(c.name)}
              alt=""
              className="h-9 w-9 rounded-full border border-[var(--line)] object-cover"
              loading="lazy"
            />
            <span className="w-40 truncate text-sm font-semibold text-[var(--text)]">
              {c.name}
            </span>

            {/* favorite tier segmented control */}
            <div className="inline-flex overflow-hidden rounded-md border border-[var(--line)]">
              {TIERS.map((t) => {
                const on = c.favoriteTier === t.value;
                return (
                  <button
                    key={String(t.value)}
                    onClick={() => save(c.characterId, { favoriteTier: t.value })}
                    className="px-2.5 py-1 text-xs font-semibold transition"
                    style={{
                      background: on ? "var(--accent)" : "transparent",
                      color: on ? "#0c0a1e" : "var(--muted)",
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* rank */}
            <label className="ml-auto flex items-center gap-1.5 text-xs text-[var(--muted)]">
              Rank
              <input
                type="number"
                min={0}
                defaultValue={c.characterRank}
                onBlur={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!Number.isNaN(v) && v !== c.characterRank)
                    save(c.characterId, { characterRank: v });
                }}
                className="w-16 rounded border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-right text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
            </label>

            <span className="w-4 text-xs text-[var(--accent)]">
              {savingId === c.characterId ? "…" : ""}
            </span>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-[var(--muted)]">
            No characters match &quot;{query}&quot;.
          </p>
        )}
      </div>
    </div>
  );
}
