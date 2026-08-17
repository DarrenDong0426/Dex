// honor.ts — derive a character's fan honor purely from their character rank.
//
// From honors.json: each character has 4 fan-honor rows sharing a groupId
// (groupId === characterId). Rarity maps to character-rank bands, and each
// "level" within a rarity = 5 character ranks:
//
//   low     (honor_0001 base) : ranks   5-25  → levels 1-5
//   middle  (honor_0002 base) : ranks  30-75  → levels 1-10
//   high    (honor_0002 base) : ranks  80-125 → levels 1-10
//   highest (honor_0002 base) : ranks 130-160 → levels 1-7
//
// So given a character's rank, we know their rarity + level with no UserHonor
// dependency. The base image assetbundleName differs per character (Ichika is
// honor_0001/0002, others differ), so we look it up from the Honor table by
// groupId + rarity — passed in as `honorAssets`.

export type HonorRarity = "low" | "middle" | "high" | "highest";

type Band = {
  rarity: HonorRarity;
  min: number; // first character rank in this band
  max: number; // last character rank in this band
};

// bands in ascending rank order
const BANDS: Band[] = [
  { rarity: "low", min: 5, max: 25 },
  { rarity: "middle", min: 30, max: 75 },
  { rarity: "high", min: 80, max: 125 },
  { rarity: "highest", min: 130, max: 160 },
];

export type FanHonor = {
  rarity: HonorRarity;
  level: number; // level within the rarity (1-based)
  maxLevel: number; // total levels in this rarity (for pip cap)
};

/**
 * Given a character rank, return which fan honor they currently hold:
 * the rarity band, their level within it, and that band's max level.
 * Returns null for ranks below 5 (no honor earned yet).
 */
export function fanHonorForRank(rank: number): FanHonor | null {
  if (rank < BANDS[0].min) return null;

  // highest band whose min <= rank
  let band = BANDS[0];
  for (const b of BANDS) {
    if (rank >= b.min) band = b;
  }

  const maxLevel = Math.floor((band.max - band.min) / 5) + 1;
  const level = Math.min(Math.floor((rank - band.min) / 5) + 1, maxLevel);

  return { rarity: band.rarity, level, maxLevel };
}

// ---- pips ---------------------------------------------------------------
// 5 pip slots. Count grows 1→5 only during the FIRST 25 ranks (bronze). Once
// past rank 25 there are ALWAYS 5 pips; each subsequent 25-rank band RECOLORS
// them left-to-right (one pip per 5 ranks) to the next color, leaving the rest
// the previous band's color.
//   band 0 (ranks   1-25): bronze fills 1→5
//   band 1 (ranks  26-50): teal replaces bronze, left→right
//   band 2 (ranks  51-75): purple replaces teal, left→right
//   band 3+ : cycle bronze→teal→purple again
// e.g. rank 55 = band 2, 1 into band → 1 purple + 4 teal.

const PIP_CYCLE = [
  "/pips/pip_bronze.png",
  "/pips/pip_blue.png", // teal
  "/pips/pip_purple.png",
];

// returns exactly the pip image srcs to render, left to right
export function pips(rank: number): string[] {
  if (rank < 1) return [];

  const band = Math.floor((rank - 1) / 25); // 0,1,2,...
  const intoBand = rank - band * 25; // 1..25
  const recolored = Math.min(5, Math.ceil(intoBand / 5)); // how many at new color

  const newColor = PIP_CYCLE[band % PIP_CYCLE.length];
  const prevColor = PIP_CYCLE[(band - 1 + PIP_CYCLE.length) % PIP_CYCLE.length];

  if (band === 0) {
    // first band: count grows, all bronze
    return Array.from({ length: recolored }, () => newColor);
  }

  // past first band: always 5 pips — `recolored` new color, rest previous color
  return Array.from({ length: 5 }, (_, i) =>
    i < recolored ? newColor : prevColor,
  );
}

// ---- image url ----------------------------------------------------------
// Base honor art. assetbundleName comes from the Honor table row for this
// character's groupId + rarity (e.g. "honor_0001" / "honor_0002").
export function honorImageUrl(assetbundleName: string): string {
  return `https://storage.sekai.best/sekai-en-assets/honor/${assetbundleName}/degree_main.webp`;
}

// Rarity frame overlay — SELF-HOSTED in /public/honor-frames/ (the sekai.best
// frame assets are hashed build files, so we self-host the 4 fixed frames).
const RARITY_TIER: Record<HonorRarity, number> = {
  low: 1,
  middle: 2,
  high: 3,
  highest: 4,
};

export function honorFrameUrl(rarity: HonorRarity): string {
  return `/honor-frames/frame_degree_m_${RARITY_TIER[rarity]}.png`;
}
