import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

export const TEST_DATABASE = 'multilingual_ai_narration_groups_test';
export const TEST_CONTAINER = 'narration-groups-test-mongodb';
export const TEST_REPLICA_SET = 'narration-test-rs';
const docker = (args: string[]) => execFileSync('docker', args, { encoding: 'utf8', timeout: 15000, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
const refuse = (): never => { throw new Error('TEST_DATABASE_ISOLATION_BLOCKED'); };

export async function connectIsolatedMongo() {
  const uri = process.env.TEST_MONGODB_URI?.trim();
  const database = process.env.TEST_DATABASE_NAME?.trim();
  if (!uri || database !== TEST_DATABASE) refuse();
  let parsed: URL;
  try { parsed = new URL(uri!); } catch { return refuse(); }
  if (parsed.protocol !== 'mongodb:' || parsed.hostname !== '127.0.0.1' || parsed.port !== '27029' || parsed.pathname !== `/${TEST_DATABASE}` || parsed.username || parsed.password || parsed.hash) refuse();
  if (parsed.searchParams.get('replicaSet') !== TEST_REPLICA_SET || parsed.searchParams.get('directConnection') !== 'true' || [...parsed.searchParams].length !== 2) refuse();
  const developmentFile = fileURLToPath(new URL('../../.env', import.meta.url));
  if (existsSync(developmentFile)) {
    const development = dotenv.parse(readFileSync(developmentFile));
    // Read solely for comparison, never assign development configuration to process.env.
    if (development.MONGODB_URI?.trim() === uri) refuse();
    if (development.MONGODB_URI) {
      try {
        const target = new URL(development.MONGODB_URI);
        if (target.hostname === parsed.hostname && target.port === parsed.port) refuse();
      } catch { return refuse(); }
    }
  }
  const [container] = JSON.parse(docker(['inspect', TEST_CONTAINER]));
  if (container.Name !== `/${TEST_CONTAINER}` || container.Config.Image !== 'mongo:8.0.17' || container.Config.Labels['com.docker.compose.project'] !== 'narration-groups-test' || container.Config.Labels['com.docker.compose.service'] !== 'mongodb' || container.State.Health?.Status !== 'healthy') refuse();
  const ports = container.NetworkSettings.Ports['27029/tcp'];
  if (ports?.length !== 1 || ports[0].HostIp !== '127.0.0.1' || ports[0].HostPort !== '27029') refuse();
  const data = container.Mounts.filter((mount: { Destination: string }) => mount.Destination === '/data/db');
  if (data.length !== 1 || data[0].Type !== 'volume' || data[0].Name !== 'narration-groups-test-data') refuse();
  const networks = Object.keys(container.NetworkSettings.Networks);
  if (networks.length !== 1 || networks[0] !== 'narration-groups-test_integration-only') refuse();
  const [volume] = JSON.parse(docker(['volume', 'inspect', 'narration-groups-test-data']));
  if (volume.Labels?.['com.docker.compose.project'] !== 'narration-groups-test') refuse();
  const otherUsers = docker(['ps', '-aq', '--filter', 'volume=narration-groups-test-data']).trim().split(/\s+/);
  if (otherUsers.length !== 1 || !container.Id.startsWith(otherUsers[0])) refuse();
  const instance = new mongoose.Mongoose();
  try {
    await instance.connect(uri!, { dbName: TEST_DATABASE, autoCreate: false, autoIndex: false, serverSelectionTimeoutMS: 10000 });
    const db = instance.connection.db!;
    const hello = await db.admin().command({ hello: 1 });
    const info = await db.admin().command({ buildInfo: 1 });
    const inside = JSON.parse(docker(['exec', TEST_CONTAINER, 'mongosh', '--quiet', '--port', '27029', '--eval', 'const h=db.getSiblingDB("admin").runCommand({hello:1}); print(JSON.stringify({processId:h.topologyVersion.processId.toString()}));']));
    if (db.databaseName !== TEST_DATABASE || hello.setName !== TEST_REPLICA_SET || !hello.isWritablePrimary || hello.logicalSessionTimeoutMinutes == null || hello.hosts?.length !== 1 || hello.hosts[0] !== 'localhost:27029' || info.version !== '8.0.17' || hello.topologyVersion?.processId?.toString() !== inside.processId) refuse();
    return { instance, db, version: String(info.version) };
  } catch {
    await instance.disconnect();
    return refuse();
  }
}
