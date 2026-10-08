/** Conservative 3D-derived axonometric edge samples; diagnostic, never certified hidden lines. */
import type {RoofDrawingHandoff} from '@/packages/roof-geometry/drawing-contract';
type P3=readonly [number,number,number];
type P2=readonly [number,number];
const EPS=1e-7;
function cross(a:P2,b:P2){return a[0]*b[1]-a[1]*b[0];}
function depth(poly:readonly P3[],p:P2):number|null{
 for(let i=1;i<poly.length-1;i++){
  const a=poly[0],b=poly[i],c=poly[i+1];
  const u:P2=[b[0]-a[0],b[1]-a[1]],v:P2=[c[0]-a[0],c[1]-a[1]],r:P2=[p[0]-a[0],p[1]-a[1]];
  const den=cross(u,v);if(Math.abs(den)<EPS)continue;
  const x=cross(r,v)/den,y=cross(u,r)/den;
  if(x>=-EPS&&y>=-EPS&&x+y<=1+EPS)return a[2]+x*(b[2]-a[2])+y*(c[2]-a[2]);
 }
 return null;
}
export function sampleAxonRoofEdges(roof:RoofDrawingHandoff,azimuth:number,elevation:number){
 if(roof.status!=='AUTHORITATIVE')return {status:'WITHHELD' as const,segments:[],reason:roof.reason};
 if(![azimuth,elevation].every(Number.isFinite)||elevation<=0||elevation>=Math.PI/2)return {status:'WITHHELD' as const,segments:[],reason:'Invalid axonometric viewing angles'};
 const ca=Math.cos(azimuth),sa=Math.sin(azimuth),ce=Math.cos(elevation),se=Math.sin(elevation);
 const project=(p:P3):P3=>[p[0]*ca+p[1]*sa,-p[0]*sa*se+p[1]*ca*se+p[2]*ce,p[0]*sa*ce-p[1]*ca*ce+p[2]*se];
 const faces=roof.faces.map(f=>({id:f.id,points:f.polygon.map(project)}));
 const segments:{faceId:string;start:P2;end:P2;visibility:'FRONT_SAMPLE'|'BACK_SAMPLE'|'UNRESOLVED'}[]=[];
 for(const face of faces)for(let i=0;i<face.points.length;i++){
  const a=face.points[i],b=face.points[(i+1)%face.points.length];if(Math.hypot(b[0]-a[0],b[1]-a[1])<EPS)continue;
  const outcomes=new Set<'FRONT_SAMPLE'|'BACK_SAMPLE'|'UNRESOLVED'>();
  for(const t of [.2,.5,.8]){
   const p:P3=[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1]),a[2]+t*(b[2]-a[2])];
   let state:'FRONT_SAMPLE'|'BACK_SAMPLE'|'UNRESOLVED'='FRONT_SAMPLE';
   for(const other of faces)if(other!==face){
    const d=depth(other.points,[p[0],p[1]]);if(d===null)continue;
    if(Math.abs(d-p[2])<1e-5){state='UNRESOLVED';break;}
    if(d>p[2]+1e-5)state='BACK_SAMPLE';
   }
   outcomes.add(state);
  }
  const visibility=outcomes.size===1?[...outcomes][0]:'UNRESOLVED';
  segments.push({faceId:face.id,start:[a[0],a[1]],end:[b[0],b[1]],visibility});
 }
 return {status:'SAMPLED_ONLY' as const,segments,reason:'Three-point axonometric depth diagnostics; no exact hidden-line certification'};
}
