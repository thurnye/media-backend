import tokenRefreshService from '../services/tokenRefresh.service';
import { logger } from '../config/logger';

/**
 * Refreshes platform account tokens that will expire within the next hour.
 */
export async function runRefreshTokensJob(): Promise<void> {
  try {
    const count = await tokenRefreshService.refreshExpiringTokens();
    if (count > 0) {
      logger.info({ count }, 'Refreshed expiring tokens');
    }
  } catch (err) {
    logger.error({ err }, 'Token refresh job failed');
  }
}
