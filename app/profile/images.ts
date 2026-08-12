// app/profile/images.ts — all Sekai asset URL builders + related pure helpers.
// Centralized so sections (and the admin editors) share one source of truth.

import { UNIT_COLORS, EVENT_RANK_TIERS } from "./types";

// ── character icons / art ───────────────────────────────────────

// Self-hosted character icons in /public/chara/, named by lowercase given name
// (e.g. /chara/ichika.png). Name comes as "Hoshino Ichika" (surname first),
// so the given name is the LAST word.
export function charaIcon(fullName: string): string {
  const given = fullName.trim().split(/\s+/).pop()?.toLowerCase() ?? "";
  return `/chara/${given}.png`;
}

// character-select standing cutout, keyed by characterId (EN bucket)
export function charaStandingArt(characterId: number): string {
  return `https://storage.sekai.best/sekai-en-assets/character/character_select/chr_tl_${characterId}.webp`;
}

// ── cards ───────────────────────────────────────────────────────

// full card illustration (JP bucket) — the whole card art, shown cropped to
// body in a portrait frame. trained variant if the card was special-trained.
export function cardArtUrl(abn: string, trained: boolean): string {
  const variant = trained ? "after_training" : "normal";
  return `https://storage.sekai.best/sekai-jp-assets/character/member/${abn}/card_${variant}.webp`;
}

// Sekai's real master data reserves rarity 5 exclusively for birthday
// cards (there's no true 5★ card) — everywhere rarity stars render, that
// case shows a crown instead. Shared so admin and frontend stay in sync.
export function isBirthdayCard(rarity: number): boolean {
  return rarity === 5;
}
export function rarityGlyph(rarity: number): string {
  return isBirthdayCard(rarity) ? "👑" : "★".repeat(rarity);
}

// max level by rarity — birthday cards (rarity 5) share the 4★ cap. Master
// rank and skill level cap the same regardless of rarity.
export function maxLevelForRarity(rarity: number): number {
  if (rarity <= 1) return 20;
  if (rarity === 2) return 30;
  if (rarity === 3) return 50;
  return 60; // 4★ and birthday (rarity 5)
}
export const MAX_MASTER_RANK = 5;
export const MAX_SKILL_LEVEL = 4;

// ── music ───────────────────────────────────────────────────────

export function jacketUrl(assetbundleName: string): string {
  return `https://storage.sekai.best/sekai-en-assets/music/jacket/${assetbundleName}/${assetbundleName}.webp`;
}

// ── units ───────────────────────────────────────────────────────

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
export function unitLogoUrl(unitKey: string): string {
  const slug = UNIT_LOGO_SLUG[unitKey] ?? unitKey;
  return `https://sekai.best/images/jp/logol_outline/logo_${slug}.png`;
}

// ── events ──────────────────────────────────────────────────────

export function eventLogoUrl(abn: string): string {
  return `https://storage.sekai.best/sekai-en-assets/event/${abn}/logo/logo.webp`;
}
export function eventBgUrl(abn: string): string {
  return `https://storage.sekai.best/sekai-en-assets/event/${abn}/screen/bg.webp`;
}
export function eventCharacterUrl(abn: string): string {
  return `https://storage.sekai.best/sekai-en-assets/event/${abn}/screen/character.webp`;
}

// ── stamps ──────────────────────────────────────────────────────

export function stampUrl(abn: string): string {
  return `https://storage.sekai.best/sekai-en-assets/stamp/${abn}/${abn}.png`;
}

// ── bond honors ─────────────────────────────────────────────────

export function bondCharUrl(unitId: number): string {
  const p = String(unitId).padStart(2, "0");
  return `https://storage.sekai.best/sekai-jp-assets/bonds_honor/character/chr_sd_${p}_01.webp`;
}
export function bondWordUrl(bondsGroupId: number): string {
  const g = String(bondsGroupId % 10000).padStart(4, "0");
  return `https://storage.sekai.best/sekai-jp-assets/bonds_honor/word/honorname_${g}_01_01.webp`;
}
// unit color by character/unit id (reuse UNIT_COLORS via unit lookup)
export function unitColorForCharId(charId: number): string {
  const unit =
    charId <= 4
      ? "light_sound"
      : charId <= 8
        ? "idol"
        : charId <= 12
          ? "street"
          : charId <= 16
            ? "theme_park"
            : charId <= 20
              ? "school_refusal"
              : "piapro";
  return UNIT_COLORS[unit] ?? "#888";
}

// ── event honor rank helpers ────────────────────────────────────

// event honor rank → frame tier (1-4). highest=Top 3, high=Top 1k,
// middle=Top 10k, low=rest. Parses the rank from the honor name.
export function eventFrameTier(name: string): number {
  const ord = name.match(/^(\d+)(?:st|nd|rd|th)/i); // "1st", "2nd"...
  const top = name.match(/top\s*([\d,]+)/i); // "Top 1,000"
  const rank = ord
    ? parseInt(ord[1], 10)
    : top
      ? parseInt(top[1].replace(/,/g, ""), 10)
      : Infinity;
  if (rank <= 3) return 4; // highest
  if (rank <= 1000) return 3; // high
  if (rank <= 10000) return 2; // middle
  return 1; // low
}

// honor name ("1st" / "Top 2,000") → rank_main.webp URL for that tier's number.
// 24 tiers map sequentially to honor_0182 (index 0) … honor_0205 (index 23).
export function eventRankImageUrl(name: string): string | null {
  const ord = name.match(/^(\d+)(?:st|nd|rd|th)/i);
  const top = name.match(/top\s*([\d,]+)/i);
  const rank = ord
    ? parseInt(ord[1], 10)
    : top
      ? parseInt(top[1].replace(/,/g, ""), 10)
      : null;
  if (rank == null) return null;
  const idx = EVENT_RANK_TIERS.indexOf(rank);
  if (idx < 0) return null;
  const n = String(182 + idx).padStart(4, "0");
  return `https://storage.sekai.best/sekai-en-assets/honor/honor_${n}/rank_main.webp`;
}

// honor level (1-10) → pip image srcs. 1-5 = that many bronze/teal pips;
// 6-10 = 5 purple pips (higher tier). Reuses the /pips gems.
export function honorLevelPips(level: number): string[] {
  const n = Math.min(5, level <= 5 ? level : 5);
  const src = level <= 5 ? "/pips/pip_blue.png" : "/pips/pip_purple.png";
  return Array.from({ length: n }, () => src);
}
