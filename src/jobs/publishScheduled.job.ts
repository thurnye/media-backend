import platformPostRepository from '../repositories/platformPost.repository';
import platformPostService from '../services/platformPost.service';
import { logger } from '../config/logger';

/**
 * Finds all PlatformPosts with status "scheduled" whose scheduledAt <= now,
 * then publishes each one via the mock publisher.
 */
export async function runPublishScheduledJob(): Promise<void> {
  const now = new Date();
  const reminderCutoff = new Date(now.getTime() + 30 * 60 * 1000);

  const reminderCandidates = await platformPostRepository.findScheduledForReminder(now, reminderCutoff);
  if (reminderCandidates.length) {
    logger.info({ count: reminderCandidates.length }, 'Processing scheduled publish reminders');
    for (const pp of reminderCandidates) {
      try {
        await platformPostService.processScheduledReminder(pp._id!);
      } catch (err) {
        logger.error({ platformPostId: pp._id, err }, 'Failed to send scheduled publish reminder');
      }
    }
  }

  const ready = await platformPostRepository.findScheduledReady(now);

  if (ready.length === 0) return;

  logger.info({ count: ready.length }, 'Processing due scheduled platform posts');

  for (const pp of ready) {
    try {
      const result = await platformPostService.processDueScheduledPost(pp._id!);
      logger.info({ platformPostId: pp._id, result }, 'Processed due scheduled post');
    } catch (err) {
      logger.error({ platformPostId: pp._id, err }, 'Failed to process due scheduled post');
    }
  }
}
