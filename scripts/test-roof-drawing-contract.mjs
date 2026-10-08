import assert from 'node:assert/strict';
import {pondyCandidateRegistry} from '../projects/pondy-lot2/candidate-registry.ts';
import {validateCandidateRoofs} from '../packages/roof-geometry/index.ts';
import {roofDrawingHandoff} from '../packages/roof-geometry/drawing-contract.ts';
const d4=pondyCandidateRegistry.candidates.find(c=>c.id==='pondy-d4');
assert(d4);
for(const roof of validateCandidateRoofs(d4.components).results){
 const h=roofDrawingHandoff(roof);
 assert.equal(h.status,'AUTHORITATIVE');assert(h.faces.length>0);
 assert.equal(h.fascia,null,'No speculative fascia emitted');
 assert.equal(roofDrawingHandoff({...roof,ownerGeometryCurrent:false}).status,'WITHHELD');
 assert.equal(roofDrawingHandoff({...roof,authoritative:false}).status,'WITHHELD');
 assert.equal(roofDrawingHandoff({...roof,surfaceFaces:[]}).status,'WITHHELD');
}
console.log('PASS drawing handoff: 4 locked roofs, stale/invalid geometry withheld, fascia withheld');
