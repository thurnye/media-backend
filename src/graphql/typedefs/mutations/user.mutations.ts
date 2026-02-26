import { gql } from 'graphql-tag';

export const userMutations = gql`
  extend type Mutation {
    createUser(
      firstName:   String!
      lastName:    String!
      email:       String!
      password:    String!
      dateOfBirth: String!
      avatarUrl:   String
      phoneNumber: String
    ): AuthPayload

    login(
      email:    String!
      password: String!
    ): AuthPayload

    updateUser(
      firstName:   String
      lastName:    String
      email:       String
      dateOfBirth: String
      avatarUrl:   String
      phoneNumber: String
    ): User

    deleteUser(id: ID!): User

    logout: Boolean

    verifyEmail(token: String!): Boolean!
    requestPasswordReset(email: String!): Boolean!
    resetPassword(token: String!, newPassword: String!): Boolean!
  }
`;
