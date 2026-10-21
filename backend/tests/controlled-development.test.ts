import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { controlledTarget, controlledScopeActive, assertControlledRequest, assertControlledSource, withControlledSource } from '../src/services/translation/controlled-development.js';
import { OneUsePermitFence } from '../src/services/translation/one-use-permit.js';
import { digest, revision } from '../src/services/translation/group-plan.js';
import { GroupAdmission } from '../src/services/translation/group-admission.js';
import { collectBoundedSource, SOURCE_BYTE_LIMIT } from '../src/services/translation/bounded-source.js';

const owner = '0123456789abcdef01234567';
const policy = { sourceBytes: 131072, requestCredits: 5 * 1024 * 1024, processCredits: 32 * 1024 * 1024, maxActive: 4, maxActivePerUser: 2 };
const input = { sourceLanguage: 'vi', targetLanguage: 'en', fullText: 'Synthetic input.', groups: [{ groupId: 'synthetic', sourceText: 'Synthetic input.' }] };
const grant = () => ({ id: randomUUID(), approval: 'EXPLICIT_USER_APPROVAL', ownerId: owner, projectId: controlledTarget.projectId, revision: 1, sourceDigest: controlledTarget.sourceDigest, sourceLanguage: 'vi', targetLanguage: 'en', model: controlledTarget.model, apiVersion: 'v1beta', inputDigest: digest(input), planDigest: digest(input.groups.map(g => g.groupId)), thinking: 'DEFAULT', lowExplicitlyApproved: false, maxOutputTokens: 8192, timeoutMs: 120000, responseBytes: 131072, metadataRequests: 1, generationRequests: 1, retries: 0, tokenChargeEnvelopeUsd: 0.82, pricingVerifiedOn: '2026-10-21', issuedAt: Date.now() - 1000, expiresAt: Date.now() + 60000 });
const linux = { skip: process.platform !== 'linux' ? 'Directory fsync requires Linux deployment; run this file in controlled Docker image.' : false };

test('non-test development profile requires active explicit DENY capability; production is denied', async () => {
  process.env.NODE_ENV = 'development'; process.env.CONTROLLED_PROVIDER_MODE = 'DENY';
  assert.throws(() => new GroupAdmission(policy));
  await withControlledSource(owner, async () => {
    assert.equal(controlledScopeActive(), true);
    assert.doesNotThrow(() => assertControlledRequest(controlledTarget.projectId, owner, 'en'));
    assert.throws(() => assertControlledRequest('ffffffffffffffffffffffff', owner, 'en'));
    assert.throws(() => assertControlledRequest(controlledTarget.projectId, 'ffffffffffffffffffffffff', 'en'));
    assert.throws(() => assertControlledRequest(controlledTarget.projectId, owner, 'fr'));
    const admission = new GroupAdmission(policy);
    await admission.operation(owner, async () => assert.equal(admission.snapshot().active, 1));
    assert.deepEqual(admission.snapshot(), { active: 0, reservedCredits: 0 });
  });
  assert.equal(controlledScopeActive(), false);
  process.env.NODE_ENV = 'production';
  await assert.rejects(withControlledSource(owner, async () => null));
  assert.throws(() => new GroupAdmission(policy));
});
test('128 KiB synthetic loading is lossless only inside readiness; source binding still rejects unrelated fixture', async () => {
  process.env.NODE_ENV = 'development'; process.env.CONTROLLED_PROVIDER_MODE = 'DENY';
  const header = { transcriptId: '111111111111111111111111', transcriptRevision: 1, languageCode: 'vi', fullText: 'a'.repeat(50000) };
  const row = { id: '222222222222222222222222', sequence: 1, text: header.fullText, startTime: 0, endTime: 1 };
  const rows = async function* () { yield row; };
  await assert.rejects(collectBoundedSource(header, rows(), 131072));
  await assert.rejects(collectBoundedSource(header, rows(), SOURCE_BYTE_LIMIT));
  await withControlledSource(owner, async () => {
    const source = await collectBoundedSource(header, rows(), 131072);
    assert.equal(source.segments[0]!.text, row.text);
    assert.equal(source.fullText, header.fullText);
    assert.equal(revision(source), revision({ ...header, segments: [row] }));
    assert.throws(() => assertControlledSource(controlledTarget.projectId, source));
    await assert.rejects(collectBoundedSource({ ...header, fullText: 'a'.repeat(131072) }, rows(), 131072));
  });
});
test('permit rejects absent approval, low without approval, expiry, inflated counters/caps and production', async () => {
  process.env.NODE_ENV = 'development';
  for (const bad of [null, { ...grant(), approval: 'DRAFT' }, { ...grant(), thinking: 'LOW' }, { ...grant(), expiresAt: 1 }, { ...grant(), generationRequests: 2 }, { ...grant(), maxOutputTokens: 16384 }]) await assert.rejects(OneUsePermitFence.open(tmpdir(), bad));
  process.env.NODE_ENV = 'production'; await assert.rejects(OneUsePermitFence.open(tmpdir(), grant()));
});
test('readiness service refuses preview/approve before provider or persistence; flags remain OFF', async () => {
  process.env.NODE_ENV = 'development'; process.env.CONTROLLED_PROVIDER_MODE = 'DENY';
  process.env.GROUP_TRANSLATION_ENABLED = 'false';
  const { GroupTranslationService } = await import('../src/services/translation/group-translation.service.js');
  let calls = 0;
  await withControlledSource(owner, async () => {
    const admission = new GroupAdmission(policy);
    const service = new GroupTranslationService({ async translate() { calls++; return []; } }, undefined, admission);
    await assert.rejects(service.preview(controlledTarget.projectId, owner, { targetLanguage: 'en', sourceRevision: controlledTarget.sourceDigest, groupingVersion: 'phrase-candidates-v1', groups: [], idempotencyKey: 'synthetic' }), (e: any) => e.code === 'CONTROLLED_PROVIDER_DENIED');
    await assert.rejects(service.approve(controlledTarget.projectId, owner, 'missing', { outputDigest: 'missing', reviewed: true }), (e: any) => e.code === 'CONTROLLED_APPROVAL_DENIED');
    assert.equal(calls, 0); assert.deepEqual(admission.snapshot(), { active: 0, reservedCredits: 0 });
  });
  assert.equal(process.env.GROUP_TRANSLATION_ENABLED, 'false');
});
test('durable metadata + generation claims are at most once across instances/concurrent calls', linux, async () => {
  process.env.NODE_ENV = 'development';
  const directory = await mkdtemp(join(tmpdir(), 'narration-permit-'));
  try {
    const permission = grant(), fence = await OneUsePermitFence.open(directory, permission);
    let metadata = 0, generation = 0, checks = 0;
    const verify = async () => { checks++; };
    const results = await Promise.allSettled(Array.from({ length: 16 }, () => fence.metadata(controlledTarget.model, verify, async () => { metadata++; return { supportedActions: ['generateContent'] }; })));
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1); assert.equal(metadata, 1);
    const restarted = await OneUsePermitFence.open(directory, permission);
    const outputs = await Promise.allSettled(Array.from({ length: 16 }, () => restarted.generation(controlledTarget.model, input, verify, async () => { generation++; return { finishReason: 'STOP', text: '{}' }; })));
    assert.equal(outputs.filter(r => r.status === 'fulfilled').length, 1); assert.equal(generation, 1); assert.ok(checks >= 2);
    await assert.rejects(OneUsePermitFence.open(directory, { ...permission, ownerId: 'ffffffffffffffffffffffff' }));
    assert.equal((await readdir(directory)).length, 4);
  } finally { await rm(directory, { recursive: true }); } // Exact mkdtemp fixture directory only.
});
test('failed/timeout metadata is spent, and no generation is allowed; source drift does not dispatch', linux, async () => {
  process.env.NODE_ENV = 'development';
  const directory = await mkdtemp(join(tmpdir(), 'narration-permit-'));
  try {
    const permission = grant(), fence = await OneUsePermitFence.open(directory, permission);
    let calls = 0;
    await assert.rejects(fence.metadata(controlledTarget.model, async () => { throw new Error('source drift'); }, async () => { calls++; return {}; }));
    assert.equal(calls, 0);
    await assert.rejects(fence.metadata(controlledTarget.model, async () => {}, async () => { calls++; throw new Error('timeout'); }));
    const restarted = await OneUsePermitFence.open(directory, permission);
    await assert.rejects(restarted.metadata(controlledTarget.model, async () => {}, async () => { calls++; return {}; }));
    await assert.rejects(restarted.generation(controlledTarget.model, input, async () => {}, async () => { calls++; return {}; }));
    assert.equal(calls, 1);
  } finally { await rm(directory, { recursive: true }); }
});
test('generation failure stays spent; wrong input/model rejected before dispatch', linux, async () => {
  process.env.NODE_ENV = 'development';
  const directory = await mkdtemp(join(tmpdir(), 'narration-permit-'));
  try {
    const permission = grant(), fence = await OneUsePermitFence.open(directory, permission);
    await fence.metadata(controlledTarget.model, async () => {}, async () => ({ supportedActions: ['generateContent'] }));
    let calls = 0;
    const call = async () => { calls++; throw new Error('uncertain completion'); };
    await assert.rejects(fence.generation('other-model', input, async () => {}, call));
    await assert.rejects(fence.generation(controlledTarget.model, { ...input, targetLanguage: 'fr' }, async () => {}, call));
    await assert.rejects(fence.generation(controlledTarget.model, input, async () => {}, call));
    const restarted = await OneUsePermitFence.open(directory, permission);
    await assert.rejects(restarted.generation(controlledTarget.model, input, async () => {}, call));
    assert.equal(calls, 1);
  } finally { await rm(directory, { recursive: true }); }
});
