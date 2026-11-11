// Synthetic fixtures only. Deliberately ASCII and passed through stdin.
const hello = db.hello();
if (!hello.isWritablePrimary || hello.setName !== 's396rs') throw Error('S396_NOT_PRIMARY');
print('PRIMARY_PASS s396rs');
const fixtureDb = db.getSiblingDB('s396_local_cd');
if (!fixtureDb.getCollectionNames().includes('s396_acceptance')) fixtureDb.createCollection('s396_acceptance');
const collection = fixtureDb.s396_acceptance;
const committedId = 's396-committed-sentinel';
const existing = collection.findOne({ _id: committedId });
if (existing && (existing.value !== 'synthetic-persistence' || existing.version !== 1)) throw Error('UNEXPECTED_EXISTING_FIXTURE');
const session = db.getMongo().startSession();
try {
  const target = session.getDatabase('s396_local_cd').s396_acceptance;
  session.startTransaction();
  target.updateOne({ _id: committedId }, { $setOnInsert: { value: 'synthetic-persistence', version: 1 } }, { upsert: true });
  session.commitTransaction();
  const actual = collection.findOne({ _id: committedId });
  if (!actual || actual.value !== 'synthetic-persistence' || actual.version !== 1) throw Error('COMMIT_FAILED');
  print('TRANSACTION_COMMIT_PASS');
  const abortId = 's396-aborted-' + new ObjectId().toHexString();
  session.startTransaction();
  target.insertOne({ _id: abortId, value: 'synthetic-abort' });
  session.abortTransaction();
  if (collection.findOne({ _id: abortId }) !== null) throw Error('ABORT_FAILED');
  print('TRANSACTION_ABORT_PASS');
} finally { session.endSession(); }
