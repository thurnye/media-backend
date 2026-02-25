import { IPlatformAccount } from '../../interfaces/platformAccount.interface';
import { IPostContent } from '../../interfaces/platform.interface';
import { IPublisher, PublishResult } from './publisher.interface';
import { logger } from '../../config/logger';
import { buildMockPlatformPostId, randomDelay } from './publisher.utils';

const youtubePublisher: IPublisher = {
  async publish(account: IPlatformAccount, content: IPostContent): Promise<PublishResult> {
    logger.info(
      {
        provider: 'youtube',
        accountId: account.accountId,
        mediaCount: content.media?.length ?? 0,
      },
      'Publishing via YouTube publisher',
    );

    await randomDelay();

    return {
      success: true,
      platformPostId: buildMockPlatformPostId('youtube_post'),
    };
  },
};

export default youtubePublisher;

