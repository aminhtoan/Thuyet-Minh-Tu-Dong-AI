import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { validateLoginValues, validateRegisterValues } from '../src/features/auth/authValidation.mjs';

const element = (type, props) => ({ type, props });
const flatten = value => Object.assign({}, ...[value].flat(Infinity).filter(Boolean));
const tokens = compile('theme/tokens.ts', {}).exports;
const native = {
  StyleSheet: { create: value => value },
  View: 'View', Text: 'Text', TextInput: 'TextInput', Pressable: 'Pressable',
  ScrollView: 'ScrollView', KeyboardAvoidingView: 'KeyboardAvoidingView',
  Platform: { OS: 'android' }, useWindowDimensions: () => ({ width: 375 }),
};

function compile(file, modules) {
  const source = readFileSync(new URL('../src/' + file, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  const exports = {};
  runInNewContext(outputText, {
    exports,
    require: key => {
      assert.ok(key in modules, `Unexpected dependency ${key}: no native/API imports allowed`);
      return modules[key];
    },
  });
  return { exports };
}

function renderComponent(file, name, overrides = {}) {
  const slots = [];
  let cursor = 0;
  const react = {
    useId: () => 'field-id',
    useState: initial => {
      const slot = cursor++;
      if (!(slot in slots)) slots[slot] = initial;
      return [slots[slot], value => { slots[slot] = typeof value === 'function' ? value(slots[slot]) : value; }];
    },
    useRef: initial => {
      const slot = cursor++;
      if (!(slot in slots)) slots[slot] = { current: initial };
      return slots[slot];
    },
  };
  const modules = {
    react,
    'react/jsx-runtime': { jsx: element, jsxs: element },
    'react-native': native,
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@expo/vector-icons/MaterialCommunityIcons': { default: 'Icon' },
    '@/theme/tokens': tokens,
    '@/components/common/Input': { Input: 'Input' },
    '@/components/common/Button': { Button: 'Button' },
    '@/components/common/InlineMessage': { InlineMessage: 'Message' },
    './PasswordField': { PasswordField: 'PasswordField' },
    './validation': { validateLogin: validateLoginValues, validateRegister: validateRegisterValues },
    './authFormStyles': compile('features/auth/authFormStyles.ts', { 'react-native': native, '@/theme/tokens': tokens }).exports,
    ...overrides,
  };
  const component = compile(file, modules).exports[name];
  return props => { cursor = 0; return component(props); };
}

function allNodes(node) {
  if (!node || typeof node !== 'object') return [];
  return [node, ...[node.props?.children].flat(Infinity).flatMap(allNodes)];
}
const find = (node, type) => allNodes(node).find(child => child.type === type);
const fields = node => allNodes(node).filter(child => ['Input', 'PasswordField'].includes(child.type));

test('auth layout preserves safe areas and one flexible scroll region on Android/iOS and small widths', () => {
  for (const os of ['android', 'ios']) {
    for (const width of [320, 375, 393, 768]) {
      const render = renderComponent('components/layout/AuthLayout.tsx', 'AuthLayout', {
        'react-native': { ...native, Platform: { OS: os }, useWindowDimensions: () => ({ width }) },
      });
      const tree = render({ title: 'Tạo tài khoản', description: 'Mô tả', children: 'form', footer: 'footer' });
      assert.deepEqual([...tree.props.edges], ['top', 'right', 'bottom', 'left']);
      const keyboard = find(tree, 'KeyboardAvoidingView');
      assert.equal(keyboard.props.behavior, os === 'ios' ? 'padding' : 'height');
      const scroll = find(tree, 'ScrollView');
      assert.equal(flatten(scroll.props.style).flex, 1);
      assert.equal(flatten(scroll.props.contentContainerStyle).flexGrow, 1);
      assert.equal(scroll.props.keyboardShouldPersistTaps, 'handled');
      assert.equal(scroll.props.keyboardDismissMode, 'on-drag');
      assert.equal(allNodes(tree).filter(node => node.type === 'ScrollView').length, 1);
      assert.equal(flatten(scroll.props.children.props.style).maxWidth, 420);
      for (const node of allNodes(tree)) {
        if (node.props?.importantForAccessibility !== 'no-hide-descendants') {
          assert.equal(flatten(node.props?.style).height, undefined, 'content must grow with text');
        }
        assert.notEqual(node.props?.allowFontScaling, false);
      }
      const texts = allNodes(tree).filter(node => node.type === 'Text');
      for (const text of texts) assert.match(flatten(text.props.style).fontFamily, /^BeVietnamPro-/);
      assert.equal(texts.find(node => node.props.accessibilityRole === 'header').props.children, 'Tạo tài khoản');
    }
  }
});

test('auth fields use readable helpers, native labels, focus/error styling and forward input refs', () => {
  const render = renderComponent('components/common/Input.tsx', 'Input');
  const inputRef = { current: null };
  const props = { appearance: 'auth', inputRef, label: 'Mật khẩu', helperText: 'Hướng dẫn mật khẩu' };
  let tree = render(props);
  const input = find(tree, 'TextInput');
  assert.equal(input.props.ref, inputRef);
  assert.equal(input.props.accessibilityLabel, props.label);
  assert.equal(input.props.accessibilityHint, props.helperText);
  assert.ok(flatten(tree.props.children[1].props.style).minHeight >= 48);
  assert.equal(flatten(tree.props.children[2].props.style).fontSize, 16);
  assert.equal(flatten(tree.props.children[2].props.style).lineHeight, 24);
  input.props.onFocus({});
  tree = render(props);
  assert.equal(flatten(tree.props.children[1].props.style).borderColor, tokens.colors.primary);
  tree = render({ ...props, error: 'Lỗi xác thực dài không bị giới hạn số dòng' });
  assert.equal(find(tree, 'TextInput').props.accessibilityHint, 'Lỗi xác thực dài không bị giới hạn số dòng');
  assert.equal(tree.props.children[2].props.accessibilityLiveRegion, 'polite');
  assert.equal(flatten(tree.props.children[1].props.style).borderColor, tokens.colors.error);
  assert.equal(tree.props.children[2].props.numberOfLines, undefined);
  const defaultTree = render({ label: 'Project field', helperText: 'Existing helper' });
  assert.equal(flatten(defaultTree.props.children[2].props.style).fontSize, 14);
  assert.equal(flatten(defaultTree.props.children[1].props.style).backgroundColor, tokens.colors.surface);
});

test('password visibility keeps content and ref, with a 48dp labeled toggle', () => {
  const render = renderComponent('features/auth/PasswordField.tsx', 'PasswordField');
  const props = { value: 'MockPassword1', inputRef: { current: null } };
  let tree = render(props);
  assert.equal(tree.props.secureTextEntry, true);
  const toggle = tree.props.rightElement;
  assert.equal(toggle.props.accessibilityLabel, 'Hiện mật khẩu');
  assert.equal(flatten(toggle.props.style({ pressed: false })).minHeight, 48);
  toggle.props.onPress();
  tree = render(props);
  assert.equal(tree.props.secureTextEntry, false);
  assert.equal(tree.props.rightElement.props.accessibilityLabel, 'Ẩn mật khẩu');
  assert.equal(tree.props.value, props.value);
  assert.equal(tree.props.inputRef, props.inputRef);
});

test('auth footer keeps existing destinations with wrapping text and 48dp link/focus feedback', () => {
  const render = renderComponent('features/auth/AuthFooter.tsx', 'AuthFooter', { 'expo-router': { Link: 'Link' } });
  const props = { prompt: 'Đã có tài khoản?', label: 'Đăng nhập', href: '/login' };
  let tree = render(props);
  assert.equal(find(tree, 'Link').props.href, '/login');
  assert.equal(find(tree, 'Link').props.asChild, true);
  const pressable = find(tree, 'Pressable');
  assert.equal(pressable.props.accessibilityRole, 'link');
  assert.equal(flatten(pressable.props.style({ pressed: false })).minHeight, 48);
  assert.equal(flatten(tree.props.style).flexWrap, 'wrap');
  pressable.props.onFocus();
  tree = render(props);
  assert.equal(flatten(find(tree, 'Pressable').props.style({ pressed: false })).borderColor, tokens.colors.primary);
});

test('auth CTA can wrap at large font sizes while keeping shared loading/disabled semantics', () => {
  const render = renderComponent('components/common/Button.tsx', 'Button', { './Spinner': { Spinner: 'Spinner' } });
  const tree = render({ wrapLabel: true, loading: true, children: 'Đang tạo tài khoản...' });
  assert.equal(tree.props.disabled, true);
  assert.equal(tree.props.accessibilityState.busy, true);
  assert.ok(flatten(tree.props.style({ pressed: false })).minHeight >= 48);
  const content = tree.props.children[1];
  assert.equal(flatten(content.props.style).flexShrink, 1);
  assert.equal(flatten(content.props.children.props.style).textAlign, 'center');
  assert.equal(content.props.children.props.numberOfLines, undefined);
});

function formHarness(kind, operation = async () => {}) {
  const calls = [];
  const redirects = [];
  const render = renderComponent(`features/auth/${kind}Form.tsx`, `${kind}Form`, {
    'expo-router': { useLocalSearchParams: () => ({}), router: { replace: route => redirects.push(route) } },
    '@/lib/api': { ApiError: class extends Error {} },
    './authService': { authService: {
      login: async values => { calls.push(values); await operation(); },
      register: async values => { calls.push(values); await operation(); },
    } },
  });
  const focused = [];
  const mount = () => {
    const tree = render();
    for (const field of fields(tree)) field.props.inputRef.current = { focus: () => focused.push(field.props.label) };
    return tree;
  };
  const fill = (label, value) => {
    fields(mount()).find(field => field.props.label === label).props.onChangeText(value);
  };
  return { mount, calls, redirects, focused, fill };
}

test('Login/Register retain fields and focus first invalid input without calling auth', async () => {
  for (const kind of ['Login', 'Register']) {
    const h = formHarness(kind);
    let tree = h.mount();
    assert.equal(fields(tree).length, kind === 'Login' ? 2 : 4);
    assert.equal(flatten(tree.props.style).gap, 16);
    for (const field of fields(tree)) assert.equal(field.props.appearance, 'auth');
    await find(tree, 'Button').props.onPress();
    assert.equal(h.focused[0], kind === 'Login' ? 'Email' : 'Họ và tên');
    tree = h.mount();
    assert.ok(fields(tree)[0].props.error);
    assert.equal(h.calls.length, 0);
    if (kind === 'Register') {
      assert.equal(fields(tree)[2].props.helperText, 'Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và chữ số.');
    }
  }
});

test('keyboard Next advances through the existing fields without submitting', () => {
  for (const kind of ['Login', 'Register']) {
    const h = formHarness(kind);
    const inputs = fields(h.mount());
    for (let index = 0; index < inputs.length - 1; index++) {
      assert.equal(inputs[index].props.submitBehavior, 'submit');
      inputs[index].props.onSubmitEditing();
      assert.equal(h.focused.at(-1), inputs[index + 1].props.label);
    }
    assert.equal(h.calls.length, 0);
  }
});

test('auth requests stay single-flight, retain trim/redirect contract and loading state', async () => {
  for (const kind of ['Login', 'Register']) {
    let complete;
    const pending = new Promise(resolve => { complete = resolve; });
    const h = formHarness(kind, () => pending);
    if (kind === 'Register') h.fill('Họ và tên', ' Test User ');
    h.fill('Email', ' test@example.invalid ');
    h.fill('Mật khẩu', 'MockPassword1');
    if (kind === 'Register') h.fill('Xác nhận mật khẩu', 'MockPassword1');
    const button = find(h.mount(), 'Button');
    const request = button.props.onPress();
    await button.props.onPress();
    assert.equal(h.calls.length, 1);
    assert.equal(h.calls[0].email, 'test@example.invalid');
    assert.equal(find(h.mount(), 'Button').props.loading, true);
    complete();
    await request;
    assert.equal(find(h.mount(), 'Button').props.loading, false);
    if (kind === 'Register') assert.equal(h.redirects[0].pathname, '/login');
    else assert.equal(h.redirects.length, 0, 'login navigation remains owned by auth guards');
  }
});

test('request failures keep entered values and show readable error without success navigation', async () => {
  for (const kind of ['Login', 'Register']) {
    const h = formHarness(kind, async () => { throw new Error('mock transport error'); });
    if (kind === 'Register') h.fill('Họ và tên', 'Test User');
    h.fill('Email', 'test@example.invalid');
    h.fill('Mật khẩu', 'MockPassword1');
    if (kind === 'Register') h.fill('Xác nhận mật khẩu', 'MockPassword1');
    await find(h.mount(), 'Button').props.onPress();
    const tree = h.mount();
    const error = find(tree, 'Message');
    assert.equal(error.props.variant, 'error');
    assert.equal(flatten(error.props.textStyle).fontSize, 16);
    assert.equal(fields(tree).find(field => field.props.label === 'Email').props.value, 'test@example.invalid');
    assert.equal(h.redirects.length, 0);
    assert.equal(find(tree, 'Button').props.loading, false);
  }
});
