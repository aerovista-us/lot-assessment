import {pondyCandidateRegistry} from '../projects/pondy-lot2/candidate-registry.ts';
import {validateCandidateRoofs,ownerGeometryKey} from '../packages/roof-geometry/index.ts';
import {roofDrawingHandoff} from '../packages/roof-geometry/drawing-contract.ts';
import {verifyRoofEdgeIntervals} from '../packages/roof-geometry/drawing-verified-intervals.ts';

const candidate=pondyCandidateRegistry.candidates.find(item=>item.id==='pondy-d4');
if(!candidate)throw Error('Design 4 candidate missing');
const checked=validateCandidateRoofs(candidate.components);
if(!checked.safe||checked.results.length!==4||checked.locked!==4)throw Error('Four locked roof owners required');
const iso={kind:'CUSTOM',screenX:[5.2,-3.2,0],screenY:[-1.55,-1.35,-8.2],depth:[-26.24,-42.64,11.98]};
// Pondy north looks from -Y, south from +Y. LotScope canonical projector
// uses depth +Y for NORTH and -Y for SOUTH; swap the source views, then
// mirror their screen-x axes in the consumer to preserve Pondy site coordinates.
const views={north:{kind:'ELEVATION',view:'SOUTH'},south:{kind:'ELEVATION',view:'NORTH'},
 east:{kind:'ELEVATION',view:'EAST'},west:{kind:'ELEVATION',view:'WEST'},'pondy-iso-01':iso};
const owners=checked.results.map(roof=>{
 const handoff=roofDrawingHandoff(roof);
 if(handoff.status!=='AUTHORITATIVE')throw Error('Roof handoff withheld: '+roof.ownerId);
 const owner=candidate.components.find(item=>item.id===roof.ownerId);
 if(!owner)throw Error('No owner placement: '+roof.ownerId);
 const bindings={
  ownerGeometryKey:ownerGeometryKey(owner),
  surfaceFacesKey:JSON.stringify(roof.surfaceFaces.map(face=>[face.id,face.polygon]))
 };
 const results={};
 for(const [id,spec] of Object.entries(views)){
  const verified=verifyRoofEdgeIntervals(handoff,spec,{resolveCardinalEdgeOn:true});
  if(!['INTERVAL_VERIFIED','REVIEW_REQUIRED'].includes(verified.status))throw Error(roof.ownerId+' '+id+' withheld: '+verified.reason);
  const encode=s=>({faceId:s.faceId,edgeIndex:s.edgeIndex,t0:s.t0,t1:s.t1,visibility:s.visibility,
   start:s.start.map(n=>Number(n.toFixed(8))),end:s.end.map(n=>Number(n.toFixed(8))),...(s.reason?{reason:s.reason}:{})});
  results[id]={status:verified.status,counts:verified.counts,
   segments:verified.segments.filter(s=>!['INTERNAL_SEAM','DUPLICATE_SHARED'].includes(s.visibility)).map(encode),
   suppressedSegments:verified.segments.filter(s=>['INTERNAL_SEAM','DUPLICATE_SHARED'].includes(s.visibility)).map(encode),
   ...(verified.projectionProof?{projectionProof:verified.projectionProof}:{})};
 }
 return {ownerId:roof.ownerId,roofId:roof.roofId,...bindings,views:results};
});
const payload={schemaVersion:'lotscope-verified-roof-intervals-v2',sourceRepo:'aerovista-us/lot-assessment',
 sourceSnapshot:'pondy-d4',sourceRoofSchema:checked.schemaVersion,
 renderScope:'CONCEPT_ONLY_NOT_FOR_CONSTRUCTION',
 camera:{id:'pondy-iso-01',screenX:iso.screenX,screenY:iso.screenY,depth:iso.depth,
  screenTranslation:[299.2,688.6],elevationAxes:'PONDY_WORLD_AXES',cardinalDepthDirections:{north:'NEGATIVE_Y',south:'POSITIVE_Y',east:'POSITIVE_X',west:'NEGATIVE_X'}},
 owners};
const script='(function(global){\n\'use strict\';\nconst manifest='+JSON.stringify(payload,null,2)+';\n'+
 'const api={manifest,matchingOwner};\n'+
 'function matchingOwner(roof,owner){if(!roof||!owner||!Array.isArray(roof.surfaceFaces)||roof.surfaceFaces.some(f=>!f||typeof f.id!=="string"||!Array.isArray(f.polygon))||roof.ownerId!==owner.ownerId||roof.ownerGeometryKey!==owner.ownerGeometryKey)return false;return JSON.stringify(roof.surfaceFaces.map(f=>[f.id,f.polygon]))===owner.surfaceFacesKey;}\n'+
 'if(typeof module!==\'undefined\'&&module.exports)module.exports=api;\nglobal.Lot2Design4RoofIntervals=api;\n})(typeof window!==\'undefined\'?window:globalThis);\n';
process.stdout.write(script);
