import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createRequire } from 'node:module';
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
function uiModule(Link = 'Link') {
  let failed = false;
  return compile('MuseumUI.tsx', {
    react: { useState: initial => [failed || initial, value => { failed = value; }], forwardRef: render => props => render(props, props.ref ?? null) },
    'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': native,
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@expo/vector-icons/MaterialCommunityIcons': { default: 'Icon' },
    'expo-router': { Link, usePathname: () => '/kham-pha' },
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

test('five-item Public bottom navigation is reserved outside scrolling content, inside all safe edges', () => {
  const ui = uiModule();
  const frame = ui.MuseumFrame({ children: 'content' });
  assert.deepEqual([...frame.props.edges], ['top', 'right', 'bottom', 'left']);
  const [header, scroll, bottom] = frame.props.children;
  assert.equal(scroll.type, 'ScrollView');
  assert.equal(bottom.type, ui.MuseumBottomNavigation);
  assert.equal(nodes(header).filter(node => node.type === 'Link').length, 1, 'brand only');
  assert.equal(nodes(scroll).some(node => node.type === ui.MuseumBottomNavigation), false);
  assert.equal(theme.ms.scroll.flex, 1);
  assert.equal(theme.ms.bottomNavigation.flexShrink, 0);
  assert.equal(theme.ms.bottomNavigation.position, undefined, 'bar must reserve layout space, never overlay');
  const links = nodes(bottom).filter(node => node.type === 'Link');
  assert.deepEqual(links.map(node => node.props.href), ['/', '/kham-pha', '/thuyet-minh', '/ve-bao-tang', '/khong-gian-cua-toi']);
  assert.deepEqual(strings(bottom).filter(text => ['Trang chủ', 'Khám phá', 'Thuyết minh', 'Giới thiệu', 'Của tôi'].includes(text)), ['Trang chủ', 'Khám phá', 'Thuyết minh', 'Giới thiệu', 'Của tôi']);
  const controls = nodes(bottom).filter(node => node.type === 'Pressable');
  assert.equal(controls.length, 5);
  for (const control of controls) {
    const style = Object.assign({}, ...control.props.style({ pressed: false }).filter(Boolean));
    assert.equal(style.minWidth, 0);
    assert.ok(style.minHeight >= 48);
    assert.equal(control.props.accessibilityRole, 'link');
    assert.equal(control.props.numberOfLines, undefined);
  }
  assert.equal(controls.filter(control => control.props.accessibilityState.selected).length, 1);
});

test('Public active tab follows detail paths without false prefix matches or Customer tab coupling', () => {
  const ui = uiModule();
  assert.equal(ui.publicTabSelected('/', '/'), true);
  assert.equal(ui.publicTabSelected('/thuyet-minh/video-slug', '/thuyet-minh'), true);
  assert.equal(ui.publicTabSelected('/kham-pha/topic-slug', '/kham-pha'), true);
  assert.equal(ui.publicTabSelected('/kham-pha-other', '/kham-pha'), false);
  assert.equal(ui.publicTabSelected('/dashboard', '/'), false);
  const tabs = readFileSync(new URL('../src/app/(tabs)/_layout.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(tabs, /MuseumFrame|MuseumBottomNavigation/);
  assert.match(tabs, /<Tabs/);
});

test('Hero keeps the complete image in its own horizontal frame and separates primary/secondary CTAs', () => {
  const tree = renderer()('MuseumHomeScreen');
  const hero = nodes(tree).find(node => node.type === 'MuseumImage' && node.props.hero);
  assert.equal(hero.props.path, snapshot.images.hero.src);
  const frame = uiModule().MuseumImage(hero.props);
  const heroImage = frame.props.children;
  assert.equal(heroImage.props.resizeMode, 'contain');
  const style = Object.assign({}, ...frame.props.style.filter(Boolean));
  assert.equal(style.aspectRatio, 16 / 9);
  assert.equal(style.maxHeight, 200);
  assert.equal(heroImage.props.accessibilityLabel, snapshot.images.hero.alt);
  const actions = nodes(tree).filter(node => node.type === 'MuseumLink');
  const primary = actions.find(node => node.props.children === 'Khám phá bảo tàng');
  const secondary = actions.find(node => node.props.children === 'Xem thuyết minh');
  assert.equal(primary.props.homeCta, 'light');
  assert.equal(primary.props.href, '/kham-pha');
  assert.equal(secondary.props.primary, undefined);
  assert.equal(secondary.props.inverse, true);
  assert.equal(secondary.props.outlined, true);
  assert.equal(secondary.props.homeCta, 'outline');
  assert.equal(theme.ms.hero.height, undefined);
});

test('Hero ratio frame caps height without inheriting static asset dimensions, including Pixel 7 widths', () => {
  const frame = uiModule().MuseumImage({ path: snapshot.images.hero.src, alt: snapshot.images.hero.alt, hero: true });
  const style = Object.assign({}, ...frame.props.style.filter(Boolean));
  assert.equal(frame.type, 'View');
  assert.equal(style.width, '100%');
  assert.equal(style.height, undefined);
  assert.equal(style.alignSelf, 'center');
  // Simulate native Image's source dimensions preceding user style, not a device render.
  const nativeStyle = { width: 1960, height: 1102, ...frame.props.children.props.style };
  assert.equal(nativeStyle.width, '100%');
  assert.equal(nativeStyle.height, '100%');
  assert.equal(nativeStyle.position, 'absolute', 'child must not size the frame');
  for (const viewport of [320, 375, 393, 411, 768]) {
    const width = Math.min(viewport - 2 * theme.ms.container.padding, style.maxWidth);
    const height = width / style.aspectRatio;
    assert.ok(height <= style.maxHeight);
    assert.equal(width / height, 16 / 9);
    if (viewport >= 375) assert.ok(height >= 170 && height <= 200);
  }
});

test('intro and other Museum images also use ratio-owned frames instead of intrinsic asset heights', () => {
  const ui = uiModule();
  const frame = ui.MuseumImage({ path: snapshot.images.museumIntro.src, alt: snapshot.images.museumIntro.alt });
  assert.equal(frame.type, 'View');
  assert.equal(frame.props.style[0].aspectRatio, 4 / 3);
  assert.equal(frame.props.children.props.style.height, '100%');
  assert.equal(frame.props.children.props.resizeMode, 'cover');
  for (const screen of ['MuseumHomeScreen', 'MuseumAboutScreen']) {
    assert.equal(nodes(renderer()(screen)).some(node => node.type === 'Image'), false);
  }
});

test('Home CTAs match Web light/outline/primary hierarchy with readable normal and pressed states', () => {
  const flatten = styles => Object.assign({}, ...styles.filter(Boolean));
  const luminance = hex => hex.slice(1).match(/../g).map(channel => parseInt(channel, 16) / 255)
    .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, i) => sum + channel * [0.2126, 0.7152, 0.0722][i], 0);
  const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
  const tree = renderer()('MuseumHomeScreen');
  const ctas = nodes(tree).filter(node => node.type === 'MuseumLink' && node.props.homeCta);
  assert.equal(ctas.length, 3);
  for (const cta of ctas) {
    const link = uiModule().MuseumLink(cta.props);
    assert.equal(link.props.href, cta.props.homeCta === 'outline' ? '/thuyet-minh' : '/kham-pha');
    const control = link.props.children;
    const text = flatten(control.props.children.props.style);
    for (const pressed of [false, true]) {
      const style = flatten(control.props.style({ pressed }));
      assert.ok(style.minHeight >= 48);
      const background = style.backgroundColor ?? theme.museum.navy;
      assert.ok(contrast(text.color, background) >= 4.5, `${cta.props.homeCta} pressed=${pressed}`);
    }
  }
  const light = uiModule().MuseumLink(ctas[0].props).props.children;
  assert.equal(flatten(light.props.style({ pressed: false })).backgroundColor, theme.museum.white);
  const ordinary = uiModule().MuseumLink({ href: '/ve-bao-tang', children: 'Unchanged link' }).props.children;
  assert.equal(flatten(ordinary.props.style({ pressed: false })).minHeight, 48);
});

test('Public tabs reserve centered icon/label slots and allow wrapping without shrinking touch targets', () => {
  const controls = nodes(uiModule().MuseumBottomNavigation()).filter(node => node.type === 'Pressable');
  assert.equal(controls.length, 5);
  for (const control of controls) {
    const style = Object.assign({}, ...control.props.style({ pressed: false }).filter(Boolean));
    assert.equal(style.flexBasis, 0);
    assert.equal(style.justifyContent, 'center');
    assert.equal(style.alignItems, 'center');
    assert.equal(style.minWidth, 0);
    assert.ok(style.minHeight >= 48);
    const [icon, label] = control.props.children;
    assert.equal(icon.props.style, theme.ms.tabIcon);
    assert.equal(theme.ms.tabIcon.justifyContent, 'center');
    assert.equal(theme.ms.tabText.textAlign, 'center');
    assert.equal(theme.ms.tabText.fontSize, 11);
    assert.equal(theme.ms.tabText.flexShrink, 0);
    assert.ok(theme.ms.tabText.minHeight >= 2 * theme.ms.tabText.lineHeight);
    assert.equal(label.props.numberOfLines, undefined, 'no truncation or forced single line');
    assert.equal(label.props.allowFontScaling, undefined);
  }
  assert.ok(theme.ms.bottomNavigationRow.gap >= 8);
  for (const viewport of [320, 360, 375, 393, 411]) {
    const width = (viewport - 2 * theme.ms.bottomNavigation.paddingHorizontal - 4 * theme.ms.bottomNavigationRow.gap) / 5;
    assert.ok(width >= 48, 'five equal targets fit Pixel7/small-phone width');
  }
  assert.equal(theme.ms.tabSelected.borderTopColor, theme.museum.primary);
});

test('installed Slot merge preserves all five native tab flex styles through component/ref boundary', () => {
  // Exercise the installed dependency's real merge, not a hand-written approximation.
  const require = createRequire(import.meta.url);
  const dependency = { exports: {} };
  runInNewContext(readFileSync(require.resolve('@radix-ui/react-slot'), 'utf8') + '\nmodule.exports.testMergeProps = mergeProps;', {
    require, module: dependency, exports: dependency.exports,
  });
  const merge = dependency.exports.testMergeProps;
  const broken = merge({ style: undefined }, { style: () => [theme.ms.tab] });
  assert.equal(Object.keys(broken.style).length, 0, 'reproduce old callback lost in Slot merge');
  const navigation = [];
  const nativeRef = {};
  const ui = uiModule(({ children, href }) => ({
    ...children,
    props: { ...merge({ style: undefined, onPress: () => navigation.push(href) }, children.props), ref: nativeRef },
  }));
  const bar = ui.MuseumBottomNavigation();
  const controls = nodes(bar).filter(node => node.type === 'Pressable');
  assert.equal(controls.length, 5);
  const styles = controls.map(control => {
    assert.equal(control.props.ref, nativeRef);
    assert.equal(typeof control.props.style, 'function', 'callback created AFTER Slot merge');
    control.props.onPress();
    const normal = Object.assign({}, ...control.props.style({ pressed: false }).filter(Boolean));
    assert.equal(normal.flex, 1);
    assert.equal(normal.flexBasis, 0);
    assert.equal(normal.minWidth, 0);
    assert.equal(normal.width, undefined);
    assert.equal(normal.alignItems, 'center');
    assert.equal(normal.justifyContent, 'center');
    const pressed = Object.assign({}, ...control.props.style({ pressed: true }).filter(Boolean));
    assert.equal(pressed.backgroundColor, theme.museum.soft);
    return normal;
  });
  assert.deepEqual(navigation, ['/', '/kham-pha', '/thuyet-minh', '/ve-bao-tang', '/khong-gian-cua-toi']);
  const row = bar.props.children.props.style;
  assert.equal(theme.ms.bottomNavigation.width, '100%');
  assert.equal(row.width, '100%');
  assert.equal(row.flexDirection, 'row');
  assert.equal(row.maxWidth, undefined);
  assert.equal(theme.ms.bottomNavigation.maxWidth, undefined);
  // Equal flex styles AFTER the real merge occupy all available width, incl. tablet.
  for (const viewport of [360, 393, 411, 1024]) {
    const gutter = theme.ms.bottomNavigation.paddingHorizontal;
    const available = viewport - 2 * gutter - 4 * row.gap;
    const widths = styles.map(style => available * style.flex / styles.reduce((sum, s) => sum + s.flex, 0));
    assert.ok(widths.every(width => width >= 48));
    assert.ok(widths.every(width => width === widths[0]));
    assert.ok(Math.abs(widths.reduce((sum, width) => sum + width, 0) + 4 * row.gap + 2 * gutter - viewport) < 0.001);
  }
});

test('final CTA owns white foreground without relying on primary flag and keeps existing route', () => {
  const cta = nodes(renderer()('MuseumHomeScreen')).find(node => node.props.children === 'Bắt đầu khám phá');
  assert.equal(cta.props.href, '/kham-pha');
  assert.equal(cta.props.homeCta, 'primary');
  const control = uiModule().MuseumLink({ ...cta.props, primary: false }).props.children;
  const flatten = styles => Object.assign({}, ...styles.filter(Boolean));
  assert.equal(flatten(control.props.children.props.style).color, '#FFFFFF');
  assert.equal(flatten(control.props.style({ pressed: false })).backgroundColor, theme.museum.pressed);
  assert.equal(flatten(control.props.style({ pressed: true })).backgroundColor, theme.museum.navy);
});

test('safe area is applied once; scrolling footer and final CTA precede non-overlay navigation', () => {
  const ui = uiModule();
  const frame = ui.MuseumFrame({ children: renderer()('MuseumHomeScreen') });
  assert.equal(nodes(frame).filter(node => node.type === 'SafeAreaView').length, 1);
  assert.equal([...frame.props.edges].filter(edge => edge === 'bottom').length, 1);
  const [, scroll, bar] = frame.props.children;
  assert.equal(scroll.type, 'ScrollView');
  assert.equal(bar.type, ui.MuseumBottomNavigation);
  assert.ok(nodes(scroll).some(node => node.props.children === 'Bắt đầu khám phá'));
  assert.equal(theme.ms.scroll.flex, 1);
  assert.equal(theme.ms.bottomNavigation.flexShrink, 0);
  for (const style of [theme.ms.safe, theme.ms.content, theme.ms.bottomNavigation]) {
    assert.equal(style.position, undefined);
    assert.equal(style.paddingBottom, undefined, 'no duplicated manual bottom inset');
  }
  assert.doesNotMatch(read('MuseumUI.tsx'), /useSafeAreaInsets|contentInset=|automaticallyAdjustContentInsets=/);
});

test('planned-language cards remain two equal flexible columns with wrapped labels and no actions', () => {
  const tree = renderer()('MuseumHomeScreen');
  const rows = nodes(tree).filter(node => node.type === 'View' && node.props.style === theme.ms.languageRow);
  assert.equal(rows.length, 2);
  for (const row of rows) {
    const cards = row.props.children;
    assert.equal(cards.length, 2);
    for (const card of cards) {
      const style = Object.assign({}, ...card.props.style);
      assert.equal(style.flex, 1);
      assert.equal(style.minWidth, 0);
      assert.equal(style.height, undefined);
      assert.equal(nodes(card).some(node => ['Pressable', 'MuseumLink'].includes(node.type)), false);
      for (const text of nodes(card).filter(node => node.type === 'Text')) {
        assert.equal(text.props.numberOfLines, undefined);
        assert.notEqual(text.props.allowFontScaling, false);
      }
    }
  }
});

test('image load failure has accessible fallback instead of broken image and poster keeps 16:9', () => {
  const ui = uiModule();
  const props = { path: snapshot.videos[0].posterUrl, alt: 'Video giới thiệu', poster: true };
  const frame = ui.MuseumImage(props);
  const image = frame.props.children;
  assert.equal(image.type, 'Image');
  assert.equal(image.props.accessibilityLabel, props.alt);
  assert.equal(frame.props.style[1].aspectRatio, 16 / 9);
  image.props.onError();
  const fallback = ui.MuseumImage(props);
  assert.equal(fallback.type, 'View');
  assert.equal(fallback.props.style[1].aspectRatio, 16 / 9);
  assert.equal(nodes(fallback).some(node => node.type === 'Image'), false);
  const heroFallback = ui.MuseumImage({ ...props, hero: true });
  assert.equal(heroFallback.props.style[2].maxHeight, 200);
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
