// lib/brawlStarsSync.ts — shared sync logic for Brawl Stars, called from two
// places: the admin's manual "Sync now" button (app/api/brawlstars/sync/
// route.ts, session-gated) and an automatic background refresh triggered on
// page load when the data is stale (see syncBrawlStarsIfStale, wired into
// the brawlStarsRoster resolver in app/api/graphql/route.ts via Next's
// after()). Also pulls the full brawler roster (id+name only, from the
// static /brawlers endpoint — not player-scoped) into
// BrawlStarsBrawlerMaster, so locked brawlers can render on the Brawlers
// tab the same way Genshin shows locked characters. Routed through
// RoyaleAPI's Brawl Stars proxy (bsproxy.royaleapi.dev) rather than
// api.brawlstars.com directly — same IP-locking workaround as Clash Royale
// (see docs.royaleapi.com/proxy.html). Needs BRAWL_STARS_API_KEY +
// BRAWL_STARS_PLAYER_TAG in .env.
import { prisma } from "@/lib/prisma";

const BASE_URL = "https://bsproxy.royaleapi.dev/v1";
const STALE_MS = 24 * 60 * 60 * 1000;

type ApiBrawler = {
  id: number;
  name: string;
  power: number;
  rank: number;
  trophies: number;
  highestTrophies: number;
  gadgets: { id: number; name: string }[];
  starPowers: { id: number; name: string }[];
  gears: { id: number; name: string; level: number }[];
};

type ApiPlayer = {
  name: string;
  expLevel: number;
  trophies: number;
  highestTrophies: number;
  "3vs3Victories": number;
  soloVictories: number;
  duoVictories: number;
  club?: { name?: string };
  icon: { id: number };
  brawlers?: ApiBrawler[];
};

export type SyncResult =
  | { ok: true; synced: number; total: number }
  | { ok: false; error: string; message: string };

export async function syncBrawlStars(): Promise<SyncResult> {
  const apiKey = process.env.BRAWL_STARS_API_KEY;
  const tag = process.env.BRAWL_STARS_PLAYER_TAG;
  if (!apiKey || !tag) {
    return {
      ok: false,
      error: "config",
      message: "BRAWL_STARS_API_KEY or BRAWL_STARS_PLAYER_TAG missing from .env",
    };
  }

  const encodedTag = encodeURIComponent(tag.replace("#", ""));
  const res = await fetch(`${BASE_URL}/players/%23${encodedTag}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const json: ApiPlayer = await res.json();
  if (!res.ok) {
    return {
      ok: false,
      error: res.status === 403 ? "auth" : "other",
      message: (json as unknown as { message?: string }).message ?? `status ${res.status}`,
    };
  }

  await prisma.brawlStarsPlayer.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      name: json.name,
      expLevel: json.expLevel,
      trophies: json.trophies,
      highestTrophies: json.highestTrophies,
      victories3v3: json["3vs3Victories"],
      soloVictories: json.soloVictories,
      duoVictories: json.duoVictories,
      clubName: json.club?.name ?? null,
      iconId: json.icon.id,
    },
    update: {
      name: json.name,
      expLevel: json.expLevel,
      trophies: json.trophies,
      highestTrophies: json.highestTrophies,
      victories3v3: json["3vs3Victories"],
      soloVictories: json.soloVictories,
      duoVictories: json.duoVictories,
      clubName: json.club?.name ?? null,
      iconId: json.icon.id,
    },
  });

  const brawlers: ApiBrawler[] = json.brawlers ?? [];

  let synced = 0;
  for (const b of brawlers) {
    const data = {
      name: b.name,
      power: b.power,
      rank: b.rank,
      trophies: b.trophies,
      highestTrophies: b.highestTrophies,
      gadgets: b.gadgets,
      starPowers: b.starPowers,
      gears: b.gears,
    };
    await prisma.brawlStarsBrawler.upsert({
      where: { id: b.id },
      create: { id: b.id, ...data },
      update: data,
    });
    synced++;
  }

  // full roster (owned + locked) — a separate, non-player-scoped endpoint,
  // so a failure here shouldn't fail the sync that already succeeded above
  try {
    const masterRes = await fetch(`${BASE_URL}/brawlers`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (masterRes.ok) {
      const masterJson: { items: { id: number; name: string }[] } = await masterRes.json();
      for (const m of masterJson.items ?? []) {
        await prisma.brawlStarsBrawlerMaster.upsert({
          where: { id: m.id },
          create: { id: m.id, name: m.name },
          update: { name: m.name },
        });
      }
    }
  } catch {
    // master roster is only used for the locked/unowned display — not
    // worth failing the whole sync over
  }

  return { ok: true, synced, total: brawlers.length };
}

// module-level guard — prevents piling up redundant syncs if several
// requests land while one is already in flight (e.g. rapid navigation)
let syncInFlight = false;

// best-effort background refresh: only syncs if the last one was more than
// a day ago, and swallows errors since this never blocks a response — a
// failure just means data stays stale until the next request or a manual
// "Sync now"
export async function syncBrawlStarsIfStale(): Promise<void> {
  if (syncInFlight) return;
  const player = await prisma.brawlStarsPlayer.findUnique({ where: { id: 1 } });
  const isStale = !player || Date.now() - player.updatedAt.getTime() > STALE_MS;
  if (!isStale) return;

  syncInFlight = true;
  try {
    await syncBrawlStars();
  } catch {
    // ignore — see comment above
  } finally {
    syncInFlight = false;
  }
}
