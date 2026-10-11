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

const coincidentScreen=verifyRoofEdgeIntervals(roof([face('far',1,0,4),face('near',3,0,4)]),view);
assert.equal(coincidentScreen.status,'INTERVAL_VERIFIED');
assert(partition(coincidentScreen,'far',0).every(s=>s.visibility==='HIDDEN'));
assert(partition(coincidentScreen,'near',0).every(s=>s.visibility==='VISIBLE'));
console.log('PASS distinct-depth exactly coincident projected boundaries are not falsely unresolved');

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

const gableLeft={id:'gable-left',polygon:[[0,-1,-1],[4,-1,1],[4,1,3],[0,1,1]]};
const gableRight={id:'gable-right',polygon:[[0,1,1],[4,1,3],[4,3,1],[0,3,-1]]};
const slopedRidge=verifyRoofEdgeIntervals(roof([gableLeft,gableRight]),{kind:'AXON',azimuth:0,elevation:Math.PI/6});
assert.equal(slopedRidge.status,'INTERVAL_VERIFIED');
assert(slopedRidge.segments.some(s=>s.visibility==='DUPLICATE_SHARED'));
assert(!slopedRidge.segments.some(s=>s.visibility==='UNRESOLVED'));
coverage(slopedRidge,[gableLeft,gableRight]);
console.log('PASS sloped shared 3D ridge receives one physical stroke without false unresolved status');


const coplanar=verifyRoofEdgeIntervals(roof([face('a',2,0,4),face('b',2,1,3)]),view);
assert.equal(coplanar.status,'REVIEW_REQUIRED');
assert(coplanar.segments.some(s=>s.visibility==='UNRESOLVED'));
console.log('PASS coplanar overlapping face areas remain unresolved');

assert.equal(verifyRoofEdgeIntervals({status:'WITHHELD',reason:'rotated stale',faces:[]},view).status,'WITHHELD');
assert.equal(verifyRoofEdgeIntervals(roof([{id:'bowtie',polygon:[[0,0,0],[2,0,2],[0,0,2],[2,0,0]]}]),view).status,'WITHHELD');
assert.equal(verifyRoofEdgeIntervals(roof([a]),{kind:'AXON',azimuth:0,elevation:0}).status,'WITHHELD');
console.log('PASS stale/malformed/invalid-camera inputs withheld');
const edgeOnRoof=roof([{id:'edge-on-triangle',polygon:[[0,0,0],[1,0,1],[2,1,2]]}]);
const edgeOnResult=verifyRoofEdgeIntervals(edgeOnRoof,view);
assert.equal(edgeOnResult.status,'REVIEW_REQUIRED','Noncollapsed edge-on face must never claim verified');
assert.equal(edgeOnResult.counts.edgeOnFaces,1);
assert.equal(edgeOnResult.counts.collapsedEdges,0,'Every source edge has a nonzero screen length');
assert(edgeOnResult.segments.length===3&&edgeOnResult.segments.every(s=>s.visibility==='UNRESOLVED'));
console.log('PASS noncollapsed edge-on triangle is review-required, never falsely verified');

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
for(const item of validated){
 const handoff=roofDrawingHandoff(item);
 for(const azimuth of [0,Math.PI/2])for(const elevation of [0.001,Math.PI/2-0.001]){
  const steep=verifyRoofEdgeIntervals(handoff,{kind:'AXON',azimuth,elevation});
  assert(['INTERVAL_VERIFIED','REVIEW_REQUIRED'].includes(steep.status),item.ownerId+' near-degenerate camera');
  assert(steep.segments.every(s=>[...s.start,...s.end].every(Number.isFinite)));
  coverage(steep,handoff.faces);
 }
}
console.log('PASS near-horizon and nearly overhead camera views remain finite and conservatively classified');
const homeB=validated.find(r=>r.ownerId==='home-b');
assert(homeB&&homeB.junctions.length>0);
const bNorth=verifyRoofEdgeIntervals(roofDrawingHandoff(homeB),view);
assert.equal(bNorth.status,'REVIEW_REQUIRED','Home B cannot be promoted before junction/edge-on review');
assert(bNorth.counts.unresolved>0&&bNorth.counts.collapsedEdges>0,'Home B review findings are expected to remain visible');
console.log('PASS 4/4 locked D4 roof owners, 4 cardinal views + 4 rotated axons each, Home B valleys');
const pondyCamera={kind:'CUSTOM',screenX:[5.2,-3.2,0],screenY:[-1.55,-1.35,-8.2],depth:[-26.24,-42.64,11.98]};
for(const item of validated){
 const locked=roofDrawingHandoff(item);
 const verified=verifyRoofEdgeIntervals(locked,pondyCamera);
 assert.equal(verified.status,'INTERVAL_VERIFIED',item.ownerId+' Pondy axon model visibility');
 assert.equal(verified.counts.unresolved,0);
 coverage(verified,locked.faces);
}
assert.equal(verifyRoofEdgeIntervals(roof([front]),{kind:'CUSTOM',screenX:[1,0,0],screenY:[1,0,0],depth:[0,0,1]}).status,'WITHHELD');
console.log('PASS exact Pondy camera interval geometry for all four owners, invalid custom camera withheld');
