import express from 'express';
import pinoHttp from 'pino-http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { json } from 'body-parser';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { GraphQLFormattedError } from 'graphql';

import './config/db';
import { typeDefs, resolvers } from './graphql/schema';
import authService from './services/auth.service';
import oauthRoutes from './routes/oauth.routes';
import mediaRoutes from './routes/media.routes';
import { initScheduler } from './jobs/scheduler';
import { logger } from './config/logger';
import { AppError } from './errors/AppError';
import { GLOBAL_CONSTANTS } from './config/constants/globalConstants';
import { assertSecureConfig } from './config/security';
import { depthAndComplexityValidationRule } from './graphql/security/validationRules';
import { csrfProtection } from './middleware/csrf.middleware';

/** Convert AppError (and plain Error) into a structured GraphQL error with an extension code. */
function formatError(formattedError: GraphQLFormattedError, error: unknown): GraphQLFormattedError {
  const original = (error as { originalError?: unknown })?.originalError;

  if (original instanceof AppError) {
    return {
      ...formattedError,
      extensions: {
        ...formattedError.extensions,
        code: original.code,
      },
    };
  }

  // Mask unexpected internal errors in production
  if (process.env.NODE_ENV === 'production' && !formattedError.extensions?.code) {
    return {
      message: GLOBAL_CONSTANTS.ERROR_MESSAGE.GRAPHQL_ERROR.INTERNAL_ERROR,
      extensions: { code: GLOBAL_CONSTANTS.ERROR_CODE.INTERNAL_ERROR },
    };
  }

  return formattedError;
}

export async function createApp() {
  assertSecureConfig();

  const app = express();
  const isProd = process.env.NODE_ENV === 'production';
  const allowedOrigins = Array.from(
    new Set([process.env.CLIENT_URL, 'http://localhost:4200', 'http://localhost:4201'].filter(Boolean)),
  ) as string[];
  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  };
  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    formatError,
    validationRules: [depthAndComplexityValidationRule],
  });
  await server.start();

  // Structured HTTP logging with minimal, non-sensitive fields
  app.use(
    pinoHttp({
      logger,
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      serializers: {
        req: (req) => ({
          id: req.id,
          method: req.method,
          url: req.url,
          remoteAddress: req.socket?.remoteAddress,
        }),
        res: (res) => ({
          statusCode: res.statusCode,
        }),
        err: (err) => ({
          type: err.name,
          message: err.message,
        }),
      },
    }),
  );

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  if (isProd) {
    const globalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 500,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests. Please try again later.' },
    });
    const graphqlLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many GraphQL requests. Please try again later.' },
    });
    const uploadLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 80,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many upload requests. Please try again later.' },
    });

    app.use(globalLimiter);
    app.use('/graphql', graphqlLimiter);
    app.use('/api/media', uploadLimiter);
    app.use('/oauth', uploadLimiter);
  }

  // Serve uploaded media files statically
  app.use('/uploads', express.static(uploadsDir));

  // OAuth REST routes (before Apollo middleware)
  app.use(cookieParser());
  app.use(
    '/oauth',
    cors(corsOptions),
    oauthRoutes,
  );

  // Media upload/delete REST routes
  app.use(
    '/api/media',
    cors(corsOptions),
    cookieParser(),
    authService.authMiddleware,
    csrfProtection,
    mediaRoutes,
  );

  app.use(
    '/graphql',
    cors(corsOptions),
    cookieParser(),
    json(),
    authService.authMiddleware,          // decode cookie → req.userId, req.token
    csrfProtection,
    expressMiddleware(server, {
      context: async ({ req, res }) => ({ userId: req.userId, token: req.token, res }),
    }),
  );

  // Start background cron jobs (publish scheduled posts, refresh tokens)
  initScheduler();

  return app;
}
