import assert from 'node:assert/strict';
import {splitElevationEdges} from '../packages/roof-geometry/drawing-elevation-splits.ts';
const plane=(id,y,x0,x1)=>({id,polygon:[[x0,y,0],[x1,y,0],[x1,y,2],[x0,y,2]]});
const roof={status:'AUTHORITATIVE',faces:[plane('rear',1,0,4),plane('front',3,2,5)]};
const r=splitElevationEdges(roof,'NORTH');assert.equal(r.status,'SAMPLED_ONLY');
const rear=r.segments.filter(s=>s.faceId==='rear');
assert(rear.some(s=>s.visibility==='FRONT_SAMPLE'));
assert(rear.some(s=>s.visibility==='BACK_SAMPLE'));
assert.equal(splitElevationEdges({...roof,status:'WITHHELD',reason:'stale'},'NORTH').status,'WITHHELD');
console.log('PASS cardinal elevation edge splitting at partial occlusion boundaries');
import {pondyCandidateRegistry} from '../projects/pondy-lot2/candidate-registry.ts';
import {validateCandidateRoofs} from '../packages/roof-geometry/index.ts';
import {roofDrawingHandoff} from '../packages/roof-geometry/drawing-contract.ts';
const d4=pondyCandidateRegistry.candidates.find(c=>c.id==='pondy-d4');
assert(d4,'Missing Design 4 locked fixture');
for(const r of validateCandidateRoofs(d4.components).results){
 const locked=roofDrawingHandoff(r);
 for(const view of ['NORTH','SOUTH','EAST','WEST']){
  const result=splitElevationEdges(locked,view);
  assert.equal(result.status,'SAMPLED_ONLY',`${r.ownerId} ${view}`);
  assert(result.segments.length>0,`${r.ownerId} ${view}: no segments`);
  assert(result.segments.every(s=>[...s.start,...s.end].every(Number.isFinite)),`${r.ownerId} ${view}: invalid coordinates`);
 }
}
console.log('PASS cardinal elevation splits on all four locked Design 4 roof owners');

// Two sloping faces can swap which is in front without a projected edge crossing.
// That must not be accepted as a single confidently classified visible segment.
const crossing={status:'AUTHORITATIVE',faces:[
 {id:'rising',polygon:[[0,1,0],[4,3,0],[4,3,2],[0,1,2]]},
 {id:'falling',polygon:[[0,3,0],[4,1,0],[4,1,2],[0,3,2]]}
]};
const diagnostic=splitElevationEdges(crossing,'NORTH');
assert.equal(diagnostic.status,'SAMPLED_ONLY');
assert(diagnostic.segments.some(s=>s.visibility==='UNRESOLVED'));
console.log('PASS depth-reversal safety gate on crossing roof planes');
