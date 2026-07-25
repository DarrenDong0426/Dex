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
            type Query {
                profile: Profile
                userCards: [UserCard!]!
            }
        `,
    resolvers: {
      Query: {
        profile: () => prisma.profile.findFirst(),
        userCards: () =>
          prisma.userCard.findMany({
            include: { card: { include: { character: true } } },
          }),
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
