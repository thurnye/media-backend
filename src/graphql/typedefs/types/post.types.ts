import { gql } from 'graphql-tag';

export const postTypes = gql`
  type ApprovalComment {
    userId: ID
    message: String
    createdAt: String
  }

  type ApprovalWorkflow {
    requiredApprovers: [ID]
    approvedBy: [ID]
    rejectedBy: [ID]
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
    title: String
    description: String
    mediaIds: [ID]
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
