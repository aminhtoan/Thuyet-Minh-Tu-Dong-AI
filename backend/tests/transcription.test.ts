import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import test, { after, before } from 'node:test';
import type { Server } from 'node:http';
import type { SttInput, SttProvider } from '../src/services/stt/stt-provider.interface.js';

process.env.NODE_ENV = 'test';
const suffix = randomUUID();
process.env.UPLOAD_DIR = `uploads/s20-test-${suffix}`;
const email = `s20-test-owner-${suffix}@example.com`;
const otherEmail = `s20-test-other-${suffix}@example.com`;
const password = 'SecurePass123';

const { app } = await import('../src/app.js');
const { env } = await import('../src/config/env.js');
const { connectDatabase, disconnectDatabase } = await import('../src/config/database.js');
const { User } = await import('../src/models/User.js');
const { Project } = await import('../src/models/Project.js');
const { Media } = await import('../src/models/Media.js');
const { Transcript } = await import('../src/models/Transcript.js');
const { TranscriptSegment } = await import('../src/models/TranscriptSegment.js');
const { ProcessingJob } = await import('../src/models/ProcessingJob.js');
const { AuthSession } = await import('../src/models/AuthSession.js');
const { ActivityLog } = await import('../src/models/ActivityLog.js');
const { hashPassword } = await import('../src/utils/password.js');
const { signAccessToken } = await import('../src/utils/jwt.js');
const { uploadRoot } = await import('../src/utils/file.js');
const { setSttProviderForTests } = await import('../src/services/stt/stt.service.js');
const { OpenAiSttProvider, OpenAiSttError } = await import('../src/services/stt/openai-stt.provider.js');

let server: Server; let base = ''; let token = ''; let otherToken = ''; let adminToken = ''; let userId = ''; let otherId = '';
const projects: string[] = [];
const call = async (path: string, method = 'GET', auth?: string, body?: unknown) => {
  const response = await fetch(base + path, { method, headers: { ...(auth ? { authorization: `Bearer ${auth}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await response.text(); return { status: response.status, body: text ? JSON.parse(text) as any : null };
};
const createProject = async (owner: string, status: 'DRAFT'|'UPLOADED'|'FAILED' = 'UPLOADED') => { const p = await Project.create({ userId: owner, name: `S20 ${suffix}`, sourceLanguage: 'vi', status, progress: 0 }); projects.push(p._id.toString()); return p; };
const attachMedia = async (projectId: string, exists = true) => {
  const dir = resolve(uploadRoot, 'projects', projectId); await mkdir(dir, { recursive: true }); const file = resolve(dir, 'source.mp3'); if (exists) await writeFile(file, new Uint8Array([1,2,3]));
  return Media.create({ projectId, originalName: 'source.mp3', fileName: 'source.mp3', mediaType: 'AUDIO', mimeType: 'audio/mpeg', fileSize: 3, storagePath: relative(uploadRoot, file).replaceAll('\\','/') });
};

before(async () => {
  await connectDatabase(env.mongoUri); const register = async (mail:string) => call('/api/auth/register','POST',undefined,{fullName:'S20',email:mail,password});
  server=app.listen(0,'127.0.0.1'); await new Promise<void>(r=>server.once('listening',r)); const a=server.address(); if(!a||typeof a==='string')throw new Error('port'); base=`http://127.0.0.1:${a.port}`;
  let r=await register(email); token=r.body.data.accessToken; userId=r.body.data.user.id; r=await register(otherEmail); otherToken=r.body.data.accessToken; otherId=r.body.data.user.id;
  const admin=await User.create({fullName:'Admin',email:`s20-test-admin-${suffix}@example.com`,passwordHash:await hashPassword(password),role:'ADMIN',status:'ACTIVE'}); adminToken=signAccessToken(admin._id.toString(),'ADMIN');
});
after(async()=>{setSttProviderForTests(); const ids=(await User.find({email:{$regex:`s20-test-.*-${suffix.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}@example.com`}})).map(u=>u._id); const ts=await Transcript.find({projectId:{$in:projects}}); await Promise.all([TranscriptSegment.deleteMany({transcriptId:{$in:ts.map(x=>x._id)}}),Transcript.deleteMany({projectId:{$in:projects}}),ProcessingJob.deleteMany({projectId:{$in:projects}}),Media.deleteMany({projectId:{$in:projects}}),Project.deleteMany({_id:{$in:projects}}),AuthSession.deleteMany({userId:{$in:ids}}),ActivityLog.deleteMany({userId:{$in:ids}})]);await User.deleteMany({_id:{$in:ids}});await rm(uploadRoot,{recursive:true,force:true});await new Promise<void>((r,j)=>server.close(e=>e?j(e):r()));await disconnectDatabase();});

test('S20 transcription integration',async(t)=>{
  await t.test('auth, role and ids are protected',async()=>{const p=await createProject(userId);await attachMedia(p._id.toString());assert.equal((await call(`/api/projects/${p._id}/transcription`,'POST')).status,401);assert.equal((await call(`/api/projects/${p._id}/transcription`,'POST',adminToken)).status,403);assert.equal((await call('/api/projects/bad/transcription','POST',token)).status,400);assert.equal((await call(`/api/projects/${new (await import('mongoose')).Types.ObjectId()}/transcription`,'POST',token)).status,404);});
  await t.test('cross-user access is concealed',async()=>{const p=await createProject(otherId);await attachMedia(p._id.toString());assert.equal((await call(`/api/projects/${p._id}/transcription`,'POST',token)).status,404);assert.equal((await call(`/api/projects/${p._id}/transcript`,'GET',token)).status,404);});
  await t.test('invalid state, missing metadata and missing file are controlled',async()=>{const draft=await createProject(userId,'DRAFT');assert.equal((await call(`/api/projects/${draft._id}/transcription`,'POST',token)).body.error.code,'INVALID_PROJECT_STATE');const noMedia=await createProject(userId);assert.equal((await call(`/api/projects/${noMedia._id}/transcription`,'POST',token)).body.error.code,'MEDIA_NOT_FOUND');const missing=await createProject(userId);await attachMedia(missing._id.toString(),false);assert.equal((await call(`/api/projects/${missing._id}/transcription`,'POST',token)).body.error.code,'MEDIA_FILE_MISSING');});
  await t.test('success lifecycle, concurrency, provider input and persistence',async()=>{const p=await createProject(userId);await attachMedia(p._id.toString());let received:SttInput|undefined;let release!:()=>void;const gate=new Promise<void>(r=>{release=r});let calls=0;const provider:SttProvider={async transcribe(input){calls++;received=input;await gate;return{text:'Xin chào. Đây là thử nghiệm.',language:'vi',duration:4.2,segments:[{start:0,end:1.5,text:'Xin chào.'},{start:1.5,end:4.2,text:'Đây là thử nghiệm.'}]};}};setSttProviderForTests(provider);const first=call(`/api/projects/${p._id}/transcription`,'POST',token);while(calls===0)await new Promise(r=>setTimeout(r,10));assert.equal((await Project.findById(p._id))?.status,'TRANSCRIBING');const duplicate=await call(`/api/projects/${p._id}/transcription`,'POST',token);assert.equal(duplicate.status,409);release();const result=await first;assert.equal(result.status,200);assert.equal(calls,1);assert.equal(received?.language,'vi');assert.ok(received?.filePath.startsWith(uploadRoot));assert.equal((await Project.findById(p._id))?.status,'TRANSCRIBED');const job=await ProcessingJob.findOne({projectId:p._id,type:'TRANSCRIPTION'});assert.equal(job?.status,'COMPLETED');assert.equal(job?.progress,100);const transcript=await Transcript.findOne({projectId:p._id});assert.equal(transcript?.fullText,'Xin chào. Đây là thử nghiệm.');const segments=await TranscriptSegment.find({transcriptId:transcript?._id}).sort({sequence:1});assert.deepEqual(segments.map(s=>[s.sequence,s.startTime,s.endTime,s.text]),[[1,0,1.5,'Xin chào.'],[2,1.5,4.2,'Đây là thử nghiệm.']]);assert.equal(JSON.stringify(result.body).includes('storagePath'),false);});
  await t.test('GET transcript returns ordered safe segments',async()=>{const p=await Project.findOne({userId,status:'TRANSCRIBED'});assert.ok(p);const r=await call(`/api/projects/${p._id}/transcript`,'GET',token);assert.equal(r.status,200);assert.deepEqual(r.body.data.transcript.segments.map((s:any)=>s.index),[0,1]);assert.equal(JSON.stringify(r.body).includes('OPENAI'),false);});
  await t.test('missing transcript returns 404',async()=>{const p=await createProject(userId);assert.equal((await call(`/api/projects/${p._id}/transcript`,'GET',token)).body.error.code,'TRANSCRIPT_NOT_FOUND');});
  await t.test('provider failure is safe and retry succeeds without duplicate transcript',async()=>{const p=await createProject(userId);await attachMedia(p._id.toString());setSttProviderForTests({async transcribe(){throw new Error('secret-provider-message')}});let r=await call(`/api/projects/${p._id}/transcription`,'POST',token,{filePath:'C:\\evil'});assert.equal(r.status,502);assert.equal(JSON.stringify(r.body).includes('secret-provider-message'),false);assert.equal((await Project.findById(p._id))?.status,'FAILED');assert.equal((await ProcessingJob.findOne({projectId:p._id,status:'FAILED'}))?.errorMessage,'STT_PROVIDER_ERROR');setSttProviderForTests({async transcribe(){return{text:'Retry ok',segments:[{start:0,end:1,text:'Retry ok'}]}}});r=await call(`/api/projects/${p._id}/transcription`,'POST',token);assert.equal(r.status,200);assert.equal(await ProcessingJob.countDocuments({projectId:p._id}),2);assert.equal(await Transcript.countDocuments({projectId:p._id}),1);const tr=await Transcript.findOne({projectId:p._id});assert.equal(await TranscriptSegment.countDocuments({transcriptId:tr?._id}),1);});
  await t.test('activity logs contain safe transcription events',async()=>{await new Promise(r=>setTimeout(r,100));const logs=await ActivityLog.find({userId,action:/^TRANSCRIPTION_/});assert.ok(logs.length>=3);assert.equal(logs.some(l=>/token|secret|Xin chào/i.test(l.description)),false);});
  await t.test('OpenAI diagnostics retain safe fields and redact credentials without a real request',async()=>{const file=resolve(uploadRoot,'diagnostic.mp3');await mkdir(uploadRoot,{recursive:true});await writeFile(file,new Uint8Array([1]));const originalFetch=globalThis.fetch;const oldKey=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-only-key';globalThis.fetch=async()=>new Response(JSON.stringify({error:{type:'invalid_request_error',code:'bad_audio',message:'Rejected Bearer abc sk-testsecret'}}),{status:400,headers:{'x-request-id':'req_safe_123'}});try{await assert.rejects(new OpenAiSttProvider().transcribe({filePath:file,mimeType:'audio/mpeg',language:'vi'}),(error:unknown)=>{assert.ok(error instanceof OpenAiSttError);assert.deepEqual({...error.diagnostics,message:error.diagnostics.message},{provider:'openai',httpStatus:400,errorType:'invalid_request_error',errorCode:'bad_audio',message:'Rejected Bearer [REDACTED] [REDACTED]',requestId:'req_safe_123'});return true;});}finally{globalThis.fetch=originalFetch;if(oldKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldKey;}});
  assert.notEqual(token,otherToken);
});
