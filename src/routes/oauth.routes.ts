import { Router, Request, Response } from 'express';
import oauthService from '../services/oauth.service';
import platformAccountService from '../services/platformAccount.service';
import authService from '../services/auth.service';

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:4200';
const VALID_PLATFORMS = ['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube'];

const router = Router();

/**
 * GET /oauth/:platform/connect?workspaceId=X
 * Initiates the OAuth flow by redirecting to the mock authorization page.
 * The JWT cookie is used to identify the user.
 */
router.get('/:platform/connect', async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;
    const { workspaceId } = req.query;

    if (!VALID_PLATFORMS.includes(platform)) {
      return res.status(400).send('Invalid platform');
    }
    if (!workspaceId || typeof workspaceId !== 'string') {
      return res.status(400).send('workspaceId is required');
    }

    // Extract userId from JWT cookie
    const token = req.cookies?.token;
    if (!token) return res.status(401).send('Authentication required');

    const userId = authService.verifyToken(token);
    if (!userId) return res.status(401).send('Invalid token');

    const state = oauthService.generateState(workspaceId, platform, userId);
    const authUrl = oauthService.getAuthUrl(platform, state);

    return res.redirect(authUrl);
  } catch (err) {
    return res.status(500).send('OAuth initiation failed');
  }
});

/**
 * GET /oauth/mock-authorize
 * Mock authorization page that simulates a platform's OAuth consent screen.
 */
router.get('/mock-authorize', (req: Request, res: Response) => {
  const { platform, state } = req.query;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Authorize ${platform}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
        .card { background: #fff; border-radius: 16px; padding: 2.5rem; max-width: 400px; width: 90%; box-shadow: 0 4px 24px rgba(0,0,0,0.1); text-align: center; }
        h1 { font-size: 1.4rem; margin: 0 0 0.5rem; color: #111; }
        p { color: #666; font-size: 0.9rem; margin: 0 0 1.5rem; }
        .btn { display: inline-block; padding: 0.75rem 2rem; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; border: none; text-decoration: none; }
        .btn-auth { background: #6366f1; color: #fff; margin-right: 0.5rem; }
        .btn-auth:hover { background: #4f46e5; }
        .btn-cancel { background: #f3f4f6; color: #495057; }
        .btn-cancel:hover { background: #e5e7eb; }
        .platform { display: inline-block; padding: 0.25rem 0.75rem; background: #eff6ff; color: #3b82f6; border-radius: 999px; font-size: 0.8rem; font-weight: 600; text-transform: capitalize; margin-bottom: 1rem; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="platform">${platform}</div>
        <h1>Authorize Application</h1>
        <p>This app wants to access your ${platform} account to manage posts on your behalf.</p>
        <a class="btn btn-auth" href="/oauth/${platform}/callback?code=mock_code_${Date.now()}&state=${encodeURIComponent(state as string)}">Authorize</a>
        <a class="btn btn-cancel" href="${CLIENT_URL}/dashboard">Cancel</a>
      </div>
    </body>
    </html>
  `;

  res.send(html);
});

/**
 * GET /oauth/:platform/callback?code=X&state=X
 * Handles the OAuth callback.
 * If user already owns this social account, links it to the workspace.
 * Otherwise creates a new account under the user and links to the workspace.
 */
router.get('/:platform/callback', async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).send('Missing code or state');
    }

    const decoded = oauthService.verifyState(state as string);
    if (!decoded) {
      return res.status(400).send('Invalid or expired state token');
    }

    if (decoded.platform !== platform) {
      return res.status(400).send('Platform mismatch');
    }

    // Exchange code for tokens
    const tokens = oauthService.exchangeCode(platform, code as string);

    // connectPlatformAccount handles "already owned → just link" internally
    await platformAccountService.connectPlatformAccount(
      {
        userId: decoded.userId,
        workspaceIds: [decoded.workspaceId],
        platform: platform as any,
        accountId: tokens.accountId,
        displayName: tokens.displayName,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        profilePictureUrl: tokens.profilePictureUrl,
        tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
      },
      decoded.userId,
    );

    // Redirect back to workspace settings
    return res.redirect(`${CLIENT_URL}/dashboard/workspace/${decoded.workspaceId}/settings?oauth=success&platform=${platform}`);
  } catch (err: any) {
    const message = err?.message || 'OAuth callback failed';
    const decoded = oauthService.verifyState(req.query.state as string);
    const redirectBase = decoded
      ? `${CLIENT_URL}/dashboard/workspace/${decoded.workspaceId}/settings`
      : `${CLIENT_URL}/dashboard`;

    return res.redirect(`${redirectBase}?oauth=error&message=${encodeURIComponent(message)}`);
  }
});

export default router;
