import { gql } from 'graphql-tag';

export const userTypes = gql`
  type UserWorkspace {
    workspaceId: ID
    role:        String
    joinedAt:    String
    name:        String
  }

  type User {
    id:          ID
    firstName:   String
    lastName:    String
    email:       String
    avatarUrl:   String
    phoneNumber: String
    dateOfBirth: String
    workspaces:  [UserWorkspace]
    isActive:    Boolean
    isEmailVerified: Boolean
    createdAt:   String
    updatedAt:   String
  }

  type PaginatedUsers {
    data:       [User]
    total:      Int
    page:       Int
    totalPages: Int
  }

  type AuthPayload {
    user: User!
  }
`;
