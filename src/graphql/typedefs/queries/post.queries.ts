import { gql } from 'graphql-tag';

export const postQueries = gql`
  extend type Query {
    posts(
      workspaceId: ID!
      page: Int
      limit: Int
      search: String
      status: String
      category: String
      priority: String
      platform: String
      isEvergreen: Boolean
      sortBy: String
      createdBy: String
    ): PaginatedPosts
    post(id: ID!): Post
    postReviewComments(postId: ID!): [PostReviewComment]
  }
`;
