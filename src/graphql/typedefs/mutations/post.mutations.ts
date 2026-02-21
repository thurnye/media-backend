import { gql } from 'graphql-tag';

export const postMutations = gql`
  extend type Mutation {
    createPost(
      workspaceId: ID!
      title:       String!
      description: String
      category:    String
      tags:        [String]
      priority:    String
      isEvergreen: Boolean
    ): Post

    updatePost(
      id:          ID!
      title:       String
      description: String
      category:    String
      tags:        [String]
      priority:    String
      status:      String
      isEvergreen: Boolean
    ): Post

    deletePost(id: ID!): Post
  }
`;
