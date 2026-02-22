import { gql } from 'graphql-tag';

export const postQueries = gql`
  extend type Query {
    posts(workspaceId: ID!, page: Int, limit: Int): PaginatedPosts
    post(id: ID!): Post
    postReviewComments(postId: ID!): [PostReviewComment]
  }
`;
