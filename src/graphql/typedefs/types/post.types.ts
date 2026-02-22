import { gql } from 'graphql-tag';

export const postTypes = gql`
  type PostUserSummary {
    id: ID
    firstName: String
    lastName: String
    email: String
    avatarUrl: String
  }

  type PostReviewComment {
    id: ID
    workspaceId: ID
    postId: ID
    authorId: ID
    author: PostUserSummary
    message: String
    mediaIds: [ID]
    mediaUrls: [String]
    parentCommentId: ID
    createdAt: String
    updatedAt: String
  }

  type ApprovalComment {
    userId: ID
    user: PostUserSummary
    message: String
    createdAt: String
  }

  type ApprovalWorkflow {
    requiredApprovers: [ID]
    requiredApproverUsers: [PostUserSummary]
    approvedBy: [ID]
    approvedByUsers: [PostUserSummary]
    rejectedBy: [ID]
    rejectedByUsers: [PostUserSummary]
    cancelledBy: [ID]
    cancelledByUsers: [PostUserSummary]
    archivedBy: [ID]
    archivedByUsers: [PostUserSummary]
    comments: [ApprovalComment]
  }

  type RecycleSettings {
    enabled: Boolean
    intervalDays: Int
    maxRepeats: Int
    nextRecycleAt: String
  }

  type Post {
    id: ID
    workspaceId: ID
    createdBy: ID
    createdByUser: PostUserSummary
    title: String
    description: String
    mediaIds: [ID]
    mediaUrls: [String]
    category: String
    tags: [String]
    status: String
    priority: String
    isEvergreen: Boolean
    recycleSettings: RecycleSettings
    repostCount: Int
    approvalWorkflow: ApprovalWorkflow
    platformPostIds: [ID]
    isActive: Boolean
    createdAt: String
    updatedAt: String
  }

  type PaginatedPosts {
    data: [Post]
    total: Int
    page: Int
    totalPages: Int
  }
`;
