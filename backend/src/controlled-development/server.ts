// Dedicated readiness executable. Never imported by src/server.ts.
import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import express from 'express';
import helmet from 'helmet';
import { getHeapStatistics } from 'node:v8';
import { controlledTarget, withControlledSource, assertControlledRequest } from '../services/translation/controlled-development.js';

const uri = 'mongodb://narration-groups-test-mongodb:27029/multilingual_ai_narration_groups_test?replicaSet=narration-test-rs&directConnection=true';
if (process.env.NODE_ENV !== 'development' || process.env.CONTROLLED_PROVIDER_MODE !== 'DENY' || process.env.HOSTNAME !== 'narration-controlled-readiness' || existsSync('/app/.env') || process.env.TEST_MONGODB_URI !== uri || !/^[a-f\d]{24}$/i.test(process.env.EXPECTED_MONGO_PROCESS_ID ?? '') || ['GEMINI_API_KEY', 'OPENAI_API_KEY', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'MONGODB_URI'].some(key => !!process.env[key])) throw new Error('CONTROLLED_STARTUP_DENIED');
globalThis.fetch = async () => { throw new Error('CONTROLLED_EXTERNAL_FETCH_DENIED'); };
mongoose.set('autoCreate', false); mongoose.set('autoIndex', false);
await mongoose.connect(uri, { dbName: 'multilingual_ai_narration_groups_test', autoCreate: false, autoIndex: false, maxPoolSize: 4, serverSelectionTimeoutMS: 5000 });
const db = mongoose.connection.db!;
const hello = await db.admin().command({ hello: 1 });
if (db.databaseName !== 'multilingual_ai_narration_groups_test' || hello.setName !== 'narration-test-rs' || !hello.isWritablePrimary || hello.topologyVersion?.processId?.toString() !== process.env.EXPECTED_MONGO_PROCESS_ID || hello.hosts?.length !== 1 || hello.hosts[0] !== 'localhost:27029') throw new Error('CONTROLLED_DATABASE_ISOLATION_DENIED');
process.env.MONGODB_URI = uri;
process.env.JWT_ACCESS_SECRET = randomBytes(48).toString('hex');
process.env.JWT_REFRESH_SECRET = randomBytes(48).toString('hex');
process.env.JWT_ACCESS_EXPIRES_IN = '15m'; process.env.JWT_REFRESH_EXPIRES_IN = '1d';
process.env.GROUP_TRANSLATION_ENABLED = 'false';
// Ephemeral isolated-fixture signing key, never a customer/development secret.
// Readable only inside this container by its operator; never returned over HTTP.
writeFileSync('/tmp/readiness-auth.json', JSON.stringify({ accessSecret: process.env.JWT_ACCESS_SECRET }), { mode: 0o600 });
const { authenticate } = await import('../middleware/authenticate.middleware.js');
const { authorize } = await import('../middleware/authorize.middleware.js');
const { requireProjectOwner } = await import('../middleware/project-owner.middleware.js');
const { errorHandlerMiddleware } = await import('../middleware/error-handler.middleware.js');
const { GroupAdmission } = await import('../services/translation/group-admission.js');
const { GroupTranslationService } = await import('../services/translation/group-translation.service.js');
const { groupResponseHandler } = await import('../services/translation/group-response.js');
const { AppError } = await import('../utils/app-error.js');
const admission = await withControlledSource('000000000000000000000000', async () => new GroupAdmission({ sourceBytes: 128 * 1024, requestCredits: 5 * 1024 * 1024, processCredits: 32 * 1024 * 1024, maxActive: 4, maxActivePerUser: 2 }));
const service = new GroupTranslationService({ async translate() { throw new AppError(503, 'CONTROLLED_PROVIDER_DENIED', 'Readiness only.'); } }, undefined, admission);
const app = express(); app.disable('x-powered-by'); app.use(helmet());
app.get('/api/health', (_req, res) => res.json({ status: 'ok', mode: 'DENY', database: 'isolated-test-only', heapLimit: getHeapStatistics().heap_size_limit, ledger: admission.snapshot() }));
app.use('/api/projects', authenticate, authorize('CUSTOMER'));
app.get('/api/projects/:id/preflight', requireProjectOwner, async (req, res, next) => {
  try {
    await withControlledSource(req.user!.id, async () => {
      assertControlledRequest(String(req.params.id), req.user!.id, 'en');
      await groupResponseHandler(admission, async () => {
        const plan = await service.plan(String(req.params.id), req.user!.id, 'en');
        // Metadata only; never expose transcript text through readiness.
        return { projectId: plan.projectId, revision: plan.transcriptRevision, digest: plan.sourceRevision, segmentCount: plan.sourceSegmentCount, groupCount: plan.groups.length, targetLanguage: controlledTarget.targetLanguage };
      })(req, res, next);
    });
  } catch (error) { next(error); }
});
app.use((_req, res) => res.status(503).json({ error: { code: 'CONTROLLED_PROVIDER_AND_MUTATIONS_DENIED' } }));
app.use(errorHandlerMiddleware);
const server = app.listen(8082, '0.0.0.0', () => console.log('CONTROLLED_READINESS_READY:8082; DENY; isolated database only'));
server.requestTimeout = 120000; server.headersTimeout = 15000;
process.once('SIGTERM', () => server.close(() => { void mongoose.disconnect().then(() => process.exit(0)); }));
