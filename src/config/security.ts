const isWeakSecret = (value: string | undefined, blocked: string[]): boolean => {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return blocked.includes(normalized);
};

export function assertSecureConfig(): void {
  const jwtSecret = process.env.JWT_SECRET;
  const oauthStateSecret = process.env.OAUTH_STATE_SECRET;
  const tokenEncryptionKey = process.env.TOKEN_ENCRYPTION_KEY;

  if (!jwtSecret || jwtSecret.length < 32 || isWeakSecret(jwtSecret, ['changeme-secret'])) {
    throw new Error('JWT_SECRET must be set and at least 32 characters long');
  }

  if (
    !oauthStateSecret ||
    oauthStateSecret.length < 32 ||
    isWeakSecret(oauthStateSecret, ['dev-oauth-state-secret'])
  ) {
    throw new Error('OAUTH_STATE_SECRET must be set and at least 32 characters long');
  }

  if (!tokenEncryptionKey || tokenEncryptionKey.length < 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be set and at least 32 characters long');
  }
}
