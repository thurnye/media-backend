import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET     = process.env.JWT_SECRET     || 'changeme-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const IS_PROD        = process.env.NODE_ENV === 'production';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   IS_PROD,            // HTTPS-only in production
  sameSite: 'strict' as const,
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

const authService = {
  generateToken(userId: string): string {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
  },

  /** Express middleware — reads the HttpOnly cookie, verifies the JWT,
   *  and attaches userId + token to req for downstream use in the Apollo context. */
  authMiddleware(req: Request, _res: Response, next: NextFunction): void {
    const token = req.cookies?.token as string | undefined;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        req.userId = decoded.userId;
        req.token  = token;
      } catch {
        // expired / tampered token — proceed as unauthenticated
      }
    }
    next();
  },

  /** Set the JWT as an HttpOnly cookie on the response. */
  setTokenCookie(res: Response, token: string): void {
    res.cookie('token', token, COOKIE_OPTIONS);
  },

  /** Clear the auth cookie on logout. */
  clearTokenCookie(res: Response): void {
    res.clearCookie('token', COOKIE_OPTIONS);
  },
};

export default authService;
