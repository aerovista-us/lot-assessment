import assert from 'node:assert/strict';
import {sampleAxonRoofEdges} from '../packages/roof-geometry/drawing-axon-visibility.ts';
import {pondyCandidateRegistry} from '../projects/pondy-lot2/candidate-registry.ts';
import {validateCandidateRoofs} from '../packages/roof-geometry/index.ts';
import {roofDrawingHandoff} from '../packages/roof-geometry/drawing-contract.ts';
const d4=pondyCandidateRegistry.candidates.find(c=>c.id==='pondy-d4');
assert(d4);
for(const result of validateCandidateRoofs(d4.components).results){
 const drawing=roofDrawingHandoff(result);
 const lines=sampleAxonRoofEdges(drawing,Math.PI/4,Math.PI/6);
 assert.equal(lines.status,'SAMPLED_ONLY');
 assert(lines.segments.length>0);
 assert(lines.segments.every(s=>[...s.start,...s.end].every(Number.isFinite)));
}
assert.equal(sampleAxonRoofEdges({status:'WITHHELD',reason:'stale',faces:[]},Math.PI/4,Math.PI/6).status,'WITHHELD');
console.log('PASS conservative axonometric depth samples on four locked roofs and withheld authority');
