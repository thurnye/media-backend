import cron from 'node-cron';
import { runPublishScheduledJob } from './publishScheduled.job';
import { runRefreshTokensJob } from './refreshTokens.job';
import { runRecycleEvergreenJob } from './recycleEvergreen.job';
import { logger } from '../config/logger';

/**
 * Initialise all background cron jobs.
 * Call once after DB connection is established.
 */
export function initScheduler(): void {
  // Every minute: publish platform posts whose scheduledAt has arrived
  cron.schedule('* * * * *', () => {
    runPublishScheduledJob().catch(err =>
      logger.error({ err }, 'publishScheduled cron error'),
    );
  });

  // Every 30 minutes: refresh tokens expiring within the next hour
  cron.schedule('*/30 * * * *', () => {
    runRefreshTokensJob().catch(err =>
      logger.error({ err }, 'refreshTokens cron error'),
    );
  });

  // Every 6 hours: recycle evergreen posts that are due for reposting
  cron.schedule('0 */6 * * *', () => {
    runRecycleEvergreenJob().catch(err =>
      logger.error({ err }, 'recycleEvergreen cron error'),
    );
  });

  logger.info('Background job scheduler initialised');
}
