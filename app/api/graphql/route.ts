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
        rarity: Int!
        assetbundleName: String!
        owned: Boolean!
        level: Int
        masterRank: Int
        specialTraining: Boolean
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
                  rarity: c.rarity,
                  assetbundleName: c.assetbundleName,
                  owned: Boolean(uc),
                  level: uc?.level ?? null,
                  masterRank: uc?.masterRank ?? null,
                  specialTraining: uc?.specialTraining ?? null,
                };
              })
              // 4★ → 1★ (rarity desc), then cardId asc within a rarity
              .sort((a, b) => b.rarity - a.rarity || a.cardId - b.cardId)
          );
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
