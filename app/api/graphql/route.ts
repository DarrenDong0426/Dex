import { createSchema, createYoga } from "graphql-yoga";
import { prisma } from "@/lib/prisma";

// rank → rarity band (mirrors app/honor.ts)
function rarityForRank(rank: number): "low" | "middle" | "high" | "highest" {
  if (rank >= 130) return "highest";
  if (rank >= 80) return "high";
  if (rank >= 30) return "middle";
  return "low";
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
      type SekaiSummary {
        rank: Int
        updatedAt: String
        cardCount: Int
        eventCount: Int
        difficulties: [DifficultyStat]
        characters: [CharacterSummary]
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
          ]);

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
            // The honor name is "Ichika Fan" (given name first). In this DB the
            // given name is the LAST word of the display name (name is stored
            // surname-first), so match honors on that.
            const given = displayName.trim().split(" ").at(-1) ?? "";
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

          const [songs, results, difficulties, tags] = await Promise.all([
            prisma.music.findMany({ orderBy: { id: "asc" } }),
            prisma.userMusicResult.findMany(),
            prisma.musicDifficulty.findMany(),
            prisma.musicTag.findMany(),
          ]);

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

          const mapped = honors.map((h) => {
            const gName =
              h.groupId != null ? (nameByGroup.get(h.groupId) ?? null) : null;
            return {
              id: h.id,
              name: h.name,
              assetbundleName: h.assetbundleName,
              honorRarity: h.honorRarity ?? null,
              category:
                h.groupId != null ? (typeByGroup.get(h.groupId) ?? null) : null,
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
          });

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
