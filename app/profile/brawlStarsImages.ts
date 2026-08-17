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
