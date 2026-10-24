import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { authRouteGuards } from '../src/features/auth/authNavigation.mjs';

// Render the real route components with native/session dependencies stubbed.
// No SecureStore, network, login or refresh requests are executed.
let status = 'loading';
const element = (type, props) => ({ type, props });
const Stack = Object.assign(() => null, { Screen: 'Screen', Protected: 'Protected' });
function loadRoute(name) {
  const source = readFileSync(new URL(`../src/${name.startsWith('features/') ? name : 'app/' + name}.tsx`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  const exports = {};
  const modules = {
    'react/jsx-runtime': { jsx: element, jsxs: element },
    'react-native': { View: 'View', ActivityIndicator: 'Spinner', StyleSheet: { create: value => value } },
    'expo-router': { Redirect: 'Redirect', Stack },
    'expo-font': { useFonts: () => [true, null] },
    'expo-status-bar': { StatusBar: 'StatusBar' },
    'react-native-safe-area-context': { SafeAreaProvider: 'SafeAreaProvider' },
    '@/features/auth/AuthBoundary': { AuthBoundary: 'AuthBoundary', useAuthStatus: () => status },
    './AuthBoundary': { useAuthStatus: () => status },
    '@/features/museum/MuseumScreens': { MuseumHomeScreen: () => ({ type: 'MuseumHome' }) },
    '@/features/auth/authNavigation.mjs': { authRouteGuards },
    '@/theme/tokens': { colors: {} },
  };
  runInNewContext(outputText, {
    exports,
    require: key => {
      if (key.endsWith('.ttf')) return 1;
      assert.ok(key in modules, `Unexpected dependency: ${key}`);
      return modules[key];
    },
  });
  return exports.default ?? exports.CustomerEntry;
}
const Index = loadRoute('index');
const CustomerEntry = loadRoute('features/auth/CustomerEntry');
const RootLayout = loadRoute('_layout');
function navigator() {
  return RootLayout().props.children.props.children[0].type();
}

test('cold start opens public museum for every auth state, workspace waits during restoration', () => {
  for (const next of ['loading', 'unauthenticated', 'authenticated']) {
    status = next;
    assert.equal(Index().type, 'MuseumHome');
  }
  status = 'loading';
  const result = CustomerEntry();
  assert.equal(result.type, 'View');
  assert.equal(result.props.children.type, 'Spinner');
});

test('workspace redirects logged-out sessions to existing login and restored sessions to dashboard', () => {
  status = 'unauthenticated';
  assert.equal(CustomerEntry().props.href, '/login');
  status = 'authenticated';
  assert.equal(CustomerEntry().props.href, '/(tabs)/dashboard');
});

test('reload and login/logout transitions keep museum public and workspace auth-aware', () => {
  for (const next of ['unauthenticated', 'authenticated', 'unauthenticated', 'authenticated']) {
    status = next;
    assert.equal(Index().type, 'MuseumHome');
    assert.equal(CustomerEntry().props.href, next === 'authenticated' ? '/(tabs)/dashboard' : '/login');
  }
});

test('root stays registered outside protected groups for every session state', () => {
  for (const next of Object.keys(authRouteGuards)) {
    status = next;
    const children = navigator().props.children;
    const root = children[0];
    const [publicGroup, privateGroup] = children.filter(child => child.type === 'Protected');
    assert.equal(root.type, 'Screen');
    assert.equal(root.props.name, 'index');
    assert.equal(publicGroup.props.guard, authRouteGuards[next].public);
    assert.equal(privateGroup.props.guard, authRouteGuards[next].private);
    assert.equal(publicGroup.props.redirectTo, '/khong-gian-cua-toi');
    assert.equal(privateGroup.props.redirectTo, '/');
    for (const name of ['kham-pha', 'kham-pha/[slug]', 'thuyet-minh', 'thuyet-minh/[slug]', 've-bao-tang', 'khong-gian-cua-toi']) {
      assert.ok(children.some(child => child.type === 'Screen' && child.props.name === name));
    }
  }
});

test('existing deep-link screen registrations and URL scheme remain unchanged', () => {
  status = 'authenticated';
  const privateGroup = navigator().props.children.filter(child => child.type === 'Protected')[1];
  const routes = privateGroup.props.children.map(child => child.props.name);
  assert.ok(routes.includes('(tabs)'));
  assert.ok(routes.includes('projects/[projectId]/transcript'));
  assert.ok(routes.includes('projects/[projectId]/result'));
  assert.equal(navigator().props.children.some(child => child.props.name === '+not-found'), false);
  const config = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo;
  assert.equal(new URL(`${config.scheme}:///`).pathname, '/');
  assert.equal(new URL(`${config.scheme}:///dashboard`).pathname, '/dashboard');
});
