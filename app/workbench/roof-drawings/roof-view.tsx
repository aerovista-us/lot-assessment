import {auditProjectedRoofVisibility} from '@/packages/roof-geometry/drawing-visibility';
import type {Point2} from '@/packages/roof-geometry/drawing-projection';

type Face={id:string;points:Point2[]};
/** Shared view for QA only: roof vertices stay exact; the SVG transform only fits the viewport. */
export default function RoofView({title,faces,segments=[]}:{title:string;faces:readonly Face[];segments?:readonly {a:Point2;b:Point2}[]}){
 const visibility=auditProjectedRoofVisibility(faces);
 const occlusionUnresolved=visibility.status==='OCCLUSION_UNRESOLVED';
 const pts=[...faces.flatMap(f=>f.points),...segments.flatMap(s=>[s.a,s.b])];
 if(!pts.length)return <div role="img" aria-label={`${title}: geometry withheld`} style={{padding:20,border:'1px solid #aaa'}}>Geometry withheld</div>;
 const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const w=Math.max(0.01,maxX-minX),h=Math.max(0.01,maxY-minY),s=Math.min(360/w,190/h);
 const span=Math.max(w,h);
 const ideal=span/4;
 const magnitude=10**Math.floor(Math.log10(ideal));
 const scaleFt=[1,2,5,10].map(k=>k*magnitude).find(k=>k>=ideal)??10*magnitude;
 const scalePx=scaleFt*s;
 const fmt=(v:number)=>v.toFixed(2).replace(/\.00$/,'');
 const x=(v:number)=>20+(v-minX)*s+(360-w*s)/2;
 const y=(v:number)=>215-(v-minY)*s-(190-h*s)/2;
 return <figure style={{margin:0,minWidth:0}}><figcaption style={{fontWeight:650,marginBottom:8}}>{title}</figcaption>
  <svg viewBox="0 0 400 240" role="img" aria-label={`${title}: ${faces.length} authoritative roof faces`} style={{display:'block',width:'100%',background:'#eef3f5',border:'1px solid #a5b7c1',borderRadius:8}}>
   <path d="M 20 215 H 380" stroke="#b6c3cc" strokeWidth="1" fill="none"/>
   {faces.map((face,i)=><polygon key={`${face.id}-${i}`} points={face.points.map(p=>`${x(p[0])},${y(p[1])}`).join(' ')} fill={i%2?'#bfcdd3':'#d8e3e7'} fillOpacity={occlusionUnresolved?0.15:0.8} stroke="#40535e" strokeWidth="1.4" strokeLinejoin="round"/>)}
   {segments.map((seg,i)=><line key={i} x1={x(seg.a[0])} y1={y(seg.a[1])} x2={x(seg.b[0])} y2={y(seg.b[1])} stroke="#163e64" strokeWidth="2"/>)}
   <path d={`M 20 223 H ${20+scalePx} M 20 220 V 226 M ${20+scalePx} 220 V 226`} stroke="#172f3e" strokeWidth="1.5" fill="none"/>
   <text x="20" y="238" fontSize="9" fill="#172f3e">{fmt(scaleFt)} ft projected scale</text>
   <text x="12" y="18" fontSize="10" fill="#354d5b">SOLVED ROOF · VIEW-SPACE FIT ONLY</text>
  </svg><p style={{fontSize:12,opacity:0.7,margin:'6px 0 0'}}>Projected extents: {fmt(w)} × {fmt(h)} ft · {occlusionUnresolved?`Occlusion unresolved: ${visibility.ambiguousPairs.length} overlapping face pairs; outlines are not visibility-resolved`:'No projected face overlap detected'} · Engineering QA, not construction documentation</p></figure>;
}
