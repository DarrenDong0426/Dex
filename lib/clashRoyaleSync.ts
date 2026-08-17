// lib/clashRoyaleSync.ts — shared sync logic for Clash Royale, called from
// two places: the admin's manual "Sync now" button (app/api/clashroyale/
// sync/route.ts, session-gated) and an automatic background refresh
// triggered on page load when the data is stale (see syncClashRoyaleIfStale,
// wired into the clashRoyaleCards resolver in app/api/graphql/route.ts via
// Next's after()). Routed through RoyaleAPI's proxy (proxy.royaleapi.dev)
// rather than api.clashroyale.com directly, since the dev-portal key is
// IP-locked and this runs on hosts without a stable egress IP — the key is
// whitelisted to the proxy's IP instead of ours (see
// docs.royaleapi.com/proxy.html). Needs CLASH_ROYALE_API_KEY +
// CLASH_ROYALE_PLAYER_TAG in .env.
import { prisma } from "@/lib/prisma";

const BASE_URL = "https://proxy.royaleapi.dev/v1";
const STALE_MS = 24 * 60 * 60 * 1000;

type ApiCard = {
  id: number;
  name: string;
  level: number;
  starLevel?: number;
  evolutionLevel?: number;
  maxLevel: number;
  maxEvolutionLevel?: number;
  rarity: string;
  count: number;
  elixirCost?: number;
  iconUrls: { medium: string };
};

type ApiPlayer = {
  name: string;
  expLevel: number;
  trophies: number;
  bestTrophies: number;
  wins: number;
  losses: number;
  battleCount: number;
  clan?: { name: string };
  arena?: { name: string };
  cards?: ApiCard[];
  supportCards?: ApiCard[];
};

export type SyncResult =
  | { ok: true; synced: number; total: number }
  | { ok: false; error: string; message: string };

export async function syncClashRoyale(): Promise<SyncResult> {
  const apiKey = process.env.CLASH_ROYALE_API_KEY;
  const tag = process.env.CLASH_ROYALE_PLAYER_TAG;
  if (!apiKey || !tag) {
    return {
      ok: false,
      error: "config",
      message: "CLASH_ROYALE_API_KEY or CLASH_ROYALE_PLAYER_TAG missing from .env",
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

  const playerData = {
    name: json.name,
    expLevel: json.expLevel,
    trophies: json.trophies,
    bestTrophies: json.bestTrophies,
    wins: json.wins,
    losses: json.losses,
    battleCount: json.battleCount,
    clanName: json.clan?.name ?? null,
    arenaName: json.arena?.name ?? null,
  };
  await prisma.clashRoyalePlayer.upsert({
    where: { id: 1 },
    create: { id: 1, ...playerData },
    update: playerData,
  });

  const cards: ApiCard[] = json.cards ?? [];
  const supportCards: ApiCard[] = json.supportCards ?? [];
  const all = [
    ...cards.map((c) => ({ ...c, isSupport: false })),
    ...supportCards.map((c) => ({ ...c, isSupport: true })),
  ];

  let synced = 0;
  for (const c of all) {
    const data = {
      name: c.name,
      iconUrl: c.iconUrls.medium,
      level: c.level,
      maxLevel: c.maxLevel,
      starLevel: c.starLevel ?? null,
      evolutionLevel: c.evolutionLevel ?? null,
      maxEvolutionLevel: c.maxEvolutionLevel ?? null,
      rarity: c.rarity,
      count: c.count,
      elixirCost: c.elixirCost ?? null,
      isSupport: c.isSupport,
    };
    await prisma.clashRoyaleCard.upsert({
      where: { id: c.id },
      create: { id: c.id, ...data },
      update: data,
    });
    synced++;
  }

  return { ok: true, synced, total: all.length };
}

// module-level guard — prevents piling up redundant syncs if several
// requests land while one is already in flight (e.g. rapid navigation)
let syncInFlight = false;

// best-effort background refresh: only syncs if the last one was more than
// a day ago, and swallows errors since this never blocks a response — a
// failure just means data stays stale until the next request or a manual
// "Sync now"
export async function syncClashRoyaleIfStale(): Promise<void> {
  if (syncInFlight) return;
  const player = await prisma.clashRoyalePlayer.findUnique({ where: { id: 1 } });
  const isStale = !player || Date.now() - player.updatedAt.getTime() > STALE_MS;
  if (!isStale) return;

  syncInFlight = true;
  try {
    await syncClashRoyale();
  } catch {
    // ignore — see comment above
  } finally {
    syncInFlight = false;
  }
}
