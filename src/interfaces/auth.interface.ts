import { Response } from 'express';

// Extend Express Request so authMiddleware can attach decoded JWT fields
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      token?:  string;
    }
  }
}

export interface ILoginInput {
  email: string;
  password: string;
}

export interface IAuthPayload {
  token: string; // used internally to set the cookie — never returned to the client
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
}

export interface IContext {
  userId?: string;
  token?:  string;
  res?:    Response; // needed by resolvers to set/clear the HttpOnly cookie
}
