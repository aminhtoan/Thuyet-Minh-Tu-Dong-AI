import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { libraryNavigationLabel, navigationLabels } from '../src/localization/navigationLabels.mjs';
import { navigationLabels as webLabels } from '../../frontend-web/src/localization/navigationLabels.mjs';

const read = file => readFileSync(new URL('../src/' + file, import.meta.url), 'utf8');
const jsx = (type, props) => ({ type, props });
const native = { View: 'View', Text: 'Text', Pressable: 'Pressable', KeyboardAvoidingView: 'KeyboardAvoidingView', Platform: { OS: 'android' }, StyleSheet: { create: value => value } };
function compile(file, extra = {}) {
  const exports = {}, modules = { 'react-native': native, 'react/jsx-runtime': { jsx, jsxs: jsx }, ...extra };
  runInNewContext(ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, require: name => { assert.ok(name in modules, `Unmocked import ${name}`); return modules[name]; } });
  return exports;
}
const tokens = compile('theme/tokens.ts');
const base = { '@/theme/tokens': tokens, '@expo/vector-icons/MaterialCommunityIcons': { default: 'Icon' } };
const flatten = style => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)];
function hooks() {
  let cursor = 0; const values = [], cleanups = [];
  return { begin: () => { cursor = 0; }, cleanups,
    useState: value => { const slot = cursor++; if (!(slot in values)) values[slot] = typeof value === 'function' ? value() : value; return [values[slot], next => { values[slot] = typeof next === 'function' ? next(values[slot]) : next; }]; },
    useRef: value => { const slot = cursor++; return values[slot] ??= { current: value }; },
    useEffect: effect => { const slot = cursor++; if (!(slot in values)) { values[slot] = true; cleanups.push(effect()); } },
  };
}
function bar({ active = 'dashboard', prevented = false, bottom = 24 } = {}) {
  const react = hooks(), events = [], navigations = [], listeners = new Map(); let removed = 0;
  const module = compile('components/layout/CustomerBottomNavigation.tsx', { ...base, react, '@/localization/navigationLabels.mjs': { libraryNavigationLabel, navigationLabels }, 'react-native': { ...native, Keyboard: { addListener: (name, fn) => { listeners.set(name, fn); return { remove: () => { removed++; } }; } } } });
  const routes = ['dashboard', 'projects', 'create', 'library', 'history', 'account', 'settings'].map(name => ({ name, key: 'key-' + name }));
  let index = routes.findIndex(route => route.name === active);
  const render = () => { react.begin(); return module.CustomerBottomNavigation({ state: { index, routes }, emitter: { emit: event => { events.push(event); return { defaultPrevented: prevented }; } }, navigateToTab: key => { navigations.push(key); index = routes.findIndex(route => route.key === key); }, insets: { bottom, left: 0, right: 0, top: 0 } }); };
  return { ...module, render, events, navigations, listeners, react, removed: () => removed };
}

test('Customer bar has exactly four requested labels/icons/order and no Account or History primary entry', () => {
  const b = bar(), tree = b.render(), tabs = tree.props.children;
  assert.equal(tabs.length, 4);
  assert.deepEqual(Array.from(tabs, tab => tab.props.accessibilityLabel), [webLabels.dashboard, webLabels.projects, webLabels.create, webLabels.history]);
  assert.deepEqual(Array.from(tabs, tab => tab.props.children[0].props.name), ['view-dashboard-outline', 'folder-outline', 'microphone-outline', 'video-outline']);
  assert.equal(tabs.some(tab => ['Lịch sử', 'Tài khoản'].includes(tab.props.accessibilityLabel)), false);
  assert.equal(tabs[0].props.accessibilityState.selected, true);
  assert.equal(tabs[3].props.disabled, false);
});

test('available tabs use SDK58 emitter/navigateToTab, retain active state and honor prevention', () => {
  const b = bar();
  b.render().props.children[0].props.onPress(); assert.equal(b.navigations.length, 0, 'no remount of active tab');
  b.render().props.children[1].props.onPress();
  assert.deepEqual(b.navigations, ['key-projects']);
  assert.equal(b.render().props.children[1].props.accessibilityState.selected, true);
  b.render().props.children[2].props.onPress();
  assert.deepEqual(b.navigations, ['key-projects', 'key-create']);
  assert.equal(b.render().props.children[2].props.accessibilityState.selected, true);
  b.render().props.children[1].props.onLongPress();
  assert.equal(b.events.at(-1).type, 'tabLongPress');
  const blocked = bar({ prevented: true }); blocked.render().props.children[1].props.onPress(); assert.equal(blocked.navigations.length, 0);
});

test('library opens its own real route and never redirects into legacy History', () => {
  const b = bar(); const tab = b.render().props.children[3];
  tab.props.onPress(); tab.props.onLongPress();
  assert.deepEqual(b.navigations, ['key-library']); assert.equal(b.events.length, 2);
  assert.equal(b.customerTabItems[3].route, 'library');
  assert.equal(b.render().props.children[3].props.accessibilityState.selected, true);
  assert.match(read('app/(tabs)/library.tsx'), /LibraryScreen/);
  for (const active of ['history', 'account', 'settings']) assert.equal(bar({ active }).render().props.children.some(tab => tab.props.accessibilityState.selected), false);
  assert.match(read('app/(tabs)/history.tsx'), /HistoryScreen/);
  assert.match(read('screens/HistoryScreen.tsx'), /useHistory/);
  assert.doesNotMatch(read('screens/HistoryScreen.tsx'), /libraryProduct|Thư viện thuyết minh/);
});

test('full-width equal slots fit360/393dp and reserve one system inset without fixed clipping height', () => {
  for (const bottom of [0, 24, 34]) {
    const tree = bar({ bottom }).render(), style = flatten(tree.props.style);
    assert.equal(style.width, '100%'); assert.equal(style.flexDirection, 'row');
    assert.equal(style.paddingBottom, Math.max(bottom, tokens.spacing.sm));
    assert.equal(style.position, undefined); assert.equal(style.maxWidth, undefined);
    for (const tab of tree.props.children) {
      const item = flatten(tab.props.style({ pressed: false }));
      assert.equal(item.flex, 1); assert.equal(item.minWidth, 0); assert.ok(item.minHeight >= 48);
      for (const width of [360, 393]) assert.ok(width / 4 >= 48);
      const label = tab.props.children[1];
      assert.equal(label.props.style[0].textAlign, 'center');
      assert.equal(label.props.numberOfLines, undefined); assert.equal(item.height, undefined);
      assert.ok(label.props.style[0].fontFamily.startsWith('BeVietnamPro-'));
    }
  }
});

test('keyboard hides bar without navigation or state reset; listeners cleaned on unmount', () => {
  const b = bar(); b.render(); b.listeners.get('keyboardDidShow')(); assert.equal(b.render(), null);
  b.listeners.get('keyboardDidHide')(); assert.equal(b.render().props.children.length, 4);
  assert.equal(b.navigations.length, 0);
  b.react.cleanups.forEach(cleanup => cleanup?.()); assert.equal(b.removed(), 2);
});

test('avatar navigates to existing protected Account; back uses tab history or safe Dashboard fallback', () => {
  const calls = []; let back = true;
  const Header = compile('components/layout/MobileHeader.tsx', { ...base, react: { useRef: value => ({ current: value }), useCallback: fn => fn }, '@/features/auth/useCurrentUser': { useCurrentUser: () => ({ user: null, status: 'authenticated' }) }, 'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' }, 'expo-router': { useFocusEffect: fn => fn(), usePathname: () => '/dashboard', router: { navigate: path => calls.push(['navigate', path]), canGoBack: () => back, back: () => calls.push(['back']), replace: path => calls.push(['replace', path]) } } }).MobileHeader;
  const tree = Header({ title: 'Tài khoản', back: true });
  const avatar = nodes(tree).find(n => n.props.accessibilityLabel === 'Mở tài khoản');
  assert.ok(flatten(avatar.props.style({ pressed: false })).minHeight >= 48);
  avatar.props.onPress(); assert.deepEqual(calls[0], ['navigate', '/account']);
  nodes(tree).find(n => n.props.accessibilityLabel === 'Quay lại').props.onPress();
  assert.deepEqual(calls[1], ['back']); back = false;
  nodes(tree).find(n => n.props.accessibilityLabel === 'Quay lại').props.onPress();
  assert.deepEqual(calls[2], ['replace', '/dashboard']);
});

test('create tab reuses exactly one real form; /projects/new compatibility redirects without fake workflow', () => {
  const route = compile('app/(tabs)/create.tsx', { '@/screens/NewProjectScreen': { NewProjectScreen: 'NewProjectScreen' } }).default();
  assert.equal(route.type, 'NewProjectScreen'); assert.equal(route.props.withinTabs, true);
  const legacy = compile('app/projects/new.tsx', { 'expo-router': { Redirect: 'Redirect' } }).default();
  assert.equal(legacy.type, 'Redirect'); assert.equal(legacy.props.href, '/(tabs)/create');
  assert.doesNotMatch(read('app/projects/new.tsx'), /NewProjectScreen/);
  const layout = compile('app/(tabs)/_layout.tsx', { ...base, 'expo-router': { Tabs: Object.assign(() => {}, { Screen: 'Tab' }) }, '@/components/layout/MobileHeader': { MobileHeader: 'MobileHeader' }, '@/components/layout/CustomerBottomNavigation': { CustomerBottomNavigation: 'CustomerBar' }, '@/localization/navigationLabels.mjs': { navigationLabels } }).default();
  assert.equal(layout.props.backBehavior, 'history'); assert.equal(layout.props.screenOptions.freezeOnBlur, false);
  assert.equal(layout.props.unmountOnBlur, undefined);
  assert.equal(layout.props.children.filter(n => n.props.name === 'create').length, 1);
  for (const name of ['history', 'settings']) assert.equal(layout.props.children.find(n => n.props.name === name).props.options.href, null);
  assert.equal(layout.props.children.find(n => n.props.name === 'account').props.options.href, undefined);
});

test('create screen keeps entered form values on tab switches and never picks/uploads on mount', () => {
  const react = hooks(); let picker = 0, uploads = 0;
  const Component = compile('screens/NewProjectScreen.tsx', { ...base, react,
    'expo-document-picker': { getDocumentAsync: () => { picker++; } }, 'expo-router': { router: { replace: () => {} } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@/components/common/Button': { Button: 'Button' }, '@/components/common/Card': { Card: 'Card' }, '@/components/common/Input': { Input: 'Input' }, '@/components/common/ProgressBar': { ProgressBar: 'ProgressBar' },
    '@/components/layout/MobileHeader': { MobileHeader: 'MobileHeader' }, '@/components/layout/MobileScreen': { MobileScreen: 'MobileScreen' },
    '@/features/projects/mediaUpload': { formatFileSize: String, MAX_MEDIA_FILE_SIZE: 500000000, validateMediaFile: () => ({ valid: false }), validateProjectName: () => null },
    '@/features/projects/uploadService': { ProjectUploadError: class extends Error {}, uploadProjectMedia: () => { uploads++; } },
    '@/features/projects/pickerStaging.mjs': { requiresFreshPickerSelection: () => false }, '@/features/projects/stagePickerAsset': { stagePickerAsset: () => assert.fail('No staging') },
    '@/features/projects/projectUtils': { sourceLanguageOptions: [] },
  }).NewProjectScreen;
  const render = () => { react.begin(); return Component({ withinTabs: true }); };
  const tree = render();
  assert.equal(nodes(tree).some(n => n.type === 'MobileHeader'), false);
  assert.equal(nodes(tree).find(n => n.type === 'SafeAreaView').props.edges.length, 0);
  nodes(tree).find(n => n.type === 'Input' && n.props.label === 'Tên dự án').props.onChangeText('Tên chưa gửi');
  bar().render().props.children[1].props.onPress();
  assert.equal(nodes(render()).find(n => n.type === 'Input' && n.props.label === 'Tên dự án').props.value, 'Tên chưa gửi');
  assert.equal(picker, 0); assert.equal(uploads, 0);
});

test('auth guards/session/logout and legacy deep-link routes are preserved, no provider code in navigation', () => {
  const root = read('app/_layout.tsx');
  assert.match(root, /Stack.Protected guard=\{guards.private\}/);
  assert.match(root, /Stack.Screen name="\(tabs\)"/); assert.match(root, /Stack.Screen name="projects\/new"/);
  assert.match(read('screens/AccountScreen.tsx'), /confirmAction\('Đăng xuất\?/);
  assert.match(read('screens/AccountScreen.tsx'), /authService.logout\(\)/);
  assert.match(read('features/auth/authService.ts'), /finally \{ clearTimeout\(timer\); projectRepository.clearSessionCache\(\); await session.clear\(\); \}/);
  for (const file of ['components/layout/CustomerBottomNavigation.tsx', 'app/(tabs)/create.tsx', 'app/projects/new.tsx']) assert.doesNotMatch(read(file), /api\(|Gemini|processingService|translationService|uploadProjectMedia\(/);
});
