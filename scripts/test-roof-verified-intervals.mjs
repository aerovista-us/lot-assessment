import assert from 'node:assert/strict';
import {verifyRoofEdgeIntervals} from '../packages/roof-geometry/drawing-verified-intervals.ts';
import {pondyCandidateRegistry} from '../projects/pondy-lot2/candidate-registry.ts';
import {validateCandidateRoofs} from '../packages/roof-geometry/index.ts';
import {roofDrawingHandoff} from '../packages/roof-geometry/drawing-contract.ts';
const view={kind:'ELEVATION',view:'NORTH'};
const face=(id,y,x0,x1)=>({id,polygon:[[x0,y,0],[x1,y,0],[x1,y,2],[x0,y,2]]});
const roof=faces=>({status:'AUTHORITATIVE',faces});
function partition(result,faceId,edgeIndex){
 return result.segments.filter(s=>s.faceId===faceId&&s.edgeIndex===edgeIndex).sort((a,b)=>a.t0-b.t0);
}
function coverage(result,faces){
 for(const face of faces)for(let i=0;i<face.polygon.length;i++){
  const segments=partition(result,face.id,i);
  if(!segments.length)continue; // projected edge-on or collapsed.
  assert(Math.abs(segments[0].t0)<1e-7);
  assert(Math.abs(segments.at(-1).t1-1)<1e-7);
  for(let k=1;k<segments.length;k++)assert(Math.abs(segments[k].t0-segments[k-1].t1)<1e-7);
  assert(segments.every(s=>[...s.start,...s.end].every(Number.isFinite)));
 }
}
const front=face('front',3,2,5),rear=face('rear',1,0,4);
const partial=verifyRoofEdgeIntervals(roof([rear,front]),view);
assert.equal(partial.status,'INTERVAL_VERIFIED');
coverage(partial,[rear,front]);
const bottom=partition(partial,'rear',0);
assert(bottom.some(s=>s.visibility==='VISIBLE'&&s.start[0]<1));
assert(bottom.some(s=>s.visibility==='HIDDEN'&&s.end[0]>3));
assert(bottom.some(s=>Math.abs(s.start[0]-2)<1e-7||Math.abs(s.end[0]-2)<1e-7));
console.log('PASS exact front/hidden intervals across projected face boundary');

const crossFace=(id,y0,y1)=>({id,polygon:[[0,y0,0],[4,y1,0],[4,y1,2],[0,y0,2]]});
const crossing=verifyRoofEdgeIntervals(roof([crossFace('up',1,3),crossFace('down',3,1)]),view);
const edges=partition(crossing,'up',0);
assert(edges.some(s=>s.visibility==='VISIBLE')&&edges.some(s=>s.visibility==='HIDDEN'));
assert(edges.some(s=>Math.abs(s.start[0]-2)<1e-6||Math.abs(s.end[0]-2)<1e-6));
coverage(crossing,[crossFace('up',1,3),crossFace('down',3,1)]);
console.log('PASS exact analytic depth-swap root in open face interval');

const a=face('a',2,0,2),b=face('b',2,2,4);
const adjacent=verifyRoofEdgeIntervals(roof([a,b]),view);
assert(adjacent.segments.some(s=>s.visibility==='INTERNAL_SEAM'));
assert(adjacent.segments.every(s=>s.visibility!=='UNRESOLVED'));
console.log('PASS coplanar adjacent internal seam suppression');

const coplanar=verifyRoofEdgeIntervals(roof([face('a',2,0,4),face('b',2,1,3)]),view);
assert.equal(coplanar.status,'REVIEW_REQUIRED');
assert(coplanar.segments.some(s=>s.visibility==='UNRESOLVED'));
console.log('PASS coplanar overlapping face areas remain unresolved');

assert.equal(verifyRoofEdgeIntervals({status:'WITHHELD',reason:'rotated stale',faces:[]},view).status,'WITHHELD');
assert.equal(verifyRoofEdgeIntervals(roof([{id:'bowtie',polygon:[[0,0,0],[2,0,2],[0,0,2],[2,0,0]]}]),view).status,'WITHHELD');
assert.equal(verifyRoofEdgeIntervals(roof([a]),{kind:'AXON',azimuth:0,elevation:0}).status,'WITHHELD');
console.log('PASS stale/malformed/invalid-camera inputs withheld');

const d4=pondyCandidateRegistry.candidates.find(c=>c.id==='pondy-d4');
assert(d4);
const validated=validateCandidateRoofs(d4.components).results;
assert.equal(validated.length,4);
for(const item of validated){
 const handoff=roofDrawingHandoff(item);
 assert.equal(handoff.status,'AUTHORITATIVE');
 for(const cardinal of ['NORTH','SOUTH','EAST','WEST']){
  const verified=verifyRoofEdgeIntervals(handoff,{kind:'ELEVATION',view:cardinal});
  assert(['INTERVAL_VERIFIED','REVIEW_REQUIRED'].includes(verified.status),item.ownerId+' '+cardinal);
  assert(verified.segments.length>0,item.ownerId+' '+cardinal);
  coverage(verified,handoff.faces);
 }
 for(const azimuth of [0,Math.PI/4,Math.PI/2,Math.PI*1.75]){
  const verified=verifyRoofEdgeIntervals(handoff,{kind:'AXON',azimuth,elevation:Math.PI/6});
  assert(['INTERVAL_VERIFIED','REVIEW_REQUIRED'].includes(verified.status),item.ownerId+' axon '+azimuth);
  assert(verified.segments.length>0);
  coverage(verified,handoff.faces);
 }
}
const homeB=validated.find(r=>r.ownerId==='home-b');
assert(homeB&&homeB.junctions.length>0);
console.log('PASS 4/4 locked D4 roof owners, 4 cardinal views + 4 rotated axons each, Home B valleys');
