import crypto from 'crypto';
import { IPlatformAccount } from '../../interfaces/platformAccount.interface';
import { IPostContent } from '../../interfaces/platform.interface';
import { IPublisher, PublishResult } from './publisher.interface';
import { logger } from '../../config/logger';

/** Simulate a 1–3 second API call delay. */
function randomDelay(): Promise<void> {
  const ms = 1000 + Math.random() * 2000;
  return new Promise(resolve => setTimeout(resolve, ms));
}

const mockPublisher: IPublisher = {
  async publish(account: IPlatformAccount, content: IPostContent): Promise<PublishResult> {
    logger.info(
      { platform: account.platform, accountId: account.accountId, caption: content.caption?.slice(0, 50) },
      'Mock publishing post...',
    );

    await randomDelay();

    // 90% success rate
    const success = Math.random() < 0.9;

    if (success) {
      const platformPostId = `${account.platform}_post_${crypto.randomBytes(8).toString('hex')}`;
      logger.info({ platform: account.platform, platformPostId }, 'Mock publish succeeded');
      return { success: true, platformPostId };
    }

    const error = 'Mock publish error: simulated API failure';
    logger.warn({ platform: account.platform }, error);
    return { success: false, error };
  },
};

export default mockPublisher;
