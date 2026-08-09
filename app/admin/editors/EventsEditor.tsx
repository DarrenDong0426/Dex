// app/admin/editors/EventsEditor.tsx
// One row per event: logo + name + your final rank (blank = didn't rank).
"use client";

import { useEffect, useState } from "react";
import { eventLogoUrl } from "@/app/profile/images";
import { gql } from "./gql";

type EventItem = {
  id: number;
  name: string;
  assetbundleName: string;
  rank: number | null;
};

export default function EventsEditor() {
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    gql(`{ eventList { id name assetbundleName rank } }`)
      .then((d) => setEvents(d.eventList))
      .catch((e) => setError(String(e.message ?? e)));
  }, []);

  async function saveRank(eventId: number, rank: number | null) {
    setSavingId(eventId);
    setEvents(
      (prev) => prev?.map((e) => (e.id === eventId ? { ...e, rank } : e)) ?? prev,
    );
    try {
      await gql(
        `mutation($id:Int!,$rank:Int){ setEventEdit(eventId:$id, rank:$rank){ id } }`,
        { id: eventId, rank },
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
  if (!events) return <p className="text-sm text-[var(--muted)]">Loading…</p>;

  const filtered = events.filter((e) =>
    e.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search events…"
        className="w-full max-w-xs rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
      />
      <div className="flex flex-col gap-3">
        {filtered.map((e) => (
          <div
            key={e.id}
            className="flex items-center gap-4 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={eventLogoUrl(e.assetbundleName)}
              alt=""
              className="h-16 w-28 flex-shrink-0 rounded-lg bg-[var(--panel)] object-contain"
              loading="lazy"
              onError={(ev) => {
                ev.currentTarget.style.visibility = "hidden";
              }}
            />
            <span className="min-w-0 flex-1 truncate text-base font-semibold text-[var(--text)]">
              {e.name}
            </span>
            <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
              Rank
              <input
                type="number"
                min={0}
                placeholder="—"
                defaultValue={e.rank ?? ""}
                key={e.rank}
                onBlur={(ev) => {
                  const raw = ev.target.value.trim();
                  const v = raw === "" ? null : parseInt(raw, 10);
                  if (v !== e.rank && (v === null || !Number.isNaN(v)))
                    saveRank(e.id, v);
                }}
                className="w-28 rounded border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-right text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
            </label>
            <span className="w-4 text-xs text-[var(--accent)]">
              {savingId === e.id ? "…" : ""}
            </span>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-[var(--muted)]">
            No events match &quot;{query}&quot;.
          </p>
        )}
      </div>
    </div>
  );
}
