import test from 'node:test';
import assert from 'node:assert/strict';
import { stagingConfig, httpsOrigin } from '../src/config/staging.js';

const valid = () => ({
  APP_ENV: 'staging', NODE_ENV: 'production',
  MONGODB_URI: 'mongodb://synthetic-db.example.invalid/narration_staging',
  STAGING_DATABASE_NAME: 'narration_staging',
  STAGING_ISOLATION_ACK: 'dedicated-database-and-user-reviewed',
  STAGING_MEDIA_ACK: 'persistent-volume-reviewed',
  UPLOAD_DIR: '/var/lib/narration-staging/media',
  CORS_ORIGINS: 'https://customer-staging.example.invalid,https://admin-staging.example.invalid',
  JWT_ACCESS_SECRET: 'synthetic-access-value-for-offline-test-0001',
  JWT_REFRESH_SECRET: 'synthetic-refresh-value-for-offline-test-0002',
  CUSTOMER_TRANSLATION_ENABLED: 'false', GROUP_TRANSLATION_ENABLED: 'false',
  GEMINI_API_KEY: '', GOOGLE_API_KEY: '', OPENAI_API_KEY: '',
});
test('staging has a separate discriminator; development/production defaults remain unchanged', () => {
  assert.equal(stagingConfig({ NODE_ENV: 'production' }), null);
  assert.equal(stagingConfig({ APP_ENV: 'development' }), null);
  assert.equal(stagingConfig(valid())?.database, 'narration_staging');
  assert.throws(() => stagingConfig({ APP_ENV: 'stagign' }));
  assert.throws(() => stagingConfig({ NODE_ENV: 'production', STAGING_DATABASE_NAME: 'narration_staging' }));
});
test('staging rejects implicit, mismatched or overridable database namespaces before connection', () => {
  for (const uri of [
    'mongodb://synthetic-db.example.invalid', 'mongodb://synthetic-db.example.invalid/',
    'mongodb://synthetic-db.example.invalid/shared_business',
    'mongodb://synthetic-db.example.invalid/narration_staging?dbName=shared_business',
    'mongodb://synthetic-db.example.invalid/narration_staging#fragment',
    'mongodb://synthetic-db.example.invalid/%ZZ',
  ]) assert.throws(() => stagingConfig({ ...valid(), MONGODB_URI: uri }));
  assert.throws(() => stagingConfig({ ...valid(), STAGING_DATABASE_NAME: 'shared_business' }));
  assert.doesNotThrow(() => stagingConfig({ ...valid(), MONGODB_URI: 'mongodb+srv://synthetic-db.example.invalid/narration_staging?retryWrites=true' }));
});
test('operator acknowledgements, separate secrets, exact origins and dedicated media root are mandatory', () => {
  for (const overrides of [
    { NODE_ENV: 'development' }, { STAGING_ISOLATION_ACK: '' }, { STAGING_MEDIA_ACK: '' },
    { JWT_ACCESS_SECRET: 'REPLACE_WITH_SECRET' }, { JWT_REFRESH_SECRET: valid().JWT_ACCESS_SECRET },
    { UPLOAD_DIR: 'uploads' }, { UPLOAD_DIR: '/app/uploads' },
    { UPLOAD_DIR: '/var/lib/narration-staging/../uploads' },
    { CORS_ORIGINS: '*' }, { CORS_ORIGINS: 'http://customer.example.invalid' },
    { CORS_ORIGINS: 'https://localhost' }, { CORS_ORIGINS: 'https://192.168.0.1' }, { CORS_ORIGINS: 'https://*.vercel.app' },
  ]) assert.throws(() => stagingConfig({ ...valid(), ...overrides }));
  assert.equal(httpsOrigin('https://customer-staging.example.invalid'), 'https://customer-staging.example.invalid');
});
test('initial staging cannot receive AI keys or activate paid features', () => {
  for (const key of ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'OPENAI_API_KEY']) {
    assert.throws(() => stagingConfig({ ...valid(), [key]: 'synthetic-key' }));
  }
  assert.throws(() => stagingConfig({ ...valid(), CUSTOMER_TRANSLATION_ENABLED: 'true' }));
  assert.throws(() => stagingConfig({ ...valid(), CONTROLLED_PROVIDER_MODE: 'PERMIT' }));
});
test('staging installs no-auto-DDL policy before connecting and pins dbName (mock driver only)', async t => {
  const before = { ...process.env };
  Object.assign(process.env, valid());
  delete process.env.CONTROLLED_PROVIDER_MODE;
  t.after(() => { process.env = before; });
  const { default: mongoose } = await import('mongoose');
  t.mock.method(mongoose, 'connect', async (_uri: string, options: unknown) => {
    assert.deepEqual(options, { serverSelectionTimeoutMS: 5000, dbName: 'narration_staging', autoCreate: false, autoIndex: false });
    return mongoose;
  });
  const { connectDatabase } = await import('../src/config/database.js');
  assert.equal(mongoose.get('autoCreate'), false);
  assert.equal(mongoose.get('autoIndex'), false);
  await connectDatabase(valid().MONGODB_URI);
  const { app } = await import('../src/app.js');
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(done => server.once('listening', done));
  t.after(() => new Promise<void>(done => server.close(() => done())));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const url = 'http://127.0.0.1:' + address.port + '/api/health';
  // Fixture only: connection is mocked, no database ping or external health call.
  const allowed = await fetch(url, { headers: { origin: 'https://customer-staging.example.invalid' } });
  assert.equal(allowed.status, 503);
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://customer-staging.example.invalid');
  for (const origin of ['https://unrelated.vercel.app', 'http://localhost:5173']) {
    assert.equal((await fetch(url, { headers: { origin } })).status, 403);
  }
});
