import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { createSessionRevision } from '../src/features/auth/sessionRevision.mjs';
import { authRouteGuards } from '../src/features/auth/authNavigation.mjs';

const read = file => readFileSync(new URL('../src/' + file, import.meta.url), 'utf8');
const jsx = (type, props) => ({ type, props });
function compile(file, imports = {}, globals = {}) {
  const exports = {}, modules = { 'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', StyleSheet: { create: x => x } }, ...imports };
  runInNewContext(ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText,
    { exports, URLSearchParams, Headers, FormData, AbortController, setTimeout, clearTimeout, ...globals, require: name => { assert.ok(name in modules, `Unmocked import ${name}`); return modules[name]; } });
  return exports;
}
const tokens = compile('theme/tokens.ts');
const nodes = n => !n || typeof n !== 'object' ? [] : [n, ...[n.props?.children].flat(Infinity).flatMap(nodes)];
const text = n => nodes(n).flatMap(n => [n.props.children].flat(Infinity).filter(v => typeof v === 'string'));
function hooks() { const values = []; let cursor = 0; return { begin: () => { cursor = 0; }, useState: initial => { const slot = cursor++; if (!(slot in values)) values[slot] = initial; return [values[slot], next => { values[slot] = typeof next === 'function' ? next(values[slot]) : next; }]; }, useRef: initial => { const slot = cursor++; return values[slot] ??= { current: initial }; }, useCallback: fn => fn }; }
function header({ status = 'authenticated', user = null, pathname = '/dashboard', back = true } = {}) {
  const react = hooks(), calls = [];
  const component = compile('components/layout/MobileHeader.tsx', { react, '@expo/vector-icons/MaterialCommunityIcons': { __esModule: true, default: 'Icon' }, '@/theme/tokens': tokens,
    '@/features/auth/useCurrentUser': { useCurrentUser: () => ({ user, status }) }, 'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'expo-router': { usePathname: () => pathname, useFocusEffect: fn => fn(), router: { navigate: path => calls.push(path), canGoBack: () => back, back: () => calls.push('back'), replace: path => calls.push(path) } },
  }).MobileHeader;
  return { tree: component({ title: tokens.customerBrand.name, back: true }), calls };
}
test('icon and brand text share one48dp home link, duplicate presses never navigate twice or to Dashboard', () => {
  const h = header(), link = nodes(h.tree).find(n => n.props.accessibilityLabel === 'Về trang chủ bảo tàng');
  assert.ok(nodes(link).some(n => n.type === 'Icon')); assert.ok(text(link).includes('Thuyết minh bảo tàng'));
  assert.equal(link.props.accessibilityRole, 'link');
  const style = Object.assign({}, ...link.props.style({ pressed: false }).filter(Boolean)); assert.ok(style.minHeight >= 48); assert.equal(style.flex, 1);
  link.props.onPress(); link.props.onPress(); assert.deepEqual(h.calls, ['/']);
  assert.match(read('app/index.tsx'), /MuseumHomeScreen as default/);
});
test('avatar uses current customer initial, opens Account or existing Login, has48dp and safe back', () => {
  const user = { fullName: 'Nguyễn Minh', email: 'isolated@example.invalid' };
  const h = header({ user }), avatar = nodes(h.tree).find(n => n.props.accessibilityLabel === 'Mở tài khoản');
  assert.ok(text(avatar).includes('N')); avatar.props.onPress(); avatar.props.onPress(); assert.deepEqual(h.calls, ['/account']);
  const guest = header({ status: 'unauthenticated' }); nodes(guest.tree).find(n => n.props.accessibilityLabel === 'Mở tài khoản').props.onPress(); assert.deepEqual(guest.calls, ['/login']);
  const loading = header({ status: 'loading' }); assert.equal(nodes(loading.tree).find(n => n.props.accessibilityLabel === 'Mở tài khoản').props.disabled, true);
  nodes(h.tree).find(n => n.props.accessibilityLabel === 'Quay lại').props.onPress(); assert.equal(h.calls.at(-1), 'back');
  const account = header({ pathname: '/account' }); nodes(account.tree).find(n => n.props.accessibilityLabel === 'Mở tài khoản').props.onPress(); nodes(account.tree).find(n => n.props.accessibilityLabel === 'Về trang chủ bảo tàng').props.onPress(); assert.deepEqual(account.calls, ['/']);
});

const settle = () => new Promise(resolve => setImmediate(resolve));
test('current-user loader shows only current-session CUSTOMER and rejects late profile response after logout/login', async () => {
  const react = hooks(), requests = []; let focus, revision = 1, status = 'authenticated';
  const hook = compile('features/auth/useCurrentUser.ts', { react: { ...react, useSyncExternalStore: (_subscribe, get) => get() }, 'expo-router': { useFocusEffect: fn => { focus = fn; } },
    '@/lib/api': { session: { getRevision: () => revision, getAuthStatus: () => status, subscribe: () => () => {} } },
    './authService': { authService: { me: () => new Promise(resolve => requests.push(resolve)) } },
  }).useCurrentUser;
  const render = () => { react.begin(); return hook(); };
  render(); focus(); requests[0]({ user: { id: 'A', fullName: 'A', role: 'CUSTOMER', email: 'a@isolated.invalid' } }); await settle(); assert.equal(render().user.id, 'A');
  status = 'unauthenticated'; revision++; assert.equal(render().user, null);
  status = 'authenticated'; revision++; render(); const cleanup = focus();
  const reload = render().reload(); requests[1]({ user: { id: 'old', fullName: 'Old', role: 'CUSTOMER' } }); await settle(); assert.equal(render().user, null);
  requests[2]({ user: { id: 'B', fullName: 'B', role: 'CUSTOMER', email: 'b@isolated.invalid' } }); await reload; assert.equal(render().user.id, 'B');
  const pending = render().reload(); cleanup(); requests[3]({ user: { id: 'late', role: 'CUSTOMER' } }); await pending; assert.equal(render().user, null);
});

function account(state = {}) {
  const react = hooks(), navigation = []; let logouts = 0, confirms = 0;
  const data = { user: { id: 'B', role: 'CUSTOMER', fullName: 'Bình', email: 'b@isolated.invalid' }, loading: false, error: '', reload: () => {}, ...state };
  const components = Object.fromEntries(['Button', 'Card', 'Spinner', 'ErrorState'].map(n => ['@/components/common/' + n, { [n]: n }]));
  const component = compile('screens/AccountScreen.tsx', { react, ...components, 'expo-router': { router: { replace: path => navigation.push(path) } }, '@/components/layout/MobileScreen': { MobileScreen: 'MobileScreen' }, '@/features/auth/useCurrentUser': { useCurrentUser: () => data },
    '@/features/auth/authService': { authService: { logout: async () => { logouts++; } } }, '@/lib/api': { session: { getAuthStatus: () => 'unauthenticated' } }, '@/lib/confirm': { confirmAction: async () => { confirms++; return true; } }, '@/localization/confirmationMessages.mjs': { confirmationMessages: { logout: 'fixture' } }, '@/theme/tokens': tokens,
  }).AccountScreen;
  return { tree: component(), logouts: () => logouts, confirms: () => confirms, navigation };
}
test('Account renders actual current name/email, no stale profile on empty/error/loading states', () => {
  const tree = account().tree; assert.ok(text(tree).includes('Bình')); assert.ok(text(tree).includes('b@isolated.invalid'));
  for (const state of [{ user: null }, { user: null, loading: true }, { user: null, error: 'GET failed' }]) assert.equal(text(account(state).tree).includes('b@isolated.invalid'), false);
});
test('logout confirmation has synchronous duplicate protection; no real account is used', async () => {
  const a = account(), button = nodes(a.tree).find(n => n.type === 'Button'); button.props.onPress(); button.props.onPress(); await settle();
  assert.equal(a.confirms(), 1); assert.equal(a.logouts(), 1);
  assert.deepEqual(a.navigation, ['/login']);
});

test('real session/authService with isolated SecureStore logout clears token/cache, guards block, login B creates new session', async () => {
  let stored = null, activeUser = 'A', failLogout = false, cleared = 0;
  const apiModule = compile('lib/api.ts', { 'expo-secure-store': { getItemAsync: async () => stored, setItemAsync: async (_key, value) => { stored = value; }, deleteItemAsync: async () => { stored = null; } }, '../config/env': { env: { apiBaseUrl: 'https://fixture.invalid' } }, '../features/auth/sessionRevision.mjs': { createSessionRevision } },
    { fetch: async (url) => { if (url.endsWith('/auth/logout') && failLogout) throw new Error('offline mock'); return { status: 200, json: async () => ({ success: true, data: { user: { id: activeUser, fullName: activeUser, email: `${activeUser}@fixture.invalid`, role: 'CUSTOMER' }, accessToken: 'fixture-access-' + activeUser, refreshToken: 'fixture-refresh-' + activeUser } }) }; } });
  const auth = compile('features/auth/authService.ts', { '../../lib/api': apiModule, '../projects/projectRepository': { projectRepository: { clearSessionCache: () => { cleared++; } } } }).authService;
  await auth.login({ email: 'a@fixture.invalid', password: 'fixture' }); assert.equal(apiModule.session.getAuthStatus(), 'authenticated');
  await auth.logout(); assert.equal(await apiModule.session.get(), null); assert.equal(authRouteGuards[apiModule.session.getAuthStatus()].private, false);
  activeUser = 'B'; await auth.login({ email: 'b@fixture.invalid', password: 'fixture' }); assert.equal((await auth.me()).user.id, 'B'); assert.equal(authRouteGuards[apiModule.session.getAuthStatus()].private, true);
  failLogout = true; await assert.rejects(auth.logout(), /offline mock/); assert.equal(await apiModule.session.get(), null); assert.equal(apiModule.session.getAuthStatus(), 'unauthenticated'); assert.equal(cleared, 4);
});

test('clearing project cache prevents delayed previous-account reads from restoring data', async () => {
  let resolveList, resolveProject;
  const api = async path => {
    if (path.startsWith('/projects?')) return new Promise(resolve => { resolveList = resolve; });
    if (path === '/projects/old') return new Promise(resolve => { resolveProject = resolve; });
    assert.fail('Old response should not initiate metadata reads after session cache clear');
  };
  const repo = compile('features/projects/projectRepository.ts', { '../../lib/api': { api, ApiError: class extends Error {} }, './projectEditing.mjs': { mergeUpdatedProject: () => {} } }).projectRepository;
  const list = repo.refresh(), one = repo.getProject('old'); repo.clearSessionCache();
  resolveList({ projects: [{ id: 'old' }] }); resolveProject({ project: { id: 'old' } });
  await list; await assert.rejects(one, /PROJECT_SESSION_CHANGED/); assert.equal(repo.getAll().length, 0);
});
test('four Customer tabs, Public Museum screens and protected routing stay intact', () => {
  const bar = read('components/layout/CustomerBottomNavigation.tsx');
  for (const route of ['dashboard', 'projects', 'create', 'library']) assert.match(bar, new RegExp(`route: '${route}'`));
  assert.doesNotMatch(bar, /route: 'account'|route: 'history'/);
  assert.match(read('app/_layout.tsx'), /Stack.Protected guard=\{guards.private\} redirectTo="\/"/);
  assert.match(read('app/(tabs)/account.tsx'), /AccountScreen/);
});

test('installed SDK58 reproduces hidden Account redirect to Dashboard; fixed Account remains reachable without a fifth bar item', () => {
  let processScreens;
  const tabsSdk = readFileSync(new URL('../node_modules/expo-router/build/layouts/TabsClient.js', import.meta.url), 'utf8');
  runInNewContext(tabsSdk, { exports: {}, require: name => name === '../standard-navigation' ? { integrateWithRouter: (_component, _router, config) => { processScreens = config.processScreens; return {}; } } : {} });
  const before = processScreens([{ name: 'account', options: { href: null } }])[0];
  assert.equal(before.options.hidden, true);
  const layout = compile('app/(tabs)/_layout.tsx', {
    'expo-router': { Tabs: Object.assign(() => {}, { Screen: 'Tab' }) }, '@/components/layout/MobileHeader': { MobileHeader: 'Header' }, '@/components/layout/CustomerBottomNavigation': { CustomerBottomNavigation: 'Bar' }, '@/theme/tokens': tokens,
    '@/localization/navigationLabels.mjs': { navigationLabels: { account: 'Tài khoản' }, libraryNavigationLabel: 'Thư viện thuyết minh' },
  }).default();
  const account = layout.props.children.find(n => n?.props?.name === 'account');
  assert.equal(processScreens([{ name: 'account', options: account.props.options }])[0].options.hidden, undefined);
  const redirects = [], sdk = {};
  const imports = {
    react: { useMemo: fn => fn(), useEffect: fn => fn() }, '../Route': { useRouteNode: () => ({}) }, '../constants': { NOT_FOUND_ROUTE_NAME: '+not-found' },
    '../global-state/useRouterActions': { useRouterActions: () => ({ replace: path => redirects.push(path) }) }, '../layouts/GuardContext': { useGuardRedirect: () => undefined },
    '../link/preview/PreviewRouteContext': { useIsPreview: () => false }, '../react-navigation/native': { useIsFocused: () => true }, '../routeNode': { getValidInitialRouteName: () => 'dashboard' },
    '../utils/orderRoutesByRouteNames': { orderRoutesByRouteNames: routes => routes }, './useBuildHref': { useBuildHref: () => route => '/' + route.name },
  };
  runInNewContext(readFileSync(new URL('../node_modules/expo-router/build/standard-navigation/useVisibleTabsWithRedirect.js', import.meta.url), 'utf8'), { exports: sdk, __DEV__: false, require: name => { assert.ok(name in imports); return imports[name]; } });
  const input = hidden => ({ routes: [{ name: 'dashboard', key: 'dashboard' }, { name: 'account', key: 'account' }], routeNames: ['dashboard', 'account'], focusedRouteKey: 'account', descriptors: { dashboard: { routeSource: 'layout', options: {} }, account: { routeSource: 'layout', options: { hidden } } } });
  sdk.useVisibleTabsWithRedirect(input(true)); assert.deepEqual(redirects, ['/dashboard']);
  redirects.length = 0; sdk.useVisibleTabsWithRedirect(input(false)); assert.deepEqual(redirects, []);
});

test('profile pending forever terminates at15s with error; late response cannot replace timeout, manual GET retry succeeds', async () => {
  const react = hooks(), requests = [], timers = new Map(); let focus, tick = 0;
  const hook = compile('features/auth/useCurrentUser.ts', {
    react: { ...react, useSyncExternalStore: (_subscribe, snapshot) => snapshot() }, 'expo-router': { useFocusEffect: fn => { focus = fn; } },
    '@/lib/api': { session: { getRevision: () => 1, getAuthStatus: () => 'authenticated', subscribe: () => () => {} } }, './authService': { authService: { me: signal => new Promise((resolve, reject) => requests.push({ signal, resolve, reject })) } },
  }, { setTimeout: (fn, ms) => { assert.equal(ms, 15_000); timers.set(++tick, fn); return tick; }, clearTimeout: id => timers.delete(id) }).useCurrentUser;
  const render = () => { react.begin(); return hook(); };
  render(); focus(); assert.equal(render().loading, true);
  [...timers.values()][0](); await settle(); assert.equal(render().loading, false); assert.match(render().error, /quá thời gian chờ/); assert.equal(requests[0].signal.aborted, true);
  requests[0].resolve({ user: { id: 'late', fullName: 'Late', role: 'CUSTOMER' } }); await settle(); assert.equal(render().user, null);
  const retry = render().reload(); requests[1].resolve({ user: { id: 'current', fullName: 'Current', email: 'fixture@example.invalid', role: 'CUSTOMER' } }); await retry;
  assert.equal(render().loading, false); assert.equal(render().user.id, 'current'); assert.equal(timers.size, 0);
  const failed = render().reload(); requests[2].reject(new Error('test-only API failure')); await failed; assert.equal(render().loading, false); assert.match(render().error, /Không thể tải/);
});

test('logout timeout aborts revocation request but still clears local session/cache, no retry', async () => {
  let fire, signal, clears = 0, cacheClears = 0, calls = 0;
  const auth = compile('features/auth/authService.ts', {
    '../../lib/api': { session: { get: async () => ({ refreshToken: 'isolated-fixture' }), clear: async () => { clears++; } }, api: async (_path, init, retry) => {
      calls++; assert.equal(retry, false); signal = init.signal;
      return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('fixture abort'))));
    } }, '../projects/projectRepository': { projectRepository: { clearSessionCache: () => { cacheClears++; } } },
  }, { setTimeout: (fn, ms) => { assert.equal(ms, 15_000); fire = fn; return 1; }, clearTimeout: () => {} }).authService;
  const done = assert.rejects(auth.logout(), /fixture abort/); await settle(); fire(); await done;
  assert.equal(signal.aborted, true); assert.equal(calls, 1); assert.equal(clears, 1); assert.equal(cacheClears, 1);
});
