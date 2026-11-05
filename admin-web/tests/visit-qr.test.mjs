import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');

function compile(file, dependencies = {}) {
  const exports = {};
  runInNewContext(
    ts.transpileModule(read(file), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText,
    {
      exports,
      require: (key) => (key.endsWith('.css') ? {} : dependencies[key] ?? require(key)),
      AbortController,
      URLSearchParams: globalThis.URLSearchParams,
    },
  );
  return exports;
}

test('navigation includes visit analytics under visitor group with qr icon', () => {
  const { navigation } = compile('components/layout/navigation.ts');
  const quanLyGroup = navigation.find((g) => g.group === 'KHÁCH THAM QUAN');
  assert.ok(quanLyGroup);
  const visitQrItem = quanLyGroup.items.find((item) => item.to === '/visit-qr');
  assert.ok(visitQrItem);
  assert.equal(visitQrItem.icon, 'qr');
  assert.equal(visitQrItem.label, 'Thống kê truy cập');
});

test('adminVisitQrService queries /admin/visit-qr with formatted params', async () => {
  const calls = [];
  const mockResult = {
    items: [
      {
        id: 'visit-1',
        source: 'footer_web',
        ipAddress: '192.168.1.10',
        userAgent: 'Mozilla/5.0 (iPhone)',
        deviceType: 'mobile',
        os: 'iOS',
        browser: 'Safari',
        targetPath: '/thuyet-minh',
        location: null,
        createdAt: '2026-10-26T08:00:00.000Z',
      },
    ],
    summary: {
      today: 14,
      todayUnique: 11,
      total: 150,
      totalUnique: 98,
    },
    pagination: {
      page: 1,
      limit: 15,
      total: 1,
      totalPages: 1,
    },
  };

  const { adminVisitQrService } = compile('services/adminVisitQrService.ts', {
    '../lib/api': {
      adminApi: async (path, options) => {
        calls.push({ path, options });
        return mockResult;
      },
    },
  });

  const result = await adminVisitQrService.getVisitQrs({
    page: 2,
    limit: 10,
    search: '192.168',
    source: 'footer_web',
    deviceType: 'mobile',
    os: 'iOS',
    startDate: '2026-10-01',
    endDate: '2026-10-26',
  });

  assert.equal(calls.length, 1);
  const url = calls[0].path;
  assert.match(url, /\/admin\/visit-qr\?/);
  assert.match(url, /page=2/);
  assert.match(url, /limit=10/);
  assert.match(url, /search=192\.168/);
  assert.match(url, /source=footer_web/);
  assert.match(url, /deviceType=mobile/);
  assert.match(url, /os=iOS/);
  assert.match(url, /startDate=2026-10-01/);
  assert.match(url, /endDate=2026-10-26/);
  assert.equal(result.summary.today, 14);
  assert.equal(result.summary.todayUnique, 11);
  assert.equal(result.summary.total, 150);
  assert.equal(result.summary.totalUnique, 98);
});

test('Icon component includes qr and refresh icons', () => {
  const iconSource = read('components/common/Icon.tsx');
  assert.match(iconSource, /qr:/);
  assert.match(iconSource, /refresh:/);
});

test('AdminRouter includes /visit-qr route', () => {
  const routerSource = read('routes/AdminRouter.tsx');
  assert.match(routerSource, /AdminVisitQrPage/);
  assert.match(routerSource, /path="\/visit-qr"/);
});
