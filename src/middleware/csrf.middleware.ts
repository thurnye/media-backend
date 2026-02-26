import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_HEADER = 'x-csrf-token';

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (READ_METHODS.has(req.method)) {
    next();
    return;
  }

  const isAuthenticatedSession = Boolean(req.userId && req.token);
  if (!isAuthenticatedSession) {
    next();
    return;
  }

  const csrfCookie = req.cookies?.csrf_token as string | undefined;
  const csrfHeader = req.header(CSRF_HEADER);

  // Bootstrap path: first authenticated write request after CSRF cookie rotation/missing.
  // authMiddleware sets a new csrf_token cookie on the response; next request must send header+cookie.
  if (!csrfCookie) {
    logger.info(
      {
        event: 'csrf_bootstrap',
        method: req.method,
        url: req.originalUrl || req.url,
      },
      'CSRF cookie missing for authenticated session; allowing request and issuing new token',
    );
    next();
    return;
  }

  if (!csrfHeader || csrfCookie !== csrfHeader) {
    logger.warn(
      {
        event: 'csrf_blocked',
        method: req.method,
        url: req.originalUrl || req.url,
        hasAuthCookie: Boolean(req.cookies?.token),
        hasCsrfCookie: Boolean(csrfCookie),
        hasCsrfHeader: Boolean(csrfHeader),
        reason: !csrfHeader ? 'missing_csrf_header' : 'csrf_mismatch',
      },
      'Request blocked by CSRF protection',
    );
    res.status(403).json({ error: 'Invalid CSRF token' });
    return;
  }

  next();
}
