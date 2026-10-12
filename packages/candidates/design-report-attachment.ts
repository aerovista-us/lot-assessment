import type {CandidateRecord,PlacementComponent,PolygonComponent} from '@/packages/candidates';
import {validateDesignDocument,type DesignDocument,type P2} from '@/packages/candidates/design-document';
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
 const figs=groups.map(story=>{
  const items=doc.shapes.filter(s=>story==='ROOF'?s.story===null:s.story===story);
  if(!items.length)return '';
  const layer=items.map(s=>'<polygon data-design-shape="'+escape(s.id)+'" data-design-owner="'+escape(s.ownerId)+'" data-design-status="DRAFT_UNVERIFIED" points="'+points(s.polygon)+'" fill="'+(s.story===null?'#d8a46b':'#8dbdca')+'" fill-opacity=".32" stroke="'+(s.story===null?'#9a6631':'#2d667c')+'" stroke-dasharray="1.6 1.2" stroke-width=".7"><title>'+escape(s.label)+' · '+escape(s.kind)+' · DRAFT_UNVERIFIED; not an actual room or approved roof</title></polygon>').join('');
  const table='<table><thead><tr><th>Shape</th><th>Building owner</th><th>State</th></tr></thead><tbody>'+
  items.map(s=>'<tr><td>'+escape(s.label)+' ('+escape(s.kind)+')</td><td>'+escape(ownerMap.get(s.ownerId)?.label??s.ownerId)+'</td><td>DRAFT ONLY</td></tr>').join('')+'</tbody></table>';
  return '<figure class="design-attached-figure" data-design-story="'+story+'"><figcaption>'+story+' · Candidate-bound editable shape drafts</figcaption><svg role="img" aria-label="'+escape(story)+' candidate-bound source-verified XY and draft drawing shapes" viewBox="'+view+'">'+base+layer+'</svg>'+table+'</figure>';
 }).join('');
 return '<section class="card" id="attached-design" data-design-document="'+escape(doc.candidateId)+'" data-design-revision="'+doc.revision+'">'+
  '<h2>Attached universal Design Workspace geometry</h2>'+
  '<p class="source-boundary"><b>DRAFT SHAPES ONLY.</b> Floor regions and roof-zone concepts come from the shared multi-design engine, bound to this exact candidate revision. They are not room-plan closure, solved roof geometry, elevations, structure or a permit. If the source footprint changes, the attachment is rejected until reconciled.</p>'+
  '<p>Source revision '+escape(doc.sourceRevision)+' · Design document revision '+doc.revision+' · '+doc.shapes.length+' editable shapes</p>'+
  '<div class="design-attached-grid">'+figs+'</div></section>';
}
