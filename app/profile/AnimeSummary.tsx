// app/profile/AnimeSummary.tsx
// Anime tab's Summary view — three columns: favorited titles, what's
// actively being watched right now, and what's queued up next. Scoped to
// mediaType "Anime" only (not Manga/Light Novel) since "watching"/"queue"
// language doesn't apply to reading.
//
// Only top-level titles (parentId == null) are ever listed here — a season
// never appears as its own row. Currently Watching rolls up a franchise's
// *effective* status from whatever's going on with its seasons/movies
// (Watching beats Caught Up beats Waitlist beats Finished), so e.g. one
// season being actively watched surfaces the whole franchise even though
// the parent's own status field might still say something else. Next in
// Queue is NOT auto-derived from status — it's an explicit isQueued flag
// set from the admin board, so which Waitlist titles actually show here is
// a deliberate choice, not just "everything not started yet."
"use client";

import { useState, useEffect } from "react";

export type AnimeEntry = {
  id: number;
  title: string;
  image: string;
  url: string;
  mediaType: string;
  status: string;
  isFavorite: boolean;
  isQueued: boolean;
  parentId: number | null;
  createdAt: string;
};

let ANIME_SUMMARY_CACHE: AnimeEntry[] | null = null;

// most "active" wins when rolling a franchise's seasons/movies up into one
// effective status for its parent. Exported so ProfileClient's header stat
// row (quickStats) counts by the same rolled-up status this component's
// three columns use — otherwise the two could disagree on what counts as
// e.g. "Watching" for a franchise with mixed-status seasons.
export const STATUS_PRIORITY = ["Watching", "Caught Up", "Waitlist", "Finished"];

export function effectiveStatus(entry: AnimeEntry, seasons: AnimeEntry[]): string {
  if (seasons.length === 0) return entry.status;
  const statuses = new Set(seasons.map((s) => s.status));
  for (const s of STATUS_PRIORITY) {
    if (statuses.has(s)) return s;
  }
  return entry.status;
}

export default function AnimeSummary() {
  const [entries, setEntries] = useState<AnimeEntry[] | null>(ANIME_SUMMARY_CACHE);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `{ animeEntries { id title image url mediaType status isFavorite isQueued parentId createdAt } }`,
      }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        const list = j?.data?.animeEntries;
        if (Array.isArray(list)) {
          ANIME_SUMMARY_CACHE = list;
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
      <div className="py-8 text-center text-[var(--muted)]">
        Couldn&apos;t load the anime summary.
      </div>
    );
  if (!entries)
    return <div className="py-8 text-center text-[var(--muted)]">Loading…</div>;

  const anime = entries.filter((e) => e.mediaType === "Anime");
  const topLevel = anime.filter((e) => e.parentId == null);
  const seasonsOf = (id: number) => anime.filter((e) => e.parentId === id);

  const favorites = topLevel.filter((e) => e.isFavorite);
  const withStatus = topLevel.map((e) => ({
    ...e,
    effectiveStatus: effectiveStatus(e, seasonsOf(e.id)),
  }));
  // both already come pre-sorted by the animeEntries query (admin's manual
  // drag order first, newest-first for anything untouched) — no re-sort
  // needed here, that would just discard the admin-set order
  const watching = withStatus.filter((e) => e.effectiveStatus === "Watching");
  // explicitly pinned from the admin board — not just "anything Waitlist"
  const queue = topLevel.filter((e) => e.isQueued);

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
      <SummaryColumn
        title="Top Favorites"
        entries={favorites}
        emptyText="No favorites yet — star some in the admin panel."
      />
      <SummaryColumn
        title="Currently Watching"
        entries={watching}
        cap={5}
        emptyText="Nothing in progress right now."
      />
      <SummaryColumn
        title="Next in Queue"
        entries={queue}
        cap={5}
        emptyText="Nothing pinned to the queue yet — pin some in the admin panel."
      />
    </div>
  );
}

function SummaryColumn({
  title,
  entries,
  cap,
  emptyText,
}: {
  title: string;
  entries: AnimeEntry[];
  cap?: number;
  emptyText: string;
}) {
  const shown = cap ? entries.slice(0, cap) : entries;
  const remaining = entries.length - shown.length;

  return (
    <div>
      <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-[var(--muted)]">
        {title}
      </h2>
      <div className="flex flex-col gap-2">
        {shown.map((e) => (
          <a
            key={e.id}
            href={e.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-2 transition hover:border-[var(--accent)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={e.image}
              alt={e.title}
              className="h-14 w-11 flex-shrink-0 rounded-md object-cover"
            />
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--text)]">
              {e.title}
            </span>
          </a>
        ))}
        {shown.length === 0 && (
          <p className="text-[12px] text-[var(--muted)]">{emptyText}</p>
        )}
        {remaining > 0 && (
          <p className="text-[11px] text-[var(--muted)]">
            +{remaining} more in the Library tab
          </p>
        )}
      </div>
    </div>
  );
}
