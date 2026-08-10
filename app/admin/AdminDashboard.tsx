// app/admin/AdminDashboard.tsx — the unlocked panel.
// Full-page layout: a persistent left sidebar (entry switcher + section nav,
// mirrors the frontend's icon Sidebar) + main content (stat header + editor
// panel), over the same themed scene background as the frontend profile.
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { games, themes, type Mode } from "@/app/games";
import BackgroundFX from "@/app/BackgroundFX";
import ThemeToggle from "@/app/ThemeToggle";
import { logoutAction } from "./actions";
import { gql } from "./editors/gql";
import CharactersEditor from "./editors/CharactersEditor";
import CardsEditor from "./editors/CardsEditor";
import MusicEditor from "./editors/MusicEditor";
import EventsEditor from "./editors/EventsEditor";
import StampsEditor from "./editors/StampsEditor";
import HonorsEditor from "./editors/HonorsEditor";
import GenshinEditor from "./editors/GenshinEditor";

type Entry = {
  slug: string;
  name: string;
  kind: "game" | "anime";
  built: boolean; // is this entry's data actually in the app yet
  sections: string[];
  hasCsv: boolean; // does this entry support CSV bulk upload
};

// mirrors games.ts, but only the bits the admin needs. Section lists match the
// front-end sections MINUS "Creations" (that's a gallery, edited elsewhere).
const ENTRIES: Entry[] = [
  {
    slug: "sekai",
    name: "Project Sekai",
    kind: "game",
    built: true,
    sections: ["Characters", "Cards", "Music", "Events", "Stamps", "Honors"],
    hasCsv: true,
  },
  {
    slug: "genshin",
    name: "Genshin Impact",
    kind: "game",
    built: true,
    // synced wholesale from HoYoLAB (level/const/talents/weapon/artifacts)
    // via GenshinEditor's "Sync now" — no manual editing, no CSV
    sections: ["Characters"],
    hasCsv: false,
  },
  {
    slug: "anime",
    name: "Anime",
    kind: "anime",
    built: false,
    sections: ["Library"],
    hasCsv: false,
  },
];

export default function AdminDashboard() {
  const [entrySlug, setEntrySlug] = useState("sekai");
  const entry = ENTRIES.find((e) => e.slug === entrySlug)!;
  const [section, setSection] = useState(entry.sections[0]);
  const [mode, setMode] = useState<Mode>("dark");

  function pickEntry(slug: string) {
    const e = ENTRIES.find((x) => x.slug === slug)!;
    setEntrySlug(slug);
    setSection(e.sections[0]); // reset to that entry's first section
  }

  async function logout() {
    await logoutAction();
    window.location.reload();
  }

  return (
    <div
      className="relative flex min-h-screen"
      style={themes.sekai[mode] as React.CSSProperties}
    >
      <BackgroundFX mode={mode} />
      <Sidebar
        entrySlug={entrySlug}
        onPickEntry={pickEntry}
        section={section}
        onPickSection={setSection}
        entry={entry}
        onLogout={logout}
        mode={mode}
        onToggleMode={() => setMode((m) => (m === "dark" ? "light" : "dark"))}
      />

      <div className="relative z-10 min-w-0 flex-1 p-8">
        <AdminHeader entryName={entry.name} section={section} />

        <div className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[0_16px_50px_-30px_rgba(0,0,0,0.6)]">
          {!entry.built ? (
            <p className="text-sm text-[var(--muted)]">
              {entry.name} isn&apos;t wired into the app yet — its editors
              come once the{" "}
              {entry.kind === "anime" ? "anime list" : "game data"} is built.
            </p>
          ) : (
            <SectionEditor
              entrySlug={entry.slug}
              section={section}
              hasCsv={entry.hasCsv}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- sidebar: entry switcher + section nav ---------- */

function Sidebar({
  entrySlug,
  onPickEntry,
  entry,
  section,
  onPickSection,
  onLogout,
  mode,
  onToggleMode,
}: {
  entrySlug: string;
  onPickEntry: (slug: string) => void;
  entry: Entry;
  section: string;
  onPickSection: (s: string) => void;
  onLogout: () => void;
  mode: Mode;
  onToggleMode: () => void;
}) {
  const router = useRouter();
  const brandClicks = useRef(0);
  const brandClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 3 clicks in a row on the brand mark → back to the frontend profile
  function handleBrandClick() {
    brandClicks.current += 1;
    if (brandClickTimer.current) clearTimeout(brandClickTimer.current);
    if (brandClicks.current >= 3) {
      brandClicks.current = 0;
      router.push("/");
      return;
    }
    brandClickTimer.current = setTimeout(() => {
      brandClicks.current = 0;
    }, 600);
  }

  return (
    <div className="sticky top-0 z-20 flex h-screen w-[220px] flex-shrink-0 flex-col border-r border-[var(--line)] bg-[var(--panel)]/90 backdrop-blur-sm">
      <button
        onClick={handleBrandClick}
        title="Click 3 times to return to the profile"
        className="flex items-center gap-2 px-5 pb-4 pt-6 text-left"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/pfp.png"
          alt="ITAMI"
          className="h-8 w-8 flex-shrink-0 rounded-xl object-cover"
        />
        <span className="text-sm font-extrabold text-[var(--text)]">
          Dex <span className="text-[var(--accent)]">Admin</span>
        </span>
      </button>

      <div className="mx-5 mb-3 h-px bg-[var(--line)]" />

      {/* entry switcher */}
      <div className="flex flex-col gap-1 px-3">
        {ENTRIES.map((e) => {
          const on = e.slug === entrySlug;
          const g = games.find((x) => x.slug === e.slug);
          return (
            <button
              key={e.slug}
              onClick={() => onPickEntry(e.slug)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-semibold transition"
              style={{
                background: on ? "var(--panel-2)" : "transparent",
                color: on ? "var(--text)" : "var(--muted)",
              }}
            >
              {g && (
                <span
                  className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center overflow-hidden rounded-md text-[9px] font-extrabold text-white"
                  style={{ background: g.logoBg }}
                >
                  {g.logoSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={g.logoSrc}
                      alt=""
                      className="h-full w-full object-contain p-0.5"
                    />
                  ) : (
                    g.logo
                  )}
                </span>
              )}
              <span className="truncate">{e.name}</span>
              {!e.built && (
                <span className="ml-auto text-[9px] font-normal opacity-60">
                  soon
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mx-5 my-3 h-px bg-[var(--line)]" />

      {/* section nav for the active entry */}
      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3">
        {entry.sections.map((s) => {
          const on = s === section;
          return (
            <button
              key={s}
              onClick={() => onPickSection(s)}
              className="relative rounded-lg px-2.5 py-2 text-left text-[12.5px] font-bold transition"
              style={{
                background: on ? "var(--accent)" : "transparent",
                color: on ? "#0c0a1e" : "var(--muted)",
              }}
            >
              {s}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-[var(--line)] p-3">
        <ThemeToggle mode={mode} onToggle={onToggleMode} />
        <button
          onClick={onLogout}
          className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-xs font-semibold text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--text)]"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

/* ---------- header: current section + live stat tiles ---------- */

type AdminStats = {
  characterCount: number;
  cardCount: number;
  songFavoriteCount: number;
  eventCount: number;
  stampCount: number;
  honorCount: number;
};

function AdminHeader({
  entryName,
  section,
}: {
  entryName: string;
  section: string;
}) {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    gql(
      `{ adminStats { characterCount cardCount songFavoriteCount eventCount stampCount honorCount } }`,
    )
      .then((d) => setStats(d.adminStats))
      .catch(() => {});
  }, []);

  const tiles: { value: number; label: string }[] = stats
    ? [
        { value: stats.characterCount, label: "characters" },
        { value: stats.cardCount, label: "cards" },
        { value: stats.songFavoriteCount, label: "favorite songs" },
        { value: stats.eventCount, label: "events ranked" },
        { value: stats.stampCount, label: "stamps" },
        { value: stats.honorCount, label: "honors" },
      ]
    : [];

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          {entryName}
        </p>
        <h1 className="text-2xl font-extrabold text-[var(--text)]">{section}</h1>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-2">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded-xl border border-[var(--line)] bg-[var(--panel)]/80 px-3 py-2 text-center backdrop-blur-sm sm:min-w-[84px]"
          >
            <div className="text-lg font-extrabold text-[var(--text)]">
              {t.value}
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              {t.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Placeholder editor — describes what each section will edit. Real editors
// (with GraphQL mutations) replace this one section at a time.
function SectionEditor({
  entrySlug,
  section,
  hasCsv,
}: {
  entrySlug: string;
  section: string;
  hasCsv: boolean;
}) {
  const WHAT: Record<string, string> = {
    "sekai:Characters":
      "Set favorite tier (Oshi / Favorite / HM) and character rank — favorited characters show on the profile's Summary tab.",
    "sekai:Cards": "Toggle owned, set level, master rank, and skill level per card.",
    "sekai:Music":
      "Set your play result (Clear / FC / AP) per song and difficulty, and star favorites for the Summary tab.",
    "sekai:Events": "Edit your final rank per event.",
    "sekai:Stamps": "Toggle which stamps you own.",
    "sekai:Honors": "Toggle owned honors and their level.",
    "genshin:Characters":
      "Synced wholesale from HoYoLAB — level, constellation, talents, equipped weapon, and equipped artifacts (with substats) for every character you own. No manual editing; hit Sync to refresh.",
  };

  const BUILT_EDITORS: Record<string, React.ComponentType> = {
    "sekai:Characters": CharactersEditor,
    "sekai:Cards": CardsEditor,
    "sekai:Music": MusicEditor,
    "sekai:Events": EventsEditor,
    "sekai:Stamps": StampsEditor,
    "sekai:Honors": HonorsEditor,
    "genshin:Characters": GenshinEditor,
  };
  const key = `${entrySlug}:${section}`;
  const Editor = BUILT_EDITORS[key];

  return (
    <div className="flex flex-col gap-4">
      <div className="border-b border-[var(--line)] pb-3">
        <p className="text-sm text-[var(--muted)]">
          {WHAT[key] ?? "Editor for this section."}
        </p>
      </div>

      {Editor ? (
        <Editor />
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--line)] p-4 text-sm text-[var(--muted)]">
          Manual editor coming here.
        </div>
      )}

      {hasCsv && (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-4">
          <p className="text-xs font-semibold text-[var(--muted)]">
            CSV bulk update
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Drop this section&apos;s export CSV to bulk-update — wired to your
            /api/import routes next.
          </p>
        </div>
      )}
    </div>
  );
}
