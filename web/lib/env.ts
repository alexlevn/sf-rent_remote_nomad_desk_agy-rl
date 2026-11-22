const DEV_FALLBACK_AUTH_SECRET = 'nomaddesk_jwt_secret_dev';
const DEFAULT_LOCAL_DATABASE_URL = 'postgres://postgres:postgres@localhost:55188/nomaddesk';

/**
 * Reads the Auth.js signing secret from AUTH_SECRET or NEXTAUTH_SECRET.
 * Fails closed at runtime in production when neither env var is configured.
 */
export function getAuthSecret(): string {
  const configured =
    process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (configured && configured.length > 0) {
    return configured;
  }

  const isProdRuntime =
    process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PHASE !== 'phase-production-build' &&
    process.env.VITEST !== 'true';

  if (isProdRuntime) {
    throw new Error(
      'Missing required AUTH_SECRET or NEXTAUTH_SECRET environment variable in production.'
    );
  }

  return DEV_FALLBACK_AUTH_SECRET;
}

/**
 * Reads PostgreSQL connection string with local Docker Compose fallback.
 */
export function getDatabaseUrl(): string {
  return process.env.DATABASE_URL?.trim() || DEFAULT_LOCAL_DATABASE_URL;
}

/**
 * Controls whether the destructive /api/mock/reset endpoint is enabled.
 * Always disabled in production unless ALLOW_MOCK_RESET=true is explicitly set.
 */
export function isMockResetAllowed(): boolean {
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }
  return process.env.ALLOW_MOCK_RESET === 'true';
}
