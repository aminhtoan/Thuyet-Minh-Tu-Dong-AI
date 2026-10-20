import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { getHeapStatistics } from 'node:v8';
import mongoose from 'mongoose';
import express from 'express';
import { verifyContainerDatabase, uri, containerMemory } from './isolation.js';

await verifyContainerDatabase(); // No application import/startup or writes before identity.
process.env.MONGODB_URI = uri; process.env.PORT = '8081';
process.env.JWT_ACCESS_SECRET = randomBytes(48).toString('hex');
process.env.JWT_REFRESH_SECRET = randomBytes(48).toString('hex');
process.env.JWT_ACCESS_EXPIRES_IN = '15m'; process.env.JWT_REFRESH_EXPIRES_IN = '1d';
process.env.GROUP_TRANSLATION_ENABLED = 'true'; // ONLY this isolated validation process.
process.env.GEMINI_API_KEY = 'local-mock-only'; process.env.OPENAI_API_KEY = '';
process.env.TRANSLATION_PROVIDER = 'gemini';
globalThis.fetch = async () => { throw new Error('VALIDATION_EXTERNAL_FETCH_FORBIDDEN'); };
const { createApp } = await import('../../src/app.js');
const { createApiRouter } = await import('../../src/routes/index.js');
const { createProjectRouter } = await import('../../src/routes/project.routes.js');
const { groupProfileControllers } = await import('../../src/controllers/translation.controller.js');
const { GroupAdmission } = await import('../../src/services/translation/group-admission.js');
const { GroupDraftStore } = await import('../../src/services/translation/group-draft-store.js');
const { GroupTranslationService, loadSource, assertApprovedCurrent, boundedTranslationRecord } = await import('../../src/services/translation/group-translation.service.js');
const { GeminiGroupTranslationProvider } = await import('../../src/services/translation/gemini-group-translation.provider.js');
const { getTranslation } = await import('../../src/services/translation-processing.service.js');
const { requireProjectOwner } = await import('../../src/middleware/project-owner.middleware.js');
const { groupResponseHandler } = await import('../../src/services/translation/group-response.js');
const admission = new GroupAdmission({ sourceBytes: 128 * 1024, requestCredits: 5 * 1024 * 1024, processCredits: 32 * 1024 * 1024, maxActive: 4, maxActivePerUser: 2 });
const store = new GroupDraftStore(Date.now, 3000); // Wall-clock test TTL, no time travel.
let generations = 0, policyChecks = 0, samples = 0;
const provider = new GeminiGroupTranslationProvider({
  async metadata() { return { supportedActions: ['generateContent'] }; },
  async generate(_model, input) {
    generations++;
    await new Promise(resolve => setTimeout(resolve, 200));
    return { finishReason: 'STOP', text: JSON.stringify({ outcome: 'translated', groups: input.groups.map(g => ({ groupId: g.groupId, translatedText: 'Synthetic Docker English.' })) }) };
  },
});
const service = new GroupTranslationService(provider, store, admission);
const projects = createProjectRouter(groupProfileControllers(service, admission));
projects.post('/:id/validation-policy', requireProjectOwner, groupResponseHandler(admission, async req => {
  const id = req.ownedProjectId!;
  const approved = await service.approved(id, req.user!.id, 'en'); // Bounded record/provenance before compatibility reader.
  const reader = await getTranslation(id, 'en', true);
  const record = await boundedTranslationRecord({ projectId: id, targetLanguage: 'en' });
  if (!record) throw new Error('VALIDATION_ARTIFACT_MISSING');
  // Exact validation calls used by narration.service at start/completion;
  // no narration job, voice resolution, provider invocation or audio write.
  assertApprovedCurrent(record, await loadSource(id));
  const session = await mongoose.startSession();
  try { await session.withTransaction(async () => assertApprovedCurrent(record, await loadSource(id, session))); }
  finally { await session.endSession(); }
  if (!('sourceSegmentCount' in reader) || reader.sourceSegmentCount !== approved.sourceSegmentCount) throw new Error('VALIDATION_READER_COVERAGE_MISMATCH');
  policyChecks++;
  return { success: true, data: { reader: 'CURRENT', ttsStart: 'CURRENT', ttsCompletion: 'CURRENT', sourceSegmentCount: approved.sourceSegmentCount } };
}));
const routes = express.Router();
routes.use((req, res, next) => {
  if ((req.method === 'GET' && req.path === '/health') || /^\/projects\/[a-f\d]{24}\/(translations(?:\/|$)|validation-policy$)/i.test(req.path)) next();
  else res.status(503).json({ error: 'VALIDATION_ONLY_ROUTE_BLOCKED' });
});
routes.use(createApiRouter(projects));
const app = createApp(routes);
const server = app.listen(8081, '0.0.0.0');
writeFileSync('/tmp/runtime.json', JSON.stringify({ accessSecret: process.env.JWT_ACCESS_SECRET, pid: process.pid }), { mode: 0o600 });
let peak = { rss: 0, heapUsed: 0, external: 0 };
const timer = setInterval(() => {
  samples++; const current = process.memoryUsage();
  peak = { rss: Math.max(peak.rss, current.rss), heapUsed: Math.max(peak.heapUsed, current.heapUsed), external: Math.max(peak.external, current.external) };
  const cache = store as unknown as { drafts: Map<string, unknown>; requests: Map<string, unknown> };
  const memory = containerMemory();
  writeFileSync('/tmp/metrics.json', JSON.stringify({ pid: process.pid, node: process.version, heapLimit: getHeapStatistics().heap_size_limit, current, peak, samples, generations, policyChecks, ledger: admission.snapshot(), drafts: cache.drafts.size, receipts: cache.requests.size, containerCurrent: memory.current, containerPeak: memory.peak, memoryEvents: memory.events, memoryFailures: memory.failures, cgroupVersion: memory.version }));
}, 25); timer.unref();
process.once('SIGTERM', () => { clearInterval(timer); server.close(() => { void mongoose.disconnect().then(() => process.exit(0)); }); });
console.log('VALIDATION_LISTENER_READY:8081; isolated MongoDB; mock-only; no credentials in logs');
