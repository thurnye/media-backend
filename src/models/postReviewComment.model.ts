import mongoose, { Schema } from 'mongoose';
import { IPostReviewComment } from '../interfaces/postReviewComment.interface';

const PostReviewCommentSchema = new Schema<IPostReviewComment>(
  {
    workspaceId: {
      type: String,
      required: true,
      index: true,
    },

    postId: {
      type: String,
      required: true,
      index: true,
    },

    authorId: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    mediaIds: {
      type: [String],
      default: [],
    },

    parentCommentId: {
      type: String,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
PostReviewCommentSchema.index({ postId: 1, createdAt: 1 });
PostReviewCommentSchema.index({ parentCommentId: 1 });

export default mongoose.model('PostReviewComment', PostReviewCommentSchema);
