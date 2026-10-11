import type {RoofDrawingHandoff} from '@/packages/roof-geometry/drawing-contract';
type Point2=readonly[number,number];
const EPS=1e-7;
function orient(a:Point2,b:Point2,c:Point2){
 return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
}
function touches(a:Point2,b:Point2,c:Point2,d:Point2){
 const o=[orient(a,b,c),orient(a,b,d),orient(c,d,a),orient(c,d,b)];
 const sign=(x:number)=>x>EPS?1:x< -EPS?-1:0;
 const s=o.map(sign);
 if(s[0]*s[1]<0&&s[2]*s[3]<0)return true;
 const within=(p:Point2,q:Point2,r:Point2)=>r[0]>=Math.min(p[0],q[0])-EPS&&r[0]<=Math.max(p[0],q[0])+EPS&&r[1]>=Math.min(p[1],q[1])-EPS&&r[1]<=Math.max(p[1],q[1])+EPS;
 return (s[0]===0&&within(a,b,c))||(s[1]===0&&within(a,b,d))
   ||(s[2]===0&&within(c,d,a))||(s[3]===0&&within(c,d,b));
}
/** Rejects invalid imported geometry without upgrading sampled diagnostics to certified hidden linework. */
export function validProjectedFaces(roof:RoofDrawingHandoff):boolean {
 if(roof.status!=='AUTHORITATIVE'||!Array.isArray(roof.faces)||!roof.faces.length)return false;
 const ids=new Set<string>();
 for(const face of roof.faces){
  if(!face||typeof face.id!=='string'||!face.id||ids.has(face.id))return false;
  ids.add(face.id);
  const poly=face.polygon;
  if(!Array.isArray(poly)||poly.length<3)return false;
  if(!poly.every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)))return false;
  // Vector-area normal rejects zero-net-area polygons (including bow-ties).
  const normal=[0,0,0];
  for(let i=0;i<poly.length;i++){
   const a=poly[i],b=poly[(i+1)%poly.length];
   normal[0]+=a[1]*b[2]-a[2]*b[1];
   normal[1]+=a[2]*b[0]-a[0]*b[2];
   normal[2]+=a[0]*b[1]-a[1]*b[0];
  }
  const length=Math.hypot(...normal);
  if(length<=EPS)return false;
  const drop=normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs)));
  const flat:Point2[]=poly.map(p=>drop===0?[p[1],p[2]]:drop===1?[p[0],p[2]]:[p[0],p[1]]);
  // All vertices must belong to one plane, not a warped roof patch.
  const first=poly[0];
  const scale=Math.max(1,...poly.flatMap(p=>p.map((x,i)=>Math.abs(x-first[i]))));
  if(poly.some(p=>Math.abs(normal[0]*(p[0]-first[0])+normal[1]*(p[1]-first[1])+normal[2]*(p[2]-first[2]))/length>scale*1e-6))return false;
  for(let i=0;i<flat.length;i++){
   const a=flat[i],b=flat[(i+1)%flat.length];
   if(Math.hypot(b[0]-a[0],b[1]-a[1])<=EPS)return false;
   for(let j=i+2;j<flat.length;j++){
    if(i===0&&j===flat.length-1)continue;
    if(touches(a,b,flat[j],flat[(j+1)%flat.length]))return false;
   }
  }
 }
 return true;
}
