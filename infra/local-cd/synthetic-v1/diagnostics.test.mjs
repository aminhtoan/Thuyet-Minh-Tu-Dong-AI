import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,readdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import {captureProjectDiagnostics,failureText,redact} from './diagnostics.mjs';
const here=dirname(fileURLToPath(import.meta.url));
function folder(){const dir=resolve(here,'../.state/synthetic-v1','diagnostics-'+randomBytes(5).toString('hex'));mkdirSync(dir,{recursive:true});return dir;}
function fixture(){const calls=[];return {calls,run:args=>{calls.push(args);if(args[0]==='image')return {status:1,stdout:'',stderr:'No such image: mongo:8.0.17'};return {status:0,stdout:args[0]==='logs'?'JWT_ACCESS_SECRET=private-value Authorization: Bearer private-bearer':'fixture-status',stderr:''};}};}
test('failed command output retains direct cause, exit and signal and redacts secrets',()=>{
 const text=failureText({status:1,signal:null,stderr:'No such image: mongo:8.0.17\nGEMINI_API_KEY=private-key',stdout:''},'compose.log');
 assert.match(text,/exit=1/);assert.match(text,/No such image/);assert.doesNotMatch(text,/private-key/);
 assert.doesNotMatch(redact('mongodb://user:private-password@db/test Bearer private-bearer'),/private-password|private-bearer/);
});
test('diagnostics capture missing image, health, permissions and logs before cleanup without env dump',()=>{
 const dir=folder(),f=fixture();const c={Id:'id',Name:'synthetic',Image:'image',Config:{User:'node',Env:['TOP_SECRET=never-dump'],Labels:{'synthetic.v1.owner':'owner','com.docker.compose.project':'project','com.docker.compose.service':'backend'}},State:{Status:'exited',ExitCode:1,Error:'startup error',OOMKilled:false,Health:{Status:'unhealthy',Log:[{ExitCode:1,Output:'storage unavailable'}]}},Mounts:[],HostConfig:{PortBindings:{}},NetworkSettings:{Networks:{internal:{}}}};
 const file=captureProjectDiagnostics({dir,prefix:'failure',owner:'owner',project:'project',composeArgs:['compose','-f','fixture.json'],images:['mongo:8.0.17'],ids:['id'],inspect:()=>c,run:f.run,files:[]});
 const report=JSON.parse(readFileSync(file,'utf8'));assert.equal(report.containers[0].state.health.Status,'unhealthy');assert.equal(report.images[0].exitCode,1);assert.match(report.images[0].stderr,/No such image/);
 const all=readdirSync(dir).map(name=>readFileSync(resolve(dir,name),'utf8')).join('\n');assert.doesNotMatch(all,/never-dump|private-value|private-bearer/);
 assert.ok(f.calls.some(args=>args[0]==='logs'));assert.ok(!f.calls.some(args=>['rm','stop','restart','up','down'].includes(args[0])));
});
test('foreign container ownership blocks log collection',()=>{
 const f=fixture();assert.throws(()=>captureProjectDiagnostics({dir:folder(),prefix:'failure',owner:'owner',project:'project',composeArgs:[],images:[],ids:['foreign'],inspect:()=>({Config:{Labels:{'synthetic.v1.owner':'different'}}}),run:f.run}),/DIAGNOSTICS_OWNER_MISMATCH/);
 assert.equal(f.calls.some(args=>args[0]==='logs'),false);
});
