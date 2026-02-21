import crypto from 'crypto';

const STATE_SECRET = process.env.OAUTH_STATE_SECRET || 'dev-oauth-state-secret';
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:9000';

export interface OAuthTokenResult {
  accessToken: string;
  refreshToken: string;
  accountId: string;
  displayName: string;
  profilePictureUrl?: string;
  expiresIn: number; // seconds
}

const oauthService = {
  /** Generate a signed state token containing workspaceId + platform. */
  generateState(workspaceId: string, platform: string, userId: string): string {
    const payload = JSON.stringify({ workspaceId, platform, userId, ts: Date.now() });
    const hmac = crypto.createHmac('sha256', STATE_SECRET).update(payload).digest('hex');
    const encoded = Buffer.from(payload).toString('base64url');
    return `${encoded}.${hmac}`;
  },

  /** Verify and decode the state token. Returns null if invalid. */
  verifyState(state: string): { workspaceId: string; platform: string; userId: string } | null {
    const [encoded, hmac] = state.split('.');
    if (!encoded || !hmac) return null;

    const payload = Buffer.from(encoded, 'base64url').toString('utf8');
    const expectedHmac = crypto.createHmac('sha256', STATE_SECRET).update(payload).digest('hex');
    if (hmac !== expectedHmac) return null;

    try {
      const parsed = JSON.parse(payload);
      // Expire after 10 minutes
      if (Date.now() - parsed.ts > 10 * 60 * 1000) return null;
      return { workspaceId: parsed.workspaceId, platform: parsed.platform, userId: parsed.userId };
    } catch {
      return null;
    }
  },

  /** Get the authorization URL (mock: redirects to our own mock-authorize page). */
  getAuthUrl(platform: string, state: string): string {
    return `${SERVER_URL}/oauth/mock-authorize?platform=${platform}&state=${encodeURIComponent(state)}`;
  },

  /** Exchange an authorization code for tokens (mock: generates fake tokens). */
  exchangeCode(platform: string, _code: string): OAuthTokenResult {
    const id = crypto.randomBytes(8).toString('hex');
    return {
      accessToken: `mock_${platform}_access_${crypto.randomBytes(16).toString('hex')}`,
      refreshToken: `mock_${platform}_refresh_${crypto.randomBytes(16).toString('hex')}`,
      accountId: `${platform}_${id}`,
      displayName: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Account`,
      expiresIn: 3600, // 1 hour
    };
  },
};

export default oauthService;
