/**
 * Customer report roof evidence gallery v3.
 *
 * Consume locked RoofDrawingHandoff only. Analytic planar interval classification
 * is geometry evidence, not professional construction / hidden-line certification.
 * Individual camera views retain REVIEW_REQUIRED when projection is ambiguous.
 */
import type {CandidateRecord, RoofComponent} from '@/packages/candidates';
import {validateCandidateRoofs} from '@/packages/roof-geometry';
import {roofDrawingHandoff,type RoofDrawingHandoff} from '@/packages/roof-geometry/drawing-contract';
import {verifyRoofEdgeIntervals,type RoofViewSpec,type EdgeInterval} from '@/packages/roof-geometry/drawing-verified-intervals';
import {deriveValleySectionCuts} from '@/packages/roof-geometry/drawing-valley-sections';
import {projectAuthorizedRoof} from '@/packages/roof-geometry/drawing-projection';

type P2=readonly [number,number];
type CameraName='NORTH'|'SOUTH'|'EAST'|'WEST'|'AXON';
type GalleryView={camera:CameraName;ownerId:string;status:'INTERVAL_VERIFIED'|'REVIEW_REQUIRED'|'WITHHELD';counts:{visible:number;hidden:number;unresolved:number;collapsedEdges:number;edgeOnFaces:number};html:string};
export type RoofGallery={status:'WITHHELD'|'REVIEW_REQUIRED'|'MODEL_GEOMETRY_LOCKED';html:string;views:GalleryView[];valleys:number;reason:string};
const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const fmt=(v:number)=>{if(!Number.isFinite(v))throw Error('Nonfinite locked drawing point');return +v.toFixed(4)};
const xyp=(p:P2)=>[fmt(p[0]),fmt(p[1])].join(',');
const extent=(p:ReadonlyArray<P2>,padRatio=.08)=>{
 if(p.length<2||p.some(q=>q.length!==2||!q.every(Number.isFinite)))throw Error('Invalid locked roof drawing extent');
 const a=Math.min(...p.map(x=>x[0])),b=Math.max(...p.map(x=>x[0]));
 const c=Math.min(...p.map(x=>x[1])),d=Math.max(...p.map(x=>x[1]));
 const w=Math.max(b-a,1),h=Math.max(d-c,1),pad=Math.max(1,Math.max(w,h)*padRatio);
 return [fmt(a-pad),fmt(c-pad),fmt(w+2*pad),fmt(h+2*pad)].join(' ');
};
const emptyReason=(s:string)=>'<p class="roof-evidence-empty">'+esc(s)+'</p>';
function roofView(roof:RoofDrawingHandoff,camera:CameraName):GalleryView{
 const view:RoofViewSpec=camera==='AXON'?{kind:'AXON',azimuth:Math.PI/4,elevation:Math.PI/6}:{kind:'ELEVATION',view:camera};
 const result=verifyRoofEdgeIntervals(roof,view);
 const baseCounts={visible:result.counts.visible,hidden:result.counts.hidden,unresolved:result.counts.unresolved,collapsedEdges:result.counts.collapsedEdges,edgeOnFaces:result.counts.edgeOnFaces};
 if(result.status==='WITHHELD')return {camera,ownerId:roof.ownerId,status:'WITHHELD',counts:baseCounts,html:emptyReason(result.reason)};
 const strokes=result.segments.filter(s=>s.visibility==='VISIBLE'||s.visibility==='HIDDEN'||s.visibility==='UNRESOLVED');
 if(!strokes.length)return {camera,ownerId:roof.ownerId,status:'REVIEW_REQUIRED',counts:baseCounts,html:emptyReason('No independently drawable intervals for this view; source geometry requires review.')};
 // The source verifier uses +Z up, while SVG screen Y increases downward.
 // Negate chart ordinate only for elevation/axon DISPLAY; never alter source
 // world XYZ, the site-plan +Y-down convention, or any interval authority.
 const points=strokes.flatMap(s=>[s.start,s.end]).map(([u,v])=>[u,-v] as P2);
 const svg='<svg role="img" aria-label="'+esc(roof.ownerId+' '+camera+' source roof visible/hidden/unresolved intervals')+'" viewBox="'+extent(points)+'">'+
 strokes.map((s:EdgeInterval,i)=>{
  const cls=s.visibility==='UNRESOLVED'?'unresolved':s.visibility==='HIDDEN'?'hidden':'visible';
  return '<line data-roof-edge="'+esc(s.faceId)+'-'+s.edgeIndex+'-'+i+'" data-interval-status="'+s.visibility+'"'+
   ' x1="'+fmt(s.start[0])+'" y1="'+fmt(-s.start[1])+'" x2="'+fmt(s.end[0])+'" y2="'+fmt(-s.end[1])+'" class="roof-int-'+cls+'">'+
   '<title>'+esc(s.faceId+' edge '+s.edgeIndex+' · '+s.visibility+(s.reason?' · '+s.reason:''))+'</title></line>';
 }).join('')+'</svg>';
 const status=result.status;
 const summary='<p class="roof-evidence-stats">Visible '+baseCounts.visible+' · Hidden '+baseCounts.hidden+
  ' · Unresolved '+baseCounts.unresolved+' · Collapsed edges '+baseCounts.collapsedEdges+
  ' · Edge-on faces '+baseCounts.edgeOnFaces+'</p>';
 return {camera,ownerId:roof.ownerId,status,counts:baseCounts,html:svg+summary};
}
function valleySection(roof:RoofDrawingHandoff){
 const cuts=deriveValleySectionCuts(roof);
 return cuts.map(cut=>{
  const bad=cut.status!=='SOURCE_INTERSECTION';
  const segs=bad?[]:cut.segments;
  const pts=segs.flatMap(s=>[s.a,s.b]).map(([distance,z])=>[distance,-z] as P2);
  return '<article class="roof-valley-card" data-roof-valley="'+esc(cut.sourceId)+'" data-section-status="'+cut.status+'">'+
   '<h4>'+esc(roof.ownerId)+' · '+esc(cut.label)+'</h4>'+
   '<p>Midpoint source XY '+cut.origin.map(fmt).join(', ')+' ft · Locked Z '+fmt(cut.valleyMidZFt)+' ft</p>'+
   (bad?emptyReason('Section REVIEW REQUIRED: two locked faces did not prove a valid source intersection.') :
    '<svg role="img" aria-label="'+esc(cut.label+' precise locked roof face profile')+'" viewBox="'+extent(pts,0.15)+'">'+
    segs.map((s,i)=>'<line data-section-face="'+esc(s.faceId)+'" x1="'+fmt(s.a[0])+'" y1="'+fmt(-s.a[1])+
     '" x2="'+fmt(s.b[0])+'" y2="'+fmt(-s.b[1])+'" stroke="'+(i%2?'#507b90':'#215671')+'" stroke-width=".14">'+
     '<title>'+esc(s.faceId)+' actual roof plane / cut</title></line>').join('')+'</svg>')+
   '<p class="roof-evidence-stats">'+esc(cut.status)+' · '+esc(cut.reason)+' · Drainage, flashing and structural review outstanding.</p></article>';
 }).join('');
}
export function buildReportRoofGallery(candidate:CandidateRecord):RoofGallery{
 const roofs=candidate.components.filter((p):p is RoofComponent=>p.kind==='roof');
 if(!roofs.length)return {status:'WITHHELD',html:emptyReason('No roof source exists for this candidate revision. Author, solve and lock owner-specific roof zones first.'),views:[],valleys:0,reason:'Missing candidate roof authoring'};
 const results=validateCandidateRoofs(candidate.components).results;
 // Fail whole report gallery closed if ANY roof owner is stale or invalid.
 if(results.length!==roofs.length||!results.length||results.some(r=>!r.authoritative||!r.safe||!r.ownerGeometryCurrent||r.errors.length))
  return {status:'REVIEW_REQUIRED',html:emptyReason('Roof geometry exists but one or more owners are unlocked, stale or invalid. No roof projection is published.'),views:[],valleys:0,reason:'Roof source owner lock / solver validation failed'};
 const handoffs=results.map(roofDrawingHandoff);
 if(handoffs.some(h=>h.status!=='AUTHORITATIVE'))
  return {status:'REVIEW_REQUIRED',html:emptyReason('Roof drawing handoff withheld; no output is promoted.'),views:[],valleys:0,reason:'Roof drawing handoff withheld'};
 const owners:RoofDrawingHandoff[]=handoffs;
 const views:GalleryView[]=[];
 let valleyCount=0;
 const articles=owners.map(roof=>{
  const plan=projectAuthorizedRoof(roof,'PLAN');
  if(plan.status!=='DRAWABLE')throw Error('Locked roof plan projection withheld');
  const planPts=plan.faces.flatMap(f=>f.points);
  const planSvg='<svg role="img" aria-label="'+esc(roof.ownerId+' source roof face plan')+'" viewBox="'+extent(planPts)+'">'+
   plan.faces.map(f=>'<polygon points="'+f.points.map(xyp).join(' ')+'" data-roof-face="'+esc(f.id)+'" class="roof-surface-plan"><title>'+esc(f.zoneId)+' locked polygon face</title></polygon>').join('')+'</svg>';
  const ownerViews=(['NORTH','SOUTH','EAST','WEST','AXON'] as const).map(cam=>roofView(roof,cam));
  views.push(...ownerViews);
  const cuts=deriveValleySectionCuts(roof);valleyCount+=cuts.length;
  const viewCards=ownerViews.map(v=>'<figure class="roof-interval-figure" data-roof-camera="'+v.camera+'" data-camera-status="'+v.status+'">'+
    '<figcaption>'+v.camera+' · '+v.status.replaceAll('_',' ')+' · Z-up display</figcaption>'+v.html+'</figure>').join('');
  return '<section class="roof-owner-evidence" data-roof-owner="'+esc(roof.ownerId)+'">'+
   '<h3>'+esc(roof.ownerId)+' · locked model surfaces</h3>'+
   '<p>Owner roof source: '+esc(roof.roofId)+'. Plan shapes are source-bound; camera intervals may still be ambiguous.</p>'+
   '<div class="roof-gallery-plan"><figure class="roof-interval-figure"><figcaption>Source surface plan · triangles are not necessarily roof outline seams</figcaption>'+planSvg+'</figure></div>'+
   '<div class="roof-elevation-gallery">'+viewCards+'</div>'+
   (cuts.length?'<h4>Source-intersection valley section review</h4><div class="roof-valley-grid">'+valleySection(roof)+'</div>':'<p>No modeled valley sections for this roof owner.</p>')+
   '</section>';
 });
 const requiresReview=views.some(x=>x.status!=='INTERVAL_VERIFIED');
 const banner='<div class="roof-gallery-authority" data-gallery-authority="'+(requiresReview?'REVIEW_REQUIRED':'MODEL_INTERVALS_VERIFIED')+'">'+
   'SOURCE-LOCKED ROOF MODEL · '+(requiresReview?'CAMERA AMBIGUITIES REQUIRE REVIEW':'ANALYTIC INTERVALS VERIFIED AGAINST MODEL')+
   '. Concept-only evidence; NOT an architect-certified roof or construction drawing. Professional drainage, structural, flashing and code checks remain open.'+
   '</div>';
 const legend='<p class="roof-line-legend"><span>━ Visible</span><span>┄ Hidden</span><span>┈ Unresolved</span></p>';
 return {status:'MODEL_GEOMETRY_LOCKED',html:banner+legend+articles.join(''),views,valleys:valleyCount,
  reason:requiresReview?'At least one model camera needs edge-on/unresolved line review':'Analytic view intervals model-verified only; no professional design acceptance'};
}
