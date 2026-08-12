// app/admin/editors/AnimeEditor.tsx
// A single drag-driven board: every title (and every season/movie under it)
// is its own card in one of four status columns. Everything is draggable —
// between columns to change status, within a column to reorder, or onto
// another card to link it as that title's season/movie (replaces a
// dropdown picker entirely).
//
// Search a title (or paste a MyAnimeList URL) to add it — title, cover art,
// and synopsis are pulled from AniList (graphql.anilist.co, a free public
// API keyed to MAL ids) at add-time. Dex never syncs an actual MAL/AniList
// account.
//
// "Next in Queue" on the Summary tab is a deliberate pin (isQueued), not
// just "everything Waitlist" — the 📌 toggle on Waitlist cards controls it.
"use client";

import { useEffect, useState } from "react";
import { gql } from "./gql";

type AnimeEntry = {
  id: number;
  title: string;
  image: string;
  synopsis: string | null;
  url: string;
  mediaType: string;
  status: string;
  isFavorite: boolean;
  isQueued: boolean;
  queueOrder: number | null;
  parentId: number | null;
  createdAt: string;
};

type SearchResult = {
  malId: number;
  title: string;
  image: string;
  mediaType: string;
};

const COLUMNS = ["Watching", "Caught Up", "Waitlist", "Finished"] as const;

function byQueueOrder(a: AnimeEntry, b: AnimeEntry): number {
  if (a.queueOrder != null && b.queueOrder != null) return a.queueOrder - b.queueOrder;
  if (a.queueOrder != null) return -1;
  if (b.queueOrder != null) return 1;
  return Number(a.createdAt) - Number(b.createdAt);
}

export default function AnimeEditor() {
  const [entries, setEntries] = useState<AnimeEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  const [searchKind, setSearchKind] = useState<"anime" | "manga">("anime");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [showUrlPaste, setShowUrlPaste] = useState(false);
  const [malUrl, setMalUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [dragId, setDragId] = useState<number | null>(null);

  function load() {
    gql(
      `{ animeEntries { id title image synopsis url mediaType status isFavorite isQueued queueOrder parentId createdAt } }`,
    )
      .then((d) => setEntries(d.animeEntries))
      .catch((e) => setError(String(e.message ?? e)));
  }

  useEffect(load, []);

  // debounced live search
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(null);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      gql(`query($q:String!,$kind:String!){ animeSearch(query:$q, kind:$kind){ malId title image mediaType } }`, {
        q,
        kind: searchKind,
      })
        .then((d) => setResults(d.animeSearch))
        .catch((e) => setAddError(String(e.message ?? e)))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [query, searchKind]);

  async function addFromSearch(malId: number, kind: "anime" | "manga") {
    setAddingId(malId);
    setAddError(null);
    try {
      await gql(`mutation($malId:Int!,$kind:String!){ addAnimeEntryById(malId:$malId, kind:$kind){ id } }`, {
        malId,
        kind,
      });
      setQuery("");
      setResults(null);
      load();
    } catch (e) {
      setAddError(String((e as Error).message ?? e));
    } finally {
      setAddingId(null);
    }
  }

  async function addEntry() {
    const url = malUrl.trim();
    if (!url) return;
    setAdding(true);
    setAddError(null);
    try {
      await gql(`mutation($url:String!){ addAnimeEntry(url:$url){ id } }`, { url });
      setMalUrl("");
      load();
    } catch (e) {
      setAddError(String((e as Error).message ?? e));
    } finally {
      setAdding(false);
    }
  }

  async function setStatus(id: number, status: string) {
    setEntries(
      (prev) =>
        prev?.map((e) =>
          e.id === id
            ? { ...e, status, queueOrder: null, isQueued: status === "Waitlist" ? e.isQueued : false }
            : e,
        ) ?? prev,
    );
    try {
      await gql(`mutation($id:Int!,$status:String!){ setAnimeStatus(id:$id, status:$status){ id } }`, {
        id,
        status,
      });
    } catch {
      load(); // revert on failure
    }
  }

  async function setFavorite(id: number, favorite: boolean) {
    setEntries(
      (prev) => prev?.map((e) => (e.id === id ? { ...e, isFavorite: favorite } : e)) ?? prev,
    );
    try {
      await gql(`mutation($id:Int!,$favorite:Boolean!){ setAnimeFavorite(id:$id, favorite:$favorite){ id } }`, {
        id,
        favorite,
      });
    } catch {
      load();
    }
  }

  async function setQueued(id: number, queued: boolean) {
    setEntries(
      (prev) => prev?.map((e) => (e.id === id ? { ...e, isQueued: queued } : e)) ?? prev,
    );
    try {
      await gql(`mutation($id:Int!,$queued:Boolean!){ setAnimeQueued(id:$id, queued:$queued){ id } }`, {
        id,
        queued,
      });
    } catch {
      load();
    }
  }

  async function setParent(id: number, parentId: number | null) {
    setEntries(
      (prev) => prev?.map((e) => (e.id === id ? { ...e, parentId } : e)) ?? prev,
    );
    try {
      await gql(`mutation($id:Int!,$parentId:Int){ setAnimeParent(id:$id, parentId:$parentId){ id } }`, {
        id,
        parentId,
      });
      load(); // linking can also change status (inherits from parent) — resync
    } catch (e) {
      setAddError(String((e as Error).message ?? e));
      load();
    }
  }

  async function setQueueOrder(orderedIds: number[]) {
    setEntries((prev) => {
      if (!prev) return prev;
      const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
      return prev.map((e) =>
        orderMap.has(e.id) ? { ...e, queueOrder: orderMap.get(e.id)! } : e,
      );
    });
    try {
      await gql(`mutation($ids:[Int!]!){ setAnimeQueueOrder(orderedIds:$ids) }`, {
        ids: orderedIds,
      });
    } catch {
      load();
    }
  }

  async function remove(id: number) {
    setEntries((prev) => prev?.filter((e) => e.id !== id && e.parentId !== id) ?? prev);
    try {
      await gql(`mutation($id:Int!){ deleteAnimeEntry(id:$id) }`, { id });
    } catch {
      load();
    }
  }

  // dropping one card onto another: same column -> reorder that column;
  // different column -> link the dragged card as a season of the target
  function handleDropOnCard(target: AnimeEntry) {
    if (dragId == null || dragId === target.id || !entries) {
      setDragId(null);
      return;
    }
    const dragged = entries.find((e) => e.id === dragId);
    if (!dragged) {
      setDragId(null);
      return;
    }
    if (dragged.status === target.status) {
      const columnIds = entries
        .filter((e) => e.status === target.status)
        .sort(byQueueOrder)
        .map((e) => e.id);
      const from = columnIds.indexOf(dragId);
      const to = columnIds.indexOf(target.id);
      columnIds.splice(from, 1);
      columnIds.splice(to, 0, dragId);
      setQueueOrder(columnIds);
    } else {
      setParent(dragId, target.id);
    }
    setDragId(null);
  }

  // dropping onto empty column space (not a specific card) — just a status
  // change, appended to the end of that column
  function handleDropOnColumn(status: string) {
    if (dragId == null || !entries) return;
    const dragged = entries.find((e) => e.id === dragId);
    if (dragged && dragged.status !== status) {
      setStatus(dragId, status);
    }
    setDragId(null);
  }

  if (error)
    return <p className="text-sm text-[var(--accent-2)]">Couldn&apos;t load: {error}</p>;
  if (!entries) return <p className="text-sm text-[var(--muted)]">Loading…</p>;

  const titleById = new Map(entries.map((e) => [e.id, e.title]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border border-[var(--line)] bg-[var(--panel-2)] p-0.5 text-[11px] font-semibold">
            {(["anime", "manga"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setSearchKind(k)}
                className="rounded-full px-2.5 py-1 capitalize transition"
                style={{
                  background: searchKind === k ? "var(--accent)" : "transparent",
                  color: searchKind === k ? "#0c0a1e" : "var(--muted)",
                }}
              >
                {k === "manga" ? "Manga / Light Novel" : k}
              </button>
            ))}
          </div>
          <div className="relative w-full max-w-md">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${searchKind === "manga" ? "manga / light novels" : "anime"}…`}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
            />
            {results && results.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-80 overflow-auto rounded-lg border border-[var(--line)] bg-[var(--panel)] shadow-xl">
                {results.map((r) => (
                  <button
                    key={r.malId}
                    onClick={() => addFromSearch(r.malId, searchKind)}
                    disabled={addingId === r.malId}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-[var(--panel-2)] disabled:opacity-50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.image} alt="" className="h-10 w-8 flex-shrink-0 rounded object-cover" />
                    <span className="min-w-0 flex-1 truncate font-semibold text-[var(--text)]">
                      {r.title}
                    </span>
                    <span className="flex-shrink-0 text-[10px] font-bold uppercase text-[var(--muted)]">
                      {addingId === r.malId ? "Adding…" : r.mediaType}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {searching && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">
                Searching…
              </span>
            )}
          </div>
          <span className="text-xs text-[var(--muted)]">
            {entries.length} title{entries.length === 1 ? "" : "s"}
          </span>
        </div>

        <button
          onClick={() => setShowUrlPaste((v) => !v)}
          className="self-start text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--text)] hover:underline"
        >
          {showUrlPaste ? "Hide" : "Can't find it? Paste a MAL URL instead"}
        </button>
        {showUrlPaste && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={malUrl}
              onChange={(e) => setMalUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addEntry()}
              placeholder="Paste a MyAnimeList anime or manga URL…"
              className="w-full max-w-md rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
            />
            <button
              onClick={addEntry}
              disabled={adding || !malUrl.trim()}
              className="rounded-lg px-4 py-1.5 text-sm font-bold text-[#0c0a1e] transition disabled:opacity-50"
              style={{ background: "var(--accent)" }}
            >
              {adding ? "Adding…" : "Add"}
            </button>
          </div>
        )}
      </div>

      {addError && (
        <div className="rounded-lg border border-[var(--accent-2)] px-3 py-2 text-xs text-[var(--accent-2)]">
          {addError}
        </div>
      )}

      <p className="text-[11px] text-[var(--muted)]">
        Drag a card between columns to change status, within a column to reorder, or onto
        another card to link it as that title&apos;s season/movie. In the Waitlist column,
        use &quot;Show in Summary queue&quot; to pick which titles appear in Next in Queue —
        nothing shows there until you pick it.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = entries.filter((e) => e.status === col).sort(byQueueOrder);
          return (
            <BoardColumn
              key={col}
              status={col}
              items={items}
              dragId={dragId}
              titleById={titleById}
              onDragStart={setDragId}
              onDropOnCard={handleDropOnCard}
              onDropOnColumn={() => handleDropOnColumn(col)}
              onSetFavorite={setFavorite}
              onSetQueued={col === "Waitlist" ? setQueued : undefined}
              onUnlink={(id) => setParent(id, null)}
              onRemove={remove}
            />
          );
        })}
      </div>
      {entries.length === 0 && (
        <p className="py-8 text-center text-sm text-[var(--muted)]">
          No titles yet — search above.
        </p>
      )}
    </div>
  );
}

function BoardColumn({
  status,
  items,
  dragId,
  titleById,
  onDragStart,
  onDropOnCard,
  onDropOnColumn,
  onSetFavorite,
  onSetQueued,
  onUnlink,
  onRemove,
}: {
  status: string;
  items: AnimeEntry[];
  dragId: number | null;
  titleById: Map<number, string>;
  onDragStart: (id: number) => void;
  onDropOnCard: (target: AnimeEntry) => void;
  onDropOnColumn: () => void;
  onSetFavorite: (id: number, favorite: boolean) => void;
  onSetQueued?: (id: number, queued: boolean) => void;
  onUnlink: (id: number) => void;
  onRemove: (id: number) => void;
}) {
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDropOnColumn();
      }}
      className="flex flex-col gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-2.5"
    >
      <h3 className="px-0.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
        {status} <span className="text-[var(--muted)]">· {items.length}</span>
      </h3>
      <div className="flex min-h-[60px] flex-col gap-1.5">
        {items.map((e) => (
          <BoardCard
            key={e.id}
            entry={e}
            parentTitle={e.parentId != null ? titleById.get(e.parentId) : undefined}
            dragging={dragId === e.id}
            onDragStart={() => onDragStart(e.id)}
            onDropOnCard={() => onDropOnCard(e)}
            onSetFavorite={onSetFavorite}
            onSetQueued={onSetQueued}
            onUnlink={onUnlink}
            onRemove={onRemove}
          />
        ))}
        {items.length === 0 && (
          <p className="rounded-lg border border-dashed border-[var(--line)] py-4 text-center text-[11px] text-[var(--muted)]">
            Drop here
          </p>
        )}
      </div>
    </div>
  );
}

function BoardCard({
  entry,
  parentTitle,
  dragging,
  onDragStart,
  onDropOnCard,
  onSetFavorite,
  onSetQueued,
  onUnlink,
  onRemove,
}: {
  entry: AnimeEntry;
  parentTitle: string | undefined;
  dragging: boolean;
  onDragStart: () => void;
  onDropOnCard: () => void;
  onSetFavorite: (id: number, favorite: boolean) => void;
  onSetQueued?: (id: number, queued: boolean) => void;
  onUnlink: (id: number) => void;
  onRemove: (id: number) => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDropOnCard();
      }}
      className="flex flex-col gap-1.5 rounded-lg border-2 bg-[var(--panel-2)] p-1.5 active:cursor-grabbing"
      style={{
        opacity: dragging ? 0.4 : 1,
        cursor: "grab",
        borderColor: entry.isQueued ? "var(--accent)" : "var(--line)",
      }}
    >
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={entry.image}
          alt=""
          className="h-11 w-8 flex-shrink-0 rounded object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-bold text-[var(--text)]">
            {entry.title}
          </div>
          <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            <span>{entry.mediaType}</span>
            {parentTitle && (
              <>
                <span>·</span>
                <span className="truncate normal-case">part of {parentTitle}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          {parentTitle && (
            <button
              onClick={() => onUnlink(entry.id)}
              title="Unlink from parent"
              className="text-xs leading-none text-[var(--muted)] hover:text-[var(--text)]"
            >
              ⛓
            </button>
          )}
          {!entry.parentId && (
            <button
              onClick={() => onSetFavorite(entry.id, !entry.isFavorite)}
              title={entry.isFavorite ? "Unfavorite" : "Favorite"}
              className="text-xs leading-none"
              style={{ color: entry.isFavorite ? "#f0d15a" : "var(--muted)" }}
            >
              {entry.isFavorite ? "★" : "☆"}
            </button>
          )}
          <button
            onClick={() => onRemove(entry.id)}
            title="Remove"
            className="text-xs leading-none text-[var(--muted)] hover:text-[var(--accent-2)]"
          >
            ×
          </button>
        </div>
      </div>

      {onSetQueued && (
        <button
          onClick={() => onSetQueued(entry.id, !entry.isQueued)}
          className="flex w-full items-center justify-center gap-1 rounded-full border px-2 py-1 text-[10.5px] font-bold transition"
          style={{
            background: entry.isQueued ? "var(--accent)" : "transparent",
            color: entry.isQueued ? "#0c0a1e" : "var(--muted)",
            borderColor: entry.isQueued ? "var(--accent)" : "var(--line)",
          }}
        >
          {entry.isQueued ? "✓ Showing in Summary queue" : "+ Show in Summary queue"}
        </button>
      )}
    </div>
  );
}
