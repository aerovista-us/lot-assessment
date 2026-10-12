import assert from 'node:assert/strict';
import {pondyCandidateRegistry} from '../projects/pondy-lot2/candidate-registry.ts';
import {validateCandidateRoofs} from '../packages/roof-geometry/index.ts';
import {roofDrawingHandoff} from '../packages/roof-geometry/drawing-contract.ts';
import {deriveValleySectionCuts} from '../packages/roof-geometry/drawing-valley-sections.ts';

const d4=pondyCandidateRegistry.candidates.find(x=>x.id==='pondy-d4');
assert(d4);
const owners=validateCandidateRoofs(d4.components).results;
assert.equal(owners.length,4);
for(const owner of owners){
 const handoff=roofDrawingHandoff(owner);
 assert.equal(handoff.status,'AUTHORITATIVE');
 const cuts=deriveValleySectionCuts(handoff);
 if(owner.ownerId!=='home-b'){assert.equal(cuts.length,0);continue;}
 assert.equal(cuts.length,2);
 assert.deepEqual(cuts.map(x=>x.id),['V1','V2']);
 const source=handoff.junctions.flatMap(j=>j.segments.filter(s=>s.kind==='VALLEY'));
 for(let i=0;i<2;i++){
  const cut=cuts[i],valley=source[i];
  assert.equal(cut.sourceId,valley.id);
  assert.equal(cut.status,'SOURCE_INTERSECTION');
  assert(cut.segments.length>=2);
  assert(Math.abs(cut.valleyMidZFt-22.125)<1e-7);
  assert(Math.abs(cut.residualFt)<1e-7);
  assert(Math.abs(cut.origin[0]-(valley.a[0]+valley.b[0])/2)<1e-7);
  assert(Math.abs(cut.origin[1]-(valley.a[1]+valley.b[1])/2)<1e-7);
  assert(new Set(cut.segments.filter(s=>[s.a,s.b].some(p=>Math.abs(p[0])<.025&&Math.abs(p[1]-cut.valleyMidZFt)<.025)).map(s=>s.faceId)).size>=2);
  assert(cut.segments.every(s=>[...s.a,...s.b].every(Number.isFinite)));
 }
 const altered=structuredClone(handoff);
 altered.junctions[0].segments[0].zAFt+=20;
 altered.junctions[0].segments[0].zBFt+=20;
 assert.equal(deriveValleySectionCuts(altered)[0].status,'REVIEW_REQUIRED');
}
assert.equal(deriveValleySectionCuts({status:'WITHHELD',reason:'stale',ownerId:'home-b',roofId:'r',faces:[],junctions:[],fascia:null}).length,0);
console.log('PASS two locked Home B valley cross-sections, precise source XY/Z and two incident roof faces; stale/falsified geometry withheld');
