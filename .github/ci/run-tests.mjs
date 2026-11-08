import { readdirSync, existsSync, readFileSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../../', import.meta.url));
const suite = process.argv[2];
const backend = ['project-workflow.test.ts', 'gemini-stt-diagnostics.test.ts', 'customer-multilang.test.ts', 'customer-simple-preflight.test.ts'];
const omitted = 'canonical museum assets retain all eight original media hashes';
const app = suite === 'backend' ? 'backend' : suite === 'customer-web' ? 'frontend-web' : null;
if (!app) throw new Error('CI_TEST_SUITE_NOT_ALLOWLISTED');
const cwd = resolve(root, app);
const files = suite === 'backend' ? backend : readdirSync(resolve(cwd, 'tests')).filter(name => name.endsWith('.test.mjs')).sort();
if (!files.length || files.some(name => !existsSync(resolve(cwd, 'tests', name)))) throw new Error('CI_TEST_FILE_MISSING');
const coverage = suite === 'backend'
  ? 'Backend: only four reviewed mock test files; default npm test and all database integration tests are NOT RUN.'
  : `Customer Web: all test files; EXCLUDED one test in tests/museum-assets.test.mjs: "${omitted}". Required original MP4 is absent from Git. The other tests in that file still run. This is NOT a full-suite PASS.`;
console.log(coverage);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## ${suite} test scope\n${coverage}\n\n`);
if (suite === 'customer-web') {
  const source = readFileSync(resolve(cwd, 'tests/museum-assets.test.mjs'), 'utf8');
  if (!source.includes(`test('${omitted}'`)) throw new Error('CI_EXCLUSION_REQUIRES_REVIEW');
}
const env = { ...process.env, CI_NETWORK_GUARD: '1',
  NODE_ENV: 'test', MONGODB_URI: 'mongodb://127.0.0.1:1/ci_mock_only',
  JWT_ACCESS_SECRET: 'ci-only-access-placeholder-not-a-real-secret', JWT_REFRESH_SECRET: 'ci-only-refresh-placeholder-not-a-real-secret',
  JWT_ACCESS_EXPIRES_IN: '15m', JWT_REFRESH_EXPIRES_IN: '1d',
  GEMINI_API_KEY: '', GOOGLE_API_KEY: '', OPENAI_API_KEY: '', EXPO_NO_DOTENV: '1', EXPO_OFFLINE: '1', EXPO_NO_TELEMETRY: '1',
};
delete env.NODE_OPTIONS; // Do not inherit local debugger/preload/runtime settings.
delete env.CI_GUARD_SELF_TEST;
const args = ['--import', new URL('./network-guard.mjs', import.meta.url).href];
if (suite === 'backend') args.push('--import', 'tsx');
else args.push('--experimental-strip-types', '--experimental-transform-types');
args.push('--test', '--test-concurrency=1');
if (suite === 'customer-web') args.push(`--test-skip-pattern=^${omitted}$`);
args.push(...files.map(name => `tests/${name}`));
const result = spawnSync(process.execPath, args, { cwd, env, stdio: 'inherit', timeout: 10 * 60_000, windowsHide: true });
if (result.error || result.signal || result.status === null) { console.error('CI_TEST_PROCESS_FAILED'); process.exit(1); }
process.exitCode = result.status;
