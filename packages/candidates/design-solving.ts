/** Shared floor/roof solver: owner-bound geometry, no design-number cases.
 * Results are model previews until separate authoritative publication.
 */
import type {CandidateRecord,PlacementComponent,RoofComponent,RoofZone} from '@/packages/candidates';
import {placementPolygon,ownerGeometryKey,validateRoofComponent,roofPlanSegments} from '@/packages/roof-geometry';
import {roofDrawingHandoff} from '@/packages/roof-geometry/drawing-contract';
import {intersectRoofSection} from '@/packages/roof-geometry/drawing-spatial';
import {solveEaveFascia} from '@/packages/roof-geometry/eave-fascia';
import {validateDesignDocument,type DesignDocument,type DesignShape,type DoorOpeningDraft,type P2} from '@/packages/candidates/design-document';
type Segment={a:P2;b:P2;lengthFt:number;roomA:string;roomB:string};
type Issue={level:'FAIL'|'REVIEW';code:string;detail:string;ownerId?:string;shapeId?:string};
const EPS=1e-5;
const cross=(a:P2,b:P2,c:P2)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const dist=(a:P2,b:P2)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const dot=(a:P2,b:P2)=>a[0]*b[0]+a[1]*b[1];
const add=(a:P2,b:P2):P2=>[a[0]+b[0],a[1]+b[1]];
const subtract=(a:P2,b:P2):P2=>[a[0]-b[0],a[1]-b[1]];
const mid=(a:P2,b:P2):P2=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
const rounded=(n:number)=>Number(n.toFixed(5));
function commonSegment(a:P2,b:P2,c:P2,d:P2):[P2,P2]|null{
 const ab=subtract(b,a),len=dist(a,b);if(len<EPS)return null;
 if(Math.abs(cross(a,b,c))>EPS*len||Math.abs(cross(a,b,d))>EPS*len)return null;
 const u:P2=[ab[0]/len,ab[1]/len];
 const ca=dot(subtract(c,a),u),da=dot(subtract(d,a),u);
 const lo=Math.max(0,Math.min(ca,da)),hi=Math.min(len,Math.max(ca,da));
 if(hi-lo<EPS)return null;
 return [[a[0]+u[0]*lo,a[1]+u[1]*lo],[a[0]+u[0]*hi,a[1]+u[1]*hi]];
}
function edges(shape:DesignShape){return shape.polygon.map((a,i)=>[a,shape.polygon[(i+1)%shape.polygon.length]] as const);}
function pointStrict(p:P2,poly:P2[]){
 let inside=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[j],b=poly[i],v=subtract(b,a),w=subtract(p,a);
  if(Math.abs(cross(a,b,p))<=EPS*Math.max(1,dist(a,b))&&dot(w,subtract(p,b))<=EPS)return false;
  if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<a[0]+(p[1]-a[1])*(b[0]-a[0])/(b[1]-a[1]))inside=!inside;
 }
 return inside;
}
function interiorsOverlap(a:DesignShape,b:DesignShape){
 // Full containment or crossing (shared walls have zero area and are valid).
 if(a.polygon.some(p=>pointStrict(p,b.polygon))||b.polygon.some(p=>pointStrict(p,a.polygon)))return true;
 for(const [aa,ab] of edges(a))for(const [ba,bb] of edges(b)){
  const d1=cross(aa,ab,ba),d2=cross(aa,ab,bb),d3=cross(ba,bb,aa),d4=cross(ba,bb,ab);
  if(d1*d2 < -EPS&&d3*d4 < -EPS)return true;
 }
 // Identical polygons require explicit rejection, not an adjacency edge.
 if(a.polygon.length===b.polygon.length&&a.polygon.every(p=>b.polygon.some(q=>dist(p,q)<EPS)))return true;
 return false;
}
export type FloorSolution={
 ownerId:string;story:string;status:'GEOMETRY_CHECKED'|'REVIEW_REQUIRED';
 wallSegments:Segment[];roomIds:string[];doors:{id:string;status:'GEOMETRY_CHECKED'|'REVIEW_REQUIRED';reason:string;center:P2;widthFt:number}[];
 issues:Issue[];
};
export function solveSharedFloors(candidate:CandidateRecord,doc:DesignDocument):FloorSolution[]{
 validateDesignDocument(candidate,doc);
 const roomGroups=new Map<string,DesignShape[]>();
 const people=doc.shapes.filter(s=>['ROOM','CIRCULATION'].includes(s.kind));
 for(const shape of people){const key=shape.ownerId+'|'+shape.story;roomGroups.set(key,[...(roomGroups.get(key)??[]),shape]);}
 const results:FloorSolution[]=[];
 for(const [key,rooms] of roomGroups){
  const split=key.lastIndexOf('|'),ownerId=key.slice(0,split),story=key.slice(split+1),issues:Issue[]=[];
  const wallSegments:Segment[]=[];
  for(let i=0;i<rooms.length;i++)for(let j=i+1;j<rooms.length;j++){
   const a=rooms[i],b=rooms[j];
   if(interiorsOverlap(a,b))issues.push({level:'FAIL',code:'ROOM_OVERLAP',detail:a.label+' and '+b.label+' overlap in plan',ownerId});
   for(const [aa,ab] of edges(a))for(const [ba,bb] of edges(b)){
    const shared=commonSegment(aa,ab,ba,bb);
    if(shared&&!wallSegments.some(s=>s.roomA===a.id&&s.roomB===b.id&&dist(s.a,shared[0])<EPS&&dist(s.b,shared[1])<EPS))
     wallSegments.push({a:shared[0],b:shared[1],lengthFt:rounded(dist(...shared)),roomA:a.id,roomB:b.id});
   }
  }
  const doors=(doc.doors??[]).filter(d=>d.story===story&&rooms.some(r=>r.id===d.fromRoomId)).map(d=>{
   const wall=wallSegments.find(w=>
    (w.roomA===d.fromRoomId&&w.roomB===d.toRoomId)||(w.roomA===d.toRoomId&&w.roomB===d.fromRoomId));
   const projection=wall?dot(subtract(d.center,wall.a),subtract(wall.b,wall.a))/(wall.lengthFt**2):0;
   const projected=wall?add(wall.a,[(wall.b[0]-wall.a[0])*projection,(wall.b[1]-wall.a[1])*projection]):d.center;
   const valid=Boolean(wall&&dist(projected,d.center)<.02&&
    projection*wall.lengthFt>=d.widthFt/2-.005&&(1-projection)*wall.lengthFt>=d.widthFt/2-.005);
   if(!valid)issues.push({level:'FAIL',code:'DOOR_NOT_ON_SHARED_WALL',detail:'Door '+d.id+' requires a shared wall segment and full width clearance',ownerId});
   return {id:d.id,status:valid?'GEOMETRY_CHECKED' as const:'REVIEW_REQUIRED' as const,
    reason:valid?'Door opening fits along modeled shared wall; egress/clearances unverified':'No safe modeled shared-wall placement',center:d.center,widthFt:d.widthFt};
  });
  if(rooms.length<2)issues.push({level:'REVIEW',code:'ROOM_PROGRAM_INCOMPLETE',detail:'At least two authored room/circulation polygons required for an adjacency graph',ownerId});
  if(!wallSegments.length&&rooms.length>1)issues.push({level:'REVIEW',code:'NO_SHARED_WALLS',detail:'Room relationships not connected by any common modeled wall',ownerId});
  if(!doors.length&&wallSegments.length)issues.push({level:'REVIEW',code:'DOORS_NOT_AUTHORED',detail:'Shared walls exist but no door transitions have been authored',ownerId});
  results.push({ownerId,story,status:issues.length?'REVIEW_REQUIRED':'GEOMETRY_CHECKED',wallSegments,roomIds:rooms.map(r=>r.id),doors,issues});
 }
 // Stair stack is a constraint across floors, not an architect/egress approval.
 for(const owner of new Set(doc.shapes.filter(s=>s.kind==='STAIR_ZONE').map(s=>s.ownerId))){
  const stacks=doc.shapes.filter(s=>s.kind==='STAIR_ZONE'&&s.ownerId===owner);
  const g=stacks.filter(s=>s.story==='GROUND'),u=stacks.filter(s=>s.story==='UPPER');
  const matched=g.some(a=>u.some(b=>a.polygon.length===b.polygon.length&&a.polygon.every(p=>b.polygon.some(q=>dist(p,q)<.02))));
  const issues:Issue[]=matched?[]:[{level:'REVIEW',code:'STAIR_STACK_UNPROVEN',detail:'Ground and upper stair reservations do not align; rise/run/headroom and egress unverified',ownerId:owner}];
  results.push({ownerId:owner,story:'STAIR_STACK',status:matched?'GEOMETRY_CHECKED':'REVIEW_REQUIRED',wallSegments:[],roomIds:[],doors:[],issues});
 }
 return results;
}
function centeredGable(polygon:P2[],direction:"LONG_AXIS"|"SHORT_AXIS"="LONG_AXIS"){
 if(polygon.length!==4)return {ok:false as const,reason:'Gable preview requires four vertices defining a rectangle'};
 const v=polygon.map((p,i)=>subtract(polygon[(i+1)%4],p)),len=v.map(x=>Math.hypot(...x));
 if(len.some(x=>x<EPS))return {ok:false as const,reason:'Degenerate roof-zone edges'};
 const angle=v.every((e,i)=>Math.abs(dot(e,v[(i+1)%4]))<=.002*len[i]*len[(i+1)%4]);
 const opposite=Math.abs(len[0]-len[2])<.02&&Math.abs(len[1]-len[3])<.02;
 if(!angle||!opposite)return {ok:false as const,reason:'Nonrectangular zone cannot use centered-gable solver; subdivide into supported zones'};
 const firstLong=direction==="LONG_AXIS"?len[0]>=len[1]:len[0]<len[1];
 const ridgeA=firstLong?mid(polygon[0],polygon[3]):mid(polygon[0],polygon[1]);
 const ridgeB=firstLong?mid(polygon[1],polygon[2]):mid(polygon[3],polygon[2]);
 return {ok:true as const,ridgeA,ridgeB,runFt:(firstLong?len[1]:len[0])/2};
}
export type RoofPreview={
 ownerId:string;status:'MODEL_PREVIEW'|'REVIEW_REQUIRED'|'WITHHELD';issues:Issue[];
 ridges:{zoneId:string;a:P2;b:P2;plateZFt:number;ridgeZFt:number;pitch:number}[];
 junctions:{kind:string;id:string;a:P2;b:P2}[];sections:{status:'GEOMETRY_CHECKED'|'REVIEW_REQUIRED';segments:{a:P2;b:P2;faceId:string}[];cut:{origin:P2;direction:P2}}[];
 overhangs:{shapeId:string;ft:number;status:'DRAFT_UNVERIFIED'}[];
 fascia?:{status:'MODEL_PREVIEW'|'REVIEW_REQUIRED'|'WITHHELD';reason:string;segments:{a:readonly[number,number,number];b:readonly[number,number,number];bottomA:readonly[number,number,number];bottomB:readonly[number,number,number]}[]};
};
export function solveSharedRoofPreviews(candidate:CandidateRecord,doc:DesignDocument):RoofPreview[]{
 validateDesignDocument(candidate,doc);
 const out:RoofPreview[]=[];
 const owners=new Map(candidate.components.filter((c):c is PlacementComponent=>c.kind==='home'||c.kind==='garage').map(c=>[c.id,c]));
 for(const [ownerId,owner] of owners){
  const shapes=doc.shapes.filter(s=>s.ownerId===ownerId&&(s.kind==='GABLE_ZONE'||s.kind==='ROOF_ZONE'));
  if(!shapes.length)continue;
  const issues:Issue[]=[],zones:RoofZone[]=[];
  const overhangs:RoofPreview['overhangs']=[];
  for(const shape of shapes){
   const spec=doc.roofParameters?.find(p=>p.shapeId===shape.id);
   if(!spec){issues.push({level:'REVIEW',code:'MISSING_ROOF_PARAMETERS',detail:'Plate Z and pitch not authored for '+shape.label,ownerId,shapeId:shape.id});continue;}
   if(shape.kind!=='GABLE_ZONE'){issues.push({level:'REVIEW',code:'UNSUPPORTED_ROOF_ZONE_TYPE',detail:'General polygon roof surfaces require explicit supported topology/solver',ownerId,shapeId:shape.id});continue;}
   const ridge=centeredGable(shape.polygon,spec.ridgeDirection??"LONG_AXIS");
   if(!ridge.ok){issues.push({level:'REVIEW',code:'UNSUPPORTED_GABLE_TOPOLOGY',detail:ridge.reason,ownerId,shapeId:shape.id});continue;}
   overhangs.push({shapeId:shape.id,ft:spec.overhangFt,status:'DRAFT_UNVERIFIED'});
   zones.push({id:shape.id,label:shape.label,status:'LOCKED',type:'gable',footprint:shape.polygon,
    plateZFt:spec.plateZFt,ridgeA:ridge.ridgeA,ridgeB:ridge.ridgeB,
    solveBy:'PITCH',pitchRise:spec.pitchRise,pitchRun:spec.pitchRun,ridgeZFt:null,
    source:'universal-design-document:'+doc.candidateId+':revision-'+doc.revision});
  }
  if(issues.length||zones.length!==shapes.length){
   out.push({ownerId,status:'REVIEW_REQUIRED',issues,ridges:[],junctions:[],sections:[],overhangs});continue;
  }
  // Only a temporary in-memory solver input. NEVER attach this preview as an
  // authoritative candidate roof component or reuse a roof authorization lock.
  const temporary:RoofComponent={id:'preview-'+ownerId,kind:'roof',label:'In-memory draft roof preview',
   ownerId,status:'LOCKED',ownerGeometryKey:ownerGeometryKey(owner),
   junctionMode:zones.length>1?'PLANE_ENVELOPE':'TILED',zones};
  const checked=validateRoofComponent(temporary,owner);
  if(!checked.authoritative||!checked.safe||checked.errors.length){
   out.push({ownerId,status:'REVIEW_REQUIRED',
    issues:checked.errors.map(e=>({level:'REVIEW',code:'ROOF_SOLVER_REJECTED',detail:e,ownerId})),
    ridges:[],junctions:[],sections:[],overhangs});continue;
  }
  const handoff=roofDrawingHandoff(checked);
  const roofSections:RoofPreview['sections']=[];
  if(handoff.status==='AUTHORITATIVE'){
   const shell=placementPolygon(owner);
   const xs=shell.map(p=>p[0]),ys=shell.map(p=>p[1]);
   const origin:P2=[(Math.min(...xs)+Math.max(...xs))/2,(Math.min(...ys)+Math.max(...ys))/2];
   for(const direction of [[1,0],[0,1]] as P2[]){
    const result=intersectRoofSection(handoff,origin,direction);
    roofSections.push({status:result.status==='DRAWABLE'&&result.segments.length?'GEOMETRY_CHECKED':'REVIEW_REQUIRED',
     segments:result.status==='DRAWABLE'?result.segments.map(s=>({a:[...s.a] as P2,b:[...s.b] as P2,faceId:s.faceId})):[],cut:{origin,direction}});
   }
  }
  const fasciaSpecs=shapes.map(sh=>doc.roofParameters?.find(p=>p.shapeId===sh.id));
  let fascia:RoofPreview['fascia']={status:'WITHHELD',reason:'Fascia depth and thickness not explicitly supplied',segments:[]};
  if(fasciaSpecs.every(p=>p?.fasciaDepthFt!==undefined&&p?.fasciaThicknessFt!==undefined)){
   const first=fasciaSpecs[0]!;
   if(fasciaSpecs.some(p=>Math.abs((p?.fasciaDepthFt??0)-(first.fasciaDepthFt??0))>.001||
       Math.abs((p?.fasciaThicknessFt??0)-(first.fasciaThicknessFt??0))>.001||
       Math.abs((p?.overhangFt??0)-first.overhangFt)>.001))
    fascia={status:'REVIEW_REQUIRED',reason:'Roof zones disagree on eave/fascia specification',segments:[]};
   else{
    const result=solveEaveFascia(checked.surfaceFaces,{source:'universal-design-document:'+doc.candidateId,
     overhangFt:first.overhangFt,fasciaDepthFt:first.fasciaDepthFt!,fasciaThicknessFt:first.fasciaThicknessFt!});
    fascia={status:result.status==='AUTHORITATIVE'?'MODEL_PREVIEW':'REVIEW_REQUIRED',
      reason:result.status==='AUTHORITATIVE'?'Source-derived zero-overhang fascia preview; not professional approval':result.errors.join('; '),
      segments:result.status==='AUTHORITATIVE'?result.segments:[]};
   }
  }
  out.push({ownerId,status:'MODEL_PREVIEW',fascia,issues:[],ridges:checked.zones.filter(z=>z.authoritative&&z.ridgeA&&z.ridgeB&&z.ridgeZFt!==null&&z.plateZFt!==null&&z.pitchRatio!==null).map(z=>({
   zoneId:z.zoneId,a:z.ridgeA as P2,b:z.ridgeB as P2,plateZFt:z.plateZFt as number,
   ridgeZFt:z.ridgeZFt as number,pitch:z.pitchRatio as number})),
   junctions:checked.junctions.flatMap(j=>j.segments.map(s=>({kind:s.kind,id:s.id,a:[...s.a] as P2,b:[...s.b] as P2}))),
   sections:roofSections,overhangs});
 }
 return out;
}
export function solveUniversalDesign(candidate:CandidateRecord,doc:DesignDocument){
 const floors=solveSharedFloors(candidate,doc),roofs=solveSharedRoofPreviews(candidate,doc);
 return {schemaVersion:'lotscope-universal-model-solve-v1',sourceSignature:doc.sourceSignature,revision:doc.revision,
  floors,roofs,status:doc.shapes.length===0||roofs.some(r=>r.status==='REVIEW_REQUIRED')||floors.some(f=>f.status==='REVIEW_REQUIRED')?'REVIEW_REQUIRED':'MODEL_GEOMETRY_CHECKED',
  boundary:'MODEL ONLY — NOT ARCHITECTURAL / STRUCTURAL / EGRESS / AHJ ACCEPTANCE' as const};
}

/** Explicit straight-flight 3D stair preview from an authored stair reservation.
 * Coordinates are source XY feet, world Z feet. This cannot establish headroom,
 * guard/handrail, landing, egress, structural or AHJ acceptance. */
export function solveStraightStairFlight(input:{
 polygon:P2[];baseZFt:number;floorToFloorFt:number;targetMaxRiserFt:number;
 treadDepthFt:number;startAtVertex?:number
}):{status:'MODEL_PREVIEW'|'REVIEW_REQUIRED';reason:string;risers:number;actualRiserFt:number;
 runFt:number;steps:{index:number;nosing:[number,number,number]}[]}{
 const rejected=(reason:string)=>({status:'REVIEW_REQUIRED' as const,reason,risers:0,actualRiserFt:0,runFt:0,steps:[]});
 const {polygon,baseZFt,floorToFloorFt,targetMaxRiserFt,treadDepthFt}=input;
 if(polygon.length!==4||![baseZFt,floorToFloorFt,targetMaxRiserFt,treadDepthFt].every(Number.isFinite)||
  floorToFloorFt<=0||targetMaxRiserFt<=0||treadDepthFt<=0)
  return rejected('Four-vertex stair zone and explicit finite positive dimensions required');
 const start=input.startAtVertex??0;
 if(!Number.isInteger(start)||start<0||start>3)return rejected('Invalid flight direction vertex');
 const a=polygon[start],b=polygon[(start+1)%4],c=polygon[(start+2)%4],d=polygon[(start+3)%4];
 const along=subtract(b,a),widthEdge=subtract(d,a),length=dist(a,b),width=dist(a,d);
 if(length<EPS||width<EPS||Math.abs(dot(along,widthEdge))>EPS*length*width||
  Math.abs(dist(b,c)-width)>.02||Math.abs(dist(c,d)-length)>.02)
  return rejected('Straight stair requires a rectangular authored reservation');
 const risers=Math.ceil(floorToFloorFt/targetMaxRiserFt);
 if(risers<2||risers>100)return rejected('Requested rise/riser combination unsupported');
 const actualRiserFt=floorToFloorFt/risers;
 const runFt=(risers-1)*treadDepthFt;
 if(runFt>length+EPS)return rejected('Stair flight does not fit the reserved plan run');
 const u:P2=[along[0]/length,along[1]/length],side:P2=[widthEdge[0]/width,widthEdge[1]/width];
 const steps=Array.from({length:risers},(_,i)=>{
  const run=Math.min(i,risers-1)*treadDepthFt;
  return {index:i+1,nosing:[
   rounded(a[0]+u[0]*run+side[0]*width/2),
   rounded(a[1]+u[1]*run+side[1]*width/2),
   rounded(baseZFt+(i+1)*actualRiserFt)
  ] as [number,number,number]};
 });
 return {status:'MODEL_PREVIEW',reason:'Source-aligned straight flight; landings, headroom, handrails and code unverified',
  risers,actualRiserFt:rounded(actualRiserFt),runFt:rounded(runFt),steps};
}

/** Assess an authored floor program without inventing room areas, dimensions or approvals. */
export function evaluateDraftRoomProgram(candidate:CandidateRecord,doc:DesignDocument,requirements:{
 ownerId:string;story:'GROUND'|'UPPER'|'OTHER';rooms:{label:string;minAreaSqFt:number;adjacentTo?:string[]}[]
}){
 validateDesignDocument(candidate,doc);
 const shapes=doc.shapes.filter(s=>s.ownerId===requirements.ownerId&&s.story===requirements.story&&s.kind==='ROOM');
 const floor=solveSharedFloors(candidate,doc).find(x=>x.ownerId===requirements.ownerId&&x.story===requirements.story);
 const issues:{code:string;detail:string}[]=[];
 const measured=requirements.rooms.map(req=>{
  const shape=shapes.find(s=>s.label.toLowerCase()===req.label.toLowerCase());
  const areaSqFt=shape?Math.abs(shape.polygon.reduce((sum,p,i)=>{const q=shape.polygon[(i+1)%shape.polygon.length];return sum+p[0]*q[1]-q[0]*p[1];},0)/2):0;
  if(!shape)issues.push({code:'ROOM_MISSING',detail:req.label});
  else if(!Number.isFinite(req.minAreaSqFt)||req.minAreaSqFt<=0||areaSqFt<req.minAreaSqFt)
   issues.push({code:'ROOM_AREA_UNMET',detail:req.label});
  for(const label of req.adjacentTo??[]){
   const other=shapes.find(s=>s.label.toLowerCase()===label.toLowerCase());
   if(shape&&(!other||!floor?.wallSegments.some(w=>(w.roomA===shape.id&&w.roomB===other.id)||(w.roomB===shape.id&&w.roomA===other.id))))
    issues.push({code:'ADJACENCY_UNMET',detail:req.label+' to '+label});
  }
  return {label:req.label,shapeId:shape?.id??null,areaSqFt:Number(areaSqFt.toFixed(3)),minAreaSqFt:req.minAreaSqFt};
 });
 if(floor?.issues.some(i=>i.level==='FAIL'))issues.push({code:'FLOOR_GEOMETRY_INVALID',detail:'Underlying floor geometry fails validation'});
 return {status:issues.length?'REVIEW_REQUIRED' as const:'PROGRAM_GEOMETRY_CHECKED' as const,
  measured,issues,boundary:'NOT A HABITABILITY, STRUCTURAL OR EGRESS APPROVAL' as const};
}
