// Dummy data for the static shell. Sekai's numbers get wired to the DB later.

export type Stat = { value: string; label: string };

// entries are things Darren tracks — games OR anime. The shell iterates over
// all of them; `kind` decides which section set / page shape to render.
export type EntryKind = "game" | "anime";

export type Game = {
  slug: string;
  name: string;
  tag: string;
  kind: EntryKind; // "game" (default) or "anime"
  logo: string; // short code until real logos are dropped in
  logoBg: string; // css background for the logo tile
  logoSrc?: string;
  info: Stat[]; // username / game id / since
  hero: Stat; // the big number
  quickStats: Stat[];
  sections: string[]; // links out to /[slug]/[section]
  favorites: { name: string; rank: string; badge: string }[];
  hasSummary?: boolean; // default true — set false to skip the Summary tab
  // entirely (e.g. Clash Royale/Brawl Stars, which show their own player
  // header directly on the one real section instead)
};

// the tab bar's full section list for a game — "Summary" first, unless the
// game opts out via hasSummary: false
export function tabsFor(game: Game): string[] {
  return game.hasSummary === false ? game.sections : ["Summary", ...game.sections];
}

export type Mode = "dark" | "light";

// CSS custom properties applied to the page wrapper per game + mode.
export type ThemeVars = Record<string, string>;

export const themes: Record<string, Record<Mode, ThemeVars>> = {
  sekai: {
    dark: {
      "--bg": "#0d0f1a",
      "--panel": "#181b2e",
      "--panel-2": "#20243d",
      "--line": "#333a5c",
      "--text": "#eef1ff",
      "--muted": "#9aa3c8",
      "--accent": "#5ec8b8",
      "--accent-2": "#f0819e",
      "--scene":
        "radial-gradient(60% 50% at 12% 15%, #4ab7a033, transparent 55%), radial-gradient(55% 50% at 88% 20%, #f0819e2e, transparent 55%), radial-gradient(60% 50% at 60% 95%, #3a8ee02e, transparent 55%), linear-gradient(180deg,#0d0f1a 0%,#0d0f1a 70%)",
      "--gbanner": "linear-gradient(120deg,#4ab7a0,#f0819e,#3a8ee0,#9b6ee0)",
      "--banner-bg": "linear-gradient(135deg,#232041,#16142e)",
      "--banner-text": "#f6f4ff",
      "--banner-sub": "#a29fc0",
      "--banner-b": "#ddd9f0",
    },
    light: {
      "--bg": "#fdf3f6",
      "--panel": "#ffffff",
      "--panel-2": "#fdeaf1",
      "--line": "#f3d3e0",
      "--text": "#3a2b33",
      "--muted": "#a0899a",
      "--accent": "#e8749a",
      "--accent-2": "#7ec8bb",
      "--scene":
        "radial-gradient(60% 50% at 12% 12%, #ffd0e0cc, transparent 55%), radial-gradient(55% 50% at 88% 18%, #d6f0e8bb, transparent 55%), radial-gradient(60% 50% at 60% 96%, #e0d4ffaa, transparent 55%), linear-gradient(180deg,#fff4f7 0%,#fdf3f6 70%)",
      "--gbanner": "linear-gradient(120deg,#f2a0be,#ffcf9e,#a8d0f0,#c9b3f0)",
      "--banner-bg": "linear-gradient(135deg,#fff,#fdeef2)",
      "--banner-text": "#3a2b33",
      "--banner-sub": "#a0899a",
      "--banner-b": "#c76a90",
    },
  },
  genshin: {
    dark: {
      "--bg": "#080d1a",
      "--panel": "#111a30",
      "--panel-2": "#182442",
      "--line": "#26375e",
      "--text": "#f2f0e0",
      "--muted": "#9fb0cc",
      "--accent": "#e8c15a",
      "--accent-2": "#4a78c8",
      "--scene":
        "radial-gradient(65% 55% at 80% 8%, #1e3a6e55, transparent 55%), radial-gradient(55% 50% at 12% 28%, #d4af3722, transparent 55%), linear-gradient(180deg,#080d1a 0%,#080d1a 70%)",
      "--gbanner": "linear-gradient(135deg,#16294e,#d4af3733,#0a1120)",
      "--banner-bg": "linear-gradient(135deg,#232041,#16142e)",
      "--banner-text": "#f6f4ff",
      "--banner-sub": "#a29fc0",
      "--banner-b": "#ddd9f0",
    },
    light: {
      "--bg": "#f6f4ea",
      "--panel": "#ffffff",
      "--panel-2": "#f3eeda",
      "--line": "#e3d8b8",
      "--text": "#2e2a1c",
      "--muted": "#9a8f6f",
      "--accent": "#c69a2e",
      "--accent-2": "#3a6ab0",
      "--scene":
        "radial-gradient(65% 55% at 80% 8%, #cdd8f0cc, transparent 55%), radial-gradient(55% 50% at 12% 28%, #f0e2b0bb, transparent 55%), linear-gradient(180deg,#fbf8ec 0%,#f6f4ea 70%)",
      "--gbanner": "linear-gradient(135deg,#3a6ab0,#f0d488,#dfe6f2)",
      "--banner-bg": "linear-gradient(135deg,#fff,#f7f3e6)",
      "--banner-text": "#2e2a1c",
      "--banner-sub": "#9a8f6f",
      "--banner-b": "#b08a2e",
    },
  },
  // Anime isn't a game but themes the page like one. Violet/rose palette to
  // read distinctly from Sekai (mint) and Genshin (gold).
  anime: {
    dark: {
      "--bg": "#0f0b18",
      "--panel": "#1b1530",
      "--panel-2": "#241c40",
      "--line": "#3a2f5c",
      "--text": "#f2eeff",
      "--muted": "#b0a3cc",
      "--accent": "#b57ce0",
      "--accent-2": "#f07ea8",
      "--scene":
        "radial-gradient(60% 50% at 15% 12%, #8b5ad044, transparent 55%), radial-gradient(55% 50% at 85% 20%, #f07ea82e, transparent 55%), radial-gradient(60% 50% at 55% 95%, #6e5ad02e, transparent 55%), linear-gradient(180deg,#0f0b18 0%,#0f0b18 70%)",
      "--gbanner": "linear-gradient(120deg,#8b5ad0,#f07ea8,#6e8ae0,#b57ce0)",
      "--banner-bg": "linear-gradient(135deg,#241c40,#16122a)",
      "--banner-text": "#f6f4ff",
      "--banner-sub": "#b0a3cc",
      "--banner-b": "#e0d6f5",
    },
    light: {
      "--bg": "#faf4fd",
      "--panel": "#ffffff",
      "--panel-2": "#f5eafb",
      "--line": "#e6d3f3",
      "--text": "#33283a",
      "--muted": "#9a89a8",
      "--accent": "#a35ad0",
      "--accent-2": "#e87ea8",
      "--scene":
        "radial-gradient(60% 50% at 15% 12%, #e6d0ffcc, transparent 55%), radial-gradient(55% 50% at 85% 18%, #ffd0e4bb, transparent 55%), radial-gradient(60% 50% at 55% 96%, #d8d4ffaa, transparent 55%), linear-gradient(180deg,#fdf7ff 0%,#faf4fd 70%)",
      "--gbanner": "linear-gradient(120deg,#c9a0e6,#ffcfe0,#b8c0f0,#d9b3f0)",
      "--banner-bg": "linear-gradient(135deg,#fff,#f6eefb)",
      "--banner-text": "#33283a",
      "--banner-sub": "#9a89a8",
      "--banner-b": "#9a5ac0",
    },
  },
  // Clash Royale's own navy/gold/purple palette, distinct from Genshin's
  // warmer gold and Sekai's mint/rose.
  clashroyale: {
    dark: {
      "--bg": "#0a1128",
      "--panel": "#121c3d",
      "--panel-2": "#182650",
      "--line": "#2c3d6e",
      "--text": "#eef1ff",
      "--muted": "#9aa8d4",
      "--accent": "#f2c94a",
      "--accent-2": "#7c5ce0",
      "--scene":
        "radial-gradient(60% 50% at 15% 12%, #7c5ce033, transparent 55%), radial-gradient(55% 50% at 85% 20%, #f2c94a22, transparent 55%), radial-gradient(60% 50% at 55% 95%, #2c5ee02e, transparent 55%), linear-gradient(180deg,#0a1128 0%,#0a1128 70%)",
      "--gbanner": "linear-gradient(120deg,#f2c94a,#7c5ce0,#3a5ee0,#f2c94a)",
      "--banner-bg": "linear-gradient(135deg,#182650,#0e1738)",
      "--banner-text": "#f6f4ff",
      "--banner-sub": "#9aa8d4",
      "--banner-b": "#f2c94a",
    },
    light: {
      "--bg": "#eef2fc",
      "--panel": "#ffffff",
      "--panel-2": "#e4eaf9",
      "--line": "#c8d4f0",
      "--text": "#1a2340",
      "--muted": "#7684ac",
      "--accent": "#c99414",
      "--accent-2": "#6a4ec0",
      "--scene":
        "radial-gradient(60% 50% at 15% 12%, #d8caffcc, transparent 55%), radial-gradient(55% 50% at 85% 18%, #f2e0a8bb, transparent 55%), radial-gradient(60% 50% at 55% 96%, #c8d8ffaa, transparent 55%), linear-gradient(180deg,#f4f7fd 0%,#eef2fc 70%)",
      "--gbanner": "linear-gradient(120deg,#e0b840,#8a6ad0,#5a7ee0)",
      "--banner-bg": "linear-gradient(135deg,#fff,#eef2fb)",
      "--banner-text": "#1a2340",
      "--banner-sub": "#7684ac",
      "--banner-b": "#a87c10",
    },
  },
  // Brawl Stars' bright yellow/pink palette, deliberately loud to read
  // distinctly from the other three.
  brawlstars: {
    dark: {
      "--bg": "#1a0f2e",
      "--panel": "#241645",
      "--panel-2": "#2f1c58",
      "--line": "#4a2e80",
      "--text": "#fff8e8",
      "--muted": "#c8a8e8",
      "--accent": "#ffd23f",
      "--accent-2": "#ff5fa2",
      "--scene":
        "radial-gradient(60% 50% at 15% 12%, #ffd23f2e, transparent 55%), radial-gradient(55% 50% at 85% 20%, #ff5fa22e, transparent 55%), radial-gradient(60% 50% at 55% 95%, #6e3ad02e, transparent 55%), linear-gradient(180deg,#1a0f2e 0%,#1a0f2e 70%)",
      "--gbanner": "linear-gradient(120deg,#ffd23f,#ff5fa2,#a860e0,#ffd23f)",
      "--banner-bg": "linear-gradient(135deg,#2f1c58,#190f30)",
      "--banner-text": "#fff8e8",
      "--banner-sub": "#c8a8e8",
      "--banner-b": "#ffd23f",
    },
    light: {
      "--bg": "#fff8ea",
      "--panel": "#ffffff",
      "--panel-2": "#fff0d0",
      "--line": "#ffdca0",
      "--text": "#3a2410",
      "--muted": "#a08050",
      "--accent": "#e08a00",
      "--accent-2": "#e04888",
      "--scene":
        "radial-gradient(60% 50% at 15% 12%, #ffe8b8cc, transparent 55%), radial-gradient(55% 50% at 85% 18%, #ffd0e4bb, transparent 55%), radial-gradient(60% 50% at 55% 96%, #e8d0ffaa, transparent 55%), linear-gradient(180deg,#fffaf0 0%,#fff8ea 70%)",
      "--gbanner": "linear-gradient(120deg,#f0c030,#f06aa8,#b070e0)",
      "--banner-bg": "linear-gradient(135deg,#fff,#fff4e0)",
      "--banner-text": "#3a2410",
      "--banner-sub": "#a08050",
      "--banner-b": "#c06a00",
    },
  },
};

const SEKAI_RAINBOW =
  "conic-gradient(from 90deg,#4ab7a0,#f0819e,#3a8ee0,#f0a04a,#9b6ee0,#4ab7a0)";
const GENSHIN_GOLD = "linear-gradient(135deg,#1e3a6e,#d4af37)";
const ANIME_VIOLET = "linear-gradient(135deg,#8b5ad0,#f07ea8)";
const CLASHROYALE_BLUE = "linear-gradient(135deg,#1a2a5e,#f2c94a)";
const BRAWLSTARS_YELLOW = "linear-gradient(135deg,#ffd23f,#ff5fa2)";

export const games: Game[] = [
  {
    slug: "sekai",
    name: "Project Sekai",
    tag: "COLORFUL STAGE! · RHYTHM",
    kind: "game",
    logo: "PS",
    logoBg: SEKAI_RAINBOW,
    logoSrc: "/logos/sekai.webp",
    info: [
      { value: "Itami", label: "username" },
      { value: "#8821 4471 90", label: "game ID" },
      { value: "Jan 2022", label: "playing since" },
    ],
    hero: { value: "417", label: "player rank" },
    quickStats: [
      { value: "463", label: "full perfects" },
      { value: "573", label: "cards" },
      { value: "141", label: "events" },
      { value: "1032", label: "full combos" },
    ],
    sections: ["Cards", "Music", "Events", "Stamps", "Honors", "Creations"],
    favorites: [
      { name: "Kanade", rank: "Rank 62", badge: "Nightcord" },
      { name: "Mafuyu", rank: "Rank 58", badge: "Nightcord" },
      { name: "Ena", rank: "Rank 55", badge: "Nightcord" },
    ],
  },
  {
    slug: "genshin",
    name: "Genshin Impact",
    tag: "TEYVAT · OPEN-WORLD RPG",
    kind: "game",
    logo: "GI",
    logoBg: GENSHIN_GOLD,
    logoSrc: "/logos/genshin.png",
    info: [
      { value: "Itami", label: "username" },
      { value: "613299997", label: "UID" },
      { value: "Oct 2020", label: "playing since" },
    ],
    hero: { value: "60", label: "adventure rank" },
    quickStats: [
      { value: "42", label: "characters" },
      { value: "156", label: "weapons" },
      { value: "36", label: "abyss ★" },
      { value: "5", label: "regions" },
    ],
    sections: ["Characters", "Gear", "Creations"],
    favorites: [
      { name: "Furina", rank: "Lv90 · C2", badge: "Fontaine" },
      { name: "Neuvillette", rank: "Lv90 · C0", badge: "Fontaine" },
      { name: "Raiden", rank: "Lv90 · C2", badge: "Inazuma" },
    ],
  },
  {
    slug: "anime",
    name: "Anime",
    tag: "WATCHLIST · TRACKER",
    kind: "anime",
    logo: "AN",
    logoBg: ANIME_VIOLET,
    logoSrc: "/logos/anime.webp",
    info: [],
    // hero + quickStats here are the pre-data fallback (SSR default before
    // the client-side animeEntries fetch resolves) — ProfileClient.tsx
    // overrides both with real counts (by rolled-up effectiveStatus) once
    // loaded. Values mirror the 4 real AnimeEntry statuses 1:1 — there's no
    // "dropped" status in the data model, so quickStats doesn't invent one.
    hero: { value: "0", label: "completed" },
    quickStats: [
      { value: "0", label: "watching" },
      { value: "0", label: "caught up" },
      { value: "0", label: "waitlist" },
      { value: "0", label: "finished" },
    ],
    // anime is one hub list — a single "Library" section (plus Creations for
    // anime-themed things Darren makes). No per-title sub-pages.
    sections: ["Library", "Creations"],
    favorites: [],
  },
  {
    slug: "clashroyale",
    name: "Clash Royale",
    tag: "ARENA · REAL-TIME STRATEGY",
    kind: "game",
    logo: "CR",
    logoSrc: "/logos/CR.webp",
    logoBg: CLASHROYALE_BLUE,
    info: [{ value: "noname", label: "username" }],
    // hero + quickStats are placeholders — real counts come from
    // ClashRoyaleSection once synced; see app/api/clashroyale/sync/route.ts.
    hero: { value: "0", label: "trophies" },
    quickStats: [
      { value: "0", label: "cards owned" },
      { value: "—", label: "arena" },
      { value: "—", label: "clan" },
      { value: "—", label: "level" },
    ],
    sections: ["Cards"],
    favorites: [],
    // no Summary tab — the Cards page shows a player header (pfp, trophies,
    // level) directly instead
    hasSummary: false,
  },
  {
    slug: "brawlstars",
    name: "Brawl Stars",
    tag: "3V3 · BATTLE ARENA",
    kind: "game",
    logo: "BS",
    logoSrc: "/logos/BR.avif",
    logoBg: BRAWLSTARS_YELLOW,
    info: [{ value: "Noname", label: "username" }],
    // hero + quickStats are placeholders — real counts come from
    // BrawlStarsSection once synced; see app/api/brawlstars/sync/route.ts.
    hero: { value: "0", label: "trophies" },
    quickStats: [
      { value: "0", label: "brawlers" },
      { value: "—", label: "club" },
      { value: "—", label: "level" },
      { value: "—", label: "rank" },
    ],
    sections: ["Brawlers"],
    favorites: [],
    // no Summary tab — the Brawlers page shows a player header (pfp,
    // trophies, level) directly instead
    hasSummary: false,
  },
];
