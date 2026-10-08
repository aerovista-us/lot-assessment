/** Conservative projected face-overlap audit. This is NOT a hidden-surface solver.
 * A positive intersection blocks claims of depth-sorted architectural linework.
 */
import type {Point2} from '@/packages/roof-geometry/drawing-projection';
type ProjectedFace={id:string;points:readonly Point2[]};
const EPS=1e-7;
function inside(p:Point2,a:Point2,b:Point2,sign:number){return sign*((b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]))>=-EPS;}
function cross(a:Point2,b:Point2){return a[0]*b[1]-a[1]*b[0];}
function intersection(s:Point2,e:Point2,a:Point2,b:Point2):Point2|null{
 const r:Point2=[e[0]-s[0],e[1]-s[1]],v:Point2=[b[0]-a[0],b[1]-a[1]],det=cross(r,v);
 if(Math.abs(det)<EPS)return null;
 const t=cross([a[0]-s[0],a[1]-s[1]],v)/det;
 return [s[0]+t*r[0],s[1]+t*r[1]];
}
function signed(poly:readonly Point2[]){return poly.reduce((sum,p,i)=>sum+cross(p,poly[(i+1)%poly.length]),0)/2;}
export function projectedOverlapArea(a:readonly Point2[],b:readonly Point2[]):number{
 if(a.length<3||b.length<3)return 0;
 let subject=[...a],sign=Math.sign(signed(b));if(!sign)return 0;
 for(let i=0;i<b.length;i++){
  const start=b[i],end=b[(i+1)%b.length],input=subject;subject=[];
  for(let j=0;j<input.length;j++){
   const s=input[j],e=input[(j+1)%input.length],si=inside(s,start,end,sign),ei=inside(e,start,end,sign);
   if(si!==ei){const h=intersection(s,e,start,end);if(h)subject.push(h);}
   if(ei)subject.push(e);
  }
  if(!subject.length)return 0;
 }
 return Math.abs(signed(subject));
}
export function auditProjectedRoofVisibility(faces:readonly ProjectedFace[]){
 const ambiguousPairs:{a:string;b:string;overlapSqFt:number}[]=[];
 for(let i=0;i<faces.length;i++)for(let j=i+1;j<faces.length;j++){
  const area=projectedOverlapArea(faces[i].points,faces[j].points);
  if(area>0.0001)ambiguousPairs.push({a:faces[i].id,b:faces[j].id,overlapSqFt:area});
 }
 return {status:ambiguousPairs.length?'OCCLUSION_UNRESOLVED' as const:'NO_FACE_OVERLAP_DETECTED' as const,ambiguousPairs};
}
