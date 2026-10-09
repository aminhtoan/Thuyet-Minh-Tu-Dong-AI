import assert from 'node:assert/strict';
import test from 'node:test';
import { createSessionRevision } from '../src/features/auth/sessionRevision.mjs';

test('logout invalidates an in-flight refresh revision', () => {
  const revision = createSessionRevision();
  const refreshRevision = revision.current();
  revision.advance();
  assert.equal(revision.isCurrent(refreshRevision), false);
});

test('a newer login remains current after an older logout operation', () => {
  const revision = createSessionRevision();
  const logoutRevision = revision.advance();
  const loginRevision = revision.advance();
  assert.equal(revision.isCurrent(logoutRevision), false);
  assert.equal(revision.isCurrent(loginRevision), true);
});
