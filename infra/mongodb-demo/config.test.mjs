import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateLocalBackend } from './backend-guard.mjs';
const valid = { MONGODB_URI: 'mongodb://demo-app:synthetic-test-value@127.0.0.1:27018/multilingual_ai_narration_ui_demo?authSource=multilingual_ai_narration_ui_demo', PORT: '8081', NODE_ENV: 'development', CORS_ORIGINS: 'http://localhost:5175', UPLOAD_DIR: 'uploads-local-demo', JWT_ACCESS_SECRET: 'synthetic-access', JWT_REFRESH_SECRET: 'synthetic-refresh' };
test('Local backend accepts only the dedicated local endpoint and isolated configuration', () => {
  assert.doesNotThrow(() => validateLocalBackend(valid));
  for (const override of [{ MONGODB_URI: valid.MONGODB_URI.replace('127.0.0.1', 'remote.invalid') }, { MONGODB_URI: valid.MONGODB_URI.replace('27018', '27017') }, { MONGODB_URI: valid.MONGODB_URI.replace('_ui_demo?', '?') }, { NODE_ENV: 'production' }, { PORT: '8080' }, { OPENAI_API_KEY: 'synthetic' }, { JWT_REFRESH_SECRET: valid.JWT_ACCESS_SECRET }]) assert.throws(() => validateLocalBackend({ ...valid, ...override }));
});
test('Compose retains fixed image, loopback binding, auth and independent volume', () => {
  const source = readFileSync(new URL('./compose.yaml', import.meta.url), 'utf8');
  for (const token of ['mongo:8.0.17', '127.0.0.1:27018:27017', '"--auth"', 'narration-ui-demo-mongodb-data', 'MONGO_INITDB_ROOT_PASSWORD_FILE', 'healthcheck:']) assert.ok(source.includes(token));
  assert.ok(!source.includes('mongodb+srv'));
});
