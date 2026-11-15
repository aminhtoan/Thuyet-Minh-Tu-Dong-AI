// Only mount on the ownership-verified acceptance volume. Never adopt arbitrary data.
// Config/status commands work before PRIMARY; listDatabases is not an init probe.
function command(value) {
  const result = db.getSiblingDB('admin').runCommand(value);
  if (result?.ok !== 1) {
    throw Object.assign(Error('MONGO_COMMAND_FAILED'), {
      code: result?.code, codeName: result?.codeName,
    });
  }
  return result;
}
function configOrUninitialized() {
  try {
    const result = command({ replSetGetConfig: 1 });
    if (!result.config) throw Error('MISSING_REPLICA_CONFIG');
    return result.config;
  } catch (error) {
    if (error.code === 94 && error.codeName === 'NotYetInitialized') return null;
    throw error; // Includes authorization, transport and unknown startup errors.
  }
}

const options = command({ getCmdLineOpts: 1 });
if (options.parsed?.replication?.replSet !== 's424rs') throw Error('UNEXPECTED_REPLICA_SET_OPTIONS');
const config = configOrUninitialized();
if (config === null) {
  // Require a second independent status confirmation; conflicting evidence blocks init.
  let uninitialized = false;
  try {
    command({ replSetGetStatus: 1 });
  } catch (error) {
    if (error.code !== 94 || error.codeName !== 'NotYetInitialized') throw error;
    uninitialized = true;
  }
  if (!uninitialized || configOrUninitialized() !== null) throw Error('REPLICA_INITIALIZATION_STATE_CHANGED');
  // MongoDB arbitrates concurrent initiation; any failure is surfaced, never reconfigured.
  command({ replSetInitiate: { _id: 's424rs', members: [{ _id: 0, host: 'mongodb:27017' }] } });
  print('S424_REPLICA_INITIALIZING');
  quit(1); // A later health probe verifies election; no database enumeration or reset.
} else {
  if (config._id !== 's424rs') throw Error('UNEXPECTED_REPLICA_SET');
  if (!Array.isArray(config.members) || config.members.length !== 1 ||
      config.members[0]._id !== 0 || config.members[0].host !== 'mongodb:27017') {
    throw Error('UNEXPECTED_REPLICA_MEMBERS');
  }
  const status = command({ replSetGetStatus: 1 });
  if (status.set !== 's424rs') throw Error('UNEXPECTED_REPLICA_STATUS');
  if (status.myState === 1) {
    const hello = command({ hello: 1 });
    if (hello.setName !== 's424rs' || hello.isWritablePrimary !== true) throw Error('PRIMARY_NOT_CONFIRMED');
    quit(0);
  } else {
    // Known STARTUP/SECONDARY/RECOVERING/STARTUP2/ROLLBACK states only wait.
    if (![0, 2, 3, 5, 9].includes(status.myState)) throw Error('UNEXPECTED_REPLICA_STATE');
    print('S424_REPLICA_WAITING_FOR_PRIMARY');
    quit(1);
  }
}
