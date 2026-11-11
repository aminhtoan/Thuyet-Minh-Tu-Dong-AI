import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath,URL} from 'node:url';
import {assess,findings,inventory} from '../staging/audit-fencing.mjs';
test('unreviewed route/background/database entry points block coverage',()=>{
 for(const text of ["router.post('/new',handler)","setTimeout(()=>doWork(),5)","User.updateOne({},data)"]){
  const r=assess([{path:'new.ts',sha256:'new',findings:findings(text)}],{files:[]});
  assert.equal(r.status,'BLOCKED');assert.ok(r.blockers.some(b=>b.reason==='NEW_ENTRY_POINT_UNREVIEWED'));
 }
});
test('AST detects candidate writes, scheduling, detached completion and resource creation',()=>{
 const calls=findings('User.create({}); setTimeout(callback,1); spawn(binary,[]); promise.finally(cleanup);').map(r=>r.call);
 assert.deepEqual(calls,['User.create','setTimeout','spawn','promise.finally']);
});
test('changed source invalidates a previous reviewed classification',()=>{
 const result=assess([{path:'a.ts',sha256:'changed'}],{files:[{path:'a.ts',sha256:'old',classification:'PROTECTED',evidence:'previous review'}]});
 assert.ok(result.blockers.some(b=>b.reason==='SOURCE_CHANGED_REVIEW_STALE'));
});
test('zero findings and complete classifications are not runtime proof',()=>{
 const row={path:'a.ts',sha256:'same',classification:'READ_ONLY',evidence:'reviewed'};
 const r=assess([row],{files:[row]});assert.equal(r.status,'BLOCKED');assert.ok(r.blockers.some(b=>b.reason==='RUNTIME_SIDE_EFFECT_CAPABILITIES_UNPROVEN'));
});
test('actual production source inventory remains fail-closed with concrete unknowns',()=>{
 const root=fileURLToPath(new URL('../src',import.meta.url));
 const review=JSON.parse(readFileSync(new URL('../../infra/local-cd/fencing-source-inventory.json',import.meta.url),'utf8'));
 const r=assess(inventory(root),review);assert.equal(r.status,'BLOCKED');
 for(const path of ['services/translation/group-draft-store.ts','server.ts','services/auth.service.ts'])assert.ok(r.blockers.some(b=>b.path===path));
});
