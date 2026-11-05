import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { catalogMode, GeminiCatalogError, GEMINI_VOICE_CATALOG, hasVoiceUniqueIndex, planGeminiVoices, verifyGeminiTarget, voiceInsertOperation, type ExistingVoice } from './gemini-voice-catalog-data.js';

async function run() {
  const mode = catalogMode(process.argv.slice(2));
  dotenv.config({ quiet: true });
  verifyGeminiTarget(process.env.MONGODB_URI, process.env.NODE_ENV, process.env.TTS_PROVIDER);
  // Native collection access only: no Model initialization or implicit DDL.
  await mongoose.connect(process.env.MONGODB_URI!, { autoCreate: false, autoIndex: false, serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db!;
  const hello = await db.admin().command({ hello: 1 });
  if (db.databaseName !== 'multilingual_ai_narration' || !hello.isWritablePrimary || !hello.setName || !Array.isArray(hello.hosts) || !hello.hosts.length || !hello.hosts.every((h: string) => /^[a-z0-9.-]+\.mongodb\.net(?::\d+)?$/i.test(h))) throw new GeminiCatalogError('ATLAS_TARGET_NOT_VERIFIED');
  const names = (await db.listCollections({}, { nameOnly: true }).toArray()).map(c => c.name);
  if (!names.includes('voices') || !names.includes('languages')) throw new GeminiCatalogError('REQUIRED_COLLECTION_MISSING');
  const voices = db.collection('voices');
  if (!hasVoiceUniqueIndex(await voices.indexes())) throw new GeminiCatalogError('UNIQUE_INDEX_MISSING_OR_UNSUITABLE');
  const languages = await db.collection('languages').find({ code: /^en$/i }).toArray();
  if (languages.length !== 1 || languages[0]!.code !== 'en' || languages[0]!.isActive !== true) throw new GeminiCatalogError('EN_LANGUAGE_CONFLICT_OR_INACTIVE');
  const languageId = languages[0]!._id;
  const snapshot = async () => ({ total: await voices.countDocuments(), openai: await voices.countDocuments({ provider: 'openai' }), gemini: await voices.countDocuments({ provider: 'gemini' }) });
  const before = await snapshot();
  const readPlan = async (session?: mongoose.mongo.ClientSession) => planGeminiVoices(await voices.find({ languageId }, { session }).toArray() as unknown as ExistingVoice[], String(languageId));
  const plan = await readPlan();
  console.info(JSON.stringify({ mode, targetVerified: true, language: 'en', uniqueIndexVerified: true, planned: plan.planned.length, existing: plan.existing, conflict: plan.conflicts.length, conflictVoices: plan.conflicts, before }));
  if (plan.conflicts.length) throw new GeminiCatalogError('CATALOG_CONFLICT_NO_WRITES');
  let inserted = 0;
  if (mode === 'apply') {
    const session = await mongoose.startSession();
    try {
      // No transaction retry: an ambiguous result must be reviewed by an operator.
      session.startTransaction();
      const current = await readPlan(session);
      if (current.conflicts.length) throw new GeminiCatalogError('CATALOG_CONFLICT_NO_WRITES');
      for (const voice of current.planned) {
        const op = voiceInsertOperation(voice, languageId, new Date());
        const result = await voices.updateOne(op.filter, op.update, { upsert: true, session });
        if (result.upsertedCount !== 1) throw new GeminiCatalogError('CONCURRENT_CATALOG_CHANGE');
        inserted++;
      }
      await session.commitTransaction();
    } catch (error) {
      if (session.inTransaction()) await session.abortTransaction();
      throw error;
    } finally { await session.endSession(); }
  }
  console.info(JSON.stringify({ mode, inserted, catalogSize: GEMINI_VOICE_CATALOG.length, after: await snapshot(), databaseWrites: mode === 'dry-run' ? 0 : inserted }));
}
void run().catch(error => {
  console.error(error instanceof GeminiCatalogError ? error.message : 'GEMINI_CATALOG_FAILED_REVIEW_BEFORE_RETRY');
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
