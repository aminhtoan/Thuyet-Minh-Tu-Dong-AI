import { connectIsolatedMongo } from '../helpers/isolated-mongo.js';
import { execFileSync } from 'node:child_process';
const verified = await connectIsolatedMongo();
try {
  const hello = await verified.db.admin().command({ hello: 1 });
  if (process.argv.includes('--backend')) {
    const [c] = JSON.parse(execFileSync('docker', ['inspect', 'narration-backend-validation'], { encoding: 'utf8', windowsHide: true }));
    const port = c.NetworkSettings.Ports['8081/tcp'];
    if (c.Config.Image !== 'narration-backend-validation:local' || c.Config.Labels['com.docker.compose.project'] !== 'narration-backend-validation' || c.HostConfig.Memory !== 512 * 1024 * 1024 || c.HostConfig.MemorySwap !== c.HostConfig.Memory || c.HostConfig.NanoCpus !== 1e9 || c.State.Health?.Status !== 'healthy' || c.RestartCount !== 0 || c.State.OOMKilled || c.Mounts.some((m: any) => m.Type !== 'tmpfs') || Object.keys(c.NetworkSettings.Networks).join() !== 'narration-groups-test_integration-only' || port?.length !== 1 || port[0].HostIp !== '127.0.0.1' || port[0].HostPort !== '18081') throw new Error('BACKEND_DOCKER_IDENTITY_BLOCKED');
    const env = c.Config.Env as string[];
    if (!env.includes(`EXPECTED_MONGO_PROCESS_ID=${hello.topologyVersion.processId.toString()}`) || env.some(e => /^MONGODB_URI=/.test(e))) throw new Error('BACKEND_DATABASE_ATTESTATION_BLOCKED');
  }
  console.log(hello.topologyVersion.processId.toString());
} finally { await verified.instance.disconnect(); }
