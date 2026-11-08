import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { assertStagingFrontend } from './staging-frontend.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = name => readFileSync(resolve(root, name), 'utf8');
export const parseExample = text => Object.fromEntries(text.split(/\r?\n/).filter(line => line && !line.startsWith('#')).map(line => {
  const index = line.indexOf('=');
  assert.ok(index > 0, 'INVALID_EXAMPLE');
  return [line.slice(0, index), line.slice(index + 1)];
}));
export function checkPreparation() {
  const manifest = JSON.parse(read('infra/staging/manifest.json'));
  assert.equal(manifest.mode, 'PREPARATION_ONLY');
  assert.equal(manifest.deploymentEnabled, false);
  assert.equal(manifest.backend.aiEnabled, false);
  assert.equal(manifest.backend.replicas, 1);
  assert.equal(manifest.backend.appEnv, 'staging');
  assert.equal(manifest.backend.buildContext, 'backend');
  assert.equal(manifest.backend.dockerfile, 'backend/Dockerfile');
  assert.equal(manifest.backend.apiUrl, 'https://api-staging.example.invalid/api');
  assert.equal(manifest.backend.mediaMount, '/var/lib/narration-staging/media');
  assert.match(manifest.backend.databaseName, /_staging$/);
  assert.deepEqual(manifest.releaseRequirements, [
    'exact-main-sha-ci-pass', 'independent-manual-approval', 'hosting-selected',
    'staging-db-user-permissions-verified', 'indexes-separately-approved-and-provisioned',
    'persistent-volume-and-backup-verified', 'staging-secrets-provisioned-at-runtime',
  ]);
  for (const name of ['backend/.env.staging.example', 'frontend-web/.env.staging.example', 'admin-web/.env.staging.example']) {
    const text = read(name);
    assert.doesNotMatch(text, /-----BEGIN .*PRIVATE KEY|AIza[0-9A-Za-z_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|mongodb(?:\+srv)?:\/\/[^/\s]*@/);
    assert.doesNotMatch(text, /https?:\/\/(?:localhost|127\.|192\.168\.|10\.)/);
    const config = parseExample(text);
    if (!name.startsWith('backend/')) assertStagingFrontend('staging', config, name.startsWith('admin-web/'));
    else {
      assert.equal(config.APP_ENV, 'staging');
      assert.equal(config.STAGING_DATABASE_NAME, manifest.backend.databaseName);
      assert.equal(config.UPLOAD_DIR, manifest.backend.mediaMount);
      assert.equal(config.MONGODB_URI, 'mongodb://staging-db.example.invalid/' + config.STAGING_DATABASE_NAME);
      assert.equal(config.STAGING_ISOLATION_ACK, 'REQUIRES_MANUAL_REVIEW');
      assert.equal(config.STAGING_MEDIA_ACK, 'REQUIRES_MANUAL_REVIEW');
      for (const key of ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'OPENAI_API_KEY']) assert.equal(config[key], '');
      for (const key of ['CUSTOMER_TRANSLATION_ENABLED', 'GROUP_TRANSLATION_ENABLED']) assert.equal(config[key], 'false');
      for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) assert.match(config[key], /^REPLACE_WITH_/);
    }
  }
  const docker = read('backend/Dockerfile');
  assert.match(docker, /FROM node:22\.23\.3-bookworm-slim@sha256:[a-f0-9]{64} AS build/);
  assert.match(docker, /RUN npm ci/);
  assert.match(docker, /npm prune --omit=dev/);
  assert.match(docker, /USER node/);
  assert.match(docker, /HEALTHCHECK/);
  assert.match(docker, /ffprobe -version/);
  assert.doesNotMatch(docker, /COPY \. \.|npm install|seed:|syncIndexes|COPY[^\r\n]*\.env/);
  const ignore = read('backend/.dockerignore');
  assert.ok(ignore.startsWith('**'));
  assert.doesNotMatch(ignore, /^!.*(?:\.env|uploads|runtime|logs)/m);
  const workflow = read('.github/workflows/cd-staging.yml');
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^\s*(push|pull_request|workflow_run|schedule):/m);
  assert.doesNotMatch(workflow, /secrets\.|id-token:|packages:|contents: write|\b(?:ssh|scp|curl|wget|docker|vercel|render|npm|npx)\b/i);
  const runs = [...workflow.matchAll(/^\s*(?:- )?run:\s*(.+)$/gm)].map(match => match[1]);
  assert.deepEqual(runs, ['node --test scripts/staging-prep.test.mjs', 'node scripts/check-staging-prep.mjs --sha "$CANDIDATE_SHA"']);
  for (const app of manifest.frontends) {
    assert.equal(app.output, 'dist');
    assert.equal(app.includeOutsideRoot, true);
    assert.equal(app.build, 'npm run build -- --mode staging');
    assert.equal(JSON.parse(read(app.root + '/vercel.json')).rewrites[0].destination, '/index.html');
  }
  return { status: 'READY_OFFLINE', deploy: 'DISABLED', hosting: 'REQUIRES_HOSTING',
    secrets: 'REQUIRES_SECRETS', approval: 'REQUIRES_MANUAL_APPROVAL', isolation: 'NOT_VERIFIED', ciGate: 'NOT_VERIFIED' };
}
export function verifyCandidate(sha) {
  assert.match(sha ?? '', /^[a-f0-9]{40}$/, 'FULL_COMMIT_SHA_REQUIRED');
  const baseline = JSON.parse(read('infra/staging/manifest.json')).baselineSha;
  for (const args of [['cat-file', '-e', sha + '^{commit}'], ['cat-file', '-e', sha + ':.github/workflows/ci.yml'],
    ['merge-base', '--is-ancestor', baseline, sha], ['merge-base', '--is-ancestor', sha, 'origin/main']]) {
    const result = spawnSync('git', args, { cwd: root, stdio: 'ignore', windowsHide: true });
    assert.equal(result.status, 0, 'CANDIDATE_NOT_VERIFIED_MAIN_COMMIT');
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv[2], '--sha');
  verifyCandidate(process.argv[3]);
  assert.ok(existsSync(resolve(root, '.github/workflows/ci.yml')));
  console.log(JSON.stringify(checkPreparation()));
}
