import {failureText,redact} from './diagnostics.mjs';
export const MONGO_IMAGE='mongo:8.0.17';
export function prepareMongoImage(run){
 const lines=[];
 function call(args){const result=run(args);lines.push('$ docker '+args.join(' '),failureText(result));return result;}
 function fail(code){const error=new Error(`${code}: ${MONGO_IMAGE}; see mongo-image.log`);error.details=redact(lines.join('\n'));throw error;}
 const args=['image','inspect',MONGO_IMAGE,'--format','{{.Id}}'];
 let inspected=call(args),pulled=false;
 if(inspected.error||inspected.status!==0){
  const pull=call(['pull',MONGO_IMAGE]);
  if(pull.error||pull.status!==0)fail('MONGO_IMAGE_PULL_FAILED');
  pulled=true;inspected=call(args);
 }
 if(inspected.error||inspected.status!==0||!/^sha256:[a-f0-9]{64}$/.test(inspected.stdout?.trim()??''))fail('MONGO_IMAGE_UNAVAILABLE_AFTER_PREPARATION');
 return {reference:MONGO_IMAGE,id:inspected.stdout.trim(),pulled,log:redact(lines.join('\n'))};
}
