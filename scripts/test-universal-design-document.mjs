import assert from 'node:assert/strict';
import {pondyCandidateRegistry as registry} from '../projects/pondy-lot2/candidate-registry.ts';
import {placementPolygon} from '../packages/roof-geometry/index.ts';
import {emptyDesignDocument,addDesignShape,addOwnerFootprintShape,removeDesignShape,updateDesignShapePolygon,snapDesignPoint,partitionDesignShape,packDraftRooms,rankDraftRoomLayouts,assessDraftRoomConnectivity,assessAuthoredCirculation,assessSupportedStoryProgram,assessGarageServiceConnection,assessVerticalStairAlignment,rankSupportedHomeRoomPrograms,moveDesignWall,validateDesignDocument,designSourceSignature} from '../packages/candidates/design-document.ts';
import {renderDesignDocumentAttachment} from '../packages/candidates/design-report-attachment.ts';
import {createCandidateConceptHtml} from '../packages/candidates/customer-report.ts';
import {emptyCandidateWorkspace,saveWorkspaceDesignDocument,currentWorkspaceDesignDocument,createWorkspaceExportPackage,importWorkspacePackage} from '../packages/candidates/workspace.ts';
const cases=registry.candidates;
assert(cases.length>=2);
let inspected=0;
for(const c of cases){
 const owners=c.components.filter(x=>x.kind==='home'||x.kind==='garage');
 assert(owners.length>=2);
 const base=emptyDesignDocument(c,'2026-10-12T00:00:00Z');
 assert.equal(base.shapes.length,0);
 assert.equal(validateDesignDocument(c,base).valid,true);
 let doc=addOwnerFootprintShape(c,base,{ownerId:owners[0].id,label:'Ground exterior planning plate',kind:'FLOOR_PLATE',story:'GROUND'},'2026-10-12T00:10:00Z');
 doc=addOwnerFootprintShape(c,doc,{ownerId:owners[1].id,label:'Roof zone concept (no ridge or slope)',kind:'GABLE_ZONE',story:null},'2026-10-12T00:20:00Z');
 doc=addOwnerFootprintShape(c,doc,{ownerId:owners[0].id,label:'Upper shell concept',kind:'FLOOR_PLATE',story:'UPPER'},'2026-10-12T00:30:00Z');
 const unchanged=structuredClone(doc);
 const snap=snapDesignPoint([1.24,-0.76],0.5);
 assert.deepEqual(snap,[1,-1]);
 assert.throws(()=>snapDesignPoint([2,3],0),/snap grid/);
 const shifted=updateDesignShapePolygon(c,doc,doc.shapes[0].id,doc.shapes[0].polygon);
 assert.equal(shifted.revision,4);
 assert.deepEqual(doc,unchanged,'Vertex edits must never mutate an older revision');
 assert.equal(validateDesignDocument(c,shifted).valid,true);
 assert.throws(()=>updateDesignShapePolygon(c,doc,doc.shapes[0].id,doc.shapes[0].polygon.map(p=>[p[0]+1000,p[1]+1000])),/outside/);
 assert.throws(()=>updateDesignShapePolygon(c,doc,doc.shapes[0].id,[[0,0],[1,0],[2,0]]),/Invalid design polygon/);
 const plate=doc.shapes[0];
 const cutX=(Math.min(...plate.polygon.map(p=>p[0]))+Math.max(...plate.polygon.map(p=>p[0])))/2;
 // Split tests on a rectangular geometry; complex footprint splits must fail closed.
 const box=plate.polygon.length===4;
 if(box){
  const split=partitionDesignShape(c,doc,plate.id,'X',cutX);
  assert.equal(split.shapes.length,4);
  const packed=packDraftRooms(c,doc,plate.id,['Living','Kitchen'],'X');
  assert.equal(packed.shapes.length,5);
  assert.equal(packed.shapes.filter(s=>s.kind==='ROOM').length,2);
  assert.equal(validateDesignDocument(c,packed).valid,true);
  const practical=packDraftRooms(c,doc,plate.id,['Primary Bath','Laundry','Living','Primary Bedroom','Kitchen'],'X');
  const zones=practical.shapes.filter(s=>s.kind==='ROOM');
  assert.deepEqual(zones.map(z=>z.label),['Laundry','Living','Kitchen','Primary Bedroom','Primary Bath']);
  const area=p=>Math.abs(p.reduce((acc,v,i)=>acc+v[0]*p[(i+1)%p.length][1]-p[(i+1)%p.length][0]*v[1],0)/2);
  assert(area(zones[1].polygon)>area(zones[0].polygon),'Living zone should have more area than laundry');
  assert.equal(Math.round(zones.reduce((n,z)=>n+area(z.polygon),0)*100),Math.round(area(plate.polygon)*100));
  assert(zones.every(z=>z.status==='DRAFT_UNVERIFIED'));
  const alternatives=rankDraftRoomLayouts(c,doc,plate.id,['Laundry','Kitchen','Living','Primary Bedroom','Primary Bath'],'X');
  assert(alternatives.length>=2&&alternatives.length<=3);
  assert(alternatives.every(a=>a.document.shapes.filter(s=>s.kind==='ROOM').length===5));
  for(const candidate of alternatives){
   const graph=assessDraftRoomConnectivity(candidate.document,plate.ownerId,plate.story);
   assert.equal(graph.roomCount,5);
   assert(graph.edges.every(edge=>edge.sharedWallFt>0));
   assert.equal(graph.connected,graph.components.length===1);
   assert(graph.limitations.some(x=>x.includes('NOT validated')));
  }
  assert.throws(()=>assessDraftRoomConnectivity(alternatives[0].document,plate.ownerId,plate.story,0),/door width/);
  const noAuthoredRoute=assessAuthoredCirculation(alternatives[0].document,plate.ownerId,plate.story);
  assert.equal(noAuthoredRoute.status,'UNVERIFIED','Room-to-room adjacency must not become a route PASS');
  assert.equal(noAuthoredRoute.circulationZones,0);
  assert.equal(noAuthoredRoute.unreachableRooms.length,5);
  // A thin authored corridor must never be marked traversable.
  const roomA={id:'test-room-a',ownerId:plate.ownerId,story:plate.story,kind:'ROOM',label:'A',status:'DRAFT_UNVERIFIED',polygon:[[0,0],[8,0],[8,8],[0,8]]};
  const hall={id:'test-hall',ownerId:plate.ownerId,story:plate.story,kind:'CIRCULATION',label:'Hall',status:'DRAFT_UNVERIFIED',polygon:[[8,0],[10,0],[10,8],[8,8]]};
  const narrow={...doc,shapes:[roomA,hall],doors:[{id:'test-door',story:plate.story,fromRoomId:roomA.id,toRoomId:hall.id,center:[8,4],widthFt:3,status:'DRAFT_UNVERIFIED'}]};
  const thinResult=assessAuthoredCirculation(narrow,plate.ownerId,plate.story);
  assert.equal(thinResult.status,'UNVERIFIED');
  assert.equal(thinResult.corridorWidths[0].verified,false);

  assert(noAuthoredRoute.limitations.some(x=>x.includes('NOT proven')));
  const storyInventory=assessSupportedStoryProgram(alternatives[0].document,plate.ownerId,['GROUND','UPPER']);
  assert.equal(storyInventory.stories.length,2);
  assert.equal(storyInventory.stories.find(x=>x.story==='UPPER')?.state,'MISSING_OR_AMBIGUOUS_PLATE');
  assert.equal(storyInventory.verticalConnections,'NOT_VALIDATED');
  assert.equal(storyInventory.stories.find(x=>x.story==='GROUND')?.state,'ACCESS_UNVERIFIED');
  const garageEvidence=assessGarageServiceConnection(c,alternatives[0].document,plate.ownerId,plate.story);
  assert(['ADJACENCY_ONLY','UNVERIFIED'].includes(garageEvidence.status));
  assert(garageEvidence.limitations.some(x=>x.includes('NOT validated')));
  const stairEvidence=assessVerticalStairAlignment(alternatives[0].document,plate.ownerId);
  assert.equal(stairEvidence.status,'NOT_VALIDATED');
  assert.equal(stairEvidence.overlaps.length,0);
  const homeDrafts=rankSupportedHomeRoomPrograms(c,doc,plate.ownerId,[
   {story:'GROUND',rooms:['Laundry','Kitchen','Living','Primary Bedroom','Primary Bath']},
   {story:'UPPER',rooms:['Bedroom','Office']}
  ],2);
  assert.equal(homeDrafts.floors[0].state,'DRAFT_ALTERNATIVES');
  assert.equal(homeDrafts.floors[1].state,'MISSING_OR_AMBIGUOUS_PLATE');
  assert.equal(homeDrafts.vertical.status,'NOT_VALIDATED');
  assert.equal(doc.shapes.filter(x=>x.kind==='ROOM').length,0,'Program ranking must not save a proposal');




  // A 2D candidate must have room separation along BOTH local axes, not
  // merely five differently ordered full-depth stripes.
  const hasTwoDimensionalTopology=alternatives.some(a=>{
   const rooms=a.document.shapes.filter(s=>s.kind==='ROOM');
   const bounds=rooms.map(room=>({minX:Math.min(...room.polygon.map(p=>p[0])),maxX:Math.max(...room.polygon.map(p=>p[0])),minY:Math.min(...room.polygon.map(p=>p[1])),maxY:Math.max(...room.polygon.map(p=>p[1]))}));
   return bounds.some((a,i)=>bounds.some((b,j)=>i!==j&&a.maxX<=b.minX+1e-5&&a.maxY<=b.minY+1e-5));
  });
  assert(hasTwoDimensionalTopology,'Ranking must expose a genuinely two-axis room arrangement');
  assert(alternatives.every(a=>a.assessment.sourceRevision===doc.revision));
  assert(alternatives.every(a=>a.assessment.limitations.some(x=>x.includes('no openings'))));
  assert(alternatives.every((a,i)=>!i||alternatives[i-1].assessment.score>=a.assessment.score));
  assert(alternatives[0].assessment.relationships.some(x=>x.priority==='MUST'));
  // Non-leading selection must round-trip unchanged through workspace persistence
  // and appear in the exact regenerated customer HTML, not just in the editor.
  const selected=alternatives[1].document;
  const persisted=saveWorkspaceDesignDocument(emptyCandidateWorkspace(),c,selected);
  const hydrated=JSON.parse(JSON.stringify(persisted));
  const restored=currentWorkspaceDesignDocument(hydrated,c);
  assert(restored,'Selected layout must survive workspace serialization and reload');
  assert.deepEqual(restored.shapes,selected.shapes,'Reload must preserve the explicitly selected alternative');
  const selectedRooms=selected.shapes.filter(s=>s.kind==='ROOM');
  const report=(await createCandidateConceptHtml(c,restored)).html;
  assert.equal((report.match(/data-design-shape="/g)||[]).length,selected.shapes.length);
  for(const room of selectedRooms){
   assert(report.includes('data-design-shape="'+room.id+'"'),'Regenerated report must contain selected room ID');
   assert(report.includes(room.label),'Regenerated report must contain selected room name');
  }
  assert(report.includes('DRAFT_UNVERIFIED'),'Auto-packed rooms cannot acquire professional authority');
  assert(report.includes('WITHHELD'),'Missing source roof/upper-story authority remains visible');
  assert.throws(()=>rankDraftRoomLayouts(c,doc,plate.id,['Kitchen','Kitchen'],'X'),/unique/);

  // Convex and concave plates remain source-bound and cannot fabricate missing area.
  const corners=plate.polygon;
  const blend=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
  const lShape=[corners[0],corners[1],blend(corners[1],corners[2],.6),
    blend(blend(corners[0],corners[1],.6),blend(corners[3],corners[2],.6),.6),
    blend(corners[0],corners[3],.6),corners[3]];
  const bent=updateDesignShapePolygon(c,doc,plate.id,lShape);
  const lPacked=packDraftRooms(c,bent,plate.id,['Living','Kitchen'],'X');
  assert.equal(lPacked.shapes.filter(s=>s.kind==='ROOM').length,2);
  assert.equal(validateDesignDocument(c,lPacked).valid,true);
  assert.equal(split.revision,doc.revision+1);
  assert.equal(validateDesignDocument(c,split).valid,true);
  assert.throws(()=>partitionDesignShape(c,doc,plate.id,'X',-1e9),/nonzero areas/);
 }
 const zeroWall=moveDesignWall(c,doc,doc.shapes[0].id,0,[0,0]);
 assert.equal(zeroWall.revision,4);
 assert.deepEqual(zeroWall.shapes[0].polygon,doc.shapes[0].polygon);
 assert.throws(()=>moveDesignWall(c,doc,doc.shapes[0].id,999,[1,0]),/wall edge/);
 assert.throws(()=>moveDesignWall(c,doc,doc.shapes[0].id,0,[1000,1000]),/outside/);
 assert.equal(doc.revision,3);
 assert.equal(doc.shapes.length,3);
 assert.equal(validateDesignDocument(c,doc).shapes,3);
 const html=(await createCandidateConceptHtml(c,doc)).html;
 assert(html.includes('id="attached-design"'));
 assert.equal((html.match(/data-design-shape="/g)||[]).length,3);
 assert(html.includes('data-design-story="GROUND"')&&html.includes('data-design-story="ROOF"')&&html.includes('data-design-story="UPPER"'));
 assert(html.includes('data-design-status="DRAFT_UNVERIFIED"'));
 assert(!html.includes('ROOF_APPROVED'));
 assert.equal((html.match(/data-report-feature="/g)||[]).length,22);
 assert(html.includes('CONCEPT ONLY — NOT FOR CONSTRUCTION'));
 assert.equal((await createCandidateConceptHtml(c)).html.includes('data-design-shape='),false);
 let saved=saveWorkspaceDesignDocument(emptyCandidateWorkspace(),c,doc);
 const pkg=createWorkspaceExportPackage(registry,saved,c.id,'2026-10-12T00:40:00Z');
 assert(pkg?.designDocument);
 assert.equal(pkg.designDocument.shapes.length,3);
 const imported=importWorkspacePackage({base:registry,state:emptyCandidateWorkspace(),pkg,mode:'COPY',createdAt:'2026-10-12T01:00:00Z'});
 assert.notEqual(imported.candidate.id,c.id);
 assert.equal(imported.state.designDocuments?.length,1);
 const reattached=imported.state.designDocuments?.[0];
 assert(reattached);
 assert.equal(reattached.shapes.length,3);
 assert.equal(validateDesignDocument(imported.candidate,reattached).valid,true);
 assert.equal((await createCandidateConceptHtml(imported.candidate,reattached)).html.includes('data-design-shape='),true);
 const moved=structuredClone(c);
 const m=moved.components.find(x=>x.id===owners[0].id);
 m.x+=3;
 await assert.rejects(()=>createCandidateConceptHtml(moved,doc),/stale/);
 assert.equal(currentWorkspaceDesignDocument(saved,moved),undefined,'Prior geometry shape draft must not silently follow a moved owner');
 const refreshed=emptyDesignDocument(moved,'2026-10-12T01:45:00Z');
 saved=saveWorkspaceDesignDocument(saved,moved,refreshed,'2026-10-12T01:45:00Z');
 assert.equal(saved.designDocuments?.length,2,'Retain older source design instead of deleting historical draft shapes');
 assert.equal(currentWorkspaceDesignDocument(saved,moved)?.revision,0);
 assert.equal(currentWorkspaceDesignDocument(saved,c)?.shapes.length,3);
 const movedPkg=createWorkspaceExportPackage(registry,saved,c.id,'2026-10-12T02:00:00Z');
 assert.equal(movedPkg?.designDocument?.shapes.length,3,'Export still references exact registered source');

 assert.throws(()=>validateDesignDocument(moved,doc),/stale/);
 const outside=placementPolygon(owners[0]).map(p=>[p[0]+1000,p[1]+1000]);
 assert.throws(()=>addDesignShape(c,doc,{ownerId:owners[0].id,label:'Outside',kind:'ROOM',story:'GROUND',polygon:outside}),/outside/);
 assert.throws(()=>addDesignShape(c,doc,{ownerId:owners[0].id,label:'Invalid roof state',kind:'GABLE_ZONE',story:'GROUND',polygon:placementPolygon(owners[0])}),/Roof cannot/);
 const fake=structuredClone(doc);fake.shapes[0].status='MODEL_VERIFIED';assert.throws(()=>validateDesignDocument(c,fake),/draft shape identity/);
 const cleaned=removeDesignShape(c,doc,doc.shapes[0].id);
 assert.equal(cleaned.shapes.length,2);
 assert.equal(cleaned.revision,4);
 inspected++;
}
console.log('PASS universal design documents for '+inspected+' unrelated candidate layouts, source owner polygons, floor/roof draft attachment, 22-feature report, export-import rebinding, stale geometry and unsupported authority gates');
