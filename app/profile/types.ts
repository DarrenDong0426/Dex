// app/profile/types.ts — shared types + constants used across profile sections.

export type ProfileData = {
  name: string;
  rank: number;
  createdAt: string;
} | null;

export type Difficulty = {
  difficulty: string;
  clears: number;
  fullCombos: number;
  fullPerfects: number;
};

export type CharacterSummary = {
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

export type Summary = {
  rank: number | null;
  updatedAt: string | null;
  cardCount: number;
  eventCount: number;
  difficulties: Difficulty[];
  characters: CharacterSummary[];
} | null;

export type CharacterCard = {
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

export type SortMode = "rarity" | "owned" | "cardId";

export type MusicResult = {
  difficulty: string;
  playResult: string | null;
  playLevel: number | null;
};

export type MusicSong = {
  id: number;
  title: string;
  assetbundleName: string;
  tags: string[];
  results: MusicResult[];
};

export type EventItem = {
  id: number;
  name: string;
  assetbundleName: string;
  eventType: string;
  startAt: string;
  unit: string | null;
  rank: number | null;
};

export type StampItem = {
  id: number;
  name: string;
  assetbundleName: string;
  characterId: number | null;
  isDuo: boolean;
  owned: boolean;
};

export type HonorItem = {
  id: number;
  name: string;
  assetbundleName: string;
  honorRarity: string | null;
  category: string | null;
  groupName: string | null;
  eventAbn: string | null;
  eventType: string | null;
  level: number | null;
  owned: boolean;
};

export type BondHonorItem = {
  id: number;
  name: string;
  characterId1: number | null;
  characterId2: number | null;
  bondsGroupId: number | null;
  honorRarity: string | null;
  level: number | null;
  owned: boolean;
};

// ── shared constants ────────────────────────────────────────────

export const TIER_LABELS: Record<number, string> = {
  1: "Oshi",
  2: "Favorites",
  3: "Honorable Mentions",
};

export const DIFFICULTY_ORDER = [
  "EASY",
  "NORMAL",
  "HARD",
  "EXPERT",
  "MASTER",
  "APPEND",
];
export const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: "#5bc46f",
  NORMAL: "#4ba8d4",
  HARD: "#e0b13a",
  EXPERT: "#e5567d",
  MASTER: "#9b5ad6",
  APPEND: "#d76fd0",
};

export const UNIT_LABELS: Record<string, string> = {
  light_sound: "Leo/need",
  idol: "MORE MORE JUMP!",
  street: "Vivid BAD SQUAD",
  theme_park: "Wonderlands×Showtime",
  school_refusal: "Nightcord at 25:00",
  piapro: "Virtual Singer",
};

export const UNIT_ORDER = [
  "piapro",
  "light_sound",
  "idol",
  "street",
  "theme_park",
  "school_refusal",
];

export const UNIT_COLORS: Record<string, string> = {
  light_sound: "#4455dd",
  idol: "#88dd44",
  street: "#ee1166",
  theme_park: "#ff9900",
  school_refusal: "#884499",
  piapro: "#33ccbb",
};

export const RESULT_COLORS: Record<string, string> = {
  CLEAR: "#c8955a",
  FULL_COMBO: "#4a9de0",
};

export const RARITY_ORDER = ["low", "middle", "high", "highest"];
export const RARITY_TIER: Record<string, number> = {
  low: 1,
  middle: 2,
  high: 3,
  highest: 4,
};

export const EVENT_RANK_TIERS = [
  1, 2, 3, 10, 20, 30, 40, 50, 100, 200, 300, 400, 500, 1000, 2000, 3000, 4000,
  5000, 10000, 20000, 30000, 40000, 50000, 100000,
];

export const PER_PAGE = 8; // cards per page (4×2)
export const PER_SPREAD = PER_PAGE * 2; // two facing pages
export const ROW_H = 104; // fixed music row height incl. gap, for virtualization
