export interface IPostReviewComment {
  _id?: string;

  workspaceId: string;
  postId: string;

  authorId: string;

  message: string;

  mediaIds?: string[];

  parentCommentId?: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}
