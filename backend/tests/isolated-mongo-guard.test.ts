import assert from 'node:assert/strict';
import test from 'node:test';
import { connectIsolatedMongo, TEST_DATABASE } from './helpers/isolated-mongo.js';

test('isolation guard rejects ambiguous/development/remote config before Docker or fixture access', async t => {
  const previousUri = process.env.TEST_MONGODB_URI, previousDatabase = process.env.TEST_DATABASE_NAME;
  const cases: Array<[string, string | undefined, string | undefined]> = [
    ['missing', undefined, undefined],
    ['no explicit URI', undefined, TEST_DATABASE],
    ['no explicit database', 'mongodb://127.0.0.1:27029/test', undefined],
    ['development database', 'mongodb://127.0.0.1:27029/multilingual_ai_narration', 'multilingual_ai_narration'],
    ['remote', 'mongodb+srv://example.invalid/test', TEST_DATABASE],
    ['other local container', `mongodb://127.0.0.1:27017/${TEST_DATABASE}`, TEST_DATABASE],
    ['wrong database path', 'mongodb://127.0.0.1:27029/other', TEST_DATABASE],
    ['ambiguous options', `mongodb://127.0.0.1:27029/${TEST_DATABASE}?replicaSet=narration-test-rs&directConnection=true&tls=false`, TEST_DATABASE],
    ['credentials disallowed', `mongodb://synthetic:synthetic@127.0.0.1:27029/${TEST_DATABASE}`, TEST_DATABASE],
    ['replica set absent', `mongodb://127.0.0.1:27029/${TEST_DATABASE}`, TEST_DATABASE],
  ];
  try {
    for (const [name, uri, database] of cases) await t.test(name, async () => {
      if (uri === undefined) delete process.env.TEST_MONGODB_URI; else process.env.TEST_MONGODB_URI = uri;
      if (database === undefined) delete process.env.TEST_DATABASE_NAME; else process.env.TEST_DATABASE_NAME = database;
      await assert.rejects(connectIsolatedMongo(), /TEST_DATABASE_ISOLATION_BLOCKED/);
    });
  } finally {
    if (previousUri === undefined) delete process.env.TEST_MONGODB_URI; else process.env.TEST_MONGODB_URI = previousUri;
    if (previousDatabase === undefined) delete process.env.TEST_DATABASE_NAME; else process.env.TEST_DATABASE_NAME = previousDatabase;
  }
});
