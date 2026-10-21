import { realpath, readFile, readdir, unlink, rmdir, lstat } from 'node:fs/promises';
import { digest } from '../../src/services/translation/group-plan.js';
import { owner, input } from './fixtures.js';
if (process.env.HOSTNAME !== 'narration-dispatch-durability' || process.env.DISPATCH_MOCK_ONLY !== 'true') throw new Error('SYNTHETIC_CLEANUP_DENIED');
const directory = process.argv.includes('--crash') ? '/var/lib/narration-permits/synthetic-claim-crash-fixture' : '/var/lib/narration-permits/synthetic-dispatch-fixture';
if (await realpath(directory) !== directory) throw new Error('SYNTHETIC_PATH_DENIED');
const record = JSON.parse(await readFile(`${directory}/test-run.json`, 'utf8'));
if (record.permit.ownerId !== owner || record.permit.inputDigest !== digest(input) || !/^[a-f\d-]{36}$/.test(record.permit.id)) throw new Error('SYNTHETIC_FIXTURE_DENIED');
const allowed = new Set(['test-run.json', ...['binding', 'metadata-spent', 'metadata-verified', 'generation-spent'].map(stage => `${record.permit.id}.${stage}`)]);
const files = await readdir(directory);
for (const file of files) {
  const stat = await lstat(`${directory}/${file}`);
  if (!allowed.has(file) || !stat.isFile() || stat.isSymbolicLink()) throw new Error('SYNTHETIC_CONTENT_DENIED');
}
for (const file of files) await unlink(`${directory}/${file}`);
await rmdir(directory); // Exact known synthetic directory; never recursive, never the volume root.
console.log('SYNTHETIC_PERMIT_FIXTURE_CLEANUP:PASS');
