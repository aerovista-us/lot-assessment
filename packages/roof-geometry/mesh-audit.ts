/** Read-only surface-mesh acceptance report. No geometry edits or authority promotion. */
import type {RoofSurfaceFace} from '@/packages/roof-geometry/junctions';
export type MeshAudit={ok:boolean;errors:string[];faceCount:number;nonmanifoldEdgeCount:number;unpairedInteriorEdgeCount:number};
const EPS=0.0001;
const same=(a:number[],b:number[])=>a.length===b.length&&a.every((v,i)=>Math.abs(v-b[i])<=EPS);
const key=(a:number[])=>a.map(v=>Math.round(v/EPS)).join(':');
export function auditRoofSurfaceMesh(faces:readonly RoofSurfaceFace[]):MeshAudit{
 const errors:string[]=[];
 if(!faces.length)errors.push('No solved roof surface faces');
 const edgeUses=new Map<string,{a:number[];b:number[];count:number}>();
 for(const face of faces){
  if(!Array.isArray(face.polygon)||face.polygon.length<3||face.polygon.some(p=>p.length!==3||p.some(v=>!Number.isFinite(v)))){errors.push(`Malformed roof face ${face.id}`);continue;}
  for(let i=0;i<face.polygon.length;i++){
   const a=face.polygon[i],b=face.polygon[(i+1)%face.polygon.length];
   if(same(a,b)){errors.push(`Zero-length edge on ${face.id}`);continue;}
   const hash=[key(a),key(b)].sort().join('|');
   const existing=edgeUses.get(hash);
   if(existing)existing.count++;else edgeUses.set(hash,{a,b,count:1});
  }
 }
 const nonmanifoldEdgeCount=[...edgeUses.values()].filter(e=>e.count>2).length;
 if(nonmanifoldEdgeCount)errors.push(`Nonmanifold edge count: ${nonmanifoldEdgeCount}`);
 // Detect a common T-junction failure: an unmatched vertex lying strictly inside an edge.
 const edges=[...edgeUses.values()];
 let unpairedInteriorEdgeCount=0;
 const vertices=faces.flatMap(f=>f.polygon);
 for(const edge of edges.filter(e=>e.count===1)){
  const [a,b]=[edge.a,edge.b],v=b.map((n,i)=>n-a[i]),len2=v.reduce((s,n)=>s+n*n,0);
  if(len2<EPS*EPS)continue;
  if(vertices.some(p=>{const t=p.reduce((s,n,i)=>s+(n-a[i])*v[i],0)/len2;if(t<=EPS||t>=1-EPS)return false;const residual=p.reduce((s,n,i)=>s+(n-a[i]-t*v[i])**2,0);return residual<EPS*EPS;}))unpairedInteriorEdgeCount++;
 }
 if(unpairedInteriorEdgeCount)errors.push(`Unsplit T-junction roof edges: ${unpairedInteriorEdgeCount}`);
 return {ok:errors.length===0,errors,faceCount:faces.length,nonmanifoldEdgeCount,unpairedInteriorEdgeCount};
}
