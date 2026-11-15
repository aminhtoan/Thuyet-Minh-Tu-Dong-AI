import {spawnSync} from 'node:child_process';
import {createHash,randomBytes} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync,existsSync,copyFileSync,lstatSync,openSync,closeSync,unlinkSync,renameSync} from 'node:fs';
import {resolve,dirname,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:net';
import assert from 'node:assert/strict';
import {redact,failureText,captureProjectDiagnostics} from './diagnostics.mjs';
import {MONGO_IMAGE,prepareMongoImage} from './required-images.mjs';

const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../../..');
const stateRoot=resolve(root,'infra/local-cd/.state/synthetic-v1');
const command=process.argv[2]??'run';
function argument(name){const i=process.argv.indexOf(name);return i<0?undefined:process.argv[i+1];}
const hash=value=>createHash('sha256').update(value).digest('hex');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function request(url,options={}){
 // Recreated loopback containers invalidate pooled connections. Retry transport
 // readiness only; HTTP error statuses are asserted and are never hidden.
 for(let attempt=0;attempt<10;attempt++){
  try{return await fetch(url,{...options,headers:{connection:'close',...options.headers},signal:AbortSignal.timeout(10000)});}
  catch(error){if(attempt===9)throw error;await sleep(500);}
 }
}
function exec(binary,args,{input,log,timeout=30000,allowFailure=false,cwd=root}={}){
 const result=spawnSync(binary,args,{cwd,input,encoding:'utf8',timeout,windowsHide:true,maxBuffer:32*1024*1024});
 if(log)writeFileSync(log,redact((result.stdout??'')+(result.stderr??'')));
 if(!allowFailure&&(result.error||result.status!==0)){
  const detail=failureText(result,log);
  console.error(`${binary} ${args.slice(0,3).join(' ')} failed\n${detail}`);
  throw Error(`${binary} ${args.slice(0,3).join(' ')} failed: ${log??'see stderr'} (exit=${result.status??'unknown'}, signal=${result.signal??'none'})`);
 }
 return allowFailure?result:result.stdout.trim();
}
const docker=(args,options)=>exec('docker',args,options);
const inspect=id=>JSON.parse(docker(['inspect',id]))[0];
function write(path,value){const tmp=path+'.tmp';writeFileSync(tmp,JSON.stringify(value,null,2)+'\n');renameSync(tmp,path);}
function metadata(c){return {id:c.Id,name:c.Name,image:c.Image,startedAt:c.State.StartedAt,mounts:c.Mounts};}
function allContainers(){const ids=docker(['ps','-aq']).split(/\s+/).filter(Boolean);return ids.map(id=>metadata(inspect(id)));}
function unchanged(rows){for(const previous of rows)assert.deepEqual(metadata(inspect(previous.id)),previous,'pre-existing resource changed');}
function loadState(path){
 const file=resolve(path);if(!file.startsWith(stateRoot+sep)||file!==resolve(dirname(file),'state.json')||lstatSync(dirname(file)).isSymbolicLink()||lstatSync(file).isSymbolicLink())throw Error('STATE_SCOPE_INVALID');
 const s=JSON.parse(readFileSync(file,'utf8'));if(s.schema!=='S397_SYNTHETIC_V1'||!/^[a-f0-9]{32}$/.test(s.owner)||!/^[-a-z0-9]{1,32}$/.test(s.runId)||s.dir!==dirname(file))throw Error('STATE_INVALID');
 for(const p of s.projects)if(!['a','bad','recovery'].map(suffix=>`narration-s397-v1-${s.runId}-${suffix}`).includes(p.name))throw Error('PROJECT_SCOPE_INVALID');
 return s;
}
const save=s=>write(resolve(s.dir,'state.json'),s);
function event(s,kind,data={}){s.events.push({utc:new Date().toISOString(),kind,...data});save(s);console.log(kind);}
function labels(s,p){return {'synthetic.v1.owner':s.owner,'synthetic.v1.project':p.name};}
function assertOwned(s,p){
 const ids=docker(['ps','-aq','--filter',`label=com.docker.compose.project=${p.name}`]).split(/\s+/).filter(Boolean);
 for(const id of ids){const c=inspect(id);if(c.Config.Labels['synthetic.v1.owner']!==s.owner)throw Error('CONTAINER_OWNER_MISMATCH');}
 for(const kind of ['network','volume']){const existing=docker([kind,'ls','--format','{{.Name}}']).split(/\r?\n/);for(const name of p[kind+'s']){
  if(!existing.includes(name))continue;
  const object=JSON.parse(docker([kind,'inspect',name]))[0];if(object.Labels?.['synthetic.v1.owner']!==s.owner||object.Labels?.['com.docker.compose.project']!==p.name)throw Error('RESOURCE_OWNER_MISMATCH');
 }}
 return ids;
}
function fresh(p){
 for(const [kind,names]of [['network',p.networks],['volume',p.volumes]]){const existing=docker([kind,'ls','--format','{{.Name}}']).split(/\r?\n/);if(names.some(name=>existing.includes(name)))throw Error('RESOURCE_COLLISION');}
 if(docker(['ps','-aq','--filter',`label=com.docker.compose.project=${p.name}`]))throw Error('PROJECT_COLLISION');
 const names=docker(['ps','-a','--format','{{.Names}}']).split(/\r?\n/);if(['backend','mongodb','customer-web','admin-web'].some(service=>names.includes(`${p.name}-${service}-1`)))throw Error('CONTAINER_COLLISION');
}
function service(s,p,role){const ids=docker(['ps','-aq','--filter',`label=com.docker.compose.project=${p.name}`,'--filter',`label=com.docker.compose.service=${role}`]).split(/\s+/).filter(Boolean);if(ids.length!==1)throw Error('SERVICE_IDENTITY_UNKNOWN');const c=inspect(ids[0]);if(c.Config.Labels['synthetic.v1.owner']!==s.owner)throw Error('SERVICE_OWNER_MISMATCH');return c;}
function compose(s,p,args,allowFailure=false){assertOwned(s,p);return docker(['compose','--env-file',resolve(s.dir,'empty.env'),'-f',p.config,...args],{log:resolve(s.dir,`${s.events.length}-${p.role}-compose.log`),timeout:240000,allowFailure});}
async function freePort(){return new Promise((resolvePort,reject)=>{const server=createServer();server.on('error',reject);server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolvePort(port));});});}
function snapshot(s){
 const paths=exec('git',['-c','core.quotePath=false','ls-files','-z','--cached','--others','--exclude-standard']).split('\0').filter(Boolean);
 const files=[];s.snapshot=resolve(s.dir,'snapshot');mkdirSync(s.snapshot);
 for(const path of [...new Set(paths)].sort()){
  if(/(^|\/)(\.env[^/]*|node_modules|uploads|dist|build|\.git|\.state|scratch|cache|tmp)(\/|$)|\.(pem|key|pfx|p12|tsbuildinfo)$/.test(path))continue;
  const selected=/^(frontend-web|admin-web)\/(src\/|public\/|[^/]+\.(json|ts|js|mjs|html|css)$)/.test(path)||/^backend\/(src\/|staging\/(preflight|runtime-checks|healthcheck)\.mjs$|Dockerfile$|\.dockerignore$|package(-lock)?\.json$|tsconfig\.json$)/.test(path)||['scripts/customer-design-sync.mjs','design/customer/tokens.json','frontend-mobile/src/theme/tokens.ts','infra/local-cd/nginx.conf','infra/local-cd/mongo-init.js','infra/local-cd/frontend.Dockerfile.dockerignore','infra/local-cd/synthetic-v1/frontend.Dockerfile','infra/local-cd/synthetic-v1/run.mjs','infra/local-cd/synthetic-v1/diagnostics.mjs','infra/local-cd/synthetic-v1/required-images.mjs'].includes(path);
  if(!selected||!existsSync(resolve(root,path)))continue;
  const src=resolve(root,path);if(lstatSync(src).isSymbolicLink())throw Error('SOURCE_LINK_REJECTED');
  const out=resolve(s.snapshot,path);mkdirSync(dirname(out),{recursive:true});copyFileSync(src,out);files.push({path,sha256:hash(readFileSync(out))});
 }
 copyFileSync(resolve(root,'infra/local-cd/frontend.Dockerfile.dockerignore'),resolve(s.snapshot,'infra/local-cd/synthetic-v1/frontend.Dockerfile.dockerignore'));
 files.push({path:'infra/local-cd/synthetic-v1/frontend.Dockerfile.dockerignore',sha256:hash(readFileSync(resolve(s.snapshot,'infra/local-cd/synthetic-v1/frontend.Dockerfile.dockerignore')))});
 s.sourceHash=hash(JSON.stringify(files));s.sourceFiles=files;s.head=exec('git',['rev-parse','HEAD']);s.dirty=!!exec('git',['status','--porcelain']);
 s.releaseId=`sha-${s.head.slice(0,12)}-${s.sourceHash.slice(0,12)}-${s.owner.slice(0,6)}`;save(s);
}
function build(s){
 s.images={};
 for(const [role,app]of [['backend','backend'],['customer-web','frontend-web'],['admin-web','admin-web']]){
  event(s,'BUILD_'+role);
  const tag=`narration-s397-${role}:${s.releaseId}`;
  const args=['build','--label',`synthetic.v1.owner=${s.owner}`,'--label',`synthetic.v1.source=${s.sourceHash}`,'-t',tag];
  if(role==='backend')args.push(resolve(s.snapshot,'backend'));
  else args.push('--build-arg',`APP=${app}`,'--build-arg',`MUSEUM_URL=http://127.0.0.1:${s.ports.customer}/`,'-f',resolve(s.snapshot,'infra/local-cd/synthetic-v1/frontend.Dockerfile'),s.snapshot);
  docker(args,{log:resolve(s.dir,`build-${role}.log`),timeout:600000});
  s.images[role]={tag,id:JSON.parse(docker(['image','inspect',tag]))[0].Id};save(s);
 }
 s.manifest={schema:'S397_RELEASE_V1',releaseId:s.releaseId,sourceHash:s.sourceHash,head:s.head,dirty:s.dirty,files:s.sourceFiles,images:s.images,dependencies:{mongodb:s.mongoImage},ports:s.ports,knownGood:false};
 s.manifestPath=resolve(s.dir,'release-a.json');write(s.manifestPath,s.manifest);s.manifestHash=hash(readFileSync(s.manifestPath));event(s,'BUILT');
}
function verifyRelease(s){
 assert.equal(hash(readFileSync(s.manifestPath)),s.manifestHash,'manifest changed');
 for(const row of s.sourceFiles)assert.equal(hash(readFileSync(resolve(s.snapshot,row.path))),row.sha256,'snapshot changed');
 for(const image of Object.values(s.images))assert.equal(JSON.parse(docker(['image','inspect',image.id]))[0].Id,image.id);
 if(s.mongoImage)assert.equal(docker(['image','inspect',MONGO_IMAGE,'--format','{{.Id}}']),s.mongoImage.id,'MongoDB dependency changed after preparation');
}
function makeProject(s,role,images=s.images){
 const name=`narration-s397-v1-${s.runId}-${role}`,p={name,role,networks:[`${name}-internal`,`${name}-frontend`],volumes:[`${name}-database`,`${name}-media`],images:structuredClone(images),config:resolve(s.dir,`${role}-compose.json`)};
 fresh(p);const lab=labels(s,p);const internal={isolated:{},frontend:{gw_priority:1}};
 const frontend=service=>({image:images[service].id,labels:lab,ports:[`127.0.0.1:${service==='customer-web'?s.ports.customer:s.ports.admin}:8080`],networks:internal,depends_on:{backend:{condition:'service_healthy'}},read_only:true,tmpfs:['/tmp','/var/cache/nginx','/var/run']});
 const cfg={name,services:{
  mongodb:{image:MONGO_IMAGE,labels:lab,command:['mongod','--replSet','s396rs','--bind_ip_all'],volumes:[`${p.volumes[0]}:/data/db`,`${resolve(s.snapshot,'infra/local-cd/mongo-init.js').replaceAll('\\','/')}:/opt/init.js:ro`],tmpfs:['/data/configdb'],networks:['isolated'],healthcheck:{test:['CMD','mongosh','--quiet','--file','/opt/init.js'],interval:'3s',timeout:'5s',retries:30}},
  backend:{image:images.backend.id,labels:lab,init:true,environment:{NODE_ENV:'production',PORT:'8080',UPLOAD_DIR:'/data/uploads',MONGODB_URI:'mongodb://mongodb:27017/s397_synthetic?replicaSet=s396rs',CORS_ORIGINS:`http://127.0.0.1:${s.ports.customer},http://127.0.0.1:${s.ports.admin}`,JWT_ACCESS_SECRET:'s397-synthetic-access-not-a-real-secret',JWT_REFRESH_SECRET:'s397-synthetic-refresh-not-a-real-secret',JWT_ACCESS_EXPIRES_IN:'15m',JWT_REFRESH_EXPIRES_IN:'1d',GEMINI_API_KEY:'',GOOGLE_API_KEY:'',OPENAI_API_KEY:'',GROUP_TRANSLATION_ENABLED:'false',CUSTOMER_TRANSLATION_ENABLED:'false'},volumes:[`${p.volumes[1]}:/data/uploads`],networks:['isolated'],depends_on:{mongodb:{condition:'service_healthy'}},stop_grace_period:'15s'},
  'customer-web':frontend('customer-web'),'admin-web':frontend('admin-web')},
  networks:{isolated:{name:p.networks[0],internal:true,labels:lab},frontend:{name:p.networks[1],driver:'bridge',labels:lab}},volumes:Object.fromEntries(p.volumes.map(name=>[name,{name,labels:lab}]))};
 write(p.config,cfg);p.configHash=hash(readFileSync(p.config));s.projects.push(p);save(s);compose(s,p,['config','--quiet']);return p;
}
function deploy(s,p,{failAfterMongo=false}={}){
 assert.equal(hash(readFileSync(p.config)),p.configHash);event(s,'DEPLOYING',{project:p.name});
 try{if(failAfterMongo){compose(s,p,['up','-d','--no-build','--pull','never','--wait','--wait-timeout','90','mongodb']);throw Error('INJECTED_PARTIAL_DEPLOYMENT_FAILURE');}
  compose(s,p,['up','-d','--no-build','--pull','never','--wait','--wait-timeout','150']);event(s,'DEPLOYED',{project:p.name});
 }catch(error){event(s,'DEPLOY_FAILED',{project:p.name,reason:error.message});diagnose(s,p,'failure');throw error;}
}
function port(s,p,role){const c=service(s,p,role);const bindings=c.NetworkSettings.Ports['8080/tcp'];assert.equal(bindings.length,1);assert.equal(bindings[0].HostIp,'127.0.0.1');return bindings[0].HostPort;}
async function smoke(s,p){
 for(const role of ['backend','mongodb','customer-web','admin-web']){const c=service(s,p,role);assert.equal(c.State.Health.Status,'healthy');if(role!=='mongodb')assert.equal(c.Image,p.images[role].id);}
 const backend=service(s,p,'backend'),mongo=service(s,p,'mongodb');
 assert.equal(Object.keys(backend.HostConfig.PortBindings??{}).length,0);assert.equal(Object.keys(mongo.HostConfig.PortBindings??{}).length,0);
 assert.equal(Object.keys(backend.NetworkSettings.Networks).length,1);assert.equal(Object.keys(mongo.NetworkSettings.Networks).length,1);
 assert.ok(backend.NetworkSettings.Networks[p.networks[0]]);assert.ok(mongo.NetworkSettings.Networks[p.networks[0]]);
 assert.equal(JSON.parse(docker(['network','inspect',p.networks[0]]))[0].Internal,true);
 const env=new Set(backend.Config.Env);for(const v of ['MONGODB_URI=mongodb://mongodb:27017/s397_synthetic?replicaSet=s396rs','GEMINI_API_KEY=','GOOGLE_API_KEY=','OPENAI_API_KEY=','GROUP_TRANSLATION_ENABLED=false','CUSTOMER_TRANSLATION_ENABLED=false'])assert.ok(env.has(v));
 for(const role of ['customer-web','admin-web']){
  const base=`http://127.0.0.1:${port(s,p,role)}`;
  for(const path of ['/','/projects/synthetic/deep-link']){const r=await request(base+path);assert.equal(r.status,200);assert.match(await r.text(),/<html/i);}
  const health=await request(base+'/api/health',{headers:{origin:base}});assert.equal(health.status,200);const body=await health.json();assert.equal(body.data.database,'connected');assert.equal(body.data.status,'ok');
  const missing=await request(base+'/api/s397-not-found');assert.equal(missing.status,404);assert.match(missing.headers.get('content-type'),/json/);await missing.json();
  const unauthorized=await request(base+'/api/projects');assert.equal(unauthorized.status,401);assert.match(unauthorized.headers.get('content-type'),/json/);
  assert.equal((await request(base+'/api/maintenance/status')).status,404);
 }
 event(s,'SMOKE_PASS',{project:p.name});
}
function mongo(s,p,program){return docker(['exec','-i',service(s,p,'mongodb').Id,'mongosh','--quiet'],{input:program});}
function fixture(s,p,create=false){
 const data={owner:s.owner,release:s.releaseId,project:p.name};
 const setup=`const d=db.getSiblingDB('s397_synthetic');const expected=${JSON.stringify(data)};`;
 if(create){mongo(s,p,setup+`d.s397_acceptance.insertOne({_id:'sentinel',...expected});d.createCollection('s397_transactions');const session=db.getMongo().startSession();try{session.startTransaction();session.getDatabase('s397_synthetic').s397_transactions.insertOne({_id:'committed',owner:expected.owner});session.commitTransaction();session.startTransaction();session.getDatabase('s397_synthetic').s397_transactions.insertOne({_id:'aborted'});session.abortTransaction();}finally{session.endSession();}if(d.s397_transactions.countDocuments({_id:'committed'})!==1||d.s397_transactions.countDocuments({_id:'aborted'})!==0)throw Error('TRANSACTION_FAILED');`);
  const program=`const fs=require('fs');if(process.getuid()===0)throw Error('ROOT_STORAGE');fs.writeFileSync('/data/uploads/s397-sentinel.json',${JSON.stringify(JSON.stringify(data))},{flag:'wx'});`;
  docker(['exec','-i',service(s,p,'backend').Id,'node','--input-type=commonjs'],{input:program});
 }
 const database=mongo(s,p,setup+`const row=d.s397_acceptance.findOne({_id:'sentinel'});if(!row||row.owner!==expected.owner||row.project!==expected.project)throw Error('FIXTURE_OWNER_INVALID');for(const n of ['users','projects','processingjobs','translationattempts'])if(d.getCollection(n).countDocuments({})!==0)throw Error('NON_SYNTHETIC_DATA');print(JSON.stringify({sentinel:row,transactions:d.s397_transactions.find().sort({_id:1}).toArray()}));`);
 const media=docker(['exec','-i',service(s,p,'backend').Id,'node','--input-type=commonjs'],{input:"const fs=require('fs');console.log(fs.readFileSync('/data/uploads/s397-sentinel.json','utf8'));"});
 assert.deepEqual(JSON.parse(media),data);return hash(database+'\n'+media);
}
async function waitHealthy(s,p){for(let i=0;i<90;i++){if(['backend','mongodb','customer-web','admin-web'].every(role=>service(s,p,role).State.Health?.Status==='healthy'))return;await sleep(1000);}throw Error('HEALTH_TIMEOUT');}
function backbone(s,p){return ['backend','mongodb'].map(role=>metadata(service(s,p,role)));}
function updateFrontends(s,p,images){
 assertOwned(s,p);const cfg=JSON.parse(readFileSync(p.config,'utf8'));
 for(const role of ['customer-web','admin-web']){cfg.services[role].image=images[role].id;p.images[role]=images[role];}
 write(p.config,cfg);p.configHash=hash(readFileSync(p.config));save(s);
 compose(s,p,['up','-d','--no-build','--pull','never','--no-deps','--force-recreate','--wait','--wait-timeout','90','customer-web','admin-web']);
}
function buildVariants(s){
 const images={...s.images};
 for(const role of ['customer-web','admin-web','backend']){
  const folder=resolve(s.dir,'candidate-'+role);mkdirSync(folder);
  const base=s.images[role];assert.equal(JSON.parse(docker(['image','inspect',base.tag]))[0].Id,base.id);
  const bad=role==='backend';writeFileSync(resolve(folder,'Dockerfile'),`FROM ${base.tag}\nLABEL synthetic.v1.owner="${s.owner}" synthetic.v1.variant="${bad?'bad-health':'B'}"\n`+(bad?'HEALTHCHECK --interval=1s --timeout=1s --start-period=1s --retries=2 CMD exit 1\n':''));
  const tag=`narration-s397-${role}:${s.releaseId}-b`;docker(['build','--network=none','-t',tag,folder],{log:resolve(s.dir,`variant-${role}.log`),timeout:120000});assert.equal(JSON.parse(docker(['image','inspect',base.tag]))[0].Id,base.id);images[role]={tag,id:JSON.parse(docker(['image','inspect',tag]))[0].Id};
 }
 write(resolve(s.dir,'release-b.json'),{schema:'S397_SYNTHETIC_CANDIDATE_V1',baseRelease:s.releaseId,compatibility:'IDENTICAL_JS_ONLY_METADATA_OR_HEALTHCHECK_CHANGED',images});return images;
}
function diagnose(s,p,phase){
 try{const ids=assertOwned(s,p);const path=captureProjectDiagnostics({dir:s.dir,prefix:`${phase}-${s.events.length}-${p.role}`,owner:s.owner,project:p.name,composeArgs:['compose','--env-file',resolve(s.dir,'empty.env'),'-f',p.config],images:['mongo:8.0.17',...Object.values(p.images).map(image=>image.id)],ids,inspect,run:args=>docker(args,{allowFailure:true}),files:[p.config,resolve(s.snapshot,'infra/local-cd/mongo-init.js')]});console.log('DIAGNOSTICS='+path);}
 catch(error){const path=resolve(s.dir,`${phase}-${s.events.length}-diagnostics-unavailable.log`);writeFileSync(path,redact(error.message));console.error('Diagnostics unavailable: '+redact(error.message));}
}
function collect(s){for(const p of s.projects)diagnose(s,p,'snapshot');}
function cleanup(s){
 // Validate EVERY target before deleting ANY. Labels + planned names + private run nonce.
 const targets=s.projects.map(p=>({p,ids:assertOwned(s,p)}));
 for(const {p,ids}of targets){const mongoId=ids.find(id=>inspect(id).Config.Labels['com.docker.compose.service']==='mongodb');if(mongoId&&inspect(mongoId).State.Running){
  docker(['exec','-i',mongoId,'mongosh','--quiet'],{input:"const d=db.getSiblingDB('s397_synthetic');for(const n of d.getCollectionNames())if(!['s397_acceptance','s397_transactions'].includes(n)&&d.getCollection(n).countDocuments({})!==0)throw Error('BUSINESS_DATA_BLOCKS_CLEANUP');"});
 }}
 for(const {ids}of targets)if(ids.length)docker(['rm','-f',...ids]);
 for(const {p}of targets)for(const kind of ['volume','network']){const existing=docker([kind,'ls','--format','{{.Name}}']).split(/\r?\n/);for(const name of p[kind+'s']){if(!existing.includes(name))continue;const object=JSON.parse(docker([kind,'inspect',name]))[0];if(object.Labels?.['synthetic.v1.owner']!==s.owner||object.Labels?.['com.docker.compose.project']!==p.name)throw Error('RESOURCE_OWNER_CHANGED');docker([kind,'rm',kind==='network'?object.Id:name]);}}
 unchanged(s.before);s.activeProject=null;s.cleaned=true;event(s,'CLEANUP_PASS');
}
async function run(){
 const runId=argument('--run-id')??new Date().toISOString().replace(/\D/g,'').slice(0,14)+'-'+randomBytes(3).toString('hex');
 if(!/^[-a-z0-9]{1,32}$/.test(runId))throw Error('RUN_ID_INVALID');
 mkdirSync(stateRoot,{recursive:true});const dir=resolve(stateRoot,runId);if(existsSync(dir))throw Error('RUN_ALREADY_EXISTS_NO_OVERWRITE');mkdirSync(dir);
 const s={schema:'S397_SYNTHETIC_V1',runId,dir,owner:randomBytes(16).toString('hex'),projects:[],events:[],result:'RUNNING',before:[]};
 const lockPath=resolve(dir,'operation.lock'),lock=openSync(lockPath,'wx');
 try{
  writeFileSync(resolve(dir,'empty.env'),'');save(s);
  assert.equal(docker(['info','--format','{{.OSType}}']),'linux');s.before=allContainers();s.ports={customer:await freePort(),admin:await freePort()};while(s.ports.customer===s.ports.admin)s.ports.admin=await freePort();
  for(const role of ['a','bad','recovery']){const name=`narration-s397-v1-${s.runId}-${role}`;fresh({name,networks:[`${name}-internal`,`${name}-frontend`],volumes:[`${name}-database`,`${name}-media`]});}
  save(s);event(s,'PREFLIGHT_PASS');
  try{const mongo=prepareMongoImage(args=>docker(args,{allowFailure:true,timeout:180000}));writeFileSync(resolve(s.dir,'mongo-image.log'),mongo.log);s.mongoImage={reference:mongo.reference,id:mongo.id,pulled:mongo.pulled};event(s,'MONGO_IMAGE_READY',s.mongoImage);}
  catch(error){writeFileSync(resolve(s.dir,'mongo-image.log'),redact(error.details??error.message));console.error(redact(error.details??error.message));event(s,'MONGO_IMAGE_FAILED',{reason:error.message});throw error;}
  snapshot(s);build(s);verifyRelease(s);const a=makeProject(s,'a');deploy(s,a);await smoke(s,a);fixture(s,a,true);const checksum=fixture(s,a);
  assertOwned(s,a);docker(['restart',service(s,a,'mongodb').Id,service(s,a,'backend').Id],{timeout:60000});await waitHealthy(s,a);await smoke(s,a);assert.equal(fixture(s,a),checksum);event(s,'RESTART_PERSISTENCE_PASS');
  const foundation=backbone(s,a);s.manifest.knownGood=true;write(s.manifestPath,s.manifest);s.manifestHash=hash(readFileSync(s.manifestPath));save(s);event(s,'RELEASE_A_VERIFIED');
  const variants=buildVariants(s);
  updateFrontends(s,a,{'customer-web':variants['customer-web'],'admin-web':variants['admin-web']});await smoke(s,a);assert.deepEqual(backbone(s,a),foundation);assert.equal(fixture(s,a),checksum);event(s,'FRONTEND_A_TO_B_PASS');
  const original=JSON.parse(readFileSync(s.manifestPath)).images;
  updateFrontends(s,a,original);await smoke(s,a);assert.deepEqual(backbone(s,a),foundation);assert.equal(fixture(s,a),checksum);event(s,'FRONTEND_B_TO_A_PASS');
  const bad=makeProject(s,'bad',{'backend':variants.backend,'customer-web':original['customer-web'],'admin-web':original['admin-web']});
  let partialFailed=false;try{deploy(s,bad,{failAfterMongo:true});}catch(e){partialFailed=e.message==='INJECTED_PARTIAL_DEPLOYMENT_FAILURE';}assert.ok(partialFailed);assert.equal(assertOwned(s,bad).length,1);event(s,'PARTIAL_FAILURE_HANDLED');
  let healthFailed=false;try{deploy(s,bad);}catch{healthFailed=true;}assert.ok(healthFailed);assert.equal(service(s,bad,'backend').State.Health.Status,'unhealthy');assert.deepEqual(backbone(s,a),foundation);event(s,'BAD_RELEASE_HEALTH_FAILURE_HANDLED');
  verifyRelease(s);assertOwned(s,a);docker(['stop',service(s,a,'customer-web').Id,service(s,a,'admin-web').Id],{timeout:60000});
  const recovery=makeProject(s,'recovery',original);deploy(s,recovery);await smoke(s,recovery);fixture(s,recovery,true);fixture(s,recovery);assert.deepEqual(backbone(s,a),foundation);event(s,'BACKEND_SYNTHETIC_RECOVERY_FROM_A_PASS');
  s.activeProject=recovery.name;s.result='PASS';event(s,'LOCAL_DOCKER_CD_V1_PASS');
 }catch(error){s.result='FAIL';event(s,'PIPELINE_FAILED',{reason:error.message});throw error;}
 finally{collect(s);try{unchanged(s.before);event(s,'PREEXISTING_UNCHANGED');}catch(error){s.result='FAIL';event(s,'PRESERVATION_FAILED');throw error;}finally{closeSync(lock);unlinkSync(lockPath);save(s);console.log('STATE_FILE='+resolve(dir,'state.json'));}}
}
try{
 if(command==='run')await run();
 else {const s=loadState(argument('--state'));const path=resolve(s.dir,'operation.lock'),lock=openSync(path,'wx');try{if(command==='cleanup'){collect(s);cleanup(s);}else if(command==='diagnostics'){collect(s);}else if(command==='smoke'){const p=s.projects.find(p=>p.name===s.activeProject);if(!p)throw Error('NO_VERIFIED_ACTIVE_RELEASE');await smoke(s,p);}else throw Error('UNKNOWN_COMMAND');}finally{closeSync(lock);unlinkSync(path);}}
}catch(error){console.error(error.message);process.exitCode=1;}
