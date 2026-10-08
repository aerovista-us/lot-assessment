/** Conservative cardinal-elevation depth classification at projected edge midpoints.
 * Visibility cannot be certified without splitting at all occlusion transitions.
 */
import type {RoofDrawingHandoff} from '@/packages/roof-geometry/drawing-contract';
type P3=readonly[number,number,number];
type Side='NORTH'|'SOUTH'|'EAST'|'WEST';
const EPS=1e-7;
const frame=(p:P3,side:Side):[number,number,number]=>{
 switch(side){case 'NORTH':return [p[0],p[2],p[1]];case 'SOUTH':return [-p[0],p[2],-p[1]];case 'EAST':return [-p[1],p[2],p[0]];case 'WEST':return [p[1],p[2],-p[0]];}
};
function barycentric(poly:readonly[number,number,number][],p:readonly[number,number]):number|null{
 for(let i=1;i<poly.length-1;i++){
  const a=poly[0],b=poly[i],c=poly[i+1];
  const det=(b[0]-a[0])*(c[1]-a[1])-(c[0]-a[0])*(b[1]-a[1]);
  if(Math.abs(det)<EPS)continue;
  const u=((p[0]-a[0])*(c[1]-a[1])-(c[0]-a[0])*(p[1]-a[1]))/det;
  const v=((b[0]-a[0])*(p[1]-a[1])-(p[0]-a[0])*(b[1]-a[1]))/det;
  if(u>=-EPS&&v>=-EPS&&u+v<=1+EPS)return a[2]+u*(b[2]-a[2])+v*(c[2]-a[2]);
 }
 return null;
}
export function sampleElevationEdgeDepth(roof:RoofDrawingHandoff,side:Side){
 if(roof.status!=='AUTHORITATIVE')return {status:'WITHHELD' as const,segments:[],reason:roof.reason};
 if(!['NORTH','SOUTH','EAST','WEST'].includes(side))return {status:'WITHHELD' as const,segments:[],reason:'Unsupported elevation'};
 const projected=roof.faces.map(face=>({id:face.id,polygon:face.polygon.map(p=>frame(p,side))}));
 const segments:{faceId:string;start:readonly[number,number];end:readonly[number,number];visibility:'FRONT_SAMPLE'|'BACK_SAMPLE'|'UNRESOLVED'}[]=[];
 for(const face of projected)for(let i=0;i<face.polygon.length;i++){
  const a=face.polygon[i],b=face.polygon[(i+1)%face.polygon.length];
  if(Math.hypot(a[0]-b[0],a[1]-b[1])<EPS)continue;
  const p:readonly[number,number]=[(a[0]+b[0])/2,(a[1]+b[1])/2],depth=(a[2]+b[2])/2;
  let visibility:'FRONT_SAMPLE'|'BACK_SAMPLE'|'UNRESOLVED'='FRONT_SAMPLE';
  for(const other of projected){if(other===face)continue;
   const d=barycentric(other.polygon,p);if(d===null)continue;
   if(Math.abs(d-depth)<1e-4){visibility='UNRESOLVED';break;}
   if(d>depth+1e-4)visibility='BACK_SAMPLE';
  }
  segments.push({faceId:face.id,start:[a[0],a[1]],end:[b[0],b[1]],visibility});
 }
 return {status:'SAMPLED_ONLY' as const,segments,reason:'Cardinal elevation midpoint depth classification; occlusion splitting not yet proved'};
}
