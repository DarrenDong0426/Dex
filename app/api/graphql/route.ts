import { createSchema, createYoga } from "graphql-yoga";
import { prisma } from "@/lib/prisma";

const { handleRequest } = createYoga({
  schema: createSchema({
    typeDefs: `
            type Profile {
                id: Int!
                name: String!
                level: Int! 
            }
            type Query {
                profile: Profile
            }
        `,
    resolvers: {
      Query: {
        profile: () => prisma.profile.findFirst(),
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
