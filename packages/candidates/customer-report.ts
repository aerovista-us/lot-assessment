import {currentEvaluation,type CandidateRecord,type PolygonComponent,type PlacementComponent} from '@/packages/candidates';
import {signedPolygonArea} from '@/packages/candidates/geometry-integrity';
import {validateCandidateRoofs,roofPlanSegments} from '@/packages/roof-geometry';
import {getPlacementFootprint,drawBuildingShellPlan,drawAccessPlan,drawSchematicAxon,drawFourShellElevations} from '@/packages/candidates/customer-report-views';

type Status='SOURCE_BOUND'|'MODEL_VERIFIED'|'ILLUSTRATIVE'|'REVIEW_REQUIRED'|'WITHHELD';
const standard='pondy-customer-report-standard-v1';
const catalog=[
 ['executiveHero','Visual hero and decision status','Overview'],
 ['drawingGuide','How to read drawings and model directions','Overview'],
 ['sitePlan','Detailed source-coordinated site plan','Site'],
 ['siteAssumptions','Parcel, setbacks and street orientation evidence','Site'],
 ['groundPlan','Ground floor and garage relationships','Floor plans'],
 ['upperPlan','Upper floor and stairs','Floor plans'],
 ['bubbleDiagram','Room adjacency and bubble diagram','Floor plans'],
 ['areaSchedule','Home, garage and room area schedule','Floor plans'],
 ['elevations','Four comparable elevations','Architectural views'],
 ['materials','Appearance and material intent','Architectural views'],
 ['sections','Longitudinal and transverse sections','Architectural views'],
 ['roof','Roof geometry, junctions and fascia','Architectural views'],
 ['axon','Architectural axonometric massing','Architectural views'],
 ['circulation','Inbound, outbound and garage maneuver evidence','Access'],
 ['pedestrianAccess','Owner, walking and service access','Access'],
 ['dimensions','Architectural dimensions and sheet scales','Technical'],
 ['comparison','Side-by-side alternative comparison','Technical'],
 ['fieldNotes','Contractor and trade coordination','Technical'],
 ['evaluation','Machine gate evidence and blockers','Technical'],
 ['sheetIndex','Drawing index and deliverable status','Handoff'],
 ['sourceProvenance','Candidate source, revision and hashes','Handoff'],
 ['nextSteps','Next decisions and professional boundary','Handoff']
] as const;
export const REPORT_FEATURE_IDS=catalog.map(c=>c[0]);
const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const fmt=(n:number)=>Number.isFinite(n)?Number(n.toFixed(2)):0;
const xy=(p:readonly[number,number])=>{if(!Number.isFinite(p[0])||!Number.isFinite(p[1]))throw Error('Invalid source point');return fmt(p[0])+','+fmt(p[1]);};
function shape(c:PlacementComponent):ReadonlyArray<readonly[number,number]>{
 if(!(c.widthFt>0&&c.depthFt>0))throw Error('Invalid building footprint');
 const ps=c.polygon?.length?c.polygon:[[c.x,c.y],[c.x+c.widthFt,c.y],[c.x+c.widthFt,c.y+c.depthFt],[c.x,c.y+c.depthFt]];
 if(ps.length<3||Math.abs(signedPolygonArea(ps as [number,number][]))<.01)throw Error('Degenerate building footprint');
 const deg=(c.rotationDeg||0)*Math.PI/180,midX=c.x+c.widthFt/2,midY=c.y+c.depthFt/2;
 return ps.map(([x,y])=>[midX+(x-midX)*Math.cos(deg)-(y-midY)*Math.sin(deg),midY+(x-midX)*Math.sin(deg)+(y-midY)*Math.cos(deg)]);
}
function drawSite(c:CandidateRecord){
 const parcel=c.components.find((p):p is PolygonComponent=>p.kind==='parcel');
 if(!parcel||parcel.polygon.length<3||Math.abs(signedPolygonArea(parcel.polygon))<1)throw Error('Cannot issue customer report without source parcel');
 const bounds=parcel.polygon,minX=Math.min(...bounds.map(p=>p[0])),maxX=Math.max(...bounds.map(p=>p[0])),minY=Math.min(...bounds.map(p=>p[1])),maxY=Math.max(...bounds.map(p=>p[1]));
 const margin=7;
 let out='<svg role="img" aria-label="Source LotScope site coordinates; +X right and +Y down" viewBox="'+[minX-margin,minY-margin,maxX-minX+2*margin,maxY-minY+2*margin].join(' ')+'">';
 for(const part of c.components){
  if(part.kind==='parcel'||part.kind==='envelope'||part.kind==='pavement'){
   if(part.polygon.some(p=>p.some(v=>!Number.isFinite(v))))throw Error('Invalid '+part.id);
   out+='<polygon data-component="'+esc(part.id)+'" points="'+part.polygon.map(xy).join(' ')+'" class="'+part.kind+'"/>';
  }else if(part.kind==='home'||part.kind==='garage'){
   out+='<polygon data-component="'+esc(part.id)+'" points="'+shape(part).map(xy).join(' ')+'" class="'+part.kind+'"/>';
  }else if(part.kind==='driveway'||part.kind==='route'){
   if(part.points.length<2)throw Error('Invalid route');
   out+='<polyline data-component="'+esc(part.id)+'" points="'+part.points.map(xy).join(' ')+'" class="drive"/>';
  }
 }
 return out+'</svg>';
}
export type ReportFeature={id:string;title:string;group:string;status:Status;explanation:string};
export async function createCandidateConceptHtml(candidate:CandidateRecord){
 if(!candidate?.id||!candidate.revisionLabel||!Array.isArray(candidate.components))throw Error('Saved candidate missing');
 const site=drawSite(candidate);
 const shell=drawBuildingShellPlan(candidate);
 const access=drawAccessPlan(candidate);
 const axon=drawSchematicAxon(candidate);
 const elevations=drawFourShellElevations(candidate);
 const bytes=new TextEncoder().encode(JSON.stringify(candidate));
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 const sha=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
 const ev=currentEvaluation(candidate),isCurrent=candidate.evidenceState==='CURRENT'&&Boolean(ev);
 const owners=candidate.components.filter((p):p is PlacementComponent=>p.kind==='home'||p.kind==='garage');
 const paths=candidate.components.filter(p=>p.kind==='driveway'||p.kind==='route');
 const roofs=candidate.components.filter(p=>p.kind==='roof');
 const roofResults=roofs.length?validateCandidateRoofs(candidate.components).results:[];
 const solved=roofs.length>0&&roofResults.length===roofs.length&&roofResults.every(r=>r.authoritative);
 const roofState:Status=solved?'MODEL_VERIFIED':roofs.length?'REVIEW_REQUIRED':'WITHHELD';
 const available:Record<string,Status>={
  executiveHero:'SOURCE_BOUND',drawingGuide:'SOURCE_BOUND',sitePlan:'SOURCE_BOUND',siteAssumptions:'REVIEW_REQUIRED',
  groundPlan:owners.length?'REVIEW_REQUIRED':'WITHHELD',upperPlan:'WITHHELD',bubbleDiagram:'WITHHELD',
  areaSchedule:owners.length?'SOURCE_BOUND':'WITHHELD',elevations:owners.length?'ILLUSTRATIVE':'WITHHELD',materials:'WITHHELD',sections:'WITHHELD',
  roof:roofState,axon:owners.length?'ILLUSTRATIVE':'WITHHELD',circulation:paths.length?'REVIEW_REQUIRED':'WITHHELD',
  pedestrianAccess:'WITHHELD',dimensions:'REVIEW_REQUIRED',comparison:'WITHHELD',fieldNotes:'REVIEW_REQUIRED',
  evaluation:isCurrent?'SOURCE_BOUND':'REVIEW_REQUIRED',sheetIndex:'SOURCE_BOUND',sourceProvenance:'SOURCE_BOUND',nextSteps:'SOURCE_BOUND'
 };
 const notes:Record<string,string>={
  executiveHero:'Recorded candidate status only; no permit, structural or professional acceptance implied.',
  drawingGuide:'Positive model X right and Y down, matching the Workbench view. No inferred compass bearings.',
  sitePlan:'Source-bound parcel, envelope, homes, garages, and drive control points shown below.',
  siteAssumptions:'Parcel facts, street identity, easements and setbacks still require independent survey and jurisdiction checks.',
  groundPlan:'Only footprint shells and garages exist; not actual rooms, internal walls, entries or stairs.',
  upperPlan:'Upper-floor room layouts and stairs have not been authored for this candidate.',
  bubbleDiagram:'No verified room adjacency program or planning bubbles exist.',
  areaSchedule:'Footprint areas can be computed, but gross shell area is not net living space or permitted area.',
  elevations:'Four model-direction profile STUDIES are generated from source horizontal footprints with normalized graphic height. These are NOT architectural elevations; actual vertical heights, roof outlines, windows and materials remain withheld.',
  materials:'Siding, facade, windows, foundations and finishes are not defined in the saved candidate.',
  sections:'Real section cuts require building/floor Z datums and valid roof intersections; withheld.',
  roof:solved?'Current source roof-owner locks and geometry solver pass. No drainage, structural, fascia or AHJ approval.':roofs.length?'Roof components exist but fail a complete locked-source roof verification; review required.':'No source-authoritative roof components exist for this saved revision. Do not generate a guessed ridge or roof.',
  axon:'A wireframe axon is generated from exact building footprints with explicitly illustrative graphic height and no inferred roof. A verified architectural axon still requires floor heights, roof faces and openings.',
  circulation:'Drive centerlines alone do not prove a complete inbound/outbound swept-path clearance.',
  pedestrianAccess:'No separate verified pedestrian, accessible entry or service circulation plan provided.',
  dimensions:'Source XY coordinates exist; paper scales, full architectural dimensions and witness-line QA are pending.',
  comparison:'Design 1–4 are context only until metrics, identical parcel facts and exact revisions can be compared.',
  fieldNotes:'Coordinate driveway clearances, snow/drainage, utility easements, openings, structure and constructability.',
  evaluation:isCurrent?'The active machine evaluation is attached; not equivalent to a permit or buildability certification.':'The saved evaluation is stale or unavailable. No old pass may be promoted to current.',
  sheetIndex:'All 22 report categories are registered; gaps remain visible.',
  sourceProvenance:'Candidate ID, revision and SHA-256 of the exact saved candidate JSON are bound to this report.',
  nextSteps:'Author floor programs and verified roof zones; rerun circulation and roof drawing authority; generate full sheet set and professional review.'
 };
 const features:ReportFeature[]=catalog.map(([id,title,group])=>({id,title,group,status:available[id],explanation:notes[id]}));
 if(features.length!==22||features.some(x=>!x.explanation||!x.status))throw Error('Report coverage gate failed');
 const perGroup=[...new Set(features.map(x=>x.group))].map(group=>'<section class="card"><h2>'+esc(group)+'</h2>'+
  features.filter(x=>x.group===group).map(x=>'<article class="feature" data-report-feature="'+x.id+'" data-feature-state="'+x.status+'"><h3>'+esc(x.title)+'</h3><strong>'+x.status.replaceAll('_',' ')+'</strong><p>'+esc(x.explanation)+'</p></article>').join('')+'</section>').join('');
 let roofDrawing='';
 if(solved){
  const lines=roofResults.flatMap(r=>roofPlanSegments(r)).map(s=>'<line x1="'+fmt(s.a[0])+'" y1="'+fmt(s.a[1])+'" x2="'+fmt(s.b[0])+'" y2="'+fmt(s.b[1])+'" stroke="'+(s.derived?'#ad7425':'#345a6e')+'" stroke-width=".7"/>').join('');
  const par=candidate.components.find((p):p is PolygonComponent=>p.kind==='parcel')!;
  const xx=par.polygon.map(p=>p[0]),yy=par.polygon.map(p=>p[1]);
  roofDrawing='<svg role="img" aria-label="Verified source roof plan segments, not engineering approval" viewBox="'+[Math.min(...xx)-7,Math.min(...yy)-7,Math.max(...xx)-Math.min(...xx)+14,Math.max(...yy)-Math.min(...yy)+14].join(' ')+'">'+lines+'</svg>';
 }
 const areaRows=owners.map(o=>'<tr><td>'+esc(o.label)+'</td><td>'+o.kind+'</td><td>'+Math.abs(signedPolygonArea(shape(o) as [number,number][])).toFixed(1)+' sq ft</td></tr>').join('');
 const gates=ev&&isCurrent?ev.gates.map(g=>'<tr><td>'+esc(g.label)+'</td><td>'+esc(g.status)+'</td><td>'+esc(g.summary)+'</td></tr>').join(''):'<tr><td colspan="3">Current evaluation unavailable. Historic results are not promoted.</td></tr>';
 const css='*{box-sizing:border-box}body{margin:0;color:#1d3444;background:#eef3f6;font:15px system-ui,sans-serif}header{background:#102939;color:#fff;padding:32px max(20px,calc((100vw - 1100px)/2))}h1{font-size:clamp(28px,4vw,46px);line-height:1.1}header p{color:#dce7ef;max-width:850px}main{max-width:1140px;margin:0 auto;padding:18px}.grid{display:grid;grid-template-columns:1.5fr 1fr;gap:18px}.card{min-width:0;background:#fff;border:1px solid #cbd7df;border-radius:12px;padding:18px;margin-bottom:18px}svg{width:100%;height:auto;background:#f9fbfc;border:1px solid #cbd6df}.parcel{fill:#edf2f5;stroke:#29465a;stroke-width:.55}.envelope{fill:#e8d6a2;fill-opacity:.18;stroke:#b78a4d;stroke-dasharray:2 1}.home{fill:#a9c6da;stroke:#356387;stroke-width:.5}.garage{fill:#edcd9b;stroke:#9c793d;stroke-width:.5}.pavement{fill:#a8b7be;fill-opacity:.55;stroke:#9da7aa}.drive{fill:none;stroke:#247b64;stroke-width:.8;stroke-dasharray:2 1}.feature{border-top:1px solid #e0e7ed;padding:14px 0}.feature strong{font-size:12px;color:#9b581a}.feature p{font-size:13px;line-height:1.5}.banner{background:#fef2e0;color:#5f3510;padding:12px;border-left:4px solid #b27d31}table{border-collapse:collapse;width:100%}td,th{text-align:left;border-bottom:1px solid #d4dee5;padding:9px;font-size:12px;overflow-wrap:anywhere}.hash{overflow-wrap:anywhere;font:11px monospace}footer{text-align:center;padding:24px;background:#102939;color:#fff} @media(max-width:780px){.grid{grid-template-columns:1fr}header{padding:25px 18px}}@media print{body{background:white}header{background:white;color:black;padding:10px}header p{color:#333}.grid{display:block}.card{break-inside:avoid}footer{background:white;color:black}}';
 const richCss='.architectural-study{margin:0}.architectural-study figcaption{display:flex;flex-wrap:wrap;gap:7px;align-items:baseline;justify-content:space-between;font-size:14px;font-weight:700;margin-bottom:10px}.architectural-study figcaption span{font-weight:400;font-size:11px;color:#587283;line-height:1.5;max-width:560px}.architectural-study svg{max-height:590px;border-radius:8px}.architectural-study[data-drawing^="elevation-"] svg{max-height:200px}.study-parcel{fill:#eef3f6;stroke:#597384;stroke-width:.6}.study-home{fill:#abc8db;stroke:#355f7b;stroke-width:.7}.study-garage{fill:#f1cc8b;stroke:#96672c;stroke-width:.7}.study-route{fill:none;stroke:#1b8167;stroke-width:1.3;stroke-dasharray:2.5 1.6}.axon-site{fill:#eff4f6;stroke:#526b79;stroke-width:1}.study-elevation-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.report-nav{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px}.report-nav a,.report-nav button{background:#285266;color:white;border:1px solid #668b9c;border-radius:6px;padding:10px 12px;cursor:pointer;font-size:12px;text-decoration:none}.drawing-status{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid #e2e7eb;font-size:12px}.drawing-status strong{font-size:11px;color:#78450d;white-space:nowrap}.source-boundary{border-left:4px solid #b4782d;background:#fff7e9;padding:13px 15px;font-size:12px;line-height:1.5}.picture-note{font-size:12px;line-height:1.5;color:#526b7a}.review-emphasis{color:#8c4918;font-weight:700}.disclaimer-top{color:#ffe3b6!important;font-weight:700}.print-only{display:none}@media(max-width:780px){.study-elevation-grid{grid-template-columns:1fr}.architectural-study figcaption{display:block}.report-nav{gap:5px}.report-nav a,.report-nav button{padding:9px}}@media print{.report-nav{display:none}.study-elevation-grid{display:grid;grid-template-columns:1fr 1fr}.architectural-study,.card{break-inside:avoid}.print-only{display:block}.architectural-study svg{max-height:375px}.review-emphasis{color:#5a391e}}';
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(candidate.label)+' · Concept report</title><style>'+css+richCss+'</style></head>'+
 '<body data-report-standard="'+standard+'" data-source-sha256="'+sha+'"><header><p>LOTSCOPE · DESIGN EXPLORATION · SOURCE-BOUND CUSTOMER REPORT</p><h1>'+esc(candidate.label)+'</h1><p>Start with the modeled lot and building arrangement, then explore source-bound planning drawings and provisional architectural studies. Report coverage does not imply the existence of a complete design set.</p><p><strong>'+esc(candidate.revisionLabel)+' · '+esc(candidate.status)+' · '+esc(candidate.evidenceState)+'</strong></p><p class="disclaimer-top">CONCEPT ONLY — NOT FOR CONSTRUCTION · No unverified roof or building heights are invented.</p><div class="report-nav"><a href="#site">Site</a><a href="#massing">Massing</a><a href="#projections">Four views</a><a href="#access">Circulation</a><a href="#roof">Roof status</a><a href="#evaluation">Evidence</a><a href="#drawing-index">Sheet index</a><a href="#coverage">All 22 categories</a><button type="button" onclick="window.print()">Print / Save PDF</button></div></header><main>'+
 '<div class="grid"><section class="card" id="site"><h2>A-001 · Source-coordinated site plan</h2>'+site+'<p class="picture-note">Locked orientation: positive model X right and positive model Y down. Parcel jog and original building handedness retained; no surveyed compass direction inferred.</p></section>'+
 '<section class="card"><h2>Evaluation summary</h2><p class="banner">'+esc(candidate.classificationReason)+'</p><p><b>Source footprint areas (not living floor areas)</b></p><table><tbody>'+areaRows+'</tbody></table><p>Home and garage footprint areas may overlap; do not sum them as total building or living space. Recorded status is not a permit or structural approval.</p></section></div>'+
 '<section class="card" id="massing"><h2>A-401 · Schematic axonometric massing</h2><p class="source-boundary"><b>Illustrative vertical geometry only.</b> The horizontal footprints come from saved source polygons. Dashed tops are NOT roofs; graphic heights are not feet, actual floors, wall heights and roof structure are not defined.</p>'+axon+'</section>'+
 '<div class="grid"><section class="card" id="shells"><h2>A-101 · Building-shell and integrated garage plan</h2>'+shell+'<p class="picture-note">This is a footprint study, not an architectural room plan. Garage areas overlap the home shell footprints and must not be added twice.</p></section><section class="card" id="access"><h2>A-501 · Modeled circulation</h2>'+access+'<p class="review-emphasis">Recorded route centerlines are not approved turning movements. Exact outbound and obstacle clearance remain a distinct verification gate.</p></section></div>'+
 '<section class="card" id="projections"><h2>A-201–A-204 · Model-direction projection studies</h2><p class="source-boundary">These four views communicate the <b>source-accurate horizontal span</b> of building components. Dashed tops and graphic wall heights are illustrative—not actual architectural elevations, roof profiles, elevations above datum, or an approved facade design.</p><div class="study-elevation-grid">'+elevations+'</div></section>'+
 '<div class="grid"><section class="card" id="roof"><h2>A-301 · Roof authority</h2><p class="banner">'+roofState+' — '+esc(notes.roof)+'</p>'+roofDrawing+'</section>'+
 '<section class="card"><h2>Missing drawing authority</h2><p>No approved room layouts, floor elevations, roof-derived elevations or architectural sections are inferred from a flat site concept. Develop these in Workbench, then regenerate.</p></section></div>'+
 '<section class="card" id="drawing-index"><h2>Drawing set and authority index</h2>'+
 '<div class="drawing-status"><span>A-001 · Parcel/site coordination</span><strong>SOURCE-BOUND CONCEPT</strong></div>'+
 '<div class="drawing-status"><span>A-101 · Shells and integrated garages</span><strong>SOURCE-BOUND FOOTPRINTS</strong></div>'+
 '<div class="drawing-status"><span>A-201–204 · Four model-direction profiles</span><strong>ILLUSTRATIVE ONLY</strong></div>'+
 '<div class="drawing-status"><span>A-301 · Roof, ridges, eaves, valleys</span><strong>'+roofState+'</strong></div>'+
 '<div class="drawing-status"><span>A-401 · Wireframe axon / massing</span><strong>ILLUSTRATIVE ONLY</strong></div>'+
 '<div class="drawing-status"><span>A-501 · Access centerline study</span><strong>REVIEW REQUIRED</strong></div>'+
 '<div class="drawing-status"><span>A-102 · Actual room/floor plan</span><strong>WITHHELD</strong></div>'+
 '<div class="drawing-status"><span>A-302 · True longitudinal/transverse sections</span><strong>WITHHELD</strong></div>'+
 '<p class="picture-note">All views use the same candidate source revision and SHA-256. No physical plot scale or professional authorization is implied.</p></section>'+
 '<section class="card" id="evaluation"><h2>Current evidence gates</h2><table><thead><tr><th>Gate</th><th>Status</th><th>Result</th></tr></thead><tbody>'+gates+'</tbody></table></section>'+
 '<h2 id="coverage">Unified customer report · all 22 required topics</h2><p>Every unsupported view is shown as WITHHELD or REVIEW REQUIRED rather than silently omitted.</p>'+perGroup+
 '<section class="card"><h2>Source provenance</h2><p>Candidate '+esc(candidate.id)+' · Revision '+esc(candidate.revisionLabel)+'</p><p class="hash">SHA-256 '+sha+'</p><p>Locally generated. No server-side upload, public publishing, or paid entitlement was created.</p></section></main>'+
 '<footer>CONCEPT ONLY — NOT FOR CONSTRUCTION · Saved candidate report, not a completed architectural drawing set.</footer></body></html>';
 if((html.match(/data-report-feature=/g)||[]).length!==22)throw Error('Report HTML missing mandatory sections');
 return {html,sha,features,roofState};
}
