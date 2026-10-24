import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const require = createRequire(import.meta.url);
// Exercise the installed SDK58 URL matcher, not a replacement routing algorithm.
// Route modules are stubs so discovery never initializes auth/API/native modules.
const { getRoutes } = require('expo-router/build/getRoutesCore');
const { getNavigationConfig } = require('expo-router/build/getLinkingConfig');
const { getStateFromPath } = require('expo-router/build/fork/getStateFromPath');
const keys = readdirSync(new URL('../src/app/', import.meta.url), { recursive: true })
  .filter(name => name.endsWith('.tsx'))
  .map(name => './' + name.replaceAll('\\', '/'));
const context = () => ({ default: () => null });
context.keys = () => [...keys];
const tree = getRoutes(context, { platform: 'android', ignoreEntryPoints: true, skipGenerated: true });

// Only the native URL unwrapping API is stubbed. Use the real SDK extraction code
// with Expo Go detected, including exp:// QR launch URLs and custom schemes.
const extractionFile = require.resolve('expo-router/build/fork/extractPathFromURL');
const extractionRequire = createRequire(extractionFile);
const extractionExports = {};
runInNewContext(readFileSync(extractionFile, 'utf8'), {
  exports: extractionExports,
  URL,
  expo: { modules: { ExpoGo: {} } },
  require: name => name === 'expo-linking'
    ? { unwrapDevLaunchURL: url => url }
    : extractionRequire(name),
});

function matchedNames(url, metaOnly = true) {
  const path = extractionExports.extractExpoPathFromURL([], url);
  const config = getNavigationConfig(tree, metaOnly, {});
  const names = [];
  let state = getStateFromPath(path.startsWith('/') ? path : '/' + path, config);
  while (state) {
    const route = state.routes[state.index ?? state.routes.length - 1];
    names.push(route.name);
    state = route.state;
  }
  return names;
}

test('SDK58 matches custom-scheme root on cold start and reload, with both linking configs', () => {
  for (const metaOnly of [true, false]) {
    for (let reload = 0; reload < 2; reload++) {
      assert.deepEqual(matchedNames('multilingual-ai-narration:///', metaOnly), ['__root', 'index']);
      assert.deepEqual(matchedNames('/', metaOnly), ['__root', 'index']);
    }
  }
});

test('Expo Go QR root URLs resolve to the public museum index', () => {
  for (const url of ['exp://127.0.0.1:8081', 'exp://127.0.0.1:8081/--/', 'exps://127.0.0.1:8081/--/']) {
    assert.deepEqual(matchedNames(url), ['__root', 'index']);
  }
});

test('public museum, detail and workspace deep links resolve without changing Customer routes', () => {
  for (const route of ['kham-pha', 'thuyet-minh']) {
    assert.deepEqual(matchedNames(`multilingual-ai-narration:///${route}`), ['__root', route]);
    assert.deepEqual(matchedNames(`multilingual-ai-narration:///${route}/test-slug`), ['__root', `${route}/[slug]`]);
  }
  assert.deepEqual(matchedNames('/ve-bao-tang'), ['__root', 've-bao-tang']);
  assert.deepEqual(matchedNames('/khong-gian-cua-toi'), ['__root', 'khong-gian-cua-toi']);
});

test('login and dashboard destinations resolve to existing route modules', () => {
  assert.deepEqual(matchedNames('/login'), ['__root', 'login']);
  assert.deepEqual(matchedNames('/(tabs)/dashboard'), ['__root', '(tabs)', 'dashboard']);
  assert.deepEqual(matchedNames('multilingual-ai-narration:///dashboard'), ['__root', '(tabs)', 'dashboard']);
});

test('valid deep links are preserved while unknown routes use the SDK Not Found', () => {
  assert.deepEqual(matchedNames('multilingual-ai-narration:///projects/test-id/transcript'), ['__root', 'projects/[projectId]/transcript']);
  assert.deepEqual(matchedNames('multilingual-ai-narration:///route-that-does-not-exist'), ['+not-found']);
});
