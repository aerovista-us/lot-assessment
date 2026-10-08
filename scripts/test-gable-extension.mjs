import assert from 'node:assert/strict';
import {solveSimpleGableExtension} from '../packages/roof-geometry/gable-extension.ts';
const faces=[{id:'north',polygon:[[0,0,10],[10,0,10],[10,5,12.5],[0,5,12.5]]},{id:'south',polygon:[[0,5,12.5],[10,5,12.5],[10,10,10],[0,10,10]]}];
const result=solveSimpleGableExtension(faces,1,1,'approved detail fixture');
assert.equal(result.status,'AUTHORITATIVE');
if(result.status==='AUTHORITATIVE'){
 assert.equal(result.faces.length,2);
 assert(result.faces.every(f=>f.polygon.some(p=>p[2]===9.5)));
 assert(result.faces.every(f=>f.polygon.some(p=>p[0]===-1)));
}
assert.equal(solveSimpleGableExtension(faces,1,1,'').status,'WITHHELD');
assert.equal(solveSimpleGableExtension(faces,NaN,1,'approved').status,'WITHHELD');
assert.equal(solveSimpleGableExtension([...faces,faces[0]],1,1,'approved').status,'WITHHELD');
console.log('PASS restricted gable extension; explicit reject unsupported topology');
