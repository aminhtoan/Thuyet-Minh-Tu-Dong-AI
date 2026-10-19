import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  CUSTOMER_SOFT_DELETE_ALLOWLIST,
  type CustomerCleanupSnapshot,
  validateCleanupAllowlist,
  validateCleanupSnapshot,
} from '../src/services/customer-soft-delete.service.js';
import { availableUserFilter, isUserAvailable } from '../src/services/user-availability.js';

const backendRoot = new URL('../', import.meta.url);
const source = async (path: string) => readFile(new URL(path, backendRoot), 'utf8');

const readySnapshot = (): CustomerCleanupSnapshot => ({
  candidate: CUSTOMER_SOFT_DELETE_ALLOWLIST[0],
  userMatches: true,
  alreadyDeleted: false,
  activityLogs: CUSTOMER_SOFT_DELETE_ALLOWLIST[0].expectedActivityLogs,
  activityActorReferences: CUSTOMER_SOFT_DELETE_ALLOWLIST[0].expectedActivityLogs,
  historicalProjectIds: 11,
  dependencies: {
    projects: 0,
    media: 0,
    transcripts: 0,
    transcriptSegments: 0,
    translations: 0,
    translationSegments: 0,
    narrations: 0,
    results: 0,
    processingJobs: 0,
    authSessions: 0,
  },
});

test('legacy and active users remain available while a soft-deleted user does not', () => {
  assert.equal(isUserAvailable({}), true);
  assert.equal(isUserAvailable({ deletedAt: null }), true);
  assert.equal(isUserAvailable({ deletedAt: new Date() }), false);
  assert.deepEqual(availableUserFilter({ role: 'ADMIN' }), { role: 'ADMIN', deletedAt: null });
});

test('cleanup allowlist contains exactly the three approved fixture identities', () => {
  validateCleanupAllowlist(CUSTOMER_SOFT_DELETE_ALLOWLIST);
  assert.equal(CUSTOMER_SOFT_DELETE_ALLOWLIST.length, 3);
  assert.equal(new Set(CUSTOMER_SOFT_DELETE_ALLOWLIST.map((item) => item.id)).size, 3);
  assert.equal(CUSTOMER_SOFT_DELETE_ALLOWLIST.reduce((total, item) => total + item.expectedActivityLogs, 0), 80);
  assert.ok(CUSTOMER_SOFT_DELETE_ALLOWLIST.every((item) => item.fullName === 'S24 Disposable Customer' && /^s2421-\d+@example\.test$/.test(item.email)));
});

test('identity, repeated cleanup, dependencies and activity drift all fail closed', () => {
  assert.doesNotThrow(() => validateCleanupSnapshot(readySnapshot()));
  assert.throws(() => validateCleanupSnapshot({ ...readySnapshot(), userMatches: false }), /IDENTITY_MISMATCH/);
  assert.throws(() => validateCleanupSnapshot({ ...readySnapshot(), alreadyDeleted: true }), /ALREADY_SOFT_DELETED/);
  assert.throws(() => validateCleanupSnapshot({ ...readySnapshot(), dependencies: { ...readySnapshot().dependencies, projects: 1 } }), /DEPENDENCIES_FOUND/);
  assert.throws(() => validateCleanupSnapshot({ ...readySnapshot(), dependencies: { ...readySnapshot().dependencies, authSessions: 1 } }), /DEPENDENCIES_FOUND/);
  assert.throws(() => validateCleanupSnapshot({ ...readySnapshot(), activityLogs: 25, activityActorReferences: 25 }), /ACTIVITY_LOG_MISMATCH/);
});

test('authentication queries exclude soft-deleted users without exposing lifecycle fields', async () => {
  const [authService, middleware] = await Promise.all([
    source('src/services/auth.service.ts'),
    source('src/middleware/authenticate.middleware.ts'),
  ]);
  assert.match(authService, /User\.findOne\(availableUserFilter\(\{ email: input\.email \}\)\)/);
  assert.match(authService, /User\.findOne\(availableUserFilter\(\{ _id: payload\.sub \}\)\)/);
  assert.match(middleware, /User\.findOne\(availableUserFilter\(\{ _id: payload\.sub \}\)\)/);
  assert.doesNotMatch(authService, /deletedAt.*SafeUser|SafeUser.*deletedAt/);
});

test('Admin customer list, detail and statistics consistently exclude soft-deleted customers', async () => {
  const adminService = await source('src/services/admin.service.ts');
  assert.match(adminService, /availableCustomerFilter/);
  assert.match(adminService, /User\.countDocuments\(availableCustomerFilter\(\)\)/);
  assert.match(adminService, /User\.findOne\(availableCustomerFilter\(\{ _id: id \}\)\)/);
  assert.match(adminService, /User\.findById\(log\.userId\)/);
});

test('execution is transaction-bound, conditional and inaccessible from dry-run', async () => {
  const [service, script] = await Promise.all([
    source('src/services/customer-soft-delete.service.ts'),
    source('src/scripts/soft-delete-s24-customers.ts'),
  ]);
  assert.match(service, /session\.withTransaction/);
  assert.match(service, /availableUserFilter\(\{ _id: candidate\.id, role: 'CUSTOMER', fullName: candidate\.fullName, email: candidate\.email \}\)/);
  assert.match(service, /result\.matchedCount !== 1 \|\| result\.modifiedCount !== 1/);
  assert.match(service, /ADMIN07\.3_MAINTENANCE_CONFIRMED/);
  assert.doesNotMatch(service, /deleteMany|updateMany/);
  assert.match(script, /if \(mode === 'dry-run'\) return;/);
  assert.match(script, /CUSTOMER_CLEANUP_BACKUP_SHA256/);
  assert.match(script, /CUSTOMER_CLEANUP_DEPLOYMENT_FINGERPRINT/);
});
