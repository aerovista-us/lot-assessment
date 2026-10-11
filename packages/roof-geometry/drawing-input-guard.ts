import type {RoofDrawingHandoff} from '@/packages/roof-geometry/drawing-contract';
export function validProjectedFaces(roof:RoofDrawingHandoff):boolean {
 if(roof.status!=='AUTHORITATIVE'||!Array.isArray(roof.faces)||!roof.faces.length)return false;
 const ids=new Set<string>();
 for(const face of roof.faces){
  if(!face||typeof face.id!=='string'||!face.id||ids.has(face.id))return false;
  ids.add(face.id);
  if(!Array.isArray(face.polygon)||face.polygon.length<3)return false;
  if(!face.polygon.every(point=>Array.isArray(point)&&point.length===3&&point.every(Number.isFinite)))return false;
 }
 return true;
}
