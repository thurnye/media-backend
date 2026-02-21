import { gql } from 'graphql-tag';

export const platformTypes = gql`
  type PlatformAccount {
    id: ID
    userId: ID
    workspaceIds: [ID]
    platform: String
    accountId: String
    displayName: String
    profilePictureUrl: String
    status: String
    lastSyncAt: String
    createdAt: String
    updatedAt: String
  }

  type PostContent {
    caption: String
    hashtags: [String]
    firstComment: String
  }

  type PublishingInfo {
    status: String
    scheduledAt: String
    publishedAt: String
    timezone: String
    platformPostId: String
  }

  type PlatformPost {
    id: ID
    postId: ID
    platform: String
    accountId: String
    content: PostContent
    publishing: PublishingInfo
    isActive: Boolean
    createdAt: String
    updatedAt: String
  }
`;
