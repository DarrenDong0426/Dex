// app/admin/editors/LogisticsEditor.tsx
// Site-wide identity — the profile banner's name/alias/avatar/bio/socials.
// Not tied to any one game (that's what each game's own info lives for) —
// this backs the SiteProfile singleton row, edited as one form with an
// explicit Save (not per-field autosave, since there's several fields and
// typing shouldn't fire a mutation per keystroke).
"use client";

import { useEffect, useState } from "react";
import { gql } from "./gql";

type SiteProfile = {
  displayName: string;
  alias: string;
  avatarUrl: string;
  bio: string;
  instagramLabel: string;
  instagramUrl: string;
  discordLabel: string;
  discordUrl: string;
};

export default function LogisticsEditor() {
  const [form, setForm] = useState<SiteProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    gql(
      `{ siteProfile { displayName alias avatarUrl bio instagramLabel instagramUrl discordLabel discordUrl } }`,
    )
      .then((d) => setForm(d.siteProfile))
      .catch((e) => setError(String(e.message ?? e)));
  }, []);

  function set<K extends keyof SiteProfile>(key: K, value: SiteProfile[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function uploadAvatar(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Upload failed (${res.status})`);
      set("avatarUrl", json.url);
    } catch (e) {
      setUploadError(String((e as Error).message ?? e));
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      await gql(
        `mutation($d:String!,$a:String!,$av:String!,$b:String!,$il:String!,$iu:String!,$dl:String!,$du:String!){
           setSiteProfile(displayName:$d, alias:$a, avatarUrl:$av, bio:$b, instagramLabel:$il, instagramUrl:$iu, discordLabel:$dl, discordUrl:$du){ displayName }
         }`,
        {
          d: form.displayName,
          a: form.alias,
          av: form.avatarUrl,
          b: form.bio,
          il: form.instagramLabel,
          iu: form.instagramUrl,
          dl: form.discordLabel,
          du: form.discordUrl,
        },
      );
      setSavedAt(Date.now());
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setSaving(false);
    }
  }

  if (error && !form)
    return <p className="text-sm text-[var(--accent-2)]">Couldn&apos;t load: {error}</p>;
  if (!form) return <p className="text-sm text-[var(--muted)]">Loading…</p>;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-[var(--muted)]">
        Edits the profile banner shown at the top of the site — name, avatar,
        bio, and social links. Not tied to any specific game.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Display name" value={form.displayName} onChange={(v) => set("displayName", v)} />
        <Field label="Alias (A.K.A.)" value={form.alias} onChange={(v) => set("alias", v)} />
      </div>

      <div className="flex items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={form.avatarUrl}
          alt=""
          className="h-16 w-16 flex-shrink-0 rounded-2xl object-cover"
          style={{ opacity: uploading ? 0.5 : 1 }}
          onError={(e) => {
            e.currentTarget.style.visibility = "hidden";
          }}
        />
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <label className="cursor-pointer rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:border-[var(--accent)]">
              {uploading ? "Uploading…" : "Upload image"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = ""; // allow re-picking the same file later
                  if (file) uploadAvatar(file);
                }}
              />
            </label>
            <span className="text-[10.5px] text-[var(--muted)]">PNG/JPEG/WEBP/GIF, up to 5MB</span>
          </div>
          {uploadError && (
            <p className="text-[11px] text-[var(--accent-2)]">{uploadError}</p>
          )}
          <Field
            label="Avatar URL"
            value={form.avatarUrl}
            onChange={(v) => set("avatarUrl", v)}
            hint="Uploads fill this in automatically — or paste a path/URL yourself"
          />
        </div>
      </div>

      <label className="flex flex-col gap-1.5 text-xs text-[var(--muted)]">
        Background blurb
        <textarea
          value={form.bio}
          onChange={(e) => set("bio", e.target.value)}
          rows={3}
          className="resize-y rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
            Instagram
          </p>
          <Field label="Label" value={form.instagramLabel} onChange={(v) => set("instagramLabel", v)} />
          <Field label="URL" value={form.instagramUrl} onChange={(v) => set("instagramUrl", v)} />
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
            Discord
          </p>
          <Field label="Label" value={form.discordLabel} onChange={(v) => set("discordLabel", v)} />
          <Field label="URL" value={form.discordUrl} onChange={(v) => set("discordUrl", v)} />
        </div>
      </div>
      <p className="text-[11px] text-[var(--muted)]">
        Leave a platform&apos;s URL blank to hide that button on the banner.
      </p>

      {error && (
        <div className="rounded-lg border border-[var(--accent-2)] px-3 py-2 text-xs text-[var(--accent-2)]">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg px-4 py-2 text-sm font-bold text-[#0c0a1e] transition disabled:opacity-50"
          style={{ background: "var(--accent)" }}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {savedAt && !saving && (
          <span className="text-xs text-[var(--muted)]">Saved.</span>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs text-[var(--muted)]">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
      />
      {hint && <span className="text-[10.5px] opacity-70">{hint}</span>}
    </label>
  );
}
