import type {CandidateRecord} from '@/packages/candidates';
import {placementPolygon} from '@/packages/roof-geometry';
import {solveUniversalDesign} from '@/packages/candidates/design-solving';
import {sourceBuildingOwners,type DesignDocument,type P2} from '@/packages/candidates/design-document';
const e=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const f=(n:number)=>{if(!Number.isFinite(n))throw Error('Invalid model section point');return +n.toFixed(4)};
const xy=(a:ReadonlyArray<P2>)=>a.map(p=>f(p[0])+','+f(p[1])).join(' ');
function box(a:ReadonlyArray<P2>){
 if(!a.length)throw Error('Missing drawing source');
 const x=a.map(p=>p[0]),y=a.map(p=>p[1]),minx=Math.min(...x),maxx=Math.max(...x),miny=Math.min(...y),maxy=Math.max(...y),m=Math.max(2,Math.max(maxx-minx,maxy-miny)*.08);
 return [f(minx-m),f(miny-m),f(maxx-minx+2*m),f(maxy-miny+2*m)].join(' ');
}
export function renderUniversalSolvePreview(candidate:CandidateRecord,doc:DesignDocument){
 const result=solveUniversalDesign(candidate,doc);
 const owners=new Map(sourceBuildingOwners(candidate).map(o=>[o.id,o]));
 const planCards=result.floors.filter(r=>r.story!=='STAIR_STACK').map(r=>{
  const shell=owners.get(r.ownerId);if(!shell)return '';
  const source=placementPolygon(shell) as P2[];
  const rooms=doc.shapes.filter(s=>s.ownerId===r.ownerId&&s.story===r.story&&['ROOM','CIRCULATION','STAIR_ZONE'].includes(s.kind));
  const svg='<svg role="img" aria-label="'+e(r.ownerId+' '+r.story+' model-shape adjacency')+'" viewBox="'+box(source)+'">'+
   '<polygon points="'+xy(source)+'" fill="#eff4f6" stroke="#46687a" stroke-width=".8"/>'+
   rooms.map(s=>'<polygon data-preview-room="'+e(s.id)+'" points="'+xy(s.polygon)+'" fill="'+(s.kind==='STAIR_ZONE'?'#ebc98f':'#acd2d9')+'" fill-opacity=".38" stroke="#7b9aab" stroke-width=".5"><title>'+e(s.label)+' · '+e(s.kind)+'</title></polygon>').join('')+
   r.wallSegments.map((w,i)=>'<line data-preview-shared-wall="'+i+'" x1="'+f(w.a[0])+'" y1="'+f(w.a[1])+'" x2="'+f(w.b[0])+'" y2="'+f(w.b[1])+'" stroke="#205571" stroke-width="1.8" vector-effect="non-scaling-stroke"><title>'+e(w.roomA+' / '+w.roomB)+' · '+w.lengthFt.toFixed(2)+' model feet</title></line>').join('')+
   r.doors.map(d=>'<circle data-preview-door="'+e(d.id)+'" cx="'+f(d.center[0])+'" cy="'+f(d.center[1])+'" r="1.3" fill="#fff" stroke="'+(d.status==='GEOMETRY_CHECKED'?'#23715b':'#ad642b')+'" stroke-width="1.5" vector-effect="non-scaling-stroke"><title>'+e(d.id)+' '+d.widthFt+' ft · '+e(d.reason)+'</title></circle>').join('')+'</svg>';
  return '<figure class="solved-plan"><figcaption>'+e(r.ownerId+' · '+r.story)+' · '+e(r.status)+'</figcaption>'+svg+
   '<p>'+rooms.length+' drafted zones · '+r.wallSegments.length+' modeled common walls · '+r.doors.length+' door openings.</p>'+
   r.issues.map(i=>'<p class="geometry-warning">'+e(i.code)+': '+e(i.detail)+'</p>').join('')+'</figure>';
 }).join('');
 const stairCards=result.floors.filter(f=>f.story==='STAIR_STACK').map(f=>
  '<p class="'+(f.status==='REVIEW_REQUIRED'?'geometry-warning':'')+'">'+e(f.ownerId)+' stair stack · '+e(f.status)+
  '. Model XY landing/alignment only; actual stair rise, run, headroom, egress unverified.'+
  f.issues.map(i=>' '+e(i.detail)).join('')+'</p>').join('');
 const roofs=result.roofs.map(r=>{
  const owner=owners.get(r.ownerId);if(!owner)return '';
  const shell=placementPolygon(owner) as P2[];
  const zoneShapes=doc.shapes.filter(s=>s.ownerId===r.ownerId&&s.story===null);
  const plan=r.status==='MODEL_PREVIEW'?'<svg role="img" aria-label="'+e(r.ownerId+' proposed gable roof and solved ridge preview')+'" viewBox="'+box(shell)+'">'+
   '<polygon points="'+xy(shell)+'" fill="#f4f0e8" stroke="#576b77" stroke-width=".8"/>'+
   zoneShapes.map(s=>'<polygon points="'+xy(s.polygon)+'" fill="#e7b881" fill-opacity=".15" stroke="#a87b3a" stroke-width=".5"/>').join('')+
   r.ridges.map(x=>'<line data-preview-ridge="'+e(x.zoneId)+'" x1="'+f(x.a[0])+'" y1="'+f(x.a[1])+'" x2="'+f(x.b[0])+'" y2="'+f(x.b[1])+'" stroke="#27536f" stroke-width="2.1" vector-effect="non-scaling-stroke"/>').join('')+
   (r.fascia?.status==='MODEL_PREVIEW'?r.fascia.segments:[]).map((v,i)=>
    '<line data-preview-fascia="'+i+'" x1="'+f(v.a[0])+'" y1="'+f(v.a[1])+'" x2="'+f(v.b[0])+'" y2="'+f(v.b[1])+'" stroke="#785e87" stroke-width="1.6" vector-effect="non-scaling-stroke"/>').join('')+
   r.junctions.filter(s=>s.kind==='VALLEY').map(v=>'<line data-preview-valley="'+e(v.id)+'" x1="'+f(v.a[0])+'" y1="'+f(v.a[1])+'" x2="'+f(v.b[0])+'" y2="'+f(v.b[1])+'" stroke="#ae6624" stroke-dasharray="5 4" stroke-width="2" vector-effect="non-scaling-stroke"/>').join('')+
   '</svg>':'<p class="geometry-warning">Roof topology is unsupported or inputs incomplete. No computed roof lines are shown.</p>';
  const sections=r.sections.map((s,i)=>{
   if(s.status!=='GEOMETRY_CHECKED')return '<p class="geometry-warning">Section '+(i+1)+' not drawable from these faces.</p>';
   const pts=s.segments.flatMap(x=>[[x.a[0],-x.a[1]],[x.b[0],-x.b[1]]] as P2[]);
   return '<figure class="solved-section"><figcaption>Actual source-roof cross-section '+(i+1)+' · model preview</figcaption>'+
    '<svg role="img" aria-label="'+e(r.ownerId+' source face section '+(i+1))+'" viewBox="'+box(pts)+'">'+
    s.segments.map(l=>'<line data-preview-section-face="'+e(l.faceId)+'" x1="'+f(l.a[0])+'" y1="'+f(-l.a[1])+'" x2="'+f(l.b[0])+'" y2="'+f(-l.b[1])+'" stroke="#205571" stroke-width="2" vector-effect="non-scaling-stroke"><title>'+e(l.faceId)+' · source face geometry, Z displayed upward</title></line>').join('')+'</svg></figure>';
  }).join('');
  return '<article class="solved-roof" data-preview-owner="'+e(r.ownerId)+'" data-roof-preview-status="'+r.status+'">'+
   '<h4>'+e(r.ownerId)+' · '+e(r.status)+'</h4>'+plan+
   r.ridges.map(x=>'<p>Ridge '+e(x.zoneId)+' · Z '+f(x.ridgeZFt)+' ft · plate '+f(x.plateZFt)+' ft · pitch '+f(x.pitch*12)+'/12</p>').join('')+
   r.junctions.map(x=>'<p>Computed junction '+e(x.kind)+' · '+e(x.id)+' (not drainage/structural approval)</p>').join('')+
   (r.fascia?'<p>Fascia: '+e(r.fascia.status)+' · '+r.fascia.segments.length+' source edges · '+e(r.fascia.reason)+'</p>':'')+
   r.overhangs.map(x=>'<p>Proposed overhang '+f(x.ft)+' ft on '+e(x.shapeId)+' · draft only; fascia geometry unapproved.</p>').join('')+
   r.issues.map(x=>'<p class="geometry-warning">'+e(x.code)+': '+e(x.detail)+'</p>').join('')+
   sections+'</article>';
 }).join('');
 return '<section class="card" id="model-solver-preview" data-universal-solver="'+e(result.status)+'">'+
  '<h2>Universal floor, roof and section model previews</h2>'+
  '<p class="source-boundary"><strong>MODEL VALIDATION PREVIEWS — NOT CONSTRUCTION DOCUMENTATION.</strong> Floor room relationships, common wall segments, doors, aligned stair reservations and supported centered-gable roofs derive from this exact draft source. The preliminary roof solution is NEVER added to the candidate locked roof inventory; verified customer roof authority still requires formal source locking. Wall thickness, building openings, stairs, egress, snow, roof drainage, fascia and AHJ acceptance remain separate.</p>'+
  '<div class="solver-preview-grid">'+planCards+roofs+'</div>'+stairCards+
  '<p>Report source signature matches draft revision '+doc.revision+'. '+e(result.boundary)+'</p></section>';
}
