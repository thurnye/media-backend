import { gql } from 'graphql-tag';

export const postTypes = gql`
  type Post {
    id: ID
    workspaceId: ID
    createdBy: ID
    title: String
    description: String
    category: String
    tags: [String]
    status: String
    priority: String
    isEvergreen: Boolean
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
