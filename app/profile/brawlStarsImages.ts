// app/profile/brawlStarsImages.ts
// Brawl Stars' official API returns no icon/image URL for brawlers at all
// (checked against both the player endpoint and the static /brawlers
// endpoint) — cdn.brawlify.com is the community-standard static asset host
// used by most BS dashboards/bots for portraits, keyed by the same brawler
// id the API does return. No auth needed, unlike their full API.
export function brawlerIconUrl(id: number): string {
  return `https://cdn.brawlify.com/brawlers/borderless/${id}.png`;
}

// player profile icons are a separate id space from brawler portraits above
export function playerIconUrl(id: number): string {
  return `https://cdn.brawlify.com/profile-icons/regular/${id}.png`;
}

// gadgets/star powers are per-brawler content — Brawlify hosts real art for
// both, confirmed against our own synced ids (both patterns 200'd for real
// gadget/star-power ids pulled from the official API via bsproxy).
export function gadgetIconUrl(id: number): string {
  return `https://cdn.brawlify.com/gadgets/borderless/${id}.png`;
}

export function starPowerIconUrl(id: number): string {
  return `https://cdn.brawlify.com/star-powers/borderless/${id}.png`;
}

// Gears have no working Brawlify (or any other) CDN endpoint — they're a
// small universal set shared across all brawlers rather than per-brawler
// content, and brawlapi.com's own brawler objects don't even include a
// gears field. Real icon art (static.wikia.nocookie.net, the Brawl Stars
// Fandom wiki's own image host) found by reading the wiki's "Gears" page
// wikitext directly via the MediaWiki API (the HTML site itself 403s
// scraping) and cross-checking each {{Gear|Filename=...}} template against
// our own synced gear names — every URL below was verified to 200 with a
// real image/webp response, not guessed.
const GEAR_ICON_URLS: Record<string, string> = {
  SPEED: "https://static.wikia.nocookie.net/brawlstars/images/8/86/SpeedGear.png",
  HEALTH: "https://static.wikia.nocookie.net/brawlstars/images/2/23/HealthGear.png",
  DAMAGE: "https://static.wikia.nocookie.net/brawlstars/images/5/50/DamageGear.png",
  VISION: "https://static.wikia.nocookie.net/brawlstars/images/c/cd/VisionGear.png",
  SHIELD: "https://static.wikia.nocookie.net/brawlstars/images/4/4c/ShieldGear.png",
  "GADGET COOLDOWN": "https://static.wikia.nocookie.net/brawlstars/images/6/6c/GadgetGear.png",
  "PET POWER": "https://static.wikia.nocookie.net/brawlstars/images/b/b1/PetPowerGear.png",
  // Thicc Head is Tick's own unique Mythic gear (per the wiki, each Mythic
  // gear is brawler-specific) — the wiki uses one shared generic Mythic
  // icon rather than art per Mythic gear, so that's what this points at.
  "THICC HEAD": "https://static.wikia.nocookie.net/brawlstars/images/f/f9/MythicGear.png",
};

// the 6 Super Rare gears every brawler (Power 8+) can equip, regardless of
// which specific brawler — used to render the full possible set with
// owned/locked state, the same "master list + locked overlay" pattern this
// app already uses for the brawler roster and Genshin characters. Epic
// (Reload Speed, Super Charge) and Mythic gears are real but only apply to
// a specific subset of brawlers each — without a verified per-brawler
// eligibility list, this app can't reliably know which brawlers should show
// them as "locked" vs. not-applicable-at-all, so those only ever render
// when actually owned (see BrawlStarsSection.tsx).
export const UNIVERSAL_GEAR_NAMES = [
  "SPEED",
  "HEALTH",
  "DAMAGE",
  "VISION",
  "SHIELD",
  "GADGET COOLDOWN",
];

export function gearIconUrl(name: string): string | undefined {
  return GEAR_ICON_URLS[name.toUpperCase()];
}
