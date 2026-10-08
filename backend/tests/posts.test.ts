import type { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { makeApp, resetDatabase, setupDatabase, signedInAgent } from './helpers';

let pool: Pool;
let app: ReturnType<typeof makeApp>;

beforeAll(async () => {
  pool = await setupDatabase();
  app = makeApp(pool);
});
beforeEach(() => resetDatabase(pool));
afterAll(() => pool.end());

describe('authentication required (NFR-02)', () => {
  it('rejects anonymous feed and post requests', async () => {
    await request(app).get('/api/posts').expect(401);
    await request(app).post('/api/posts').send({ content: 'hi' }).expect(401);
    const { rowCount } = await pool.query('SELECT 1 FROM posts');
    expect(rowCount).toBe(0);
  });
});

describe('create post (FR-06, FR-07)', () => {
  it('stores the post and returns it with author and date', async () => {
    const agent = await signedInAgent(app);
    const res = await agent.post('/api/posts').send({ content: '  Hello, Chirp!  ' }).expect(201);
    expect(res.body.post).toEqual({
      id: expect.any(Number),
      content: 'Hello, Chirp!',
      createdAt: expect.any(String),
      author: { id: expect.any(Number), username: 'alice' },
    });
    expect(Number.isNaN(Date.parse(res.body.post.createdAt))).toBe(false);
  });

  it('accepts exactly 280 characters', async () => {
    const agent = await signedInAgent(app);
    await agent.post('/api/posts').send({ content: 'a'.repeat(280) }).expect(201);
  });

  it.each([[''], ['   '], ['a'.repeat(281)]])('rejects invalid content %#', async (content) => {
    const agent = await signedInAgent(app);
    await agent.post('/api/posts').send({ content }).expect(400);
    const { rowCount } = await pool.query('SELECT 1 FROM posts');
    expect(rowCount).toBe(0);
  });

  it('ignores any author id supplied by the client', async () => {
    const agent = await signedInAgent(app);
    const res = await agent
      .post('/api/posts')
      .send({ content: 'mine', authorId: 999, author: { id: 999 } })
      .expect(201);
    expect(res.body.post.author.username).toBe('alice');
  });
});

describe('feed (FR-08, FR-09, FR-11)', () => {
  it('shows posts from all users, newest first', async () => {
    const alice = await signedInAgent(app, 'alice');
    const bob = await signedInAgent(app, 'bob');
    await alice.post('/api/posts').send({ content: 'first' }).expect(201);
    await bob.post('/api/posts').send({ content: 'second' }).expect(201);
    await alice.post('/api/posts').send({ content: 'third' }).expect(201);

    const res = await bob.get('/api/posts').expect(200);
    expect(res.body.posts.map((p: { content: string }) => p.content)).toEqual([
      'third',
      'second',
      'first',
    ]);
    expect(res.body.posts.map((p: { author: { username: string } }) => p.author.username)).toEqual([
      'alice',
      'bob',
      'alice',
    ]);
    expect(res.body.nextCursor).toBeNull();
  });

  it('paginates with a cursor without skipping or repeating posts', async () => {
    const agent = await signedInAgent(app);
    // Same timestamp for every post to exercise the id tie-breaker.
    const { rows } = await pool.query('SELECT id FROM users');
    await pool.query(
      `INSERT INTO posts (author_id, content, created_at)
       SELECT $1, 'post ' || n, '2026-01-01T00:00:00Z' FROM generate_series(1, 5) n`,
      [rows[0].id],
    );

    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const url: string = cursor ? `/api/posts?limit=2&cursor=${cursor}` : '/api/posts?limit=2';
      const res = await agent.get(url).expect(200);
      expect(res.body.posts.length).toBeLessThanOrEqual(2);
      seen.push(...res.body.posts.map((p: { content: string }) => p.content));
      cursor = res.body.nextCursor;
    } while (cursor);

    expect(seen).toEqual(['post 5', 'post 4', 'post 3', 'post 2', 'post 1']);
  });

  it('rejects an invalid cursor or limit', async () => {
    const agent = await signedInAgent(app);
    await agent.get('/api/posts?cursor=garbage').expect(400);
    await agent.get('/api/posts?limit=1000').expect(400);
  });
});
