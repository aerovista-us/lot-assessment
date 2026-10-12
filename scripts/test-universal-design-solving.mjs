import assert from 'node:assert/strict';
import {pondyCandidateRegistry as registry} from '../projects/pondy-lot2/candidate-registry.ts';
import {placementPolygon} from '../packages/roof-geometry/index.ts';
import {emptyDesignDocument,addDesignShape,addOwnerFootprintShape,validateDesignDocument} from '../packages/candidates/design-document.ts';
import {solveSharedFloors,solveSharedRoofPreviews,solveUniversalDesign} from '../packages/candidates/design-solving.ts';
import {createCandidateConceptHtml} from '../packages/candidates/customer-report.ts';
import {setDraftRoofParameters,addDraftDoor} from '../packages/candidates/design-document.ts';
const C=registry.candidates;assert(C.length>=2);
const point=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
let total=0;
for(const candidate of C){
 const owner=candidate.components.find(x=>x.kind==='home'&&placementPolygon(x).length===4);
 assert(owner,'each fixture needs a supported rectangle');
 const poly=placementPolygon(owner);
 const [a,b,c,d]=poly,ab=point(a,b),dc=point(d,c);
 let doc=emptyDesignDocument(candidate);
 doc=addDesignShape(candidate,doc,{ownerId:owner.id,label:'Living',kind:'ROOM',story:'GROUND',polygon:[a,ab,dc,d]});
 doc=addDesignShape(candidate,doc,{ownerId:owner.id,label:'Kitchen',kind:'ROOM',story:'GROUND',polygon:[ab,b,c,dc]});
 const first=solveSharedFloors(candidate,doc);
 const ground=first.find(x=>x.ownerId===owner.id&&x.story==='GROUND');
 assert(ground);
 assert.equal(ground.wallSegments.length,1);
 assert.equal(ground.issues.filter(x=>x.code==='ROOM_OVERLAP').length,0);
 const overlapping=addDesignShape(candidate,doc,{ownerId:owner.id,label:'Conflicting room',kind:'ROOM',story:'GROUND',polygon:doc.shapes[0].polygon});
 assert(solveSharedFloors(candidate,overlapping).find(x=>x.story==='GROUND').issues.some(x=>x.code==='ROOM_OVERLAP'),'Overlapping rooms must fail geometry closure');

 assert(ground.issues.some(x=>x.code==='DOORS_NOT_AUTHORED'));
 const wall=ground.wallSegments[0],center=point(wall.a,wall.b);
 doc=addDraftDoor(candidate,doc,{fromRoomId:doc.shapes[0].id,toRoomId:doc.shapes[1].id,story:'GROUND',center,widthFt:Math.min(3,wall.lengthFt*.3)});
 assert(validateDesignDocument(candidate,doc).valid);
 const after=solveSharedFloors(candidate,doc).find(x=>x.story==='GROUND');
 assert.equal(after.status,'GEOMETRY_CHECKED');
 assert.equal(after.doors[0].status,'GEOMETRY_CHECKED');
 const invalid=structuredClone(doc);invalid.doors[0].center=[10000,10000];
 const broken=solveSharedFloors(candidate,invalid).find(x=>x.story==='GROUND');
 assert(broken.issues.some(x=>x.code==='DOOR_NOT_ON_SHARED_WALL'));
 doc=addOwnerFootprintShape(candidate,doc,{ownerId:owner.id,label:'Gable preview',kind:'GABLE_ZONE',story:null});
 const roofId=doc.shapes.at(-1).id;
 const missing=solveSharedRoofPreviews(candidate,doc).find(x=>x.ownerId===owner.id);
 assert.equal(missing.status,'REVIEW_REQUIRED');assert(missing.issues.some(x=>x.code==='MISSING_ROOF_PARAMETERS'));
 doc={...doc,revision:doc.revision+1,roofParameters:[{shapeId:roofId,plateZFt:10,pitchRise:4,pitchRun:12,overhangFt:.5}]};
 const roof=solveSharedRoofPreviews(candidate,doc).find(x=>x.ownerId===owner.id);
 assert.equal(roof.status,'MODEL_PREVIEW',JSON.stringify(roof.issues));
 assert.equal(roof.ridges.length,1);
 assert(Math.abs(roof.ridges[0].pitch-1/3)<1e-8);
 assert(roof.ridges[0].ridgeZFt>10);
 assert.equal(roof.overhangs[0].status,'DRAFT_UNVERIFIED');
 const fasciaDoc=structuredClone(doc);
 fasciaDoc.roofParameters[0].overhangFt=0;
 fasciaDoc.roofParameters[0].fasciaDepthFt=.5;
 fasciaDoc.roofParameters[0].fasciaThicknessFt=.08;
 const fasciaModel=solveSharedRoofPreviews(candidate,fasciaDoc).find(x=>x.ownerId===owner.id);
 assert.equal(fasciaModel.status,'MODEL_PREVIEW');
 assert.equal(fasciaModel.fascia?.status,'MODEL_PREVIEW');
 assert(fasciaModel.fascia.segments.length>=2);
 const fasciaReport=(await createCandidateConceptHtml(candidate,fasciaDoc)).html;
 assert(fasciaReport.includes('data-preview-fascia='));
 const extended=structuredClone(fasciaDoc);
 extended.roofParameters[0].overhangFt=1;
 const withheldExtension=solveSharedRoofPreviews(candidate,extended).find(x=>x.ownerId===owner.id);
 assert.equal(withheldExtension.fascia?.status,'REVIEW_REQUIRED','Nonzero eave extension requires its own source solver');
 assert.equal(withheldExtension.fascia?.segments.length,0);

 assert.equal(roof.sections.length,2);
 assert(roof.sections.every(s=>s.segments.every(seg=>[...seg.a,...seg.b].every(Number.isFinite))));
 assert(solveUniversalDesign(candidate,doc).boundary.includes('NOT ARCHITECTURAL'));
 const report=(await createCandidateConceptHtml(candidate,doc)).html;
 assert(report.includes('data-roof-preview-status="MODEL_PREVIEW"'));
 assert.equal((report.match(/data-preview-ridge=/g)||[]).length,1);
 assert((report.match(/data-preview-section-face=/g)||[]).length>=2);
 assert.equal((report.match(/data-report-feature=/g)||[]).length,22);
 const stairZone=[a,ab,dc,d];
 let stairs=addDesignShape(candidate,doc,{ownerId:owner.id,label:'Ground stair',kind:'STAIR_ZONE',story:'GROUND',polygon:stairZone});
 assert.equal(solveSharedFloors(candidate,stairs).find(x=>x.story==='STAIR_STACK').status,'REVIEW_REQUIRED');
 stairs=addDesignShape(candidate,stairs,{ownerId:owner.id,label:'Upper stair',kind:'STAIR_ZONE',story:'UPPER',polygon:stairZone});
 assert.equal(solveSharedFloors(candidate,stairs).find(x=>x.story==='STAIR_STACK').status,'GEOMETRY_CHECKED');

 // Irregular polygon must not be run through rectangular gable solver.
 const irregular=structuredClone(doc);
 irregular.shapes.find(x=>x.id===roofId).polygon[1][1]+=.9;
 const unsupported=solveSharedRoofPreviews(candidate,irregular).find(x=>x.ownerId===owner.id);
 assert.equal(unsupported.status,'REVIEW_REQUIRED');
 assert(unsupported.issues.some(x=>x.code==='UNSUPPORTED_GABLE_TOPOLOGY'));
 // Roof claims are never injected into the authoritative candidate component list.
 assert.equal(candidate.components.filter(x=>x.id==='preview-'+owner.id).length,0);
 // A moved owner invalidates ALL existing draft parameter records.
 const moved=structuredClone(candidate);moved.components.find(x=>x.id===owner.id).x+=2;
 assert.throws(()=>solveUniversalDesign(moved,doc),/stale/);
 total++;
}
console.log('PASS universal floor wall/adjacency/door geometries, stair-review contract, typed gable pitch-ridge/section previews and fail-closed arbitrary polygons for '+total+' candidate geometries');

const multi=registry.candidates.find(x=>x.id==='pondy-d4');
if(multi){
 const actual=multi.components.find(x=>x.kind==='roof'&&x.ownerId==='home-b');
 assert(actual?.zones?.length===2);
 let design=emptyDesignDocument(multi);
 for(const [i,z] of actual.zones.entries()){
  design=addDesignShape(multi,design,{ownerId:actual.ownerId,label:'Generic zone '+i,kind:'GABLE_ZONE',story:null,polygon:z.footprint});
  design=setDraftRoofParameters(multi,design,{shapeId:design.shapes.at(-1).id,plateZFt:z.plateZFt,pitchRise:z.pitchRise,pitchRun:z.pitchRun,overhangFt:.4,ridgeDirection:i===0?'LONG_AXIS':'SHORT_AXIS'});
 }
 const good=solveSharedRoofPreviews(multi,design).find(x=>x.ownerId==='home-b');
 assert.equal(good.status,'MODEL_PREVIEW',JSON.stringify(good.issues));
 assert.equal(good.ridges.length,2);
 assert.equal(good.junctions.filter(x=>x.kind==='VALLEY').length,2);
 const report=(await createCandidateConceptHtml(multi,design)).html;
 assert.equal((report.match(/data-preview-valley=/g)||[]).length,2);
 const incorrect=structuredClone(design);
 incorrect.roofParameters[1].ridgeDirection='LONG_AXIS';
 const review=solveSharedRoofPreviews(multi,incorrect).find(x=>x.ownerId==='home-b');
 assert.equal(review.status,'REVIEW_REQUIRED');
 assert.equal(review.junctions.length,0);
 console.log('PASS shared cross-gable solver: explicit ridge direction yields 2 valleys; wrong direction fails closed');
}
