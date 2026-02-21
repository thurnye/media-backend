import PlatformPost from '../models/platform.model';
import { IPlatformPost, ICreatePlatformPostData, IUpdatePlatformPostData } from '../interfaces/platform.interface';

const platformPostRepository = {
  findById: (id: string): Promise<IPlatformPost | null> =>
    PlatformPost.findOne({ _id: id, isActive: true }),

  findByPostId: (postId: string): Promise<IPlatformPost[]> =>
    PlatformPost.find({ postId, isActive: true }),

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

  softDelete: (id: string): Promise<IPlatformPost | null> =>
    PlatformPost.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true },
    ),
};

export default platformPostRepository;
