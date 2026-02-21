// src/interfaces/platformPost.interface.ts

import {
    ContentType,
  PlatformType,
  PrivacyLevel,
  PublishingStatus,
} from '../config/enums/platform.enums';

export interface IMediaItem {
  type: ContentType;
  url: string;
  altText?: string;
  thumbnailUrl?: string;
}

export interface IPostContent {
  caption: string;
  hashtags?: string[];
  firstComment?: string;
  media: IMediaItem[];
}

export interface IPublishingInfo {
  status: PublishingStatus;
  scheduledAt?: Date;
  publishedAt?: Date;
  timezone?: string;
  platformPostId?: string;
}

export interface IDeliveryTracking {
  attempts: number;
  lastAttemptAt?: Date;
  success: boolean;
  failureReason?: string;
  nextRetryAt?: Date;
}

export interface IAnalytics {
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
  reach: number;
  clicks: number;
  engagementRate: number;
}

export interface IPlatformSpecificSettings {
  isReel?: boolean;
  isCarousel?: boolean;
  threadLength?: number;
  privacyLevel?: PrivacyLevel;
}


export interface IPlatformPost {
  _id?: string;
  postId: string;

  platform: PlatformType;
  accountId: string;

  content: IPostContent;

  publishing: IPublishingInfo;

  deliveryTracking: IDeliveryTracking;

  analytics: IAnalytics;

  platformSpecific?: IPlatformSpecificSettings;

  isActive: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreatePlatformPostData extends Omit<
  IPlatformPost,
  '_id' | 'analytics' | 'deliveryTracking' | 'createdAt' | 'updatedAt'
> {}

export interface IUpdatePlatformPostData extends Partial<ICreatePlatformPostData> {}
