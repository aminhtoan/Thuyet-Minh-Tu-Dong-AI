// Local lexical evidence only. No positive result from this tool grants fencing.
import ts from 'typescript';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildScope} from './runtime-scope.mjs';
export function traceEffects(text,path='entry.ts'){
 const source=ts.createSourceFile(path,text,99,true),effects=[];
 function walk(node){
  if(ts.isCallExpression(node)&&/\.(create|save|insertOne|insertMany|updateOne|updateMany|deleteOne|deleteMany|findOneAndUpdate|bulkWrite|withTransaction)$/.test(node.expression.getText(source))){
   const owners=[],boundaries=[],callbacks=[];
   for(let p=node.parent;p;p=p.parent){
    if(ts.isFunctionDeclaration(p)||ts.isMethodDeclaration(p)||ts.isArrowFunction(p)){
     const parent=p.parent;
     owners.push(p.name?.getText(source)??(ts.isVariableDeclaration(parent)||ts.isPropertyAssignment(parent)?parent.name.getText(source):'callback'));
     if(ts.isCallExpression(parent)){
      const expression=parent.expression.getText(source);
      if(/(?:\.track|\.runSync|detached)$/.test(expression))boundaries.push({line:source.getLineAndCharacterOfPosition(parent.getStart()).line+1,call:expression});
      else if(/(?:\.then|\.finally|\.catch|setTimeout|setInterval|\.on|\.once)$/.test(expression))callbacks.push({line:source.getLineAndCharacterOfPosition(parent.getStart()).line+1,call:expression});
     }
    }
   }
   effects.push({line:source.getLineAndCharacterOfPosition(node.getStart()).line+1,call:node.expression.getText(source),owners,boundaries,callbacks,
    classification:callbacks.length?'CALLBACK_COMPLETION_PROOF_REQUIRED':boundaries.length?'LEXICAL_BOUNDARY_FOUND':'CALLER_BOUNDARY_PROOF_REQUIRED'});
  }ts.forEachChild(node,walk);
 }walk(source);return effects;
}
export function requireReviewedPaths(current,review){
 const blockers=[];const map=new Map(review.map(r=>[r.key,r]));
 for(const row of current){const key=row.key??`${row.path}:${row.line}:${row.call}`,prior=map.get(key);
  if(!prior)blockers.push({key,reason:'MISSING_CALL_PATH'});
  else if(!prior.registration||!prior.completion||!prior.negativeTest)blockers.push({key,reason:'INCOMPLETE_BOUNDARY_EVIDENCE'});
  if(row.classification!=='LEXICAL_BOUNDARY_FOUND')blockers.push({key,reason:row.classification});
 }
 return {status:blockers.length?'BLOCKED':'LOCAL_REVIEW_ONLY',replacementAllowed:false,blockers};
}
const here=dirname(fileURLToPath(import.meta.url));
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=resolve(here,'../src'),graph=buildScope(root);
 const paths=graph.files.flatMap(row=>traceEffects(readFileSync(resolve(root,row.path),'utf8'),row.path).map(effect=>({path:row.path,...effect})));
 writeFileSync(resolve(here,'../../infra/local-cd/call-path-evidence.json'),JSON.stringify({scope:graph.entry,paths,status:'REVIEW_REQUIRED',replacementAllowed:false},null,2)+'\n');
 console.log(JSON.stringify({paths:paths.length,lexical:paths.filter(p=>p.classification==='LEXICAL_BOUNDARY_FOUND').length,callerProof:paths.filter(p=>p.classification==='CALLER_BOUNDARY_PROOF_REQUIRED').length,callbackProof:paths.filter(p=>p.classification==='CALLBACK_COMPLETION_PROOF_REQUIRED').length}));
}
