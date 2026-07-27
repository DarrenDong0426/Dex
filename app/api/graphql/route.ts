import { createSchema, createYoga } from "graphql-yoga";
import { prisma } from "@/lib/prisma";

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
          ]);
          const musicCount = await prisma.userMusicResult.count();
          console.log("music count:", musicCount);

          // per-difficulty clear / full-combo / full-perfect counts
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
            if (r === "FULL_PERFECT") d.fullPerfects += n;
            else if (r === "FULL_COMBO") d.fullCombos += n;
            else if (r === "CLEAR") d.clears += n;
          }
          const difficulties = Object.entries(diffMap).map(
            ([difficulty, v]) => ({ difficulty, ...v }),
          );

          // merge character rank + challenge level + favorite tier by characterId
          const stageByChar = new Map(
            stages.map((s) => [s.characterId, s.challengeLevel]),
          );
          const characters = userChars.map((uc) => ({
            characterId: uc.characterId,
            name:
              (uc.character.givenName ?? "") +
              (uc.character.firstName ? " " + uc.character.firstName : ""),
            characterRank: uc.characterRank,
            challengeLevel: stageByChar.get(uc.characterId) ?? null,
            favoriteTier: uc.favoriteTier ?? null,
            unit: uc.character.unit,
          }));

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
