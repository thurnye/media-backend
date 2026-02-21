// src/models/platformPost.model.ts

import mongoose, { Schema } from 'mongoose';
import { IPlatformPost } from '../interfaces/platform.interface';
import {
  ContentType,
  PlatformType,
  PrivacyLevel,
  PublishingStatus,
} from '../config/enums/platform.enums';

const PlatformPostSchema = new Schema<IPlatformPost>(
  {
    postId: { type: String, required: true, index: true },

    platform: {
      type: String,
      enum: PlatformType,
      required: true,
      index: true,
    },

    accountId: { type: String, required: true, index: true },

    content: {
      caption: { type: String, required: true },
      hashtags: [String],
      firstComment: String,
      media: [
        {
          type: {
            type: String,
            enum: ContentType,
          },
          url: String,
          altText: String,
          thumbnailUrl: String,
        },
      ],
    },

    publishing: {
      status: {
        type: String,
        enum: PublishingStatus,
        default: PublishingStatus.DRAFT,
        index: true,
      },
      scheduledAt: { type: Date, index: true },
      publishedAt: Date,
      timezone: String,
      platformPostId: String,
    },

    deliveryTracking: {
      attempts: { type: Number, default: 0 },
      lastAttemptAt: Date,
      success: { type: Boolean, default: false },
      failureReason: String,
      nextRetryAt: Date,
    },

    analytics: {
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      impressions: { type: Number, default: 0 },
      reach: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      engagementRate: { type: Number, default: 0 },
    },

    platformSpecific: {
      isReel: Boolean,
      isCarousel: Boolean,
      threadLength: Number,
      privacyLevel: {
        type: String,
        enum: PrivacyLevel,
      },
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Critical indexes for job workers
PlatformPostSchema.index({
  'publishing.status': 1,
  'publishing.scheduledAt': 1,
});
PlatformPostSchema.index({ postId: 1, platform: 1 });

export default mongoose.model('PlatformPost', PlatformPostSchema);
