import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = name => readFile(new URL('../' + name, import.meta.url), 'utf8');

test('SDK58 uses stable Expo, React19.3 and RN0.88 with aligned native modules', async () => {
  const pkg = JSON.parse(await read('package.json'));
  assert.equal(pkg.dependencies.expo, '^58.0.0');
  assert.equal(pkg.dependencies['react-native'], '0.88.0');
  assert.equal(pkg.dependencies.react, '19.3.0');
  for (const [name, version] of Object.entries(pkg.dependencies)) {
    if (name.startsWith('expo-')) assert.match(version, /^~58\./, name);
    assert.doesNotMatch(version, /canary|beta|rc\./, name);
  }
  assert.match(pkg.devDependencies['@types/react'], /^~19\.3/);
  assert.match(pkg.devDependencies['eslint-config-expo'], /^~58\./);
});

test('SDK58 retains declared tabs, dashboard first, and protected authentication groups', async () => {
  const tabs = await read('src/app/(tabs)/_layout.tsx');
  assert.doesNotMatch(tabs, /<Tabs\s+initialRouteName=/);
  assert.equal([...tabs.matchAll(/<Tabs.Screen name="([^"]+)"/g)][0][1], 'dashboard');
  for (const name of ['dashboard', 'projects', 'history', 'settings', 'account']) assert.ok(tabs.includes(`name="${name}"`));
  assert.match(tabs, /name="settings" options=\{\{ href: null/);
  const root = await read('src/app/_layout.tsx');
  assert.ok(root.includes('guard={guards.public} redirectTo="/khong-gian-cua-toi"'));
  assert.ok(root.includes('guard={guards.private} redirectTo="/"'));
  assert.doesNotMatch(root, /guard=\{guards.loading\}/);
  assert.match(root, /headerShown: false/);
  const config = JSON.parse(await read('app.json')).expo;
  assert.equal(config.web.output, 'single');
  assert.equal(config.plugins.find(p => Array.isArray(p) && p[0] === 'expo-router')[1].asyncRoutes.web, false);
});

test('SDK58 preserves secure storage, native multipart upload and playback APIs', async () => {
  const api = await read('src/lib/api.ts');
  assert.match(api, /SecureStore.getItemAsync\(key\)/);
  assert.match(api, /SecureStore.setItemAsync\(key/);
  assert.match(api, /SecureStore.deleteItemAsync\(key\)/);
  assert.match(api, /createSessionRevision/);
  const upload = await read('src/features/projects/nativeUpload.ts');
  assert.match(upload, /expo-file-system\/legacy/);
  assert.match(upload, /FileSystem.createUploadTask/);
  assert.match(upload, /FileSystemUploadType.MULTIPART/);
  assert.match(upload, /cancelAsync/);
  const result = await read('src/screens/ResultScreen.tsx');
  assert.match(result, /useVideoPlayer/); assert.match(result, /useAudioPlayer/);
  assert.match(result, /nativeControls/);
});

test('RN0.88 strict list slots keep empty/footer absence without null casts', async () => {
  for (const screen of ['Translation', 'Voice']) {
    const source = await read(`src/screens/${screen}Screen.tsx`);
    assert.match(source, /ListEmptyComponent=\{empty \?\? undefined\}/);
    assert.match(source, /ListFooterComponent=\{footer \?\? undefined\}/);
    assert.doesNotMatch(source, /as any|react-native-legacy-deep-imports/);
  }
  const transcript = await read('src/screens/TranscriptScreen.tsx');
  assert.match(transcript, /const footer = [^\r\n]+ : undefined;/);
  const projects = await read('src/screens/ProjectsScreen.tsx');
  assert.match(projects, /ListFooterComponent=\{[\s\S]+? : undefined\}/);
});
