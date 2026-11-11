// OFFLINE review aid. Syntactic findings are candidates, never a completeness proof.
import ts from 'typescript';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {resolve,relative,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
export function findings(text,path='entry.ts') {
 const source=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);
 const result=[];
 function visit(node){
  if(ts.isCallExpression(node)||ts.isNewExpression(node)){
   const expression=node.expression.getText(source);
   if(/(?:spawn|execFile|createReadStream|createWriteStream|setTimeout|setInterval|fetch|connect|disconnect|save|create|insertMany|bulkWrite|updateOne|updateMany|findOneAndUpdate|deleteOne|deleteMany|startTransaction|commitTransaction|listen|\.on|\.once|\.then|\.finally)$/.test(expression))
    result.push({line:source.getLineAndCharacterOfPosition(node.getStart()).line+1,call:expression});
  }
  ts.forEachChild(node,visit);
 }visit(source);return result;
}
export function inventory(root){
 const rows=[];
 function walk(dir){for(const item of readdirSync(dir,{withFileTypes:true})){const path=resolve(dir,item.name);if(item.isDirectory())walk(path);else if(/\.[cm]?[jt]s$/.test(item.name)){const text=readFileSync(path,'utf8');rows.push({path:relative(root,path).replaceAll('\\','/'),sha256:createHash('sha256').update(text).digest('hex'),findings:findings(text,path)});}}}
 walk(root);return rows.sort((a,b)=>a.path.localeCompare(b.path));
}
export function assess(current,review){
 const blockers=[];const reviewed=new Map(review.files.map(row=>[row.path,row]));
 for(const row of current){const prior=reviewed.get(row.path);if(!prior){blockers.push({path:row.path,reason:'NEW_ENTRY_POINT_UNREVIEWED'});continue;}
  if(prior.sha256!==row.sha256)blockers.push({path:row.path,reason:'SOURCE_CHANGED_REVIEW_STALE'});
  if(!['PROTECTED','READ_ONLY','NOT_APPLICABLE'].includes(prior.classification)||!prior.evidence)blockers.push({path:row.path,reason:'UNKNOWN_COVERAGE'});
 }
 for(const row of review.files)if(!current.some(file=>file.path===row.path))blockers.push({path:row.path,reason:'REVIEWED_SOURCE_MISSING'});
 // Static file hashes/classification cannot prove runtime module/SDK/callback closure.
 blockers.push({path:'<runtime>',reason:'RUNTIME_SIDE_EFFECT_CAPABILITIES_UNPROVEN'});
 return {status:'BLOCKED',code:'FENCING_COVERAGE_UNPROVEN',blockers};
}
const here=dirname(fileURLToPath(import.meta.url));
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const rows=inventory(resolve(here,'../src'));const reviewPath=resolve(here,'../../infra/local-cd/fencing-source-inventory.json');
 if(process.argv.includes('--initialize-review')){
  // Every source file starts UNKNOWN. Initialization never approves coverage.
  writeFileSync(reviewPath,JSON.stringify({schema:'FENCING_SOURCE_REVIEW_V1',files:rows.map(row=>({...row,classification:'UNKNOWN',evidence:'Awaiting entry-point/capability proof; not automatically approved'}))},null,2)+'\n');
 }
 const report=assess(rows,JSON.parse(readFileSync(reviewPath,'utf8')));
 console.log(JSON.stringify({files:rows.length,...report},null,2));
 // Expected blocked audits are distinguishable from tooling errors.
 process.exitCode=2;
}
