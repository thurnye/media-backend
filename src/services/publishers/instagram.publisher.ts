import { IPlatformAccount } from '../../interfaces/platformAccount.interface';
import { IPostContent } from '../../interfaces/platform.interface';
import { IPublisher, PublishResult } from './publisher.interface';
import { logger } from '../../config/logger';
import { buildMockPlatformPostId, randomDelay } from './publisher.utils';

const instagramPublisher: IPublisher = {
  async publish(account: IPlatformAccount, content: IPostContent): Promise<PublishResult> {
    logger.info(
      {
        provider: 'instagram',
        accountId: account.accountId,
        mediaCount: content.media?.length ?? 0,
      },
      'Publishing via Instagram publisher',
    );

    await randomDelay();

    return {
      success: true,
      platformPostId: buildMockPlatformPostId('instagram_post'),
    };
  },
};

export default instagramPublisher;

