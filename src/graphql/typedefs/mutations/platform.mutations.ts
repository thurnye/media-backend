import { gql } from 'graphql-tag';

export const platformMutations = gql`
  extend type Mutation {
    connectPlatformAccount(
      workspaceId:       ID!
      platform:          String!
      accountId:         String!
      displayName:       String!
      accessToken:       String!
      refreshToken:      String
      profilePictureUrl: String
    ): PlatformAccount

    updatePlatformAccount(
      id:                ID!
      displayName:       String
      accessToken:       String
      refreshToken:      String
      profilePictureUrl: String
      status:            String
    ): PlatformAccount

    linkPlatformAccount(
      accountId:   ID!
      workspaceId: ID!
    ): PlatformAccount

    unlinkPlatformAccount(
      accountId:   ID!
      workspaceId: ID!
    ): PlatformAccount

    disconnectPlatformAccount(id: ID!): PlatformAccount

    createPlatformPost(
      postId:       ID!
      platform:     String!
      accountId:    String!
      caption:      String!
      hashtags:     [String]
      firstComment: String
      media:        [PlatformMediaInput!]
      status:       String
      scheduledAt:  String
      timezone:     String
    ): PlatformPost

    updatePlatformPost(
      id:          ID!
      caption:     String
      hashtags:    [String]
      media:       [PlatformMediaInput!]
      scheduledAt: String
      status:      String
    ): PlatformPost

    deletePlatformPost(id: ID!): PlatformPost

    createPlatformPostsBatch(
      postId:      ID!
      entries:     [PlatformPostEntryInput!]!
      scheduledAt: String
      timezone:    String
    ): [PlatformPost]
  }

  input PlatformPostEntryInput {
    platform:     String!
    accountId:    String!
    caption:      String!
    hashtags:     [String]
    firstComment: String
    media:        [PlatformMediaInput!]
  }

  input PlatformMediaInput {
    type:     String!
    url:      String!
    altText:  String
    thumbnailUrl: String
  }
`;
