"use client";

import { useState } from "react";
import Link from "next/link";
import { Instagram } from "lucide-react";
import { games, themes, type Game, type Mode } from "@/app/games";
import BackgroundFX from "@/app/BackgroundFX";

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

// Self-hosted character icons in /public/chara/, named by lowercase GIVEN name
// (e.g. /chara/ichika.png). The sekai.best URL is a hashed build asset, so we
// self-host. summary name is "Ichika Hoshino" → given name is the first word.
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
      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#eeeeff] to-[#b0b0cc] text-lg font-extrabold text-[#1a1730]">
        I
      </div>
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
              background: g.logoSrc ? "var(--panel-2)" : g.logoBg,
              boxShadow: on ? "0 0 22px -2px var(--accent)" : undefined,
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
                className="h-full w-full object-contain p-1.5"
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
        style={{ background: "radial-gradient(circle, var(--accent), transparent 70%)" }}
      />

      {/* LEFT: pfp + name + alias + meta */}
      <div className="flex items-center gap-7">
        <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-[26px] bg-gradient-to-br from-[#eeeeff] to-[#b7b7d6] text-4xl font-extrabold text-[#1a1730] shadow-lg">
          I
        </div>
        <div>
          <div className="text-4xl font-extrabold tracking-tight" style={{ color: "var(--banner-text)" }}>
            ITAMI
          </div>
          <div className="mt-2 text-sm" style={{ color: "var(--banner-sub)" }}>
            A.K.A. <b className="font-semibold" style={{ color: "var(--banner-b)" }}>NONAME</b>
          </div>
          <div className="mt-3.5 flex gap-6">
            <Meta value={String(games.length)} label="games" />
            <Meta value="USA" label="region" />
          </div>
        </div>
      </div>

      {/* RIGHT: description + socials */}
      <div className="relative max-w-sm sm:text-right">
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--banner-sub)" }}>
          Your description here — a short blurb about you, your games, whatever
          you want visitors to read.
        </p>
        <div className="mt-4 flex gap-3 sm:justify-end">
          <a
            href="https://instagram.com/YOURHANDLE"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--panel-2)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text)] transition hover:border-[var(--accent)]"
          >
            <Instagram size={14} /> Instagram
          </a>
          <a
            href="https://discord.gg/YOURINVITE"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--panel-2)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text)] transition hover:border-[var(--accent)]"
          >
            <DiscordIcon /> Discord
          </a>
        </div>
      </div>
    </div>
  );
}

// Discord isn't in lucide-react — small inline SVG
function DiscordIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
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
              style={{ background: g.logoSrc ? "var(--panel-2)" : g.logoBg }}
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
  "light_sound",
  "idol",
  "street",
  "theme_park",
  "school_refusal",
  "piapro",
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
  const units = UNIT_ORDER.filter((u) => byUnit.has(u));

  return (
    <div>
      {/* rank / challenge toggle */}
      <div className="mb-3 inline-flex rounded-full border border-[var(--line)] bg-[var(--panel-2)] p-0.5 text-[11px] font-semibold">
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
                    className="flex items-center gap-1 rounded-full bg-[var(--panel-2)] p-0.5 pr-2"
                    title={c.name}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={charaIcon(c.name)}
                      alt={c.name}
                      className="h-5 w-5 flex-shrink-0 rounded-full object-cover"
                      loading="lazy"
                    />
                    <span className="text-[11px] font-bold leading-none text-[var(--text)]">
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
            style={{ background: game.logoSrc ? "transparent" : game.logoBg }}
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
          {game.sections.map((s) => (
            <Link
              key={s}
              href={`/${game.slug}/${s.toLowerCase()}`}
              className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--panel-2)] px-3.5 py-1.5 text-[12.5px] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--text)]"
            >
              {s} <span className="text-[11px] opacity-60">&rarr;</span>
            </Link>
          ))}
          {lastUpdated && (
            <span className="ml-auto text-[11px] text-[var(--muted)]">
              updated {lastUpdated}
            </span>
          )}
        </div>

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

            {/* tiers ABOVE the rank/challenge grid */}
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              {/* left: rank/challenge grid (2/3) */}
              <div className="min-w-0 lg:w-1/2">
                <FavoriteTiers characters={characters} />
              </div>
              {/* right: tiers (1/3) */}
              <div className="lg:w-1/2">
                <CharacterGrid characters={characters} />
              </div>
            </div>
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
      </div>
    </div>
  );
}