import {pondyCandidateRegistry} from '@/projects/pondy-lot2/candidate-registry';
import {validateCandidateRoofs} from '@/packages/roof-geometry';
import {roofDrawingHandoff} from '@/packages/roof-geometry/drawing-contract';
import {projectAuthorizedRoof} from '@/packages/roof-geometry/drawing-projection';
import {projectRoofAxon} from '@/packages/roof-geometry/drawing-spatial';
import {verifyRoofEdgeIntervals} from '@/packages/roof-geometry/drawing-verified-intervals';
import {deriveValleySectionCuts} from '@/packages/roof-geometry/drawing-valley-sections';

/** These records are rebuilt from the authoritative locked candidate on the
 * protected server route. The browser has no geometry write endpoint here. */
export function buildRoofReviewOwners(){
 const candidate=pondyCandidateRegistry.candidates.find(c=>c.id==='pondy-d4');
 const roofs=candidate?validateCandidateRoofs(candidate.components).results:[];
 return roofs.map(roof=>{
  const handoff=roofDrawingHandoff(roof);
  const plan=projectAuthorizedRoof(handoff,'PLAN');
  const axon=projectRoofAxon(handoff,Math.PI/4,Math.PI/6);
  const view=(v:'NORTH'|'SOUTH'|'EAST'|'WEST')=>verifyRoofEdgeIntervals(handoff,{kind:'ELEVATION',view:v},{resolveCardinalEdgeOn:true});
  return {
   ownerId:roof.ownerId,roofId:roof.roofId,status:handoff.status,
   faceCount:handoff.faces.length,fasciaAuthorized:handoff.status==='AUTHORITATIVE'&&!!handoff.fascia,
   planFaces:plan.faces,axonFaces:axon.faces,
   valleyCuts:deriveValleySectionCuts(handoff),
   intervals:{
    NORTH:view('NORTH'),SOUTH:view('SOUTH'),EAST:view('EAST'),WEST:view('WEST'),
    AXON:verifyRoofEdgeIntervals(handoff,{kind:'AXON',azimuth:Math.PI/4,elevation:Math.PI/6})
   }
  };
 });
}
export type RoofReviewOwner=ReturnType<typeof buildRoofReviewOwners>[number];
export type ReviewView=keyof RoofReviewOwner['intervals'];
