import Link from 'next/link';
import RoofInspectorWorkspace from './roof-inspector-workspace';
import {buildRoofReviewOwners} from './roof-review-data';
import './roof-inspector.css';

/** Founder-only Workbench review surface. Route auth and capability gates are
 * unchanged; the client receives only read-only locked roof drawing evidence.
 */
export default function RoofDrawingInspector(){
 const owners=buildRoofReviewOwners();
 return <main className="shell workbench-shell roof-inspector">
  <header className="roof-inspector-hero">
   <div>
    <p className="eyebrow">WORKBENCH · DESIGN 4 · SOURCE-AUTHORITATIVE ROOF REVIEW</p>
    <h1>Architectural roof interval inspector</h1>
    <p>CONCEPT ONLY · NOT FOR CONSTRUCTION. Roof surfaces and valley section cuts derive from locked LotScope geometry. Analytic visible/hidden intervals are camera-specific; unresolved edges and edge-on faces require review. This does not certify structural loads, drainage, fascia, setbacks or permits.</p>
   </div>
   <Link className="secondary-button" href="/workbench">Back to Workbench</Link>
  </header>
  <RoofInspectorWorkspace owners={owners}/>
  <footer className="roof-review-footer">DESIGN 4 · LOCKED GEOMETRY REVIEW · NOT FOR CONSTRUCTION · No AHJ, structural or drainage acceptance implied</footer>
 </main>;
}
