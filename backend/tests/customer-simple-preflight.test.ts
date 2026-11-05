import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
process.env.NODE_ENV = 'development';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/mock-only';
process.env.JWT_ACCESS_SECRET = randomBytes(48).toString('hex');
process.env.JWT_REFRESH_SECRET = randomBytes(48).toString('hex');
process.env.JWT_ACCESS_EXPIRES_IN = '15m'; process.env.JWT_REFRESH_EXPIRES_IN = '1d';
const { customerSimplePreflight } = await import('../src/services/translation/customer-simple-preflight.js');
const { candidateGroups, revision } = await import('../src/services/translation/group-plan.js');
const { translationProviderInput } = await import('../src/services/translation/gemini-simple-contract.js');
const source = { transcriptId: 'a'.repeat(24), transcriptRevision: 1, languageCode: 'vi', fullText: 'Xin chào "Việt Nam".\n', segments: [{ id: 'b'.repeat(24), sequence: 1, text: 'Xin chào "Việt Nam".', startTime: 0, endTime: 1 }] };
const project = '1'.repeat(24), owner = '2'.repeat(24);
const deps = (patch = {}) => ({ owns: async () => true, project: async () => ({ status: 'TRANSCRIBED', sourceLanguage: 'vi' }), load: async () => source, attempt: async () => null, translation: async () => false, jobs: async () => false, drafts: () => ({ count: 0, visibility: 'PROCESS_LOCAL_ONLY', globalAbsence: 'UNKNOWN' }), ...patch }) as any;

test('eligible source uses canonical planner/input UTF-8 bytes, never READY with unverified quota/deployment', async t => {
  t.mock.method(globalThis, 'fetch', () => { throw Error('NO_PROVIDER'); });
  const result = await customerSimplePreflight(project, owner, deps());
  assert.equal(result.transcript, 'PASS'); assert.equal(result.simpleLimits, 'PASS');
  assert.equal(result.sourceBytes, Buffer.byteLength(JSON.stringify(source)));
  assert.equal(result.inputBytes, Buffer.byteLength(JSON.stringify(translationProviderInput(source, 'en', candidateGroups(source)))));
  assert.equal(result.maxGroupBytes, Buffer.byteLength(source.segments[0]!.text));
  assert.equal(result.sourceDigest, revision(source)); assert.equal(result.orderedCoverage, '1/1');
  assert.equal(result.attempt, 'CLEAR'); assert.equal(result.status, 'BLOCKED'); assert.equal(result.generationAuthorized, false);
  assert.equal(result.quota, 'NOT VERIFIED'); assert.equal(result.runtime.deploymentIdentity, 'NOT VERIFIED');
  assert.doesNotMatch(JSON.stringify(result), /Xin chào|Việt Nam|mongodb|JWT/);
});

test('SIMPLE boundaries and full input accounting, not just source text length', async () => {
  for (const textSize of [2000, 2001]) {
    const changed = { ...source, fullText: 'x'.repeat(textSize), segments: [{ ...source.segments[0]!, text: 'x'.repeat(textSize) }] };
    const result = await customerSimplePreflight(project, owner, deps({ load: async () => changed }));
    assert.equal(result.simpleLimits, textSize === 2000 ? 'PASS' : 'FAIL');
  }
  const base = { ...source, fullText: 'x', segments: [{ ...source.segments[0]!, text: 'phrase only' }] };
  const overhead = Buffer.byteLength(JSON.stringify(translationProviderInput(base, 'en', candidateGroups(base))));
  for (const extra of [0, 1]) {
    const changed = { ...base, fullText: 'x'.repeat(12000 - overhead + extra + 1) };
    const result = await customerSimplePreflight(project, owner, deps({ load: async () => changed }));
    assert.equal(result.inputBytes, 12000 + extra); assert.equal(result.simpleLimits, extra ? 'FAIL' : 'PASS');
  }
  const changed = { ...source, segments: Array.from({ length: 33 }, (_, i) => ({ id: (i + 1).toString(16).padStart(24, '0'), sequence: i + 1, text: 'phrase only', startTime: i, endTime: i + 1 })) };
  const result = await customerSimplePreflight(project, owner, deps({ load: async () => changed }));
  assert.equal(result.groups, 33); assert.equal(result.simpleLimits, 'FAIL');
});

test('uncertain attempt, saved translation, active job and local draft independently block', async () => {
  for (const patch of [{ attempt: async () => ({ status: 'UNCERTAIN' }) }, { translation: async () => true }, { jobs: async () => true }, { drafts: () => ({ count: 1, visibility: 'PROCESS_LOCAL_ONLY', globalAbsence: 'UNKNOWN' }) }]) {
    const result = await customerSimplePreflight(project, owner, deps(patch));
    assert.equal(result.status, 'BLOCKED'); assert.ok(result.reasonCodes.includes('TRANSLATION_CONFLICT'));
    assert.equal(result.drafts.globalAbsence, 'UNKNOWN');
  }
});

test('ownership/development guards execute before source reads, source drift and failures are safe', async () => {
  let loads = 0;
  await assert.rejects(customerSimplePreflight(project, owner, deps({ owns: async () => false, load: async () => { loads++; return source; } })), (e: any) => e.code === 'PROJECT_NOT_FOUND');
  process.env.NODE_ENV = 'production';
  try { await assert.rejects(customerSimplePreflight(project, owner, deps()), (e: any) => e.code === 'DIAGNOSTIC_NOT_AVAILABLE'); }
  finally { process.env.NODE_ENV = 'development'; }
  assert.equal(loads, 0);
  const drift = await customerSimplePreflight(project, owner, deps({ load: async () => (++loads === 1 ? source : { ...source, transcriptRevision: 2 }) }));
  assert.equal(drift.transcript, 'NOT VERIFIED'); assert.ok(drift.reasonCodes.includes('SOURCE_REVISION_MISMATCH'));
  const failed = await customerSimplePreflight(project, owner, deps({ load: async () => { throw Error('PRIVATE_URI_SECRET'); } }));
  assert.doesNotMatch(JSON.stringify(failed), /PRIVATE_URI_SECRET/);
});

test('quota/deployment evidence reused safely; cross-process RAM remains UNKNOWN and no generation authority', async () => {
  const evidence = {
    quota: async () => ({ status: 'VERIFIED', dayUTC: '2026-10-22', userRemaining: 18, globalRemaining: 195, userLimit: 20, globalLimit: 200, available: true, reservation: false }),
    deployment: async () => ({ status: 'VERIFIED', fingerprint: 'a'.repeat(64), instanceId: 'synthetic', intendedTargetApproval: 'NOT VERIFIED' }),
    durableConflicts: async () => ({ status: 'CLEAR', scope: 'DURABLE_CUSTOMER_ATTEMPTS_ALL_REVISIONS', ramOtherProcesses: 'UNKNOWN' }),
  };
  const result = await customerSimplePreflight(project, owner, deps(evidence));
  assert.equal(result.quota, 'VERIFIED'); assert.equal(result.runtime.deploymentIdentity, 'VERIFIED');
  assert.equal('quotaEvidence' in result && result.quotaEvidence?.userRemaining, 18);
  assert.equal(result.status, 'BLOCKED'); assert.equal(result.generationAuthorized, false);
  assert.ok('warnings' in result && result.warnings.includes('OTHER_PROCESS_RAM_DRAFTS_UNKNOWN'));
  assert.ok(!result.reasonCodes.includes('QUOTA_NOT_VERIFIED'));
  const failed = await customerSimplePreflight(project, owner, deps({ ...evidence, quota: async () => { throw Error('PRIVATE'); }, deployment: async () => { throw Error('PRIVATE'); } }));
  assert.equal(failed.quota, 'NOT VERIFIED'); assert.equal(failed.runtime.deploymentIdentity, 'NOT VERIFIED');
  assert.doesNotMatch(JSON.stringify(failed), /PRIVATE/);
  const full = await customerSimplePreflight(project, owner, deps({ ...evidence, quota: async () => ({ ...await evidence.quota(), available: false, userRemaining: 0 }) }));
  assert.ok(full.reasonCodes.includes('QUOTA_EXHAUSTED'));
});

test('READY only for verified enabled SIMPLE durable path; real conflicts BLOCKED, missing evidence UNKNOWN', async () => {
  const old = { ...process.env };
  Object.assign(process.env, { NODE_ENV: 'development', CUSTOMER_TRANSLATION_METHOD: 'GEMINI_SIMPLE_V1', CUSTOMER_TRANSLATION_ENABLED: 'true', CUSTOMER_TRANSLATION_THINKING: 'DEFAULT', TRANSLATION_PROVIDER: 'gemini' });
  delete process.env.CONTROLLED_PROVIDER_MODE;
  const evidence = {
    quota: async () => ({ status: 'VERIFIED', available: true }),
    deployment: async () => ({ status: 'VERIFIED', intendedTargetApproval: 'APPROVED_BY_USER', approvedDatabaseMatch: true }),
    durableConflicts: async () => ({ status: 'CLEAR', ramOtherProcesses: 'UNKNOWN' }),
  };
  try {
    const ready = await customerSimplePreflight(project, owner, deps(evidence));
    assert.equal(ready.status, 'READY'); assert.equal('readyForManualExecution' in ready && ready.readyForManualExecution, true);
    assert.equal(ready.generationAuthorized, false); assert.equal('crossProcess' in ready && ready.crossProcess.ramOtherProcesses, 'UNKNOWN');
    assert.equal(ready.reasonCodes.length, 0);
    for (const patch of [{ quota: async () => null }, { deployment: async () => null }, { durableConflicts: async () => null }]) {
      assert.equal((await customerSimplePreflight(project, owner, deps({ ...evidence, ...patch }))).status, 'UNKNOWN');
    }
    for (const patch of [{ attempt: async () => ({ status: 'UNCERTAIN' }) }, { translation: async () => true }, { jobs: async () => true }, { quota: async () => ({ status: 'VERIFIED', available: false }) }, { deployment: async () => ({ status: 'VERIFIED', intendedTargetApproval: 'MISMATCH', approvedDatabaseMatch: false }) }, { drafts: () => ({ count: 1 }) }]) {
      assert.equal((await customerSimplePreflight(project, owner, deps({ ...evidence, ...patch }))).status, 'BLOCKED');
    }
  } finally { process.env = old; }
});
