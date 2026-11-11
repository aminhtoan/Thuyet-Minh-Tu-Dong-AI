import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const digestFile=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
export function validateProfile(profile,current,expectedPaths){
 const blockers=[];
 if(!Array.isArray(expectedPaths))blockers.push('MISSING_EXPECTED_CALL_PATH_SET');
 else {
  const keys=profile.paths.map(row=>row.key);
  for(const key of expectedPaths)if(!keys.includes(key))blockers.push('MISSING_CALL_PATH:'+key);
  if(new Set(keys).size!==keys.length||keys.some(key=>!expectedPaths.includes(key)))blockers.push('UNEXPECTED_OR_DUPLICATE_CALL_PATH');
 }
 for(const [path,hash]of Object.entries(profile.files))if(current[path]!==hash)blockers.push('SOURCE_CHANGED:'+path);
 for(const path of Object.keys(current))if(!Object.hasOwn(profile.files,path))blockers.push('NEW_REACHABLE_SOURCE:'+path);
 if(profile.graphDigest!==current['<graph>'])blockers.push('IMPORT_GRAPH_CHANGED');
 for(const row of profile.paths){
  if(!['PROVEN','EXCLUDED_WITH_EVIDENCE'].includes(row.classification)||!row.caller||!row.registration||!row.completion||!row.test)blockers.push('CALL_PATH_UNPROVEN:'+row.key);
 }
 return {status:blockers.length?'BLOCKED':'REVIEWED_SOURCE_PROFILE',replacementAllowed:false,blockers};
}
