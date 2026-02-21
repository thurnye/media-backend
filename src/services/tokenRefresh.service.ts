import crypto from 'crypto';
import platformAccountRepository from '../repositories/platformAccount.repository';
import { encrypt } from '../utils/crypto';
import { logger } from '../config/logger';

const tokenRefreshService = {
  /**
   * Refresh tokens for a platform account (mock implementation).
   * Generates new mock tokens and updates the account.
   */
  async refreshTokens(accountId: string): Promise<void> {
    const account = await platformAccountRepository.findById(accountId);
    if (!account) return;

    // Mock: generate new tokens
    const newAccessToken = `mock_${account.platform}_access_${crypto.randomBytes(16).toString('hex')}`;
    const newRefreshToken = `mock_${account.platform}_refresh_${crypto.randomBytes(16).toString('hex')}`;
    const tokenExpiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour from now

    await platformAccountRepository.update(accountId, {
      accessToken: encrypt(newAccessToken),
      refreshToken: encrypt(newRefreshToken),
      tokenExpiresAt,
    });

    logger.info({ accountId, platform: account.platform }, 'Token refreshed successfully');
  },

  /**
   * Find all accounts with tokens expiring within the given threshold (ms)
   * and refresh them.
   */
  async refreshExpiringTokens(thresholdMs: number = 60 * 60 * 1000): Promise<number> {
    const cutoff = new Date(Date.now() + thresholdMs);
    const accounts = await platformAccountRepository.findExpiringTokens(cutoff);

    let refreshed = 0;
    for (const account of accounts) {
      try {
        await this.refreshTokens(account._id!);
        refreshed++;
      } catch (err) {
        logger.error({ accountId: account._id, err }, 'Failed to refresh token');
      }
    }

    return refreshed;
  },
};

export default tokenRefreshService;
