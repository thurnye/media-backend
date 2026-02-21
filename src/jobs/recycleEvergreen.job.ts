import postRepository from '../repositories/post.repository';
import platformPostRepository from '../repositories/platformPost.repository';
import { PublishingStatus } from '../config/enums/platform.enums';
import { ICreatePlatformPostData } from '../interfaces/platform.interface';
import { logger } from '../config/logger';

/**
 * Finds evergreen posts whose nextRecycleAt has arrived and repostCount < maxRepeats.
 * For each, clones the most recent PlatformPosts with a new scheduled time,
 * increments repostCount, and sets the next recycle date.
 */
export async function runRecycleEvergreenJob(): Promise<void> {
  const now = new Date();
  const readyPosts = await postRepository.findEvergreenReady(now);

  if (readyPosts.length === 0) return;

  logger.info({ count: readyPosts.length }, 'Recycling evergreen posts');

  for (const post of readyPosts) {
    try {
      // Find existing platform posts to clone
      const existingPlatformPosts = await platformPostRepository.findByPostId(post._id!);

      if (existingPlatformPosts.length === 0) {
        logger.warn({ postId: post._id }, 'Evergreen post has no platform posts to clone');
        continue;
      }

      // Schedule clones for now (they'll be picked up by the publishScheduled job)
      const scheduledAt = new Date();

      for (const pp of existingPlatformPosts) {
        const cloneData: ICreatePlatformPostData = {
          postId:    post._id!,
          platform:  pp.platform,
          accountId: pp.accountId,
          content:   { ...pp.content },
          publishing: {
            status:      PublishingStatus.SCHEDULED,
            scheduledAt,
            timezone:    pp.publishing.timezone,
          },
          isActive: true,
        };
        await platformPostRepository.create(cloneData);
      }

      // Increment repost count and set next recycle date
      const intervalDays = post.recycleSettings?.intervalDays ?? 7;
      const nextRecycleAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

      await postRepository.update(post._id!, {
        repostCount: (post.repostCount ?? 0) + 1,
        recycleSettings: {
          ...post.recycleSettings!,
          nextRecycleAt,
        },
      } as any);

      logger.info(
        { postId: post._id, repostCount: (post.repostCount ?? 0) + 1, nextRecycleAt },
        'Evergreen post recycled',
      );
    } catch (err) {
      logger.error({ postId: post._id, err }, 'Failed to recycle evergreen post');
    }
  }
}
