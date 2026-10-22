/** Universal, source-bound draft geometry for ALL LotScope candidates. */
import type {CandidateRecord,PlacementComponent} from '@/packages/candidates';
import {placementPolygon} from '@/packages/roof-geometry';
import {signedPolygonArea} from '@/packages/candidates/geometry-integrity';
export const DESIGN_DOCUMENT_SCHEMA='lotscope-design-document-v1' as const;
export type P2=[number,number];
export type DesignShape={
 id:string;ownerId:string;label:string;polygon:P2[];
 kind:'FLOOR_PLATE'|'GARAGE_AREA'|'ROOM'|'CIRCULATION'|'STAIR_ZONE'|'ROOF_ZONE'|'GABLE_ZONE';
 story:'GROUND'|'UPPER'|'OTHER'|null;
 status:'DRAFT_UNVERIFIED';
};
export type DoorOpeningDraft={
 id:string;story:'GROUND'|'UPPER'|'OTHER';fromRoomId:string;toRoomId:string;
 center:P2;widthFt:number;status:'DRAFT_UNVERIFIED';
};
export type RoofDesignParameter={
 shapeId:string;plateZFt:number;pitchRise:number;pitchRun:number;
 ridgeDirection?:"LONG_AXIS"|"SHORT_AXIS";
 fasciaDepthFt?:number;fasciaThicknessFt?:number;
 /** Eave extension explicitly authored; a preview, not locked eave/fascia authority. */
 overhangFt:number;
};
export type DesignDocument={
 schemaVersion:typeof DESIGN_DOCUMENT_SCHEMA;candidateId:string;projectId:string;
 sourceRevision:string;sourceSignature:string;revision:number;updatedAt:string;shapes:DesignShape[];
 doors?:DoorOpeningDraft[];roofParameters?:RoofDesignParameter[];
};
const EPS=1e-7;
const cross=(a:P2,b:P2,c:P2)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function onEdge(p:P2,a:P2,b:P2){return Math.abs(cross(a,b,p))<EPS&&
(p[0]-a[0])*(p[0]-b[0])+(p[1]-a[1])*(p[1]-b[1])<EPS}
function inside(p:P2,poly:P2[]){
 let parity=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[j],b=poly[i];
  if(onEdge(p,a,b))return true;
  if((a[1]>p[1])!==(b[1]>p[1])&&
  p[0]<a[0]+(p[1]-a[1])*(b[0]-a[0])/(b[1]-a[1]))parity=!parity;
 }return parity;
}
function validPolygon(p:P2[],id:string){
 if(!Array.isArray(p)||p.length<3||p.length>64||p.some(q=>!Array.isArray(q)||q.length!==2||q.some(v=>typeof v!=='number'||!Number.isFinite(v)))||
 Math.abs(signedPolygonArea(p))<EPS)throw Error('Invalid design polygon '+id);
 for(let i=0;i<p.length;i++)for(let j=i+2;j<p.length;j++){
  if((j+1)%p.length===i)continue;
  const a=p[i],b=p[(i+1)%p.length],c=p[j],d=p[(j+1)%p.length];
  if(cross(a,b,c)*cross(a,b,d)<-EPS&&cross(c,d,a)*cross(c,d,b)<-EPS)throw Error('Self-crossing design polygon '+id);
 }return p;
}
function contained(inner:P2[],outer:P2[]){
 if(!inner.every(p=>inside(p,outer)))return false;
 // A concave footprint can exclude an edge even when both endpoints are inside.
 for(let i=0;i<inner.length;i++){
  const a=inner[i],b=inner[(i+1)%inner.length];
  const cuts=[0,1];
  for(let j=0;j<outer.length;j++){
   const c=outer[j],d=outer[(j+1)%outer.length];
   const r=[b[0]-a[0],b[1]-a[1]],s=[d[0]-c[0],d[1]-c[1]];
   const det=r[0]*s[1]-r[1]*s[0];if(Math.abs(det)<EPS)continue;
   const delta=[c[0]-a[0],c[1]-a[1]];
   const t=(delta[0]*s[1]-delta[1]*s[0])/det,u=(delta[0]*r[1]-delta[1]*r[0])/det;
   if(t>=0&&t<=1&&u>=0&&u<=1)cuts.push(t);
  }
  cuts.sort((x,y)=>x-y);
  for(let j=0;j<cuts.length-1;j++){
   const mid=(cuts[j]+cuts[j+1])/2;
   if(!inside([a[0]+mid*(b[0]-a[0]),a[1]+mid*(b[1]-a[1])],outer))return false;
  }
 }
 return true;
}
export function designSourceSignature(c:CandidateRecord){
 if(!c?.id||!c.projectId||!c.revisionLabel||!Array.isArray(c.components))throw Error('Missing candidate source');
 return JSON.stringify([c.id,c.projectId,c.revisionLabel,c.components]);
}
export function emptyDesignDocument(c:CandidateRecord,now=new Date().toISOString()):DesignDocument{
 return {schemaVersion:DESIGN_DOCUMENT_SCHEMA,candidateId:c.id,projectId:c.projectId,sourceRevision:c.revisionLabel,
 sourceSignature:designSourceSignature(c),revision:0,updatedAt:now,shapes:[],doors:[],roofParameters:[]};
}
export function sourceBuildingOwners(c:CandidateRecord):PlacementComponent[]{
 return c.components.filter((x):x is PlacementComponent=>x.kind==='home'||x.kind==='garage');
}
export function validateDesignDocument(c:CandidateRecord,d:DesignDocument){
 if(!d||d.schemaVersion!==DESIGN_DOCUMENT_SCHEMA||d.candidateId!==c.id||d.projectId!==c.projectId||
 d.sourceRevision!==c.revisionLabel||d.sourceSignature!==designSourceSignature(c))
 throw Error('Design document stale: exact candidate source changed');
 if(!Number.isInteger(d.revision)||d.revision<0||!Array.isArray(d.shapes)||d.shapes.length>160||
 (d.doors!==undefined&&!Array.isArray(d.doors))||(d.roofParameters!==undefined&&!Array.isArray(d.roofParameters)))throw Error('Invalid design revision');
 const owners=new Map(sourceBuildingOwners(c).map(o=>[o.id,o]));
 const ids=new Set<string>();
 for(const shape of d.shapes){
  if(!shape.id||ids.has(shape.id)||!shape.label?.trim()||shape.status!=='DRAFT_UNVERIFIED')throw Error('Invalid draft shape identity');
  if(!['FLOOR_PLATE','GARAGE_AREA','ROOM','CIRCULATION','STAIR_ZONE','ROOF_ZONE','GABLE_ZONE'].includes(shape.kind))throw Error('Unsupported draft shape type');
  if(shape.story!==null&&!['GROUND','UPPER','OTHER'].includes(shape.story))throw Error('Invalid floor story');
  if((shape.kind==='ROOF_ZONE'||shape.kind==='GABLE_ZONE')!== (shape.story===null))throw Error('Roof cannot inherit floor story or approval');
  ids.add(shape.id);
  const owner=owners.get(shape.ownerId);
  if(!owner)throw Error('Unknown or detached building owner '+shape.ownerId);
  const poly=validPolygon(shape.polygon,shape.id);
  const shell=validPolygon(placementPolygon(owner).map(p=>[p[0],p[1]] as P2),owner.id);
  if(!contained(poly,shell))throw Error('Draft shape outside source owner footprint '+shape.id);
 }
 const doors=d.doors??[];const roofParams=d.roofParameters??[];
 if(doors.length>100||roofParams.length>80)throw Error('Too many design parameters');
 const doorIds=new Set<string>();
 for(const door of doors){
  if(!door.id||doorIds.has(door.id)||door.status!=='DRAFT_UNVERIFIED'||
   !door.fromRoomId||!door.toRoomId||door.fromRoomId===door.toRoomId||
   !Array.isArray(door.center)||door.center.length!==2||
   door.center.some(v=>!Number.isFinite(v))||
   !Number.isFinite(door.widthFt)||door.widthFt<=0)throw Error('Invalid door opening input');
  doorIds.add(door.id);
  const a=d.shapes.find(s=>s.id===door.fromRoomId);
  const b=d.shapes.find(s=>s.id===door.toRoomId);
  if(!a||!b||a.ownerId!==b.ownerId||a.story!==b.story||a.story!==door.story||
   !['ROOM','CIRCULATION'].includes(a.kind)||!['ROOM','CIRCULATION'].includes(b.kind))
   throw Error('Door must join same-story, same-owner rooms/circulation');
 }
 const params=new Set<string>();
 for(const spec of roofParams){
  if(!spec.shapeId||params.has(spec.shapeId))throw Error('Duplicate roof parameter');
  params.add(spec.shapeId);
  const zone=d.shapes.find(s=>s.id===spec.shapeId);
  if(!zone||zone.story!==null||zone.kind!=='GABLE_ZONE'||
   (spec.ridgeDirection!==undefined&&!['LONG_AXIS','SHORT_AXIS'].includes(spec.ridgeDirection))||
   ((spec.fasciaDepthFt===undefined)!==(spec.fasciaThicknessFt===undefined))||
   (spec.fasciaDepthFt!==undefined&&(!Number.isFinite(spec.fasciaDepthFt)||spec.fasciaDepthFt<=0||spec.fasciaDepthFt>3||
    !Number.isFinite(spec.fasciaThicknessFt)|| (spec.fasciaThicknessFt??0)<=0||(spec.fasciaThicknessFt??0)>1))||
   ![spec.plateZFt,spec.pitchRise,spec.pitchRun,spec.overhangFt].every(Number.isFinite)||
   spec.plateZFt<0||spec.pitchRise<=0||spec.pitchRun<=0||spec.overhangFt<0||spec.overhangFt>4)
   throw Error('Roof parameter must target draft gable with finite positive pitch and explicit plate Z');
 }
 return {valid:true,shapes:d.shapes.length,unverified:d.shapes.length};
}
export function addDesignShape(c:CandidateRecord,d:DesignDocument,input:Omit<DesignShape,'id'|'status'>,now=new Date().toISOString()):DesignDocument{
 validateDesignDocument(c,d);
 let seq=1;while(d.shapes.some(s=>s.id==='shape-'+seq))seq++;
 const next:DesignDocument={...d,revision:d.revision+1,updatedAt:now,shapes:[...d.shapes,{...input,id:'shape-'+seq,status:'DRAFT_UNVERIFIED',polygon:input.polygon.map(p=>[...p] as P2)}]};
 validateDesignDocument(c,next);return next;
}
export function addOwnerFootprintShape(c:CandidateRecord,d:DesignDocument,args:{ownerId:string;label:string;kind:DesignShape['kind'];story:'GROUND'|'UPPER'|'OTHER'|null},now=new Date().toISOString()){
 const owner=sourceBuildingOwners(c).find(o=>o.id===args.ownerId);
 if(!owner)throw Error('Unknown shape owner');
 return addDesignShape(c,d,{...args,polygon:placementPolygon(owner).map(p=>[p[0],p[1]] as P2)},now);
}
export function removeDesignShape(c:CandidateRecord,d:DesignDocument,id:string,now=new Date().toISOString()):DesignDocument{
 validateDesignDocument(c,d);
 if(!d.shapes.some(s=>s.id===id))throw Error('Unknown design shape');
 const next={...d,revision:d.revision+1,updatedAt:now,shapes:d.shapes.filter(x=>x.id!==id)};
 validateDesignDocument(c,next);return next;
}

/** Attach a door proposal only between two same-owner, same-level spaces.
 * Geometric center/clear width acceptance is performed by solveSharedFloors. */
export function addDraftDoor(
 c:CandidateRecord,d:DesignDocument,input:Omit<DoorOpeningDraft,'id'|'status'>,now=new Date().toISOString()
):DesignDocument{
 validateDesignDocument(c,d);
 let i=1;while((d.doors??[]).some(x=>x.id==='door-'+i))i++;
 const next:DesignDocument={...d,revision:d.revision+1,updatedAt:now,
  doors:[...(d.doors??[]),{...input,id:'door-'+i,status:'DRAFT_UNVERIFIED',center:[...input.center] as P2}]};
 validateDesignDocument(c,next);return next;
}
/** User supplies pitch/plate/eave explicitly; the roof solver never assumes them. */
export function setDraftRoofParameters(
 c:CandidateRecord,d:DesignDocument,input:RoofDesignParameter,now=new Date().toISOString()
):DesignDocument{
 validateDesignDocument(c,d);
 const without=(d.roofParameters??[]).filter(r=>r.shapeId!==input.shapeId);
 const next:DesignDocument={...d,revision:d.revision+1,updatedAt:now,
  roofParameters:[...without,{...input}]};
 validateDesignDocument(c,next);return next;
}

/** Revisioned polygon edit. Existing door and roof parameters remain draft data;
 * consumers must re-solve and may not reuse prior model-preview authority. */
export function updateDesignShapePolygon(
 c:CandidateRecord,d:DesignDocument,shapeId:string,polygon:P2[],
 now=new Date().toISOString()
):DesignDocument{
 validateDesignDocument(c,d);
 const target=d.shapes.find(s=>s.id===shapeId);
 if(!target)throw Error('Unknown design shape');
 const next:DesignDocument={...d,revision:d.revision+1,updatedAt:now,
  shapes:d.shapes.map(s=>s.id===shapeId?{...s,polygon:polygon.map(p=>[p[0],p[1]] as P2)}:s)};
 validateDesignDocument(c,next);
 return next;
}
/** Deterministic designer grid; never silently alters source owner geometry. */
export function snapDesignPoint(point:P2,gridFt:number):P2{
 if(!Number.isFinite(gridFt)||gridFt<=0||gridFt>10||point.some(n=>!Number.isFinite(n)))
  throw Error('Invalid design snap grid or point');
 return [Math.round(point[0]/gridFt)*gridFt,Math.round(point[1]/gridFt)*gridFt];
}

/** Split an authored floor shape by an axis-aligned partition in model feet.
 * This is geometry only; not an approved structure, door or circulation plan.
 * All doors touching the original room are invalidated rather than retargeted. */
export function partitionDesignShape(
 c:CandidateRecord,d:DesignDocument,shapeId:string,axis:'X'|'Y',coordinateFt:number,
 labels?:[string,string],now=new Date().toISOString()
):DesignDocument{
 validateDesignDocument(c,d);
 const original=d.shapes.find(s=>s.id===shapeId);
 if(!original||!['ROOM','CIRCULATION','FLOOR_PLATE'].includes(original.kind))
  throw Error('Only floor shapes may be partitioned');
 if(!Number.isFinite(coordinateFt)||!['X','Y'].includes(axis))throw Error('Invalid partition line');
 const index=axis==='X'?0:1;
 const clip=(less:boolean):P2[]=>{
  const kept:P2[]=[];
  const poly=original.polygon;
  const inside=(p:P2)=>less?p[index]<=coordinateFt+EPS:p[index]>=coordinateFt-EPS;
  for(let i=0;i<poly.length;i++){
   const a=poly[i],b=poly[(i+1)%poly.length],inA=inside(a),inB=inside(b);
   if(inA)kept.push([...a] as P2);
   if(inA!==inB){
    const t=(coordinateFt-a[index])/(b[index]-a[index]);
    kept.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])] as P2);
   }
  }
  const distinct:P2[]=[];
  for(const p of kept)if(!distinct.length||Math.hypot(p[0]-distinct[distinct.length-1][0],p[1]-distinct[distinct.length-1][1])>EPS)distinct.push(p);
  if(distinct.length>1&&Math.hypot(distinct[0][0]-distinct[distinct.length-1][0],distinct[0][1]-distinct[distinct.length-1][1])<EPS)distinct.pop();
  return distinct;
 };
 const left=clip(true),right=clip(false);
 if(left.length<3||right.length<3||Math.abs(signedPolygonArea(left))<.01||Math.abs(signedPolygonArea(right))<.01)
  throw Error('Partition must divide the interior into two nonzero areas');
 // Single-cut polygons only. Multiple disjoint islands may not be silently stitched.
 validPolygon(left,shapeId);validPolygon(right,shapeId);
 const area=Math.abs(signedPolygonArea(original.polygon));
 if(Math.abs(Math.abs(signedPolygonArea(left))+Math.abs(signedPolygonArea(right))-area)>1e-4)
  throw Error('Partition produced disjoint or inaccurate geometry');
 let seq=1;while(d.shapes.some(s=>s.id==='shape-'+seq))seq++;
 const childId='shape-'+seq;
 const next:DesignDocument={...d,revision:d.revision+1,updatedAt:now,
  shapes:d.shapes.flatMap(s=>s.id===shapeId?[
   {...s,label:labels?.[0]?.trim()||s.label+' A',polygon:left},
   {...s,id:childId,label:labels?.[1]?.trim()||s.label+' B',polygon:right}
  ]:[s]),
  doors:(d.doors??[]).filter(x=>x.fromRoomId!==shapeId&&x.toRoomId!==shapeId)};
 validateDesignDocument(c,next);
 return next;
}

/** A geometry-safe, purpose-aware *draft* seed, not a complete home plan.
 * Local axes follow the floor plate's first edge, so rotation does not change
 * layout. Concave slices are only admitted when clipping preserves exact area,
 * connectivity, containment and practical room depth; otherwise fail visibly.
 * No auto-generated doors, approval, or invented garage connections. */
export function packDraftRooms(
 c:CandidateRecord,d:DesignDocument,plateId:string,labels:string[],axis:'X'|'Y',
 now=new Date().toISOString(),preferredOrder?:string[]
):DesignDocument{
 validateDesignDocument(c,d);
 const plate=d.shapes.find(s=>s.id===plateId);
 if(!plate||plate.kind!=='FLOOR_PLATE'||plate.story===null)throw Error('Choose a floor plate');
 if(!['X','Y'].includes(axis)||labels.length<2||labels.length>8||labels.some(l=>!l.trim()))
  throw Error('Specify 2 to 8 named rooms and a packing direction');
 if(d.shapes.some(s=>s.ownerId===plate.ownerId&&s.story===plate.story&&['ROOM','CIRCULATION','STAIR_ZONE'].includes(s.kind)))
  throw Error('Existing rooms/stairs require designer reconciliation before auto packing');
 const original=plate.polygon;
 const start=original[0],edge=original[1];
 const length=Math.hypot(edge[0]-start[0],edge[1]-start[1]);
 if(length<EPS)throw Error('Floor plate has degenerate first edge');
 const u:P2=[(edge[0]-start[0])/length,(edge[1]-start[1])/length];
 const v:P2=[-u[1],u[0]];
 const local=(p:P2):P2=>{const dx=p[0]-start[0],dy=p[1]-start[1];return [dx*u[0]+dy*u[1],dx*v[0]+dy*v[1]]};
 const world=(p:P2):P2=>[start[0]+p[0]*u[0]+p[1]*v[0],start[1]+p[0]*u[1]+p[1]*v[1]];
 const poly=original.map(local),idx=axis==='X'?0:1;
 const min=Math.min(...poly.map(p=>p[idx])),max=Math.max(...poly.map(p=>p[idx]));
 const extent=max-min;
 if(extent<8)throw Error('Floor plate has insufficient depth for automatic rooms');
 // A balanced social zone needs more space than laundry or a bathroom.
 const classify=(name:string)=>{
  const n=name.toLowerCase();
  if(/living|great room|family room/.test(n))return {kind:'PUBLIC',weight:1.7};
  if(/kitchen|dining/.test(n))return {kind:'PUBLIC',weight:1.25};
  if(/mud|utility|laundry|mechanical|pantry/.test(n))return {kind:'SERVICE',weight:.65};
  if(/primary|master/.test(n)&&/bath/.test(n))return {kind:'ENSUITE',weight:.8};
  if(/primary|master/.test(n))return {kind:'PRIMARY',weight:1.5};
  if(/bath|powder|wc/.test(n))return {kind:'BATH',weight:.7};
  if(/bed|guest|office|study/.test(n))return {kind:'PRIVATE',weight:1.2};
  return {kind:'OTHER',weight:1};
 };
 const spec=labels.map((label,i)=>({label:label.trim(),...classify(label),i}));
 const rank:Record<string,number>={SERVICE:0,PUBLIC:1,OTHER:2,BATH:3,PRIVATE:4,PRIMARY:5,ENSUITE:6};
 // Group service next to daily living, private suite next to its bathroom.
 const ordered=preferredOrder ? preferredOrder.map(label=>{const item=spec.find(x=>x.label===label);if(!item)throw Error('Unknown room in packing order');return item;}) : [...spec].sort((a,b)=>rank[a.kind]-rank[b.kind]||a.i-b.i);
 if(ordered.length!==spec.length||new Set(ordered.map(s=>s.i)).size!==spec.length)throw Error('Packing order must include each room once');
 // Prefer service nearest the source garage center (when one exists).
 const garage=sourceBuildingOwners(c).filter(o=>o.kind==='garage');
 if(garage.length&&!preferredOrder){
  const garageCenters=garage.map(g=>{const q=placementPolygon(g);return local([q.reduce((n,p)=>n+p[0],0)/q.length,q.reduce((n,p)=>n+p[1],0)/q.length])});
  const dist=(edge:number)=>Math.min(...garageCenters.map(g=>Math.abs(g[idx]-edge)));
  if(dist(max)<dist(min))ordered.reverse();
 }
 // Deterministic half-plane clipping in building-local coordinates.
 const clip=(input:P2[],threshold:number,keepUpper:boolean):P2[]=>{
  const out:P2[]=[];
  const allowed=(p:P2)=>keepUpper?p[idx]>=threshold-EPS:p[idx]<=threshold+EPS;
  for(let i=0;i<input.length;i++){
   const a=input[i],b=input[(i+1)%input.length],ia=allowed(a),ib=allowed(b);
   if(ia)out.push(a);
   if(ia!==ib){const t=(threshold-a[idx])/(b[idx]-a[idx]);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}
  }
  const dedup:P2[]=[];
  for(const p of out)if(!dedup.length||Math.hypot(p[0]-dedup[dedup.length-1][0],p[1]-dedup[dedup.length-1][1])>EPS)dedup.push(p);
  if(dedup.length>1&&Math.hypot(dedup[0][0]-dedup[dedup.length-1][0],dedup[0][1]-dedup[dedup.length-1][1])<=EPS)dedup.pop();
  return dedup;
 };
 const total=ordered.reduce((n,s)=>n+s.weight,0);
 let cumulative=0;
 const pieces=ordered.map(s=>{
  const lo=min+extent*cumulative/total;cumulative+=s.weight;
  const hi=min+extent*cumulative/total;
  if(hi-lo<4)throw Error('Insufficient space for a practical '+s.label+' zone (under 4 ft)');
  const piece=clip(clip(poly,lo,true),hi,false).map(world);
  if(piece.length<3)throw Error('Irregular footprint splits '+s.label+' into disconnected regions; manual layout required');
  validPolygon(piece,s.label);
  if(!contained(piece,original))throw Error('Concave footprint makes '+s.label+' disconnected or outside the floor plate');
  if(Math.abs(signedPolygonArea(piece))<16)throw Error('Unusable '+s.label+' draft area');
  return {spec:s,polygon:piece};
 });
 const parentArea=Math.abs(signedPolygonArea(original));
 const childrenArea=pieces.reduce((n,p)=>n+Math.abs(signedPolygonArea(p.polygon)),0);
 if(Math.abs(parentArea-childrenArea)>Math.max(.001,parentArea*1e-6))
  throw Error('Irregular plate packing cannot preserve area; refine the footprint or pack manually');
 let seq=1;const existing=new Set(d.shapes.map(s=>s.id));
 const added=pieces.map(({spec:room,polygon}):DesignShape=>{
  while(existing.has('shape-'+seq))seq++;
  const id='shape-'+seq++;existing.add(id);
  return {id,ownerId:plate.ownerId,kind:'ROOM',story:plate.story,label:room.label,polygon,status:'DRAFT_UNVERIFIED'};
 });
 const next:DesignDocument={...d,revision:d.revision+1,updatedAt:now,shapes:[...d.shapes,...added]};
 validateDesignDocument(c,next);return next;
}

/** Two-row rectangular seed topology. This is a geometric candidate generator, NOT a
 * walkable floor-plan or door/egress solver. Irregular footprints remain on the
 * existing fail-closed clipping path until connected 2D subdivision is proven. */
/** Source-bound two-dimensional grid subdivision. For concave plates the
 * clipping result is accepted ONLY if each cell is a single valid polygon
 * and the union accounts for the exact plate area; no phantom infill. */
function packTwoDimensionalSeed(c:CandidateRecord,d:DesignDocument,plateId:string,order:string[],variant:number):DesignDocument{
 validateDesignDocument(c,d);
 const plate=d.shapes.find(x=>x.id===plateId);
 if(!plate||plate.kind!=='FLOOR_PLATE'||plate.story===null||order.length<3)throw Error('Unsupported 2D room seed');
 if(d.shapes.some(x=>x.ownerId===plate.ownerId&&x.story===plate.story&&['ROOM','CIRCULATION','STAIR_ZONE'].includes(x.kind)))throw Error('Existing authored rooms require reconciliation');
 const p=plate.polygon,origin=p[0],ex:[number,number]=[p[1][0]-p[0][0],p[1][1]-p[0][1]];
 const widthAxis=Math.hypot(...ex);if(widthAxis<EPS)throw Error('Degenerate footprint edge');
 const ux:P2=[ex[0]/widthAxis,ex[1]/widthAxis],uy:P2=[-ux[1],ux[0]];
 const local=(q:P2):P2=>[(q[0]-origin[0])*ux[0]+(q[1]-origin[1])*ux[1],(q[0]-origin[0])*uy[0]+(q[1]-origin[1])*uy[1]];
 const world=(q:P2):P2=>[origin[0]+q[0]*ux[0]+q[1]*uy[0],origin[1]+q[0]*ux[1]+q[1]*uy[1]];
 const poly=p.map(local),xs=poly.map(q=>q[0]),ys=poly.map(q=>q[1]);
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),width=maxX-minX,depth=maxY-minY;
 if(width<12||depth<12)throw Error('2D seed footprint too narrow');
 const clip=(points:P2[],dimension:0|1,cut:number,upper:boolean):P2[]=>{
  const output:P2[]=[];
  for(let i=0;i<points.length;i++){
   const a=points[i],b=points[(i+1)%points.length],ina=upper?a[dimension]>=cut-EPS:a[dimension]<=cut+EPS,inb=upper?b[dimension]>=cut-EPS:b[dimension]<=cut+EPS;
   if(ina)output.push(a);
   if(ina!==inb){const t=(cut-a[dimension])/(b[dimension]-a[dimension]);output.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}
  }
  const clean:P2[]=[];
  for(const q of output)if(!clean.length||Math.hypot(q[0]-clean[clean.length-1][0],q[1]-clean[clean.length-1][1])>1e-6)clean.push(q);
  if(clean.length>1&&Math.hypot(clean[0][0]-clean[clean.length-1][0],clean[0][1]-clean[clean.length-1][1])<1e-6)clean.pop();
  return clean;
 };
 const cut=Math.max(1,Math.min(order.length-1,variant%2===0?Math.ceil(order.length/2):Math.floor(order.length/2)));
 const rows=[order.slice(0,cut),order.slice(cut)],rowCut=minY+depth*(variant%3===0?.48:variant%3===1?.56:.42);
 const weight=(name:string)=>/living|great|family|primary|master/i.test(name)?1.5:/bath|laundry|utility|mud|pantry/i.test(name)?.8:1.1;
 const added:DesignShape[]=[],used=new Set(d.shapes.map(x=>x.id));let seq=1,area=0;
 for(let r=0;r<2;r++){
  const row=rows[r],total=row.reduce((n,label)=>n+weight(label),0);
  const strip=clip(poly,1,rowCut,r===1);
  if(strip.length<3)throw Error('Empty 2D row in source polygon');
  let x0=minX;
  for(let i=0;i<row.length;i++){
   const label=row[i],x1=i===row.length-1?maxX:x0+width*weight(label)/total;
   let cell=clip(strip,0,x0,true);cell=clip(cell,0,x1,false);
   if(cell.length<3)throw Error('Unsupported disconnected room region');
   const polygon=cell.map(world);
   validPolygon(polygon,label);
   const cellArea=Math.abs(signedPolygonArea(polygon));
   const dx=Math.max(...cell.map(q=>q[0]))-Math.min(...cell.map(q=>q[0]));
   const dy=Math.max(...cell.map(q=>q[1]))-Math.min(...cell.map(q=>q[1]));
   if(Math.min(dx,dy)<5||cellArea<40||!contained(polygon,p))throw Error('2D seed invalid room geometry');
   while(used.has('shape-'+seq))seq++;
   const id='shape-'+seq++;used.add(id);
   added.push({id,ownerId:plate.ownerId,story:plate.story,kind:'ROOM',label,polygon,status:'DRAFT_UNVERIFIED'});
   area+=cellArea;x0=x1;
  }
 }
 // Concave slices may form disconnected islands: never silently discard them.
 if(Math.abs(area-Math.abs(signedPolygonArea(p)))>Math.max(.01,Math.abs(signedPolygonArea(p))*.0001))
  throw Error('2D seed cannot account for complete footprint');
 const next:DesignDocument={...d,revision:d.revision+1,updatedAt:d.updatedAt,shapes:[...d.shapes,...added]};
 validateDesignDocument(c,next);
 return next;
}

/** Draft rectangular passage seed, preserving the same explicit choose/save flow.
 * Generated openings and hall are conceptual only, never code-approved. */
function packCorridorSeed(c:CandidateRecord,d:DesignDocument,plateId:string,order:string[]):DesignDocument{
 validateDesignDocument(c,d);
 const plate=d.shapes.find(x=>x.id===plateId);
 if(!plate||plate.kind!=='FLOOR_PLATE'||plate.story===null||plate.polygon.length!==4||order.length<3)throw Error('Corridor seed needs a rectangular plate');
 if(d.shapes.some(x=>x.ownerId===plate.ownerId&&x.story===plate.story&&['ROOM','CIRCULATION','STAIR_ZONE'].includes(x.kind)))throw Error('Authored floor requires reconciliation');
 const p=plate.polygon,edge:P2=[p[1][0]-p[0][0],p[1][1]-p[0][1]],width=Math.hypot(...edge);
 const other:P2=[p[3][0]-p[0][0],p[3][1]-p[0][1]],depth=Math.hypot(...other);
 if(width<22||depth<22||Math.abs(edge[0]*other[0]+edge[1]*other[1])>1e-5*width*depth||
 Math.hypot(p[2][0]-p[1][0]-other[0],p[2][1]-p[1][1]-other[1])>1e-5)throw Error('Corridor seed requires orthogonal rectangle');
 const ux:P2=[edge[0]/width,edge[1]/width],uy:P2=[other[0]/depth,other[1]/depth];
 const point=(x:number,y:number):P2=>[p[0][0]+x*ux[0]+y*uy[0],p[0][1]+x*ux[1]+y*uy[1]];
 const rectangle=(a:number,b:number,c:number,e:number):P2[]=>[point(a,b),point(c,b),point(c,e),point(a,e)];
 const hallWidth=3.5,hallBottom=(depth-hallWidth)/2,hallTop=hallBottom+hallWidth,cut=Math.ceil(order.length/2);
 const rows=[order.slice(0,cut),order.slice(cut)],shapes:DesignShape[]=[],doors:DoorOpeningDraft[]=[];
 const used=new Set(d.shapes.map(x=>x.id));let idN=1,doorN=1;
 const nextId=()=>{while(used.has('shape-'+idN))idN++;const id='shape-'+idN++;used.add(id);return id;};
 const hallId=nextId();shapes.push({id:hallId,ownerId:plate.ownerId,story:plate.story,kind:'CIRCULATION',label:'Central Hall (draft)',polygon:rectangle(0,hallBottom,width,hallTop),status:'DRAFT_UNVERIFIED'});
 for(let row=0;row<2;row++){
  const items=rows[row],weights=items.map(label=>/living|primary|master/i.test(label)?1.5:/bath|utility|laundry/i.test(label)?.8:1),total=weights.reduce((a,b)=>a+b,0);
  let x=0;
  for(let i=0;i<items.length;i++){
   const right=i===items.length-1?width:x+width*weights[i]/total;
   if(right-x<5||((row===0?hallBottom:depth-hallTop)*(right-x))<40)throw Error('Unusable corridor-adjacent room');
   const y0=row===0?0:hallTop,y1=row===0?hallBottom:depth;
   const id=nextId();
   shapes.push({id,ownerId:plate.ownerId,story:plate.story,kind:'ROOM',label:items[i],polygon:rectangle(x,y0,right,y1),status:'DRAFT_UNVERIFIED'});
   const center=point((x+right)/2,row===0?hallBottom:hallTop);
   const doorId='auto-door-'+doorN++;
   if((d.doors??[]).some(z=>z.id===doorId))throw Error('Door identity conflict');
   doors.push({id:doorId,fromRoomId:id,toRoomId:hallId,story:plate.story,center,widthFt:3,status:'DRAFT_UNVERIFIED'});
   x=right;
  }
 }
 const next:DesignDocument={...d,revision:d.revision+1,shapes:[...d.shapes,...shapes],doors:[...(d.doors??[]),...doors]};
 validateDesignDocument(c,next);
 if(assessAuthoredCirculation(next,plate.ownerId,plate.story).status!=='DRAFT_ROUTE_CONNECTED')throw Error('Draft hall access is not connected');
 return next;
}

/** Deterministic ranked concepts; evidence never implies a door or usable circulation. */
export type DraftLayoutAssessment={
 schema:'lotscope-layout-assessment-v1';score:number;sourceRevision:number;
 relationships:{a:string;b:string;priority:'MUST'|'PREFER'|'SEPARATE';satisfied:boolean;reason:string}[];
 explanations:string[];limitations:string[];
};
export type RankedDraftLayout={document:DesignDocument;assessment:DraftLayoutAssessment;order:string[]};
function overlapBoundary(a:P2[],b:P2[]):number{
 let shared=0;
 for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){
  const x=a[i],y=a[(i+1)%a.length],q=b[j],r=b[(j+1)%b.length];
  const dx=y[0]-x[0],dy=y[1]-x[1],len=Math.hypot(dx,dy);
  if(len<EPS||Math.abs(cross(x,y,q))/len>1e-5||Math.abs(cross(x,y,r))/len>1e-5)continue;
  const t=(p:P2)=>((p[0]-x[0])*dx+(p[1]-x[1])*dy)/len;
  shared+=Math.max(0,Math.min(len,Math.max(t(q),t(r)))-Math.max(0,Math.min(t(q),t(r))));
 }return shared;
}
/** Check an entire doorway interval on a shared straight wall, including
 * end clearances, rather than merely touching the wall at its center. */
function hasUsableDoorInterval(a:P2[],b:P2[],center:P2,widthFt:number,endClearanceFt=.5){
 if(!Number.isFinite(widthFt)||widthFt<=0)return false;
 const half=widthFt/2+endClearanceFt;
 for(let i=0;i<a.length;i++){
  const p=a[i],q=a[(i+1)%a.length],dx=q[0]-p[0],dy=q[1]-p[1],len=Math.hypot(dx,dy);
  if(len<widthFt+2*endClearanceFt||Math.abs(cross(p,q,center))/len>1e-5)continue;
  const c=((center[0]-p[0])*dx+(center[1]-p[1])*dy)/len;
  if(c<half-1e-5||c>len-half+1e-5)continue;
  for(let j=0;j<b.length;j++){
   const r=b[j],t=b[(j+1)%b.length];
   if(Math.abs(cross(p,q,r))/len>1e-5||Math.abs(cross(p,q,t))/len>1e-5)continue;
   const lo=Math.min(((r[0]-p[0])*dx+(r[1]-p[1])*dy)/len,((t[0]-p[0])*dx+(t[1]-p[1])*dy)/len);
   const hi=Math.max(((r[0]-p[0])*dx+(r[1]-p[1])*dy)/len,((t[0]-p[0])*dx+(t[1]-p[1])*dy)/len);
   if(c-half>=lo-1e-5&&c+half<=hi+1e-5)return true;
  }
 }
 return false;
}
/** Geometry-only access graph. An edge means a common wall could fit a
 * proposed opening; it does not prove a door, route, exit, or code clearance. */
export function assessDraftRoomConnectivity(d:DesignDocument,ownerId:string,story:'GROUND'|'UPPER'|'OTHER',doorWidthFt=3){
 if(!Number.isFinite(doorWidthFt)||doorWidthFt<=0)throw Error('Invalid proposed door width');
 const rooms=d.shapes.filter(x=>x.ownerId===ownerId&&x.story===story&&['ROOM','CIRCULATION'].includes(x.kind));
 const edges:{from:string;to:string;sharedWallFt:number;doorCapable:boolean}[]=[];
 for(let i=0;i<rooms.length;i++)for(let j=i+1;j<rooms.length;j++){
  const sharedWallFt=overlapBoundary(rooms[i].polygon,rooms[j].polygon);
  if(sharedWallFt>EPS)edges.push({from:rooms[i].id,to:rooms[j].id,sharedWallFt,doorCapable:sharedWallFt>=doorWidthFt+1});
 }
 const neighbors=new Map(rooms.map(x=>[x.id,[] as string[]]));
 for(const e of edges.filter(x=>x.doorCapable)){
  neighbors.get(e.from)?.push(e.to);neighbors.get(e.to)?.push(e.from);
 }
 const visited=new Set<string>(),components:string[][]=[];
 for(const room of rooms){
  if(visited.has(room.id))continue;
  const stack=[room.id],component:string[]=[];visited.add(room.id);
  while(stack.length){const id=stack.pop()!;component.push(id);for(const next of neighbors.get(id)??[])if(!visited.has(next)){visited.add(next);stack.push(next);}}
  components.push(component);
 }
 return {roomCount:rooms.length,edges,components,connected:components.length<=1,
  doorCapableEdges:edges.filter(x=>x.doorCapable).length,
  limitations:['Common wall length only; door placement, circulation widths, accessible paths, exterior access and egress NOT validated']};
}

/** Explicit circulation evidence only. Unlike adjacency, this check uses authored
 * door records and an authored circulation zone. It still cannot certify
 * door swing, unobstructed route width, exterior exits or building code. */
export function assessAuthoredCirculation(d:DesignDocument,ownerId:string,story:'GROUND'|'UPPER'|'OTHER'){
 const rooms=d.shapes.filter(x=>x.ownerId===ownerId&&x.story===story&&x.kind==='ROOM');
 const corridors=d.shapes.filter(x=>x.ownerId===ownerId&&x.story===story&&x.kind==='CIRCULATION');
 const ids=new Set([...rooms,...corridors].map(x=>x.id));
 const links=new Map([...ids].map(id=>[id,[] as string[]]));
 const accepted:{doorId:string;from:string;to:string}[]=[];
 const rejected:string[]=[];
 for(const door of d.doors??[]){
  if(door.story!==story||!ids.has(door.fromRoomId)||!ids.has(door.toRoomId))continue;
  const from=d.shapes.find(x=>x.id===door.fromRoomId)!,to=d.shapes.find(x=>x.id===door.toRoomId)!;
  const intervalFits=hasUsableDoorInterval(from.polygon,to.polygon,door.center,door.widthFt);
  if(!Number.isFinite(door.widthFt)||door.widthFt<3||!intervalFits){
   rejected.push(door.id);continue;
  }
  accepted.push({doorId:door.id,from:from.id,to:to.id});
  links.get(from.id)?.push(to.id);links.get(to.id)?.push(from.id);
 }
 const reached=new Set<string>(),queue=corridors.map(x=>x.id);
 queue.forEach(id=>reached.add(id));
 while(queue.length){
  const id=queue.shift()!;
  for(const next of links.get(id)??[])if(!reached.has(next)){reached.add(next);queue.push(next);}
 }
 const unreachableRooms=rooms.filter(x=>!reached.has(x.id)).map(x=>x.id);
 const hasCorridor=corridors.length>0;
 // Conservative, geometry-backed width test. Unsupported/concave passages
 // remain unverified rather than being approved from a bounding box.
 const clearWidthFt=3;
 const corridorWidths=corridors.map(corridor=>{
  const poly=corridor.polygon;
  if(poly.length!==4)return {id:corridor.id,widthFt:0,verified:false};
  const edgeLengths=poly.map((p,i)=>Math.hypot(p[0]-poly[(i+1)%4][0],p[1]-poly[(i+1)%4][1]));
  const perpendicular=Math.abs((poly[1][0]-poly[0][0])*(poly[3][0]-poly[0][0])+
   (poly[1][1]-poly[0][1])*(poly[3][1]-poly[0][1]))<1e-5*edgeLengths[0]*edgeLengths[3];
  const parallelOpposites=Math.abs(edgeLengths[0]-edgeLengths[2])<1e-5&&
   Math.abs(edgeLengths[1]-edgeLengths[3])<1e-5;
  const widthFt=Math.min(...edgeLengths);
  return {id:corridor.id,widthFt,verified:perpendicular&&parallelOpposites&&widthFt>=clearWidthFt};
 });
 const corridorGeometryVerified=hasCorridor&&corridorWidths.every(x=>x.verified);
 return {status:rooms.length>0&&corridorGeometryVerified&&unreachableRooms.length===0&&rejected.length===0?'DRAFT_ROUTE_CONNECTED' as const:'UNVERIFIED' as const,
  rooms:rooms.length,circulationZones:corridors.length,corridorWidths,acceptedDoors:accepted,rejectedDoors:rejected,unreachableRooms,
  limitations:['Door width and common-wall graph are draft-only; actual route clearance, swings, exterior exit, vertical access and code review are NOT proven']};
}

/** Evidence check for a service-to-garage connection. Proximity alone
 * never establishes a usable passage or garage/fire separation approval. */
export function assessGarageServiceConnection(c:CandidateRecord,d:DesignDocument,ownerId:string,story:'GROUND'|'UPPER'|'OTHER'){
 const services=d.shapes.filter(x=>x.ownerId===ownerId&&x.story===story&&x.kind==='ROOM'&&/laundry|utility|mud|entry|service/i.test(x.label));
 const garages=sourceBuildingOwners(c).filter(x=>x.kind==='garage');
 const adjacent:{roomId:string;garageId:string;commonWallFt:number}[]=[];
 for(const room of services)for(const garage of garages){
  const commonWallFt=overlapBoundary(room.polygon,placementPolygon(garage).map(p=>[p[0],p[1]] as P2));
  if(commonWallFt>EPS)adjacent.push({roomId:room.id,garageId:garage.id,commonWallFt});
 }
 return {status:adjacent.length?'ADJACENCY_ONLY' as const:'UNVERIFIED' as const,adjacent,
  limitations:['Garage ownership, fire separation, actual door location, garage access route and code acceptance are NOT validated']};
}

/** Stair connectivity is only possible when authored ground/upper stair zones
 * occupy overlapping source XY coordinates. This does NOT prove a stair flight,
 * elevation, opening, landing, or headroom. */
export function assessVerticalStairAlignment(d:DesignDocument,ownerId:string){
 const lower=d.shapes.filter(x=>x.ownerId===ownerId&&x.story==='GROUND'&&x.kind==='STAIR_ZONE');
 const upper=d.shapes.filter(x=>x.ownerId===ownerId&&x.story==='UPPER'&&x.kind==='STAIR_ZONE');
 const overlaps:{groundId:string;upperId:string}[]=[];
 for(const a of lower)for(const b of upper){
  // An overlapping corner alone is not a stair landing. Require a square
  // 3 x 3 ft orthogonal clear region within both source-aligned stair zones.
  const bounds=(poly:P2[])=>({left:Math.min(...poly.map(p=>p[0])),right:Math.max(...poly.map(p=>p[0])),
   top:Math.min(...poly.map(p=>p[1])),bottom:Math.max(...poly.map(p=>p[1]))});
  const x=bounds(a.polygon),y=bounds(b.polygon);
  const left=Math.max(x.left,y.left),right=Math.min(x.right,y.right),top=Math.max(x.top,y.top),bottom=Math.min(x.bottom,y.bottom);
  if(right-left>=3&&bottom-top>=3&&
   a.polygon.length===4&&b.polygon.length===4&&
   [[left,top],[right,top],[right,bottom],[left,bottom]].every(q=>inside(q as P2,a.polygon)&&inside(q as P2,b.polygon)))
   overlaps.push({groundId:a.id,upperId:b.id});
 }
 return {status:overlaps.length?'XY_ALIGNED_UNVERIFIED' as const:'NOT_VALIDATED' as const,overlaps,
  limitations:['Stair geometry, floor opening, landing sizes, slope, headroom and structural/code acceptance are NOT verified']};
}

/** Read-only whole-home story inventory. Never derives a story by cloning
 * another floor; every supported level requires a distinct authored plate. */
export function assessSupportedStoryProgram(d:DesignDocument,ownerId:string,requiredStories:('GROUND'|'UPPER'|'OTHER')[]){
 const stories=[...new Set(requiredStories)];
 return {ownerId,stories:stories.map(story=>{
  const plates=d.shapes.filter(x=>x.ownerId===ownerId&&x.story===story&&x.kind==='FLOOR_PLATE');
  const rooms=d.shapes.filter(x=>x.ownerId===ownerId&&x.story===story&&x.kind==='ROOM');
  const stairs=d.shapes.filter(x=>x.ownerId===ownerId&&x.story===story&&x.kind==='STAIR_ZONE');
  const access=assessAuthoredCirculation(d,ownerId,story);
  return {story,plates:plates.length,rooms:rooms.length,stairs:stairs.length,
   state:plates.length!==1?'MISSING_OR_AMBIGUOUS_PLATE' as const:rooms.length===0?'ROOM_PROGRAM_MISSING' as const:access.status==='UNVERIFIED'?'ACCESS_UNVERIFIED' as const:'DRAFT_REVIEW' as const,
   access};
 }),verticalConnections:'NOT_VALIDATED' as const,
  limitations:['No upper floor is invented from ground-floor geometry','Stair openings, landings and interstory route connectivity require explicit source evidence']};
}

export function rankDraftRoomLayouts(c:CandidateRecord,d:DesignDocument,plateId:string,labels:string[],axis:'X'|'Y',limit=3):RankedDraftLayout[]{
 if(!Number.isInteger(limit)||limit<1||limit>5)throw Error('Choose 1–5 concept alternatives');
 if(new Set(labels.map(x=>x.trim().toLowerCase())).size!==labels.length)throw Error('Room labels must be unique for relationships');
 const role=(name:string)=>{const n=name.toLowerCase();return /primary|master/.test(n)&&/bath/.test(n)?'ENSUITE':/primary|master/.test(n)?'PRIMARY':/bath|powder/.test(n)?'BATH':/laundry|mud|utility/.test(n)?'SERVICE':/kitchen/.test(n)?'KITCHEN':/living|family|great room/.test(n)?'LIVING':/dining/.test(n)?'DINING':/bed|guest/.test(n)?'BED':'OTHER'};
 const roles=labels.map(label=>({label,role:role(label)}));
 const rules:{a:string;b:string;priority:'MUST'|'PREFER'|'SEPARATE';reason:string}[]=[];
 const pair=(a:string,b:string,priority:'MUST'|'PREFER'|'SEPARATE',reason:string)=>{
  for(const x of roles.filter(x=>x.role===a))for(const y of roles.filter(y=>y.role===b))if(x.label!==y.label)rules.push({a:x.label,b:y.label,priority,reason});
 };
 pair('PRIMARY','ENSUITE','MUST','Primary suite and ensuite should share a usable boundary; a connecting door still needs verification');
 pair('KITCHEN','LIVING','PREFER','Kitchen and living should support an open social zone');
 pair('KITCHEN','DINING','PREFER','Dining should be convenient to the kitchen');
 pair('SERVICE','KITCHEN','PREFER','Service-to-kitchen proximity supports groceries and household chores');
 pair('PRIMARY','LIVING','SEPARATE','A privacy buffer from the public living zone is useful');
 const seed=labels.map(x=>x.trim());
 const byRole=(r:string)=>roles.filter(x=>x.role===r).map(x=>x.label);
 const prioritized=[...byRole('SERVICE'),...byRole('KITCHEN'),...byRole('LIVING'),...byRole('DINING'),...byRole('OTHER'),...byRole('BED'),...byRole('BATH'),...byRole('PRIMARY'),...byRole('ENSUITE')];
 const orders:string[][]=[prioritized,[...prioritized].reverse(),seed,[...seed].reverse()];
 for(let i=0;i<prioritized.length-1;i++){const o=[...prioritized];[o[i],o[i+1]]=[o[i+1],o[i]];orders.push(o);}
 const seen=new Set<string>();const results:RankedDraftLayout[]=[];
 for(const order of orders){
  const key=order.join('\0');if(seen.has(key))continue;seen.add(key);
  let document:DesignDocument;
  try{document=results.length===0?packCorridorSeed(c,d,plateId,order):results.length%2===0?packTwoDimensionalSeed(c,d,plateId,order,results.length):packDraftRooms(c,d,plateId,labels,axis,d.updatedAt,order);}catch{try{document=packDraftRooms(c,d,plateId,labels,axis,d.updatedAt,order);}catch{continue;}}
  const added=document.shapes.filter(s=>s.kind==='ROOM'&&!d.shapes.some(t=>t.id===s.id));
  const byName=new Map(added.map(x=>[x.label,x]));
  const relationships=rules.map(rule=>{
   const a=byName.get(rule.a),b=byName.get(rule.b);
   const touching=!!a&&!!b&&overlapBoundary(a.polygon,b.polygon)>=2;
   const satisfied=rule.priority==='SEPARATE'?!touching:touching;
   return {...rule,satisfied};
  });
  const connectivity=assessDraftRoomConnectivity(document,added[0]?.ownerId??'',added[0]?.story??'GROUND');
  const relationshipScore=relationships.reduce((n,r)=>n+(r.satisfied?1:0)*(r.priority==='MUST'?35:r.priority==='PREFER'?15:8),0)-relationships.reduce((n,r)=>n+(!r.satisfied&&r.priority==='MUST'?40:0),0);
  const score=relationshipScore+(connectivity.connected?12:-25*(connectivity.components.length-1))+connectivity.doorCapableEdges*2;
  const assessment:DraftLayoutAssessment={schema:'lotscope-layout-assessment-v1',score,sourceRevision:d.revision,
   relationships,explanations:relationships.filter(r=>r.satisfied).map(r=>r.reason),
   limitations:[...connectivity.limitations,...(!connectivity.connected?['Room adjacency graph is disconnected; do not present as walkable']:[]),'No authored doors, guaranteed circulation, garage passage, plumbing or code compliance established','Human architectural review required before reporting a relationship as functional']};
  results.push({document,assessment,order});
 }
 results.sort((a,b)=>b.assessment.score-a.assessment.score||a.order.join('|').localeCompare(b.order.join('|')));
 return results.slice(0,limit);
}

/** Plans every explicitly supported floor without mutating the saved document.
 * No guessed upper stories; a human still selects and saves a chosen proposal. */
export function rankSupportedHomeRoomPrograms(
 c:CandidateRecord,d:DesignDocument,ownerId:string,
 programs:{story:'GROUND'|'UPPER'|'OTHER';rooms:string[]}[],limit=3
){
 validateDesignDocument(c,d);
 if(new Set(programs.map(x=>x.story)).size!==programs.length)throw Error('Duplicate story program');
 return {ownerId,sourceRevision:d.revision,floors:programs.map(program=>{
  const plates=d.shapes.filter(x=>x.ownerId===ownerId&&x.story===program.story&&x.kind==='FLOOR_PLATE');
  if(plates.length!==1)return {story:program.story,state:'MISSING_OR_AMBIGUOUS_PLATE' as const,alternatives:[] as RankedDraftLayout[]};
  if(d.shapes.some(x=>x.ownerId===ownerId&&x.story===program.story&&['ROOM','CIRCULATION','STAIR_ZONE'].includes(x.kind)))
   return {story:program.story,state:'EXISTING_DESIGN_REQUIRES_RECONCILIATION' as const,alternatives:[] as RankedDraftLayout[]};
  const alternatives=rankDraftRoomLayouts(c,d,plates[0].id,program.rooms,'X',limit);
  return {story:program.story,state:alternatives.length?'DRAFT_ALTERNATIVES' as const:'NO_VALID_ALTERNATIVES' as const,alternatives};
 }),vertical:assessVerticalStairAlignment(d,ownerId),
  limitations:['Per-story alternatives are not an approved integrated home','No automatic save or replacement of an existing customer selection','Stair travel, garage access and interstory circulation require authored geometry']};
}

/** Jointly rank draft per-story proposals without claiming complete vertical access.
 * Does not mutate persistence or infer any missing floor. */
export function rankWholeHomeCombinations(
 c:CandidateRecord,d:DesignDocument,ownerId:string,
 programs:{story:'GROUND'|'UPPER'|'OTHER';rooms:string[]}[],limit=3
){
 if(!Number.isInteger(limit)||limit<1||limit>5)throw Error('Choose 1-5 home alternatives');
 const inventory=rankSupportedHomeRoomPrograms(c,d,ownerId,programs,limit);
 const missing=inventory.floors.filter(f=>f.state!=='DRAFT_ALTERNATIVES');
 if(missing.length)return {status:'INCOMPLETE_STORY_PROGRAM' as const,combinations:[],missingStories:missing.map(f=>f.story),
  vertical:inventory.vertical,sourceRevision:d.revision};
 const candidates:{stories:{story:'GROUND'|'UPPER'|'OTHER';index:number;document:DesignDocument}[];score:number;limitations:string[]}[]=[];
 const walk=(i:number,chosen:{story:'GROUND'|'UPPER'|'OTHER';index:number;document:DesignDocument}[],score:number)=>{
  if(i===inventory.floors.length){
   const verticalPenalty=programs.length>1&&inventory.vertical.status==='NOT_VALIDATED'?100:0;
   const wet=chosen.flatMap(x=>x.document.shapes.filter(s=>s.kind==='ROOM'&&s.story===x.story&&
    /bath|kitchen|laundry|utility/i.test(s.label)).map(room=>({
    story:x.story,center:[room.polygon.reduce((sum,p)=>sum+p[0],0)/room.polygon.length,
    room.polygon.reduce((sum,p)=>sum+p[1],0)/room.polygon.length] as P2
   })));
   const ground=wet.filter(x=>x.story==='GROUND'),upper=wet.filter(x=>x.story==='UPPER');
   const wetCorePenalty=ground.length&&upper.length?
    upper.reduce((sum,room)=>sum+Math.min(...ground.map(other=>Math.hypot(
     room.center[0]-other.center[0],room.center[1]-other.center[1]))),0):0;
   candidates.push({stories:chosen,score:score-verticalPenalty-wetCorePenalty,limitations:programs.length>1?
    ['Cross-floor wet-core distance is a draft preference only; plumbing shafts, stairs and structure remain unverified']:['Garage/entry and egress remain unverified']});
   return;
  }
  const floor=inventory.floors[i];
  floor.alternatives.forEach((a,index)=>walk(i+1,[...chosen,{story:floor.story,index,document:a.document}],score+a.assessment.score));
 };
 walk(0,[],0);
 candidates.sort((a,b)=>b.score-a.score||a.stories.map(x=>x.index).join(':').localeCompare(b.stories.map(x=>x.index).join(':')));
 return {status:'DRAFT_COMPARISON_ONLY' as const,combinations:candidates.slice(0,limit),missingStories:[],vertical:inventory.vertical,sourceRevision:d.revision};
}

/** Translate the two endpoints of an authored wall edge; refuse invalid geometry. */
export function moveDesignWall(
 c:CandidateRecord,d:DesignDocument,shapeId:string,edgeIndex:number,delta:P2,
 now=new Date().toISOString()
):DesignDocument{
 validateDesignDocument(c,d);
 const shape=d.shapes.find(s=>s.id===shapeId);
 if(!shape||!Number.isInteger(edgeIndex)||edgeIndex<0||edgeIndex>=shape.polygon.length)
  throw Error('Invalid wall edge selection');
 if(!Array.isArray(delta)||delta.length!==2||!delta.every(Number.isFinite))
  throw Error('Invalid wall movement');
 const adjacent=(edgeIndex+1)%shape.polygon.length;
 const polygon=shape.polygon.map((p,i):P2=>
  i===edgeIndex||i===adjacent?[p[0]+delta[0],p[1]+delta[1]]:[...p] as P2);
 return updateDesignShapePolygon(c,d,shapeId,polygon,now);
}
