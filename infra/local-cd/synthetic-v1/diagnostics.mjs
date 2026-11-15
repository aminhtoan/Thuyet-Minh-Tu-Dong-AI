import {writeFileSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
export function redact(value){
 return String(value??'')
  .replace(/(mongodb(?:\+srv)?:\/\/)[^\s/@]+:[^\s/@]+@/gi,'$1[REDACTED]@')
  .replace(/(Bearer\s+)[A-Za-z0-9._~+\/-]+/gi,'$1[REDACTED]')
  .replace(/((?:GEMINI_API_KEY|GOOGLE_API_KEY|OPENAI_API_KEY|JWT_ACCESS_SECRET|JWT_REFRESH_SECRET|MAINTENANCE_CONTROL_TOKEN)["']?\s*[:=]\s*["']?)[^\s,"'\r\n}]+/gi,'$1[REDACTED]');
}
export function failureText(result,log){
 const details=redact((result.stderr??'')+'\n'+(result.stdout??'')).trim().slice(-12000);
 return `exit=${result.status??'unknown'} signal=${result.signal??'none'} error=${result.error?.code??'none'} log=${log??'none'}\n${details}`;
}
export function captureProjectDiagnostics({dir,prefix,owner,project,composeArgs,images,ids,inspect,run,files=[]}){
 const safe=prefix.replace(/[^a-zA-Z0-9_-]/g,'_');
 const save=(name,value)=>writeFileSync(resolve(dir,`${safe}-${name}`),redact(value));
 const command=args=>{try{const r=run(args);return {exitCode:r.status,signal:r.signal??null,error:r.error?.code??null,stdout:redact(r.stdout),stderr:redact(r.stderr)};}catch(error){return {error:redact(error.message)};}};
 const report={project,observedAt:new Date().toISOString(),platform:process.platform,node:process.version,versions:{docker:command(['version','--format','{{.Server.Version}}']),compose:command(['compose','version','--short'])},images:[],containers:[],files:[]};
 // Validate all selected containers before reading logs. Never dump Config.Env.
 const containers=ids.map(inspect);
 for(const c of containers)if(c.Config.Labels?.['synthetic.v1.owner']!==owner||c.Config.Labels?.['com.docker.compose.project']!==project)throw Error('DIAGNOSTICS_OWNER_MISMATCH');
 const ps=command([...composeArgs,'ps','--all','--format','json']);save('compose-ps.json',JSON.stringify(ps,null,2));
 for(const image of [...new Set(images)])report.images.push({requested:image,...command(['image','inspect',image,'--format','{{.Id}}'])});
 for(const path of files){try{const s=statSync(path);report.files.push({path,uid:s.uid,gid:s.gid,mode:(s.mode&0o777).toString(8),bytes:s.size});}catch(error){report.files.push({path,error:error.code});}}
 for(const c of containers){
  const service=c.Config.Labels['com.docker.compose.service'];
  report.containers.push({id:c.Id,name:c.Name,image:c.Image,service,user:c.Config.User,state:{status:c.State.Status,exitCode:c.State.ExitCode,error:c.State.Error,oomKilled:c.State.OOMKilled,health:c.State.Health},mounts:c.Mounts,ports:c.HostConfig.PortBindings,networks:Object.keys(c.NetworkSettings.Networks)});
  save(`${service.replace(/[^a-zA-Z0-9_-]/g,'_')}.log`,JSON.stringify(command(['logs','--timestamps','--tail','150',c.Id]),null,2));
 }
 const file=resolve(dir,`${safe}-diagnostics.json`);save('diagnostics.json',JSON.stringify(report,null,2));return file;
}
