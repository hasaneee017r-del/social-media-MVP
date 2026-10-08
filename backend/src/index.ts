import { createApp } from './app';
import { DEFAULT_JWT_SECRET, loadConfig } from './config';
import { createPool } from './db';
import { migrate } from './migrate';

async function main() {
  const config = loadConfig();
  if (config.jwtSecret === DEFAULT_JWT_SECRET) {
    console.warn('WARNING: JWT_SECRET is not set; using an insecure development default.');
  }

  const pool = createPool(config.databaseUrl);
  await migrate(pool);

  const server = createApp(pool, config).listen(config.port, () => {
    console.log(`Chirp API listening on port ${config.port}`);
  });

  const shutdown = () => {
    console.log('Shutting down...');
    server.close(() => {
      pool.end().finally(() => process.exit(0));
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
