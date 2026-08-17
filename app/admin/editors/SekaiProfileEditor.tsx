// app/admin/editors/SekaiProfileEditor.tsx
// Small singleton form for the Sekai Profile row (in-game display name +
// player rank). Not synced/imported from anywhere — set by hand here, same
// as SiteProfile's pattern in LogisticsEditor.tsx, just Sekai-specific
// instead of site-wide.
"use client";

import { useEffect, useState } from "react";
import { gql } from "./gql";

type Profile = { name: string; rank: number };

export default function SekaiProfileEditor() {
  const [form, setForm] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    gql(`{ profile { name rank } }`)
      .then((d) => setForm(d.profile ?? { name: "", rank: 0 }))
      .catch((e) => setError(String(e.message ?? e)));
  }, []);

  async function save() {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      await gql(
        `mutation($n:String!,$r:Int!){ setProfile(name:$n, rank:$r){ name } }`,
        { n: form.name, r: form.rank },
      );
      setSavedAt(Date.now());
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setSaving(false);
    }
  }

  if (error)
    return <p className="text-sm text-[var(--accent-2)]">Couldn&apos;t load: {error}</p>;
  if (!form) return <p className="text-sm text-[var(--muted)]">Loading…</p>;

  return (
    <div className="flex max-w-sm flex-col gap-3">
      <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
        Name
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
        Rank
        <input
          type="number"
          value={form.rank}
          onChange={(e) => setForm({ ...form, rank: Number(e.target.value) })}
          className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
        />
      </label>
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="w-fit rounded-lg px-4 py-2 text-sm font-bold text-[#0c0a1e] transition disabled:opacity-50"
          style={{ background: "var(--accent)" }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {savedAt && (
          <span className="text-xs text-[var(--muted)]">Saved</span>
        )}
      </div>
    </div>
  );
}
