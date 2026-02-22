import { gql } from 'graphql-tag';

export const postMutations = gql`
  extend type Mutation {
    createPost(
      workspaceId: ID!
      title:       String!
      description: String
      mediaIds:    [ID]
      category:    String
      tags:        [String]
      priority:    String
      isEvergreen: Boolean
    ): Post

    updatePost(
      id:          ID!
      title:       String
      description: String
      mediaIds:    [ID]
      category:    String
      tags:        [String]
      priority:    String
      status:      String
      isEvergreen: Boolean
      requiredApprovers: [ID]
    ): Post

    deletePost(id: ID!): Post

    submitForApproval(postId: ID!): Post
    approvePost(postId: ID!): Post
    rejectPost(postId: ID!, reason: String!): Post

    updateRecycleSettings(
      postId:       ID!
      enabled:      Boolean!
      intervalDays: Int!
      maxRepeats:   Int!
    ): Post

    addPostReviewComment(
      postId:          ID!
      message:         String!
      mediaIds:        [ID]
      parentCommentId: ID
    ): PostReviewComment
  }
`;
