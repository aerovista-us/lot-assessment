/** Shared, exact-coordinate roof-face projector for architectural drawings. */
import type {RoofDrawingHandoff} from '@/packages/roof-geometry/drawing-contract';
export type ViewPlane='PLAN'|'NORTH'|'SOUTH'|'EAST'|'WEST';
export type Point2=readonly [number,number];
export type ProjectedRoofFace={id:string;zoneId:string;points:Point2[]};
export type RoofDrawingProjection={status:'DRAWABLE';ownerId:string;view:ViewPlane;faces:ProjectedRoofFace[]}|{status:'WITHHELD';reason:string;faces:[]};
export function projectAuthorizedRoof(roof:RoofDrawingHandoff,view:ViewPlane):RoofDrawingProjection{
 if(roof.status!=='AUTHORITATIVE')return {status:'WITHHELD',reason:roof.reason,faces:[]};
 if(!['PLAN','NORTH','SOUTH','EAST','WEST'].includes(view))return {status:'WITHHELD',reason:'Unsupported roof drawing view',faces:[]};
 const project=(p:readonly[number,number,number]):Point2=>{
  switch(view){case 'PLAN':return [p[0],p[1]];case 'NORTH':return [p[0],p[2]];case 'SOUTH':return [-p[0],p[2]];case 'EAST':return [-p[1],p[2]];case 'WEST':return [p[1],p[2]];}
 };
 const faces=roof.faces.map(face=>({id:face.id,zoneId:face.zoneId,points:face.polygon.map(project)}));
 return {status:'DRAWABLE',ownerId:roof.ownerId,view,faces};
}
