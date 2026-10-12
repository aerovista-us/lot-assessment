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
export type DesignDocument={
 schemaVersion:typeof DESIGN_DOCUMENT_SCHEMA;candidateId:string;projectId:string;
 sourceRevision:string;sourceSignature:string;revision:number;updatedAt:string;shapes:DesignShape[];
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
 sourceSignature:designSourceSignature(c),revision:0,updatedAt:now,shapes:[]};
}
export function sourceBuildingOwners(c:CandidateRecord):PlacementComponent[]{
 return c.components.filter((x):x is PlacementComponent=>x.kind==='home'||x.kind==='garage');
}
export function validateDesignDocument(c:CandidateRecord,d:DesignDocument){
 if(!d||d.schemaVersion!==DESIGN_DOCUMENT_SCHEMA||d.candidateId!==c.id||d.projectId!==c.projectId||
 d.sourceRevision!==c.revisionLabel||d.sourceSignature!==designSourceSignature(c))
 throw Error('Design document stale: exact candidate source changed');
 if(!Number.isInteger(d.revision)||d.revision<0||!Array.isArray(d.shapes)||d.shapes.length>160)throw Error('Invalid design revision');
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
