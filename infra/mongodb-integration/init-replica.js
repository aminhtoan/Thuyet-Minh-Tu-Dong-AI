// Only runs inside the dedicated test container. Never reconfigures a replica set.
const admin = db.getSiblingDB('admin');
let hello = admin.runCommand({ hello: 1 });
if (!hello.setName) {
  try {
    rs.initiate({ _id: 'narration-test-rs', members: [{ _id: 0, host: 'localhost:27029' }] });
  } catch (error) {
    if (error.codeName !== 'AlreadyInitialized') quit(1);
  }
  hello = admin.runCommand({ hello: 1 });
}
if (hello.setName !== 'narration-test-rs' || !hello.isWritablePrimary) quit(1);
const config = rs.conf();
if (config.members.length !== 1 || config.members[0].host !== 'localhost:27029') quit(1);
quit(0);
