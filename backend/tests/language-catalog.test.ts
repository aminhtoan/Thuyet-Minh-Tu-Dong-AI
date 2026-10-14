import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { LANGUAGE_CATALOG, languageCatalogSchema, parseCatalogOptions, planLanguageCatalog, prepareLanguageCatalog, verifyCatalogTarget, type CatalogRecord } from '../src/scripts/language-catalog-data.js';
import { Language } from '../src/models/Language.js';
import { Voice } from '../src/models/Voice.js';
import { listActiveVoices } from '../src/services/voice-catalog.service.js';
import { startTranslationSchema } from '../src/validators/translation.validator.js';

test('six catalog records satisfy unchanged Mongoose schema and Translation language-code contract', async () => {
  assert.deepEqual(LANGUAGE_CATALOG.map(record => record.code), ['vi', 'en', 'ja', 'ko', 'zh', 'fr']);
  assert.equal(new Set(LANGUAGE_CATALOG.map(record => record.code)).size, 6);
  for (const record of LANGUAGE_CATALOG) { await new Language(record).validate(); startTranslationSchema.parse({ body: { targetLanguage: record.code } }); assert.ok(record.name && record.nativeName && record.isActive); }
});
test('catalog validation rejects malformed/unsupported code, missing labels, wrong boolean and extra fields', () => {
  for (const patch of [{ code: 'EN' }, { code: 'unsupported' }, { name: ' ' }, { nativeName: '' }, { isActive: 'true' }, { role: 'ADMIN' }]) assert.throws(() => languageCatalogSchema.parse({ ...LANGUAGE_CATALOG[0], ...patch }));
});
test('empty catalog dry-run plans six creates without invoking any writes or index creation', async () => {
  const result = await prepareLanguageCatalog({ async read() { return []; }, async hasUniqueCodeIndex() { assert.fail('Do not inspect/create indexes in dry-run'); }, async insertMissing() { assert.fail('No Database writes'); } });
  assert.equal(result.mode, 'dry-run'); assert.equal(result.create.length, 6); assert.equal(result.created, 0);
});
test('existing and inactive catalog records are never overwritten or reactivated', async () => {
  const records: CatalogRecord[] = [{ ...LANGUAGE_CATALOG[0]!, name: 'Tên quản trị đã đặt', isActive: false }];
  const original = JSON.stringify(records[0]);
  const store = { async read() { return records; }, async hasUniqueCodeIndex() { return true; }, async insertMissing(record: CatalogRecord) { if (records.some(existing => existing.code === record.code)) return false; records.push({ ...record }); return true; } };
  const first = await prepareLanguageCatalog(store, true); assert.equal(first.created, 5); assert.deepEqual(first.inactive, ['vi']); assert.equal(JSON.stringify(records[0]), original);
  const second = await prepareLanguageCatalog(store, true); assert.equal(second.created, 0); assert.equal(records.length, 6);
});
test('concurrent preparation with insert-if-absent store creates no duplicate codes', async () => {
  const records: CatalogRecord[] = [];
  const store = { async read() { return [...records]; }, async hasUniqueCodeIndex() { return true; }, async insertMissing(record: CatalogRecord) { if (records.some(existing => existing.code === record.code)) return false; records.push({ ...record }); return true; } };
  const results = await Promise.all([prepareLanguageCatalog(store, true), prepareLanguageCatalog(store, true)]);
  assert.equal(results.reduce((count, result) => count + result.created, 0), 6); assert.equal(new Set(records.map(record => record.code)).size, 6);
});
test('existing normalized codes are preserved; duplicate catalog corruption fails closed', () => {
  assert.deepEqual(planLanguageCatalog([{ code: ' EN ', isActive: false }]).keep, ['en']);
  assert.throws(() => planLanguageCatalog([{ code: 'en' }, { code: 'EN' }]), /EXISTING_DUPLICATE_CODES/);
});
test('missing unique index blocks all writes without creating schema/indexes automatically', async () => {
  await assert.rejects(prepareLanguageCatalog({ async read() { return []; }, async hasUniqueCodeIndex() { return false; }, async insertMissing() { assert.fail('Must not write'); } }, true), /UNIQUE_CODE_INDEX_REQUIRED/);
});
test('CLI is dry-run by default and refuses unknown/conflicting flags or offline writing', () => {
  assert.equal(parseCatalogOptions([]).write, false);
  assert.equal(parseCatalogOptions(['--dry-run', '--offline']).offline, true);
  for (const args of [['--write', '--dry-run'], ['--write', '--offline'], ['--unknown'], ['--confirm-env=production'], ['--confirm-db=x', '--confirm-db=y']]) assert.throws(() => parseCatalogOptions(args));
});
test('write requires explicit matching environment, URI DB, actual connected DB and approval', () => {
  const options = parseCatalogOptions(['--write', '--confirm-env=test', '--confirm-db=language_catalog_test', '--approve-write=LANGUAGE_CATALOG']);
  const uri = 'mongodb://127.0.0.1:1/language_catalog_test';
  verifyCatalogTarget(options, 'test', uri, 'language_catalog_test');
  for (const [candidate, environment, targetUri, actual] of [[{ ...options, approved: false }, 'test', uri, 'language_catalog_test'], [options, 'production', uri, 'language_catalog_test'], [options, 'development', uri, 'language_catalog_test'], [options, 'test', 'mongodb://127.0.0.1:1/another', 'language_catalog_test'], [options, 'test', uri, 'another'], [options, 'test', undefined, undefined], [parseCatalogOptions([]), 'test', uri, 'language_catalog_test']] as const) assert.throws(() => verifyCatalogTarget(candidate, environment, targetUri, actual));
});
test('GET /api/voices service returns active languages even when there are no TTS voices', async t => {
  t.mock.method(Language, 'find', (filter: any) => ({ async sort() { assert.equal(filter.isActive, true); return LANGUAGE_CATALOG.map((record, index) => ({ ...record, _id: `language-${index}` })); } }));
  t.mock.method(Voice, 'find', () => ({ async sort() { return []; } }));
  const response = await listActiveVoices(); assert.equal(response.languages.length, 6); assert.equal(response.voices.length, 0); assert.equal(response.languages[1]?.code, 'en'); assert.equal(response.languages[1]?.nativeName, 'English');
});
test('seed entrypoint uses only guarded setOnInsert, disables auto index/create and never seeds voices', async () => {
  const source = await readFile(new URL('../src/scripts/seed-language-catalog.ts', import.meta.url), 'utf8');
  assert.match(source, /autoIndex: false, autoCreate: false/); assert.match(source, /\$setOnInsert:/); assert.match(source, /verifyCatalogTarget\(options/);
  assert.doesNotMatch(source, /deleteMany|createIndex|seedVoiceCatalog|GoogleGenAI|OPENAI_API_KEY|console\.error\(error\)/);
});

// Real routes and JWT validation, no mongoose connection or real persistence.
process.env.NODE_ENV = 'test'; process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/language_catalog_mock';
process.env.JWT_ACCESS_SECRET = randomBytes(48).toString('hex'); process.env.JWT_REFRESH_SECRET = randomBytes(48).toString('hex');
process.env.JWT_ACCESS_EXPIRES_IN = '15m'; process.env.JWT_REFRESH_EXPIRES_IN = '7d';
const { default: express } = await import('express');
const { voiceRouter } = await import('../src/routes/voice.routes.js');
const { errorHandlerMiddleware } = await import('../src/middleware/error-handler.middleware.js');
const { User } = await import('../src/models/User.js');
const { signAccessToken } = await import('../src/utils/jwt.js');
test('authenticated GET /api/voices DTO compatibility, empty and populated catalogs without fake voices', async t => {
  let records: readonly CatalogRecord[] = [];
  const user = { _id: '0123456789abcdef01234567', fullName: 'Test', email: 'catalog@example.test', role: 'CUSTOMER', status: 'ACTIVE' };
  t.mock.method(User, 'findById', async () => user);
  t.mock.method(Language, 'find', (filter: any) => ({ async sort() { return records.filter(record => !filter.code || filter.code === record.code).map((record, index) => ({ ...record, _id: `language-${index}` })); } }));
  t.mock.method(Voice, 'find', () => ({ async sort() { return []; } }));
  const app = express(); app.use('/api/voices', voiceRouter); app.use(errorHandlerMiddleware);
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string'); const token = signAccessToken(user._id, 'CUSTOMER');
  const call = async (suffix = '', auth = true) => { const response = await fetch(`http://127.0.0.1:${address.port}/api/voices${suffix}`, { headers: auth ? { authorization: `Bearer ${token}` } : {} }); return { status: response.status, body: await response.json() as any }; };
  try {
    assert.equal((await call('', false)).status, 401); assert.deepEqual((await call()).body.data, { languages: [], voices: [] });
    records = LANGUAGE_CATALOG; const result = await call(); assert.equal(result.status, 200); assert.equal(result.body.data.languages.length, 6); assert.deepEqual(result.body.data.voices, []);
    assert.equal((await call('?language=en')).body.data.languages[0].code, 'en'); assert.equal((await call('?language=bad%20code')).status, 400);
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
