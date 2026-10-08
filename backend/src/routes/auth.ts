import bcrypt from 'bcryptjs';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import type { Pool } from 'pg';
import { z } from 'zod';
import { clearSession, issueSession, requireAuth } from '../auth';
import type { Config } from '../config';
import { validationError } from '../validation';

const credentialsSchema = z.object({
  username: z
    .string({ required_error: 'Username is required' })
    .trim()
    .min(3, 'Username must be 3-30 characters')
    .max(30, 'Username must be 3-30 characters')
    .regex(/^[A-Za-z0-9_]+$/, 'Username may contain only letters, digits and underscores'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
});

const INVALID_LOGIN = 'Invalid username or password';

// A real hash to compare against when the username doesn't exist, so the
// response time doesn't reveal whether an account exists.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

export function authRouter(pool: Pool, config: Config): Router {
  const router = Router();

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.authRateLimit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many attempts, please try again later' },
  });

  router.post('/register', limiter, async (req, res, next) => {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error);
    const { username, password } = parsed.data;

    try {
      const passwordHash = await bcrypt.hash(password, config.bcryptCost);
      const { rows } = await pool.query<{ id: number; username: string }>(
        'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
        [username, passwordHash],
      );
      const user = rows[0];
      issueSession(res, user, config.jwtSecret, config.cookieSecure);
      return res.status(201).json({ user });
    } catch (err) {
      if ((err as { code?: string }).code === '23505') {
        return res.status(409).json({ error: 'Username is already taken' });
      }
      return next(err);
    }
  });

  router.post('/login', limiter, async (req, res, next) => {
    // Only check presence here; format rules apply to new accounts, and
    // detailed messages would help attackers enumerate accounts.
    const parsed = z
      .object({ username: z.string().trim().min(1), password: z.string().min(1) })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    const { username, password } = parsed.data;

    try {
      const { rows } = await pool.query<{ id: number; username: string; password_hash: string }>(
        'SELECT id, username, password_hash FROM users WHERE lower(username) = lower($1)',
        [username],
      );
      const row = rows[0];
      const ok = await bcrypt.compare(password, row?.password_hash ?? DUMMY_HASH);
      if (!row || !ok) {
        return res.status(401).json({ error: INVALID_LOGIN });
      }
      const user = { id: row.id, username: row.username };
      issueSession(res, user, config.jwtSecret, config.cookieSecure);
      return res.json({ user });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/logout', (_req, res) => {
    clearSession(res, config.cookieSecure);
    res.status(204).end();
  });

  router.get('/me', requireAuth(config.jwtSecret), async (req, res, next) => {
    try {
      const { rows } = await pool.query<{ id: number; username: string }>(
        'SELECT id, username FROM users WHERE id = $1',
        [req.user!.id],
      );
      if (!rows[0]) {
        clearSession(res, config.cookieSecure);
        return res.status(401).json({ error: 'Session expired or invalid' });
      }
      return res.json({ user: rows[0] });
    } catch (err) {
      return next(err);
    }
  });

  return router;
}
