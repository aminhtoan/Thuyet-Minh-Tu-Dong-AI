import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { syncMuseumMobile } from '../../scripts/museum-mobile-sync.mjs';

const read = path => readFileSync(new URL('../src/features/museum/' + path, import.meta.url), 'utf8');
const snapshot = JSON.parse(read('catalog.generated.json'));
const jsx = (type, props) => ({ type, props });
const native = { View: 'View', Text: 'Text', Image: 'Image', Pressable: 'Pressable', ScrollView: 'ScrollView', StyleSheet: { create: value => value } };
function compile(name, modules) {
  const exports = {};
  const { outputText } = ts.transpileModule(read(name), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } });
  runInNewContext(outputText, { exports, require: key => {
    assert.ok(key in modules, `Forbidden unexpected import: ${key}`);
    return modules[key];
  } });
  return exports;
}
const catalog = compile('catalog.ts', { './catalog.generated.json': snapshot });
const theme = compile('theme.ts', { 'react-native': native });
function uiModule() {
  let failed = false;
  return compile('MuseumUI.tsx', {
    react: { useState: initial => [failed || initial, value => { failed = value; }] },
    'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': native,
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'expo-router': { Link: 'Link', usePathname: () => '/kham-pha' },
    './assets.generated': { museumAssets: Object.fromEntries(Object.keys(snapshot.imageHashes).map(path => [path, 1])) },
    './theme': theme,
  });
}
function renderer(slug, open = async () => {}) {
  const slots = [];
  let cursor = 0;
  const exports = compile('MuseumScreens.tsx', {
    react: { useState: initial => {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [slots[i], value => { slots[i] = value; }];
    } },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { ...native, Linking: { openURL: open } },
    'expo-router': { useLocalSearchParams: () => ({ slug }) },
    './catalog': catalog,
    './assets.generated': { museumAssets: Object.fromEntries(Object.keys(snapshot.imageHashes).map(path => [path, 1])) },
    './theme': theme,
    './MuseumUI': { MuseumFrame: 'MuseumFrame', MuseumImage: 'MuseumImage', MuseumLink: 'MuseumLink', MuseumTitle: 'MuseumTitle' },
  });
  return name => { cursor = 0; return exports[name](); };
}
function nodes(node) {
  if (!node || typeof node !== 'object') return [];
  if (typeof node.type === 'function') return nodes(node.type(node.props));
  return [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)];
}
const strings = tree => nodes(tree).flatMap(node => [node.props?.children].flat(Infinity).filter(value => typeof value === 'string'));

test('native public catalog, topics/languages and all copied images match Web by content/hash', () => {
  syncMuseumMobile();
  assert.equal(snapshot.videos.length, 1);
  assert.equal(snapshot.exhibitions.length, 0);
  assert.equal(snapshot.topics.length, 3);
  assert.equal(Object.keys(snapshot.imageHashes).length, 7);
  assert.equal(snapshot.playback, 'EXTERNAL_SOURCE_ONLY');
});

test('guest public shell exposes all museum navigation and workspace entry without auth dependencies', () => {
  const ui = uiModule();
  const tree = ui.MuseumFrame({ children: 'public content', current: 'Khám phá' });
  assert.equal(tree.type, 'SafeAreaView');
  const rendered = nodes(tree);
  const links = rendered.filter(node => node.type === 'Link');
  for (const href of ['/', '/kham-pha', '/thuyet-minh', '/ve-bao-tang', '/khong-gian-cua-toi']) {
    assert.ok(links.some(node => node.props.href === href));
  }
  assert.equal(rendered.filter(node => node.type === 'ScrollView').length, 1);
  assert.ok(rendered.some(node => node.type === 'Pressable' && node.props.accessibilityState?.selected));
});

test('image load failure has accessible fallback instead of broken image and poster keeps 16:9', () => {
  const ui = uiModule();
  const props = { path: snapshot.videos[0].posterUrl, alt: 'Video giới thiệu', poster: true };
  const image = ui.MuseumImage(props);
  assert.equal(image.type, 'Image');
  assert.equal(image.props.accessibilityLabel, props.alt);
  assert.equal(image.props.style[1].aspectRatio, 16 / 9);
  image.props.onError();
  assert.equal(ui.MuseumImage(props).type, 'View');
});

test('Museum home reuses published content, imagery and non-interactive preview cards', () => {
  const render = renderer();
  const tree = render('MuseumHomeScreen');
  const rendered = nodes(tree);
  const text = strings(tree);
  for (const topic of snapshot.topics) assert.ok(text.includes(topic.title));
  assert.equal(text.filter(item => item === 'Đang chuẩn bị').length, 4);
  assert.ok(rendered.some(node => node.type === 'MuseumLink' && node.props.href === '/kham-pha'));
  assert.equal(rendered.filter(node => node.type === 'MuseumLink' && typeof node.props.href === 'object').length, 0);
  for (const image of rendered.filter(node => node.type === 'MuseumImage')) assert.ok(snapshot.imageHashes[image.props.path]);
});

test('all four public pages render without importing auth, Customer APIs or provider clients', () => {
  const render = renderer();
  for (const name of ['MuseumHomeScreen', 'MuseumExploreScreen', 'MuseumVideosScreen', 'MuseumAboutScreen']) {
    assert.equal(render(name).type, 'MuseumFrame');
  }
  assert.ok(strings(render('MuseumVideosScreen')).includes(snapshot.videos[0].title));
  assert.ok(strings(render('MuseumAboutScreen')).includes('Hành trình khám phá'));
});

test('video detail exposes only real language availability and never auto-opens source', async () => {
  const calls = [];
  const video = snapshot.videos[0];
  const render = renderer(video.slug, async url => { calls.push(url); });
  const tree = render('MuseumVideoDetailScreen');
  assert.equal(calls.length, 0);
  assert.equal(catalog.languageAvailable(video, 'vi'), true);
  for (const code of ['en', 'th', 'ko', 'zh-CN', 'xx']) assert.equal(catalog.languageAvailable(video, code), false);
  const states = nodes(tree).filter(node => node.props.accessibilityState?.disabled === true);
  assert.equal(states.length, 4);
  assert.ok(states.every(node => !node.props.onPress));
  assert.ok(strings(tree).includes(video.rights.license));
  const action = nodes(tree).find(node => node.type === 'Pressable');
  await action.props.onPress();
  assert.deepEqual(calls, [video.sourceAttribution.reference]);
});

test('source open failure yields safe feedback; unpublished slugs never open media', async () => {
  const render = renderer(snapshot.videos[0].slug, async () => { throw new Error('native mock'); });
  await nodes(render('MuseumVideoDetailScreen')).find(node => node.type === 'Pressable').props.onPress();
  // onPress delegates a promise without returning it; flush mocked openURL rejection.
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(nodes(render('MuseumVideoDetailScreen')).some(node => node.props.accessibilityRole === 'alert'));
  const missing = renderer('not-published');
  assert.ok(nodes(missing('MuseumVideoDetailScreen')).some(node => node.props.title === 'Không tìm thấy video'));
  assert.ok(nodes(missing('MuseumExhibitionScreen')).some(node => node.props.title === 'Không tìm thấy chuyên đề'));
  assert.equal(catalog.publicSourceUrl({ sourceAttribution: { reference: 'javascript:unsafe' } }), undefined);
  assert.equal(catalog.findPublicVideo(['ambiguous', 'slug']), undefined);
});

test('Public theme is isolated from Customer overrides and matches Web brand palette/fonts', () => {
  assert.doesNotMatch(read('theme.ts'), /from\s+['"][^'"]*(?:theme\/tokens|customer)/i);
  const webTokens = readFileSync(new URL('../../frontend-web/src/styles/tokens.css', import.meta.url), 'utf8').toUpperCase();
  for (const key of ['primary', 'accent', 'navy', 'background', 'section', 'white']) {
    assert.ok(webTokens.includes(theme.museum[key].toUpperCase()), key);
  }
  for (const role of ['regular', 'semibold', 'bold']) assert.match(theme.museum[role], /^BeVietnamPro-/);
  assert.equal(theme.ms.link.minHeight, 48);
});
