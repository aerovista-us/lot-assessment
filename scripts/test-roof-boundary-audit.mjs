import assert from 'node:assert/strict';
import {auditRoofBoundary} from '../packages/roof-geometry/boundary-audit.ts';
const faces=[
 {id:'left',polygon:[[0,0,10],[10,0,10],[10,5,12.5],[0,5,12.5]]},
 {id:'right',polygon:[[0,5,12.5],[10,5,12.5],[10,10,10],[0,10,10]]}
];
const result=auditRoofBoundary(faces);
assert.equal(result.status,'VALID');
if(result.status==='VALID'){
 assert.equal(result.sharedEdges,1);
 assert.equal(result.boundary.filter(e=>e.kind==='EAVE').length,2);
 assert.equal(result.boundary.length,6);
}
assert.equal(auditRoofBoundary([]).status,'INVALID');
assert.equal(auditRoofBoundary([{id:'bad',polygon:[[0,0,0],[0,0,0],[1,1,1]]}]).status,'INVALID');
assert.equal(auditRoofBoundary([...faces,{...faces[0],id:'third'}]).status,'INVALID');
assert.equal(auditRoofBoundary([{...faces[0],id:'left'}, {...faces[1],id:'left'}]).status,'INVALID');
console.log('Boundary audit fixtures passed');
