/** Project-independent roof drawing handoff; consumer may only render authorized roof data.
 * Values remain world XYZ; downstream views must project rather than edit geometry.
 */
import type { RoofValidation } from '@/packages/roof-geometry';
export type RoofDrawingHandoff =
 | {status:'AUTHORITATIVE';ownerId:string;roofId:string;schemaVersion:string;source:'LOCKED_ROOF_SOT';faces:RoofValidation['surfaceFaces'];junctions:RoofValidation['junctions'];fascia:NonNullable<RoofValidation['eaveFascia']>|null}
 | {status:'WITHHELD';ownerId:string;roofId:string;reason:string;faces:[];junctions:[];fascia:null};
export function roofDrawingHandoff(roof:RoofValidation):RoofDrawingHandoff{
 const withheld=(reason:string):RoofDrawingHandoff=>({status:'WITHHELD',ownerId:roof.ownerId,roofId:roof.roofId,reason,faces:[],junctions:[],fascia:null});
 if(roof.status!=='ROOF_GEOMETRY_LOCKED'||!roof.authoritative||!roof.safe||roof.errors.length)return withheld('Locked roof authority missing or invalid');
 if(!roof.ownerGeometryCurrent)return withheld('Roof owner geometry binding is stale');
 if(!roof.surfaceFaces.length||roof.surfaceFaces.some(face=>!Array.isArray(face.polygon)||face.polygon.length<3||face.polygon.some(p=>p.length!==3||p.some(v=>!Number.isFinite(v)))))return withheld('Invalid solved roof face coordinates');
 return {status:'AUTHORITATIVE',ownerId:roof.ownerId,roofId:roof.roofId,schemaVersion:roof.schemaVersion,source:'LOCKED_ROOF_SOT',faces:roof.surfaceFaces,junctions:roof.junctions,fascia:roof.eaveFascia?.status==='AUTHORITATIVE'?roof.eaveFascia:null};
}
