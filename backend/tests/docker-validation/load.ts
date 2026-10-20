import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import mongoose, { Types } from 'mongoose';
import { verifyContainerDatabase } from './isolation.js';

// Host must have run host-precheck.ts --backend BEFORE this executable.
const db = await verifyContainerDatabase();
const runtime = JSON.parse(readFileSync('/tmp/runtime.json', 'utf8'));
const metric = () => JSON.parse(readFileSync('/tmp/metrics.json', 'utf8'));
const ids = { projects: [] as Types.ObjectId[], transcripts: [] as Types.ObjectId[], segments: [] as Types.ObjectId[], users: [] as Types.ObjectId[], languages: [] as Types.ObjectId[] };
const run = randomUUID();
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
let passed = 0;
async function fixture(owner: Types.ObjectId, count: number) {
  const projectId = new Types.ObjectId(), transcriptId = new Types.ObjectId(), date = new Date();
  ids.projects.push(projectId); ids.transcripts.push(transcriptId);
  const segments = Array.from({ length: count }, (_, i) => ({ _id: new Types.ObjectId(), transcriptId, sequence: i + 1, text: `từ${i % 10}${(i + 1) % 14 === 0 ? '.' : ''}`, startTime: i / 4, endTime: (i + 1) / 4, createdAt: date, updatedAt: date }));
  ids.segments.push(...segments.map(s => s._id));
  await db.collection('projects').insertOne({ _id: projectId, userId: owner, name: `Synthetic Docker ${run}`, sourceLanguage: 'vi', status: 'TRANSCRIBED', createdAt: date, updatedAt: date });
  await db.collection('transcripts').insertOne({ _id: transcriptId, projectId, languageCode: 'vi', revision: 1, status: 'READY', fullText: segments.map(s => s.text).join(' '), createdAt: date, updatedAt: date });
  await db.collection('transcriptsegments').insertMany(segments);
  return { projectId, transcriptId };
}
try {
  const lang = await db.collection('languages').findOne({ code: 'en' });
  if (lang) assert.equal(lang.isActive, true);
  else { const id = new Types.ObjectId(); ids.languages.push(id); await db.collection('languages').insertOne({ _id: id, code: 'en', name: 'Synthetic English', nativeName: 'English', isActive: true }); }
  const owners = Array.from({ length: 4 }, () => new Types.ObjectId()); ids.users.push(...owners);
  await db.collection('users').insertMany(owners.map(_id => ({ _id, fullName: 'Synthetic Docker fixture', email: `${_id}@integration.invalid`, passwordHash: 'synthetic', role: 'CUSTOMER', status: 'ACTIVE', deletedAt: null })));
  const scenarios = [{ round: 'warmup', concurrency: 1, count: 100 }, ...[1, 2].flatMap(round => [1, 4, 16].map(concurrency => ({ round: String(round), concurrency, count: 1027 })))];
  for (const { round, concurrency, count } of scenarios) {
    const fs = await Promise.all(owners.map(owner => fixture(owner, count)));
    let responseMax = 0;
    const call = async (index: number, path: string, body?: unknown, asOwner = owners[index]!) => {
      const token = jwt.sign({ sub: String(asOwner), role: 'CUSTOMER', type: 'access' }, runtime.accessSecret, { expiresIn: '5m' });
      const res = await fetch(`http://127.0.0.1:8081/api/projects/${fs[index]!.projectId}/${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'content-type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000) });
      const text = await res.text(); responseMax = Math.max(responseMax, Buffer.byteLength(text));
      return { status: res.status, body: JSON.parse(text) as any, index };
    };
    const bodies: any[] = [];
    for (let i = 0; i < 4; i++) {
      const res = await call(i, 'translations/plan/en'); assert.equal(res.status, 200);
      const plan = res.body.data.plan;
      assert.equal(plan.sourceSegmentCount, count);
      bodies.push({ targetLanguage: 'en', sourceRevision: plan.sourceRevision, groupingVersion: plan.groupingVersion, groups: plan.groups.map((g: any) => g.sourceSegmentIds), idempotencyKey: randomUUID() });
    }
    const baseline = metric(); let samples = 0, peakRss = baseline.current.rss, peakHeap = baseline.current.heapUsed;
    let samplingError: Error | undefined;
    const sampler = setInterval(() => { try { const m = metric(); samples++; peakRss = Math.max(peakRss, m.current.rss); peakHeap = Math.max(peakHeap, m.current.heapUsed); assert.ok(m.ledger.active <= 4); assert.ok(m.ledger.reservedCredits <= 32 * 1024 * 1024); } catch (error) { if (error instanceof assert.AssertionError) samplingError = error; } }, 25);
    const began = performance.now();
    try {
      const responses = await Promise.all(Array.from({ length: concurrency }, (_, i) => call(i % 4, 'translations/preview', bodies[i % 4])));
      assert.ok(responses.every(r => [200, 503].includes(r.status)), JSON.stringify(responses.map(r => [r.status, r.body?.error?.code])));
      const success = responses.find(r => r.status === 200); assert.ok(success);
      const d = success.body.data.draft;
      assert.equal(d.groups.flatMap((g: any) => g.sourceSegmentIds).length, count);
      const approved = await call(success.index, `translations/drafts/${d.draftId}/approve`, { outputDigest: d.outputDigest, reviewed: true }); assert.equal(approved.status, 200);
      const get = await call(success.index, 'translations/en?format=groups-v1'); assert.equal(get.status, 200); assert.equal(get.body.data.translation.sourceSegmentCount, count);
      const policy = await call(success.index, 'validation-policy', {}); assert.equal(policy.status, 200); assert.equal(policy.body.data.ttsCompletion, 'CURRENT');
      assert.equal((await call(success.index, 'validation-policy', {}, owners[(success.index + 1) % 4]!)).status, 404);
      await db.collection('transcripts').updateOne({ _id: fs[success.index]!.transcriptId }, { $inc: { revision: 1 } });
      assert.equal((await call(success.index, 'translations/en?format=groups-v1')).status, 409);
      assert.equal((await call(success.index, 'validation-policy', {})).status, 409);
      await sleep(3300);
      const final = metric(); assert.deepEqual(final.ledger, { active: 0, reservedCredits: 0 }); assert.equal(final.drafts, 0); assert.equal(final.receipts, 0);
      const generations = final.generations - baseline.generations; assert.ok(generations > 0 && generations <= Math.min(4, concurrency));
      assert.ok(responseMax <= 256 * 1024); assert.ok(!/oom(?:_kill|_group_kill)? [1-9]/.test(final.memoryEvents));
      assert.equal(final.memoryFailures, 0);
      if (samplingError) throw samplingError;
      passed++;
      console.log('DOCKER_LOAD', JSON.stringify({ round, concurrency, count, pid: final.pid, node: final.node, heapLimit: final.heapLimit, samples, elapsedMs: Math.round(performance.now() - began), success: responses.filter(r => r.status === 200).length, rejected: responses.filter(r => r.status === 503).length, generations, responseMax, baselineRss: baseline.current.rss, baselineHeap: baseline.current.heapUsed, peakRss, peakHeap, finalRss: final.current.rss, finalHeap: final.current.heapUsed, containerPeak: final.containerPeak, containerCurrent: final.containerCurrent, ledgerAfterTTL: final.ledger, drafts: final.drafts, receipts: final.receipts, policyChecks: final.policyChecks, memoryEvents: final.memoryEvents }));
    } finally { clearInterval(sampler); }
  }
  console.log(`DOCKER_SCENARIOS_PASS:${passed}; provider real calls=0`);
} finally {
  try {
    // A timed-out HTTP observer is not proof that server work ended. Do not
    // race cleanup against a late approval transaction; fail closed if unsettled.
    const deadline = Date.now() + 12000;
    while (metric().ledger.active && Date.now() < deadline) await sleep(100);
    assert.equal(metric().ledger.active, 0, 'FIXTURE_CLEANUP_BLOCKED_BY_ACTIVE_WORK');
    for (const [name, field, targets] of [
      ['translations', 'projectId', ids.projects], ['transcriptsegments', '_id', ids.segments], ['transcripts', '_id', ids.transcripts], ['projects', '_id', ids.projects], ['users', '_id', ids.users], ['languages', '_id', ids.languages],
    ] as const) {
      for (let i = 0; i < targets.length; i += 500) await db.collection(name).deleteMany({ [field]: { $in: targets.slice(i, i + 500) } });
      assert.equal(await db.collection(name).countDocuments({ [field]: { $in: targets } }), 0);
    }
    console.log('DOCKER_FIXTURE_CLEANUP_PASS; development/production writes=0');
  } finally { await mongoose.disconnect(); }
}
