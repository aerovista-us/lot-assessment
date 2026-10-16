import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {buildRoofReviewOwners} from '../app/workbench/roof-drawings/roof-review-data';
import RoofInspectorWorkspace from '../app/workbench/roof-drawings/roof-inspector-workspace';
import {pondyCandidateRegistry} from '../projects/pondy-lot2/candidate-registry';
import {validateCandidateRoofs} from '../packages/roof-geometry';
import {roofDrawingHandoff} from '../packages/roof-geometry/drawing-contract';
import {deriveValleySectionCuts} from '../packages/roof-geometry/drawing-valley-sections';

const owners=buildRoofReviewOwners();
assert.equal(owners.length,4);
const homeB=owners.find(x=>x.ownerId==='home-b');
assert(homeB);
assert.equal(homeB.status,'AUTHORITATIVE');
assert.equal(homeB.valleyCuts.length,2,'both real Home B valleys must have sections');
assert.deepEqual(homeB.valleyCuts.map(x=>x.id),['V1','V2']);
const c=pondyCandidateRegistry.candidates.find(x=>x.id==='pondy-d4');
assert(c);
const roof=roofDrawingHandoff(validateCandidateRoofs(c.components).results.find(x=>x.ownerId==='home-b')!);
assert.equal(roof.status,'AUTHORITATIVE');
for(const [i,cut] of homeB.valleyCuts.entries()){
 const expectedValleyId:string=roof.junctions.flatMap(j=>j.segments.filter(s=>s.kind==='VALLEY'))[i]!.id;
 assert.equal(cut.sourceId,expectedValleyId);
 assert.equal(cut.status,'SOURCE_INTERSECTION',cut.id+' must have exact two-surface evidence');
 assert(cut.segments.length>=2);
 assert(Math.abs(cut.valleyMidZFt-22.125)<0.001);
 assert(Math.abs(cut.origin[0]-(cut.sourceA[0]+cut.sourceB[0])/2)<1e-7);
 assert(Math.abs(cut.origin[1]-(cut.sourceA[1]+cut.sourceB[1])/2)<1e-7);
 assert.equal(cut.residualFt,0);
 const min=Math.min(...cut.segments.flatMap(s=>[s.a[0],s.b[0]]));
 const max=Math.max(...cut.segments.flatMap(s=>[s.a[0],s.b[0]]));
 const project=(d:number)=>[cut.origin[0]+cut.direction[0]*d,cut.origin[1]+cut.direction[1]*d];
 assert(Math.hypot(cut.planTrace.a[0]-project(min)[0],cut.planTrace.a[1]-project(min)[1])<1e-6);
 assert(Math.hypot(cut.planTrace.b[0]-project(max)[0],cut.planTrace.b[1]-project(max)[1])<1e-6);
 const crossing=cut.segments.filter(s=>[s.a,s.b].some(p=>Math.abs(p[0])<.025&&Math.abs(p[1]-cut.valleyMidZFt)<.025));
 assert(new Set(crossing.map(s=>s.faceId)).size>=2,cut.id+' must meet in at least two locked source faces');
}
const moved=structuredClone(roof);
if(moved.status==='AUTHORITATIVE'){
 const bad=moved.junctions[0].segments.find(x=>x.kind==='VALLEY')!;
 bad.zAFt+=20;bad.zBFt+=20;
 assert.equal(deriveValleySectionCuts(moved)[0].status,'REVIEW_REQUIRED','source Z mismatch must never look verified');
}
assert.equal(deriveValleySectionCuts({status:'WITHHELD',reason:'stale owner',ownerId:'home-b',roofId:'r',faces:[],junctions:[],fascia:null}).length,0);
assert(owners.filter(x=>x.ownerId!=='home-b').every(x=>x.valleyCuts.length===0));
for(const v of ['NORTH','SOUTH','EAST','WEST'] as const){
 assert.equal(homeB.intervals[v].status,'INTERVAL_VERIFIED');
 assert.equal(homeB.intervals[v].counts.unresolved,0);
 assert.equal(homeB.intervals[v].projectionProof?.collapsedProjection.length,homeB.intervals[v].counts.collapsedEdges);
}
const html=renderToStaticMarkup(React.createElement(RoofInspectorWorkspace,{owners}));
assert.match(html,/data-inspected-owner="home-b"/,'Home B default selected');
assert.match(html,/data-section="V1"/);
assert.match(html,/data-section="V2"/);
assert.match(html,/data-valley-id="V1"/);
assert.match(html,/data-valley-id="V2"/);
assert.match(html,/data-edge-id="E1"/);
assert.match(html,/CONCEPT ONLY/);
assert.match(html,/NOT FOR CONSTRUCTION/);
assert.match(html,/Drawing acceptance remains OPEN/);
assert.match(html,/Roof publication remains disabled/);
assert.match(html,/edges project to points/);
assert.equal((html.match(/class="roof-owner-tab/g)||[]).length,4,'one tab per current roof owner');
assert(!html.includes('href="/api/workbench/auth/handoff-exchange"'),'no auth bypass');
console.log('PASS Home B first; both derived valley section cuts, two-face evidence, source XY/Z, stale/invalid fail-closed, 4 selectable owners, unresolved preserved');
