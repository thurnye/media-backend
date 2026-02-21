import { gql } from 'graphql-tag';

export const workspaceTypes = gql`
  type WorkspaceMember {
    userId: ID
    role: String
    joinedAt: String
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

  type Workspace {
    id: ID
    name: String
    slug: String
    description: String
    ownerId: ID
    members: [WorkspaceMember]
    settings: WorkspaceSettings
    plan: String
    defaultTimezone: String
    isActive: Boolean
    createdAt: String
    updatedAt: String
  }
`;
