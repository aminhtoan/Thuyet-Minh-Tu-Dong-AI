// Separate Node process, isolated test DB only. No provider imports/dispatch.
import mongoose from 'mongoose';
import { connectIsolatedMongo, TEST_DATABASE } from './isolated-mongo.js';
const verified = await connectIsolatedMongo(); await verified.instance.disconnect();
mongoose.set('autoCreate', false); mongoose.set('autoIndex', false);
await mongoose.connect(process.env.TEST_MONGODB_URI!, { dbName: TEST_DATABASE, autoCreate: false, autoIndex: false });
try {
  const scope = JSON.parse(process.argv[2]!);
  if (!scope || !['ownerId', 'projectId'].every(k => /^[a-f\d]{24}$/.test(scope[k])) || !/^[a-f\d]{64}$/.test(scope.sourceRevision) || scope.targetLanguage !== 'en') throw Error('SYNTHETIC_SCOPE_INVALID');
  const { CustomerAttemptStore } = await import('../../src/services/translation/customer-attempt.js');
  const { GroupDraftStore } = await import('../../src/services/translation/group-draft-store.js');
  const draft = await new CustomerAttemptStore().execute(scope, 'binding', async () => { throw Error('PROVIDER_REPLAY_FORBIDDEN'); });
  const restored = new GroupDraftStore().restore(draft);
  console.log(JSON.stringify({ recovery: 'PASS', draftId: restored.draftId, expiresAt: restored.expiresAt, providerCalls: 0 }));
} finally { await mongoose.disconnect(); }
