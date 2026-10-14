import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Language } from '../models/Language.js';
import { LANGUAGE_CATALOG, LanguageCatalogError, parseCatalogOptions, prepareLanguageCatalog, verifyCatalogTarget } from './language-catalog-data.js';

async function run() {
  dotenv.config({ quiet: true });
  const options = parseCatalogOptions(process.argv.slice(2));
  for (const record of LANGUAGE_CATALOG) await new Language(record).validate();
  if (options.offline) {
    console.info(JSON.stringify({ mode: 'offline-preview', existingRecords: 'UNKNOWN', proposed: LANGUAGE_CATALOG, databaseConnections: 0, databaseWrites: 0 }, null, 2));
    return;
  }
  verifyCatalogTarget(options, process.env.NODE_ENV, process.env.MONGODB_URI);
  // Do not create indexes/collections on connect, especially in dry-run.
  await mongoose.connect(process.env.MONGODB_URI!, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 5000 });
  const database = mongoose.connection.db?.databaseName;
  if (!database) throw new LanguageCatalogError('DATABASE_NOT_CONNECTED');
  verifyCatalogTarget(options, process.env.NODE_ENV, process.env.MONGODB_URI, database);
  const result = await prepareLanguageCatalog({
    async read() { return Language.find().select('code isActive -_id').lean(); },
    async hasUniqueCodeIndex() {
      try { return (await Language.collection.indexes()).some(index => index.unique === true && index.key.code === 1 && Object.keys(index.key).length === 1 && !index.partialFilterExpression); }
      catch { return false; }
    },
    async insertMissing(record) {
      const now = new Date();
      try {
        const result = await Language.collection.updateOne({ code: record.code }, { $setOnInsert: { ...record, createdAt: now, updatedAt: now } }, { upsert: true });
        return result.upsertedCount === 1;
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
          if (await Language.collection.findOne({ code: record.code }, { projection: { _id: 1 } })) return false;
          throw new LanguageCatalogError('INSERT_CONFLICT');
        }
        throw error;
      }
    },
  }, options.write);
  console.info(JSON.stringify({ database, environment: options.environment, ...result }, null, 2));
}
void run().catch(error => {
  // Never print driver errors, URIs, credentials or raw error messages.
  console.error(error instanceof LanguageCatalogError ? error.message : 'LANGUAGE_CATALOG_OPERATION_FAILED');
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
