// app/profile/AnimeLibrarySection.tsx
// Read-only browse of the anime/manga/light novel library (added via the
// admin panel by pasting a MAL URL — see app/admin/editors/AnimeEditor.tsx).
"use client";

import { useState, useEffect } from "react";

type AnimeEntry = {
  id: number;
  title: string;
  image: string;
  synopsis: string | null;
  url: string;
  mediaType: string;
  status: string;
  parentId: number | null;
  createdAt: string;
};

const STATUSES = ["Watching", "Caught Up", "Finished", "Waitlist"] as const;

let ANIME_CACHE: AnimeEntry[] | null = null;

export default function AnimeLibrarySection() {
  const [entries, setEntries] = useState<AnimeEntry[] | null>(ANIME_CACHE);
  const [error, setError] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | "all">("all");
  const [typeFilter, setTypeFilter] = useState<string | "all">("all");
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `{ animeEntries { id title image synopsis url mediaType status parentId createdAt } }`,
      }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        const list = j?.data?.animeEntries;
        if (Array.isArray(list)) {
          ANIME_CACHE = list;
          setEntries(list);
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
        Couldn&apos;t load the library.
      </div>
    );
  if (!entries)
    return <div className="py-12 text-center text-[var(--muted)]">Loading…</div>;
  if (entries.length === 0)
    return (
      <div className="py-12 text-center text-[var(--muted)]">
        Nothing added yet — pick some up in the admin panel.
      </div>
    );

  const types = Array.from(new Set(entries.map((e) => e.mediaType))).sort();
  const topLevel = entries.filter((e) => e.parentId == null);
  const seasonsOf = (id: number) => entries.filter((e) => e.parentId === id);
  const filtered = topLevel.filter((e) => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (typeFilter !== "all" && e.mediaType !== typeFilter) return false;
    return true;
  });
  const selectedEntry = topLevel.find((e) => e.id === selected) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full border border-[var(--line)] bg-[var(--panel-2)] p-0.5 text-[11px] font-semibold">
          {(["all", ...STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="rounded-full px-2.5 py-1 transition"
              style={{
                background: statusFilter === s ? "var(--accent)" : "transparent",
                color: statusFilter === s ? "#0c0a1e" : "var(--muted)",
              }}
            >
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>

        <div className="inline-flex flex-wrap gap-1 rounded-full border border-[var(--line)] bg-[var(--panel-2)] p-0.5 text-[11px] font-semibold">
          <button
            onClick={() => setTypeFilter("all")}
            className="rounded-full px-2.5 py-1 transition"
            style={{
              background: typeFilter === "all" ? "var(--accent)" : "transparent",
              color: typeFilter === "all" ? "#0c0a1e" : "var(--muted)",
            }}
          >
            All types
          </button>
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className="rounded-full px-2.5 py-1 transition"
              style={{
                background: typeFilter === t ? "var(--accent)" : "transparent",
                color: typeFilter === t ? "#0c0a1e" : "var(--muted)",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <span className="ml-auto text-[11px] text-[var(--muted)]">
          {filtered.length}/{topLevel.length}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {filtered.map((e) => {
          const seasonCount = seasonsOf(e.id).length;
          return (
            <button
              key={e.id}
              onClick={() => setSelected(e.id)}
              className="group flex flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel-2)] text-left transition hover:border-[var(--accent)]"
            >
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={e.image}
                  alt={e.title}
                  className="aspect-[2/3] w-full object-cover"
                  loading="lazy"
                />
                <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-bold text-white">
                  {e.status}
                </span>
                {seasonCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-bold text-white">
                    {seasonCount + 1} seasons
                  </span>
                )}
              </div>
              <div className="p-2">
                <div className="line-clamp-2 text-[11px] font-bold text-[var(--text)]">
                  {e.title}
                </div>
                <div className="mt-0.5 text-[9.5px] text-[var(--muted)]">
                  {e.mediaType}
                </div>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-[var(--muted)]">
            Nothing matches this filter.
          </p>
        )}
      </div>

      {selectedEntry && (
        <AnimeModal
          entry={selectedEntry}
          seasons={seasonsOf(selectedEntry.id)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function AnimeModal({
  entry,
  seasons,
  onClose,
}: {
  entry: AnimeEntry;
  seasons: AnimeEntry[];
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--panel-2)] text-lg leading-none text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--text)]"
        >
          ×
        </button>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={entry.image}
          alt={entry.title}
          className="w-[180px] flex-shrink-0 object-cover sm:w-[220px]"
        />

        <div className="flex min-w-0 flex-1 flex-col gap-3 p-5">
          <div>
            <h3 className="pr-8 text-lg font-extrabold text-[var(--text)]">
              {entry.title}
            </h3>
            <div className="mt-1 flex gap-2">
              <span className="rounded-full border border-[var(--line)] bg-[var(--panel-2)] px-2.5 py-0.5 text-[10.5px] font-bold text-[var(--muted)]">
                {entry.mediaType}
              </span>
              <span
                className="rounded-full px-2.5 py-0.5 text-[10.5px] font-bold text-[#0c0a1e]"
                style={{ background: "var(--accent)" }}
              >
                {entry.status}
              </span>
            </div>
          </div>

          {entry.synopsis && (
            <p className="max-h-[240px] overflow-auto text-[13px] leading-relaxed text-[var(--muted)]">
              {entry.synopsis}
            </p>
          )}

          {seasons.length > 0 && (
            <div>
              <h4 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                Seasons
              </h4>
              <div className="flex flex-col gap-1.5">
                {seasons.map((s) => (
                  <a
                    key={s.id}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-2.5 py-1.5 text-[12px] font-semibold text-[var(--text)] transition hover:border-[var(--accent)]"
                  >
                    <span className="truncate">{s.title}</span>
                    <span className="ml-2 flex-shrink-0 text-[10.5px] font-bold text-[var(--muted)]">
                      {s.status}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <a
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto self-start rounded-full border border-[var(--line)] bg-[var(--panel-2)] px-3.5 py-1.5 text-[12px] font-bold text-[var(--text)] transition hover:border-[var(--accent)]"
          >
            View on MyAnimeList ↗
          </a>
        </div>
      </div>
    </div>
  );
}
