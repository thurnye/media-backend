import { IPlatformAccount } from '../../interfaces/platformAccount.interface';
import { IPostContent } from '../../interfaces/platform.interface';
import { IPublisher, PublishResult } from './publisher.interface';
import { logger } from '../../config/logger';
import { buildMockPlatformPostId, randomDelay } from './publisher.utils';

const facebookPublisher: IPublisher = {
  async publish(account: IPlatformAccount, content: IPostContent): Promise<PublishResult> {
    logger.info(
      {
        provider: 'facebook',
        accountId: account.accountId,
        hasMedia: !!content.media?.length,
      },
      'Publishing via Facebook publisher',
    );

    await randomDelay();

    return {
      success: true,
      platformPostId: buildMockPlatformPostId('facebook_post'),
    };
  },
};

export default facebookPublisher;

