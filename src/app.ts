import express from 'express';
import pinoHttp from 'pino-http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
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
  const app = express();
  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const server = new ApolloServer({ typeDefs, resolvers, formatError });
  await server.start();

  // Structured HTTP logging with minimal, non-sensitive fields
  app.use(
    pinoHttp({
      logger,
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

  // Serve uploaded media files statically
  app.use('/uploads', express.static(uploadsDir));

  // OAuth REST routes (before Apollo middleware)
  app.use(cookieParser());
  app.use(
    '/oauth',
    cors({ origin: process.env.CLIENT_URL || 'http://localhost:4200', credentials: true }),
    oauthRoutes,
  );

  // Media upload/delete REST routes
  app.use(
    '/api/media',
    cors({ origin: process.env.CLIENT_URL || 'http://localhost:4200', credentials: true }),
    cookieParser(),
    authService.authMiddleware,
    mediaRoutes,
  );

  app.use(
    '/graphql',
    cors({ origin: process.env.CLIENT_URL || 'http://localhost:4200', credentials: true }),
    cookieParser(),
    json(),
    authService.authMiddleware,          // decode cookie → req.userId, req.token
    expressMiddleware(server, {
      context: async ({ req, res }) => ({ userId: req.userId, token: req.token, res }),
    }),
  );

  // Start background cron jobs (publish scheduled posts, refresh tokens)
  initScheduler();

  return app;
}
