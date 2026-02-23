import { gql } from 'graphql-tag';

export const platformQueries = gql`
  extend type Query {
    platformAccounts(workspaceId: ID!): [PlatformAccount]
    platformAccount(id: ID!): PlatformAccount
    myPlatformAccounts: [PlatformAccount]
    platformPosts(postId: ID!): [PlatformPost]
    workspacePlatformPosts(workspaceId: ID!): [PlatformPost]
    workspacePlatformPostsByDay(workspaceId: ID!, date: String!): [PlatformPost]
    workspacePlatformPostsByMonth(workspaceId: ID!, month: String!): [PlatformPost]
    platformPost(id: ID!): PlatformPost
  }
`;
