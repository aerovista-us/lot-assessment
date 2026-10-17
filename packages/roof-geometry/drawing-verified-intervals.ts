/**
 * Edge-interval verifier for validated *planar*, locked roof faces.
 *
 * Exact boundary cuts plus analytic affine depth-order roots replace sample
 * voting. An unresolved interval is never silently promoted to visible.
 * This verifies screen-space line classification against the solved model;
 * it is NOT architect-certified hidden linework, structural design or AHJ review.
 */
import type {RoofDrawingHandoff} from '@/packages/roof-geometry/drawing-contract';
import {validProjectedFaces} from '@/packages/roof-geometry/drawing-input-guard';

type P2=readonly [number,number];
type P3=readonly [number,number,number];
type Cardinal='NORTH'|'SOUTH'|'EAST'|'WEST';
export type RoofViewSpec={kind:'ELEVATION';view:Cardinal}|{kind:'AXON';azimuth:number;elevation:number}|{kind:'CUSTOM';screenX:readonly [number,number,number];screenY:readonly [number,number,number];depth:readonly [number,number,number]};
export type EdgeInterval={
 faceId:string;edgeIndex:number;t0:number;t1:number;start:P2;end:P2;
 visibility:'VISIBLE'|'HIDDEN'|'UNRESOLVED'|'INTERNAL_SEAM'|'DUPLICATE_SHARED';
 reason?:string;
};
const TOL=1e-7, DEPTH_TOL=1e-5;
const cross=(a:P2,b:P2)=>a[0]*b[1]-a[1]*b[0];
const sub=(a:P2,b:P2):P2=>[a[0]-b[0],a[1]-b[1]];
const lerp=(a:P3,b:P3,t:number):P3=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const near3=(a:P3,b:P3)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2])<TOL;
const interval=(a:number,b:number):[number,number]=>[Math.max(0,Math.min(a,b)),Math.min(1,Math.max(a,b))];
function frame(p:P3,view:RoofViewSpec):P3{
 const [x,y,z]=p;
 if(view.kind==='ELEVATION'){
  switch(view.view){
   case 'NORTH':return [x,z,y];
   case 'SOUTH':return [-x,z,-y];
   case 'EAST':return [-y,z,x];
   case 'WEST':return [y,z,-x];
  }
 }
 if(view.kind==='CUSTOM')return [view.screenX[0]*x+view.screenX[1]*y+view.screenX[2]*z,view.screenY[0]*x+view.screenY[1]*y+view.screenY[2]*z,view.depth[0]*x+view.depth[1]*y+view.depth[2]*z];
 const ca=Math.cos(view.azimuth),sa=Math.sin(view.azimuth),ce=Math.cos(view.elevation),se=Math.sin(view.elevation);
 return [x*ca+y*sa,-x*sa*se+y*ca*se+z*ce,x*sa*ce-y*ca*ce+z*se];
}
function boundaryCuts(a:P3,b:P3,c:P3,d:P3):number[]{
 const r:P2=[b[0]-a[0],b[1]-a[1]],s:P2=[d[0]-c[0],d[1]-c[1]];
 const diff:P2=[c[0]-a[0],c[1]-a[1]],det=cross(r,s);
 if(Math.abs(det)>TOL){
  const t=cross(diff,s)/det,u=cross(diff,r)/det;
  return t>TOL&&t<1-TOL&&u>=-TOL&&u<=1+TOL?[t]:[];
 }
 // Collinear screen edges must be partitioned at both overlap endpoints.
 const rr=r[0]*r[0]+r[1]*r[1];
 if(rr<TOL*TOL||Math.abs(cross(diff,r))>TOL*Math.sqrt(rr))return [];
 const t=(p:P3)=>((p[0]-a[0])*r[0]+(p[1]-a[1])*r[1])/rr;
 const [lo,hi]=interval(t(c),t(d));
 return hi-lo>TOL?[lo,hi]:[];
}
function onSegment(p:P2,a:P2,b:P2):boolean{
 const r=sub(b,a),q=sub(p,a),len=Math.hypot(...r);
 return len>TOL&&Math.abs(cross(r,q))<=TOL*len&&q[0]*r[0]+q[1]*r[1]>=-TOL&&q[0]*r[0]+q[1]*r[1]<=len*len+TOL;
}
function position(poly:readonly P3[],p:P2):'OUTSIDE'|'BOUNDARY'|'INSIDE'{
 let inside=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i],b=poly[j];
  if(onSegment(p,[a[0],a[1]],[b[0],b[1]]))return 'BOUNDARY';
  if((a[1]>p[1])!==(b[1]>p[1])){
   const x=a[0]+(p[1]-a[1])*(b[0]-a[0])/(b[1]-a[1]);
   if(x>p[0])inside=!inside;
  }
 }
 return inside?'INSIDE':'OUTSIDE';
}
/** For a planar, non-edge-on projected polygon, screen (u,v) -> depth is affine. */
function depthPlane(poly:readonly P3[]){
 const a=poly[0];
 for(let i=1;i<poly.length-1;i++){
  const b=poly[i],c=poly[i+1];
  const det=cross([b[0]-a[0],b[1]-a[1]],[c[0]-a[0],c[1]-a[1]]);
  if(Math.abs(det)<=TOL)continue;
  const bx=b[2]-a[2],cx=c[2]-a[2];
  const dx=(bx*(c[1]-a[1])-cx*(b[1]-a[1]))/det;
  const dy=((b[0]-a[0])*cx-(c[0]-a[0])*bx)/det;
  return (p:P2)=>a[2]+dx*(p[0]-a[0])+dy*(p[1]-a[1]);
 }
 return null;
}
function containsWorldPoint(p:P3,c:P3,d:P3):boolean{
 const v:P3=[d[0]-c[0],d[1]-c[1],d[2]-c[2]];
 const dd=v[0]**2+v[1]**2+v[2]**2;
 if(dd<TOL*TOL)return false;
 const t=((p[0]-c[0])*v[0]+(p[1]-c[1])*v[1]+(p[2]-c[2])*v[2])/dd;
 return t>=-TOL&&t<=1+TOL&&near3(p,[c[0]+t*v[0],c[1]+t*v[1],c[2]+t*v[2]]);
}
function sharedWorldInterval(a:P3,b:P3,other:readonly P3[]):boolean{
 return other.some((c,k)=>{
  const d=other[(k+1)%other.length];
  return containsWorldPoint(a,c,d)&&containsWorldPoint(b,c,d);
 });
}
function oppositeSides(a:P3,b:P3,ours:readonly P3[],other:readonly P3[]):boolean{
 const dir:P2=[b[0]-a[0],b[1]-a[1]];
 const sign=(poly:readonly P3[])=>{
  for(const p of poly){
   const z=cross(dir,[p[0]-a[0],p[1]-a[1]]);
   if(Math.abs(z)>TOL)return Math.sign(z);
  }
  return 0;
 };
 return sign(ours)*sign(other)<0;
}
function coplanar(first:readonly P3[],second:readonly P3[]):boolean{
 const f=depthPlane(first),s=depthPlane(second);
 if(!f||!s)return false;
 return first.every(p=>Math.abs(s([p[0],p[1]])-p[2])<=DEPTH_TOL)&&
 second.every(p=>Math.abs(f([p[0],p[1]])-p[2])<=DEPTH_TOL);
}
/** Opt-in cardinal solver: a rank-one projected face still has an
 * analytic front-depth envelope along its projected support. The production
 * verifier stays conservative unless this mode is explicitly requested. */
function edgeOnSupport(poly:readonly P3[]){
 let a=poly[0],b=poly[0],length=0;
 for(const p of poly)for(const q of poly){const n=Math.hypot(q[0]-p[0],q[1]-p[1]);if(n>length){a=p;b=q;length=n;}}
 if(length<=TOL)return null;
 const r:P2=[b[0]-a[0],b[1]-a[1]];
 if(poly.some(p=>Math.abs(cross(r,[p[0]-a[0],p[1]-a[1]]))/length>TOL))return null;
 return (point:P2)=>{
  const functions:Array<(p:P2)=>number>=[];
  for(let i=0;i<poly.length;i++){
   const c=poly[i],d=poly[(i+1)%poly.length];
   if(!onSegment(point,[c[0],c[1]],[d[0],d[1]]))continue;
   const dx=d[0]-c[0],dy=d[1]-c[1],dd=dx*dx+dy*dy;
   if(dd<=TOL*TOL)continue;
   functions.push(p=>c[2]+((p[0]-c[0])*dx+(p[1]-c[1])*dy)/dd*(d[2]-c[2]));
  }
  return functions;
 };
}
const cross3=(a:P3,b:P3):P3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sub3=(a:P3,b:P3):P3=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const dot3=(a:P3,b:P3)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
function worldInternalSeam(a:P3,b:P3,ours:readonly P3[],other:readonly P3[]){
 let normal:P3|null=null;
 for(let i=1;i<ours.length-1;i++){
  const n=cross3(sub3(ours[i],ours[0]),sub3(ours[i+1],ours[0])),length=Math.hypot(...n);
  if(length>TOL){normal=[n[0]/length,n[1]/length,n[2]/length];break;}
 }
 if(!normal||other.some(p=>Math.abs(dot3(normal!,sub3(p,ours[0])))>TOL))return false;
 const axis=sub3(b,a);
 const side=(poly:readonly P3[])=>{
  const values=poly.map(p=>dot3(normal!,cross3(axis,sub3(p,a))));
  const positive=values.some(v=>v>TOL),negative=values.some(v=>v< -TOL);
  return positive&&!negative?1:negative&&!positive?-1:0;
 };
 return side(ours)*side(other)<0;
}
export function verifyRoofEdgeIntervals(roof:RoofDrawingHandoff,view:RoofViewSpec,options?:{resolveCardinalEdgeOn?:boolean}){
 const resolveEdgeOn=options?.resolveCardinalEdgeOn===true&&view.kind==='ELEVATION';
 const withheld=(reason:string)=>({status:'WITHHELD' as const,segments:[] as EdgeInterval[],reason,counts:{visible:0,hidden:0,unresolved:0,internalSeams:0,duplicateShared:0,collapsedEdges:0,edgeOnFaces:0}});
 if(roof.status!=='AUTHORITATIVE')return withheld(roof.reason);
 if(!validProjectedFaces(roof))return withheld('Invalid or unbound roof face geometry');
 if(view.kind==='ELEVATION'&&!(['NORTH','SOUTH','EAST','WEST'] as string[]).includes(view.view))return withheld('Invalid cardinal direction');
 if(view.kind==='AXON'&&(!Number.isFinite(view.azimuth)||!Number.isFinite(view.elevation)||view.elevation<=0||view.elevation>=Math.PI/2))return withheld('Invalid camera geometry');
 if(view.kind==='CUSTOM'){
  const rows=[view.screenX,view.screenY,view.depth];
  if(rows.some(r=>!Array.isArray(r)||r.length!==3||r.some(x=>!Number.isFinite(x))))return withheld('Invalid custom projection matrix');
  const [u,v,w]=rows;
  const determinant=u[0]*(v[1]*w[2]-v[2]*w[1])-u[1]*(v[0]*w[2]-v[2]*w[0])+u[2]*(v[0]*w[1]-v[1]*w[0]);
  if(Math.abs(determinant)<1e-7)return withheld('Degenerate custom projection matrix');
 }
 const faces=roof.faces.map(face=>({id:face.id,world:face.polygon as readonly P3[],points:face.polygon.map(p=>frame(p as P3,view))}));
 const planes=new Map(faces.map(face=>[face.id,depthPlane(face.points)]));
 const supports=new Map(faces.map(face=>[face.id,resolveEdgeOn&&!planes.get(face.id)?edgeOnSupport(face.points):null]));
 const depthFunctions=(face:typeof faces[number],p:P2)=>{
  const plane=planes.get(face.id);
  return plane?[plane]:supports.get(face.id)?.(p)??[];
 };
 const edgeOnFaces=faces.filter(face=>planes.get(face.id)===null).length;
 const collapsedProjection:Array<{faceId:string;edgeIndex:number;point:P2;sourceA:P3;sourceB:P3}>=[];
 const segments:EdgeInterval[]=[];
 let collapsedEdges=0;
 for(const face of faces)for(let edgeIndex=0;edgeIndex<face.points.length;edgeIndex++){
  const a=face.points[edgeIndex],b=face.points[(edgeIndex+1)%face.points.length];
  const aw=face.world[edgeIndex],bw=face.world[(edgeIndex+1)%face.world.length];
  if(Math.hypot(b[0]-a[0],b[1]-a[1])<=TOL){
   collapsedEdges++;collapsedProjection.push({faceId:face.id,edgeIndex,point:[a[0],a[1]],sourceA:aw,sourceB:bw});continue;
  }
  const cuts=[0,1];
  // An edge-on concave face can occlude itself. Its own projected vertices
  // must partition coverage/front-envelope changes, just like other faces.
  for(const other of faces)if(other!==face||resolveEdgeOn)for(let k=0;k<other.points.length;k++)
   cuts.push(...boundaryCuts(a,b,other.points[k],other.points[(k+1)%other.points.length]));
  const sorted=[...cuts].filter(t=>t>=0&&t<=1).sort((x,y)=>x-y);
  const bounds=sorted.filter((t,i)=>i===0||t-sorted[i-1]>TOL);
  // Coverage is constant between boundary intersections. On those open intervals
  // any pair of planar depths differs affinely and can change sign only at one root.
  for(let i=0;i<bounds.length-1;i++){
   const lo=bounds[i],hi=bounds[i+1],mid=lerp(a,b,(lo+hi)/2);
   const p:P2=[mid[0],mid[1]];
   for(const other of faces)if((other!==face||resolveEdgeOn)&&position(other.points,p)!=='OUTSIDE'){
    for(const plane of depthFunctions(other,p)){
     const x=lerp(a,b,lo),y=lerp(a,b,hi);
     const d0=plane([x[0],x[1]])-x[2],d1=plane([y[0],y[1]])-y[2];
     const den=d0-d1;
     if(Math.abs(den)<=TOL)continue;
     const root=lo+(hi-lo)*d0/den;
     if(root>lo+TOL&&root<hi-TOL)cuts.push(root);
    }
   }
  }
  cuts.sort((x,y)=>x-y);
  const unique=cuts.filter((t,i)=>i===0||t-cuts[i-1]>TOL);
  for(let i=0;i<unique.length-1;i++){
   const t0=unique[i],t1=unique[i+1];
   const start=lerp(a,b,t0),end=lerp(a,b,t1),mid=lerp(a,b,(t0+t1)/2);
   let visibility:EdgeInterval['visibility']='VISIBLE',reason:string|undefined;
   let sharedOwner:string|null=null,sharedSeam=false;
   const sharedFaces=new Set<string>();
   // A genuine shared 3D edge is a single stroke, not an occlusion ambiguity.
   for(const other of faces)if(other!==face){
    if(sharedWorldInterval(lerp(aw,bw,t0),lerp(aw,bw,t1),other.world)){
     sharedFaces.add(other.id);
     sharedOwner=sharedOwner===null?other.id:sharedOwner.localeCompare(other.id)<0?sharedOwner:other.id;
     if(resolveEdgeOn?worldInternalSeam(lerp(aw,bw,t0),lerp(aw,bw,t1),face.world,other.world):coplanar(face.points,other.points)&&oppositeSides(a,b,face.points,other.points))sharedSeam=true;
    }
   }
   if(resolveEdgeOn){
    let unknown:string|undefined;
    let hidden=false;
    for(const other of faces){
     const screen=position(other.points,[mid[0],mid[1]]);
     if(screen==='OUTSIDE')continue;
     const functions=depthFunctions(other,[mid[0],mid[1]]);
     if(!functions.length){unknown='Unable to prove projected rank-one face support';continue;}
     const depths=functions.map(fn=>fn([mid[0],mid[1]])-mid[2]);
     if(depths.some(n=>!Number.isFinite(n))){unknown='Nonfinite ray depth';continue;}
     if(depths.some(n=>n>DEPTH_TOL))hidden=true;
     // Own face and known physical shared edges may tie at this world point.
     // Unrelated coplanar/overlapping surfaces remain explicitly unresolved.
     if(other!==face&&!sharedFaces.has(other.id)&&depths.some(n=>Math.abs(n)<=DEPTH_TOL))unknown='Unrelated coplanar or depth-tied roof interval';
     for(const fn of functions){
      const d0=fn([start[0],start[1]])-start[2],d1=fn([end[0],end[1]])-end[2];
      if((d0>DEPTH_TOL&&d1< -DEPTH_TOL)||(d0< -DEPTH_TOL&&d1>DEPTH_TOL))unknown='Unpartitioned ray-depth transition';
     }
    }
    if(sharedSeam){visibility='INTERNAL_SEAM';reason='Adjacent world-coplanar faces: internal seam';}
    else if(sharedOwner&&face.id.localeCompare(sharedOwner)>0){visibility='DUPLICATE_SHARED';reason='Same physical edge already emitted by neighboring face';}
    else if(hidden){visibility='HIDDEN';reason='A source surface lies strictly in front along the exact cardinal ray';}
    else if(unknown){visibility='UNRESOLVED';reason=unknown;}
    else {visibility='VISIBLE';reason='Nearest source edge on the analytic cardinal ray';}
   }
   else if(!planes.get(face.id)){visibility='UNRESOLVED';reason='Source roof face projects edge-on; depth ordering is undefined';}
   else if(sharedSeam){visibility='INTERNAL_SEAM';reason='Adjacent coplanar faces: shared non-roof-outline seam';}
   else if(sharedOwner&&face.id.localeCompare(sharedOwner)>0){visibility='DUPLICATE_SHARED';reason='Same physical edge already emitted by neighboring face';}
   else for(const other of faces)if(other!==face){
    const screen=position(other.points,[mid[0],mid[1]]);
    if(screen==='OUTSIDE')continue;
    if(sharedFaces.has(other.id))continue;
    const plane=planes.get(other.id);
    if(!plane){visibility='UNRESOLVED';reason='Projected face is edge-on';break;}
    const actual=plane([mid[0],mid[1]])-mid[2];
    if(!Number.isFinite(actual)||screen==='BOUNDARY'&&Math.abs(actual)<DEPTH_TOL){
     visibility='UNRESOLVED';reason='Coincident projected roof boundary';break;
    }
    if(Math.abs(actual)<=DEPTH_TOL){
     visibility='UNRESOLVED';reason='Coplanar or depth-tied roof intervals';break;
    }
    // Algebraic sign on both sides checks that no unsplit depth exchange remains.
    const d0=plane([start[0],start[1]])-start[2],d1=plane([end[0],end[1]])-end[2];
    if((d0>DEPTH_TOL&&d1< -DEPTH_TOL)||(d0< -DEPTH_TOL&&d1>DEPTH_TOL)){
     visibility='UNRESOLVED';reason='Unpartitioned depth transition';break;
    }
    if(actual>DEPTH_TOL)visibility='HIDDEN';
   }
   segments.push({faceId:face.id,edgeIndex,t0,t1,start:[start[0],start[1]],end:[end[0],end[1]],visibility,...(reason?{reason}:{})});
  }
 }
 const counts={
  visible:segments.filter(x=>x.visibility==='VISIBLE').length,
  hidden:segments.filter(x=>x.visibility==='HIDDEN').length,
  unresolved:segments.filter(x=>x.visibility==='UNRESOLVED').length,
  internalSeams:segments.filter(x=>x.visibility==='INTERNAL_SEAM').length,
  duplicateShared:segments.filter(x=>x.visibility==='DUPLICATE_SHARED').length,
  edgeOnFaces,
  collapsedEdges
 };
 // Every noncollapsed edge must be partitioned end-to-end. Otherwise withhold.
 for(const face of faces)for(let edge=0;edge<face.points.length;edge++){
  const a=face.points[edge],b=face.points[(edge+1)%face.points.length];
  if(Math.hypot(b[0]-a[0],b[1]-a[1])<=TOL)continue;
  const runs=segments.filter(s=>s.faceId===face.id&&s.edgeIndex===edge).sort((x,y)=>x.t0-y.t0);
  if(!runs.length||Math.abs(runs[0].t0)>TOL||Math.abs(runs[runs.length-1].t1-1)>TOL||
    runs.some((s,i)=>s.t1<=s.t0||i>0&&Math.abs(runs[i-1].t1-s.t0)>TOL))
   return withheld('Roof edge interval coverage is incomplete');
 }
 return {status:counts.unresolved||(!resolveEdgeOn&&(counts.collapsedEdges||counts.edgeOnFaces))?'REVIEW_REQUIRED' as const:'INTERVAL_VERIFIED' as const,
  ...(resolveEdgeOn?{projectionProof:{method:'CARDINAL_RAY_DEPTH_V1' as const,collapsedProjection}}:{}),
  segments,counts,reason:'Analytic planar edge intervals against locked source geometry; CONCEPT ONLY, professional drawing and code review pending'};
}
