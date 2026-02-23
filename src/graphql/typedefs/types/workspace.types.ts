import { gql } from 'graphql-tag';

export const workspaceTypes = gql`
  type WorkspaceMember {
    userId: ID
    role: String
    joinedAt: String
    firstName: String
    lastName: String
    avatarUrl: String
  }

  type WorkspaceSettings {
    approvalRequired: Boolean
    evergreenEnabled: Boolean
    autoPublishEnabled: Boolean
  }

  input WorkspaceSettingsInput {
    approvalRequired: Boolean
    evergreenEnabled: Boolean
    autoPublishEnabled: Boolean
  }

  type WorkspaceInvitation {
    id: ID
    workspaceId: ID
    email: String
    role: String
    status: String
    expiresAt: String
    createdAt: String
  }

  type MemberSuggestion {
    userId: ID
    email: String
    firstName: String
    lastName: String
    avatarUrl: String
  }

  type Workspace {
    id: ID
    name: String
    slug: String
    description: String
    ownerId: ID
    postCount: Int
    members: [WorkspaceMember]
    settings: WorkspaceSettings
    plan: String
    defaultTimezone: String
    isActive: Boolean
    createdAt: String
    updatedAt: String
  }
`;
