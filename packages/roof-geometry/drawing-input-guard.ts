import type {RoofDrawingHandoff} from '@/packages/roof-geometry/drawing-contract';
export function validProjectedFaces(roof:RoofDrawingHandoff):boolean {
 if(roof.status!=='AUTHORITATIVE'||!Array.isArray(roof.faces)||!roof.faces.length)return false;
 const ids=new Set<string>();
 for(const face of roof.faces){
  if(!face||typeof face.id!=='string'||!face.id||ids.has(face.id))return false;
  ids.add(face.id);
  if(!Array.isArray(face.polygon)||face.polygon.length<3)return false;
  if(!face.polygon.every(point=>Array.isArray(point)&&point.length===3&&point.every(Number.isFinite)))return false;
  const origin=face.polygon[0];
  const noncollinear=face.polygon.slice(1,-1).some((p,i)=>{
   const q=face.polygon[i+2];
   const x=[p[0]-origin[0],p[1]-origin[1],p[2]-origin[2]];
   const y=[q[0]-origin[0],q[1]-origin[1],q[2]-origin[2]];
   return Math.hypot(x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0])>1e-8;
  });
  if(!noncollinear)return false;
 }
 return true;
}
