import {writeFile} from 'node:fs/promises';
const headers={authorization:'Bearer '+process.env.MAINTENANCE_CONTROL_TOKEN};
await fetch('http://127.0.0.1:9091/maintenance/close',{method:'POST',headers});
const r=await fetch('http://127.0.0.1:9091/maintenance/status',{headers});const b=await r.json();
if(b.status!=='READY'||!b.certificate)throw Error('NOT_QUIESCENT: '+JSON.stringify(b.reasons));
await writeFile('/tmp/drain-b3-certificate.json',JSON.stringify(b.certificate));
console.log(JSON.stringify({bootId:b.bootId,drainOperationId:b.drainOperationId,activityRevision:b.activityRevision,deploymentIdentity:b.deploymentIdentity,expiresAt:b.certificate.expiresAt}));
