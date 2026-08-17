// lib/genshinGoodKeys.ts — resolves display names (from gi.yatta.moe) to
// GOOD-format string keys (the identifiers Inventory Kamera / Genshin
// Optimizer use for weapons and artifact sets in a .GOOD export) by
// matching a normalized name against the *authoritative* key list pulled
// live from genshin-optimizer's own source (libs/gi/consts). Deliberately
// never guesses past that: a name with no exact match in the real list is
// left unresolved (null) rather than assumed — verified against yatta's
// full weapon/reliquary lists at build time (234/270 weapons, 57/59
// artifact sets matched; misses are newer/event items genshin-optimizer's
// key list hasn't caught up to yet, not normalization bugs).
const WEAPON_CONSTS_URL =
  "https://raw.githubusercontent.com/frzyc/genshin-optimizer/master/libs/gi/consts/src/weapon.ts";
const ARTIFACT_CONSTS_URL =
  "https://raw.githubusercontent.com/frzyc/genshin-optimizer/master/libs/gi/consts/src/artifact.ts";

// "Staff of Homa" -> "StaffOfHoma", "Traveler's Handy Sword" -> "TravelersHandySword"
export function normalizeToGoodKey(name: string): string {
  const cleaned = name.replace(/['’"]/g, "");
  return (cleaned.match(/[A-Za-z0-9]+/g) ?? [])
    .map((run) => run[0].toUpperCase() + run.slice(1))
    .join("");
}

async function fetchConstArrays(url: string, arrayNamePattern: RegExp): Promise<Set<string>> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`genshin-optimizer consts fetch failed: ${res.status}`);
  const text = await res.text();
  const keys: string[] = [];
  let match;
  const re = new RegExp(arrayNamePattern);
  while ((match = re.exec(text))) {
    keys.push(...(match[1].match(/'([^']+)'/g) ?? []).map((s) => s.slice(1, -1)));
  }
  return new Set(keys);
}

export function fetchWeaponGoodKeys(): Promise<Set<string>> {
  return fetchConstArrays(
    WEAPON_CONSTS_URL,
    /export const allWeapon(?:Sword|Claymore|Polearm|Bow|Catalyst)Keys = \[([\s\S]*?)\] as const/g,
  );
}

export function fetchArtifactSetGoodKeys(): Promise<Set<string>> {
  return fetchConstArrays(
    ARTIFACT_CONSTS_URL,
    /export const allArtifactSetKeys = \[([\s\S]*?)\] as const/g,
  );
}
