import type {EdgeInterval} from '@/packages/roof-geometry/drawing-verified-intervals';

export type RoofIntervalPlotProps={
 title:string;segments:readonly EdgeInterval[];
 status:'WITHHELD'|'REVIEW_REQUIRED'|'INTERVAL_VERIFIED';
 selectedIndex?:number|null;showEdgeIds?:boolean;emphasizeUnresolved?:boolean;
};
/** Read-only, source-identified edge intervals: unresolved geometry always stays
 * review-marked, with an explicit ID and provenance instead of disappearing.
 */
export default function RoofLinework({title,segments,status,selectedIndex=null,showEdgeIds=false,emphasizeUnresolved=false}:RoofIntervalPlotProps){
 if(status==='WITHHELD'||!segments.length)return <figure><figcaption>{title}</figcaption><p>Linework withheld; no valid geometry claim.</p></figure>;
 const plot=segments.filter(s=>s.visibility!=='INTERNAL_SEAM'&&s.visibility!=='DUPLICATE_SHARED');
 if(!plot.length)return <figure><figcaption>{title}</figcaption><p>No independently visible edge intervals; review locked roof surfaces.</p></figure>;
 const pts=plot.flatMap(s=>[s.start,s.end]);
 const minX=Math.min(...pts.map(p=>p[0])),maxX=Math.max(...pts.map(p=>p[0]));
 const minY=Math.min(...pts.map(p=>p[1])),maxY=Math.max(...pts.map(p=>p[1]));
 const width=Math.max(.01,maxX-minX),height=Math.max(.01,maxY-minY),scale=Math.min(350/width,174/height);
 const x=(n:number)=>25+(n-minX)*scale+(350-width*scale)/2;
 const y=(n:number)=>203-(n-minY)*scale-(174-height*scale)/2;
 const count=(tag:EdgeInterval['visibility'])=>segments.filter(s=>s.visibility===tag).length;
 return <figure className="roof-review-figure" data-roof-status={status}>
  <figcaption>{title}</figcaption>
  <svg viewBox="0 0 400 240" role="img"
   aria-label={title+': '+count('VISIBLE')+' visible, '+count('HIDDEN')+' hidden, '+count('UNRESOLVED')+' unresolved, '+count('INTERNAL_SEAM')+' internal seams, '+count('DUPLICATE_SHARED')+' duplicate shared edges'}>
   <rect width="400" height="240" rx="8" fill="#f4f7f9"/>
   {plot.map((s,i)=>{
    const selected=i===selectedIndex;
    const muted=emphasizeUnresolved&&s.visibility!=='UNRESOLVED'&&!selected;
    const color=s.visibility==='UNRESOLVED'?'#b05c0b':s.visibility==='HIDDEN'?'#6d8191':'#183e52';
    return <g key={s.faceId+'-'+s.edgeIndex+'-'+i} data-edge-id={'E'+(i+1)}
     data-source-face={s.faceId} data-source-edge={s.edgeIndex} data-visibility={s.visibility}>
     {selected?<line x1={x(s.start[0])} y1={y(s.start[1])} x2={x(s.end[0])} y2={y(s.end[1])}
      stroke="#f4b34c" strokeWidth="7" opacity=".8"/>:null}
     <line x1={x(s.start[0])} y1={y(s.start[1])} x2={x(s.end[0])} y2={y(s.end[1])}
      stroke={color} strokeWidth={selected?3.7:s.visibility==='VISIBLE'?2.4:1.8}
      strokeDasharray={s.visibility==='HIDDEN'?'5 4':s.visibility==='UNRESOLVED'?'2 3':undefined}
      opacity={muted?.18:1} data-visibility={s.visibility}/>
     {showEdgeIds&&!muted?<text x={(x(s.start[0])+x(s.end[0]))/2+2} y={(y(s.start[1])+y(s.end[1]))/2-5}
      fontSize={selected?11:8.5} fill="#85420d" fontWeight={selected?900:650}>{'E'+(i+1)}</text>:null}
     <title>{'E'+(i+1)+' · '+s.visibility+' · face '+s.faceId+' edge '+s.edgeIndex+
      ' · t '+s.t0.toFixed(3)+'–'+s.t1.toFixed(3)+(s.reason?' · '+s.reason:'')}</title>
    </g>;
   })}
   <text x="10" y="15" fontSize="9.5" fill="#344c59">PLANAR INTERVALS · CONCEPT ONLY · NOT FOR CONSTRUCTION</text>
   <line x1="13" y1="220" x2="36" y2="220" stroke="#183e52" strokeWidth="2.4"/><text x="42" y="223" fontSize="10" fill="#183e52">Visible</text>
   <line x1="142" y1="220" x2="165" y2="220" stroke="#84919b" strokeDasharray="5 4"/><text x="171" y="223" fontSize="10" fill="#344c59">Hidden</text>
   <line x1="260" y1="220" x2="283" y2="220" stroke="#b05c0b" strokeDasharray="2 3"/><text x="289" y="223" fontSize="10" fill="#855016">Unresolved</text>
  </svg>
  <p className="roof-review-note">{(status==='REVIEW_REQUIRED'?'Review required':'Model intervals verified')+
   ' · Visible '+count('VISIBLE')+' · Hidden '+count('HIDDEN')+' · Unresolved '+count('UNRESOLVED')+
   ' · Suppressed seams '+count('INTERNAL_SEAM')+' · Deduplicated edges '+count('DUPLICATE_SHARED')}</p>
 </figure>;
}
