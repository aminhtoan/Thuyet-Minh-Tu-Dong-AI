// Explicit read-only diagnostic, never part of *.test.ts discovery. No app
// startup/models/provider imports, index creation, migration or write commands.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { boundedTextProjection, collectBoundedSource } from '../src/services/translation/bounded-source.js';
import { candidateGroups, revision, digest } from '../src/services/translation/group-plan.js';
// Historical museum-only diagnostic, not a dynamic execution authorizer.
const controlledTarget = { projectId: '6ad5c93a86cf95b7523704a5', transcriptRevision: 1, sourceDigest: '81638f2cb62e5f5f010853b047855cb72ace5ddbb2ca083890b51cdd2fe44906', model: 'gemini-3.8-flash' };

const config = dotenv.parse(readFileSync(fileURLToPath(new URL('../.env', import.meta.url))));
const uri = config.MONGODB_URI;
const instance = new mongoose.Mongoose();
try {
  if (!uri || (config.NODE_ENV && config.NODE_ENV !== 'development')) throw new Error('READ_ONLY_TARGET_BLOCKED');
  const parsed = new URL(uri);
  if (!['mongodb:', 'mongodb+srv:'].includes(parsed.protocol) || parsed.pathname !== '/multilingual_ai_narration') throw new Error('READ_ONLY_TARGET_BLOCKED');
  await instance.connect(uri, { dbName: 'multilingual_ai_narration', autoCreate: false, autoIndex: false, serverSelectionTimeoutMS: 10000, maxPoolSize: 1 });
  const db = instance.connection.db!;
  if (db.databaseName !== 'multilingual_ai_narration') throw new Error('READ_ONLY_TARGET_BLOCKED');
  const projectId = new mongoose.Types.ObjectId('6ad5c93a86cf95b7523704a5');
  const project = await db.collection('projects').findOne({ _id: projectId }, { projection: { _id: 1, userId: 1, sourceLanguage: 1, status: 1 } });
  if (!project || project.sourceLanguage !== 'vi') throw new Error('READ_ONLY_PROJECT_BLOCKED');
  const [header] = await db.collection('transcripts').aggregate([
    { $match: { projectId } }, { $limit: 1 },
    { $project: { _id: 1, revision: 1, status: 1, languageCode: boundedTextProjection('languageCode', 20), fullText: boundedTextProjection('fullText', 128 * 1024) } },
  ]).toArray();
  if (!header || !['READY', 'SAVED'].includes(header.status) || !Number.isSafeInteger(header.revision) || header.revision < 1) throw new Error('READ_ONLY_SOURCE_BLOCKED');
  const cursor = db.collection('transcriptsegments').aggregate([
    { $match: { transcriptId: header._id } }, { $sort: { sequence: 1 } }, { $limit: 10001 },
    { $project: { _id: 1, sequence: 1, startTime: 1, endTime: 1, text: boundedTextProjection('text', 128 * 1024) } },
  ], { batchSize: 1 });
  // Enable only the collector's lab byte ceiling in this diagnostic process.
  // This does NOT start the backend, enable flags, or enable any mutation route.
  process.env.NODE_ENV = 'test';
  const sourceHeader = { transcriptId: String(header._id), transcriptRevision: header.revision, languageCode: header.languageCode, fullText: header.fullText };
  let source;
  try {
    source = await collectBoundedSource(sourceHeader, (async function* () {
      for await (const row of cursor) yield { id: String(row._id), sequence: row.sequence, text: row.text, startTime: row.startTime, endTime: row.endTime };
    })(), 128 * 1024);
  } finally { await cursor.close(); }
  const current = await db.collection('transcripts').findOne({ _id: header._id, projectId }, { projection: { revision: 1 } });
  if (!current || current.revision !== source.transcriptRevision) throw new Error('READ_ONLY_REVISION_CHANGED');
  const groups = candidateGroups(source), bytes = Buffer.byteLength(JSON.stringify(source));
  const restored = JSON.parse(JSON.stringify(source));
  if (revision(restored) !== revision(source) || source.fullText !== source.segments.map(s => s.text).join(' ') || groups.flatMap(g => g.sourceSegmentIds).join(',') !== source.segments.map(s => s.id).join(',')) throw new Error('READ_ONLY_INTEGRITY_BLOCKED');
  console.log(JSON.stringify({ preflight: 'PASS', database: db.databaseName, projectId: String(projectId), sourceLanguage: source.languageCode, transcriptRevision: source.transcriptRevision, segments: source.segments.length, groups: groups.length, sourceBytes: bytes, defaultAdmission: bytes <= 98304, candidateAdmission: bytes <= 128 * 1024, digestAndCoverage: 'PASS', writes: 0, aiRequests: 0 }));
  if (process.argv.includes('--translation') || process.argv.includes('--permit-binding')) {
    // Read-only metadata and local size accounting. Never call models/countTokens,
    // generate, application startup or any mutation/index API.
    const target = await db.collection('languages').findOne({ code: 'en' }, { projection: { _id: 0, code: 1, isActive: 1 } });
    const translations = await db.collection('translations').find({ projectId, targetLanguage: 'en' }, { projection: { _id: 0, status: 1, alignmentFormat: 1, sourceTranscriptRevision: 1, sourceRevision: 1, transcriptId: 1 } }).limit(21).toArray();
    const runningJobs = await db.collection('processingjobs').countDocuments({ projectId, type: 'TRANSLATION', status: { $in: ['QUEUED', 'PROCESSING'] } });
    const finalRevision = await db.collection('transcripts').findOne({ _id: header._id, projectId }, { projection: { revision: 1 } });
    if (!finalRevision || finalRevision.revision !== source.transcriptRevision) throw new Error('READ_ONLY_REVISION_CHANGED');
    const provider = process.env.TRANSLATION_PROVIDER?.trim().toLowerCase() || config.TRANSLATION_PROVIDER?.trim().toLowerCase() || 'gemini';
    const configuredModel = process.env.GEMINI_TRANSLATION_MODEL?.trim() || config.GEMINI_TRANSLATION_MODEL?.trim() || 'gemini-3.8-flash';
    const model = /^gemini-[a-z0-9.-]+$/.test(configuredModel) ? configuredModel : 'INVALID_MODEL_CONFIGURATION';
    const input = { fullText: source.fullText, sourceLanguage: source.languageCode, targetLanguage: 'en', groups: groups.map(g => ({ groupId: g.groupId, sourceText: g.sourceText })) };
    // Empty values used ONLY to measure mandatory JSON framing; not translations.
    const envelope = { outcome: 'translated', groups: groups.map(g => ({ groupId: g.groupId, translatedText: '' })) };
    const sourceDigest = revision(source);
    console.log(JSON.stringify({ translationPreflight: target?.isActive && translations.length === 0 && runningJobs === 0 ? 'SOURCE_READY_RUNTIME_PROVIDER_NOT_VERIFIED' : 'BLOCKED',
      sourceDigest, targetLanguage: 'en', targetActive: target?.isActive === true, projectStatus: project.status,
      englishRecords: translations.length, translationListTruncated: translations.length > 20,
      sourceRevisionMatchingEnglishRecords: translations.filter(t => String(t.transcriptId) === source.transcriptId && t.sourceTranscriptRevision === source.transcriptRevision && t.sourceRevision === sourceDigest).length,
      runningTranslationJobs: runningJobs, provider: provider === 'gemini' ? 'gemini' : 'NON_GEMINI_CONFIGURED', model,
      apiKey: (process.env.GEMINI_API_KEY?.trim() || config.GEMINI_API_KEY?.trim()) ? 'PRESENT' : 'MISSING',
      globalGroupFlag: process.env.GROUP_TRANSLATION_ENABLED ?? config.GROUP_TRANSLATION_ENABLED ?? 'false',
      sourceCharacters: source.fullText.length, sourceWhitespaceUnits: source.fullText.trim().split(/\s+/u).length,
      providerInputCharacters: JSON.stringify(input).length, providerInputUtf8Bytes: Buffer.byteLength(JSON.stringify(input)),
      groupIdCharacters: groups.reduce((n, g) => n + g.groupId.length, 0),
      emptyOutputEnvelopeCharacters: JSON.stringify(envelope).length, emptyOutputEnvelopeBytes: Buffer.byteLength(JSON.stringify(envelope)),
      largestGroupCharacters: Math.max(...groups.map(g => g.sourceText.length)), writes: 0, aiRequests: 0 }));
    if (process.argv.includes('--permit-binding')) {
      const hello = await db.admin().command({ hello: 1 });
      const owner = await db.collection('users').findOne({ _id: project.userId, deletedAt: null, role: 'CUSTOMER', status: 'ACTIVE' }, { projection: { _id: 1 } });
      if (!owner || sourceDigest !== controlledTarget.sourceDigest || source.transcriptRevision !== controlledTarget.transcriptRevision || !target?.isActive || translations.length || runningJobs || provider !== 'gemini' || model !== controlledTarget.model || parsed.protocol !== 'mongodb+srv:' || !hello.isWritablePrimary || !hello.setName) throw new Error('READ_ONLY_PERMIT_BINDING_BLOCKED');
      // Hashes + identity only, never source text, credentials or an active grant.
      console.log(JSON.stringify({ permitBinding: 'UNAPPROVED', ownerId: String(owner._id), projectId: String(projectId), revision: source.transcriptRevision, sourceDigest,
        inputDigest: digest(input), planDigest: digest(input.groups.map(g => g.groupId)), deploymentId: digest([parsed.hostname, db.databaseName, hello.setName]),
        expectedReplicaSet: hello.setName, model, sourceLanguage: 'vi', targetLanguage: 'en', thinking: 'DEFAULT', lowExplicitlyApproved: false, writes: 0, aiRequests: 0 }));
    }
  }
} catch (error) {
  console.log(JSON.stringify({ preflight: 'BLOCKED', errorType: error instanceof Error ? error.name : 'Unknown', writes: 0, aiRequests: 0 }));
  process.exitCode = 1;
} finally { await instance.disconnect(); }
