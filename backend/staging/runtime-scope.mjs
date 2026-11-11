// Offline syntactic import graph, not a proof of computed imports or external SDKs.
import ts from 'typescript';
import {readFileSync,existsSync,writeFileSync} from 'node:fs';
import {dirname,resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
export function buildScope(root,entry='server.ts'){
 const files=new Map(),unresolved=[];
 function visit(path){
  if(files.has(path))return;
  const text=readFileSync(path,'utf8'),source=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);
  const row={path:relative(root,path).replaceAll('\\','/'),imports:[],writes:[]};files.set(path,row);
  function add(spec,node){
   if(!spec.startsWith('.'))return;
   const base=resolve(dirname(path),spec),target=[base.replace(/\.js$/,'.ts'),base,base+'.ts',resolve(base,'index.ts')].find(existsSync);
   if(!target){unresolved.push({path:row.path,import:spec});return;}
   row.imports.push(relative(root,target).replaceAll('\\','/'));visit(target);
  }
  function walk(node){
   if(ts.isImportDeclaration(node)&&!node.importClause?.isTypeOnly){
    const clause=node.importClause;
    const onlyTypes=clause&&!clause.name&&clause.namedBindings&&ts.isNamedImports(clause.namedBindings)&&clause.namedBindings.elements.every(e=>e.isTypeOnly);
    if(!onlyTypes)add(node.moduleSpecifier.text,node);
   }
   if(ts.isExportDeclaration(node)&&!node.isTypeOnly&&node.moduleSpecifier)add(node.moduleSpecifier.text,node);
   if(ts.isCallExpression(node)){
    if(node.expression.kind===ts.SyntaxKind.ImportKeyword){if(ts.isStringLiteral(node.arguments[0]))add(node.arguments[0].text,node);else unresolved.push({path:row.path,import:'COMPUTED_IMPORT'});}
    const call=node.expression.getText(source);
    if(/\.(create|save|insertOne|insertMany|updateOne|updateMany|deleteOne|deleteMany|findOneAndUpdate|bulkWrite|withTransaction)$/.test(call)){
     let owner=node.parent;
     while(owner&&!ts.isFunctionDeclaration(owner)&&!ts.isArrowFunction(owner)&&!ts.isMethodDeclaration(owner))owner=owner.parent;
     row.writes.push({line:source.getLineAndCharacterOfPosition(node.getStart()).line+1,call,owner:owner?.name?.getText(source)??'anonymous/module'});
    }
   }ts.forEachChild(node,walk);
  }walk(source);
 }visit(resolve(root,entry));
 return {entry,files:[...files.values()].sort((a,b)=>a.path.localeCompare(b.path)),unresolved};
}
const here=dirname(fileURLToPath(import.meta.url));
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const graph=buildScope(resolve(here,'../src'));
 writeFileSync(resolve(here,'../../infra/local-cd/backend-runtime-scope.json'),JSON.stringify(graph,null,2)+'\n');
 console.log(JSON.stringify({reachable:graph.files.length,writeCandidates:graph.files.reduce((n,r)=>n+r.writes.length,0),unresolved:graph.unresolved}));
}
