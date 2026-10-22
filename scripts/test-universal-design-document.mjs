import assert from 'node:assert/strict';
import {pondyCandidateRegistry as registry} from '../projects/pondy-lot2/candidate-registry.ts';
import {placementPolygon} from '../packages/roof-geometry/index.ts';
import {emptyDesignDocument,addDesignShape,addOwnerFootprintShape,removeDesignShape,updateDesignShapePolygon,snapDesignPoint,partitionDesignShape,packDraftRooms,packLCorridorSeed,rankDraftRoomLayouts,assessDraftRoomConnectivity,assessAuthoredCirculation,assessSupportedStoryProgram,assessGarageServiceConnection,assessVerticalStairAlignment,rankSupportedHomeRoomPrograms,rankWholeHomeCombinations,moveDesignWall,validateDesignDocument,designSourceSignature} from '../packages/candidates/design-document.ts';
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
  // The new passage candidate must carry actual saved draft corridor and door
  // polygons; other concepts remain available for explicit user selection.
  const passageCandidate=alternatives.find(a=>a.document.shapes.some(s=>s.kind==='CIRCULATION'));
  assert(passageCandidate,'Expected generated passage option');
  assert.equal(passageCandidate.document.doors?.length,5);
  const passageAccess=assessAuthoredCirculation(passageCandidate.document,plate.ownerId,plate.story);
  assert.equal(passageAccess.status,'DRAFT_ROUTE_CONNECTED');
  assert(passageAccess.corridorWidths.every(x=>x.verified));

  for(const candidate of alternatives){
   const graph=assessDraftRoomConnectivity(candidate.document,plate.ownerId,plate.story);
   assert.equal(graph.roomCount,5+candidate.document.shapes.filter(x=>x.kind==='CIRCULATION').length);
   assert(graph.edges.every(edge=>edge.sharedWallFt>0));
   assert.equal(graph.connected,graph.components.length===1);
   assert(graph.limitations.some(x=>x.includes('NOT validated')));
  }
  assert.throws(()=>assessDraftRoomConnectivity(alternatives[0].document,plate.ownerId,plate.story,0),/door width/);
  const plainCandidate=alternatives.find(x=>!x.document.shapes.some(y=>y.kind==='CIRCULATION'));
  assert(plainCandidate,'Expected a non-corridor comparison choice');
  const noAuthoredRoute=assessAuthoredCirculation(plainCandidate.document,plate.ownerId,plate.story);
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
  const wideHall={...hall,polygon:[[8,0],[12,0],[12,8],[8,8]]};
  const cornerDoor={...narrow,shapes:[roomA,wideHall],doors:[{...narrow.doors[0],center:[8,.3]}]};
  const cornerEvidence=assessAuthoredCirculation(cornerDoor,plate.ownerId,plate.story);
  assert.equal(cornerEvidence.status,'UNVERIFIED','A 3-ft door must fit fully on the shared wall, not just have its center on it');
  assert.deepEqual(cornerEvidence.rejectedDoors,['test-door']);
  const centeredDoor={...cornerDoor,doors:[{...cornerDoor.doors[0],center:[8,4]}]};
  assert.equal(assessAuthoredCirculation(centeredDoor,plate.ownerId,plate.story).status,'DRAFT_ROUTE_CONNECTED');
  const intrudingRoom={...roomA,polygon:[[0,0],[9,0],[9,8],[0,8]]};
  const obstructed={...centeredDoor,shapes:[intrudingRoom,wideHall]};
  const obstruction=assessAuthoredCirculation(obstructed,plate.ownerId,plate.story);
  assert.equal(obstruction.status,'UNVERIFIED','Room intrusion cannot be accepted as open hallway');
  assert.deepEqual(obstruction.corridorCollisions,['test-hall:test-room-a']);
  const overlappingRoom={...roomA,id:'test-room-b',polygon:[[4,0],[8,0],[8,8],[4,8]]};
  const roomCollision=assessAuthoredCirculation({...centeredDoor,shapes:[roomA,overlappingRoom,wideHall]},plate.ownerId,plate.story);
  assert.equal(roomCollision.status,'UNVERIFIED','Two rooms cannot claim the same interior floor area');
  assert(roomCollision.corridorCollisions.includes('test-room-a:test-room-b'));
  const duplicateHall={...wideHall,id:'duplicate-hall'};
  const hallCollision=assessAuthoredCirculation({...centeredDoor,shapes:[roomA,wideHall,duplicateHall]},plate.ownerId,plate.story);
  assert.equal(hallCollision.status,'UNVERIFIED','Overlapping corridors cannot be double counted');
  assert(hallCollision.corridorCollisions.includes('test-hall:duplicate-hall'));


  const corridorIsland={...hall,id:'test-hall-island',polygon:[[20,0],[24,0],[24,8],[20,8]]};
  const islandDraft={...centeredDoor,shapes:[roomA,wideHall,corridorIsland]};
  const islandResult=assessAuthoredCirculation(islandDraft,plate.ownerId,plate.story);
  assert.equal(islandResult.status,'UNVERIFIED','Disconnected hallway islands must never pass');
  assert.deepEqual(islandResult.disconnectedCorridors,['test-hall-island']);

  const groundStair={...roomA,kind:'STAIR_ZONE',id:'lower-stair',polygon:[[0,0],[6,0],[6,6],[0,6]]};
  const upperStair={...groundStair,story:'UPPER',id:'upper-stair',polygon:[[5,5],[11,5],[11,11],[5,11]]};
  const stairsWithCorner={...doc,shapes:[groundStair,upperStair]};
  assert.equal(assessVerticalStairAlignment(stairsWithCorner,plate.ownerId).status,'NOT_VALIDATED','Overlapping stair corners are not landings');
  const stairsWithLanding={...stairsWithCorner,shapes:[groundStair,{...upperStair,polygon:[[2,2],[8,2],[8,8],[2,8]]}]};
  assert.equal(assessVerticalStairAlignment(stairsWithLanding,plate.ownerId).status,'XY_ALIGNED_UNVERIFIED');


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
  const combined=rankWholeHomeCombinations(c,doc,plate.ownerId,[
   {story:'GROUND',rooms:['Laundry','Kitchen','Living','Primary Bedroom','Primary Bath']},
   {story:'UPPER',rooms:['Bedroom','Office']}
  ],2);
  assert.equal(combined.status,'INCOMPLETE_STORY_PROGRAM');
  assert.deepEqual(combined.missingStories,['UPPER']);
  const groundComparison=rankWholeHomeCombinations(c,doc,plate.ownerId,[
   {story:'GROUND',rooms:['Laundry','Kitchen','Living','Primary Bedroom','Primary Bath']}
  ],2);
  assert.equal(groundComparison.status,'DRAFT_COMPARISON_ONLY');
  assert.equal(groundComparison.combinations.length,2);
  assert.equal(doc.shapes.some(x=>x.kind==='ROOM'),false,'Joint ranking must not auto-save');

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
  const svgTags=[...report.matchAll(/<polygon\\b[^>]*data-design-shape="([^"]+)"[^>]*>/g)];
  assert.equal(svgTags.length,selected.shapes.length,'Report must contain each saved shape once');
  const shapeCoords=new Map(svgTags.map(match=>{
   const points=match[0].match(/\\bpoints="([^"]+)"/);
   assert(points,'Report polygon without points '+match[1]);
   return [match[1],points[1].trim().split(/\\s+/).map(pair=>pair.split(',').map(Number))];
  }));
  assert.equal(shapeCoords.size,selected.shapes.length,'Report must not duplicate shape IDs');
  for(const shape of selected.shapes){
   const actual=shapeCoords.get(shape.id);
   assert(actual,'Report omitted selected shape '+shape.id);
   assert.equal(actual.length,shape.polygon.length,'Report changed polygon vertex count '+shape.id);
   for(let i=0;i<actual.length;i++)for(let axis=0;axis<2;axis++)
    assert(Math.abs(actual[i][axis]-shape.polygon[i][axis])<.001,'Report altered chosen room coordinates '+shape.id);
  }

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
  // Wide L regression: route turns within source, retains the missing corner,
  // and all five rooms have door intervals to a non-overlapping passage.
  const wideL=[corners[0],corners[1],corners[2],blend(corners[3],corners[2],.45),
    blend(blend(corners[0],corners[1],.45),blend(corners[3],corners[2],.45),.75),
    blend(corners[0],corners[3],.75)];
  const edgeW=Math.hypot(corners[1][0]-corners[0][0],corners[1][1]-corners[0][1]);
  const edgeH=Math.hypot(corners[3][0]-corners[0][0],corners[3][1]-corners[0][1]);
  if(edgeW>=30&&edgeH>=24){
   const lDocument=updateDesignShapePolygon(c,doc,plate.id,wideL);
   const route=packLCorridorSeed(c,lDocument,plate.id,['Laundry','Kitchen','Living','Primary Bedroom','Primary Bath']);
   const generated=route.shapes.filter(x=>x.kind==='ROOM'||x.kind==='CIRCULATION');
   assert.equal(generated.length,6,'L layout must include five rooms plus turning hall');
   assert.equal(route.doors?.length,5);
   assert.equal(assessAuthoredCirculation(route,plate.ownerId,plate.story).status,'DRAFT_ROUTE_CONNECTED');
   assert(Math.abs(generated.reduce((total,x)=>total+area(x.polygon),0)-area(wideL))<.01,'No missing or fabricated L floor area');
   assert.equal(validateDesignDocument(c,route).valid,true);
   const savedL=saveWorkspaceDesignDocument(emptyCandidateWorkspace(),c,route);
   const loadedL=currentWorkspaceDesignDocument(JSON.parse(JSON.stringify(savedL)),c);
   assert(loadedL,'The chosen L-shaped plan must reload');
   assert.deepEqual(loadedL.shapes,route.shapes,'L corridor and rooms changed on reload');
   assert.deepEqual(loadedL.doors,route.doors,'L doorway drafts changed on reload');
   const lReport=(await createCandidateConceptHtml(c,loadedL)).html;
   const drawing=[...lReport.matchAll(/<polygon\\b[^>]*data-design-shape="([^"]+)"[^>]*>/g)];
   assert.equal(drawing.length,route.shapes.length,'Report lost L hallway or room polygons');
   for(const shape of route.shapes){
    const element=drawing.find(m=>m[1]===shape.id);
    assert(element,'Report omitted L space '+shape.id);
    const pts=element[0].match(/\\bpoints="([^"]+)"/);
    assert(pts);
    const actual=pts[1].trim().split(/\\s+/).map(v=>v.split(',').map(Number));
    assert.equal(actual.length,shape.polygon.length);
    shape.polygon.forEach((point,i)=>point.forEach((v,j)=>assert(Math.abs(actual[i][j]-v)<.001,
      'Report changed L passage/room geometry '+shape.id)));
   }

  }
  const bent=updateDesignShapePolygon(c,doc,plate.id,lShape);
  const lPacked=packDraftRooms(c,bent,plate.id,['Living','Kitchen'],'X');
  assert.equal(lPacked.shapes.filter(s=>s.kind==='ROOM').length,2);
  assert.equal(validateDesignDocument(c,lPacked).valid,true);
  const lCandidates=rankDraftRoomLayouts(c,bent,plate.id,['Laundry','Kitchen','Living','Primary Bedroom','Primary Bath'],'X');
  assert(lCandidates.length>0,'Concave source plate must yield a truthful valid draft or explicit failure');
  for(const candidate of lCandidates){
   assert.equal(validateDesignDocument(c,candidate.document).valid,true);
   const generated=candidate.document.shapes.filter(x=>x.kind==='ROOM'||x.kind==='CIRCULATION');
   assert(Math.abs(generated.reduce((sum,x)=>sum+area(x.polygon),0)-area(lShape))<.01,
    'Concave room/circulation shapes must conserve source footprint area');
  }

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
