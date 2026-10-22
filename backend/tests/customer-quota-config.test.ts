import test from 'node:test';
import assert from 'node:assert/strict';
import { customerTranslationQuota } from '../src/config/customer-translation-quota.js';
import { CustomerAttemptStore } from '../src/services/translation/customer-attempt.js';

test('normal defaults are finite 20/user and 200/global; overrides are independent and bounded', () => {
  assert.deepEqual(customerTranslationQuota({}), { perUser: 20, global: 200 });
  assert.deepEqual(customerTranslationQuota({ CUSTOMER_TRANSLATION_DAILY_USER_LIMIT: '50', CUSTOMER_TRANSLATION_DAILY_GLOBAL_LIMIT: '500' }), { perUser: 50, global: 500 });
  assert.deepEqual(customerTranslationQuota({ CUSTOMER_TRANSLATION_DAILY_USER_LIMIT: '1000', CUSTOMER_TRANSLATION_DAILY_GLOBAL_LIMIT: '10000' }), { perUser: 1000, global: 10000 });
  assert.deepEqual(customerTranslationQuota({ CUSTOMER_TRANSLATION_DAILY_GLOBAL_LIMIT: '1' }), { perUser: 20, global: 1 });
});
test('invalid/unlimited quota configuration fails closed without revealing raw config', () => {
  for (const field of ['CUSTOMER_TRANSLATION_DAILY_USER_LIMIT', 'CUSTOMER_TRANSLATION_DAILY_GLOBAL_LIMIT']) {
    for (const value of ['', '0', '-1', '1.5', 'Infinity', 'NaN', 'unlimited', '1e2', 'PRIVATE_SECRET', '10001']) {
      assert.throws(() => customerTranslationQuota({ [field]: value }), (e: any) => e.code === 'CUSTOMER_TRANSLATION_QUOTA_INVALID' && e.statusCode === 503 && !e.message.includes(value === '' ? 'PRIVATE' : value));
    }
  }
  assert.throws(() => customerTranslationQuota({ CUSTOMER_TRANSLATION_DAILY_USER_LIMIT: '1001' }));
});
test('invalid policy cannot claim/charge/dispatch; existing attempts are not rearmed by changed limits', async () => {
  const previous = process.env.CUSTOMER_TRANSLATION_DAILY_USER_LIMIT;
  const scope = { ownerId: '1'.repeat(24), projectId: '2'.repeat(24), targetLanguage: 'en', sourceRevision: '3'.repeat(64) };
  let claims = 0; let row: any = null;
  const store = new CustomerAttemptStore({
    read: async () => row, claim: async () => { claims++; },
    quota: async () => assert.fail('NO_QUOTA'), record: async () => assert.fail('NO_DISPATCH'),
    fail: async () => assert.fail('NO_WRITE'), finish: async () => assert.fail('NO_WRITE'),
  } as any);
  try {
    process.env.CUSTOMER_TRANSLATION_DAILY_USER_LIMIT = '0';
    await assert.rejects(store.execute(scope, 'binding', async () => assert.fail('NO_PROVIDER')), (e: any) => e.code === 'CUSTOMER_TRANSLATION_QUOTA_INVALID');
    assert.equal(claims, 0);
    row = { ...scope, binding: 'binding', state: 'UNCERTAIN' };
    const original = JSON.stringify(row);
    process.env.CUSTOMER_TRANSLATION_DAILY_USER_LIMIT = '100';
    await assert.rejects(store.execute(scope, 'binding', async () => assert.fail('NO_REPLAY')), (e: any) => e.code === 'TRANSLATION_ATTEMPT_UNCERTAIN');
    assert.equal(JSON.stringify(row), original); assert.equal(claims, 0);
  } finally {
    if (previous === undefined) delete process.env.CUSTOMER_TRANSLATION_DAILY_USER_LIMIT; else process.env.CUSTOMER_TRANSLATION_DAILY_USER_LIMIT = previous;
  }
});
