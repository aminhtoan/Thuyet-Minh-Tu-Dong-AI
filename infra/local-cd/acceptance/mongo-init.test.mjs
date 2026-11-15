import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';

const source = readFileSync(new URL('./mongo-init.js', import.meta.url), 'utf8');
// Actual getCmdLineOpts shape recorded in resume-20261115T220409079.json.
const runtimeOptions = { ok: 1, parsed: { replication: { replSet: 's424rs' } } };
const cases = [
  ['runtime replSet accepted; uninitialized initiates once', {}, 1, 1],
  ['already initialized PRIMARY never re-initiates', { initialized: true }, 0, 0],
  ...[0, 2, 3, 5, 9].map(state => [`startup/election state ${state} waits`, { initialized: true, state }, 1, 0]),
  ['wrong replica set config rejected', { initialized: true, wrongSet: true }, 'UNEXPECTED_REPLICA_SET', 0],
  ['wrong member rejected', { initialized: true, wrongMember: true }, 'UNEXPECTED_REPLICA_MEMBERS', 0],
  ['wrong replSet option rejected', { options: { ok: 1, parsed: { replication: { replSet: 'other' } } } }, 'UNEXPECTED_REPLICA_SET_OPTIONS', 0],
  ['unknown config error rejected', { configError: true }, 'MONGO_COMMAND_FAILED', 0],
  ['transport error rejected', { transport: true }, 'transport', 0],
  ['ambiguous code 94 rejected', { ambiguous: true }, 'MONGO_COMMAND_FAILED', 0],
  ['config/status disagreement blocks initialization', { statusConflict: true }, 'REPLICA_INITIALIZATION_STATE_CHANGED', 0],
  ['config appears before initiation: blocked', { race: true }, 'REPLICA_INITIALIZATION_STATE_CHANGED', 0],
  ['unknown status error rejected', { statusError: true }, 'MONGO_COMMAND_FAILED', 0],
  ['initiation failure surfaced without retry', { initFailure: true }, 'MONGO_COMMAND_FAILED', 1],
  ['existing config and uninitialized status never re-initiate', { initialized: true, statusUninitialized: true }, 'MONGO_COMMAND_FAILED', 0],
  ['unexpected member state rejected', { initialized: true, state: 10 }, 'UNEXPECTED_REPLICA_STATE', 0],
  ['PRIMARY requires hello confirmation', { initialized: true, helloMismatch: true }, 'PRIMARY_NOT_CONFIRMED', 0],
  ['missing config response rejected', { initialized: true, missingConfig: true }, 'MISSING_REPLICA_CONFIG', 0],
  ['missing replSet rejected', { options: { ok: 1, parsed: { replication: {} } } }, 'UNEXPECTED_REPLICA_SET_OPTIONS', 0],
  ['empty replSet rejected', { options: { ok: 1, parsed: { replication: { replSet: '' } } } }, 'UNEXPECTED_REPLICA_SET_OPTIONS', 0],
  ['unexpected config structure rejected', { options: { ok: 1, parsed: null } }, 'UNEXPECTED_REPLICA_SET_OPTIONS', 0],
  ['unverified replSetName format rejected', { options: { ok: 1, parsed: { replication: { replSetName: 's424rs' } } } }, 'UNEXPECTED_REPLICA_SET_OPTIONS', 0],
  ['null replSet rejected', { options: { ok: 1, parsed: { replication: { replSet: null } } } }, 'UNEXPECTED_REPLICA_SET_OPTIONS', 0],
];

for (const [name, options, expected, expectedInitiations] of cases) {
  test(name, () => {
    let initiations = 0;
    let configReads = 0;
    const calls = [];
    const messages = [];
    const notInitialized = { ok: 0, code: 94, codeName: 'NotYetInitialized' };
    const config = {
      _id: options.wrongSet ? 'other' : 's424rs',
      members: [{ _id: 0, host: options.wrongMember ? 'other:27017' : 'mongodb:27017' }],
    };
    const db = {
      getSiblingDB(database) {
        assert.equal(database, 'admin');
        return {
          runCommand(command) {
            const kind = Object.keys(command)[0];
            calls.push(kind);
            switch (kind) {
              case 'getCmdLineOpts': return options.options ?? runtimeOptions;
              case 'replSetGetConfig':
                configReads++;
                if (options.transport) throw Error('transport');
                if (options.configError) return { ok: 0, code: 13, codeName: 'Unauthorized' };
                if (options.ambiguous) return { ok: 0, code: 94, codeName: 'Other' };
                return options.initialized || (options.race && configReads > 1)
                  ? { ok: 1, config: options.missingConfig ? undefined : config } : notInitialized;
              case 'replSetGetStatus':
                if (options.statusError) return { ok: 0, code: 13436, codeName: 'NotPrimaryOrSecondary' };
                if (options.statusUninitialized) return notInitialized;
                return options.initialized || options.statusConflict
                  ? { ok: 1, set: 's424rs', myState: options.state ?? 1 } : notInitialized;
              case 'hello': return { ok: 1, setName: 's424rs', isWritablePrimary: !options.helloMismatch };
              case 'replSetInitiate':
                initiations++;
                assert.deepEqual(JSON.parse(JSON.stringify(command.replSetInitiate)), {
                  _id: 's424rs', members: [{ _id: 0, host: 'mongodb:27017' }],
                });
                return options.initFailure ? { ok: 0, code: 23, codeName: 'AlreadyInitialized' } : { ok: 1 };
              default: throw Error(`Unexpected command: ${kind}`);
            }
          },
        };
      },
    };
    let result;
    try {
      vm.runInNewContext(source, {
        db, print(message) { messages.push(message); },
        quit(exit) { throw Object.assign(Error('quit'), { exit }); },
      }, { timeout: 1000 });
      result = 'missing-quit';
    } catch (error) { result = error.exit ?? error.message; }
    assert.equal(result, expected);
    assert.equal(initiations, expectedInitiations);
    if (expectedInitiations) {
      assert.deepEqual(calls.slice(0, 5), [
        'getCmdLineOpts', 'replSetGetConfig', 'replSetGetStatus', 'replSetGetConfig', 'replSetInitiate',
      ]);
    }
    if (name.startsWith('startup/election')) assert.deepEqual(messages, ['S424_REPLICA_WAITING_FOR_PRIMARY']);
    if (name.includes('option rejected') || /^(missing replSet|empty replSet|unexpected config structure|unverified replSetName|null replSet)/.test(name)) {
      assert.deepEqual(calls, ['getCmdLineOpts']);
    }
    assert.ok(!calls.includes('listDatabases'));
    assert.ok(!calls.includes('replSetReconfig'));
  });
}
