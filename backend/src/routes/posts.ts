import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { requireAuth } from '../auth';
import type { Config } from '../config';
import { validationError } from '../validation';

export const MAX_POST_LENGTH = 280;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

const createPostSchema = z.object({
  content: z
    .string({ required_error: 'Content is required' })
    .trim()
    .min(1, 'Post cannot be empty')
    .max(MAX_POST_LENGTH, `Post must be at most ${MAX_POST_LENGTH} characters`),
});

const feedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  cursor: z.string().optional(),
});

interface PostRow {
  id: number;
  content: string;
  created_at: Date;
  author_id: number;
  author_username: string;
}

function toPost(row: PostRow) {
  return {
    id: row.id,
    content: row.content,
    createdAt: row.created_at.toISOString(),
    author: { id: row.author_id, username: row.author_username },
  };
}

// The cursor is the (created_at, id) of the last post on the page, so the
// next page starts strictly after it even when timestamps collide.
function encodeCursor(row: PostRow): string {
  return Buffer.from(`${row.created_at.toISOString()}|${row.id}`).toString('base64url');
}

function decodeCursor(cursor: string): { createdAt: string; id: number } | null {
  const [createdAt, id] = Buffer.from(cursor, 'base64url').toString().split('|');
  if (!createdAt || Number.isNaN(Date.parse(createdAt)) || !/^\d+$/.test(id ?? '')) return null;
  return { createdAt, id: Number(id) };
}

export function postsRouter(pool: Pool, config: Config): Router {
  const router = Router();
  router.use(requireAuth(config.jwtSecret));

  router.get('/', async (req, res, next) => {
    const parsed = feedQuerySchema.safeParse(req.query);
    if (!parsed.success) return validationError(res, parsed.error);
    const { limit, cursor } = parsed.data;

    const after = cursor ? decodeCursor(cursor) : null;
    if (cursor && !after) return res.status(400).json({ error: 'Invalid cursor' });

    try {
      const { rows } = await pool.query<PostRow>(
        `SELECT p.id, p.content, p.created_at, u.id AS author_id, u.username AS author_username
           FROM posts p
           JOIN users u ON u.id = p.author_id
          WHERE $1::timestamptz IS NULL OR (p.created_at, p.id) < ($1::timestamptz, $2::int)
          ORDER BY p.created_at DESC, p.id DESC
          LIMIT $3`,
        [after?.createdAt ?? null, after?.id ?? null, limit + 1],
      );
      const hasMore = rows.length > limit;
      const page = rows.slice(0, limit);
      return res.json({
        posts: page.map(toPost),
        nextCursor: hasMore ? encodeCursor(page[page.length - 1]) : null,
      });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/', async (req, res, next) => {
    const parsed = createPostSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error);

    try {
      const { rows } = await pool.query<PostRow>(
        `WITH inserted AS (
           INSERT INTO posts (author_id, content) VALUES ($1, $2)
           RETURNING id, content, created_at, author_id
         )
         SELECT i.id, i.content, i.created_at, i.author_id, u.username AS author_username
           FROM inserted i JOIN users u ON u.id = i.author_id`,
        [req.user!.id, parsed.data.content],
      );
      return res.status(201).json({ post: toPost(rows[0]) });
    } catch (err) {
      // The session refers to a user that no longer exists (e.g. DB was reset).
      if ((err as { code?: string }).code === '23503') {
        return res.status(401).json({ error: 'Session expired or invalid' });
      }
      return next(err);
    }
  });

  return router;
}
