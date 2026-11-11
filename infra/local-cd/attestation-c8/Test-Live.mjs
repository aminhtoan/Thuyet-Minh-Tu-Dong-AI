import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {observe,inspect} from '../../../backend/staging/live-attestation.mjs';
const expected=JSON.parse(readFileSync(process.argv[2],'utf8'));
const mongo=inspect('narration-s396-c8-mongodb-1');
const cases={wrongContainer:{...expected,id:mongo.id},wrongImage:{...expected,imageId:'sha256:'+'0'.repeat(64)},wrongProject:{...expected,project:'not-c8'},staleIdentity:{...expected,startedAt:'2000-01-01T00:00:00Z'},metadataUnavailable:{...expected,id:'0'.repeat(64)}};
const results={};
for(const [name,input]of Object.entries(cases)){assert.throws(()=>observe(input));results[name]='BLOCKED';console.log('PASS '+name+' BLOCKED');}
writeFileSync(process.argv[3],JSON.stringify(results,null,2)+'\n');
