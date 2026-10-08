import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Test files share one database, so run them one after another.
    fileParallelism: false,
    testTimeout: 15000,
  },
});
