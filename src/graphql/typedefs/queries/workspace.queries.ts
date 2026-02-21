import { gql } from 'graphql-tag';

export const workspaceQueries = gql`
  extend type Query {
    workspaces: [Workspace]
    workspace(id: ID!): Workspace
    suggestMembers(workspaceId: ID!, query: String!): [MemberSuggestion]
    workspaceInvitations(workspaceId: ID!): [WorkspaceInvitation]
  }
`;
