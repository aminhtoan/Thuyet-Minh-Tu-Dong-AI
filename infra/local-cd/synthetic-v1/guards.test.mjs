import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,openSync,closeSync,unlinkSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../../..');
function invoke(args){return spawnSync(process.execPath,[resolve(here,'run.mjs'),...args],{encoding:'utf8',windowsHide:true});}
function state(projects=[]){const runId='guard-'+randomBytes(4).toString('hex'),dir=resolve(root,'infra/local-cd/.state/synthetic-v1',runId);mkdirSync(dir,{recursive:true});const file=resolve(dir,'state.json');writeFileSync(file,JSON.stringify({schema:'S397_SYNTHETIC_V1',runId,dir,owner:randomBytes(16).toString('hex'),projects}));return {file,dir};}
test('cleanup rejects state outside dedicated run directory before resource access',()=>{const r=invoke(['cleanup','--state',resolve(root,'package.json')]);assert.notEqual(r.status,0);assert.match(r.stderr,/STATE_SCOPE_INVALID/);});
test('cleanup cannot target existing S39.6 project from a forged manifest',()=>{const s=state([{name:'narration-s396-local'}]);const r=invoke(['cleanup','--state',s.file]);assert.notEqual(r.status,0);assert.match(r.stderr,/PROJECT_SCOPE_INVALID/);});
test('concurrent run operation fails closed on exclusive per-run lock',()=>{const s=state(),path=resolve(s.dir,'operation.lock'),fd=openSync(path,'wx');try{const r=invoke(['smoke','--state',s.file]);assert.notEqual(r.status,0);assert.match(r.stderr,/EEXIST/);}finally{closeSync(fd);unlinkSync(path);}});
