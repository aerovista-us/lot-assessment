import type {Point2} from '@/packages/roof-geometry/drawing-projection';

type Segment={faceId:string;start:Point2;end:Point2;visibility:'FRONT_SAMPLE'|'BACK_SAMPLE'|'UNRESOLVED'};
/** Explicitly diagnostic linework: hidden and unresolved edges stay visible to reviewers. */
export default function RoofLinework({title,segments}:{title:string;segments:readonly Segment[]}){
 if(!segments.length)return <figure><figcaption>{title}</figcaption><p>Linework withheld</p></figure>;
 const pts=segments.flatMap(s=>[s.start,s.end]);
 const minX=Math.min(...pts.map(p=>p[0])),maxX=Math.max(...pts.map(p=>p[0]));
 const minY=Math.min(...pts.map(p=>p[1])),maxY=Math.max(...pts.map(p=>p[1]));
 const width=Math.max(.01,maxX-minX),height=Math.max(.01,maxY-minY),scale=Math.min(350/width,174/height);
 const x=(n:number)=>25+(n-minX)*scale+(350-width*scale)/2;
 const y=(n:number)=>203-(n-minY)*scale-(174-height*scale)/2;
 const count=(status:Segment['visibility'])=>segments.filter(s=>s.visibility===status).length;
 return <figure style={{margin:0,minWidth:0}}><figcaption style={{fontWeight:650,marginBottom:8}}>{title}</figcaption>
  <svg viewBox="0 0 400 240" role="img" aria-label={`${title}: ${count('FRONT_SAMPLE')} front, ${count('BACK_SAMPLE')} hidden, ${count('UNRESOLVED')} unresolved sampled segments`} style={{width:'100%',display:'block',background:'#f5f7f8',border:'1px solid #a5b7c1',borderRadius:8}}>
   {segments.map((s,i)=><line key={`${s.faceId}-${i}`} x1={x(s.start[0])} y1={y(s.start[1])} x2={x(s.end[0])} y2={y(s.end[1])} stroke={s.visibility==='UNRESOLVED'?'#bb6c19':s.visibility==='BACK_SAMPLE'?'#84919b':'#183e52'} strokeWidth={s.visibility==='FRONT_SAMPLE'?2.4:1.5} strokeDasharray={s.visibility==='BACK_SAMPLE'?'5 4':s.visibility==='UNRESOLVED'?'2 3':undefined}/>) }
   <text x="10" y="15" fontSize="10" fill="#344c59">DIAGNOSTIC · NOT HIDDEN-LINE CERTIFIED</text>
   <line x1="13" y1="220" x2="36" y2="220" stroke="#183e52" strokeWidth="2.4"/><text x="42" y="223" fontSize="10" fill="#183e52">Front sample</text>
   <line x1="151" y1="220" x2="174" y2="220" stroke="#84919b" strokeDasharray="5 4"/><text x="180" y="223" fontSize="10" fill="#344c59">Back sample</text>
   <line x1="280" y1="220" x2="303" y2="220" stroke="#bb6c19" strokeDasharray="2 3"/><text x="309" y="223" fontSize="10" fill="#855016">Unresolved</text>
  </svg><p style={{fontSize:12,margin:'6px 0'}}>Front {count('FRONT_SAMPLE')} · Back {count('BACK_SAMPLE')} · Unresolved {count('UNRESOLVED')} — never suppresses edges</p></figure>;
}
