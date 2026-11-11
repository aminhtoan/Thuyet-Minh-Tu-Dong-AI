import {drainRuntime,type DrainRuntime} from './runtime.js';
export type Scheduler=(callback:()=>void,delay:number)=>()=>void;
// Register before scheduling; retain through pending, execution and async cleanup.
export function scheduleCapability(schedule:Scheduler,callback:()=>void|PromiseLike<void>,delay:number,runtime:DrainRuntime=drainRuntime){
 const leave=runtime.begin();
 let state:'PENDING'|'RUNNING'|'DONE'='PENDING';
 let cancel:(()=>void)|undefined;
 const finish=()=>{state='DONE';leave();};
 try{
  cancel=schedule(()=>{
   if(state!=='PENDING')return;
   state='RUNNING';
   try{
    const result=callback();
    if(result && typeof result.then==='function'){void Promise.resolve(result).then(finish,()=>{runtime.registerEntryPoint('scheduled-callback-rejection',false);finish();});}
    else finish();
   }catch(error){runtime.registerEntryPoint('scheduled-callback-rejection',false);finish();throw error;}
  },delay);
 }catch(error){finish();throw error;}
 return ()=>{cancel?.();if(state==='PENDING')finish();};
}
