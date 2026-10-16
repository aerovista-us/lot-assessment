import assert from 'node:assert/strict';
import {verifyRoofEdgeIntervals} from '../packages/roof-geometry/drawing-verified-intervals.ts';
import {pondyCandidateRegistry} from '../projects/pondy-lot2/candidate-registry.ts';
import {validateCandidateRoofs} from '../packages/roof-geometry/index.ts';
import {roofDrawingHandoff} from '../packages/roof-geometry/drawing-contract.ts';

// Independent oracle: intersect a 3D view ray with each source triangle.
// Coplanar rays are clipped against triangle half-spaces, rather than using
// the production projected polygon/front-depth implementation.
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const pointAt=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const directions={NORTH:[0,1,0],SOUTH:[0,-1,0],EAST:[1,0,0],WEST:[-1,0,0]};
function rayTriangle(p,d,triangle){
 const [a,b,c]=triangle;
 const normal=cross(sub(b,a),sub(c,a)),norm=Math.hypot(...normal);
 if(norm<1e-12)return -Infinity;
 const n=normal.map(v=>v/norm),den=dot(n,d),distance=dot(n,sub(p,a));
 if(Math.abs(den)>1e-10){
  const t=-distance/den,hit=p.map((v,i)=>v+t*d[i]);
  const inside=triangle.every((v,i)=>dot(n,cross(sub(triangle[(i+1)%3],v),sub(hit,v)))>=-1e-7);
  return inside?t:-Infinity;
 }
 if(Math.abs(distance)>1e-7)return -Infinity;
 let lo=-Infinity,hi=Infinity;
 for(let i=0;i<3;i++){
  const v=triangle[i],edge=sub(triangle[(i+1)%3],v);
  const base=dot(n,cross(edge,sub(p,v))),slope=dot(n,cross(edge,d));
  if(Math.abs(slope)<1e-12){if(base< -1e-7)return -Infinity;continue;}
  const t=(-1e-8-base)/slope;
  if(slope>0)lo=Math.max(lo,t);else hi=Math.min(hi,t);
 }
 return lo<=hi?hi:-Infinity;
}
// Ear clipping is independent of the verifier's projected-support envelope and
// supports simple concave source faces (a vertex fan would fill their notches).
function triangles(poly){
 const normal=poly.slice(1,-1).map((p,i)=>cross(sub(p,poly[0]),sub(poly[i+2],poly[0]))).find(n=>Math.hypot(...n)>1e-10);
 assert(normal);
 const drop=normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs)));
 const flat=poly.map(p=>p.filter((_,i)=>i!==drop));
 const orient=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const area=flat.reduce((v,a,i)=>{const b=flat[(i+1)%flat.length];return v+a[0]*b[1]-a[1]*b[0];},0);
 const sign=Math.sign(area),ids=poly.map((_,i)=>i),out=[];
 while(ids.length>3){
  let found=false;
  for(let k=0;k<ids.length;k++){
   const a=ids[(k+ids.length-1)%ids.length],b=ids[k],c=ids[(k+1)%ids.length];
   if(orient(flat[a],flat[b],flat[c])*sign<=1e-10)continue;
   if(ids.some(j=>![a,b,c].includes(j)&&[[a,b],[b,c],[c,a]].every(([u,v])=>orient(flat[u],flat[v],flat[j])*sign>=-1e-10)))continue;
   out.push([poly[a],poly[b],poly[c]]);ids.splice(k,1);found=true;break;
  }
  assert(found,'Independent triangulator could not find an ear');
 }
 out.push(ids.map(i=>poly[i]));return out;
}
function oracle(roof,p,d){
 let front=-Infinity;
 for(const face of roof.faces)for(const triangle of triangles(face.polygon))
  front=Math.max(front,rayTriangle(p,d,triangle));
 return front>1e-5?'HIDDEN':'VISIBLE';
}
let checked=0;
function compare(roof,view){
 const result=verifyRoofEdgeIntervals(roof,{kind:'ELEVATION',view},{resolveCardinalEdgeOn:true});
 assert.equal(result.status,'INTERVAL_VERIFIED');
 assert.equal(result.projectionProof.method,'CARDINAL_RAY_DEPTH_V1');
 assert.equal(result.projectionProof.collapsedProjection.length,result.counts.collapsedEdges);
 for(const segment of result.segments){
  if(!['VISIBLE','HIDDEN'].includes(segment.visibility))continue;
  const face=roof.faces.find(f=>f.id===segment.faceId);
  for(const fraction of [.211,.5,.789]){
   const t=segment.t0+(segment.t1-segment.t0)*fraction;
   const p=pointAt(face.polygon[segment.edgeIndex],face.polygon[(segment.edgeIndex+1)%face.polygon.length],t);
   assert.equal(segment.visibility,oracle(roof,p,directions[view]),
    `${face.id}/${segment.edgeIndex} ${view} at ${t}: analytic interval disagrees with independent 3D ray`);
   checked++;
  }
 }
 for(const face of roof.faces)for(let edge=0;edge<face.polygon.length;edge++){
  const runs=result.segments.filter(s=>s.faceId===face.id&&s.edgeIndex===edge).sort((a,b)=>a.t0-b.t0);
  const collapsed=result.projectionProof.collapsedProjection.filter(s=>s.faceId===face.id&&s.edgeIndex===edge);
  assert(runs.length||collapsed.length===1,'Every source edge has an interval or explicit projected-point record');
  if(!runs.length)continue;
  assert(Math.abs(runs[0].t0)<1e-7&&Math.abs(runs.at(-1).t1-1)<1e-7);
  for(let k=1;k<runs.length;k++)assert(Math.abs(runs[k].t0-runs[k-1].t1)<1e-7);
 }
 return result;
}
const candidate=pondyCandidateRegistry.candidates.find(c=>c.id==='pondy-d4');
const roofs=validateCandidateRoofs(candidate.components).results.map(roofDrawingHandoff);
for(const roof of roofs)for(const view of Object.keys(directions)){
 const result=compare(roof,view);
 const reversed=compare({...roof,faces:[...roof.faces].reverse()},view);
 const signature=r=>r.segments.map(s=>`${s.faceId}/${s.edgeIndex}/${s.t0.toFixed(7)}/${s.t1.toFixed(7)}/${s.visibility}`).sort();
 assert.deepEqual(signature(result),signature(reversed),'Face iteration order must not change visibility');
}
for(const roof of roofs)for(const view of Object.keys(directions))compare({...roof,faces:roof.faces.map(f=>({...f,polygon:[...f.polygon].reverse()}))},view);
for(const roof of roofs)for(const angle of [Math.PI/6,Math.PI/2,131*Math.PI/180]){
 const ca=Math.cos(angle),sa=Math.sin(angle);
 const transformed={...roof,faces:roof.faces.map(f=>({...f,polygon:f.polygon.map(([x,y,z])=>[x*ca-y*sa+1000,x*sa+y*ca-500,z+30])}))};
 for(const view of Object.keys(directions))compare(transformed,view);
}
const partial={status:'AUTHORITATIVE',faces:[
 {id:'rear',polygon:[[0,1,0],[4,1,0],[4,1,2],[0,1,2]]},
 {id:'front',polygon:[[2,3,0],[5,3,0],[5,3,2],[2,3,2]]}]};
compare(partial,'NORTH');
const edgeOn={status:'AUTHORITATIVE',faces:[{id:'edge-on',polygon:[[0,0,0],[1,0,1],[2,1,2]]}]};
compare(edgeOn,'NORTH');
// Concave edge-on face: its front branch ends at x=3. The long source edge
// x=0..4 is hidden only through t=.75, then visible. No other face supplies cuts.
const concave={status:'AUTHORITATIVE',faces:[{id:'concave',polygon:
 [[0,0],[4,0],[4,-2],[-2,-2],[-2,2],[3,2],[3,1],[-1,1],[-1,-1],[0,-1]].map(([u,d])=>[u,d,u])}]};
for(const offset of [1,3,6]){
 const p=concave.faces[0].polygon;
 compare({...concave,faces:[{...concave.faces[0],polygon:[...p.slice(offset),...p.slice(0,offset)]}]},'NORTH');
}
const concaveResult=compare(concave,'NORTH');
const longEdge=concaveResult.segments.filter(s=>s.edgeIndex===0);
assert(longEdge.some(s=>s.visibility==='HIDDEN'&&Math.abs(s.t1-.75)<1e-7));
assert(longEdge.some(s=>s.visibility==='VISIBLE'&&Math.abs(s.t0-.75)<1e-7));
const face=(id,y,x0,x1)=>({id,polygon:[[x0,y,0],[x1,y,0],[x1,y,2],[x0,y,2]]});
const overlap={status:'AUTHORITATIVE',faces:[face('a',2,0,4),face('b',2,1,3)]};
assert.equal(verifyRoofEdgeIntervals(overlap,{kind:'ELEVATION',view:'NORTH'},{resolveCardinalEdgeOn:true}).status,'REVIEW_REQUIRED');
const malformed={status:'AUTHORITATIVE',faces:[{id:'warped',polygon:[[0,0,0],[2,0,0],[2,2,1],[0,2,0]]}]};
assert.equal(verifyRoofEdgeIntervals(malformed,{kind:'ELEVATION',view:'NORTH'},{resolveCardinalEdgeOn:true}).status,'WITHHELD');
assert.equal(verifyRoofEdgeIntervals({status:'WITHHELD',reason:'stale owner',faces:[]},{kind:'ELEVATION',view:'NORTH'},{resolveCardinalEdgeOn:true}).status,'WITHHELD');
const homeB=roofs.find(r=>r.ownerId==='home-b');
assert.equal(verifyRoofEdgeIntervals(homeB,{kind:'ELEVATION',view:'NORTH'}).status,'REVIEW_REQUIRED','Production default remains conservative until consumer and rendered acceptance');
console.log(`PASS reviewed cardinal ray-depth: ${checked} independent 3D ray comparisons; four owners/four views, order invariance, complete source-edge accounting, invalid/stale/tied rejection; legacy default remains conservative; inspector/export explicitly enable reviewed mode`);
