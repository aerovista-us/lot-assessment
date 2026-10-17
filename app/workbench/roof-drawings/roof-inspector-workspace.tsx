"use client";
import {useState} from 'react';
import {d4ExternalAcceptance} from '@/projects/pondy-lot2/d4-external-acceptance';
import RoofLinework from './roof-linework';
import RoofView from './roof-view';
import {RoofValleyPlan,RoofValleySection} from './roof-review-graphics';
import type {RoofReviewOwner,ReviewView} from './roof-review-data';

const VIEW_ORDER:ReviewView[]=['NORTH','SOUTH','EAST','WEST','AXON'];
const title=(id:string)=>id.split('-').map(t=>t.charAt(0).toUpperCase()+t.slice(1)).join(' ');
export default function RoofInspectorWorkspace({owners}:{owners:RoofReviewOwner[]}){
 const [ownerId,setOwnerId]=useState(owners.find(o=>o.ownerId==='home-b')?.ownerId??owners[0]?.ownerId??'');
 const [view,setView]=useState<ReviewView>('NORTH');
 const [edgeIndex,setEdgeIndex]=useState(-1);
 const [showIds,setShowIds]=useState(false);
 const [focusUnresolved,setFocusUnresolved]=useState(false);
 const [selectedValley,setSelectedValley]=useState('V1');
 const current=owners.find(o=>o.ownerId===ownerId);
 if(!current)return <p>Roof review unavailable: no validated roof owners.</p>;
 const active=current.intervals[view];
 const projectionProof='projectionProof' in active?active.projectionProof:undefined;
 const collapsed=projectionProof?.collapsedProjection??[];
 const plot=active.segments.filter(s=>s.visibility!=='INTERNAL_SEAM'&&s.visibility!=='DUPLICATE_SHARED');
 const selectedEdge=plot[edgeIndex];
 const flagged=VIEW_ORDER.filter(k=>current.intervals[k].status!=='INTERVAL_VERIFIED');
 function chooseOwner(id:string){setOwnerId(id);setView('NORTH');setEdgeIndex(-1);setSelectedValley('V1');}
 function chooseView(id:ReviewView){setView(id);setEdgeIndex(-1);}
 return <div className="roof-inspector-workspace" data-inspected-owner={current.ownerId}>
  <details className="roof-acceptance-tag" data-d4-external-acceptance={d4ExternalAcceptance.status}>
   <summary>{d4ExternalAcceptance.label}</summary>
   <p><strong>Drawing acceptance remains OPEN.</strong> {d4ExternalAcceptance.detail} Phone checklist: user accepted.</p>
  </details>
  <nav className="roof-owner-selector" aria-label="Select locked roof owner">
   {owners.map(o=><button key={o.ownerId} type="button" onClick={()=>chooseOwner(o.ownerId)}
    className={o.ownerId===current.ownerId?'roof-owner-tab active':'roof-owner-tab'}
    aria-pressed={o.ownerId===current.ownerId}>
    <strong>{title(o.ownerId)}</strong>
    <small>{o.status==='AUTHORITATIVE'?'Locked roof geometry':'Withheld'}</small>
    <span>{o.intervals.NORTH.status==='REVIEW_REQUIRED'?'North view · review':'North view · verified'}</span>
   </button>)}
  </nav>
  <section className="roof-summary">
   <div>
    <p className="eyebrow">DESIGN 4 · {current.ownerId.toUpperCase()} · READ ONLY</p>
    <h2>{title(current.ownerId)} roof inspector</h2>
    <p>Locked 3D roof geometry: <strong>{current.status}</strong>. Visible/hidden verification is camera-specific; source locks are not engineering approval.</p>
   </div>
   <div className="roof-summary-stats">
    <div><small>Source faces</small><strong>{current.faceCount}</strong></div>
    <div><small>Derived valleys</small><strong>{current.valleyCuts.length}</strong></div>
    <div><small>Cameras with unresolved model intervals</small><strong>{flagged.length} / {VIEW_ORDER.length}</strong></div>
    <div><small>Fascia</small><strong>{current.fasciaAuthorized?'Source-authorized':'Withheld'}</strong></div>
   </div>
  </section>
  <section className="roof-review-focus">
   <div className="roof-section-heading"><div>
    <p className="eyebrow">01 · EXAMINE EDGE VISIBILITY</p>
    <h3>Source plan and visibility overlays</h3>
    </div><span className={active.status==='INTERVAL_VERIFIED'?'roof-review-status verified':'roof-review-status review'}>{active.status.replaceAll('_',' ')}</span>
   </div>
   <nav className="roof-view-tabs" aria-label="Select roof camera">
    {VIEW_ORDER.map(k=><button key={k} type="button" aria-pressed={view===k} className={view===k?'selected':''}
     onClick={()=>chooseView(k)}>{k==='AXON'?'Axon':k.charAt(0)+k.slice(1).toLowerCase()}
     {current.intervals[k].status==='REVIEW_REQUIRED'?' · Review':''}</button>)}
   </nav>
   <div className="roof-review-controls">
    <label><input type="checkbox" checked={showIds} onChange={e=>setShowIds(e.target.checked)}/> Identify edge intervals</label>
    <label><input type="checkbox" checked={focusUnresolved} onChange={e=>setFocusUnresolved(e.target.checked)}/> Emphasize unresolved</label>
    <label className="roof-edge-picker">Inspect edge
     <select value={edgeIndex} onChange={e=>{const v=Number(e.target.value);setEdgeIndex(v);if(v>=0)setShowIds(true)}}>
      <option value={-1}>Choose source edge</option>
      {plot.map((s,i)=><option key={s.faceId+'-'+i} value={i}>
       {'E'+(i+1)+' · '+s.visibility+' · '+s.faceId+' / edge '+s.edgeIndex}
      </option>)}
     </select>
    </label>
   </div>
   <div className="roof-primary-grid">
    <RoofValleyPlan faces={current.planFaces} cuts={current.valleyCuts} activeId={selectedValley}/>
    <RoofLinework title={view==='AXON'?'Axon · analytic edge intervals':view+' · analytic visible/hidden intervals'}
     segments={active.segments} status={active.status} selectedIndex={edgeIndex}
     showEdgeIds={showIds} emphasizeUnresolved={focusUnresolved}/>
   </div>
   <div className="roof-edge-evidence" aria-live="polite">
    {selectedEdge?<><strong>{'E'+(edgeIndex+1)+' · '+selectedEdge.visibility}</strong>
     <span>{'Source face: '+selectedEdge.faceId+' · Polygon edge '+selectedEdge.edgeIndex+
      ' · Parameter interval '+selectedEdge.t0.toFixed(4)+'–'+selectedEdge.t1.toFixed(4)}</span>
     <span>{selectedEdge.reason??'Analytic classification for this projection only; no independent architectural approval.'}</span></>
    :<><strong>Choose an edge to inspect source provenance</strong>
     <span>{active.status==='REVIEW_REQUIRED'?'Unresolved and edge-on geometry is retained for review. No missing segment is silently called visible.':'This model camera has verified intervals, not professional drawing approval.'}</span></>}
   </div>
   <div className="roof-view-metrics">
    <span>{'Visible '+active.counts.visible}</span><span>{'Hidden '+active.counts.hidden}</span>
    <span className="roof-unresolved">{'Unresolved '+active.counts.unresolved}</span>
    <span>{'Edge-on faces '+active.counts.edgeOnFaces}</span><span>{'Collapsed edges '+active.counts.collapsedEdges}</span>
    <span>{'Suppressed seams '+active.counts.internalSeams}</span>
   </div>
   {projectionProof?<details className="roof-edge-evidence">
    <summary>Projection evidence · {collapsed.length} edges project to points · {active.counts.internalSeams} internal seams</summary>
    <p>Zero-length projected edges produce no line stroke. Their original endpoints remain recorded below. Internal seams are suppressed only after a world-space coplanarity and opposite-side proof; shared strokes are emitted once. These are model claims, not accepted drafting.</p>
    <ul>{collapsed.map(s=><li key={s.faceId+'-'+s.edgeIndex}>{s.faceId+' / edge '+s.edgeIndex+' · source '+JSON.stringify(s.sourceA)+' → '+JSON.stringify(s.sourceB)+' · projected '+JSON.stringify(s.point)}</li>)}</ul>
   </details>:null}
  </section>
  <section className="roof-review-focus">
   <div className="roof-section-heading"><div><p className="eyebrow">02 · INTERSECT THE ACTUAL ROOF VALLEYS</p>
    <h3>Locked valley section cuts</h3>
    <p className="roof-review-note">Each cut is perpendicular to a solved valley at its midpoint, intersects source 3D roof faces, and keeps the unapproved drainage and structural boundary.</p>
   </div></div>
   {current.valleyCuts.length?<>
    <div className="roof-valley-tabs" aria-label="Highlight a source valley">
     {current.valleyCuts.map(c=><button type="button" key={c.id} aria-pressed={selectedValley===c.id} onClick={()=>setSelectedValley(c.id)}
      className={selectedValley===c.id?'selected':''}>{c.label+' · '+c.valleyMidZFt.toFixed(3)+' ft'}</button>)}
    </div>
    <div className="roof-section-grid">
     {current.valleyCuts.map(c=><RoofValleySection key={c.id} cut={c}/>)}
    </div>
    <p className="roof-review-note">The section intersection proves model surface continuity at the cut only. Valley flashing, snow loads, drainage and construction detailing still require professional review.</p>
   </>:<p className="roof-empty-valleys">No solved valley junctions are present in this locked roof owner. No artificial valley section has been generated.</p>}
  </section>
  <section className="roof-review-focus">
   <div className="roof-section-heading"><div><p className="eyebrow">03 · SOURCE MASSING CROSS-CHECK</p>
    <h3>Axonometric solved faces</h3></div></div>
   <div className="roof-source-axon"><RoofView title="Locked surface faces · reference view, not certified hidden lines" faces={current.axonFaces}/></div>
   <p className="roof-review-note">The source-face picture includes tessellation for geometry inspection. The authoritative edge-classification layer is the analytic interval drawing above. Both remain concept-only.</p>
  </section>
 </div>;
}
