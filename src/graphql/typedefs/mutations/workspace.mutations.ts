import { gql } from 'graphql-tag';

export const workspaceMutations = gql`
  extend type Mutation {
    createWorkspace(
      name:            String!
      slug:            String!
      description:     String
      defaultTimezone: String
      plan:            String
      settings:        WorkspaceSettingsInput
    ): Workspace

    updateWorkspace(
      id:              ID!
      name:            String
      slug:            String
      description:     String
      defaultTimezone: String
      plan:            String
      settings:        WorkspaceSettingsInput
    ): Workspace

    deleteWorkspace(id: ID!): Workspace

    addWorkspaceMember(
      workspaceId: ID!
      userId:      String!
      role:        String!
    ): Workspace

    removeWorkspaceMember(
      workspaceId: ID!
      userId:      String!
    ): Workspace

    updateMemberRole(
      workspaceId: ID!
      userId:      String!
      role:        String!
    ): Workspace

    inviteToWorkspace(
      workspaceId: ID!
      email:       String!
      role:        String!
    ): WorkspaceInvitation

    acceptInvitation(token: String!): Workspace

    revokeInvitation(
      workspaceId: ID!
      email:       String!
    ): Boolean
  }
`;
