import { Pool } from 'pg';

/**
 * Ordered, append-only list of schema migrations. Each runs once, inside a
 * transaction, and is recorded in schema_migrations. Never edit an applied
 * migration; add a new one instead.
 */
const migrations: { id: string; sql: string }[] = [
  {
    id: '001_create_users_and_posts',
    sql: `
      CREATE TABLE users (
        id            SERIAL PRIMARY KEY,
        username      TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at    TIMESTAMPTZ(3) NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX users_username_lower_idx ON users (lower(username));

      CREATE TABLE posts (
        id         SERIAL PRIMARY KEY,
        author_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content    TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 280),
        created_at TIMESTAMPTZ(3) NOT NULL DEFAULT now()
      );
      CREATE INDEX posts_created_at_id_idx ON posts (created_at DESC, id DESC);
    `,
  },
];

export async function migrate(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    // Serialise concurrent start-ups (e.g. several API replicas).
    await client.query('SELECT pg_advisory_lock(727274)');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id         TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    const { rows } = await client.query<{ id: string }>('SELECT id FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.id));

    for (const m of migrations) {
      if (applied.has(m.id)) continue;
      await client.query('BEGIN');
      try {
        await client.query(m.sql);
        await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [m.id]);
        await client.query('COMMIT');
        console.log(`Applied migration ${m.id}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(727274)').catch(() => undefined);
    client.release();
  }
}
