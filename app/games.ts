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
};

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
};

const SEKAI_RAINBOW =
  "conic-gradient(from 90deg,#4ab7a0,#f0819e,#3a8ee0,#f0a04a,#9b6ee0,#4ab7a0)";
const GENSHIN_GOLD = "linear-gradient(135deg,#1e3a6e,#d4af37)";
const ANIME_VIOLET = "linear-gradient(135deg,#8b5ad0,#f07ea8)";

export const games: Game[] = [
  {
    slug: "sekai",
    name: "Project Sekai",
    tag: "COLORFUL STAGE! · RHYTHM",
    kind: "game",
    logo: "PS",
    logoBg: SEKAI_RAINBOW,
    logoSrc: "/logos/sekai.png",
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
    sections: ["Characters", "Creations"],
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
    logoSrc: "/logos/anime.png",
    info: [
      { value: "Itami", label: "username" },
      { value: "—", label: "list" },
      { value: "—", label: "since" },
    ],
    // hero + quickStats are placeholders; wired to real counts when the
    // Anime table + resolver land (total watched / watching / favorites).
    hero: { value: "0", label: "completed" },
    quickStats: [
      { value: "0", label: "watching" },
      { value: "0", label: "completed" },
      { value: "0", label: "dropped" },
      { value: "0", label: "favorites" },
    ],
    // anime is one hub list — a single "Library" section (plus Creations for
    // anime-themed things Darren makes). No per-title sub-pages.
    sections: ["Library", "Creations"],
    favorites: [],
  },
];
