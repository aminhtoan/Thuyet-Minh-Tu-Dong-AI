import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { projectStatusLabels } from '../src/localization/statusLabels.mjs';
import { navigationLabels } from '../src/localization/navigationLabels.mjs';

const jsx = (type, props) => ({ type, props });
const flatten = style => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
const read = file => readFileSync(new URL('../src/' + file, import.meta.url), 'utf8');
const native = { View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView', StyleSheet: { create: value => value } };
function compile(file, extra = {}) {
  const modules = { 'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': native, ...extra };
  const exports = {};
  const { outputText } = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } });
  runInNewContext(outputText, { exports, require: key => {
    assert.ok(key in modules, `No unmocked native/API dependency: ${key}`);
    return modules[key];
  } });
  return exports;
}
const tokens = compile('theme/tokens.ts');
const base = { '@/theme/tokens': tokens };
const utils = compile('features/projects/projectUtils.ts', {
  './languages': compile('features/projects/languages.ts'), '../../localization/statusLabels.mjs': { projectStatusLabels },
});
const actions = compile('features/projects/projectAction.ts');
function nodes(node) {
  if (!node || typeof node !== 'object') return [];
  return [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)];
}
const text = tree => nodes(tree).flatMap(node => [node.props?.children].flat(Infinity).filter(value => typeof value === 'string'));
const project = (status = 'TRANSLATING', progress = 100) => Object.freeze({
  id: 'mock-only', name: 'Tên dự án dài được giữ nguyên để kiểm tra xuống dòng và truy cập',
  status, progress, sourceLanguage: 'vi', targetLanguage: 'en', mediaType: 'VIDEO', updatedAt: '2026-10-24T08:00:00Z',
});
function screen(state = {}) {
  const pushes = [];
  let reloads = 0;
  const component = compile('screens/DashboardScreen.tsx', {
    ...base, 'expo-router': { router: { push: path => pushes.push(path) } },
    '@expo/vector-icons/MaterialCommunityIcons': { default: 'Icon' },
    '@/components/common/Button': { Button: 'Button' }, '@/components/common/Card': { Card: 'Card' },
    '@/components/common/EmptyState': { EmptyState: 'EmptyState' }, '@/components/common/ErrorState': { ErrorState: 'ErrorState' },
    '@/components/common/Spinner': { Spinner: 'Spinner' }, '@/components/layout/MobileScreen': { MobileScreen: 'MobileScreen' },
    '@/features/projects/ProjectCard': { ProjectCard: 'ProjectCard' }, '@/features/projects/DashboardHero': { DashboardHero: 'DashboardHero' },
    '@/features/projects/DashboardCharts': { DashboardCharts: 'DashboardCharts' },
    '@/features/projects/projectUtils': utils,
    '@/features/projects/useDashboardProjects': { useDashboardProjects: () => ({ projects: [], complete: true, isLoading: false, error: null, reload: () => { reloads++; }, ...state }) },
  }).DashboardScreen;
  return { tree: component(), pushes, reloads: () => reloads };
}
function card(record, dashboard = true) {
  const pushes = [];
  const tree = compile('features/projects/ProjectCard.tsx', {
    ...base, 'expo-router': { router: { push: path => pushes.push(path) } },
    '@expo/vector-icons/MaterialCommunityIcons': { default: 'Icon' },
    '@/components/common/Button': { Button: 'Button' }, '@/components/common/Card': { Card: 'Card' },
    '@/components/common/ProgressBar': { ProgressBar: 'ProgressBar' },
    './projectAction': actions, './projectUtils': utils, './ProjectStatusBadge': { ProjectStatusBadge: 'StatusBadge' },
    './DashboardResumeButton': { DashboardResumeButton: 'DashboardResumeButton' },
  }).ProjectCard({ project: record, dashboard });
  return { tree, pushes };
}

test('Dashboard removes KPI cluster absent from Web, retains charts and existing status selectors', () => {
  const projects = Object.freeze([project(), project('COMPLETED'), project('FAILED'), project('DRAFT')]);
  const { tree } = screen({ projects });
  const stats = nodes(tree).filter(node => node.type === 'StatCard');
  assert.equal(stats.length, 0);
  assert.equal(utils.calculateProjectStatistics(projects).completed, 1);
  assert.equal(nodes(tree).filter(node => node.type === 'DashboardCharts').length, 1);
  assert.doesNotMatch(read('screens/DashboardScreen.tsx'), /StatCard|statistics\.total/);
  assert.ok(nodes(tree).filter(node => node.type === 'ProjectCard').every(node => node.props.dashboard));
});

test('KPI cards share flexible sizing and Be Vietnam Pro without fixed clipping heights', () => {
  const component = compile('features/projects/StatCard.tsx', { ...base, '@/components/common/Card': { Card: 'Card' } }).StatCard;
  for (const tone of ['default', 'success', 'info', 'error']) {
    const tree = component({ label: 'Tổng số dự án', value: 1200, tone });
    const style = flatten(tree.props.style);
    assert.equal(style.flex, 1);
    assert.equal(style.minWidth, 0);
    assert.equal(style.width, undefined);
    assert.equal(style.height, undefined);
    assert.ok(style.minHeight >= 100);
    const texts = nodes(tree).filter(node => node.type === 'Text');
    assert.equal(texts[1].props.style.fontFamily, tokens.typography.family.bold);
    assert.ok(texts[1].props.style.fontSize >= 28);
  }
});

test('loading/error/empty states stay distinct; no zero KPIs while loading or failed', () => {
  const loading = screen({ isLoading: true }).tree;
  assert.ok(nodes(loading).some(node => node.type === 'Spinner'));
  assert.equal(nodes(loading).some(node => ['StatCard', 'EmptyState'].includes(node.type)), false);
  assert.equal(nodes(loading).some(node => node.type === 'DashboardCharts'), false);
  const error = screen({ error: 'Không thể kết nối' });
  const feedback = nodes(error.tree).find(node => node.type === 'ErrorState');
  assert.ok(feedback);
  assert.equal(nodes(error.tree).some(node => node.type === 'StatCard'), false);
  assert.equal(nodes(error.tree).some(node => node.type === 'DashboardCharts'), false);
  feedback.props.onRetry();
  assert.equal(error.reloads(), 1);
  const empty = screen().tree;
  assert.ok(nodes(empty).some(node => node.type === 'EmptyState'));
  assert.equal(nodes(empty).filter(node => node.type === 'StatCard').length, 0);
  assert.equal(nodes(empty).filter(node => node.type === 'DashboardCharts').length, 1);
});

test('Dashboard CTA and quick actions retain routes and minimum 48dp targets', () => {
  const rendered = screen({ projects: [project()] });
  assert.equal(rendered.tree.props.dashboard, true);
  assert.equal(rendered.tree.props.headerContent.type, 'DashboardHero');
  for (const control of nodes(rendered.tree).filter(node => node.type === 'Pressable')) {
    const style = flatten(control.props.style({ pressed: false }));
    assert.ok(style.minHeight >= 48);
    control.props.onPress();
  }
  assert.deepEqual(rendered.pushes, ['/projects/new', '/projects', '/projects', '/projects', '/projects']);
});

test('compact project cards preserve status, raw progress, two-line name and navigation-only actions', () => {
  const record = project('TRANSLATING', 100);
  const { tree, pushes } = card(record);
  assert.equal(nodes(tree).find(node => node.type === 'StatusBadge').props.status, 'TRANSLATING');
  assert.equal(nodes(tree).find(node => node.type === 'ProgressBar').props.value, 100);
  assert.ok(text(tree).includes(record.name));
  assert.equal(nodes(tree).find(node => node.props.children === record.name).props.numberOfLines, 2);
  const buttons = nodes(tree).filter(node => node.type === 'Button');
  assert.deepEqual(buttons.map(node => node.props.children), ['Chi tiết']);
  assert.equal(nodes(tree).find(node => node.type === 'DashboardResumeButton').props.projectId, record.id);
  for (const button of buttons) {
    assert.equal(button.props.size, 'md');
    assert.equal(button.props.wrapLabel, true);
    button.props.onPress();
  }
  assert.equal(pushes[0], '/projects/mock-only');
  assert.equal(pushes.length, 1, 'resume performs its own fresh, guarded read');
  assert.equal(record.status, 'TRANSLATING');
  assert.equal(flatten(nodes(tree).find(node => node.type === 'View').props.style).flexDirection, 'column');
});

test('COMPLETED/FAILED/DRAFT actions and non-Dashboard card defaults are unchanged', () => {
  for (const [status, expected, path] of [['COMPLETED', 'Xem kết quả', '/projects/[projectId]/result'], ['FAILED', 'Thử xử lý lại', '/projects/[projectId]/generate'], ['DRAFT', 'Mở bản ghi', '/projects/[projectId]/transcript']]) {
    const { tree, pushes } = card(project(status), false);
    const buttons = nodes(tree).filter(node => node.type === 'Button');
    assert.equal(buttons[1].props.children, expected);
    assert.equal(buttons[1].props.size, 'sm');
    assert.equal(buttons[1].props.wrapLabel ?? false, false);
    buttons[1].props.onPress();
    assert.equal(pushes[0].pathname, path);
    assert.equal(nodes(tree).some(node => node.type === 'ProgressBar'), false);
    assert.equal(flatten(tree.props.style).padding, undefined);
  }
});

test('Dashboard detail/resume actions share one equal-width row at360/393dp without changing other cards', () => {
  const { tree } = card(project());
  const toolbar = nodes(tree).find(node => node.props.accessibilityRole === 'toolbar');
  const style = flatten(toolbar.props.style);
  assert.equal(style.flexDirection, 'row');
  assert.equal(style.flexWrap, 'nowrap');
  assert.equal(style.alignItems, 'flex-start', 'error text must not stretch the other action');
  assert.ok(style.gap >= 8 && style.gap <= 12);
  assert.equal(toolbar.props.children.length, 2);
  for (const cell of toolbar.props.children) {
    assert.equal(cell.type, 'View');
    assert.equal(flatten(cell.props.style).flex, 1);
    assert.equal(flatten(cell.props.style).minWidth, 0);
    assert.equal(flatten(cell.props.style).width, undefined);
  }
  assert.equal(toolbar.props.children[0].props.children.type, 'Button');
  assert.equal(toolbar.props.children[0].props.children.props.wrapLabel, true);
  assert.equal(toolbar.props.children[0].props.children.props.size, 'md');
  assert.equal(toolbar.props.children[1].props.children.type, 'DashboardResumeButton');
  for (const viewport of [360, 393]) {
    const cardPadding = flatten(tree.props.style).padding;
    const actionWidth = (viewport - 2 * tokens.spacing.md - 2 * cardPadding - style.gap) / 2;
    assert.ok(actionWidth >= 140, `each action fits narrow screen ${viewport}`);
  }
  const normalToolbar = nodes(card(project(), false).tree).find(node => node.props.accessibilityRole === 'toolbar');
  assert.deepEqual(Array.from(normalToolbar.props.children, node => node.type), ['Button', 'Button']);
  assert.equal(flatten(normalToolbar.props.style).flexWrap, 'wrap');
  const Button = compile('components/common/Button.tsx', { ...base, './Spinner': { Spinner: 'Spinner' } }).Button;
  const actualButton = Button({ children: 'Tiếp tục', wrapLabel: true });
  assert.ok(flatten(actualButton.props.style({ pressed: false })).minHeight >= 48);
  const label = nodes(actualButton).find(node => node.type === 'Text');
  assert.equal(label.props.numberOfLines, undefined);
  assert.equal(flatten(label.props.style).textAlign, 'center');
  assert.equal(flatten(actualButton.props.children[1].props.style).flexShrink, 1);
});

test('Dashboard header/scroll use shared brand/font and no duplicated bottom safe area', () => {
  const header = compile('components/layout/MobileHeader.tsx', {
    ...base, 'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'expo-router': { router: { navigate: () => {}, canGoBack: () => false, replace: () => {} } },
    '@expo/vector-icons/MaterialCommunityIcons': { default: 'Icon' },
  }).MobileHeader({ title: tokens.customerBrand.name, dashboard: true });
  assert.ok(text(header).includes('Thuyết minh bảo tàng'));
  assert.deepEqual([...header.props.edges], ['top']);
  assert.equal(flatten(nodes(header).find(node => node.props.children === tokens.customerBrand.name).props.style).fontFamily, tokens.typography.family.semibold);
  const mobileScreen = compile('components/layout/MobileScreen.tsx', base).MobileScreen;
  const tree = mobileScreen({ ...screen().tree.props });
  assert.equal(tree.type, 'ScrollView');
  assert.equal(flatten(tree.props.style).flex, 1);
  assert.ok(flatten(tree.props.contentContainerStyle).paddingBottom >= tokens.spacing.lg);
  assert.equal(tree.props.children[0].type, 'DashboardHero');
  assert.equal(nodes(tree).filter(node => node.props.children === 'Khởi tạo hành trình thuyết minh đa ngôn ngữ').length, 0, 'no duplicate title outside Hero');
});

test('Customer tab routes preserve Dashboard, Projects and create; account/history remain hidden and separate from Public', () => {
  const tree = compile('app/(tabs)/_layout.tsx', {
    ...base, '@expo/vector-icons/MaterialCommunityIcons': { default: 'Icon' },
    'expo-router': { Tabs: Object.assign(() => {}, { Screen: 'TabScreen' }) },
    '@/components/layout/MobileHeader': { MobileHeader: 'MobileHeader' },
    '@/components/layout/CustomerBottomNavigation': { CustomerBottomNavigation: 'CustomerBottomNavigation' },
    '@/localization/navigationLabels.mjs': { navigationLabels },
  }).default();
  const visible = tree.props.children.filter(node => node.props.options.href !== null);
  assert.deepEqual(Array.from(visible, node => node.props.name), ['dashboard', 'projects', 'create', 'library']);
  assert.equal(tree.props.backBehavior, 'history');
  assert.equal(tree.props.tabBar({}).type, 'CustomerBottomNavigation');
  const options = tree.props.screenOptions;
  assert.equal(options.tabBarItemStyle.flex, 1);
  assert.equal(options.tabBarItemStyle.minWidth, 0);
  assert.ok(options.tabBarItemStyle.minHeight >= 48);
  assert.equal(options.tabBarStyle.height, undefined);
  assert.equal(options.tabBarStyle.paddingBottom, undefined);
  assert.equal(options.tabBarStyle.position, undefined);
  assert.equal(options.tabBarActiveTintColor, tokens.colors.primary);
  assert.equal(options.tabBarLabelStyle.fontFamily, tokens.typography.family.semibold);
  assert.doesNotMatch(read('app/(tabs)/_layout.tsx'), /MuseumBottomNavigation|MuseumFrame/);
});

test('Dashboard status badge uses existing semantic mapping and scoped wrapping/font styles', () => {
  const badge = compile('features/projects/ProjectStatusBadge.tsx', { ...base, '@/components/common/Badge': { Badge: 'Badge' }, './projectUtils': utils }).ProjectStatusBadge;
  for (const [status, variant] of [['TRANSLATING', 'info'], ['COMPLETED', 'success'], ['FAILED', 'error'], ['DRAFT', 'default']]) {
    const tree = badge({ status, dashboard: true });
    assert.equal(tree.props.variant, variant);
    assert.equal(tree.props.children, projectStatusLabels[status]);
    assert.equal(tree.props.style.maxWidth, '100%');
    assert.equal(tree.props.labelStyle.fontFamily, tokens.typography.family.semibold);
    assert.equal(badge({ status }).props.labelStyle, undefined);
  }
});

test('Web source drives four quick-action labels/details/routes and section order, without KPIs', () => {
  const web = readFileSync(new URL('../../frontend-web/src/pages/DashboardPlaceholder.tsx', import.meta.url), 'utf8');
  const actions = [...web.matchAll(/title: '([^']+)', detail: '([^']+)', icon: '[^']+', route: '([^']+)'/g)].map(match => ({ title: match[1], detail: match[2], route: match[3] }));
  const rendered = screen({ projects: [project()] });
  const controls = nodes(rendered.tree).filter(node => node.type === 'Pressable').slice(0, 4);
  assert.equal(controls.length, actions.length);
  controls.forEach((control, i) => {
    assert.equal(control.props.accessibilityLabel, actions[i].title);
    assert.ok(text(control).includes(actions[i].detail));
    control.props.onPress();
    assert.equal(rendered.pushes[i], actions[i].route);
  });
  const all = nodes(rendered.tree);
  assert.ok(all.indexOf(controls[0]) < all.findIndex(node => node.type === 'DashboardCharts'));
  assert.ok(all.findIndex(node => node.type === 'DashboardCharts') < all.findIndex(node => node.type === 'ProjectCard'));
  assert.ok(all.findIndex(node => node.type === 'ProjectCard') < all.findIndex(node => node.props.children === 'Hoạt động gần đây'));
  const webRender = web.slice(web.indexOf('export function DashboardPlaceholder'));
  assert.doesNotMatch(webRender, /<StatCard|dashboard-kpi/);
});

test('recent projects match Web limit5, activity uses four real recent records and history route', () => {
  const projects = Array.from({ length: 7 }, (_, i) => ({ ...project(i === 0 ? 'TRANSLATING' : 'COMPLETED'), id: String(i), name: 'Project ' + i, updatedAt: new Date(2026, 9, 24 - i).toISOString() }));
  const rendered = screen({ projects });
  const cards = nodes(rendered.tree).filter(node => node.type === 'ProjectCard');
  assert.deepEqual(cards.map(node => node.props.project.id), ['0', '1', '2', '3', '4']);
  const activity = nodes(rendered.tree).find(node => node.type === 'Card' && text(node).includes('Hoạt động gần đây'));
  assert.ok(activity);
  assert.equal(nodes(activity).filter(node => ['check', 'alert-outline', 'history'].includes(node.props.name)).length, 4);
  assert.ok(nodes(activity).some(node => node.type === 'Text' && [node.props.children].flat().join('') === 'Project 0 · Đang dịch'));
  const link = nodes(activity).find(node => node.type === 'Button');
  link.props.onPress();
  assert.deepEqual(rendered.pushes, ['/history']);
  assert.ok(text(screen().tree).includes('Chưa có hoạt động gần đây'));
});

test('Dashboard Hero reuses existing real asset/Web copy and never fixes content height', () => {
  const pushes = [];
  const hero = compile('features/projects/DashboardHero.tsx', {
    ...base, 'react-native': { ...native, Image: 'Image' },
    'expo-router': { router: { push: route => pushes.push(route) } },
    '@/components/common/Button': { Button: 'Button' }, '../../../assets/museum/images/hero.jpg': 'local-hero',
  }).DashboardHero();
  const web = readFileSync(new URL('../../frontend-web/src/pages/DashboardPlaceholder.tsx', import.meta.url), 'utf8');
  for (const content of text(hero)) assert.ok(web.includes(content));
  assert.equal(hero.props.style.height, undefined);
  const image = nodes(hero).find(node => node.type === 'Image');
  assert.equal(image.props.source, 'local-hero');
  assert.equal(image.props.style.height, '100%');
  assert.equal(image.props.style.width, '100%');
  const button = nodes(hero).find(node => node.type === 'Button');
  assert.equal(button.props.wrapLabel, true);
  button.props.onPress();
  assert.deepEqual(pushes, ['/projects/new']);
});
