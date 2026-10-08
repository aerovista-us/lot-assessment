import assert from 'node:assert/strict';
import {pondyCandidateRegistry} from '../projects/pondy-lot2/candidate-registry.ts';
import {validateCandidateRoofs} from '../packages/roof-geometry/index.ts';
import {roofDrawingHandoff} from '../packages/roof-geometry/drawing-contract.ts';
import {intersectRoofSection,projectRoofAxon} from '../packages/roof-geometry/drawing-spatial.ts';
const d4=pondyCandidateRegistry.candidates.find(c=>c.id==='pondy-d4');
for(const original of validateCandidateRoofs(d4.components).results){
 const roof=roofDrawingHandoff(original),axon=projectRoofAxon(roof,Math.PI/4,Math.PI/6);
 assert.equal(axon.status,'DRAWABLE');assert.equal(axon.faces.length,original.surfaceFaces.length);
 const section=intersectRoofSection(roof,[0,0],[1,0]);assert.equal(section.status,'DRAWABLE');
 assert(section.segments.every(s=>[...s.a,...s.b].every(Number.isFinite)));
 assert.equal(projectRoofAxon(roof,NaN,1).status,'WITHHELD');
 assert.equal(intersectRoofSection(roof,[0,0],[0,0]).status,'WITHHELD');
 assert.equal(projectRoofAxon(roofDrawingHandoff({...original,ownerGeometryCurrent:false}),0.5,0.5).status,'WITHHELD');
}
console.log('PASS spatial roof axon + exact section intersections for four locked roofs');
