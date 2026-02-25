import { IPlatformAccount } from '../../interfaces/platformAccount.interface';
import { IPostContent } from '../../interfaces/platform.interface';
import { IPublisher, PublishResult } from './publisher.interface';
import { logger } from '../../config/logger';
import { buildMockPlatformPostId, randomDelay } from './publisher.utils';

const twitterPublisher: IPublisher = {
  async publish(account: IPlatformAccount, content: IPostContent): Promise<PublishResult> {
    logger.info(
      {
        provider: 'twitter',
        accountId: account.accountId,
        hasFirstComment: !!content.firstComment,
      },
      'Publishing via Twitter/X publisher',
    );

    await randomDelay();

    return {
      success: true,
      platformPostId: buildMockPlatformPostId('twitter_post'),
    };
  },
};

export default twitterPublisher;

