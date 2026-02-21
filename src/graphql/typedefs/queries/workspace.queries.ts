import { gql } from 'graphql-tag';

export const workspaceQueries = gql`
  extend type Query {
    workspaces: [Workspace]
    workspace(id: ID!): Workspace
  }
`;
