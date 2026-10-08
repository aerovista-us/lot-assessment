/** Conservative subdivision of plan-projected roof edges. Never claims full hidden-line authority. */
import type {RoofDrawingHandoff} from '@/packages/roof-geometry/drawing-contract';
type P3=readonly [number,number,number];
type P2=readonly [number,number];
const EPS=1e-7;
function cross(a:P2,b:P2){return a[0]*b[1]-a[1]*b[0];}
function edgeHit(a:P3,b:P3,c:P3,d:P3):number|null{
 const r:P2=[b[0]-a[0],b[1]-a[1]],s:P2=[d[0]-c[0],d[1]-c[1]];
 const den=cross(r,s);if(Math.abs(den)<EPS)return null;
 const delta:P2=[c[0]-a[0],c[1]-a[1]],t=cross(delta,s)/den,u=cross(delta,r)/den;
 return t>EPS&&t<1-EPS&&u>=-EPS&&u<=1+EPS?t:null;
}
function height(poly:readonly P3[],p:P2){
 for(let i=1;i<poly.length-1;i++){
  const [a,b,c]=[poly[0],poly[i],poly[i+1]];
  const area=cross([b[0]-a[0],b[1]-a[1]],[c[0]-a[0],c[1]-a[1]]);
  if(Math.abs(area)<EPS)continue;
  const w1=cross([p[0]-a[0],p[1]-a[1]],[c[0]-a[0],c[1]-a[1]])/area;
  const w2=cross([b[0]-a[0],b[1]-a[1]],[p[0]-a[0],p[1]-a[1]])/area;
  if(w1>=-EPS&&w2>=-EPS&&w1+w2<=1+EPS)return a[2]+w1*(b[2]-a[2])+w2*(c[2]-a[2]);
 }
 return null;
}
export function auditPlanRoofEdges(roof:RoofDrawingHandoff){
 if(roof.status!=='AUTHORITATIVE')return {status:'WITHHELD' as const,segments:[],reason:roof.reason};
 const segments:{faceId:string;a:P3;b:P3;visibility:'VISIBLE_SAMPLE'|'HIDDEN_SAMPLE'|'UNRESOLVED'}[]=[];
 for(const face of roof.faces){
  for(let i=0;i<face.polygon.length;i++){
   const a=face.polygon[i] as P3,b=face.polygon[(i+1)%face.polygon.length] as P3;
   if(Math.hypot(b[0]-a[0],b[1]-a[1])<EPS)continue;
   const cut=[0,1];
   for(const other of roof.faces)if(other!==face){for(let j=0;j<other.polygon.length;j++){
    const t=edgeHit(a,b,other.polygon[j] as P3,other.polygon[(j+1)%other.polygon.length] as P3);
    if(t!==null)cut.push(t);
   }}
   cut.sort((x,y)=>x-y);
   const sorted=cut.filter((t,j)=>j===0||t-cut[j-1]>EPS);
   for(let j=0;j<sorted.length-1;j++){
    const lerp=(t:number):P3=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
    const first=lerp(sorted[j]),last=lerp(sorted[j+1]),middle=lerp((sorted[j]+sorted[j+1])/2);
    let visibility:'VISIBLE_SAMPLE'|'HIDDEN_SAMPLE'|'UNRESOLVED'='VISIBLE_SAMPLE';
    for(const other of roof.faces)if(other!==face){
     const z=height(other.polygon,[middle[0],middle[1]]);
     if(z===null)continue;
     if(Math.abs(z-middle[2])<1e-4){visibility='UNRESOLVED';break;}
     if(z>middle[2]+1e-4)visibility='HIDDEN_SAMPLE';
    }
    segments.push({faceId:face.id,a:first,b:last,visibility});
   }
  }
 }
 return {status:'SAMPLED_ONLY' as const,segments,reason:'Plan-only midpoint visibility samples; boundary/coplanar cases require full solver'};
}
