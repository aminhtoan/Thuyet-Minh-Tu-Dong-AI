// Explicit read-only diagnostic, never part of *.test.ts discovery. No app
// startup/models/provider imports, index creation, migration or write commands.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { boundedTextProjection, collectBoundedSource } from '../src/services/translation/bounded-source.js';
import { candidateGroups, revision } from '../src/services/translation/group-plan.js';

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
  const project = await db.collection('projects').findOne({ _id: projectId }, { projection: { _id: 1, sourceLanguage: 1, status: 1 } });
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
} catch (error) {
  console.log(JSON.stringify({ preflight: 'BLOCKED', errorType: error instanceof Error ? error.name : 'Unknown', writes: 0, aiRequests: 0 }));
  process.exitCode = 1;
} finally { await instance.disconnect(); }
