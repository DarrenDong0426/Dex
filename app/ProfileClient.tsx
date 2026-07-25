"use client";

import { useState } from "react";
import Link from "next/link";
import { games, themes, type Game, type Mode } from "@/app/games";
import BackgroundFX from "@/app/BackgroundFX";

type ProfileData = { name: string; rank: number; createdAt: string } | null;

export default function ProfileClient({ profile }: { profile: ProfileData }) {
  const [activeSlug, setActiveSlug] = useState(games[0].slug);
  const [mode, setMode] = useState<Mode>("dark");

  const active = games.find((g) => g.slug === activeSlug) ?? games[0];
  const vars = themes[active.slug][mode] as React.CSSProperties;

  // patch Sekai's summary with real DB data when available
  const display: Game =
    active.slug === "sekai" && profile
      ? {
          ...active,
          hero: { value: String(profile.rank), label: "player rank" },
          info: [
            { value: profile.name, label: "username" },
            active.info[1], // game ID — still dummy
            {
              value: new Date(Number(profile.createdAt)).toLocaleDateString(
                "en-US",
                { month: "short", year: "numeric" },
              ),
              label: "playing since",
            },
          ],
        }
      : active;

  return (
    <div
      style={vars}
      className="min-h-screen bg-[var(--bg)] transition-colors duration-500"
    >
      <BackgroundFX mode={mode} />

      <button
        onClick={() => setMode(mode === "dark" ? "light" : "dark")}
        className="fixed top-3 right-3 z-20 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-[13px] text-[var(--text)]"
      >
        {mode === "dark" ? "☀" : "🌙"} toggle theme
      </button>

      <div className="relative z-10 mx-auto max-w-[1140px] p-6">
        <ProfileBanner />

        <div className="flex gap-5">
          <Sidebar activeSlug={activeSlug} onPick={setActiveSlug} />

          <div className="min-w-0 flex-1">
            <FolderTabs activeSlug={activeSlug} onPick={setActiveSlug} />
            <SummaryCard game={display} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- profile banner (neutral, constant) ---------- */

function ProfileBanner() {
  return (
    <div
      className="relative mb-6 flex items-center gap-7 overflow-hidden rounded-3xl border border-white/10 p-8
                 shadow-[0_20px_60px_-22px_rgba(0,0,0,0.5)] transition-all duration-500"
      style={{ background: "var(--banner-bg)" }}
    >
      <div
        className="pointer-events-none absolute -top-16 -right-16 h-72 w-72 rounded-full opacity-20"
        style={{
          background: "radial-gradient(circle, var(--accent), transparent 70%)",
        }}
      />
      <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-[26px] bg-gradient-to-br from-[#eeeeff] to-[#b7b7d6] text-4xl font-extrabold text-[#1a1730] shadow-lg">
        I
      </div>
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

/* ---------- sidebar (game icons) ---------- */

function Sidebar({
  activeSlug,
  onPick,
}: {
  activeSlug: string;
  onPick: (slug: string) => void;
}) {
  return (
    <div className="sticky top-6 flex h-fit w-[74px] flex-shrink-0 flex-col items-center gap-3 rounded-3xl border border-[var(--line)] bg-[var(--panel)] py-3.5 transition-colors duration-500">
      {games.map((g) => {
        const on = g.slug === activeSlug;
        return (
          <button
            key={g.slug}
            onClick={() => onPick(g.slug)}
            title={g.name}
            className={`relative flex h-12 w-12 items-center justify-center rounded-[14px] text-[15px] font-extrabold text-white transition
                        ${on ? "opacity-100" : "opacity-50 hover:opacity-85"}`}
            style={{
              background: g.logoBg,
              boxShadow: on
                ? "0 0 0 2px var(--bg), 0 0 0 4px var(--accent), 0 0 22px -2px var(--accent)"
                : undefined,
            }}
          >
            {on && (
              <span
                className="absolute -left-3.5 top-1/2 h-6 w-1 -translate-y-1/2 rounded"
                style={{
                  background: "var(--accent)",
                  boxShadow: "0 0 10px var(--accent)",
                }}
              />
            )}
            {g.logo}
          </button>
        );
      })}

      <div className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-dashed border-[var(--line)] text-xl text-[var(--muted)]">
        +
      </div>
    </div>
  );
}

/* ---------- folder tabs (games, synced with sidebar) ---------- */

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
              className="inline-flex h-5 w-5 items-center justify-center rounded-md text-[9px] font-extrabold text-white"
              style={{ background: g.logoBg }}
            >
              {g.logo}
            </span>
            {g.name}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- summary card ---------- */

function SummaryCard({ game }: { game: Game }) {
  return (
    <div
      className="overflow-hidden rounded-b-[20px] rounded-tr-[20px] border bg-[var(--panel)] transition-all duration-500"
      style={{
        borderColor: "var(--accent)",
        boxShadow:
          "0 16px 50px -20px rgba(0,0,0,0.5), 0 0 40px -20px var(--accent)",
      }}
    >
      {/* game banner */}
      <div
        className="relative overflow-hidden p-7 transition-all duration-500"
        style={{ background: "var(--gbanner)" }}
      >
        <div className="flex items-center gap-4">
          <div
            className="flex h-[60px] w-[60px] flex-shrink-0 items-center justify-center rounded-2xl text-xl font-extrabold text-white shadow-lg"
            style={{ background: game.logoBg }}
          >
            {game.logo}
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

      {/* body */}
      <div className="flex flex-col gap-6 p-7">
        {/* section nav — links out to full pages */}
        <div className="flex flex-wrap gap-2">
          {game.sections.map((s) => (
            <Link
              key={s}
              href={`/${game.slug}/${s.toLowerCase()}`}
              className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--panel-2)] px-3.5 py-1.5 text-[12.5px] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--text)]"
            >
              {s} <span className="text-[11px] opacity-60">→</span>
            </Link>
          ))}
        </div>

        {/* hero + quick stats */}
        <div className="flex flex-wrap items-end gap-6">
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

          <div className="ml-auto flex flex-wrap gap-2.5">
            {game.quickStats.map((s) => (
              <div
                key={s.label}
                className="min-w-[82px] rounded-xl border border-[var(--line)] bg-[var(--panel-2)] px-4 py-2.5"
              >
                <div className="text-xl font-bold text-[var(--text)]">
                  {s.value}
                </div>
                <div className="text-[11px] text-[var(--muted)]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* top characters */}
        <div>
          <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-[var(--muted)]">
            Top Characters
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {game.favorites.map((f) => (
              <div
                key={f.name}
                className="flex flex-col items-center rounded-2xl border border-[var(--line)] bg-[var(--panel-2)] p-4 text-center transition hover:border-[var(--accent)]"
              >
                <div
                  className="mb-2.5 h-[60px] w-[60px] rounded-full"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--accent), var(--accent-2))",
                    boxShadow: "0 0 18px -4px var(--accent)",
                  }}
                />
                <div className="text-sm font-bold text-[var(--text)]">
                  {f.name}
                </div>
                <div
                  className="mt-0.5 text-xs font-semibold"
                  style={{ color: "var(--accent)" }}
                >
                  {f.rank}
                </div>
                <div className="mt-1.5 rounded-full bg-[var(--panel)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
                  {f.badge}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
