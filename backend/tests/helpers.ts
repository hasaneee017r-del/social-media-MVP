import type { Pool } from 'pg';
import request from 'supertest';
import { createApp } from '../src/app';
import type { Config } from '../src/config';
import { createPool } from '../src/db';
import { migrate } from '../src/migrate';

export const TEST_DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://chirp:chirp@localhost:54329/chirp_test';

export const testConfig: Config = {
  port: 0,
  databaseUrl: TEST_DATABASE_URL,
  jwtSecret: 'test-secret',
  cookieSecure: false,
  bcryptCost: 4, // fast hashing in tests; production uses 12
  authRateLimit: 1000,
  trustProxy: 0,
};

export async function setupDatabase(): Promise<Pool> {
  const pool = createPool(TEST_DATABASE_URL);
  await migrate(pool);
  return pool;
}

export async function resetDatabase(pool: Pool): Promise<void> {
  await pool.query('TRUNCATE posts, users RESTART IDENTITY CASCADE');
}

export function makeApp(pool: Pool, overrides: Partial<Config> = {}) {
  return createApp(pool, { ...testConfig, ...overrides });
}

/** Registers a user and returns a supertest agent that keeps its session cookie. */
export async function signedInAgent(app: ReturnType<typeof makeApp>, username = 'alice') {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ username, password: 'password123' }).expect(201);
  return agent;
}
