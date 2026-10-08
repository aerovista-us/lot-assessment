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

// At azimuth zero, projection maps (x,y,z) to (x, y*sin(e)+z*cos(e)).
// Two broad strips with equal projected coverage but opposing depth slopes
// exchange order at x=2 on their lower projected edge.
const elev=Math.PI/6;
const zForScreen=(screenY,y)=>(screenY-y*Math.sin(elev))/Math.cos(elev);
const strip=(id,y0,y1)=>({id,polygon:[
 [0,y0,zForScreen(0,y0)],[4,y1,zForScreen(0,y1)],
 [4,y1,zForScreen(2,y1)],[0,y0,zForScreen(2,y0)]
]});
const crossing={status:'AUTHORITATIVE',faces:[strip('a',1,3),strip('b',3,1)]};
const lines=sampleAxonRoofEdges(crossing,0,elev);
assert.equal(lines.status,'SAMPLED_ONLY');
assert(lines.segments.length>8,'Axon depth exchange should subdivide at least one projected edge');
assert(lines.segments.every(s=>[...s.start,...s.end].every(Number.isFinite)));
console.log('PASS axonometric depth exchange subdivisions');

// Two coplanar overlapping facets share a projected boundary. The overlapping
// portion must be isolated, and never confidently classified front or hidden.
const facet=(id,x0,x1)=>({id,polygon:[[x0,0,0],[x1,0,0],[x1,2,0],[x0,2,0]]});
const coincident={status:'AUTHORITATIVE',faces:[facet('whole',0,4),facet('overlap',1,3)]};
const shared=sampleAxonRoofEdges(coincident,Math.PI/4,Math.PI/6);
assert.equal(shared.status,'SAMPLED_ONLY');
assert(shared.segments.some(s=>s.visibility==='UNRESOLVED'));
assert(shared.segments.some(s=>s.faceId==='whole'&&s.visibility==='UNRESOLVED'));
console.log('PASS coplanar shared projected roof boundaries fail closed');
