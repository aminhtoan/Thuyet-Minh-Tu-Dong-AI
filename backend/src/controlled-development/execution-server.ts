import { existsSync, readFileSync, statSync } from 'node:fs';
import express from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { digest } from '../services/translation/group-plan.js';
import { controlledTarget, withPermittedSource } from '../services/translation/controlled-development.js';
import { OneUsePermitFence } from '../services/translation/one-use-permit.js';

// No dotenv/config/app import before explicit enable + secret validation.
if (process.env.NODE_ENV !== 'development' || process.env.HOSTNAME !== 'narration-controlled-execution' || existsSync('/app/.env') || ['MONGODB_URI', 'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'OPENAI_API_KEY', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'].some(key => !!process.env[key])) throw new Error('CONTROLLED_EXECUTION_STARTUP_DENIED');
const networkFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('CONTROLLED_UNFENCED_NETWORK_DENIED'); };
let server: ReturnType<ReturnType<typeof express>['listen']>;
if (process.env.CONTROLLED_EXECUTION_ENABLE !== 'true') {
  const app = express(); app.disable('x-powered-by');
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', mode: 'LOCKED' }));
  app.use((_req, res) => res.status(503).json({ error: { code: 'CONTROLLED_EXECUTION_NOT_APPROVED' } }));
  server = app.listen(8083, '0.0.0.0'); // No file credentials, MongoDB or SDK touched.
} else {
  try {
    const readSecret = (file: string) => { if (!statSync(file).isFile() || statSync(file).size > 16384) throw new Error('SECRET_FILE_INVALID'); return JSON.parse(readFileSync(file, 'utf8')); };
    const credentials = z.object({ mongoUri: z.string().min(1), databaseName: z.literal('multilingual_ai_narration'), expectedSrvHost: z.string().regex(/^[a-z0-9.-]+\.mongodb\.net$/i), expectedReplicaSet: z.string().min(1).max(100), model: z.literal(controlledTarget.model), geminiApiKey: z.string().min(1), jwtAccessSecret: z.string().min(32), jwtRefreshSecret: z.string().min(32), corsOrigins: z.array(z.string().url()).min(1).max(4) }).strict().parse(readSecret('/run/secrets/controlled-credentials.json'));
    const uri = new URL(credentials.mongoUri);
    if (uri.protocol !== 'mongodb+srv:' || uri.hostname !== credentials.expectedSrvHost || uri.pathname !== `/${credentials.databaseName}` || uri.hash || credentials.jwtAccessSecret === credentials.jwtRefreshSecret) throw new Error('DEPLOYMENT_SCOPE_DENIED');
    const fence = await OneUsePermitFence.open('/var/lib/narration-permits', readSecret('/run/secrets/controlled-permit.json'));
    if (fence.permit.deploymentId !== digest([credentials.expectedSrvHost, credentials.databaseName, credentials.expectedReplicaSet])) throw new Error('DEPLOYMENT_PERMIT_MISMATCH');
    mongoose.set('autoCreate', false); mongoose.set('autoIndex', false);
    await mongoose.connect(credentials.mongoUri, { dbName: credentials.databaseName, autoCreate: false, autoIndex: false, maxPoolSize: 4, serverSelectionTimeoutMS: 10000 });
    const db = mongoose.connection.db!, h = await db.admin().command({ hello: 1 });
    if (db.databaseName !== credentials.databaseName || h.setName !== credentials.expectedReplicaSet || !h.isWritablePrimary || h.logicalSessionTimeoutMinutes == null || !Array.isArray(h.hosts) || !h.hosts.length || h.hosts.some((host: string) => !/^[a-z0-9.-]+\.mongodb\.net:\d+$/i.test(host))) throw new Error('DEPLOYMENT_IDENTITY_DENIED');
    process.env.MONGODB_URI = credentials.mongoUri;
    process.env.JWT_ACCESS_SECRET = credentials.jwtAccessSecret; process.env.JWT_REFRESH_SECRET = credentials.jwtRefreshSecret;
    process.env.JWT_ACCESS_EXPIRES_IN = '15m'; process.env.JWT_REFRESH_EXPIRES_IN = '1d';
    process.env.GROUP_TRANSLATION_ENABLED = 'false'; process.env.CONTROLLED_PROVIDER_MODE = 'PERMIT';
    const { GroupAdmission } = await import('../services/translation/group-admission.js');
    const { GroupTranslationService } = await import('../services/translation/group-translation.service.js');
    const { ControlledGeminiProvider } = await import('../services/translation/controlled-gemini.provider.js');
    const { verifyExecutionSource } = await import('./execution-source.js');
    const { executionApp } = await import('./execution-app.js');
    const admission = await withPermittedSource(fence, fence.permit.ownerId, async () => new GroupAdmission({ sourceBytes: 131072, requestCredits: 5 * 1024 * 1024, processCredits: 32 * 1024 * 1024, maxActive: 4, maxActivePerUser: 2 }));
    const provider = new ControlledGeminiProvider(fence, credentials.geminiApiKey, async () => { await verifyExecutionSource(fence, admission); }, networkFetch, counts => console.log('CONTROLLED_USAGE:', JSON.stringify(counts)));
    const service = new GroupTranslationService(provider, undefined, admission);
    // Read-only startup validation; no metadata/generation or draft creation.
    await withPermittedSource(fence, fence.permit.ownerId, () => admission.operation(fence.permit.ownerId, async () => { await verifyExecutionSource(fence, admission); }));
    server = executionApp(fence, service, admission, credentials.corsOrigins).listen(8083, '0.0.0.0');
  } catch {
    console.error('CONTROLLED_EXECUTION_STARTUP_BLOCKED');
    await mongoose.disconnect(); process.exit(1); // No raw errors, URI, key or submitted content.
  }
}
server.requestTimeout = 120000; server.headersTimeout = 15000;
process.once('SIGTERM', () => server.close(() => { void mongoose.disconnect().then(() => process.exit(0)); }));
console.log('CONTROLLED_EXECUTION_LISTENER:8083; no automatic provider dispatch');
