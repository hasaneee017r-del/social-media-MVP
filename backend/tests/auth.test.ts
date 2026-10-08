import bcrypt from 'bcryptjs';
import type { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { makeApp, resetDatabase, setupDatabase } from './helpers';

let pool: Pool;
let app: ReturnType<typeof makeApp>;

beforeAll(async () => {
  pool = await setupDatabase();
  app = makeApp(pool);
});
beforeEach(() => resetDatabase(pool));
afterAll(() => pool.end());

const creds = { username: 'alice', password: 'password123' };

describe('register (FR-01, FR-02)', () => {
  it('creates an account and signs the user in', async () => {
    const res = await request(app).post('/api/auth/register').send(creds).expect(201);
    expect(res.body.user).toEqual({ id: expect.any(Number), username: 'alice' });
    expect(res.headers['set-cookie']?.[0]).toMatch(/^chirp_session=/);
  });

  it('rejects a duplicate username regardless of case', async () => {
    await request(app).post('/api/auth/register').send(creds).expect(201);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...creds, username: 'ALICE' })
      .expect(409);
    expect(res.body.error).toBe('Username is already taken');
  });

  it.each([
    [{ username: 'al', password: 'password123' }, 'username'],
    [{ username: 'bad name!', password: 'password123' }, 'username'],
    [{ username: 'alice', password: 'short' }, 'password'],
    [{ username: 'alice' }, 'password'],
  ])('rejects invalid input %j', async (body, field) => {
    const res = await request(app).post('/api/auth/register').send(body).expect(400);
    expect(res.body.fields[field]).toBeTruthy();
    const { rowCount } = await pool.query('SELECT 1 FROM users');
    expect(rowCount).toBe(0);
  });
});

describe('login (FR-03, FR-04)', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(creds).expect(201);
  });

  it('signs in with correct credentials (username case-insensitive)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ ...creds, username: 'Alice' })
      .expect(200);
    expect(res.body.user.username).toBe('alice');
    expect(res.headers['set-cookie']?.[0]).toMatch(/^chirp_session=/);
  });

  it('returns the same generic error for wrong password and unknown user', async () => {
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ ...creds, password: 'wrong-password' })
      .expect(401);
    const unknownUser = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nobody', password: 'password123' })
      .expect(401);
    expect(wrongPassword.body.error).toBe('Invalid username or password');
    expect(unknownUser.body.error).toBe(wrongPassword.body.error);
  });

  it('rate limits repeated attempts (NFR-04)', async () => {
    const limited = makeApp(pool, { authRateLimit: 2 });
    const bad = { ...creds, password: 'wrong-password' };
    await request(limited).post('/api/auth/login').send(bad).expect(401);
    await request(limited).post('/api/auth/login').send(bad).expect(401);
    await request(limited).post('/api/auth/login').send(bad).expect(429);
  });
});

describe('session (FR-05, FR-10)', () => {
  it('me returns the current user, and logout ends the session', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send(creds).expect(201);

    const me = await agent.get('/api/auth/me').expect(200);
    expect(me.body.user.username).toBe('alice');

    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/auth/me').expect(401);
    await agent.get('/api/posts').expect(401);
  });

  it('rejects a tampered session cookie', async () => {
    await request(app)
      .get('/api/auth/me')
      .set('Cookie', 'chirp_session=not.a.valid.jwt')
      .expect(401);
  });

  it('rejects a session for a user that no longer exists', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send(creds).expect(201);
    await resetDatabase(pool);
    await agent.get('/api/auth/me').expect(401);
  });
});

describe('credential security (NFR-01, NFR-03)', () => {
  it('stores only a bcrypt hash of the password', async () => {
    await request(app).post('/api/auth/register').send(creds).expect(201);
    const { rows } = await pool.query('SELECT password_hash FROM users');
    const hash: string = rows[0].password_hash;
    expect(hash).not.toContain(creds.password);
    expect(hash).toMatch(/^\$2[aby]\$/);
    expect(await bcrypt.compare(creds.password, hash)).toBe(true);
  });

  it('sets an HttpOnly, SameSite=Lax session cookie', async () => {
    const res = await request(app).post('/api/auth/register').send(creds).expect(201);
    const cookie = res.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });
});

describe('health (NFR-14)', () => {
  it('reports ok when the database is reachable', async () => {
    await request(app).get('/api/health').expect(200, { status: 'ok' });
  });
});
