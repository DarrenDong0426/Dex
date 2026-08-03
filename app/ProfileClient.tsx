"use client";

import { useState, useEffect, useRef } from "react";
import { games, themes, type Game, type Mode } from "@/app/games";
import BackgroundFX from "@/app/BackgroundFX";
import {
  fanHonorForRank,
  pips,
  honorImageUrl,
  honorFrameUrl,
} from "@/app/honor";

type ProfileData = { name: string; rank: number; createdAt: string } | null;

type Difficulty = {
  difficulty: string;
  clears: number;
  fullCombos: number;
  fullPerfects: number;
};

type CharacterSummary = {
  characterId: number;
  name: string;
  characterRank: number;
  challengeLevel: number | null;
  favoriteTier: number | null;
  unit: string;
  // assetbundleName of this character's fan honor (from Honor table by
  // groupId===characterId). Optional so it degrades gracefully if absent.
  honorAsset?: string | null;
};

type Summary = {
  rank: number | null;
  updatedAt: string | null;
  cardCount: number;
  eventCount: number;
  difficulties: Difficulty[];
  characters: CharacterSummary[];
} | null;

const TIER_LABELS: Record<number, string> = {
  1: "Oshi",
  2: "Favorites",
  3: "Honorable Mentions",
};

const DIFFICULTY_ORDER = [
  "EASY",
  "NORMAL",
  "HARD",
  "EXPERT",
  "MASTER",
  "APPEND",
];
const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: "#5bc46f",
  NORMAL: "#4ba8d4",
  HARD: "#e0b13a",
  EXPERT: "#e5567d",
  MASTER: "#9b5ad6",
  APPEND: "#d76fd0",
};

// Self-hosted character icons in /public/chara/, named by lowercase given name
// (e.g. /chara/ichika.png). Name comes as "Hoshino Ichika" (surname first),
// so the given name is the LAST word.
function charaIcon(fullName: string): string {
  const parts = fullName.trim().split(" ");
  const given = parts[parts.length - 1].toLowerCase();
  return `/chara/${given}.png`;
}

export default function ProfileClient({
  profile,
  summary,
}: {
  profile: ProfileData;
  summary: Summary;
}) {
  const [activeSlug, setActiveSlug] = useState(games[0].slug);
  const [mode, setMode] = useState<Mode>("dark");

  const active = games.find((g) => g.slug === activeSlug) ?? games[0];
  const vars = themes[active.slug][mode] as React.CSSProperties;

  let display: Game = active;
  if (active.slug === "sekai" && profile && summary) {
    display = {
      ...active,
      hero: {
        value: String(summary.rank ?? profile.rank),
        label: "player rank",
      },
      info: [
        { value: profile.name, label: "username" },
        active.info[1],
        {
          value: new Date(Number(profile.createdAt)).toLocaleDateString(
            "en-US",
            {
              month: "short",
              year: "numeric",
            },
          ),
          label: "playing since",
        },
      ],
    };
  }

  const lastUpdated =
    active.slug === "sekai" && summary?.updatedAt
      ? new Date(Number(summary.updatedAt)).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : null;

  const characters =
    active.slug === "sekai" && summary ? summary.characters : [];
  const difficulties =
    active.slug === "sekai" && summary ? summary.difficulties : [];

  return (
    <div
      style={vars}
      className="flex min-h-screen bg-[var(--bg)] transition-colors duration-500"
    >
      <BackgroundFX mode={mode} />

      <Sidebar
        activeSlug={activeSlug}
        onPick={setActiveSlug}
        mode={mode}
        onToggleMode={() => setMode(mode === "dark" ? "light" : "dark")}
      />

      <div className="relative z-10 min-w-0 flex-1">
        <div className="mx-auto max-w-[1080px] p-6">
          <ProfileBanner />
          <FolderTabs activeSlug={activeSlug} onPick={setActiveSlug} />
          <SummaryCard
            game={display}
            lastUpdated={lastUpdated}
            characters={characters}
            difficulties={difficulties}
          />
        </div>
      </div>
    </div>
  );
}

/* ---------- sun/moon sliding toggle (knob sized to fit) ---------- */

function ThemeToggle({ mode, onToggle }: { mode: Mode; onToggle: () => void }) {
  const dark = mode === "dark";
  // track h-6 (24px); knob h-5 (20px) with top/left 2px → fits with 2px inset
  return (
    <button
      onClick={onToggle}
      aria-label="toggle theme"
      className="relative h-6 w-12 rounded-full border border-[var(--line)] bg-[var(--panel-2)]"
    >
      <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] leading-none">
        ☀
      </span>
      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] leading-none">
        🌙
      </span>
      <span
        className="absolute left-0.5 top-0.5 h-[18px] w-[18px] rounded-full bg-[var(--accent)] shadow transition-transform duration-300"
        style={{ transform: dark ? "translateX(24px)" : "translateX(0px)" }}
      />
    </button>
  );
}

/* ---------- full-height sidebar ---------- */

function Sidebar({
  activeSlug,
  onPick,
  mode,
  onToggleMode,
}: {
  activeSlug: string;
  onPick: (slug: string) => void;
  mode: Mode;
  onToggleMode: () => void;
}) {
  return (
    <div className="sticky top-0 z-20 flex h-screen w-[84px] flex-shrink-0 flex-col items-center gap-3 border-r border-[var(--line)] bg-[var(--panel)] py-5 transition-colors duration-500">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/pfp.png"
        alt="ITAMI"
        className="mb-2 h-12 w-12 rounded-2xl object-cover"
      />
      <div className="mb-2 h-px w-9 bg-[var(--line)]" />

      {games.map((g) => {
        const on = g.slug === activeSlug;
        return (
          <button
            key={g.slug}
            onClick={() => onPick(g.slug)}
            title={g.name}
            className={`relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-[14px] text-[15px] font-extrabold text-white transition
                        ${on ? "opacity-100" : "opacity-50 hover:opacity-85"}`}
            style={{
              boxShadow: on
                ? "0 0 0 2px var(--panel), 0 0 0 4px var(--accent), 0 0 22px -2px var(--accent)"
                : undefined,
            }}
          >
            {on && (
              <span
                className="absolute -left-5 top-1/2 h-6 w-1 -translate-y-1/2 rounded"
                style={{
                  background: "var(--accent)",
                  boxShadow: "0 0 10px var(--accent)",
                }}
              />
            )}
            {/* real logo if provided, else letter code */}
            {g.logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={g.logoSrc}
                alt={g.name}
                className="h-full w-full object-contain"
              />
            ) : (
              g.logo
            )}
          </button>
        );
      })}

      <div className="mt-auto">
        <ThemeToggle mode={mode} onToggle={onToggleMode} />
      </div>
    </div>
  );
}

/* ---------- profile banner ---------- */

function ProfileBanner() {
  return (
    <div
      className="relative mb-6 flex flex-col gap-6 overflow-hidden rounded-3xl border border-white/10 p-8
                 shadow-[0_20px_60px_-22px_rgba(0,0,0,0.5)] transition-all duration-500
                 sm:flex-row sm:items-center sm:justify-between"
      style={{ background: "var(--banner-bg)" }}
    >
      <div
        className="pointer-events-none absolute -top-16 -right-16 h-72 w-72 rounded-full opacity-20"
        style={{
          background: "radial-gradient(circle, var(--accent), transparent 70%)",
        }}
      />

      {/* LEFT: pfp + name + alias + meta */}
      <div className="flex items-center gap-7">
        {/* self-hosted profile picture — drop your Discord avatar at /public/pfp.png */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/pfp.png"
          alt="ITAMI"
          className="h-24 w-24 flex-shrink-0 rounded-[26px] object-cover shadow-lg"
        />
        <div>
          <div
            className="text-4xl font-extrabold tracking-tight"
            style={{ color: "var(--banner-text)" }}
          >
            ITAMI
          </div>
          <div className="mt-2 text-sm" style={{ color: "var(--banner-sub)" }}>
            A.K.A.{" "}
            <b className="font-semibold" style={{ color: "var(--banner-b)" }}>
              NONAME
            </b>
          </div>
          <div className="mt-3.5 flex gap-6">
            <Meta value={String(games.length)} label="games" />
            <Meta value="USA" label="region" />
          </div>
        </div>
      </div>

      {/* RIGHT: description + socials */}
      <div className="relative max-w-sm">
        <p
          className="text-[13px] leading-relaxed"
          style={{ color: "var(--banner-sub)" }}
        >
          Developer, into software, AI, embedded systems, and anime. This is
          where I keep track of the games I play. Open to friends in any game,
          just reach out.
        </p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <a
            href="https://www.instagram.com/amekage_itami/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--panel-2)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text)] transition hover:border-[var(--accent)]"
          >
            <InstagramIcon /> amekage_itami
          </a>
          <a
            href="https://discord.com/users/username.noname"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--panel-2)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text)] transition hover:border-[var(--accent)]"
          >
            <DiscordIcon /> username.noname
          </a>
        </div>
      </div>
    </div>
  );
}

function InstagramIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function Meta({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div
        className="text-[15px] font-bold"
        style={{ color: "var(--banner-text)" }}
      >
        {value}
      </div>
      <div className="text-[11px]" style={{ color: "var(--banner-sub)" }}>
        {label}
      </div>
    </div>
  );
}

/* ---------- folder tabs ---------- */

function FolderTabs({
  activeSlug,
  onPick,
}: {
  activeSlug: string;
  onPick: (slug: string) => void;
}) {
  return (
    <div className="relative z-20 flex gap-1 overflow-x-auto pl-2">
      {games.map((g) => {
        const on = g.slug === activeSlug;
        return (
          <button
            key={g.slug}
            onClick={() => onPick(g.slug)}
            className="-mb-px flex flex-shrink-0 items-center gap-2 rounded-t-xl border border-b-0 px-4 pt-2.5 pb-3 text-[12.5px] font-semibold transition"
            style={{
              background: on ? "var(--panel-2)" : "var(--panel)",
              color: on ? "var(--text)" : "var(--muted)",
              borderColor: on ? "var(--accent)" : "var(--line)",
            }}
          >
            <span
              className="inline-flex h-5 w-5 items-center justify-center overflow-hidden rounded-md text-[9px] font-extrabold text-white"
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
            {g.name}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- difficulty strip ---------- */

function DifficultyStrip({
  title,
  difficulties,
  field,
}: {
  title: string;
  difficulties: Difficulty[];
  field: "clears" | "fullCombos";
}) {
  const byDiff = new Map(difficulties.map((d) => [d.difficulty, d]));
  return (
    <div>
      <div className="mb-1.5 rounded-md bg-[var(--panel-2)] py-1 text-center text-[12px] font-bold tracking-wide text-[var(--text)]">
        {title}
      </div>
      <div className="grid grid-cols-6 gap-1">
        {DIFFICULTY_ORDER.map((diff) => {
          const d = byDiff.get(diff);
          const count = d ? d[field] : 0;
          return (
            <div key={diff} className="text-center">
              <div
                className="rounded py-0.5 text-[8px] font-bold uppercase text-white"
                style={{ background: DIFFICULTY_COLORS[diff] }}
              >
                {diff}
              </div>
              <div className="mt-0.5 text-[13px] font-bold text-[var(--text)]">
                {count}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- character face grid with rank/challenge toggle (compact) ---------- */

// unit display names + order
const UNIT_LABELS: Record<string, string> = {
  light_sound: "Leo/need",
  idol: "MORE MORE JUMP!",
  street: "Vivid BAD SQUAD",
  theme_park: "Wonderlands×Showtime",
  school_refusal: "Nightcord at 25:00",
  piapro: "Virtual Singer",
};
const UNIT_ORDER = [
  "piapro",
  "light_sound",
  "idol",
  "street",
  "theme_park",
  "school_refusal",
];

function CharacterGrid({ characters }: { characters: CharacterSummary[] }) {
  const [showChallenge, setShowChallenge] = useState(false);

  // group by unit
  const byUnit = new Map<string, CharacterSummary[]>();
  for (const c of characters) {
    const u = c.unit ?? "other";
    if (!byUnit.has(u)) byUnit.set(u, []);
    byUnit.get(u)!.push(c);
  }
  // order within each unit by characterId (matches the cards index order)
  for (const list of byUnit.values()) {
    list.sort((a, b) => a.characterId - b.characterId);
  }
  const units = UNIT_ORDER.filter((u) => byUnit.has(u));

  return (
    <div>
      <div className="mb-2.5 inline-flex rounded-full border border-[var(--line)] bg-[var(--panel-2)] p-0.5 text-[11px] font-semibold">
        <button
          onClick={() => setShowChallenge(false)}
          className="rounded-full px-2.5 py-0.5 transition"
          style={{
            background: !showChallenge ? "var(--accent)" : "transparent",
            color: !showChallenge ? "#0c0a1e" : "var(--muted)",
          }}
        >
          Character Rank
        </button>
        <button
          onClick={() => setShowChallenge(true)}
          className="rounded-full px-2.5 py-0.5 transition"
          style={{
            background: showChallenge ? "var(--accent)" : "transparent",
            color: showChallenge ? "#0c0a1e" : "var(--muted)",
          }}
        >
          Challenge Level
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {units.map((u) => (
          <div key={u}>
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
              {UNIT_LABELS[u] ?? u}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {byUnit.get(u)!.map((c) => {
                const value = showChallenge
                  ? c.challengeLevel
                  : c.characterRank;
                return (
                  <div
                    key={c.characterId}
                    className="flex items-center gap-1.5 rounded-full bg-[var(--panel-2)] p-1 pr-2.5"
                    title={c.name}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={charaIcon(c.name)}
                      alt={c.name}
                      className="h-7 w-7 flex-shrink-0 rounded-full object-cover"
                      loading="lazy"
                    />
                    <span className="text-[13px] font-bold leading-none text-[var(--text)]">
                      {value ?? "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- honor badge (fan honor derived from character rank) ---------- */

function HonorBadge({
  rank,
  honorAsset,
}: {
  rank: number;
  honorAsset?: string | null;
}) {
  const honor = fanHonorForRank(rank);
  if (!honor || !honorAsset) return null;

  return (
    <div className="relative mt-1 inline-flex h-[28px] items-center">
      {/* base honor art */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={honorImageUrl(honorAsset)}
        alt=""
        className="h-[28px] w-auto"
        loading="lazy"
      />
      {/* rarity frame overlay */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={honorFrameUrl(honor.rarity)}
        alt=""
        className="pointer-events-none absolute inset-0 h-[28px] w-full object-fill"
        loading="lazy"
      />
      {/* pips — always 5 past rank 25; recolored left→right per 25-band */}
      <div className="pointer-events-none absolute bottom-[-3px] left-[13px] flex gap-[1px]">
        {pips(rank).map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={src} alt="" className="h-[6px] w-[6px]" />
        ))}
      </div>
    </div>
  );
}

/* ---------- favorite tiers (compact, faces) ---------- */

function FavoriteTiers({ characters }: { characters: CharacterSummary[] }) {
  const tiers = [1, 2, 3]
    .map((t) => ({
      tier: t,
      label: TIER_LABELS[t],
      chars: characters.filter((c) => c.favoriteTier === t),
    }))
    .filter((g) => g.chars.length > 0);

  if (tiers.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {tiers.map((t) => (
        <div key={t.tier}>
          <h2 className="mb-1.5 text-[12px] font-bold uppercase tracking-wider text-[var(--muted)]">
            {t.label}
          </h2>
          <div className="flex flex-wrap gap-2">
            {t.chars.map((c) => (
              <div
                key={c.characterId}
                className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--panel-2)] py-0.5 pl-0.5 pr-3"
                title={c.name}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={charaIcon(c.name)}
                  alt={c.name}
                  className="h-7 w-7 rounded-full object-cover"
                  loading="lazy"
                />
                <div className="leading-tight">
                  <div className="text-[12px] font-bold text-[var(--text)]">
                    {c.name}
                  </div>
                  <div
                    className="text-[10px]"
                    style={{ color: "var(--accent)" }}
                  >
                    Rank {c.characterRank}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- top songs (manual pick — 3 square covers) ---------- */

// Sekai music jacket URL from a music assetbundleName (JP bucket, like cards).
// Reuse this in the full Music section to render every song's jacket.
export function jacketUrl(assetbundleName: string): string {
  return `https://storage.sekai.best/sekai-en-assets/music/jacket/${assetbundleName}/${assetbundleName}.webp`;
}

// No "favorite song" field in the data yet, so these are hand-picked by
// assetbundleName. Fill in each song's real abn (from the Music table).
const TOP_SONGS: { title: string; abn: string }[] = [
  { title: "Bad Apple!!", abn: "jacket_s_501" },
  { title: "Gunjou Sanka", abn: "jacket_s_141" },
  { title: "Neo", abn: "jacket_s_366" },
];

function TopSongs() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {TOP_SONGS.map((s) => (
        <div key={s.title} className="flex flex-col gap-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={s.abn ? jacketUrl(s.abn) : ""}
            alt={s.title}
            className="aspect-square w-full rounded-xl bg-[var(--panel-2)] object-cover shadow-md"
            loading="lazy"
          />
          <div className="truncate text-center text-[12px] font-bold text-[var(--text)]">
            {s.title}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Kizuna — all characters' honors, grouped by team ---------- */

function KizunaGrid({ characters }: { characters: CharacterSummary[] }) {
  const byUnit = new Map<string, CharacterSummary[]>();
  for (const c of characters) {
    const u = c.unit ?? "other";
    if (!byUnit.has(u)) byUnit.set(u, []);
    byUnit.get(u)!.push(c);
  }
  // order within each unit by characterId (matches the cards index order)
  for (const list of byUnit.values()) {
    list.sort((a, b) => a.characterId - b.characterId);
  }
  const units = UNIT_ORDER.filter((u) => byUnit.has(u));

  return (
    <div>
      <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-[var(--muted)]">
        Kizuna
      </h2>
      <div className="flex flex-col gap-4">
        {units.map((u) => (
          <div key={u}>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
              {UNIT_LABELS[u] ?? u}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {byUnit.get(u)!.map((c) => (
                <div
                  key={c.characterId}
                  className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-1.5"
                  title={c.name}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={charaIcon(c.name)}
                    alt={c.name}
                    className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
                    loading="lazy"
                  />
                  <div className="min-w-0 leading-tight">
                    <div className="truncate text-[11px] font-bold text-[var(--text)]">
                      {c.name}
                    </div>
                    <HonorBadge
                      rank={c.characterRank}
                      honorAsset={c.honorAsset}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Cards section: index (unit rail + character standing art) ---------- */

// character-select standing cutout, keyed by characterId (EN bucket)
function charaStandingArt(characterId: number): string {
  return `https://storage.sekai.best/sekai-en-assets/character/character_select/chr_tl_${characterId}.webp`;
}

// unit accent colors for the index cards' bottom gradient
const UNIT_COLORS: Record<string, string> = {
  light_sound: "#4455dd",
  idol: "#88dd44",
  street: "#ee1166",
  theme_park: "#ff9900",
  school_refusal: "#884499",
  piapro: "#33ccbb",
};

// unit logo (outlined) hotlinked from sekai.best. The logo filename uses
// sekai.best's own unit slugs, which differ from our unit keys.
const UNIT_LOGO_SLUG: Record<string, string> = {
  piapro: "piapro",
  light_sound: "light_sound",
  idol: "idol",
  street: "street",
  theme_park: "theme_park",
  school_refusal: "school_refusal",
};
function unitLogoUrl(unitKey: string): string {
  const slug = UNIT_LOGO_SLUG[unitKey] ?? unitKey;
  return `https://sekai.best/images/jp/logol_outline/logo_${slug}.png`;
}

/* ---------- card binder (a character's cards, paged, owned vs locked) ---------- */

type CharacterCard = {
  cardId: number;
  name: string;
  rarity: number;
  assetbundleName: string;
  owned: boolean;
  level: number | null;
  masterRank: number | null;
  skillLevel: number | null;
  specialTraining: boolean | null;
};

// full card illustration (JP bucket) — the whole card art, shown cropped to
// body in a portrait frame. trained variant if the card was special-trained.
function cardArtUrl(abn: string, trained: boolean): string {
  const variant = trained ? "after_training" : "normal";
  return `https://storage.sekai.best/sekai-jp-assets/character/member/${abn}/card_${variant}.webp`;
}

type SortMode = "rarity" | "owned" | "cardId";
const PER_PAGE = 8; // cards per page (4×2)
const PER_SPREAD = PER_PAGE * 2; // two facing pages

/* ---------- card detail modal ---------- */

function CardModal({
  card,
  characterName,
  onClose,
}: {
  card: CharacterCard;
  characterName: string;
  onClose: () => void;
}) {
  // can only view trained art if the card was actually special-trained;
  // default to the trained art when it exists
  const canTrain = Boolean(card.specialTraining);
  const [trained, setTrained] = useState(canTrain);
  const [zoom, setZoom] = useState(false);

  const art = cardArtUrl(card.assetbundleName, trained && canTrain);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-5xl overflow-auto rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* close */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--panel-2)] text-[var(--text)]"
          aria-label="close"
        >
          ✕
        </button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {/* left: art + controls */}
          <div className="sm:w-2/3">
            <div className="relative overflow-hidden rounded-xl border border-[var(--line)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={art}
                alt={card.name}
                className="w-full"
                style={{
                  filter: card.owned
                    ? undefined
                    : "grayscale(1) brightness(0.5)",
                }}
              />
              {/* rarity stars bottom-left */}
              <div className="absolute bottom-2 left-2 text-[16px] font-bold text-yellow-300 drop-shadow">
                {card.rarity === 5 ? "★ BD" : "★".repeat(card.rarity)}
              </div>
            </div>

            {/* controls: trained toggle + enlarge */}
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setTrained((t) => !t)}
                disabled={!canTrain}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--panel-2)] text-[15px] text-[var(--text)] transition hover:border-[var(--accent)] disabled:opacity-40"
                title={
                  canTrain
                    ? trained
                      ? "Show normal art"
                      : "Show trained art"
                    : "Card not trained"
                }
                aria-label="toggle trained art"
              >
                ⟳
              </button>
              <button
                onClick={() => setZoom(true)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--panel-2)] text-[15px] text-[var(--text)] transition hover:border-[var(--accent)]"
                title="Enlarge"
                aria-label="enlarge"
              >
                🔍
              </button>
            </div>

            {/* side story (buttons, mirroring the game) */}
            <div className="mt-2 flex gap-2">
              <button className="flex-1 rounded-full border border-[var(--line)] bg-[var(--panel-2)] px-3 py-1.5 text-[12px] font-semibold text-[var(--muted)]">
                🔒 Side Story (Part 1)
              </button>
              <button className="flex-1 rounded-full border border-[var(--line)] bg-[var(--panel-2)] px-3 py-1.5 text-[12px] font-semibold text-[var(--muted)]">
                🔒 Side Story (Part 2)
              </button>
            </div>
          </div>

          {/* right: details */}
          <div className="flex flex-col gap-4 sm:w-1/3">
            <div>
              <div className="text-[12px] text-[var(--muted)]">{card.name}</div>
              <div className="text-[22px] font-extrabold text-[var(--text)]">
                {characterName}
              </div>
            </div>

            {card.owned ? (
              <>
                {/* Level */}
                <div>
                  <div className="text-[12px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    Level
                  </div>
                  <div className="text-[16px] font-bold text-[var(--text)]">
                    Lv. {card.level}
                  </div>
                </div>

                {/* Skill Level */}
                {card.skillLevel != null && (
                  <div>
                    <div className="text-[12px] font-bold uppercase tracking-wider text-[var(--muted)]">
                      Skill Level
                    </div>
                    <div className="text-[16px] font-bold text-[var(--text)]">
                      Lv. {card.skillLevel}/4
                    </div>
                  </div>
                )}

                {/* Mastery Rank */}
                <div>
                  <div className="text-[12px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    Mastery Rank
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded font-bold text-white"
                      style={{ background: "var(--accent)" }}
                    >
                      {card.masterRank ?? 0}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl bg-[var(--panel-2)] p-4 text-center text-[13px] text-[var(--muted)]">
                🔒 Not yet obtained
              </div>
            )}
          </div>
        </div>
      </div>

      {/* enlarge overlay */}
      {zoom && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          onClick={(e) => {
            e.stopPropagation();
            setZoom(false);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={art}
            alt={card.name}
            className="max-h-full max-w-full rounded-lg"
          />
        </div>
      )}
    </div>
  );
}

// one card slot in the binder
function CardCell({ c, onClick }: { c: CharacterCard; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--panel)] transition hover:border-[var(--accent)]"
      style={{ aspectRatio: "3 / 4" }}
      title={`Card ${c.cardId}${c.owned ? ` · Lv ${c.level}` : ""}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cardArtUrl(c.assetbundleName, Boolean(c.specialTraining))}
        alt=""
        className="h-full w-full object-cover object-top"
        style={{ filter: c.owned ? undefined : "grayscale(1) brightness(0.4)" }}
        loading="lazy"
      />
      {/* rarity stars */}
      <div className="absolute left-1 top-1 rounded bg-black/45 px-1 text-[9px] font-bold text-yellow-300">
        {c.rarity === 5 ? "★BD" : "★".repeat(c.rarity)}
      </div>
      {/* lock on un-owned */}
      {!c.owned && (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            className="opacity-90 drop-shadow"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
      )}
    </button>
  );
}

// one page (4×2 grid of 8 slots)
function BinderPage({
  cards,
  onPick,
}: {
  cards: CharacterCard[];
  onPick: (c: CharacterCard) => void;
}) {
  return (
    <div className="grid flex-1 grid-cols-2 gap-2 rounded-xl bg-[var(--panel-2)] p-3 sm:grid-cols-4">
      {cards.map((c) => (
        <CardCell key={c.cardId} c={c} onClick={() => onPick(c)} />
      ))}
      {/* keep grid shape when a page has fewer than 8 */}
      {Array.from({ length: Math.max(0, PER_PAGE - cards.length) }).map(
        (_, i) => (
          <div key={`empty-${i}`} style={{ aspectRatio: "3 / 4" }} />
        ),
      )}
    </div>
  );
}

function CardBinder({
  character,
  onBack,
}: {
  character: CharacterSummary;
  onBack: () => void;
}) {
  const [cards, setCards] = useState<CharacterCard[] | null>(null);
  const [error, setError] = useState(false);
  const [spread, setSpread] = useState(0);
  const [sort, setSort] = useState<SortMode>("rarity");
  const [flip, setFlip] = useState<null | "next" | "prev">(null);
  const [selectedCard, setSelectedCard] = useState<CharacterCard | null>(null);

  // fetch this character's full card list
  useEffect(() => {
    let cancelled = false;
    setCards(null);
    setError(false);
    fetch("/api/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query($id: Int!) {
          characterCards(characterId: $id) {
            cardId name rarity assetbundleName owned level masterRank skillLevel specialTraining
          }
        }`,
        variables: { id: character.characterId },
      }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        const list = j?.data?.characterCards;
        if (Array.isArray(list)) setCards(list);
        else setError(true);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [character.characterId]);

  // sort the cards by the active mode
  const sorted = (cards ?? []).slice().sort((a, b) => {
    if (sort === "owned") {
      if (a.owned !== b.owned) return a.owned ? -1 : 1;
      return b.rarity - a.rarity || a.cardId - b.cardId;
    }
    if (sort === "cardId") return a.cardId - b.cardId;
    // default: rarity desc, then cardId
    return b.rarity - a.rarity || a.cardId - b.cardId;
  });

  const ownedCount = sorted.filter((c) => c.owned).length;
  const spreadCount = Math.max(1, Math.ceil(sorted.length / PER_SPREAD));
  const safeSpread = Math.min(spread, spreadCount - 1);
  const spreadCards = sorted.slice(
    safeSpread * PER_SPREAD,
    safeSpread * PER_SPREAD + PER_SPREAD,
  );
  const leftCards = spreadCards.slice(0, PER_PAGE);
  const rightCards = spreadCards.slice(PER_PAGE, PER_SPREAD);

  // flip with animation, then change spread
  function go(dir: "next" | "prev") {
    if (flip) return;
    if (dir === "next" && safeSpread >= spreadCount - 1) return;
    if (dir === "prev" && safeSpread <= 0) return;
    setFlip(dir);
    setTimeout(() => {
      setSpread((s) =>
        dir === "next" ? Math.min(spreadCount - 1, s + 1) : Math.max(0, s - 1),
      );
      setFlip(null);
    }, 450);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* header: back + name + completion + sort */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-full border border-[var(--line)] bg-[var(--panel-2)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text)] transition hover:border-[var(--accent)]"
        >
          ← back
        </button>
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={charaIcon(character.name)}
            alt={character.name}
            className="h-8 w-8 rounded-full object-cover"
          />
          <span className="text-[16px] font-extrabold text-[var(--text)]">
            {character.name}
          </span>
        </div>
        {cards && (
          <span className="rounded-full bg-[var(--panel-2)] px-2.5 py-1 text-[12px] font-bold text-[var(--accent)]">
            {ownedCount}/{sorted.length}
          </span>
        )}

        {/* sort control */}
        <div className="ml-auto inline-flex rounded-full border border-[var(--line)] bg-[var(--panel-2)] p-0.5 text-[11px] font-semibold">
          {(
            [
              ["rarity", "Rarity"],
              ["owned", "Owned"],
              ["cardId", "Release"],
            ] as [SortMode, string][]
          ).map(([m, label]) => (
            <button
              key={m}
              onClick={() => {
                setSort(m);
                setSpread(0);
              }}
              className="rounded-full px-2.5 py-0.5 transition"
              style={{
                background: sort === m ? "var(--accent)" : "transparent",
                color: sort === m ? "#0c0a1e" : "var(--muted)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* loading / error / binder */}
      {error ? (
        <div className="py-12 text-center text-[var(--muted)]">
          Couldn&apos;t load cards.
        </div>
      ) : !cards ? (
        <div className="py-12 text-center text-[var(--muted)]">Loading…</div>
      ) : (
        <>
          {/* book spread — two facing pages with a 3D page-turn */}
          <div
            className="relative flex gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-3"
            style={{ perspective: "2000px" }}
          >
            <BinderPage cards={leftCards} onPick={setSelectedCard} />
            <BinderPage cards={rightCards} onPick={setSelectedCard} />

            {/* flipping page overlay: covers the right (next) or left (prev) half */}
            {flip && (
              <div
                className="pointer-events-none absolute inset-y-3 rounded-xl bg-[var(--panel-2)]"
                style={{
                  left: flip === "next" ? "50%" : "0.75rem",
                  right: flip === "next" ? "0.75rem" : "50%",
                  transformOrigin:
                    flip === "next" ? "left center" : "right center",
                  animation: `${flip === "next" ? "pageNext" : "pagePrev"} 0.45s ease-in-out forwards`,
                  backfaceVisibility: "hidden",
                  boxShadow: "0 10px 30px -8px rgba(0,0,0,0.5)",
                }}
              />
            )}
          </div>

          {/* pager */}
          {spreadCount > 1 && (
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => go("prev")}
                disabled={safeSpread === 0 || !!flip}
                className="rounded-full border border-[var(--line)] bg-[var(--panel-2)] px-3 py-1 text-[13px] font-bold text-[var(--text)] disabled:opacity-40"
              >
                ←
              </button>
              <span className="text-[12px] font-semibold text-[var(--muted)]">
                {safeSpread + 1} / {spreadCount}
              </span>
              <button
                onClick={() => go("next")}
                disabled={safeSpread === spreadCount - 1 || !!flip}
                className="rounded-full border border-[var(--line)] bg-[var(--panel-2)] px-3 py-1 text-[13px] font-bold text-[var(--text)] disabled:opacity-40"
              >
                →
              </button>
            </div>
          )}

          <style>{`
            @keyframes pageNext {
              0%   { transform: rotateY(0deg); }
              100% { transform: rotateY(-180deg); }
            }
            @keyframes pagePrev {
              0%   { transform: rotateY(0deg); }
              100% { transform: rotateY(180deg); }
            }
          `}</style>
        </>
      )}

      {/* card detail modal */}
      {selectedCard && (
        <CardModal
          card={selectedCard}
          characterName={character.name}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
}

function CardsSection({ characters }: { characters: CharacterSummary[] }) {
  const [activeUnit, setActiveUnit] = useState(UNIT_ORDER[0]);
  const [activeChar, setActiveChar] = useState<CharacterSummary | null>(null);

  // characters in the selected unit, ordered by characterId
  const unitChars = characters
    .filter((c) => (c.unit ?? "") === activeUnit)
    .sort((a, b) => a.characterId - b.characterId);

  // when a character is selected, show their card binder
  if (activeChar) {
    return (
      <CardBinder character={activeChar} onBack={() => setActiveChar(null)} />
    );
  }

  return (
    <div className="flex gap-4">
      {/* unit rail */}
      <div className="flex w-[150px] flex-shrink-0 flex-col gap-2">
        {UNIT_ORDER.map((u) => {
          const on = u === activeUnit;
          return (
            <button
              key={u}
              onClick={() => setActiveUnit(u)}
              className="flex items-center justify-center rounded-xl border px-3 py-3 transition"
              style={{
                background: on ? "var(--panel-2)" : "var(--panel)",
                borderColor: on
                  ? (UNIT_COLORS[u] ?? "var(--accent)")
                  : "var(--line)",
                boxShadow: on
                  ? `0 0 16px -6px ${UNIT_COLORS[u] ?? "var(--accent)"}`
                  : undefined,
                opacity: on ? 1 : 0.6,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={unitLogoUrl(u)}
                alt={UNIT_LABELS[u] ?? u}
                className="h-9 w-full object-contain"
              />
            </button>
          );
        })}
      </div>

      {/* character standing-art cards — same size for all units, spread evenly */}
      <div className="flex min-w-0 flex-1 justify-between gap-3">
        {unitChars.map((c) => {
          return (
            <button
              key={c.characterId}
              onClick={() => setActiveChar(c)}
              className="group relative flex aspect-[2/3] max-w-[180px] flex-1 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel-2)] transition hover:border-[var(--accent)]"
              title={c.name}
            >
              {/* standing art — full image visible, name already baked in */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={charaStandingArt(c.characterId)}
                alt={c.name}
                className="absolute inset-0 h-full w-full object-contain transition group-hover:scale-105"
                loading="lazy"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Music section (song list with jacket + your results) ---------- */

type MusicResult = {
  difficulty: string;
  playResult: string | null;
  playLevel: number | null;
};
type MusicSong = {
  id: number;
  title: string;
  assetbundleName: string;
  tags: string[];
  results: MusicResult[];
};

// difficulty level pip — circle with the play level number. COLOR reflects the
// user's result on that chart (same ladder as honor pips):
//   none/not-cleared → empty (outline)   clear → bronze
//   full combo → blue/teal                full perfect → purple
const RESULT_COLORS: Record<string, string> = {
  CLEAR: "#c8955a", // bronze
  FULL_COMBO: "#4a9de0", // blue/teal
  FULL_PERFECT: "#9b5ad6", // purple
};

function LevelPip({
  level,
  result,
}: {
  level: number | null;
  result: string | null;
}) {
  if (level == null) return null;
  const isFP = result === "FULL_PERFECT";
  const color = result ? RESULT_COLORS[result] : undefined;
  const filled = Boolean(color);
  // full perfect = rainbow gradient; others = solid result color
  const rainbow =
    "linear-gradient(135deg, #ff5f6d, #ffc371, #47e5bc, #4a9de0, #9b5ad6)";
  return (
    <span
      className="inline-flex h-9 w-9 flex-shrink-0 rotate-45 items-center justify-center rounded-[5px] text-[14px] font-extrabold"
      style={{
        background: isFP ? rainbow : filled ? color : "transparent",
        border: `2px solid ${isFP ? "transparent" : (color ?? "var(--line)")}`,
        boxShadow: isFP ? "0 0 10px 1px rgba(155,90,214,0.6)" : undefined,
      }}
      title={`Lv ${level}${result ? ` · ${result.replace("_", " ").toLowerCase()}` : ""}`}
    >
      <span
        className="-rotate-45"
        style={{ color: filled ? "#0c0a1e" : "var(--muted)" }}
      >
        {level}
      </span>
    </span>
  );
}

// music rail: tag → unit logo slug (maps to the same sekai.best unit logos as
// the cards rail). "all" and "other" get text labels instead of a unit logo.
const MUSIC_RAIL: { tag: string; label: string; logo?: string }[] = [
  { tag: "all", label: "All" },
  { tag: "vocaloid", label: "Virtual Singer", logo: "piapro" },
  { tag: "light_music_club", label: "Leo/need", logo: "light_sound" },
  { tag: "idol", label: "MORE MORE JUMP!", logo: "idol" },
  { tag: "street", label: "Vivid BAD SQUAD", logo: "street" },
  { tag: "theme_park", label: "Wonderlands×Showtime", logo: "theme_park" },
  {
    tag: "school_refusal",
    label: "Nightcord at 25:00",
    logo: "school_refusal",
  },
  { tag: "other", label: "Other" },
];

// session cache so re-opening the Music tab doesn't refetch the whole catalog
let MUSIC_CACHE: MusicSong[] | null = null;

const ROW_H = 104; // fixed row height incl. gap, for virtualization

function MusicRow({ s }: { s: MusicSong }) {
  const byDiff = new Map(s.results.map((r) => [r.difficulty, r]));
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-[var(--line)] bg-[var(--panel-2)] p-3 transition hover:border-[var(--accent)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={jacketUrl(s.assetbundleName)}
        alt={s.title}
        className="h-20 w-20 flex-shrink-0 rounded-xl bg-[var(--panel)] object-cover"
        loading="lazy"
        onError={(e) => {
          e.currentTarget.style.visibility = "hidden";
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
        <div className="truncate text-[17px] font-bold text-[var(--text)]">
          {s.title}
        </div>
        <div className="flex flex-wrap gap-2">
          {DIFFICULTY_ORDER.map((d) => {
            const r = byDiff.get(d);
            if (!r) return null;
            return (
              <LevelPip key={d} level={r.playLevel} result={r.playResult} />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MusicSection() {
  const [songs, setSongs] = useState<MusicSong[] | null>(MUSIC_CACHE);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("all");
  const [status, setStatus] = useState("all");
  const [diffFilter, setDiffFilter] = useState("all");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const VIEWPORT_H = 600;

  function handleScroll() {
    const el = scrollRef.current;
    if (el) setScrollTop(el.scrollTop);
  }

  // reset to top when filters change
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = 0;
    setScrollTop(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songs, activeTag, query, status, diffFilter]);

  useEffect(() => {
    if (MUSIC_CACHE) return; // already loaded this session
    let cancelled = false;
    fetch("/api/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `{ musicList { id title assetbundleName tags results { difficulty playResult playLevel } } }`,
      }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        const list = j?.data?.musicList;
        if (Array.isArray(list)) {
          MUSIC_CACHE = list;
          setSongs(list);
        } else setError(true);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = (songs ?? []).filter((s) => {
    const matchesTag = activeTag === "all" || s.tags.includes(activeTag);
    const matchesQuery = s.title.toLowerCase().includes(query.toLowerCase());
    // status filter, scoped to a specific difficulty or ANY difficulty
    let matchesStatus = true;
    if (status !== "all") {
      const pool =
        diffFilter === "all"
          ? s.results
          : s.results.filter((r) => r.difficulty === diffFilter);
      if (status === "UNATTEMPTED") {
        matchesStatus = pool.some((r) => !r.playResult);
      } else {
        matchesStatus = pool.some((r) => r.playResult === status);
      }
    } else if (diffFilter !== "all") {
      // difficulty picked but status "all" → just require the song has that difficulty
      matchesStatus = s.results.some((r) => r.difficulty === diffFilter);
    }
    return matchesTag && matchesQuery && matchesStatus;
  });

  if (error)
    return (
      <div className="py-12 text-center text-[var(--muted)]">
        Couldn&apos;t load music.
      </div>
    );
  if (!songs)
    return (
      <div className="py-12 text-center text-[var(--muted)]">Loading…</div>
    );

  return (
    <div className="flex flex-col gap-3">
      {/* search + status filter + difficulty filter — top, full width */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by song title"
          className="min-w-[180px] flex-1 rounded-full border border-[var(--line)] bg-[var(--panel-2)] px-4 py-2 text-[13px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
        />
        <div className="inline-flex rounded-full border border-[var(--line)] bg-[var(--panel-2)] p-0.5 text-[11px] font-semibold">
          {(
            [
              ["all", "All"],
              ["UNATTEMPTED", "Unattempted"],
              ["CLEAR", "Clear"],
              ["FULL_COMBO", "FC"],
              ["FULL_PERFECT", "AP"],
            ] as [string, string][]
          ).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setStatus(v)}
              className="rounded-full px-2.5 py-1 transition"
              style={{
                background: status === v ? "var(--accent)" : "transparent",
                color: status === v ? "#0c0a1e" : "var(--muted)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* difficulty selector */}
        <div className="inline-flex rounded-full border border-[var(--line)] bg-[var(--panel-2)] p-0.5 text-[11px] font-semibold">
          {["all", ...DIFFICULTY_ORDER].map((d) => (
            <button
              key={d}
              onClick={() => setDiffFilter(d)}
              className="rounded-full px-2.5 py-1 transition"
              style={{
                background:
                  diffFilter === d
                    ? d === "all"
                      ? "var(--accent)"
                      : DIFFICULTY_COLORS[d]
                    : "transparent",
                color: diffFilter === d ? "#0c0a1e" : "var(--muted)",
              }}
            >
              {d === "all" ? "All" : d[0] + d.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <span className="ml-auto text-[12px] font-semibold text-[var(--muted)]">
          {filtered.length} {filtered.length === 1 ? "song" : "songs"}
        </span>
      </div>

      {/* rail (centered) + song list */}
      <div className="flex items-center gap-4">
        {/* unit/tag rail — vertically centered */}
        <div className="flex w-[130px] flex-shrink-0 flex-col gap-2 self-center">
          {MUSIC_RAIL.map((r) => {
            const on = r.tag === activeTag;
            const color = r.logo
              ? (UNIT_COLORS[r.logo] ?? "var(--accent)")
              : "var(--accent)";
            return (
              <button
                key={r.tag}
                onClick={() => setActiveTag(r.tag)}
                className="flex h-11 items-center justify-center rounded-xl border px-2 transition"
                style={{
                  background: on ? "var(--panel-2)" : "var(--panel)",
                  borderColor: on ? color : "var(--line)",
                  boxShadow: on ? `0 0 14px -6px ${color}` : undefined,
                  opacity: on ? 1 : 0.55,
                }}
                title={r.label}
              >
                {r.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={unitLogoUrl(r.logo)}
                    alt={r.label}
                    className="h-7 w-full object-contain"
                  />
                ) : (
                  <span className="text-[12px] font-bold uppercase tracking-wide text-[var(--text)]">
                    {r.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* song list */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {/* virtualized infinite roulette: only visible rows are rendered */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="music-scroll relative overflow-y-auto"
            style={{ height: VIEWPORT_H }}
          >
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-[var(--muted)]">
                No songs matched.
              </div>
            ) : (
              (() => {
                const n = filtered.length;
                // big virtual height so you can scroll a long way in both directions
                const LOOPS = n < 8 ? 1 : 1000;
                const totalH = n * ROW_H * LOOPS;
                const first = Math.max(0, Math.floor(scrollTop / ROW_H) - 2);
                const visibleCount = Math.ceil(VIEWPORT_H / ROW_H) + 4;
                const rows = [];
                for (let i = first; i < first + visibleCount; i++) {
                  const top = i * ROW_H;
                  if (top >= totalH) break;
                  const s = filtered[((i % n) + n) % n]; // wrap index for looping
                  rows.push(
                    <div
                      key={i}
                      className="absolute left-0 right-2"
                      style={{ top, height: ROW_H - 10 }}
                    >
                      <MusicRow s={s} />
                    </div>,
                  );
                }
                return (
                  <div style={{ height: totalH, position: "relative" }}>
                    {rows}
                  </div>
                );
              })()
            )}
          </div>
        </div>
      </div>

      <style>{`
        .music-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .music-scroll::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

/* ---------- Events section ---------- */

type EventItem = {
  id: number;
  name: string;
  assetbundleName: string;
  eventType: string | null;
  startAt: string | null;
  unit: string | null;
  rank: number | null;
};

// event logo (banner) art
function eventLogoUrl(abn: string): string {
  return `https://storage.sekai.best/sekai-en-assets/event/${abn}/logo/logo.webp`;
}
// event background art
function eventBgUrl(abn: string): string {
  return `https://storage.sekai.best/sekai-en-assets/event/${abn}/screen/bg.webp`;
}
// event character cutout (foreground figure)
function eventCharacterUrl(abn: string): string {
  return `https://storage.sekai.best/sekai-en-assets/event/${abn}/screen/character.webp`;
}

// map an exact final rank to its "Top X" tier (Sekai reward borders)
function rankRange(rank: number): string {
  const borders = [
    10, 50, 100, 500, 1000, 2000, 3000, 5000, 10000, 20000, 30000, 50000,
    100000,
  ];
  for (const b of borders) {
    if (rank <= b) return `Top ${b.toLocaleString()}`;
  }
  return `Top 100,000+`;
}

let EVENT_CACHE: EventItem[] | null = null;

// event unit → rail tag (events use "none" for VS/mixed)
const EVENT_RAIL: { key: string; label: string; logo?: string }[] = [
  { key: "all", label: "All" },
  { key: "piapro", label: "Virtual Singer", logo: "piapro" },
  { key: "light_sound", label: "Leo/need", logo: "light_sound" },
  { key: "idol", label: "MORE MORE JUMP!", logo: "idol" },
  { key: "street", label: "Vivid BAD SQUAD", logo: "street" },
  { key: "theme_park", label: "Wonderlands×Showtime", logo: "theme_park" },
  {
    key: "school_refusal",
    label: "Nightcord at 25:00",
    logo: "school_refusal",
  },
  { key: "none", label: "Other" },
];

function EventsSection() {
  const [events, setEvents] = useState<EventItem[] | null>(EVENT_CACHE);
  const [error, setError] = useState(false);
  const [activeUnit, setActiveUnit] = useState("all");
  const [hovered, setHovered] = useState<EventItem | null>(
    EVENT_CACHE && EVENT_CACHE.length ? EVENT_CACHE[0] : null,
  );

  // when the unit filter changes, default the preview to the first event in
  // the filtered list (so the background/rank isn't stale or blank)
  useEffect(() => {
    if (!events) return;
    const list = events.filter(
      (e) => activeUnit === "all" || (e.unit ?? "none") === activeUnit,
    );
    setHovered(list.length ? list[0] : null);
  }, [activeUnit, events]);

  useEffect(() => {
    if (EVENT_CACHE) return;
    let cancelled = false;
    fetch("/api/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `{ eventList { id name assetbundleName eventType startAt unit rank } }`,
      }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        const list = j?.data?.eventList;
        if (Array.isArray(list)) {
          EVENT_CACHE = list;
          setEvents(list);
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
        Couldn&apos;t load events.
      </div>
    );
  if (!events)
    return (
      <div className="py-12 text-center text-[var(--muted)]">Loading…</div>
    );

  const filtered = events.filter(
    (e) => activeUnit === "all" || (e.unit ?? "none") === activeUnit,
  );

  return (
    <div className="relative min-h-[560px] overflow-hidden rounded-2xl">
      {/* background = hovered event art — right band, edge softened by mask */}
      {hovered && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={eventBgUrl(hovered.assetbundleName)}
            alt=""
            className="absolute inset-y-0 right-0 h-full w-[55%] object-cover opacity-90 transition-opacity duration-500"
            style={{
              objectPosition:
                hovered.eventType === "world_bloom" ? "0% center" : "center",
              WebkitMaskImage:
                "linear-gradient(to right, transparent, black 35%)",
              maskImage: "linear-gradient(to right, transparent, black 35%)",
            }}
          />
        </div>
      )}

      {/* rank — single spot, lower-right of the background */}
      {hovered && (
        <div className="absolute bottom-5 right-6 z-30 text-right">
          {hovered.rank != null ? (
            <>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70 drop-shadow">
                Your Rank
              </div>
              <div
                className="text-[26px] font-extrabold drop-shadow-lg"
                style={{ color: "var(--accent)" }}
              >
                {rankRange(hovered.rank)}
              </div>
            </>
          ) : (
            <div className="text-[15px] font-semibold text-white/70 drop-shadow">
              Unranked
            </div>
          )}
        </div>
      )}

      <div className="relative z-20 flex gap-4 p-2">
        {/* unit rail */}
        <div className="flex w-[120px] flex-shrink-0 flex-col gap-2 self-center">
          {EVENT_RAIL.map((r) => {
            const on = r.key === activeUnit;
            const color = r.logo
              ? (UNIT_COLORS[r.logo] ?? "var(--accent)")
              : "var(--accent)";
            return (
              <button
                key={r.key}
                onClick={() => setActiveUnit(r.key)}
                className="flex h-11 items-center justify-center rounded-xl border px-2 transition"
                style={{
                  background: on ? "var(--panel-2)" : "var(--panel)",
                  borderColor: on ? color : "var(--line)",
                  boxShadow: on ? `0 0 14px -6px ${color}` : undefined,
                  opacity: on ? 1 : 0.55,
                }}
                title={r.label}
              >
                {r.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={unitLogoUrl(r.logo)}
                    alt={r.label}
                    className="h-6 w-full object-contain"
                  />
                ) : (
                  <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--text)]">
                    {r.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* event banner list — fixed-width column, doesn't stretch right */}
        <div className="event-scroll flex max-h-[540px] w-[340px] flex-shrink-0 flex-col gap-3 overflow-y-auto pr-1">
          {filtered.map((e) => (
            <button
              key={e.id}
              onMouseEnter={() => setHovered(e)}
              className="aspect-[5/2] w-full flex-shrink-0 overflow-hidden rounded-2xl border transition"
              style={{
                borderColor:
                  hovered?.id === e.id ? "var(--accent)" : "var(--line)",
                boxShadow:
                  hovered?.id === e.id
                    ? "0 0 16px -6px var(--accent)"
                    : undefined,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={eventLogoUrl(e.assetbundleName)}
                alt={e.name}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(ev) => {
                  ev.currentTarget.style.visibility = "hidden";
                }}
              />
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="py-8 text-center text-[13px] text-[var(--muted)]">
              No events.
            </div>
          )}
        </div>
      </div>

      <style>{`
        .event-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .event-scroll::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

/* ---------- summary card ---------- */

function SummaryCard({
  game,
  lastUpdated,
  characters,
  difficulties,
}: {
  game: Game;
  lastUpdated: string | null;
  characters: CharacterSummary[];
  difficulties: Difficulty[];
}) {
  const hasData = characters.length > 0;
  const [activeSection, setActiveSection] = useState("Summary");
  const allSections = ["Summary", ...game.sections];

  return (
    <div
      className="overflow-hidden rounded-b-[20px] rounded-tr-[20px] border bg-[var(--panel)] transition-all duration-500"
      style={{
        borderColor: "var(--accent)",
        boxShadow:
          "0 16px 50px -20px rgba(0,0,0,0.5), 0 0 40px -20px var(--accent)",
      }}
    >
      <div
        className="relative overflow-hidden p-7 transition-all duration-500"
        style={{ background: "var(--gbanner)" }}
      >
        <div className="flex items-center gap-4">
          <div
            className="flex h-[60px] w-[60px] flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl text-xl font-extrabold text-white shadow-lg"
            style={{ background: game.logoBg }}
          >
            {game.logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={game.logoSrc}
                alt={game.name}
                className="h-full w-full object-contain p-1.5"
              />
            ) : (
              game.logo
            )}
          </div>
          <div>
            <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-white drop-shadow-md">
              {game.name}
            </h1>
            <p className="mt-0.5 text-xs tracking-wide text-white/85">
              {game.tag}
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-6">
          {game.info.map((i) => (
            <div key={i.label}>
              <div className="text-sm font-semibold text-white">{i.value}</div>
              <div className="text-[11px] text-white/75">{i.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-5 p-7">
        <div className="flex flex-wrap items-center gap-2">
          {allSections.map((s) => {
            const on = s === activeSection;
            return (
              <button
                key={s}
                onClick={() => setActiveSection(s)}
                className="rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition"
                style={{
                  background: on ? "var(--accent)" : "var(--panel-2)",
                  color: on ? "#0c0a1e" : "var(--muted)",
                  borderColor: on ? "var(--accent)" : "var(--line)",
                }}
              >
                {s}
              </button>
            );
          })}
          {lastUpdated && (
            <span className="ml-auto text-[11px] text-[var(--muted)]">
              updated {lastUpdated}
            </span>
          )}
        </div>

        {activeSection === "Cards" && <CardsSection characters={characters} />}

        {activeSection === "Music" && <MusicSection />}

        {activeSection === "Events" && <EventsSection />}

        {activeSection !== "Summary" &&
          activeSection !== "Cards" &&
          activeSection !== "Music" &&
          activeSection !== "Events" && (
            <div className="py-12 text-center text-[var(--muted)]">
              {activeSection} — coming soon
            </div>
          )}

        {activeSection === "Summary" && (
          <>
            <div>
              <div
                className="text-[52px] font-extrabold leading-none"
                style={{
                  color: "var(--accent)",
                  textShadow: "0 0 30px var(--accent)",
                }}
              >
                {game.hero.value}
              </div>
              <div className="mt-0.5 text-[13px] text-[var(--muted)]">
                {game.hero.label}
              </div>
            </div>

            {hasData ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <DifficultyStrip
                    title="CLEAR"
                    difficulties={difficulties}
                    field="clears"
                  />
                  <DifficultyStrip
                    title="FULL COMBO"
                    difficulties={difficulties}
                    field="fullCombos"
                  />
                </div>

                {/* tiers (left) + rank/challenge grid (right) side by side */}
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                  <div className="min-w-0 lg:w-1/2">
                    <FavoriteTiers characters={characters} />

                    {/* top songs fill the space beneath the tiers */}
                    <div className="mt-6">
                      <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-[var(--muted)]">
                        Top Songs
                      </h2>
                      <TopSongs />
                    </div>
                  </div>
                  <div className="min-w-0 lg:w-1/2">
                    <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-[var(--muted)]">
                      Characters
                    </h2>
                    <CharacterGrid characters={characters} />
                  </div>
                </div>

                {/* Kizuna — all characters' honors grouped by team, full width */}
                <KizunaGrid characters={characters} />
              </>
            ) : (
              <div>
                <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  Top Characters
                </h2>
                <div className="flex flex-wrap gap-2">
                  {game.favorites.map((f) => (
                    <div
                      key={f.name}
                      className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--panel-2)] py-0.5 pl-0.5 pr-3"
                    >
                      <div
                        className="h-7 w-7 rounded-full"
                        style={{
                          background:
                            "linear-gradient(135deg, var(--accent), var(--accent-2))",
                        }}
                      />
                      <div className="leading-tight">
                        <div className="text-[12px] font-bold text-[var(--text)]">
                          {f.name}
                        </div>
                        <div
                          className="text-[10px]"
                          style={{ color: "var(--accent)" }}
                        >
                          {f.rank}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
