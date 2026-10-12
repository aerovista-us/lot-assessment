import type {ValleySectionCut} from '@/packages/roof-geometry/drawing-valley-sections';
import type {ProjectedRoofFace} from '@/packages/roof-geometry/drawing-projection';

const number=(v:number)=>v.toFixed(2).replace(/\.00$/,'');

export function RoofValleyPlan({faces,cuts,activeId}:{faces:readonly ProjectedRoofFace[];cuts:readonly ValleySectionCut[];activeId:string|null}){
 const pts=faces.flatMap(f=>f.points);
 if(!pts.length)return <div role="img" aria-label="Plan geometry withheld">Plan geometry withheld</div>;
 const x0=Math.min(...pts.map(p=>p[0])),x1=Math.max(...pts.map(p=>p[0]));
 const y0=Math.min(...pts.map(p=>p[1])),y1=Math.max(...pts.map(p=>p[1]));
 const scale=Math.min(500/Math.max(x1-x0,.01),250/Math.max(y1-y0,.01));
 const x=(n:number)=>52+(n-x0)*scale+(500-(x1-x0)*scale)/2;
 const y=(n:number)=>292-(n-y0)*scale-(250-(y1-y0)*scale)/2;
 return <figure className="roof-review-figure">
  <figcaption>Locked roof plan · source valleys and section-cut traces</figcaption>
  <svg viewBox="0 0 605 355" role="img" aria-label={faces.length+' source roof faces and '+cuts.length+' derived valleys with labeled sections'}>
   <rect width="605" height="355" rx="12" fill="#f3f6f8"/>
   {faces.map((f,i)=><polygon key={f.id} points={f.points.map(p=>x(p[0])+','+y(p[1])).join(' ')}
    stroke="#acbac3" strokeWidth=".75" fill={i%2?'#dce5ea':'#e8eef2'} fillOpacity=".9" data-source-face={f.id}>
    <title>{f.zoneId+' · source face '+f.id+' · triangulation is not an architectural edge'}</title></polygon>)}
   {cuts.map(cut=>{
    const active=activeId===cut.id;
    return <g key={cut.id} data-valley-id={cut.id} data-cut-source={cut.sourceId}>
     <line x1={x(cut.planTrace.a[0])} y1={y(cut.planTrace.a[1])}
      x2={x(cut.planTrace.b[0])} y2={y(cut.planTrace.b[1])}
      stroke={active?'#b85a12':'#64758a'} strokeWidth={active?2.2:1.35} strokeDasharray="7 5"/>
     <line x1={x(cut.sourceA[0])} y1={y(cut.sourceA[1])}
      x2={x(cut.sourceB[0])} y2={y(cut.sourceB[1])}
      stroke={active?'#a94d10':'#be6d2b'} strokeWidth={active?4:2.4}/>
     <circle cx={x(cut.origin[0])} cy={y(cut.origin[1])} r={active?7:5} fill="#fff" stroke="#9b4916" strokeWidth="2"/>
     <text x={x(cut.origin[0])+9} y={y(cut.origin[1])-8} fontSize="14" fontWeight="800" fill="#943f0a">{cut.id}</text>
     <title>{cut.label+' · source '+cut.sourceId+' · cut center ('+number(cut.origin[0])+', '+number(cut.origin[1])+') ft'}</title>
    </g>;
   })}
   <text x="24" y="23" fill="#344658" fontSize="12">WORLD XY · SOURCE GEOMETRY · CONCEPT ONLY</text>
   <text x="24" y="340" fill="#56687a" fontSize="11">Solid orange: derived valley · Dashed: section cut · Gray: source triangulation</text>
  </svg>
  <p className="roof-review-note">Plan coordinates and valley endpoints are from locked LotScope geometry; cut traces use actual roof-section extents.</p>
 </figure>;
}

export function RoofValleySection({cut}:{cut:ValleySectionCut}){
 const segments=cut.segments;
 const pts=segments.flatMap(s=>[s.a,s.b]);
 if(!pts.length)return <section className="roof-section-void">Section withheld: no authoritative face intersection.</section>;
 const lowX=Math.min(...pts.map(p=>p[0])),highX=Math.max(...pts.map(p=>p[0]));
 const lowZ=Math.min(...pts.map(p=>p[1])),highZ=Math.max(...pts.map(p=>p[1]));
 const width=Math.max(.1,highX-lowX),height=Math.max(.1,highZ-lowZ);
 const scale=Math.min(540/width,165/height);
 const x=(v:number)=>40+(v-lowX)*scale+(540-width*scale)/2;
 const y=(v:number)=>226-(v-lowZ)*scale-(165-height*scale)/2;
 return <figure className="roof-review-figure" data-section={cut.id} data-section-status={cut.status}>
  <figcaption>{cut.label} · perpendicular source-face section</figcaption>
  <svg viewBox="0 0 605 270" role="img"
   aria-label={cut.label+': '+segments.length+' exact face-section intervals, midpoint elevation '+cut.valleyMidZFt.toFixed(3)+' feet, '+cut.status}>
   <rect width="605" height="270" rx="12" fill="#f3f6f8"/>
   <line x1={x(0)} y1="35" x2={x(0)} y2="237" stroke="#9e6219" strokeDasharray="4 5" strokeWidth="1.4"/>
   {segments.map((s,i)=><line key={s.faceId+'-'+i} x1={x(s.a[0])} y1={y(s.a[1])}
    x2={x(s.b[0])} y2={y(s.b[1])} stroke={i%2?'#32647c':'#164455'} strokeWidth="3"
    data-section-face={s.faceId}><title>{s.faceId+' · exact source-face intersection'}</title></line>)}
   <circle cx={x(0)} cy={y(cut.valleyMidZFt)} r="6" fill="#f6b34e" stroke="#703708" strokeWidth="2"/>
   <text x={Math.min(530,x(0)+10)} y={Math.max(35,y(cut.valleyMidZFt)-10)} fontSize="12" fontWeight="800" fill="#85440b">{cut.id+' · '+cut.valleyMidZFt.toFixed(3)+' ft'}</text>
   <text x="20" y="20" fontSize="10" fill="#35485b">LOCKED 3D INTERSECTION · CONCEPT ONLY · NOT FOR CONSTRUCTION</text>
   <text x="20" y="257" fontSize="10" fill="#526575">Distance along cut (ft) · Vertical source datum (ft) · Fit to frame</text>
  </svg>
  <div className="roof-cut-metrics"><span>{cut.status==='SOURCE_INTERSECTION'?'Source intersection confirmed':'Review required'}</span>
   <span>{segments.length} face segments</span><span>{'Residual '+number(cut.residualFt)+' ft'}</span></div>
  <p className="roof-review-note">{'Midpoint XY: '+number(cut.origin[0])+', '+number(cut.origin[1])+' ft · '+cut.reason+'. No flashing, drainage or structural approval.'}</p>
 </figure>;
}
