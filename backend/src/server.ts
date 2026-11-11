import type { Server } from 'node:http';
import { app } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import mongoose from 'mongoose';
import { ProcessingJob } from './models/ProcessingJob.js';
import { TranslationAttempt } from './models/TranslationAttempt.js';
import { createDrainControl } from './maintenance/control.js';
import { drainRuntime } from './maintenance/runtime.js';
import {loadSyntheticRuntimeAuthority} from './maintenance/authorization-loader.js';

let server: Server | undefined;
let controlServer: Server | undefined;
let shuttingDown = false;
let fencedShutdownPromise:Promise<void>|undefined;

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  if(drainRuntime.snapshot().state==='FENCED'){
    if(fencedShutdownPromise)return fencedShutdownPromise;
    fencedShutdownPromise=drainRuntime.shutdownFenced(async()=>{
      shuttingDown=true;
      // Fixed internal cleanup only: no business service, draft deletion or job retry.
      if(server)await new Promise<void>((resolve,reject)=>server!.close(error=>error?reject(error):resolve()));
      if(controlServer)await new Promise<void>((resolve,reject)=>controlServer!.close(error=>error?reject(error):resolve()));
      await mongoose.disconnect();
    });
    return fencedShutdownPromise;
  }
  drainRuntime.registerEntryPoint('shutdown',false);
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`Nhận ${signal}, đang dừng máy chủ...`);

  if (server) {
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => (error ? reject(error) : resolve()));
    });
  }
  if (controlServer) await new Promise<void>((resolve,reject)=>controlServer!.close(error=>error?reject(error):resolve()));
  await disconnectDatabase();
};

const start = async (): Promise<void> => {
  drainRuntime.registerEntryPoint('startup',false);
  try {
    const fencingAuthority=await loadSyntheticRuntimeAuthority();
    await connectDatabase(env.mongoUri);
    drainRuntime.activateNormalCoverage();
    drainRuntime.registerEntryPoint('startup',true);
    // Mongoose model initialization/index work may outlive connect(). Observe
    // the existing initialization promises; do not launch seeds/migrations.
    drainRuntime.registerEntryPoint('mongoose-initialization',false);
    const modelNames=mongoose.modelNames().sort();
    void drainRuntime.track('activeOperations',()=>Promise.all(modelNames.map(name=>mongoose.model(name).init())))
      .then(()=>drainRuntime.registerEntryPoint('mongoose-initialization',true),()=>drainRuntime.registerEntryPoint('mongoose-initialization',false));
    drainRuntime.observe('mongoose-model-registry',()=>{
      if(JSON.stringify(mongoose.modelNames().sort())!==JSON.stringify(modelNames))throw Error('UNKNOWN_MODEL_INITIALIZATION');
      return {liveDrafts:0,pending:0};
    });
    if (process.env.MAINTENANCE_CONTROL_ENABLED === 'true') {
      const port = Number(process.env.MAINTENANCE_CONTROL_PORT ?? '9091');
      if (!Number.isInteger(port) || port < 1 || port > 65535 || port === env.port) throw Error('MAINTENANCE_PORT_INVALID');
      controlServer = createDrainControl(process.env.MAINTENANCE_CONTROL_TOKEN ?? '', async () => ({
        connected: mongoose.connection.readyState === 1,
        activeJobs: await ProcessingJob.countDocuments({status:{$in:['QUEUED','PROCESSING']}}).maxTimeMS(2000),
        unresolvedAttempts: await TranslationAttempt.countDocuments({state:{$in:['CLAIMED','UNCERTAIN']}}).maxTimeMS(2000),
      }), process.env.HOSTNAME,undefined,fencingAuthority);
      await new Promise<void>((resolve,reject)=>{controlServer!.once('error',reject);controlServer!.listen(port,'127.0.0.1',resolve);});
    }
    console.info('Đã kết nối MongoDB.');
    server = app.listen(env.port, () => {
      console.info(`Backend đang chạy tại http://localhost:${env.port}/api (${env.nodeEnv}).`);
    });
  } catch (error) {
    console.error('Không thể khởi động backend:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
};

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void shutdown(signal)
      .then(()=>{process.exitCode=0;})
      .catch((error: unknown) => {process.exitCode=1;console.error('SHUTDOWN_FAILED',error instanceof Error?error.name:'UNKNOWN');});
  });
}

void start();
// reloaded
