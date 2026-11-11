// Only this package's dedicated new S39.6 volume. Never reconfigure existing RS.
try {
  const status = rs.status();
  if (status.set !== 's396rs') throw Error('UNEXPECTED_REPLICA_SET');
  const config = rs.conf();
  if (config.members.length !== 1 || config.members[0].host !== 'mongodb:27017') throw Error('UNEXPECTED_REPLICA_MEMBERS');
  if (!db.hello().isWritablePrimary) quit(1);
  quit(0);
} catch (error) {
  if (error.code !== 94 && error.codeName !== 'NotYetInitialized') throw error;
  rs.initiate({ _id: 's396rs', members: [{ _id: 0, host: 'mongodb:27017' }] });
  quit(1); // next health probe waits for election; no automatic reconfiguration
}
