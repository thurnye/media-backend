// src/models/post.model.ts

import mongoose, { Schema } from 'mongoose';
import {
  PostCategory,
  PostStatus,
  PriorityLevel,
} from '../config/enums/post.enums';
import { IPost } from '../interfaces/post.interface';

const PostSchema = new Schema<IPost>(
  {
    workspaceId: { type: String, required: true, index: true },
    createdBy: { type: String, required: true },

    title: { type: String, required: true },
    description: { type: String },

    category: {
      type: String,
      enum: PostCategory,
    },
    tags: [{ type: String }],

    status: {
      type: String,
      enum: PostStatus,
      default: PostStatus.DRAFT,
      index: true,
    },
    mediaIds: {
      type: [String],
      default: [],
    },

    priority: {
      type: String,
      enum: PriorityLevel,
      default: PriorityLevel.MEDIUM,
    },

    isEvergreen: { type: Boolean, default: false },

    recycleSettings: {
      enabled: Boolean,
      intervalDays: Number,
      maxRepeats: Number,
      nextRecycleAt: Date,
    },

    aiMetadata: {
      sentimentScore: Number,
      predictedEngagementScore: Number,
      suggestedBestTime: Date,
      suggestedHashtags: [String],
    },

    approvalWorkflow: {
      requiredApprovers: [String],
      approvedBy: [String],
      rejectedBy: [String],
      comments: [
        {
          userId: String,
          message: String,
          createdAt: Date,
        },
      ],
    },

    repostCount: { type: Number, default: 0 },
    platformPostIds: [{ type: String, index: true }],

    isActive: {
      type: Boolean,
      default: true,
    },

    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Compound indexes for dashboard queries
PostSchema.index({ workspaceId: 1, status: 1 });
PostSchema.index({ workspaceId: 1, createdAt: -1 });

export default mongoose.model('Post', PostSchema);
