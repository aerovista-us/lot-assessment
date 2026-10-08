import RoofView from './roof-view';
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
   const east=projectAuthorizedRoof(handoff,'EAST');
   const vertices=handoff.status==='AUTHORITATIVE'?handoff.faces.flatMap(f=>f.polygon):[];
   const centerX=vertices.length?(Math.min(...vertices.map(p=>p[0]))+Math.max(...vertices.map(p=>p[0])))/2:0;
   const centerY=vertices.length?(Math.min(...vertices.map(p=>p[1]))+Math.max(...vertices.map(p=>p[1])))/2:0;
   const section=intersectRoofSection(handoff,[centerX,centerY],[1,0]);
   const axon=projectRoofAxon(handoff,Math.PI/4,Math.PI/6);
   return <article className="wb-panel" key={r.roofId}><h2>{r.ownerId}</h2><p><strong>{handoff.status}</strong></p>
    <p>Plan faces: {plan.faces.length} · North elevation faces: {north.faces.length}</p>
    <p>Section intersections: {section.segments.length} · Axon faces: {axon.faces.length}</p>
    <p>Fascia: {handoff.status==='AUTHORITATIVE'&&handoff.fascia?'Approved':'Withheld pending design authority'}</p>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:16,marginTop:16}}>
     <RoofView title="Plan" faces={plan.faces}/>
     <RoofView title="North elevation" faces={north.faces}/>
     <RoofView title="East elevation" faces={east.faces}/>
     <RoofView title="Axon" faces={axon.faces}/>
     <RoofView title="Section intersections" faces={[]} segments={section.segments}/>
    </div>
   </article>;
  })}</section>
 </main>;
}
