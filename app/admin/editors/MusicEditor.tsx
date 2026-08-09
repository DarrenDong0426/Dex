// app/admin/editors/MusicEditor.tsx
// One row per song: jacket + favorite star + title + a pill per difficulty
// that cycles through play result (— → Clear → Full Combo → All Perfect).
// Favoriting here is what drives the frontend Summary tab's top-songs stack.
"use client";

import { useEffect, useState } from "react";
import { jacketUrl } from "@/app/profile/images";
import { DIFFICULTY_ORDER, DIFFICULTY_COLORS } from "@/app/profile/types";
import { gql } from "./gql";

type MusicResult = { difficulty: string; playResult: string | null };
type MusicSong = {
  id: number;
  title: string;
  assetbundleName: string;
  results: MusicResult[];
  favorite: boolean;
};

const RESULT_CYCLE: (string | null)[] = [
  null,
  "CLEAR",
  "FULL_COMBO",
  "FULL_PERFECT",
];
const RESULT_LABEL: Record<string, string> = {
  CLEAR: "C",
  FULL_COMBO: "FC",
  FULL_PERFECT: "AP",
};
const RESULT_COLOR: Record<string, string> = {
  CLEAR: "#c8955a",
  FULL_COMBO: "#4a9de0",
};
// same rainbow treatment as the frontend's LevelPip for Full Perfect
const FULL_PERFECT_GRADIENT =
  "linear-gradient(135deg, #ff5f6d, #ffc371, #47e5bc, #4a9de0, #9b5ad6)";

export default function MusicEditor() {
  const [songs, setSongs] = useState<MusicSong[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    gql(
      `{ musicList { id title assetbundleName favorite results { difficulty playResult } } }`,
    )
      .then((d) => setSongs(d.musicList))
      .catch((e) => setError(String(e.message ?? e)));
  }, []);

  async function toggleFavorite(musicId: number, favorite: boolean) {
    setSavingKey(`fav:${musicId}`);
    setSongs(
      (prev) => prev?.map((s) => (s.id === musicId ? { ...s, favorite } : s)) ?? prev,
    );
    try {
      await gql(
        `mutation($id:Int!,$fav:Boolean!){ setSongFavorite(musicId:$id, favorite:$fav){ musicId } }`,
        { id: musicId, fav: favorite },
      );
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setSavingKey(null);
    }
  }

  async function cycle(musicId: number, difficulty: string, current: string | null) {
    const idx = RESULT_CYCLE.indexOf(current);
    const next = RESULT_CYCLE[(idx + 1) % RESULT_CYCLE.length];
    const key = `${musicId}:${difficulty}`;
    setSavingKey(key);
    setSongs(
      (prev) =>
        prev?.map((s) =>
          s.id !== musicId
            ? s
            : {
                ...s,
                results: s.results.map((r) =>
                  r.difficulty === difficulty ? { ...r, playResult: next } : r,
                ),
              },
        ) ?? prev,
    );
    try {
      await gql(
        `mutation($id:Int!,$diff:String!,$res:String){
           setMusicResult(musicId:$id, difficulty:$diff, playResult:$res){ difficulty }
         }`,
        { id: musicId, diff: difficulty, res: next },
      );
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setSavingKey(null);
    }
  }

  if (error)
    return (
      <p className="text-sm text-[var(--accent-2)]">Couldn&apos;t load: {error}</p>
    );
  if (!songs) return <p className="text-sm text-[var(--muted)]">Loading…</p>;

  const filtered = songs.filter((s) =>
    s.title.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search songs…"
        className="w-full max-w-xs rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
      />
      <div className="flex flex-col gap-3">
        {filtered.map((s) => {
          const byDiff = new Map(s.results.map((r) => [r.difficulty, r.playResult]));
          return (
            <div
              key={s.id}
              className="flex items-center gap-4 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={jacketUrl(s.assetbundleName)}
                alt=""
                className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                loading="lazy"
              />
              <button
                onClick={() => toggleFavorite(s.id, !s.favorite)}
                title={s.favorite ? "Unfavorite" : "Favorite"}
                className="flex-shrink-0 text-2xl leading-none transition"
                style={{
                  color: s.favorite ? "#f0d15a" : "var(--line)",
                  opacity: savingKey === `fav:${s.id}` ? 0.5 : 1,
                }}
              >
                {s.favorite ? "★" : "☆"}
              </button>
              <span className="w-56 truncate text-base font-semibold text-[var(--text)]">
                {s.title}
              </span>
              <div className="ml-auto flex gap-1.5">
                {DIFFICULTY_ORDER.map((d) => {
                  if (!byDiff.has(d)) {
                    // no chart at this difficulty — blank slot keeps every
                    // row's columns aligned instead of shifting left
                    return <div key={d} className="h-10 w-14" />;
                  }
                  const result = byDiff.get(d) ?? null;
                  const isFP = result === "FULL_PERFECT";
                  const saving = savingKey === `${s.id}:${d}`;
                  return (
                    <button
                      key={d}
                      onClick={() => cycle(s.id, d, result)}
                      title={`${d}: ${result ?? "no result"} (click to change)`}
                      className="flex h-10 w-14 items-center justify-center rounded-lg text-xs font-bold transition"
                      style={{
                        background: isFP
                          ? FULL_PERFECT_GRADIENT
                          : result
                            ? RESULT_COLOR[result]
                            : "var(--panel)",
                        color: result ? "#0c0a1e" : DIFFICULTY_COLORS[d],
                        border: `1px solid ${isFP ? "transparent" : DIFFICULTY_COLORS[d]}`,
                        boxShadow: isFP
                          ? "0 0 10px 1px rgba(155,90,214,0.6)"
                          : undefined,
                        opacity: saving ? 0.5 : 1,
                      }}
                    >
                      {result ? RESULT_LABEL[result] : d.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-[var(--muted)]">
            No songs match &quot;{query}&quot;.
          </p>
        )}
      </div>
    </div>
  );
}
