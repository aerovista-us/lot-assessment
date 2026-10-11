import type {EdgeInterval} from '@/packages/roof-geometry/drawing-verified-intervals';

/** Source-derived interval marks, not construction documents. Only provable
 * internal seams and identical duplicated physical strokes are suppressed.
 * Hidden and unresolved intervals remain visible to the reviewer.
 */
export default function RoofLinework({title,segments,status}:{
 title:string;segments:readonly EdgeInterval[];
 status:'WITHHELD'|'REVIEW_REQUIRED'|'INTERVAL_VERIFIED';
}){
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
 return <figure style={{margin:0,minWidth:0}}>
  <figcaption style={{fontWeight:650,marginBottom:8}}>{title}</figcaption>
  <svg viewBox="0 0 400 240" role="img" aria-label={title+': '+count('VISIBLE')+' visible, '+count('HIDDEN')+' hidden, '+count('UNRESOLVED')+' unresolved, '+count('INTERNAL_SEAM')+' internal seams, '+count('DUPLICATE_SHARED')+' duplicate shared edges'} style={{width:'100%',display:'block',background:'#f5f7f8',border:'1px solid #a5b7c1',borderRadius:8}}>
   {plot.map((s,i)=><line key={s.faceId+'-'+s.edgeIndex+'-'+i} x1={x(s.start[0])} y1={y(s.start[1])} x2={x(s.end[0])} y2={y(s.end[1])} stroke={s.visibility==='UNRESOLVED'?'#b05c0b':s.visibility==='HIDDEN'?'#6d8191':'#183e52'} strokeWidth={s.visibility==='VISIBLE'?2.4:1.6} strokeDasharray={s.visibility==='HIDDEN'?'5 4':s.visibility==='UNRESOLVED'?'2 3':undefined} data-visibility={s.visibility} data-face={s.faceId} data-edge={s.edgeIndex}/>)}
   <text x="10" y="15" fontSize="9.5" fill="#344c59">PLANAR INTERVALS · CONCEPT ONLY · NOT FOR CONSTRUCTION</text>
   <line x1="13" y1="220" x2="36" y2="220" stroke="#183e52" strokeWidth="2.4"/><text x="42" y="223" fontSize="10" fill="#183e52">Visible</text>
   <line x1="142" y1="220" x2="165" y2="220" stroke="#84919b" strokeDasharray="5 4"/><text x="171" y="223" fontSize="10" fill="#344c59">Hidden</text>
   <line x1="260" y1="220" x2="283" y2="220" stroke="#b05c0b" strokeDasharray="2 3"/><text x="289" y="223" fontSize="10" fill="#855016">Unresolved</text>
  </svg>
  <p style={{fontSize:12,margin:'6px 0'}}>{status==='REVIEW_REQUIRED'?'Review required':'Model intervals verified'} · Visible {count('VISIBLE')} · Hidden {count('HIDDEN')} · Unresolved {count('UNRESOLVED')} · Suppressed proven seams {count('INTERNAL_SEAM')} · Deduplicated shared edges {count('DUPLICATE_SHARED')}</p>
 </figure>;
}
