import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath,URL} from 'node:url';
import {buildScope} from '../staging/runtime-scope.mjs';
test('real server graph includes routes/services and excludes independent executable bootstraps',()=>{
 const graph=buildScope(fileURLToPath(new URL('../src',import.meta.url)));
 const paths=new Set(graph.files.map(r=>r.path));
 assert.ok(paths.has('routes/index.ts'));assert.ok(paths.has('services/source-language.service.ts'));
 assert.ok(paths.has('services/auth.service.ts'));
 assert.equal(paths.has('scripts/seed-admin.ts'),false);
 assert.equal(paths.has('controlled-development/server.ts'),false);
 assert.deepEqual(graph.unresolved,[]);
 assert.ok(graph.files.find(r=>r.path==='services/source-language.service.ts').writes.some(r=>r.call==='session.withTransaction'));
});
