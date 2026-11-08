import { posix } from 'node:path';

type Environment = Record<string, string | undefined>;
const fail = (field: string): never => { throw new Error('STAGING_CONFIG_INVALID:' + field); };
export function httpsOrigin(value: string | undefined): string {
  try {
    const url = new URL(value ?? '');
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || url.hostname.includes('*') ||
      /^(localhost|.*\.localhost|.*\.local|[\d.]+|\[.*\])$/i.test(url.hostname)) return fail('HTTPS_ORIGIN');
    return url.origin;
  } catch { return fail('HTTPS_ORIGIN'); }
}

// Pure validation: never resolves DNS, connects, logs values or opens media.
export function stagingConfig(environment: Environment) {
  if (environment.APP_ENV !== undefined && !['development', 'test', 'staging', 'production'].includes(environment.APP_ENV)) fail('APP_ENV');
  if (environment.APP_ENV !== 'staging' && ['STAGING_DATABASE_NAME', 'STAGING_ISOLATION_ACK', 'STAGING_MEDIA_ACK'].some(key => environment[key] !== undefined)) fail('STAGING_DISCRIMINATOR');
  if (environment.APP_ENV !== 'staging') return null;
  if (environment.NODE_ENV !== 'production') fail('NODE_ENV');
  if (environment.STAGING_ISOLATION_ACK !== 'dedicated-database-and-user-reviewed') fail('ISOLATION_ACK');
  if (environment.STAGING_MEDIA_ACK !== 'persistent-volume-reviewed') fail('MEDIA_ACK');
  const database = environment.STAGING_DATABASE_NAME ?? '';
  if (!/^[a-z][a-z0-9_]{2,54}_staging$/.test(database)) fail('DATABASE_NAME');
  const match = /^mongodb(?:\+srv)?:\/\/[^/?#]+\/([^/?#]+)(?:\?([^#]*))?$/.exec(environment.MONGODB_URI ?? '');
  if (!match) fail('DATABASE_URI');
  let uriDatabase: string;
  try { uriDatabase = decodeURIComponent(match![1]!); } catch { return fail('DATABASE_URI'); }
  if (uriDatabase !== database) fail('DATABASE_MISMATCH');
  const options = new URLSearchParams(match![2] ?? '');
  // The driver must not receive a conflicting namespace or permission intent.
  if ([...options.keys()].some(key => ['dbname', 'autoindex', 'autocreate'].includes(key.toLowerCase()))) fail('DATABASE_OPTIONS');
  const media = environment.UPLOAD_DIR ?? '';
  if (!posix.isAbsolute(media) || posix.normalize(media) !== media || !media.startsWith('/var/lib/narration-staging/') || media === '/var/lib/narration-staging/') fail('UPLOAD_DIR');
  const origins = (environment.CORS_ORIGINS ?? '').split(',').map(value => httpsOrigin(value.trim()));
  if (!origins.length || new Set(origins).size !== origins.length) fail('CORS_ORIGINS');
  const access = environment.JWT_ACCESS_SECRET ?? '', refresh = environment.JWT_REFRESH_SECRET ?? '';
  if (access.length < 32 || refresh.length < 32 || access === refresh || /replace|placeholder|example/i.test(access + refresh)) fail('JWT_SECRETS');
  if (['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'OPENAI_API_KEY'].some(key => environment[key]?.trim())) fail('AI_KEYS_NOT_ALLOWED');
  if (environment.CUSTOMER_TRANSLATION_ENABLED !== 'false' || environment.GROUP_TRANSLATION_ENABLED !== 'false' ||
    environment.CONTROLLED_PROVIDER_MODE?.trim()) fail('AI_FEATURE_FLAGS');
  return Object.freeze({ database, media, origins });
}
