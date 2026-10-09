import assert from 'node:assert/strict';
import test from 'node:test';
import { authRouteGuards } from '../src/features/auth/authNavigation.mjs';

test('auth navigation exposes exactly one route group for every session state', () => {
  for (const [status, guards] of Object.entries(authRouteGuards)) {
    assert.equal(Object.values(guards).filter(Boolean).length, 1, `${status} must expose exactly one route group`);
  }
});

test('loading exposes only the initialization screen', () => {
  assert.deepEqual(authRouteGuards.loading, { loading: true, public: false, private: false });
});

test('unauthenticated and logout states expose only public auth routes', () => {
  assert.deepEqual(authRouteGuards.unauthenticated, { loading: false, public: true, private: false });
});

test('authenticated state exposes only private application routes', () => {
  assert.deepEqual(authRouteGuards.authenticated, { loading: false, public: false, private: true });
});
