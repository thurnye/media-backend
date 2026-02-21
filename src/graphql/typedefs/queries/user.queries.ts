import { gql } from 'graphql-tag';

export const userQueries = gql`
  extend type Query {
    getAllUsers(page: Int, limit: Int): PaginatedUsers
    user(id: ID!): User
    me: User
  }
`;
