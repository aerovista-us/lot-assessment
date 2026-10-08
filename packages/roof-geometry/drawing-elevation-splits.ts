/** Conservative elevation edge partition at every projected face-edge intersection.
 * Segment midpoint depths are diagnostic, not complete hidden-line certification.
 */
import type {RoofDrawingHandoff} from '@/packages/roof-geometry/drawing-contract';
type P3=readonly[number,number,number];
type P2=readonly[number,number];
type View='NORTH'|'SOUTH'|'EAST'|'WEST';
const EPS=1e-7;
function frame(p:P3,v:View):P3{switch(v){case 'NORTH':return [p[0],p[2],p[1]];case 'SOUTH':return [-p[0],p[2],-p[1]];case 'EAST':return [-p[1],p[2],p[0]];case 'WEST':return [p[1],p[2],-p[0]];}}
function cross(a:P2,b:P2){return a[0]*b[1]-a[1]*b[0];}
function splitAt(a:P3,b:P3,c:P3,d:P3){const r:P2=[b[0]-a[0],b[1]-a[1]],s:P2=[d[0]-c[0],d[1]-c[1]],den=cross(r,s);if(Math.abs(den)<EPS)return null;const delta:P2=[c[0]-a[0],c[1]-a[1]],t=cross(delta,s)/den,u=cross(delta,r)/den;return t>EPS&&t<1-EPS&&u>=-EPS&&u<=1+EPS?t:null;}
function depthAt(poly:readonly P3[],p:P2){for(let i=1;i<poly.length-1;i++){const a=poly[0],b=poly[i],c=poly[i+1],den=cross([b[0]-a[0],b[1]-a[1]],[c[0]-a[0],c[1]-a[1]]);if(Math.abs(den)<EPS)continue;const u=cross([p[0]-a[0],p[1]-a[1]],[c[0]-a[0],c[1]-a[1]])/den,v=cross([b[0]-a[0],b[1]-a[1]],[p[0]-a[0],p[1]-a[1]])/den;if(u>=-EPS&&v>=-EPS&&u+v<=1+EPS)return a[2]+u*(b[2]-a[2])+v*(c[2]-a[2]);}return null;}
export function splitElevationEdges(roof:RoofDrawingHandoff,view:View){
 if(roof.status!=='AUTHORITATIVE')return {status:'WITHHELD' as const,segments:[],reason:roof.reason};
 if(!['NORTH','SOUTH','EAST','WEST'].includes(view))return {status:'WITHHELD' as const,segments:[],reason:'Invalid elevation direction'};
 const faces=roof.faces.map(f=>({id:f.id,points:f.polygon.map(p=>frame(p,view))}));
 const segments:{faceId:string;start:P2;end:P2;visibility:'FRONT_SAMPLE'|'BACK_SAMPLE'|'UNRESOLVED'}[]=[];
 for(const face of faces)for(let i=0;i<face.points.length;i++){
  const a=face.points[i],b=face.points[(i+1)%face.points.length];if(Math.hypot(b[0]-a[0],b[1]-a[1])<EPS)continue;
  const cuts=[0,1];for(const other of faces)if(other!==face)for(let j=0;j<other.points.length;j++){const t=splitAt(a,b,other.points[j],other.points[(j+1)%other.points.length]);if(t!==null)cuts.push(t);}
  cuts.sort((a,b)=>a-b);const unique=cuts.filter((t,i)=>i===0||t-cuts[i-1]>EPS);
  for(let k=0;k<unique.length-1;k++){
   const at=(t:number):P3=>[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1]),a[2]+t*(b[2]-a[2])];
   const first=at(unique[k]),last=at(unique[k+1]),mid=at((unique[k]+unique[k+1])/2);let visibility:'FRONT_SAMPLE'|'BACK_SAMPLE'|'UNRESOLVED'='FRONT_SAMPLE';
   for(const other of faces)if(other!==face){const d=depthAt(other.points,[mid[0],mid[1]]);if(d===null)continue;if(Math.abs(d-mid[2])<1e-4){visibility='UNRESOLVED';break;}if(d>mid[2]+1e-4)visibility='BACK_SAMPLE';}
   segments.push({faceId:face.id,start:[first[0],first[1]],end:[last[0],last[1]],visibility});
  }
 }
 return {status:'SAMPLED_ONLY' as const,segments,reason:'Split at projected crossings, midpoint-only depth; no guaranteed hidden-line correctness'};
}
