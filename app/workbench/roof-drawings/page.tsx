import Link from 'next/link';
import {pondyCandidateRegistry} from '@/projects/pondy-lot2/candidate-registry';
import {validateCandidateRoofs} from '@/packages/roof-geometry';
import {roofDrawingHandoff} from '@/packages/roof-geometry/drawing-contract';
import {projectAuthorizedRoof} from '@/packages/roof-geometry/drawing-projection';
import {projectRoofAxon,intersectRoofSection} from '@/packages/roof-geometry/drawing-spatial';

/** Staff-only review surface; consumes shared locked roof drawing contracts. */
export default function RoofDrawingInspector(){
 const candidate=pondyCandidateRegistry.candidates.find(c=>c.id==='pondy-d4');
 const roofs=candidate?validateCandidateRoofs(candidate.components).results:[];
 return <main className="shell workbench-shell">
  <section className="workbench-brief"><p className="eyebrow">WORKBENCH · SHARED ROOF DRAWING INSPECTOR</p>
   <h1>Roof drawing authority</h1><p className="lede">Read-only QA for validated roof surfaces. The project is a regression fixture; the view calculations come from the shared LotScope drawing engine. Nonzero overhang authority is not implied.</p>
   <Link className="secondary-button" href="/workbench">Back to Workbench</Link>
  </section>
  <section className="staff-card-grid">{roofs.map(r=>{
   const handoff=roofDrawingHandoff(r);
   const plan=projectAuthorizedRoof(handoff,'PLAN');
   const north=projectAuthorizedRoof(handoff,'NORTH');
   const section=intersectRoofSection(handoff,[0,0],[1,0]);
   const axon=projectRoofAxon(handoff,Math.PI/4,Math.PI/6);
   return <article className="wb-panel" key={r.roofId}><h2>{r.ownerId}</h2><p><strong>{handoff.status}</strong></p>
    <p>Plan faces: {plan.faces.length} · North elevation faces: {north.faces.length}</p>
    <p>Section intersections: {section.segments.length} · Axon faces: {axon.faces.length}</p>
    <p>Fascia: {handoff.status==='AUTHORITATIVE'&&handoff.fascia?'Approved':'Withheld pending design authority'}</p>
   </article>;
  })}</section>
 </main>;
}
