import PlatformPost from '../models/platform.model';
import Post from '../models/post.model';
import { IPlatformPost, ICreatePlatformPostData, IUpdatePlatformPostData } from '../interfaces/platform.interface';

const platformPostRepository = {
  findById: (id: string): Promise<IPlatformPost | null> =>
    PlatformPost.findOne({ _id: id, isActive: true }),

  findByPostId: (postId: string): Promise<IPlatformPost[]> =>
    PlatformPost.find({ postId, isActive: true }),

  findByWorkspaceId: async (workspaceId: string): Promise<IPlatformPost[]> => {
    const postIds = await Post.distinct('_id', {
      workspaceId,
      deletedAt: null,
      isActive: true,
    });

    const normalizedPostIds = postIds.map((id) => String(id));
    if (!normalizedPostIds.length) return [];

    return PlatformPost.find({
      postId: { $in: normalizedPostIds },
      isActive: true,
    });
  },

  findByWorkspaceIdForDay: async (
    workspaceId: string,
    dayStart: Date,
    dayEnd: Date,
  ): Promise<IPlatformPost[]> => {
    const postIds = await Post.distinct('_id', {
      workspaceId,
      deletedAt: null,
      isActive: true,
    });

    const normalizedPostIds = postIds.map((id) => String(id));
    if (!normalizedPostIds.length) return [];

    return PlatformPost.find({
      postId: { $in: normalizedPostIds },
      isActive: true,
      $or: [
        {
          'publishing.publishedAt': { $gte: dayStart, $lt: dayEnd },
        },
        {
          $and: [
            {
              $or: [
                { 'publishing.publishedAt': { $exists: false } },
                { 'publishing.publishedAt': null },
              ],
            },
            {
              'publishing.scheduledAt': { $gte: dayStart, $lt: dayEnd },
            },
          ],
        },
      ],
    });
  },

  create: (data: ICreatePlatformPostData): Promise<IPlatformPost> =>
    PlatformPost.create(data),

  update: (id: string, data: IUpdatePlatformPostData): Promise<IPlatformPost | null> =>
    PlatformPost.findByIdAndUpdate(id, { $set: data }, { new: true }),

  findScheduledReady: (before: Date): Promise<IPlatformPost[]> =>
    PlatformPost.find({
      isActive: true,
      'publishing.status': 'scheduled',
      'publishing.scheduledAt': { $lte: before },
    }),

  findScheduledForReminder: (from: Date, to: Date): Promise<IPlatformPost[]> =>
    PlatformPost.find({
      isActive: true,
      'publishing.status': 'scheduled',
      'publishing.scheduledAt': { $gt: from, $lte: to },
      $or: [
        { 'publishing.reminderSentAt': { $exists: false } },
        { 'publishing.reminderSentAt': null },
      ],
    }),

  softDelete: (id: string): Promise<IPlatformPost | null> =>
    PlatformPost.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true },
    ),
};

export default platformPostRepository;
