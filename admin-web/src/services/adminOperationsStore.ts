import { createAdminJobsMock, createAdminProjectsMock } from '../mocks/adminOperations.mock';
export let projects=createAdminProjectsMock();
export let jobs=createAdminJobsMock(projects);
export const clone=<T>(value:T):T=>structuredClone(value);
export function delay(signal?:AbortSignal,latencyMs=300){return new Promise<void>((resolve,reject)=>{if(signal?.aborted){reject(new DOMException('Aborted','AbortError'));return;}const abort=()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'));};const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},Math.max(0,latencyMs));signal?.addEventListener('abort',abort,{once:true});});}
export function resetOperations(){projects=createAdminProjectsMock();jobs=createAdminJobsMock(projects);}
