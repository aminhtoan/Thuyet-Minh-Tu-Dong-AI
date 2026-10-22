import { existsSync, readFileSync, lstatSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { assertReadOnlyPrivileges, readOnlyWebConfig } from './read-only-web-policy.js';

// Independent executable; never imports execution-server, provider or fence.
// No dotenv fallback, customer token, real permit volume or refresh secret.
if (process.env.NODE_ENV !== 'development' || process.env.CONTROLLED_RUNTIME_MODE !== 'READ_ONLY_WEB_READINESS' ||
  process.env.HOSTNAME !== 'narration-read-only-web-readiness' || existsSync('/app/.env') || existsSync('/var/lib/narration-permits') ||
  ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'OPENAI_API_KEY', 'CONTROLLED_CUSTOMER_TOKEN'].some(k => !!process.env[k])) throw new Error('READINESS_STARTUP_DENIED');
globalThis.fetch = async () => { throw new Error('READINESS_EXTERNAL_FETCH_DENIED'); };
try {
  const file = '/run/secrets/read-only-web.json', stat = lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 16384) throw new Error('READINESS_CONFIG_DENIED');
  const config = readOnlyWebConfig.parse(JSON.parse(readFileSync(file, 'utf8')));
  const uri = new URL(config.mongoUri);
  if (uri.protocol !== 'mongodb+srv:' || uri.hostname !== config.expectedSrvHost || uri.pathname !== `/${config.databaseName}` || uri.hash) throw new Error('READINESS_DEPLOYMENT_DENIED');
  mongoose.set('autoCreate', false); mongoose.set('autoIndex', false);
  await mongoose.connect(config.mongoUri, { dbName: config.databaseName, autoCreate: false, autoIndex: false, maxPoolSize: 2, serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db!, hello = await db.admin().command({ hello: 1 });
  if (db.databaseName !== config.databaseName || hello.setName !== config.expectedReplicaSet || !hello.isWritablePrimary) throw new Error('READINESS_DEPLOYMENT_DENIED');
  assertReadOnlyPrivileges(await db.admin().command({ connectionStatus: 1, showPrivileges: true }), config.databaseName);
  // Existing auth module needs refresh settings, but no real refresh secret is
  // required/loaded and no login/refresh routes exist in this composition.
  process.env.MONGODB_URI = config.mongoUri;
  process.env.JWT_ACCESS_SECRET = config.jwtAccessSecret;
  process.env.JWT_REFRESH_SECRET = randomBytes(48).toString('hex');
  process.env.JWT_ACCESS_EXPIRES_IN = '15m'; process.env.JWT_REFRESH_EXPIRES_IN = '1d';
  process.env.GROUP_TRANSLATION_ENABLED = 'false';
  const { readOnlyWebApp } = await import('./read-only-web-app.js');
  const server = readOnlyWebApp(config.corsOrigins).listen(8084, '0.0.0.0');
  server.requestTimeout = 15000; server.headersTimeout = 10000;
  process.once('SIGTERM', () => server.close(() => { void mongoose.disconnect().then(() => process.exit(0)); }));
  console.log('READ_ONLY_WEB_READINESS_LISTENER:8084; execution disabled');
} catch {
  console.error('READ_ONLY_WEB_READINESS_BLOCKED'); // Never output driver/auth/config details.
  await mongoose.disconnect(); process.exitCode = 1;
}
