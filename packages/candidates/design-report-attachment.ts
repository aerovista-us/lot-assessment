import type {CandidateRecord,PlacementComponent,PolygonComponent} from '@/packages/candidates';
import {validateDesignDocument,type DesignDocument,type P2} from '@/packages/candidates/design-document';
import {renderUniversalSolvePreview} from '@/packages/candidates/design-solution-report';
import {placementPolygon} from '@/packages/roof-geometry';
const escape=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const fmt=(v:number)=>Number(v.toFixed(3));
const points=(p:ReadonlyArray<P2>)=>p.map(x=>x.map(fmt).join(',')).join(' ');
export function renderDesignDocumentAttachment(candidate:CandidateRecord,doc:DesignDocument):string{
 validateDesignDocument(candidate,doc);
 const parcel=candidate.components.find((c):c is PolygonComponent=>c.kind==='parcel');
 if(!parcel)throw Error('Missing source parcel for draft design');
 const vertices=parcel.polygon;
 const xs=vertices.map(p=>p[0]),ys=vertices.map(p=>p[1]);
 const x0=Math.min(...xs),y0=Math.min(...ys),w=Math.max(...xs)-x0,h=Math.max(...ys)-y0;
 const view=[fmt(x0-8),fmt(y0-8),fmt(w+16),fmt(h+16)].join(' ');
 const ownerMap=new Map(candidate.components.filter((c):c is PlacementComponent=>c.kind==='home'||c.kind==='garage').map(c=>[c.id,c]));
 const base='<polygon points="'+points(parcel.polygon as P2[])+'" fill="#eef3f6" stroke="#6d8391" stroke-width=".6"/>'+
 [...ownerMap.values()].map(o=>'<polygon points="'+points(placementPolygon(o) as P2[])+'" fill="#b9cbd5" fill-opacity=".14" stroke="#536f81" stroke-width=".6"><title>'+escape(o.label)+' exact source footprint</title></polygon>').join('');
 const groups=['GROUND','UPPER','OTHER','ROOF'] as const;
 const authoredRooms=doc.shapes.filter(shape=>shape.kind==='ROOM');
 const authoredHalls=doc.shapes.filter(shape=>shape.kind==='CIRCULATION');
 const authoredDoors=doc.doors??[];
 const explanations='<section aria-label="Saved design decisions and tradeoffs">'+
  '<h3>What this saved concept proposes</h3>'+
  '<p>This revision contains '+authoredRooms.length+' drafted rooms, '+authoredHalls.length+
  ' circulation zones and '+authoredDoors.length+' proposed doorway records. These are the actual saved selections, not regenerated ranking winners.</p>'+
  (authoredRooms.length?'<p><strong>Room program:</strong> '+escape(authoredRooms.map(r=>r.label).join(' · '))+'</p>':'<p>No authored room program is attached.</p>')+
  '<p><strong>Why it matters:</strong> Room placement and hallway allocation affect access, privacy, service proximity and usable space. Ranking preferences are hypotheses, not proof that this alternative offers better living flow.</p>'+
  '<p><strong>Decision still needed:</strong> Review door placement, circulation continuity, garage access and stair evidence before considering this layout digitally validated. Physical construction acceptance requires separate professional review.</p></section>';
 const figs=groups.map(story=>{
  const items=doc.shapes.filter(s=>story==='ROOF'?s.story===null:s.story===story);
  if(!items.length)return '';
  const sorted=[...items].sort((a,b)=>(a.kind==='FLOOR_PLATE'?0:a.kind==='ROOM'?2:1)-(b.kind==='FLOOR_PLATE'?0:b.kind==='ROOM'?2:1));
  const layer=sorted.map(s=>{
   const center=s.polygon.reduce((acc,p)=>[acc[0]+p[0]/s.polygon.length,acc[1]+p[1]/s.polygon.length] as P2,[0,0] as P2);
   const isRoom=s.kind==='ROOM';
   return '<g><polygon data-design-shape="'+escape(s.id)+'" data-design-owner="'+escape(s.ownerId)+'" data-design-status="DRAFT_UNVERIFIED" points="'+points(s.polygon)+'" fill="'+(s.story===null?'#d8a46b':isRoom?'#8abfb5':'#8dbdca')+'" fill-opacity="'+(isRoom?'.55':'.2')+'" stroke="'+(s.story===null?'#9a6631':'#2d667c')+'" stroke-dasharray="1.6 1.2" stroke-width=".7"><title>'+escape(s.label)+' · '+escape(s.kind)+' · DRAFT_UNVERIFIED</title></polygon>'+
    (isRoom?'<text x="'+fmt(center[0])+'" y="'+fmt(center[1])+'" text-anchor="middle" font-size="2.6" fill="#163b4a" pointer-events="none">'+escape(s.label.slice(0,22))+'</text>':'')+'</g>';
  }).join('');
  const table='<table><thead><tr><th>Shape</th><th>Building owner</th><th>State</th></tr></thead><tbody>'+
  items.map(s=>'<tr><td>'+escape(s.label)+' ('+escape(s.kind)+')</td><td>'+escape(ownerMap.get(s.ownerId)?.label??s.ownerId)+'</td><td>DRAFT ONLY</td></tr>').join('')+'</tbody></table>';
  return '<figure class="design-attached-figure" data-design-story="'+story+'"><figcaption>'+story+' · Candidate-bound editable shape drafts</figcaption><svg role="img" aria-label="'+escape(story)+' candidate-bound source-verified XY and draft drawing shapes" viewBox="'+view+'">'+base+layer+'</svg>'+table+'</figure>';
 }).join('');
 return '<section class="card" id="attached-design" data-design-document="'+escape(doc.candidateId)+'" data-design-revision="'+doc.revision+'">'+
  '<h2>Attached universal Design Workspace geometry</h2>'+
  '<p class="source-boundary"><b>DRAFT SHAPES ONLY.</b> Floor regions and roof-zone concepts come from the shared multi-design engine, bound to this exact candidate revision. They are not room-plan closure, solved roof geometry, elevations, structure or a permit. If the source footprint changes, the attachment is rejected until reconciled.</p>'+
  '<p>Room polygons and labels are saved to this candidate revision and shown as source-contained DRAFT geometry. Adjacency does not prove door connections, travel paths, stairs or egress.</p>'+
  '<p>Source revision '+escape(doc.sourceRevision)+' · Design document revision '+doc.revision+' · '+doc.shapes.length+' editable shapes</p>'+
  explanations+'<div class="design-attached-grid">'+figs+'</div></section>'+renderUniversalSolvePreview(candidate,doc);
}
