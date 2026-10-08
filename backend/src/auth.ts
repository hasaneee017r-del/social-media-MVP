import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export const SESSION_COOKIE = 'chirp_session';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface AuthUser {
  id: number;
  username: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

export function issueSession(res: Response, user: AuthUser, secret: string, secure: boolean): void {
  const token = jwt.sign({ username: user.username }, secret, {
    subject: String(user.id),
    expiresIn: SESSION_TTL_SECONDS,
    algorithm: 'HS256',
  });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: SESSION_TTL_SECONDS * 1000,
  });
}

export function clearSession(res: Response, secure: boolean): void {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure, path: '/' });
}

/** Rejects the request with 401 unless it carries a valid session cookie. */
export function requireAuth(secret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    if (typeof token !== 'string') {
      return res.status(401).json({ error: 'Authentication required' });
    }
    try {
      const payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as jwt.JwtPayload;
      req.user = { id: Number(payload.sub), username: String(payload.username) };
      return next();
    } catch {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }
  };
}
