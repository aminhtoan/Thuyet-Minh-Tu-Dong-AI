// TEST ONLY: mounted only into the dedicated B.3 container, never production image.
import { createServer } from 'node:http';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { drainRuntime, holdUntilClose } from '../dist/maintenance/runtime.js';
import { GroupDraftStore } from '../dist/services/translation/group-draft-store.js';
import { apiRouter } from '../dist/routes/index.js';
if(process.env.DRAIN_SYNTHETIC_FIXTURES!=='true'||process.env.GEMINI_API_KEY||!process.env.MONGODB_URI?.includes('mongodb://mongodb:27017/s396_drain_b3?'))throw Error('ISOLATION_REQUIRED');
const token=process.env.MAINTENANCE_CONTROL_TOKEN;
let releaseHttp, releaseProvider, child, cleanup, now=0;
const store=new GroupDraftStore(()=>now,1000,50,()=>()=>{});
apiRouter.get('/acceptance-hold',async(_req,res)=>{await new Promise(r=>{releaseHttp=r;});res.end('synthetic-done');});
drainRuntime.registerEntryPoint('synthetic-test-fixtures',true);
await import('../dist/server.js');
createServer(async(req,res)=>{
 if(req.headers.authorization!=='Bearer '+token){res.writeHead(401);res.end();return;}
 try{
  const action=req.url;
  if(action==='/provider-start'){void drainRuntime.track('providerCalls',()=>new Promise(r=>{releaseProvider=r;}));}
  else if(action==='/provider-end'){releaseProvider?.();}
  else if(action==='/ffmpeg-start'){child=new EventEmitter();holdUntilClose(child);}
  else if(action==='/ffmpeg-end'){child?.emit('close');}
  else if(action==='/cleanup-start'){cleanup=new PassThrough();holdUntilClose(cleanup);}
  else if(action==='/cleanup-end'){cleanup?.destroy();}
  else if(action==='/draft-start'){store.restore({draftId:'synthetic-draft',ownerId:'synthetic',projectId:'synthetic',expiresAt:new Date(now+1000).toISOString()});}
  else if(action==='/draft-end'){now+=2000;}
  else if(action==='/unknown-start'){drainRuntime.registerEntryPoint('synthetic-unknown',false);}
  else if(action==='/unknown-end'){drainRuntime.registerEntryPoint('synthetic-unknown',true);}
  else if(action==='/activity'){const finish=drainRuntime.begin();finish();}
  else if(action==='/http-end'){releaseHttp?.();}
  else {res.writeHead(404);res.end();return;}
  res.setHeader('content-type','application/json');res.end(JSON.stringify({ok:true}));
 }catch{res.writeHead(500);res.end('synthetic-fixture-failed');}
}).listen(9092,'127.0.0.1');
