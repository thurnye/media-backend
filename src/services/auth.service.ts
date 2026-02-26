import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import userRepository from '../repositories/user.repository';

const JWT_SECRET     = process.env.JWT_SECRET     || '';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const IS_PROD        = process.env.NODE_ENV === 'production';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   IS_PROD,            // HTTPS-only in production
  sameSite: 'strict' as const,
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

const CSRF_COOKIE_OPTIONS = {
  httpOnly: false,
  secure: IS_PROD,
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const generateCsrfToken = (): string =>
  crypto.randomBytes(24).toString('hex');

const authService = {
  generateToken(userId: string): string {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
  },

  /** Express middleware — reads the HttpOnly cookie, verifies the JWT,
   *  and attaches userId + token to req for downstream use in the Apollo context. */
  async authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    const token = req.cookies?.token as string | undefined;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        const user = await userRepository.findById(decoded.userId);
        if (user && user.token === token && user.isActive !== false) {
          req.userId = decoded.userId;
          req.token = token;

          if (!req.cookies?.csrf_token) {
            res.cookie('csrf_token', generateCsrfToken(), CSRF_COOKIE_OPTIONS);
          }
        }
      } catch {
        // expired / tampered token — proceed as unauthenticated
      }
    }
    next();
  },

  /** Verify a JWT and return the userId, or null if invalid. */
  verifyToken(token: string): string | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      return decoded.userId;
    } catch {
      return null;
    }
  },

  /** Set the JWT as an HttpOnly cookie on the response. */
  setTokenCookie(res: Response, token: string): void {
    res.cookie('token', token, COOKIE_OPTIONS);
    res.cookie('csrf_token', generateCsrfToken(), CSRF_COOKIE_OPTIONS);
  },

  /** Clear the auth cookie on logout. */
  clearTokenCookie(res: Response): void {
    res.clearCookie('token', COOKIE_OPTIONS);
    res.clearCookie('csrf_token', CSRF_COOKIE_OPTIONS);
  },
};

export default authService;
