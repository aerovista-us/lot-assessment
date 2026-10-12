import type {CandidateRecord,PlacementComponent,PolygonComponent,PathComponent} from '@/packages/candidates';
import {signedPolygonArea} from '@/packages/candidates/geometry-integrity';

/** Schematic views consume immutable footprint vertices. They never author
 * missing wall heights, roofs, openings, structural/drainage data or bearings.
 * +X points right and +Y down in model/site view. */
type P = readonly [number,number];
type Foot={id:string;label:string;kind:'home'|'garage';points:P[]};
const finite=(n:number)=>typeof n==='number'&&Number.isFinite(n);
const n=(v:number)=>Number(v.toFixed(3));
const safe=(s:unknown)=>String(s??'').replace(/[&<>"']/g,t=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[t]!));
const pair=(p:P)=>{if(!p||!finite(p[0])||!finite(p[1]))throw Error('Invalid candidate source coordinate');return [n(p[0]),n(p[1])] as P};
const points=(pts:ReadonlyArray<P>)=>pts.map(p=>pair(p).join(',')).join(' ');
const box=(pts:ReadonlyArray<P>)=>({
 x0:Math.min(...pts.map(p=>p[0])),x1:Math.max(...pts.map(p=>p[0])),
 y0:Math.min(...pts.map(p=>p[1])),y1:Math.max(...pts.map(p=>p[1]))
});
function boundsView(pts:ReadonlyArray<P>,pad=7){const a=box(pts);return [n(a.x0-pad),n(a.y0-pad),n(a.x1-a.x0+2*pad),n(a.y1-a.y0+2*pad)].join(' ')}
function validatePolygon(poly:ReadonlyArray<P>,id:string){
 if(!Array.isArray(poly)||poly.length<3||poly.some(p=>!Array.isArray(p)||p.length!==2||!finite(p[0])||!finite(p[1]))||Math.abs(signedPolygonArea(poly as [number,number][]))<.001)throw Error('Degenerate/invalid candidate polygon '+id);
 return poly;
}
export function getPlacementFootprint(c:PlacementComponent):P[]{
 if(!finite(c.x)||!finite(c.y)||!(c.widthFt>0)||!(c.depthFt>0)||!finite(c.rotationDeg??0))throw Error('Invalid placement '+c.id);
 const p: ReadonlyArray<P>=c.polygon?.length?c.polygon:[[c.x,c.y],[c.x+c.widthFt,c.y],[c.x+c.widthFt,c.y+c.depthFt],[c.x,c.y+c.depthFt]];
 validatePolygon(p,c.id);
 const angle=(c.rotationDeg??0)*Math.PI/180,cx=c.x+c.widthFt/2,cy=c.y+c.depthFt/2;
 const out=p.map(([x,y])=>[cx+(x-cx)*Math.cos(angle)-(y-cy)*Math.sin(angle),cy+(x-cx)*Math.sin(angle)+(y-cy)*Math.cos(angle)] as P);
 validatePolygon(out,c.id);
 return out;
}
export function getReportFootprints(c:CandidateRecord):Foot[]{
 return c.components.filter((p):p is PlacementComponent=>p.kind==='home'||p.kind==='garage').map(p=>({
  id:p.id,label:p.label,kind:p.kind,points:getPlacementFootprint(p)
 }));
}
function sourceParcel(c:CandidateRecord):ReadonlyArray<P>{
 const p=c.components.find((x):x is PolygonComponent=>x.kind==='parcel');
 if(!p)throw Error('No source parcel: drawing withheld');
 return validatePolygon(p.polygon,p.id);
}
function wrapDrawing(kind:string,label:string,view:string,content:string,legend:string){
 return '<figure class="architectural-study" data-drawing="'+kind+'"><figcaption><strong>'+safe(label)+'</strong><span>'+safe(legend)+'</span></figcaption>'+
 '<svg viewBox="'+view+'" role="img" aria-label="'+safe(label)+': '+safe(legend)+'">'+content+'</svg></figure>';
}
function pathPolyline(c:PathComponent){
 if(!Array.isArray(c.points)||c.points.length<2||c.points.some(p=>!Array.isArray(p)||!finite(p[0])||!finite(p[1])))throw Error('Invalid source path '+c.id);
 return '<polyline data-source-path="'+safe(c.id)+'" points="'+points(c.points)+'" class="study-route"><title>'+safe(c.label)+'</title></polyline>';
}
export function drawBuildingShellPlan(candidate:CandidateRecord):string{
 const parcel=sourceParcel(candidate),footprints=getReportFootprints(candidate);
 const components=footprints.map(f=>'<polygon data-source-footprint="'+safe(f.id)+'" points="'+points(f.points)+'" class="study-'+f.kind+'">'+
 '<title>'+safe(f.label)+' · exact saved exterior footprint; no interior partitions supplied</title></polygon>').join('');
 const b=box(parcel);
 const axes='<path d="M '+n(b.x0+3)+' '+n(b.y0+3)+' h 8 m -8 0 v 8" stroke="#46647a" stroke-width=".7" fill="none"/>';
 return wrapDrawing('shell-plan','Building-shell and integrated-garage plan',boundsView(parcel,8),
  '<polygon points="'+points(parcel)+'" class="study-parcel"/>'+components+axes,
  'Source footprints, +X right / +Y down. Garages may overlap home shells; no room plan or measured wall thickness.');
}
export function drawAccessPlan(candidate:CandidateRecord):string{
 const parcel=sourceParcel(candidate);
 const paths=candidate.components.filter((x):x is PathComponent=>x.kind==='driveway'||x.kind==='route');
 const footprints=getReportFootprints(candidate);
 const overlay=footprints.map(f=>'<polygon points="'+points(f.points)+'" data-access-owner="'+safe(f.id)+'" class="study-'+f.kind+'"/>').join('');
 const pathsSvg=paths.map(pathPolyline).join('');
 return wrapDrawing('access-plan','Modeled access and approach study',boundsView(parcel,10),
  '<polygon points="'+points(parcel)+'" class="study-parcel"/>'+overlay+pathsSvg,
  paths.length?'Actual saved path centerlines; vehicle swept-path or outbound acceptance is separate.':'No source vehicle route provided; access withheld.');
}
type Prism={foot:Foot;order:number};
export function drawSchematicAxon(candidate:CandidateRecord):string{
 const feet=getReportFootprints(candidate).filter(f=>f.kind==='home');
 const parcel=sourceParcel(candidate);
 if(!feet.length)return '<p class="withheld">No home footprints available for schematic massing.</p>';
 // Graphic Z is intentionally a constant illustration coordinate (not feet).
 // All source XY footprint positions remain intact under the explicit 3D camera.
 const zGraphic=12;
 const iso=(p:P,z=0):P=>[n((p[0]-p[1])*.9),n((p[0]+p[1])*.43-z*1.02)];
 const site=parcel.map(p=>iso(p));
 const project=[...site,...feet.flatMap(f=>f.points.flatMap(p=>[iso(p),iso(p,zGraphic)]))];
 const b=box(project),margin=16,view=[n(b.x0-margin),n(b.y0-margin),n(b.x1-b.x0+2*margin),n(b.y1-b.y0+2*margin)].join(' ');
 const sorted:Prism[]=feet.map(foot=>({foot,order:Math.max(...foot.points.map(p=>p[0]+p[1]))})).sort((a,b)=>a.order-b.order);
 const base='<polygon points="'+points(site)+'" class="axon-site"/>';
 const shapes=sorted.map(({foot})=>{
  const p=foot.points,ground=p.map(pt=>iso(pt)),upper=p.map(pt=>iso(pt,zGraphic));
  const wall=p.map((_,i)=>{
   const j=(i+1)%p.length;
   return '<polygon points="'+points([ground[i],ground[j],upper[j],upper[i]])+'" fill="#c1d4e4" fill-opacity=".22" stroke="none"/>';
  }).join('');
  const groundLine='<polygon points="'+points(ground)+'" fill="none" stroke="#355773" stroke-width="1.25"/>';
  const upLine='<polygon points="'+points(upper)+'" fill="none" stroke="#607f96" stroke-dasharray="3 2" stroke-width=".85"/>';
  const pillars=ground.map((pt,i)=>'<line x1="'+pt[0]+'" y1="'+pt[1]+'" x2="'+upper[i][0]+'" y2="'+upper[i][1]+'" stroke="#426780" stroke-width=".85"/>').join('');
  return '<g data-massing-owner="'+safe(foot.id)+'" data-height-authority="ILLUSTRATIVE_ONLY"><title>'+safe(foot.label)+' · footprint source bound; vertical graphic height NOT modelled</title>'+wall+groundLine+pillars+upLine+'</g>';
 }).join('');
 const garageShapes=getReportFootprints(candidate).filter(f=>f.kind==='garage').map(g=>
  '<polygon points="'+points(g.points.map(p=>iso(p)))+'" data-integrated-garage="'+safe(g.id)+'" fill="#e8bc7b" fill-opacity=".55" stroke="#997441" stroke-width=".85"><title>'+safe(g.label)+' · source garage area, not an independent building volume</title></polygon>').join('');
 const label='<text x="'+n(b.x0-margin+5)+'" y="'+n(b.y0-margin+10)+'" font-size="7" fill="#364a59">SCHEMATIC EXTRUSION · DASHED TOPS ARE NOT ROOFS</text>';
 return wrapDrawing('axon-schematic','Source footprint axonometric massing',view,base+shapes+garageShapes+label,
  'Illustrative graphic height ONLY · no floor count, roof shape or true elevation modeled.');
}
export function drawShellElevation(candidate:CandidateRecord,view:'north'|'south'|'east'|'west'):string{
 const footprints=getReportFootprints(candidate);
 const homes=footprints.filter(f=>f.kind==='home');
 if(!homes.length)return '<p class="withheld">No source home footprints to project.</p>';
 const horizontal=(p:P)=>view==='north'||view==='south'?p[0]:p[1];
 const all=homes.flatMap(f=>f.points.map(horizontal));
 const left=Math.min(...all),right=Math.max(...all),span=Math.max(1,right-left);
 const graphicHeight=18; // normalized display-only, absolutely NOT feet
 const yBase=60;
 const viewBox=[n(left-5),0,n(span+10),82].join(' ');
 const ordered=[...homes].sort((a,b)=>{
  const depth=(f:Foot)=>f.points.reduce((s,p)=>s+(view==='north'?-p[1]:view==='south'?p[1]:view==='west'?-p[0]:p[0]),0)/f.points.length;
  return depth(a)-depth(b);
 });
 const silhouette=ordered.map((f,i)=>{
  const coords=f.points.map(horizontal),start=Math.min(...coords),end=Math.max(...coords);
  return '<g data-elevation-owner="'+safe(f.id)+'" data-model-view="'+view+'">'+
   '<rect x="'+n(start)+'" y="'+(yBase-graphicHeight)+'" width="'+n(end-start)+'" height="'+graphicHeight+'" fill="'+(i%2?'#bed3df':'#a6c5d7')+'" fill-opacity=".4" stroke="#4f7389" stroke-width=".8"/>'+
   '<line x1="'+n(start)+'" y1="'+(yBase-graphicHeight)+'" x2="'+n(end)+'" y2="'+(yBase-graphicHeight)+'" stroke="#a1651d" stroke-width=".85" stroke-dasharray="2.5 2"/>'+
   '<title>'+safe(f.label)+' · horizontal extent from source XY, graphic height not sourced</title></g>';
 }).join('');
 const baseline='<line x1="'+n(left-5)+'" y1="'+yBase+'" x2="'+n(right+5)+'" y2="'+yBase+'" stroke="#3f637c" stroke-width="1"/>';
 const notice='<text x="'+n(left-4)+'" y="10" fill="#586e7f" font-size="3.5">MODEL-'+view.toUpperCase()+' PROJECTION · GRAPHIC HEIGHT ONLY</text>';
 const title=view.charAt(0).toUpperCase()+view.slice(1);
 return wrapDrawing('elevation-'+view,title+' · footprint projection study',viewBox,baseline+silhouette+notice,
  'Source-accurate horizontal spans; schematic vertical extent. No true walls, roofline, windows or heights.');
}
export function drawFourShellElevations(candidate:CandidateRecord){
 return (['north','south','east','west'] as const).map(d=>drawShellElevation(candidate,d)).join('');
}
