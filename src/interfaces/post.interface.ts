import { PostCategory, PostStatus, PriorityLevel } from '../config/enums/post.enums';

export interface IRecycleSettings {
  enabled: boolean;
  intervalDays: number;
  maxRepeats: number;
  nextRecycleAt?: Date;
}

export interface IAIMetadata {
  sentimentScore?: number;
  predictedEngagementScore?: number;
  suggestedBestTime?: Date;
  suggestedHashtags?: string[];
}

export interface IApprovalComment {
  userId: string;
  message: string;
  createdAt: Date;
}

export interface IApprovalWorkflow {
  requiredApprovers: string[];
  approvedBy: string[];
  rejectedBy: string[];
  comments: IApprovalComment[];
}



export interface IPost {
  _id?: string;
  workspaceId: string;
  createdBy: string;

  title: string;
  description?: string;

  category?: PostCategory;
  tags: string[];

  status: PostStatus;
  priority: PriorityLevel;

  isEvergreen: boolean;
  recycleSettings?: IRecycleSettings;

  aiMetadata?: IAIMetadata;

  approvalWorkflow?: IApprovalWorkflow;

  repostCount: number;
  platformPostIds: string[];

  isActive: boolean;

  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface ICreatePostData extends Omit<
  IPost,
  '_id' | 'status' | 'platformPostIds' | 'createdAt' | 'updatedAt' | 'deletedAt'
> {}

export interface IUpdatePostData extends Partial<ICreatePostData> {
  status?: PostStatus;
}
