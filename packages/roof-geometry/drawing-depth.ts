/** Conservative plan-view 3D depth sampler. Never removes edges or promotes roof authority. */
import type {RoofDrawingHandoff} from '@/packages/roof-geometry/drawing-contract';
import {projectedOverlapArea} from '@/packages/roof-geometry/drawing-visibility';
type P2=readonly[number,number];
type P3=readonly[number,number,number];
function signed(a:readonly number[],b:readonly number[],c:readonly number[]){return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);}
function planeAt(poly:readonly P3[],p:P2):number|null{
 for(let i=1;i<poly.length-1;i++){
  const [a,b,c]=[poly[0],poly[i],poly[i+1]],den=signed(a,b,c);
  if(Math.abs(den)<1e-9)continue;
  const u=signed(p,b,c)/den,v=signed(a,p,c)/den,w=1-u-v;
  if(u>=-1e-7&&v>=-1e-7&&w>=-1e-7)return u*a[2]+v*b[2]+w*c[2];
 }
 return null;
}
function inside(p:P2,poly:readonly P3[]){
 let hit=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i],b=poly[j];
  if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;
 }
 return hit;
}
export function samplePlanRoofDepth(roof:RoofDrawingHandoff){
 if(roof.status!=='AUTHORITATIVE')return {status:'WITHHELD' as const,pairs:[],reason:roof.reason};
 const pairs:{front:string;back:string;sampleZFront:number;sampleZBack:number}[]=[];
 for(let i=0;i<roof.faces.length;i++)for(let j=i+1;j<roof.faces.length;j++){
  const a=roof.faces[i],b=roof.faces[j];
  if(projectedOverlapArea(a.polygon.map(p=>[p[0],p[1]] as P2),b.polygon.map(p=>[p[0],p[1]] as P2))<1e-5)continue;
  const candidates=[...a.polygon,...b.polygon].map(p=>[p[0],p[1]] as P2);
  const sample=candidates.find(p=>inside(p,a.polygon)&&inside(p,b.polygon));
  // Vertices frequently lie on a boundary: sample a centroid as a conservative fallback.
  const cent:[number,number]=[a.polygon.reduce((s,p)=>s+p[0],0)/a.polygon.length,a.polygon.reduce((s,p)=>s+p[1],0)/a.polygon.length];
  const p=sample??(inside(cent,b.polygon)?cent:null);
  if(!p)return {status:'UNRESOLVED' as const,pairs,reason:'Overlapping roof faces have no safe interior sample'};
  const az=planeAt(a.polygon,p),bz=planeAt(b.polygon,p);
  if(az===null||bz===null||Math.abs(az-bz)<0.0001)return {status:'UNRESOLVED' as const,pairs,reason:'Coincident or unsupported roof depth at overlap'};
  pairs.push(az>bz?{front:a.id,back:b.id,sampleZFront:az,sampleZBack:bz}:{front:b.id,back:a.id,sampleZFront:bz,sampleZBack:az});
 }
 return {status:'SAMPLED_ONLY' as const,pairs,reason:'Local plan-view samples; not sufficient for hidden-edge removal'};
}
