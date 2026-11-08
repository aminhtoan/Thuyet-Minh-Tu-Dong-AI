import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { projectStatusLabels } from '../src/localization/statusLabels.mjs';
import * as editing from '../src/features/projects/projectEditing.mjs';

const compile = (relative, modules = {}) => {
  const source = readFileSync(new URL(relative, import.meta.url), 'utf8');
  const exports = {};
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, URLSearchParams, require: key => {
      assert.ok(key in modules, `Unmocked dependency: ${key}`);
      return modules[key];
    },
  });
  return exports;
};
const languages = compile('../src/features/projects/languages.ts');
const utils = compile('../src/features/projects/projectUtils.ts', { './languages': languages, '../../localization/statusLabels.mjs': { projectStatusLabels } });
const list = compile('../src/features/projects/projectListModel.ts');
const webSource = compile('../../frontend-web/src/features/projects/sourceLanguage.ts');
const webList = compile('../../frontend-web/src/features/projects/projectListPresentation.ts');
const fixture = sourceLanguage => ({ id: 'fixture', name: 'Project fixture', sourceLanguage, sourceLanguageMode: 'AUTO', status: 'UPLOADED', updatedAt: '2026-11-08T02:00:00Z' });

test('Dashboard language pairs handle null/missing/empty source without modifying API data', () => {
  for (const source of [null, undefined, '']) {
    const p = { ...fixture(source), targetLanguage: 'en' };
    const before = JSON.stringify(p);
    assert.equal(utils.formatLanguagePair(p), 'Chưa xác định → Tiếng Anh');
    assert.equal(utils.formatLanguagePair(fixture(source)), 'Chưa xác định → —');
    assert.equal(JSON.stringify(p), before);
  }
});

test('known and other language codes retain their labels; unknown source agrees with Customer Web', () => {
  for (const source of [null, undefined, '', 'vi', 'en', 'ja', 'ko', 'xx']) {
    const p = { ...fixture(source), sourceLanguageMode: 'MANUAL' };
    assert.equal(utils.formatLanguagePair(p).split(' → ')[0], webSource.sourceLanguageLabel(source));
  }
});

test('Projects list agrees with Web for nullable source across translation metadata states', () => {
  for (const source of [null, undefined, '', 'vi', 'ja']) {
    for (const state of ['READY', 'EMPTY', 'ERROR', 'UNKNOWN']) {
      for (const target of [undefined, 'en']) {
        const p = { ...fixture(source), targetLanguage: target, metadataState: { translation: state } };
        assert.equal(list.projectListLanguagePair(p), webList.projectListLanguagePair(p));
      }
    }
  }
});

test('actual ProjectCard renders its visible and accessible labels for AUTO projects', () => {
  const jsx = (type, props) => ({ type, props });
  const { ProjectCard } = compile('../src/features/projects/ProjectCard.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { View: 'View', Text: 'Text', StyleSheet: { create: value => value } },
    'expo-router': { router: { push: () => assert.fail('Rendering must not navigate') } },
    '@expo/vector-icons/MaterialCommunityIcons': { default: 'Icon' },
    '@/components/common/Button': { Button: 'Button' }, '@/components/common/Card': { Card: 'Card' },
    '@/components/common/ProgressBar': { ProgressBar: 'ProgressBar' },
    '@/theme/tokens': { colors: {}, radius: {}, spacing: {}, typography: { family: {}, size: {}, weight: {} } },
    './projectAction': { projectAction: () => ({ step: 'transcript', label: 'Tiếp tục' }) },
    './projectUtils': utils, './ProjectStatusBadge': { ProjectStatusBadge: 'Badge' },
    './DashboardResumeButton': { DashboardResumeButton: 'Resume' },
  });
  for (const source of [null, undefined]) {
    const tree = ProjectCard({ project: fixture(source), dashboard: true });
    assert.match(tree.props.accessibilityLabel, /Project fixture, Chưa xác định/);
    assert.match(JSON.stringify(tree), /Chưa xác định/);
  }
});

test('repository preserves a nullable source while enriching a project using GET requests only', async () => {
  const calls = [];
  class ApiError extends Error {}
  const { projectRepository } = compile('../src/features/projects/projectRepository.ts', {
    '../../lib/api': { ApiError, api: async (url, options = {}) => {
      calls.push({ url, options });
      if (url.endsWith('/media')) return { media: null };
      if (url.endsWith('/translations')) return { translations: [] };
      return { project: fixture(null) };
    } }, './projectEditing.mjs': editing,
  });
  const p = await projectRepository.getProject('fixture');
  assert.equal(p.sourceLanguage, null);
  assert.equal(p.status, 'UPLOADED');
  assert.equal(projectRepository.getAll().length, 1);
  assert.equal(calls.length, 3);
  assert.ok(calls.every(call => call.options.method === undefined));
});

test('result metadata renders unknown source without replacing the confirmed target', () => {
  const access = compile('../src/features/results/resultAccess.ts');
  const { resultRows } = compile('../src/features/results/resultUtils.ts', { './resultAccess': access });
  for (const source of [null, undefined, '']) {
    const rows = resultRows(fixture(source), { languageCode: 'en', mediaType: 'VIDEO', fileSize: 100, createdAt: '2026-11-08T02:00:00Z' });
    assert.equal(rows.find(([key]) => key === 'Ngôn ngữ gốc')[1], 'Chưa xác định');
    assert.equal(rows.find(([key]) => key === 'Ngôn ngữ đích')[1], access.resultLanguageName('en'));
  }
});
