/** Read-only 3D roof half-edge audit; never generates projected roof edges.
 * Phase A of ROOF_OVERHANG_EXTENSION_V1_CONTRACT.
 */
export type Point3 = readonly [number,number,number];
export type Face3 = { id: string; polygon: readonly Point3[] };
export type BoundaryEdge = { faceId: string; a: Point3; b: Point3; kind: 'EAVE'|'SLOPED_BOUNDARY'|'LEVEL_BOUNDARY' };
export type BoundaryAudit =
  | { status:'VALID'; boundary: BoundaryEdge[]; sharedEdges: number; plateZFt: number }
  | { status:'INVALID'; errors:string[]; boundary:[]; sharedEdges:0 };
const finite=(p:unknown):p is Point3=>Array.isArray(p)&&p.length===3&&p.every(v=>typeof v==='number'&&Number.isFinite(v));
const quant=(p:Point3)=>p.map(n=>n.toFixed(5)).join(',');
const same=(a:Point3,b:Point3)=>a.every((v,i)=>Math.abs(v-b[i])<=0.00001);
export function auditRoofBoundary(faces: readonly Face3[]): BoundaryAudit {
  const invalid=(why:string):BoundaryAudit=>({status:'INVALID',errors:[why],boundary:[],sharedEdges:0});
  if(!Array.isArray(faces)||!faces.length)return invalid('Solved roof faces are required');
  if(faces.some(f=>!f||typeof f.id!=='string'||!f.id.trim()||!Array.isArray(f.polygon)||f.polygon.length<3||f.polygon.some(p=>!finite(p))))return invalid('Malformed roof surface polygon');
  if(new Set(faces.map(f=>f.id)).size!==faces.length)return invalid('Duplicate roof face identifier');
  const edges=new Map<string,{faceId:string,a:Point3,b:Point3,count:number}>();
  for(const face of faces)for(let i=0;i<face.polygon.length;i++){
    const a=face.polygon[i],b=face.polygon[(i+1)%face.polygon.length];
    if(same(a,b))return invalid('Degenerate roof boundary edge');
    const key=[quant(a),quant(b)].sort().join('|');
    const hit=edges.get(key);
    if(hit)hit.count++;else edges.set(key,{faceId:face.id,a,b,count:1});
  }
  if([...edges.values()].some(e=>e.count>2))return invalid('Nonmanifold roof edge is shared by more than two faces');
  const plate=Math.min(...faces.flatMap(f=>f.polygon.map(p=>p[2])));
  const boundary=[...edges.values()].filter(e=>e.count===1).map(e=>({
    faceId:e.faceId,a:e.a,b:e.b,
    kind:(Math.abs(e.a[2]-plate)<0.00001&&Math.abs(e.b[2]-plate)<0.00001
      ? 'EAVE':Math.abs(e.a[2]-e.b[2])<0.00001?'LEVEL_BOUNDARY':'SLOPED_BOUNDARY') as BoundaryEdge['kind']
  }));
  if(!boundary.length)return invalid('Roof mesh has no external boundary');
  return {status:'VALID',boundary,sharedEdges:[...edges.values()].filter(e=>e.count===2).length,plateZFt:plate};
}
