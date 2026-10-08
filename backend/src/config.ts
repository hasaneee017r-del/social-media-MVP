export interface Config {
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  cookieSecure: boolean;
  bcryptCost: number;
  /** Max register/login requests per IP per 15-minute window. */
  authRateLimit: number;
  /** Number of reverse proxies in front of the API (nginx in Docker = 1). */
  trustProxy: number;
}

export const DEFAULT_JWT_SECRET = 'dev-only-insecure-secret-change-me';

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  return {
    port: Number(env.PORT ?? 3000),
    databaseUrl,
    jwtSecret: env.JWT_SECRET || DEFAULT_JWT_SECRET,
    cookieSecure: env.COOKIE_SECURE === 'true',
    bcryptCost: Number(env.BCRYPT_COST ?? 12),
    authRateLimit: Number(env.AUTH_RATE_LIMIT ?? 20),
    trustProxy: Number(env.TRUST_PROXY ?? 0),
  };
}
