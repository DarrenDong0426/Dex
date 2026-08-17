import { createSchema, createYoga } from "graphql-yoga";
import { GraphQLError } from "graphql";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { maxLevelForRarity, MAX_MASTER_RANK, MAX_SKILL_LEVEL } from "@/app/profile/images";
import { brawlerIconUrl, playerIconUrl } from "@/app/profile/brawlStarsImages";
import { syncClashRoyaleIfStale } from "@/lib/clashRoyaleSync";
import { syncBrawlStarsIfStale } from "@/lib/brawlStarsSync";
import { syncGenshinIfStale } from "@/lib/genshinSync";

const MAL_URL_RE = /myanimelist\.net\/(anime|manga)\/(\d+)/;

// AniList (graphql.anilist.co) mirrors public anime/manga metadata via a
// proper GraphQL API — swapped in after Jikan (a MAL-scraping proxy) proved
// unreliable for anything but the most popular titles (verified live: Jikan
// failed repeatedly on a real title even after 6 retries over 15s, while
// AniList served it instantly). Looked up by idMal so MAL URLs/ids still
// work as the primary key — Dex never syncs an actual MAL/AniList account,
// this is only ever a one-time metadata pull at add-time.
const ANILIST_URL = "https://graphql.anilist.co";

type AniListMedia = {
  idMal: number | null;
  title: { romaji: string; english: string | null };
  format: string | null;
  description: string | null;
  coverImage: { large: string | null; medium: string | null };
};

async function anilistQuery<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) {
    throw new Error(json.errors?.[0]?.message ?? `AniList returned ${res.status}`);
  }
  return json.data;
}

async function fetchAniListByMalId(kind: "anime" | "manga", malId: number) {
  const data = await anilistQuery<{ Media: AniListMedia | null }>(
    `query($idMal:Int,$type:MediaType){ Media(idMal:$idMal, type:$type){ idMal title{romaji english} format description coverImage{large medium} } }`,
    { idMal: malId, type: kind.toUpperCase() },
  );
  if (!data.Media) throw new Error("That title wasn't found.");
  return data.Media;
}

async function searchAniList(kind: "anime" | "manga", query: string) {
  const data = await anilistQuery<{ Page: { media: AniListMedia[] } }>(
    `query($search:String,$type:MediaType){ Page(perPage:12){ media(search:$search, type:$type, sort:SEARCH_MATCH){ idMal title{romaji english} format coverImage{medium} } } }`,
    { search: query, type: kind.toUpperCase() },
  );
  return data.Page.media.filter((m) => m.idMal != null);
}

function anilistMediaType(kind: "anime" | "manga", format: string | null): string {
  if (kind === "anime") return "Anime";
  return format === "NOVEL" ? "Light Novel" : "Manga";
}

function anilistTitle(m: AniListMedia): string {
  return m.title.english ?? m.title.romaji;
}

function stripHtml(html: string | null): string | null {
  return html ? html.replace(/<[^>]+>/g, "").trim() : null;
}

// shared by the URL-paste flow and the search-result-click flow
async function upsertAnimeFromAniList(kind: "anime" | "manga", malId: number) {
  const media = await fetchAniListByMalId(kind, malId);
  const mediaType = anilistMediaType(kind, media.format);
  const image = media.coverImage.large ?? media.coverImage.medium ?? "";

  const entry = await prisma.animeEntry.upsert({
    where: { id: malId },
    update: {
      title: anilistTitle(media),
      image,
      synopsis: stripHtml(media.description),
      url: `https://myanimelist.net/${kind}/${malId}`,
      mediaType,
    },
    create: {
      id: malId,
      title: anilistTitle(media),
      image,
      synopsis: stripHtml(media.description),
      url: `https://myanimelist.net/${kind}/${malId}`,
      mediaType,
      status: "Waitlist",
    },
  });
  return { ...entry, createdAt: String(entry.createdAt.getTime()) };
}

// resolves which splash art to show for a Genshin character — the default
// HoYoLAB-synced image, or an owned costume's art if selectedCostumeId
// points at one. The small profile icon (used in grids/tiles) always stays
// the default art regardless of selection — only the full detail view
// (splash art) switches.
function resolveGenshinDisplay(c: {
  image: string;
  costumes: unknown;
  selectedCostumeId: number | null;
}): { image: string } {
  const costumes = c.costumes as { id: number; name: string; icon: string }[];
  const chosen =
    c.selectedCostumeId != null
      ? costumes.find((cs) => cs.id === c.selectedCostumeId)
      : undefined;
  return {
    image: chosen?.icon ?? c.image,
  };
}

// rank → rarity band (mirrors app/honor.ts)
function rarityForRank(rank: number): "low" | "middle" | "high" | "highest" {
  if (rank >= 130) return "highest";
  if (rank >= 80) return "high";
  if (rank >= 30) return "middle";
  return "low";
}

// fan-honor tiers in band order, with each tier's level cap (mirrors the
// BANDS ladder in app/honor.ts). A character's 4 "X Fan" UserHonor rows are
// cumulative — own low fully, then middle fully, etc., up to wherever their
// rank currently lands — so the admin editor collapses them into one
// combined 1-32 level instead of 4 near-identical rows.
const FAN_HONOR_BANDS: { rarity: string; maxLevel: number }[] = [
  { rarity: "low", maxLevel: 5 },
  { rarity: "middle", maxLevel: 10 },
  { rarity: "high", maxLevel: 10 },
  { rarity: "highest", maxLevel: 7 },
];
const FAN_HONOR_MAX_LEVEL = FAN_HONOR_BANDS.reduce(
  (sum, b) => sum + b.maxLevel,
  0,
);

// event ranking-ladder honors ("1st", "Top 1,000", ...) mirror the parsing
// in app/profile/images.ts (eventFrameTier/eventRankImageUrl) — same
// ordinal/"Top N" patterns, just extracting the raw threshold number here.
function eventHonorRankThreshold(name: string): number | null {
  const ord = name.match(/^(\d+)(?:st|nd|rd|th)/i);
  if (ord) return parseInt(ord[1], 10);
  const top = name.match(/top\s*([\d,]+)/i);
  if (top) return parseInt(top[1].replace(/,/g, ""), 10);
  return null;
}
function normalizeEventName(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}
// find the ONE honor group representing an event's overall ranking ladder —
// excludes World Link "Chapter N" groups, since UserEvent only tracks a
// single rank per event (not per-chapter), so those stay manually editable.
function findOverallEventHonorGroup(
  eventName: string,
  groups: { id: number; name: string | null; honorType: string | null }[],
) {
  const key = normalizeEventName(eventName);
  return groups.find(
    (g) =>
      g.honorType === "event" &&
      normalizeEventName(g.name) === key &&
      !/chapter/i.test(g.name ?? ""),
  );
}
// upsert/clear a rank-tier honor group's UserHonor rows to match a rank
// (or clear all of them if rank is null). Shared by setEventEdit and the
// one-time backfill for events that already had a rank recorded.
async function syncEventHonorsForRank(groupId: number, rank: number | null) {
  const honors = await prisma.honor.findMany({ where: { groupId } });
  await Promise.all(
    honors.map(async (h) => {
      const threshold = eventHonorRankThreshold(h.name);
      if (threshold == null) return; // Memorial etc — not rank-derived
      const achieved = rank != null && threshold >= rank;
      if (achieved) {
        await prisma.userHonor.upsert({
          where: { honorId: h.id },
          update: { level: 1 },
          create: { honorId: h.id, level: 1 },
        });
      } else {
        await prisma.userHonor.deleteMany({ where: { honorId: h.id } });
      }
    }),
  );
}

const { handleRequest } = createYoga({
  schema: createSchema({
    typeDefs: `
      type Profile {
        id: Int!
        name: String!
        rank: Int!
        createdAt: String!
        updatedAt: String
      }
      type Character {
        id: Int!
        firstName: String
        givenName: String
        unit: String!
      }
      type Card {
        id: Int!
        name: String!
        rarity: Int!
        assetbundleName: String!
        character: Character!
      }
      type UserCard {
        id: Int!
        level: Int!
        masterRank: Int!
        skillLevel: Int!
        specialTraining: Boolean!
        card: Card!
      }
      type DifficultyStat {
        difficulty: String
        clears: Int
        fullCombos: Int
        fullPerfects: Int
      }
      type CharacterSummary {
        characterId: Int
        name: String
        characterRank: Int
        challengeLevel: Int
        favoriteTier: Int
        unit: String
        honorAsset: String
      }
      type CharacterCard {
        cardId: Int!
        name: String!
        rarity: Int!
        assetbundleName: String!
        owned: Boolean!
        level: Int
        masterRank: Int
        skillLevel: Int
        specialTraining: Boolean
      }
      type MusicDifficultyResult {
        difficulty: String!
        playResult: String
        playLevel: Int
      }
      type MusicSong {
        id: Int!
        title: String!
        assetbundleName: String!
        tags: [String!]!
        results: [MusicDifficultyResult!]!
        favorite: Boolean!
      }
      type EventItem {
        id: Int!
        name: String!
        assetbundleName: String!
        eventType: String
        startAt: String
        unit: String
        rank: Int
      }
      type StampItem {
        id: Int!
        name: String!
        assetbundleName: String!
        characterId: Int
        isDuo: Boolean!
        owned: Boolean!
      }
      type HonorItem {
        id: Int!
        name: String!
        assetbundleName: String!
        honorRarity: String
        category: String
        groupName: String
        eventAbn: String
        eventType: String
        level: Int
        owned: Boolean!
      }
      type BondHonorItem {
        id: Int!
        name: String!
        characterId1: Int
        characterId2: Int
        bondsGroupId: Int
        honorRarity: String
        level: Int
        owned: Boolean!
      }
      type FavoriteSong {
        musicId: Int!
        title: String!
        assetbundleName: String!
      }
      type SekaiSummary {
        rank: Int
        updatedAt: String
        cardCount: Int
        eventCount: Int
        difficulties: [DifficultyStat]
        characters: [CharacterSummary]
        favoriteSongs: [FavoriteSong!]!
      }
      type Query {
        profile: Profile
        userCards: [UserCard!]!
        sekaiSummary: SekaiSummary
        characterCards(characterId: Int!): [CharacterCard!]!
        musicList: [MusicSong!]!
        eventList: [EventItem!]!
        stampList: [StampItem!]!
        honorList: [HonorItem!]!
        bondHonorList: [BondHonorItem!]!
        adminCharacters: [AdminCharacter!]!
        adminHonors: [AdminHonor!]!
        adminFanHonors: [FanHonorStatus!]!
        adminStats: AdminStats!
        genshinCharacters: [GenshinCharacterItem!]!
        genshinRoster: [GenshinRosterItem!]!
        genshinWeaponInventory: [GenshinWeaponInventoryItem!]!
        genshinArtifactInventory: [GenshinArtifactInventoryItem!]!
        animeEntries: [AnimeEntryItem!]!
        animeSearch(query: String!, kind: String!): [AnimeSearchResult!]!
        siteProfile: SiteProfileItem!
        entryOrder: [String!]!
        clashRoyaleCards: [ClashRoyaleCardItem!]!
        clashRoyalePlayer: ClashRoyalePlayerItem
        brawlStarsBrawlers: [BrawlStarsBrawlerItem!]!
        brawlStarsPlayer: BrawlStarsPlayerItem
        brawlStarsRoster: [BrawlStarsRosterItem!]!
      }
      type SiteProfileItem {
        displayName: String!
        alias: String!
        avatarUrl: String!
        bio: String!
        instagramLabel: String!
        instagramUrl: String!
        discordLabel: String!
        discordUrl: String!
      }
      type AdminStats {
        characterCount: Int!
        cardCount: Int!
        songFavoriteCount: Int!
        eventCount: Int!
        stampCount: Int!
        honorCount: Int!
        genshinCharacterCount: Int!
        genshinFavoriteCount: Int!
        animeCount: Int!
        animeWatchingCount: Int!
        animeFinishedCount: Int!
        animeFavoriteCount: Int!
        animeQueuedCount: Int!
        clashRoyaleCardCount: Int!
        clashRoyaleTrophies: Int!
        brawlStarsBrawlerCount: Int!
        brawlStarsTrophies: Int!
      }
      type ClashRoyaleCardItem {
        id: Int!
        name: String!
        iconUrl: String!
        level: Int!
        maxLevel: Int!
        starLevel: Int
        evolutionLevel: Int
        maxEvolutionLevel: Int
        rarity: String!
        count: Int!
        elixirCost: Int
        isSupport: Boolean!
        updatedAt: String!
      }
      type ClashRoyalePlayerItem {
        name: String!
        expLevel: Int!
        trophies: Int!
        bestTrophies: Int!
        wins: Int!
        losses: Int!
        battleCount: Int!
        clanName: String
        arenaName: String
        updatedAt: String!
      }
      type BrawlStarsGadget {
        id: Int!
        name: String!
      }
      type BrawlStarsGear {
        id: Int!
        name: String!
        level: Int!
      }
      type BrawlStarsBrawlerItem {
        id: Int!
        name: String!
        iconUrl: String!
        power: Int!
        rank: Int!
        trophies: Int!
        highestTrophies: Int!
        gadgets: [BrawlStarsGadget!]!
        starPowers: [BrawlStarsGadget!]!
        gears: [BrawlStarsGear!]!
        updatedAt: String!
      }
      type BrawlStarsRosterItem {
        id: Int!
        name: String!
        iconUrl: String!
        owned: Boolean!
        power: Int
        trophies: Int
        highestTrophies: Int
        gadgets: [BrawlStarsGadget!]
        starPowers: [BrawlStarsGadget!]
        gears: [BrawlStarsGear!]
      }
      type BrawlStarsPlayerItem {
        name: String!
        expLevel: Int!
        trophies: Int!
        highestTrophies: Int!
        victories3v3: Int!
        soloVictories: Int!
        duoVictories: Int!
        clubName: String
        iconUrl: String!
        updatedAt: String!
      }
      type GenshinSubstat {
        name: String!
        value: String!
      }
      type GenshinArtifactItem {
        slot: String!
        setName: String!
        icon: String!
        rarity: Int!
        level: Int!
        mainStatName: String!
        mainStatValue: String!
        substats: [GenshinSubstat!]!
      }
      type GenshinCostumeItem {
        id: Int!
        name: String!
        icon: String!
      }
      type GenshinCharacterItem {
        id: Int!
        name: String!
        element: String!
        rarity: Int!
        icon: String!
        image: String!
        baseIcon: String!
        stats: [GenshinSubstat!]!
        level: Int!
        constellation: Int!
        friendship: Int!
        normalAttackLvl: Int!
        elementalSkillLvl: Int!
        elementalBurstLvl: Int!
        weaponId: Int!
        weaponName: String!
        weaponIcon: String!
        weaponRarity: Int!
        weaponLevel: Int!
        weaponRefinement: Int!
        isFavorite: Boolean!
        artifacts: [GenshinArtifactItem!]!
        costumes: [GenshinCostumeItem!]!
        selectedCostumeId: Int
        updatedAt: String!
      }
      type GenshinRosterItem {
        id: Int!
        name: String!
        element: String!
        rarity: Int!
        icon: String!
        owned: Boolean!
        region: String!
        image: String
        baseIcon: String
        stats: [GenshinSubstat!]
        level: Int
        constellation: Int
        friendship: Int
        normalAttackLvl: Int
        elementalSkillLvl: Int
        elementalBurstLvl: Int
        weaponName: String
        weaponIcon: String
        weaponRarity: Int
        weaponLevel: Int
        weaponRefinement: Int
        artifacts: [GenshinArtifactItem!]
        costumes: [GenshinCostumeItem!]
        selectedCostumeId: Int
      }
      # Full artifact/weapon inventory (equipped + benched) imported from a
      # .GOOD scan — see app/api/genshin/import-good/route.ts. Distinct from
      # GenshinArtifactItem/GenshinCharacterItem above, which are HoYoLAB's
      # equipped-only sync.
      type GenshinWeaponMasterInfo {
        id: Int!
        name: String!
        icon: String!
        rarity: Int!
        weaponType: String!
      }
      type GenshinWeaponInventoryItem {
        id: Int!
        level: Int!
        ascension: Int!
        refinement: Int!
        lock: Boolean!
        location: String
        weapon: GenshinWeaponMasterInfo!
      }
      type GenshinArtifactSetInfo {
        id: Int!
        name: String!
        icon: String!
        rarity: Int!
        onePiece: String
        twoPiece: String
        fourPiece: String
      }
      type GenshinInventorySubstat {
        key: String!
        value: Float!
      }
      type GenshinArtifactInventoryItem {
        id: Int!
        slotKey: String!
        level: Int!
        rarity: Int!
        lock: Boolean!
        location: String
        mainStatKey: String!
        substats: [GenshinInventorySubstat!]!
        set: GenshinArtifactSetInfo!
      }
      type AnimeEntryItem {
        id: Int!
        title: String!
        image: String!
        synopsis: String
        url: String!
        mediaType: String!
        status: String!
        isFavorite: Boolean!
        isQueued: Boolean!
        queueOrder: Int
        parentId: Int
        createdAt: String!
      }
      type AnimeSearchResult {
        malId: Int!
        title: String!
        image: String!
        mediaType: String!
      }
      type AdminCharacter {
        characterId: Int!
        name: String!
        unit: String!
        characterRank: Int!
        favoriteTier: Int
      }
      type AdminSong {
        musicId: Int!
        title: String!
        assetbundleName: String!
        favorite: Boolean!
      }
      type AdminHonor {
        id: Int!
        name: String!
        assetbundleName: String!
        honorRarity: String
        groupName: String
        owned: Boolean!
        level: Int
      }
      type FanHonorStatus {
        characterId: Int!
        name: String!
        level: Int!
        maxLevel: Int!
        rarity: String
        tierLevel: Int
        tierMaxLevel: Int
      }
      type Mutation {
        setCharacterEdit(characterId: Int!, favoriteTier: Int, characterRank: Int): AdminCharacter!
        setSongFavorite(musicId: Int!, favorite: Boolean!): AdminSong!
        setCardEdit(cardId: Int!, owned: Boolean!, level: Int, masterRank: Int, skillLevel: Int, specialTraining: Boolean): CharacterCard!
        setMusicResult(musicId: Int!, difficulty: String!, playResult: String): MusicDifficultyResult!
        setEventEdit(eventId: Int!, rank: Int): EventItem!
        setStampEdit(stampId: Int!, owned: Boolean!): StampItem!
        setHonorEdit(honorId: Int!, owned: Boolean!, level: Int): AdminHonor!
        setFanHonorLevel(characterId: Int!, level: Int!): FanHonorStatus!
        setProfile(name: String!, rank: Int!): Profile!
        setGenshinFavorite(characterId: Int!, favorite: Boolean!): GenshinCharacterItem!
        setGenshinCostume(characterId: Int!, costumeId: Int): GenshinCharacterItem!
        addAnimeEntry(url: String!): AnimeEntryItem!
        addAnimeEntryById(malId: Int!, kind: String!): AnimeEntryItem!
        setAnimeStatus(id: Int!, status: String!): AnimeEntryItem!
        setAnimeFavorite(id: Int!, favorite: Boolean!): AnimeEntryItem!
        setAnimeQueued(id: Int!, queued: Boolean!): AnimeEntryItem!
        setAnimeQueueOrder(orderedIds: [Int!]!): Boolean!
        setAnimeParent(id: Int!, parentId: Int): AnimeEntryItem!
        deleteAnimeEntry(id: Int!): Boolean!
        setSiteProfile(
          displayName: String!
          alias: String!
          avatarUrl: String!
          bio: String!
          instagramLabel: String!
          instagramUrl: String!
          discordLabel: String!
          discordUrl: String!
        ): SiteProfileItem!
        setEntryOrder(orderedSlugs: [String!]!): Boolean!
      }
    `,
    resolvers: {
      Query: {
        profile: () => prisma.profile.findFirst(),
        userCards: () =>
          prisma.userCard.findMany({
            include: { card: { include: { character: true } } },
          }),

        sekaiSummary: async () => {
          const [
            profile,
            cardCount,
            eventCount,
            musicGroups,
            userChars,
            stages,
            allFanHonors,
            favoriteSongRows,
          ] = await Promise.all([
            prisma.profile.findFirst(),
            prisma.userCard.count(),
            prisma.userEvent.count(),
            prisma.userMusicResult.groupBy({
              by: ["difficulty", "playResult"],
              _count: { _all: true },
            }),
            prisma.userCharacter.findMany({
              include: { character: true },
            }),
            prisma.userChallengeStage.findMany(),
            // all fan honors once, matched in memory (no groupId → match by name)
            prisma.honor.findMany({
              where: { name: { endsWith: "Fan" } },
            }),
            prisma.userMusicFavorite.findMany({ include: { music: true } }),
          ]);

          const favoriteSongs = favoriteSongRows.map((f) => ({
            musicId: f.musicId,
            title: f.music.title,
            assetbundleName: f.music.assetbundleName,
          }));

          // per-difficulty counts — CUMULATIVE up the ladder, like the game:
          //   clears      = CLEAR or better (CLEAR + FULL_COMBO + FULL_PERFECT)
          //   fullCombos  = FULL_COMBO or better (FULL_COMBO + FULL_PERFECT)
          //   fullPerfects = FULL_PERFECT only
          const diffMap: Record<
            string,
            { clears: number; fullCombos: number; fullPerfects: number }
          > = {};
          for (const g of musicGroups) {
            const d = (diffMap[g.difficulty] ??= {
              clears: 0,
              fullCombos: 0,
              fullPerfects: 0,
            });
            const n = g._count._all;
            const r = g.playResult;
            if (r === "FULL_PERFECT") {
              d.fullPerfects += n;
              d.fullCombos += n;
              d.clears += n;
            } else if (r === "FULL_COMBO") {
              d.fullCombos += n;
              d.clears += n;
            } else if (r === "CLEAR") {
              d.clears += n;
            }
          }
          const difficulties = Object.entries(diffMap).map(
            ([difficulty, v]) => ({ difficulty, ...v }),
          );

          // merge character rank + challenge level + favorite tier by characterId
          const stageByChar = new Map(
            stages.map((s) => [s.characterId, s.challengeLevel]),
          );

          const characters = userChars.map((uc) => {
            const givenName = uc.character.givenName ?? "";
            const displayName =
              givenName +
              (uc.character.firstName ? " " + uc.character.firstName : "");
            // The honor name is "Ichika Fan" (given name first). displayName
            // is built as givenName + " " + firstName above (also given-name-
            // first), so the given name is the FIRST word, not the last.
            // (Same bug class as charaIcon() in app/profile/images.ts — was
            // wrongly taking the last word here too, which only matched the
            // mononym cases and silently null'd honorAsset for every other
            // character, breaking the Summary tab's Kizuna honor badges.)
            const given = displayName.trim().split(" ").at(0) ?? "";
            const rarity = rarityForRank(uc.characterRank);
            const honorRow = allFanHonors.find(
              (h) => h.name.startsWith(given) && h.honorRarity === rarity,
            );

            return {
              characterId: uc.characterId,
              name: displayName,
              characterRank: uc.characterRank,
              challengeLevel: stageByChar.get(uc.characterId) ?? null,
              favoriteTier: uc.favoriteTier ?? null,
              unit: uc.character.unit,
              honorAsset: honorRow?.assetbundleName ?? null,
            };
          });

          return {
            rank: profile?.rank ?? null,
            updatedAt: profile?.updatedAt
              ? String(profile.updatedAt.getTime())
              : null,
            cardCount,
            eventCount,
            difficulties,
            characters,
            favoriteSongs,
          };
        },

        characterCards: async (
          _: unknown,
          { characterId }: { characterId: number },
        ) => {
          // all cards for this character + which ones the user owns
          const [cards, userCards] = await Promise.all([
            prisma.card.findMany({ where: { characterId } }),
            prisma.userCard.findMany({ where: { card: { characterId } } }),
          ]);

          const ownedByCard = new Map(userCards.map((uc) => [uc.cardId, uc]));

          return (
            cards
              .map((c) => {
                const uc = ownedByCard.get(c.id);
                return {
                  cardId: c.id,
                  name: c.name,
                  rarity: c.rarity,
                  assetbundleName: c.assetbundleName,
                  owned: Boolean(uc),
                  level: uc?.level ?? null,
                  masterRank: uc?.masterRank ?? null,
                  skillLevel: uc?.skillLevel ?? null,
                  specialTraining: uc?.specialTraining ?? null,
                };
              })
              // 4★ → 1★ (rarity desc), then cardId asc within a rarity
              .sort((a, b) => b.rarity - a.rarity || a.cardId - b.cardId)
          );
        },

        musicList: async () => {
          // in-memory cache — catalog only changes on re-seed, so compute once
          // and reuse across requests (cleared on server restart / redeploy).
          const g = globalThis as { __musicListCache?: unknown };
          if (g.__musicListCache) return g.__musicListCache;

          const [songs, results, difficulties, tags, favorites] = await Promise.all([
            prisma.music.findMany({ where: { isHidden: false }, orderBy: { id: "asc" } }),
            prisma.userMusicResult.findMany(),
            prisma.musicDifficulty.findMany(),
            prisma.musicTag.findMany(),
            prisma.userMusicFavorite.findMany(),
          ]);
          const favoriteSet = new Set(favorites.map((f) => f.musicId));

          // level per (musicId, difficulty) from MusicDifficulty
          const levelByKey = new Map<string, number>();
          for (const d of difficulties) {
            levelByKey.set(`${d.musicId}:${d.musicDifficulty}`, d.playLevel);
          }

          // user's best result per (musicId, difficulty)
          const resultByKey = new Map<string, string>();
          for (const r of results) {
            resultByKey.set(`${r.musicId}:${r.difficulty}`, r.playResult);
          }

          // which difficulties exist per song (from MusicDifficulty)
          const diffsByMusic = new Map<number, string[]>();
          for (const d of difficulties) {
            if (!diffsByMusic.has(d.musicId)) diffsByMusic.set(d.musicId, []);
            diffsByMusic.get(d.musicId)!.push(d.musicDifficulty);
          }

          // tags per song
          const tagsByMusic = new Map<number, string[]>();
          for (const t of tags) {
            if (!tagsByMusic.has(t.musicId)) tagsByMusic.set(t.musicId, []);
            tagsByMusic.get(t.musicId)!.push(t.musicTag);
          }

          const out = songs.map((s) => {
            const diffs = diffsByMusic.get(s.id) ?? [];
            return {
              id: s.id,
              title: s.title,
              assetbundleName: s.assetbundleName,
              tags: tagsByMusic.get(s.id) ?? [],
              results: diffs.map((diff) => ({
                difficulty: diff,
                playResult: resultByKey.get(`${s.id}:${diff}`) ?? null,
                playLevel: levelByKey.get(`${s.id}:${diff}`) ?? null,
              })),
              favorite: favoriteSet.has(s.id),
            };
          });

          (globalThis as { __musicListCache?: unknown }).__musicListCache = out;
          return out;
        },

        eventList: async () => {
          const [events, userEvents] = await Promise.all([
            prisma.event.findMany({ orderBy: { startAt: "desc" } }),
            prisma.userEvent.findMany(),
          ]);
          const rankByEvent = new Map(
            userEvents.map((u) => [u.eventId, u.rank]),
          );
          return events.map((e) => ({
            id: e.id,
            name: e.name,
            assetbundleName: e.assetbundleName,
            eventType: e.eventType,
            startAt: e.startAt ? String(e.startAt.getTime()) : null,
            unit: e.unit ?? null,
            rank: rankByEvent.get(e.id) ?? null,
          }));
        },

        stampList: async () => {
          const [stamps, userStamps] = await Promise.all([
            prisma.stamp.findMany({ orderBy: { id: "asc" } }),
            prisma.userStamp.findMany(),
          ]);
          const owned = new Set(userStamps.map((u) => u.stampId));
          return stamps.map((s) => ({
            id: s.id,
            name: s.name,
            assetbundleName: s.assetbundleName,
            characterId: s.characterId ?? null,
            isDuo: s.gameCharacterUnitId == null, // null = duo stamp (222 of them)
            owned: owned.has(s.id),
          }));
        },

        honorList: async () => {
          const [honors, userHonors, groups, events] = await Promise.all([
            prisma.honor.findMany({ orderBy: { id: "asc" } }),
            prisma.userHonor.findMany(),
            prisma.honorGroup.findMany(),
            prisma.event.findMany(),
          ]);
          const levelByHonor = new Map(
            userHonors.map((u) => [u.honorId, u.level]),
          );
          const typeByGroup = new Map(groups.map((g) => [g.id, g.honorType]));
          const nameByGroup = new Map(groups.map((g) => [g.id, g.name]));
          const normalize = (s: string | null | undefined) =>
            (s ?? "")
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "");
          // group names carry suffixes the event name doesn't ("... Overall",
          // "... Chapter", a unit name) — strip them before matching to an event
          const eventKey = (s: string | null | undefined) =>
            normalize((s ?? "").replace(/\s+(overall|chapter)\b.*$/i, ""));
          // event name → assetbundleName, so ranking honors can borrow the
          // event's own logo art (their honor_top_* assets don't exist)
          const eventAbnByName = new Map(
            events.map((e) => [eventKey(e.name), e.assetbundleName]),
          );
          // event name → eventType (world_bloom / marathon / cheerful_carnival)
          const eventTypeByName = new Map(
            events.map((e) => [eventKey(e.name), e.eventType]),
          );

          const mapped = honors
            .map((h) => {
              const gName =
                h.groupId != null ? (nameByGroup.get(h.groupId) ?? null) : null;
              return {
                id: h.id,
                name: h.name,
                assetbundleName: h.assetbundleName,
                honorRarity: h.honorRarity ?? null,
                category:
                  h.groupId != null
                    ? (typeByGroup.get(h.groupId) ?? null)
                    : null,
                groupId: h.groupId ?? null,
                groupName: gName,
                eventAbn: gName
                  ? (eventAbnByName.get(eventKey(gName)) ?? null)
                  : null,
                eventType: gName
                  ? (eventTypeByName.get(eventKey(gName)) ?? null)
                  : null,
                level: levelByHonor.get(h.id) ?? null,
                owned: levelByHonor.has(h.id),
              };
            })
            .filter((h) => h.category !== "rank_match");

          // per-group real honor asset (honor_0XXX): some events have a real
          // themed honor whose art the memorial (and others) can borrow
          const realArtByGroup = new Map<number, string>();
          for (const h of mapped) {
            if (
              h.groupId != null &&
              /^honor_\d+$/.test(h.assetbundleName) &&
              !realArtByGroup.has(h.groupId)
            ) {
              realArtByGroup.set(h.groupId, h.assetbundleName);
            }
          }

          // event honors: collapse the ranking-tier ladder to ONE row per event.
          // Key = groupId + chapter suffix (WL chapters stay separate). MEMORIAL
          // honors (honor_memorial) are a DISTINCT honor (story completion, not
          // ranking) — key them separately so they don't collapse into the
          // ranking ladder, and they borrow the event bg via eventAbn at render.
          const out: typeof mapped = [];
          const eventByKey = new Map<string, typeof mapped>();
          for (const h of mapped) {
            if (h.category === "event" && h.groupId != null) {
              const isMemorial = /^honor_memorial/.test(h.assetbundleName);
              const chapter = h.assetbundleName.match(/_cp\d+$/)?.[0] ?? "";
              const key = isMemorial
                ? `${h.groupId}-memorial`
                : `${h.groupId}${chapter}`;
              if (!eventByKey.has(key)) eventByKey.set(key, []);
              eventByKey.get(key)!.push(h);
            } else {
              out.push(h);
            }
          }
          for (const tiers of eventByKey.values()) {
            const ownedTier = tiers.find((t) => t.owned);
            const displayTier = ownedTier ?? tiers[tiers.length - 1];
            // if this honor has no real art but a same-group honor does, borrow it
            const groupArt =
              displayTier.groupId != null
                ? realArtByGroup.get(displayTier.groupId)
                : undefined;
            if (
              groupArt &&
              /^honor_(top_|memorial)/.test(displayTier.assetbundleName)
            ) {
              out.push({ ...displayTier, assetbundleName: groupArt });
            } else {
              out.push(displayTier);
            }
          }
          return out;
        },

        adminCharacters: async () => {
          const rows = await prisma.userCharacter.findMany({
            include: { character: true },
            orderBy: { characterId: "asc" },
          });
          return rows.map((uc) => ({
            characterId: uc.characterId,
            name:
              uc.character.givenName +
              (uc.character.firstName ? " " + uc.character.firstName : ""),
            unit: uc.character.unit,
            characterRank: uc.characterRank,
            favoriteTier: uc.favoriteTier ?? null,
          }));
        },

        adminHonors: async () => {
          // flat, uncollapsed list (unlike honorList, which merges the
          // ranking-tier ladder into one display row) — admin edits raw rows.
          const [honors, userHonors, groups, events] = await Promise.all([
            prisma.honor.findMany({ orderBy: { id: "asc" } }),
            prisma.userHonor.findMany(),
            prisma.honorGroup.findMany(),
            prisma.event.findMany(),
          ]);
          const levelByHonor = new Map(
            userHonors.map((u) => [u.honorId, u.level]),
          );
          const nameByGroup = new Map(groups.map((g) => [g.id, g.name]));
          const typeByGroup = new Map(groups.map((g) => [g.id, g.honorType]));
          // "overall" ranking-ladder groups (1st/Top N/...) that now sync
          // automatically from the Events tab's recorded rank
          const derivedGroupIds = new Set(
            events
              .map((e) => findOverallEventHonorGroup(e.name, groups)?.id)
              .filter((id): id is number => id != null),
          );
          return honors
            .filter((h) => {
              const type = h.groupId != null ? typeByGroup.get(h.groupId) : null;
              if (type === "rank_match") return false;
              // fan honors (4 near-identical rows per character) are
              // consolidated into adminFanHonors instead
              if (h.name.endsWith("Fan")) return false;
              // ranking-ladder honors ("1st"/"Top N"/...) for an event
              // whose overall group we can derive from — non-ladder honors
              // in the same group (e.g. Memorial) stay manually editable
              if (
                h.groupId != null &&
                derivedGroupIds.has(h.groupId) &&
                eventHonorRankThreshold(h.name) != null
              ) {
                return false;
              }
              return true;
            })
            .map((h) => ({
              id: h.id,
              name: h.name,
              assetbundleName: h.assetbundleName,
              honorRarity: h.honorRarity ?? null,
              groupName:
                h.groupId != null ? (nameByGroup.get(h.groupId) ?? null) : null,
              owned: levelByHonor.has(h.id),
              level: levelByHonor.get(h.id) ?? null,
            }));
        },

        adminFanHonors: async () => {
          const [chars, fanHonors, userHonors] = await Promise.all([
            prisma.character.findMany({ orderBy: { id: "asc" } }),
            prisma.honor.findMany({ where: { name: { endsWith: "Fan" } } }),
            prisma.userHonor.findMany(),
          ]);
          const levelByHonorId = new Map(userHonors.map((u) => [u.honorId, u.level]));
          const honorsByChar = new Map<number, typeof fanHonors>();
          for (const h of fanHonors) {
            if (h.groupId == null) continue;
            if (!honorsByChar.has(h.groupId)) honorsByChar.set(h.groupId, []);
            honorsByChar.get(h.groupId)!.push(h);
          }

          return chars.map((c) => {
            const byRarity = new Map(
              (honorsByChar.get(c.id) ?? []).map((h) => [h.honorRarity, h]),
            );
            let overall = 0;
            let rarity: string | null = null;
            let tierLevel = 0;
            let tierMaxLevel = 0;
            for (const band of FAN_HONOR_BANDS) {
              const honor = byRarity.get(band.rarity);
              const lvl = honor ? (levelByHonorId.get(honor.id) ?? 0) : 0;
              if (lvl <= 0) break;
              overall += lvl;
              rarity = band.rarity;
              tierLevel = lvl;
              tierMaxLevel = band.maxLevel;
              if (lvl < band.maxLevel) break; // partway into this tier, stop
            }
            return {
              characterId: c.id,
              name: c.givenName + (c.firstName ? " " + c.firstName : ""),
              level: overall,
              maxLevel: FAN_HONOR_MAX_LEVEL,
              rarity,
              tierLevel: rarity ? tierLevel : null,
              tierMaxLevel: rarity ? tierMaxLevel : null,
            };
          });
        },

        adminStats: async () => {
          const [
            characterCount,
            cardCount,
            songFavoriteCount,
            eventCount,
            stampCount,
            honorCount,
            genshinCharacterCount,
            genshinFavoriteCount,
            animeCount,
            animeWatchingCount,
            animeFinishedCount,
            animeFavoriteCount,
            animeQueuedCount,
            clashRoyaleCardCount,
            clashRoyalePlayerRow,
            brawlStarsBrawlerCount,
            brawlStarsPlayerRow,
          ] = await Promise.all([
            prisma.userCharacter.count(),
            prisma.userCard.count(),
            prisma.userMusicFavorite.count(),
            prisma.userEvent.count({ where: { rank: { not: null } } }),
            prisma.userStamp.count(),
            prisma.userHonor.count(),
            prisma.genshinCharacter.count(),
            prisma.genshinCharacter.count({ where: { isFavorite: true } }),
            prisma.animeEntry.count({ where: { parentId: null } }),
            prisma.animeEntry.count({ where: { parentId: null, status: "Watching" } }),
            prisma.animeEntry.count({ where: { parentId: null, status: "Finished" } }),
            prisma.animeEntry.count({ where: { parentId: null, isFavorite: true } }),
            prisma.animeEntry.count({ where: { parentId: null, isQueued: true } }),
            prisma.clashRoyaleCard.count({ where: { count: { gt: 0 } } }),
            prisma.clashRoyalePlayer.findUnique({ where: { id: 1 } }),
            prisma.brawlStarsBrawler.count(),
            prisma.brawlStarsPlayer.findUnique({ where: { id: 1 } }),
          ]);
          const clashRoyaleTrophies = clashRoyalePlayerRow?.trophies ?? 0;
          const brawlStarsTrophies = brawlStarsPlayerRow?.trophies ?? 0;
          return {
            characterCount,
            cardCount,
            songFavoriteCount,
            eventCount,
            stampCount,
            honorCount,
            genshinCharacterCount,
            genshinFavoriteCount,
            animeCount,
            animeWatchingCount,
            animeFinishedCount,
            animeFavoriteCount,
            animeQueuedCount,
            clashRoyaleCardCount,
            clashRoyaleTrophies,
            brawlStarsBrawlerCount,
            brawlStarsTrophies,
          };
        },

        genshinCharacters: async () => {
          // best-effort daily refresh — scheduled after the response is
          // sent, so this never adds latency to the page load
          after(() => syncGenshinIfStale());
          const chars = await prisma.genshinCharacter.findMany({
            include: { artifacts: true },
            orderBy: { level: "desc" },
          });
          return chars.map((c) => ({
            ...c,
            ...resolveGenshinDisplay(c),
            baseIcon: c.icon,
            stats: c.stats as { name: string; value: string }[],
            costumes: c.costumes as { id: number; name: string; icon: string }[],
            updatedAt: String(c.updatedAt.getTime()),
            artifacts: c.artifacts.map((a) => ({
              ...a,
              substats: a.substats as { name: string; value: string }[],
            })),
          }));
        },

        genshinRoster: async () => {
          // best-effort daily refresh — scheduled after the response is
          // sent, so this never adds latency to the page load
          after(() => syncGenshinIfStale());
          const [owned, master] = await Promise.all([
            prisma.genshinCharacter.findMany({ include: { artifacts: true } }),
            prisma.genshinCharacterMaster.findMany(),
          ]);

          type Row = {
            id: number;
            name: string;
            element: string;
            rarity: number;
            icon: string;
            owned: boolean;
            region: string;
            image: string | null;
            baseIcon: string | null;
            stats: { name: string; value: string }[] | null;
            level: number | null;
            constellation: number | null;
            friendship: number | null;
            normalAttackLvl: number | null;
            elementalSkillLvl: number | null;
            elementalBurstLvl: number | null;
            weaponName: string | null;
            weaponIcon: string | null;
            weaponRarity: number | null;
            weaponLevel: number | null;
            weaponRefinement: number | null;
            artifacts:
              | { slot: string; setName: string; icon: string; rarity: number; level: number; mainStatName: string; mainStatValue: string; substats: { name: string; value: string }[] }[]
              | null;
            costumes: { id: number; name: string; icon: string }[] | null;
            selectedCostumeId: number | null;
          };

          const ownedNames = new Set(owned.map((c) => c.name.toLowerCase()));
          const masterById = new Map(master.map((m) => [m.id, m]));
          const masterByName = new Map(master.map((m) => [m.name.toLowerCase(), m]));
          const regionFor = (c: { id: number; name: string }) =>
            masterById.get(c.id)?.region ?? masterByName.get(c.name.toLowerCase())?.region ?? "Other";

          const rows: Row[] = owned.map((c) => {
            const disp = resolveGenshinDisplay(c);
            return {
            id: c.id,
            name: c.name,
            element: c.element,
            rarity: c.rarity,
            icon: c.icon,
            owned: true,
            region: regionFor(c),
            image: disp.image,
            baseIcon: c.icon,
            stats: c.stats as { name: string; value: string }[],
            level: c.level,
            constellation: c.constellation,
            friendship: c.friendship,
            normalAttackLvl: c.normalAttackLvl,
            elementalSkillLvl: c.elementalSkillLvl,
            elementalBurstLvl: c.elementalBurstLvl,
            weaponName: c.weaponName,
            weaponIcon: c.weaponIcon,
            weaponRarity: c.weaponRarity,
            weaponLevel: c.weaponLevel,
            weaponRefinement: c.weaponRefinement,
            artifacts: c.artifacts.map((a) => ({
              ...a,
              substats: a.substats as { name: string; value: string }[],
            })),
            costumes: c.costumes as { id: number; name: string; icon: string }[],
            selectedCostumeId: c.selectedCostumeId,
            };
          });

          for (const m of master) {
            if (ownedNames.has(m.name.toLowerCase())) continue;
            rows.push({
              id: m.id,
              name: m.name,
              element: m.element,
              rarity: m.rarity,
              icon: m.icon,
              owned: false,
              region: m.region,
              image: null,
              baseIcon: null,
              stats: null,
              level: null,
              constellation: null,
              friendship: null,
              normalAttackLvl: null,
              elementalSkillLvl: null,
              elementalBurstLvl: null,
              weaponName: null,
              weaponIcon: null,
              weaponRarity: null,
              weaponLevel: null,
              weaponRefinement: null,
              artifacts: null,
              costumes: null,
              selectedCostumeId: null,
            });
          }
          return rows;
        },

        genshinWeaponInventory: async () => {
          const items = await prisma.genshinWeaponItem.findMany({
            include: { weapon: true },
            orderBy: [{ weapon: { rarity: "desc" } }, { level: "desc" }],
          });
          return items;
        },

        genshinArtifactInventory: async () => {
          const items = await prisma.genshinArtifactItem.findMany({
            include: { set: true },
            orderBy: [{ rarity: "desc" }, { level: "desc" }],
          });
          return items.map((a) => ({
            ...a,
            substats: a.substats as { key: string; value: number }[],
          }));
        },

        animeEntries: async () => {
          // manually dragged (queueOrder set) first, in that order; anything
          // never touched in the admin board falls back to newest-first —
          // this is the single order every consumer (admin board, frontend
          // Library grid, Summary) sees, so reordering in admin now actually
          // changes what you see everywhere else too
          const rows = await prisma.animeEntry.findMany({
            orderBy: [{ queueOrder: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
          });
          return rows.map((r) => ({
            ...r,
            createdAt: String(r.createdAt.getTime()),
          }));
        },

        animeSearch: async (
          _: unknown,
          { query, kind }: { query: string; kind: string },
        ) => {
          if (kind !== "anime" && kind !== "manga") {
            throw new GraphQLError('kind must be "anime" or "manga".');
          }
          if (!query.trim()) return [];
          try {
            const results = await searchAniList(kind, query.trim());
            return results.map((m) => ({
              malId: m.idMal as number,
              title: anilistTitle(m),
              image: m.coverImage.medium ?? m.coverImage.large ?? "",
              mediaType: anilistMediaType(kind, m.format),
            }));
          } catch (e) {
            throw new GraphQLError(
              `Search failed — try again in a bit. ${(e as Error).message}`,
            );
          }
        },

        siteProfile: async () => {
          const existing = await prisma.siteProfile.findUnique({ where: { id: 1 } });
          if (existing) return existing;
          // first-ever load — seed the row with the site's real current
          // values so nothing visually changes until someone actually
          // edits it from the admin Logistics section
          return prisma.siteProfile.create({
            data: {
              id: 1,
              displayName: "ITAMI",
              alias: "NONAME",
              avatarUrl: "/pfp.png",
              bio: "Developer, into software, AI, embedded systems, and anime. This is where I keep track of the games I play. Open to friends in any game, just reach out.",
              instagramLabel: "amekage_itami",
              instagramUrl: "https://www.instagram.com/amekage_itami/",
              discordLabel: "username.noname",
              discordUrl: "https://discord.com/users/username.noname",
            },
          });
        },
        entryOrder: async () => {
          const rows = await prisma.entryOrder.findMany({ orderBy: { order: "asc" } });
          const saved = rows.map((r) => r.slug);
          const fallback = ["sekai", "genshin", "anime", "clashroyale", "brawlstars"];
          // append any slug that hasn't been manually ordered yet (new
          // entries added to games.ts after the admin last touched order)
          const rest = fallback.filter((slug) => !saved.includes(slug));
          return [...saved, ...rest];
        },
        clashRoyaleCards: async () => {
          // best-effort daily refresh — scheduled after the response is
          // sent, so this never adds latency to the page load
          after(() => syncClashRoyaleIfStale());
          const cards = await prisma.clashRoyaleCard.findMany({
            orderBy: [{ isSupport: "asc" }, { elixirCost: "asc" }, { name: "asc" }],
          });
          return cards.map((c) => ({ ...c, updatedAt: String(c.updatedAt.getTime()) }));
        },
        brawlStarsBrawlers: async () => {
          const brawlers = await prisma.brawlStarsBrawler.findMany({
            orderBy: { name: "asc" },
          });
          return brawlers.map((b) => ({
            ...b,
            iconUrl: brawlerIconUrl(b.id),
            updatedAt: String(b.updatedAt.getTime()),
          }));
        },
        brawlStarsRoster: async () => {
          // best-effort daily refresh — scheduled after the response is
          // sent, so this never adds latency to the page load
          after(() => syncBrawlStarsIfStale());
          const [master, owned] = await Promise.all([
            prisma.brawlStarsBrawlerMaster.findMany({ orderBy: { name: "asc" } }),
            prisma.brawlStarsBrawler.findMany(),
          ]);
          const ownedById = new Map(owned.map((b) => [b.id, b]));
          return master.map((m) => {
            const o = ownedById.get(m.id);
            return {
              id: m.id,
              name: m.name,
              iconUrl: brawlerIconUrl(m.id),
              owned: Boolean(o),
              power: o?.power ?? null,
              trophies: o?.trophies ?? null,
              highestTrophies: o?.highestTrophies ?? null,
              gadgets: o?.gadgets ?? null,
              starPowers: o?.starPowers ?? null,
              gears: o?.gears ?? null,
            };
          });
        },
        clashRoyalePlayer: async () => {
          const p = await prisma.clashRoyalePlayer.findUnique({ where: { id: 1 } });
          if (!p) return null;
          return { ...p, updatedAt: String(p.updatedAt.getTime()) };
        },
        brawlStarsPlayer: async () => {
          const p = await prisma.brawlStarsPlayer.findUnique({ where: { id: 1 } });
          if (!p) return null;
          return { ...p, iconUrl: playerIconUrl(p.iconId), updatedAt: String(p.updatedAt.getTime()) };
        },

        bondHonorList: async () => {
          const [bonds, userBonds] = await Promise.all([
            prisma.bondHonor.findMany({ orderBy: { id: "asc" } }),
            prisma.userBondHonors.findMany(),
          ]);
          const levelByBond = new Map(
            userBonds.map((u) => [u.bondHonorId, u.level]),
          );
          return bonds.map((b) => ({
            id: b.id,
            name: b.name,
            characterId1: b.characterId1 ?? null,
            characterId2: b.characterId2 ?? null,
            bondsGroupId: b.bondsGroupId ?? null,
            honorRarity: b.honorRarity ?? null,
            level: levelByBond.get(b.id) ?? null,
            owned: levelByBond.has(b.id),
          }));
        },
      },

      Mutation: {
        setCharacterEdit: async (
          _: unknown,
          {
            characterId,
            favoriteTier,
            characterRank,
          }: {
            characterId: number;
            favoriteTier?: number | null;
            characterRank?: number | null;
          },
        ) => {
          const uc = await prisma.userCharacter.upsert({
            where: { characterId },
            update: {
              ...(characterRank != null ? { characterRank } : {}),
              ...(favoriteTier !== undefined ? { favoriteTier } : {}),
            },
            create: {
              characterId,
              characterRank: characterRank ?? 1,
              favoriteTier: favoriteTier ?? null,
            },
            include: { character: true },
          });
          return {
            characterId: uc.characterId,
            name:
              uc.character.givenName +
              (uc.character.firstName ? " " + uc.character.firstName : ""),
            unit: uc.character.unit,
            characterRank: uc.characterRank,
            favoriteTier: uc.favoriteTier ?? null,
          };
        },

        setSongFavorite: async (
          _: unknown,
          { musicId, favorite }: { musicId: number; favorite: boolean },
        ) => {
          if (favorite) {
            await prisma.userMusicFavorite.upsert({
              where: { musicId },
              update: {},
              create: { musicId },
            });
          } else {
            await prisma.userMusicFavorite.deleteMany({ where: { musicId } });
          }
          // musicList caches results globally — bust it so the edit shows up
          (globalThis as { __musicListCache?: unknown }).__musicListCache =
            undefined;
          const music = await prisma.music.findUniqueOrThrow({
            where: { id: musicId },
          });
          return {
            musicId,
            title: music.title,
            assetbundleName: music.assetbundleName,
            favorite,
          };
        },

        setCardEdit: async (
          _: unknown,
          {
            cardId,
            owned,
            level,
            masterRank,
            skillLevel,
            specialTraining,
          }: {
            cardId: number;
            owned: boolean;
            level?: number | null;
            masterRank?: number | null;
            skillLevel?: number | null;
            specialTraining?: boolean | null;
          },
        ) => {
          const card = await prisma.card.findUniqueOrThrow({
            where: { id: cardId },
          });
          // only 3★/4★ cards have a special-training state in-game
          const st = card.rarity >= 3 ? specialTraining : false;
          // clamp to the rarity-appropriate caps, mirroring the admin UI's
          // own max inputs — defense in depth against a raw mutation call
          const maxLevel = maxLevelForRarity(card.rarity);
          const clampedLevel = level != null ? Math.min(level, maxLevel) : level;
          const clampedMasterRank =
            masterRank != null ? Math.min(masterRank, MAX_MASTER_RANK) : masterRank;
          const clampedSkillLevel =
            skillLevel != null ? Math.min(skillLevel, MAX_SKILL_LEVEL) : skillLevel;

          if (owned) {
            await prisma.userCard.upsert({
              where: { cardId },
              update: {
                ...(clampedLevel != null ? { level: clampedLevel } : {}),
                ...(clampedMasterRank != null ? { masterRank: clampedMasterRank } : {}),
                ...(clampedSkillLevel != null ? { skillLevel: clampedSkillLevel } : {}),
                ...(st != null ? { specialTraining: st } : {}),
              },
              create: {
                cardId,
                level: Math.min(clampedLevel ?? 1, maxLevel),
                masterRank: Math.min(clampedMasterRank ?? 0, MAX_MASTER_RANK),
                skillLevel: Math.min(clampedSkillLevel ?? 1, MAX_SKILL_LEVEL),
                specialTraining: st ?? false,
              },
            });
          } else {
            await prisma.userCard.deleteMany({ where: { cardId } });
          }
          const uc = await prisma.userCard.findUnique({ where: { cardId } });
          return {
            cardId: card.id,
            name: card.name,
            rarity: card.rarity,
            assetbundleName: card.assetbundleName,
            owned: Boolean(uc),
            level: uc?.level ?? null,
            masterRank: uc?.masterRank ?? null,
            skillLevel: uc?.skillLevel ?? null,
            specialTraining: uc?.specialTraining ?? null,
          };
        },

        setMusicResult: async (
          _: unknown,
          {
            musicId,
            difficulty,
            playResult,
          }: { musicId: number; difficulty: string; playResult?: string | null },
        ) => {
          if (playResult) {
            await prisma.userMusicResult.upsert({
              where: { musicId_difficulty: { musicId, difficulty } },
              update: { playResult },
              create: { musicId, difficulty, playResult },
            });
          } else {
            await prisma.userMusicResult.deleteMany({
              where: { musicId, difficulty },
            });
          }
          // musicList caches results globally — bust it so the edit shows up
          (globalThis as { __musicListCache?: unknown }).__musicListCache =
            undefined;
          const diffRow = await prisma.musicDifficulty.findFirst({
            where: { musicId, musicDifficulty: difficulty },
          });
          return {
            difficulty,
            playResult: playResult ?? null,
            playLevel: diffRow?.playLevel ?? null,
          };
        },

        setEventEdit: async (
          _: unknown,
          { eventId, rank }: { eventId: number; rank?: number | null },
        ) => {
          await prisma.userEvent.upsert({
            where: { eventId },
            update: { rank: rank ?? null },
            create: { eventId, rank: rank ?? null },
          });
          const event = await prisma.event.findUniqueOrThrow({
            where: { id: eventId },
          });

          // sync this event's ranking-ladder honors (1st/Top N/...) to
          // match the recorded rank — they're derived, not manually toggled
          const groups = await prisma.honorGroup.findMany({
            where: { honorType: "event" },
          });
          const group = findOverallEventHonorGroup(event.name, groups);
          if (group) {
            await syncEventHonorsForRank(group.id, rank ?? null);
          }

          return {
            id: event.id,
            name: event.name,
            assetbundleName: event.assetbundleName,
            eventType: event.eventType,
            startAt: event.startAt ? String(event.startAt.getTime()) : null,
            unit: event.unit ?? null,
            rank: rank ?? null,
          };
        },

        setStampEdit: async (
          _: unknown,
          { stampId, owned }: { stampId: number; owned: boolean },
        ) => {
          if (owned) {
            await prisma.userStamp.upsert({
              where: { stampId },
              update: {},
              create: { stampId },
            });
          } else {
            await prisma.userStamp.deleteMany({ where: { stampId } });
          }
          const stamp = await prisma.stamp.findUniqueOrThrow({
            where: { id: stampId },
          });
          return {
            id: stamp.id,
            name: stamp.name,
            assetbundleName: stamp.assetbundleName,
            characterId: stamp.characterId ?? null,
            isDuo: stamp.gameCharacterUnitId == null,
            owned,
          };
        },

        setHonorEdit: async (
          _: unknown,
          {
            honorId,
            owned,
            level,
          }: { honorId: number; owned: boolean; level?: number | null },
        ) => {
          if (owned) {
            await prisma.userHonor.upsert({
              where: { honorId },
              update: { ...(level != null ? { level } : {}) },
              create: { honorId, level: level ?? 1 },
            });
          } else {
            await prisma.userHonor.deleteMany({ where: { honorId } });
          }
          const [honor, uh] = await Promise.all([
            prisma.honor.findUniqueOrThrow({ where: { id: honorId } }),
            prisma.userHonor.findUnique({ where: { honorId } }),
          ]);
          return {
            id: honor.id,
            name: honor.name,
            assetbundleName: honor.assetbundleName,
            honorRarity: honor.honorRarity ?? null,
            groupName: null,
            owned: Boolean(uh),
            level: uh?.level ?? null,
          };
        },

        setFanHonorLevel: async (
          _: unknown,
          { characterId, level }: { characterId: number; level: number },
        ) => {
          const [character, fanHonors] = await Promise.all([
            prisma.character.findUniqueOrThrow({ where: { id: characterId } }),
            prisma.honor.findMany({
              where: { groupId: characterId, name: { endsWith: "Fan" } },
            }),
          ]);
          const byRarity = new Map(fanHonors.map((h) => [h.honorRarity, h]));

          let remaining = Math.max(0, Math.min(level, FAN_HONOR_MAX_LEVEL));
          let rarity: string | null = null;
          let tierLevel = 0;
          let tierMaxLevel = 0;
          for (const band of FAN_HONOR_BANDS) {
            const honor = byRarity.get(band.rarity);
            if (!honor) continue;
            if (remaining <= 0) {
              await prisma.userHonor.deleteMany({ where: { honorId: honor.id } });
              continue;
            }
            const bandLevel = Math.min(remaining, band.maxLevel);
            await prisma.userHonor.upsert({
              where: { honorId: honor.id },
              update: { level: bandLevel },
              create: { honorId: honor.id, level: bandLevel },
            });
            rarity = band.rarity;
            tierLevel = bandLevel;
            tierMaxLevel = band.maxLevel;
            remaining -= band.maxLevel;
          }

          const overall = Math.max(0, Math.min(level, FAN_HONOR_MAX_LEVEL));
          return {
            characterId: character.id,
            name:
              character.givenName +
              (character.firstName ? " " + character.firstName : ""),
            level: overall,
            maxLevel: FAN_HONOR_MAX_LEVEL,
            rarity,
            tierLevel: rarity ? tierLevel : null,
            tierMaxLevel: rarity ? tierMaxLevel : null,
          };
        },

        setGenshinFavorite: async (
          _: unknown,
          { characterId, favorite }: { characterId: number; favorite: boolean },
        ) => {
          const c = await prisma.genshinCharacter.update({
            where: { id: characterId },
            data: { isFavorite: favorite },
            include: { artifacts: true },
          });
          return {
            ...c,
            ...resolveGenshinDisplay(c),
            baseIcon: c.icon,
            stats: c.stats as { name: string; value: string }[],
            costumes: c.costumes as { id: number; name: string; icon: string }[],
            updatedAt: String(c.updatedAt.getTime()),
            artifacts: c.artifacts.map((a) => ({
              ...a,
              substats: a.substats as { name: string; value: string }[],
            })),
          };
        },

        setGenshinCostume: async (
          _: unknown,
          { characterId, costumeId }: { characterId: number; costumeId?: number | null },
        ) => {
          const c = await prisma.genshinCharacter.update({
            where: { id: characterId },
            data: { selectedCostumeId: costumeId ?? null },
            include: { artifacts: true },
          });
          return {
            ...c,
            ...resolveGenshinDisplay(c),
            baseIcon: c.icon,
            stats: c.stats as { name: string; value: string }[],
            costumes: c.costumes as { id: number; name: string; icon: string }[],
            updatedAt: String(c.updatedAt.getTime()),
            artifacts: c.artifacts.map((a) => ({
              ...a,
              substats: a.substats as { name: string; value: string }[],
            })),
          };
        },

        addAnimeEntry: async (_: unknown, { url }: { url: string }) => {
          const match = url.match(MAL_URL_RE);
          if (!match) {
            throw new GraphQLError(
              "That doesn't look like a MyAnimeList anime or manga URL.",
            );
          }
          const kind = match[1] as "anime" | "manga";
          const malId = Number(match[2]);
          try {
            return await upsertAnimeFromAniList(kind, malId);
          } catch (e) {
            throw new GraphQLError(
              `Couldn't fetch that title right now — try again in a bit. ${(e as Error).message}`,
            );
          }
        },

        addAnimeEntryById: async (
          _: unknown,
          { malId, kind }: { malId: number; kind: string },
        ) => {
          if (kind !== "anime" && kind !== "manga") {
            throw new GraphQLError('kind must be "anime" or "manga".');
          }
          try {
            return await upsertAnimeFromAniList(kind, malId);
          } catch (e) {
            throw new GraphQLError(
              `Couldn't fetch that title right now — try again in a bit. ${(e as Error).message}`,
            );
          }
        },

        setAnimeStatus: async (
          _: unknown,
          { id, status }: { id: number; status: string },
        ) => {
          const entry = await prisma.animeEntry.update({
            where: { id },
            // leaving Waitlist means it's no longer "up next" — clear the
            // pin so it can't linger in the Summary's Next in Queue after
            // you've actually started (or finished) it
            data: status === "Waitlist" ? { status } : { status, isQueued: false },
          });
          return { ...entry, createdAt: String(entry.createdAt.getTime()) };
        },

        setAnimeFavorite: async (
          _: unknown,
          { id, favorite }: { id: number; favorite: boolean },
        ) => {
          const entry = await prisma.animeEntry.update({
            where: { id },
            data: { isFavorite: favorite },
          });
          return { ...entry, createdAt: String(entry.createdAt.getTime()) };
        },

        setAnimeQueued: async (
          _: unknown,
          { id, queued }: { id: number; queued: boolean },
        ) => {
          const entry = await prisma.animeEntry.update({
            where: { id },
            data: { isQueued: queued },
          });
          return { ...entry, createdAt: String(entry.createdAt.getTime()) };
        },

        setAnimeQueueOrder: async (
          _: unknown,
          { orderedIds }: { orderedIds: number[] },
        ) => {
          await prisma.$transaction(
            orderedIds.map((id, i) =>
              prisma.animeEntry.update({ where: { id }, data: { queueOrder: i } }),
            ),
          );
          return true;
        },

        setAnimeParent: async (
          _: unknown,
          { id, parentId }: { id: number; parentId?: number | null },
        ) => {
          // linking a season under a parent seeds its status from whatever
          // the parent's status is *right now* — a one-time starting
          // default, not a hard sync. After linking, each season still
          // tracks its own status independently (e.g. Finished S1,
          // Watching S2), same as before.
          let inheritedStatus: string | null = null;

          if (parentId != null) {
            if (parentId === id) {
              throw new GraphQLError("A title can't be its own season.");
            }
            const parent = await prisma.animeEntry.findUnique({
              where: { id: parentId },
              select: { parentId: true, status: true },
            });
            if (!parent) {
              throw new GraphQLError("That parent title doesn't exist.");
            }
            // keep it flat — one level of season grouping, no chains
            if (parent.parentId != null) {
              throw new GraphQLError(
                "That title is itself a season of something else — link to its parent instead.",
              );
            }
            const hasSeasons = await prisma.animeEntry.count({
              where: { parentId: id },
            });
            if (hasSeasons > 0) {
              throw new GraphQLError(
                "This title already has seasons linked under it — can't also make it a season of something else.",
              );
            }
            inheritedStatus = parent.status;
          }
          const entry = await prisma.animeEntry.update({
            where: { id },
            data: {
              parentId: parentId ?? null,
              ...(inheritedStatus ? { status: inheritedStatus } : {}),
            },
          });
          return { ...entry, createdAt: String(entry.createdAt.getTime()) };
        },

        deleteAnimeEntry: async (_: unknown, { id }: { id: number }) => {
          await prisma.animeEntry.delete({ where: { id } }).catch(() => {});
          return true;
        },

        setProfile: async (_: unknown, { name, rank }: { name: string; rank: number }) => {
          const existing = await prisma.profile.findFirst();
          if (existing) {
            return prisma.profile.update({
              where: { id: existing.id },
              data: { name, rank },
            });
          }
          return prisma.profile.create({
            data: { name, rank, createdAt: new Date() },
          });
        },
        setSiteProfile: async (
          _: unknown,
          data: {
            displayName: string;
            alias: string;
            avatarUrl: string;
            bio: string;
            instagramLabel: string;
            instagramUrl: string;
            discordLabel: string;
            discordUrl: string;
          },
        ) => {
          return prisma.siteProfile.upsert({
            where: { id: 1 },
            update: data,
            create: { id: 1, ...data },
          });
        },
        setEntryOrder: async (_: unknown, { orderedSlugs }: { orderedSlugs: string[] }) => {
          await prisma.$transaction(
            orderedSlugs.map((slug, i) =>
              prisma.entryOrder.upsert({
                where: { slug },
                update: { order: i },
                create: { slug, order: i },
              }),
            ),
          );
          return true;
        },
      },
    },
  }),
  graphqlEndpoint: "/api/graphql",
  fetchAPI: { Response },
});

export {
  handleRequest as GET,
  handleRequest as POST,
  handleRequest as OPTIONS,
};
