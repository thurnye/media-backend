import platformPostRepository from '../repositories/platformPost.repository';
import platformPostService from '../services/platformPost.service';
import { logger } from '../config/logger';

/**
 * Finds all PlatformPosts with status "scheduled" whose scheduledAt <= now,
 * then publishes each one via the mock publisher.
 */
export async function runPublishScheduledJob(): Promise<void> {
  const now = new Date();
  const ready = await platformPostRepository.findScheduledReady(now);

  if (ready.length === 0) return;

  logger.info({ count: ready.length }, 'Publishing scheduled posts');

  for (const pp of ready) {
    try {
      await platformPostService.publishNow(pp._id!);
      logger.info({ platformPostId: pp._id }, 'Scheduled post published');
    } catch (err) {
      logger.error({ platformPostId: pp._id, err }, 'Failed to publish scheduled post');
    }
  }
}
