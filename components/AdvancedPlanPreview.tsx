'use client';

import {useState} from 'react';
import type {DesignDocument,DesignShape} from '@/packages/candidates/design-document';

/** Read-only rendering of authored polygons; never computes new rooms or
 * claims door, accessibility, roof, structural, or permit verification. */
export function AdvancedPlanPreview({document}:{document:DesignDocument}) {
 const storyOptions=['GROUND','UPPER','OTHER'] as const;
 type Story=typeof storyOptions[number];
 const available=storyOptions.filter(story=>document.shapes.some(shape=>shape.story===story));
 const [active,setActive]=useState<Story>('GROUND');
 const story=available.includes(active)?active:available[0];
 const shapes=document.shapes.filter(shape=>shape.story===story);
 const all=shapes.flatMap(shape=>shape.polygon);
 if(!all.length)return <div className="arch-plan-empty" data-advanced-design-preview="empty">No authored floor polygons available for this revision. A room diagram will appear after a saved design contains a real source-bound floor.</div>;
 const xs=all.map(p=>p[0]),ys=all.map(p=>p[1]);
 const minX=Math.min(...xs),minY=Math.min(...ys);
 const width=Math.max(1,Math.max(...xs)-minX),height=Math.max(1,Math.max(...ys)-minY);
 const scale=Math.min(480/width,300/height);
 const offsetX=36+(480-width*scale)/2,offsetY=35+(300-height*scale)/2;
 const point=(p:readonly[number,number])=>[offsetX+(p[0]-minX)*scale,offsetY+(p[1]-minY)*scale];
 const drawn=(shape:DesignShape)=>shape.polygon.map(p=>point(p).map(v=>v.toFixed(2)).join(',')).join(' ');
 const shade:Record<DesignShape['kind'],string>={
  FLOOR_PLATE:'#172e38',GARAGE_AREA:'#806b49',ROOM:'#477f90',CIRCULATION:'#2f7c6c',
  STAIR_ZONE:'#bd936c',ROOF_ZONE:'#526b81',GABLE_ZONE:'#526b81'
 };
 const order=shapes.slice().sort((a,b)=>(a.kind==='FLOOR_PLATE'?0:a.kind==='ROOM'?2:1)-(b.kind==='FLOOR_PLATE'?0:b.kind==='ROOM'?2:1));
 const roomCount=shapes.filter(shape=>shape.kind==='ROOM').length;
 return <section className="arch-plan-preview" data-advanced-design-preview={story||'none'} aria-label="Selected saved floor plan preview">
  <div className="arch-plan-preview-header"><div><span className="arch-step-label">SOURCE-BOUND DRAFT / LS–201</span><h3>Saved design geometry</h3></div>
   <div className="arch-floor-buttons" role="group" aria-label="Floor to preview">
    {available.map(value=><button key={value} type="button" aria-pressed={story===value} onClick={()=>setActive(value)}>{value}</button>)}
   </div>
  </div>
  <svg viewBox="0 0 552 384" role="img" aria-label={'Actual saved '+story+' floor polygon overlay, '+roomCount+' room polygons'} className="arch-plan-preview-svg">
   <defs><pattern id="advanced-floor-grid" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M22 0H0V22" stroke="#547783" strokeWidth=".4" fill="none"/></pattern></defs>
   <rect width="552" height="384" fill="#0e2029"/><rect width="552" height="384" fill="url(#advanced-floor-grid)"/>
   {order.map(shape=><g key={shape.id}><polygon points={drawn(shape)} fill={shade[shape.kind]} fillOpacity={shape.kind==='FLOOR_PLATE'?.25:.52} stroke={shape.kind==='FLOOR_PLATE'?'#c6d8dc':'#aed8dc'} strokeDasharray={shape.kind==='FLOOR_PLATE'?'0':'4 2'} strokeWidth="1.3" vectorEffect="non-scaling-stroke"/>
    {shape.kind==='ROOM'&&<text x={point(shape.polygon[0])[0]} y={point(shape.polygon[0])[1]-5} fill="#e8f5f5" fontSize="10">{shape.label.slice(0,32)}</text>}</g>)}
   {document.doors?.filter(door=>door.story===story).map(door=><circle key={door.id} cx={point(door.center)[0]} cy={point(door.center)[1]} r="4" fill="#efbd86" stroke="#0b202a" strokeWidth="1.5"/>)}
   <text x="18" y="366" fill="#9cbec6" fontSize="10">MODEL XY · {story} · DRAFT / UNVERIFIED</text>
   <text x="530" y="366" textAnchor="end" fill="#a4d6db" fontSize="10">+Y ↓</text>
  </svg>
  <div className="arch-plan-footnote"><span>{shapes.length} authored zones · {roomCount} rooms · {document.doors?.filter(d=>d.story===story).length||0} proposed doors</span>
   <span>REVISION {document.revision} / NOT FOR CONSTRUCTION</span></div>
 </section>;
}
