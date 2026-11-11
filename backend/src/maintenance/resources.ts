import { createReadStream } from 'node:fs';
import type { Response } from 'express';
import type { StorageEngine } from 'multer';
import { drainRuntime, createTrackedResource } from './runtime.js';
export function trackedReadStream(path: string, options?: Parameters<typeof createReadStream>[1], response?: Response) {
  const stream=createTrackedResource(()=>createReadStream(path,options));
  if(response) {response.once('close',()=>stream.destroy());stream.once('error',()=>response.destroy());}
  return stream;
}
export function trackedStorage(storage: StorageEngine): StorageEngine {
  return {
    _handleFile(req,file,callback) {
      const leave=drainRuntime.begin();
      try { storage._handleFile(req,file,(...args)=>{try{callback(...args);}finally{leave();}}); }
      catch(error){leave();throw error;}
    },
    _removeFile(req,file,callback) {
      const leave=drainRuntime.begin();
      try { storage._removeFile(req,file,(...args)=>{try{callback(...args);}finally{leave();}}); }
      catch(error){leave();throw error;}
    },
  };
}
