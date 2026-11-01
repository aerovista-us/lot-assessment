import type {LotAssessmentInput,LotAssessmentResult} from '@/lib/assessment';
import type {IrregularLotSnapshot} from '@/components/IrregularLotSketch';

/** Source-bound parcel linework, NOT a surveyed plan or a placement solver. */
export function SitePlanDiagram({input,result,customLot,id='lot-plan'}:{
 input:LotAssessmentInput;result:LotAssessmentResult;customLot?:IrregularLotSnapshot|null;id?:string
}) {
 const realPolygon=Boolean(customLot?.complete&&customLot.simple&&customLot.points.length>=3);
 const points:[number,number][]=realPolygon?customLot!.points:[[0,0],[input.lotWidthFt,0],[input.lotWidthFt,input.lotDepthFt],[0,input.lotDepthFt]];
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const width=Math.max(1,maxX-minX),depth=Math.max(1,maxY-minY);
 const scale=Math.min(420/width,272/depth);
 const drawW=width*scale,drawD=depth*scale;
 const offX=70+(420-drawW)/2,offY=66+(272-drawD)/2;
 const mapped=(x:number,y:number):[number,number]=>[offX+(x-minX)*scale,offY+(y-minY)*scale];
 const path=points.map(([x,y])=>mapped(x,y).map(p=>p.toFixed(1)).join(',')).join(' ');
 const rectEnv=!realPolygon&&result.buildableWidthFt>0&&result.buildableDepthFt>0;
 const envelopeX=offX+input.leftSetbackFt*scale,envelopeY=offY+input.frontSetbackFt*scale;
 const envelopeWidth=result.buildableWidthFt*scale,envelopeDepth=result.buildableDepthFt*scale;
 // The illustrative program mass is centered ONLY for explanation, never an
 // asserted site placement. No program is shown on unsolved irregular sites.
 const estimatedArea=result.estimatedProjectFootprintSqFt;
 const aspect=result.buildableWidthFt/Math.max(1,result.buildableDepthFt);
 const programWidthFt=Math.sqrt(Math.max(0,estimatedArea)*Math.max(.1,aspect));
 const programDepthFt=programWidthFt>0?estimatedArea/programWidthFt:0;
 const showProgram=rectEnv&&estimatedArea>0&&estimatedArea<=result.footprintCapacitySqFt&&
   programWidthFt<=result.buildableWidthFt&&programDepthFt<=result.buildableDepthFt;
 const programWidth=programWidthFt*scale,programDepth=programDepthFt*scale;
 const programX=envelopeX+(envelopeWidth-programWidth)/2,programY=envelopeY+(envelopeDepth-programDepth)/2;
 const frontage=realPolygon&&typeof customLot?.frontageEdge==='number'
  ?[points[customLot.frontageEdge],points[(customLot.frontageEdge+1)%points.length]]:null;
 const frontagePoints=frontage?frontage.map(p=>mapped(p[0],p[1])):null;
 const rounded=(n:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(n);
 return <div className="architect-plan" data-site-plan={realPolygon?'irregular':'rectangle'}>
  <div className="architect-plan-head"><span><span className="plan-live-dot"/> LIVE SITE STUDY <small>LS — 001</small></span><span>MODEL XY / FEET</span></div>
  <svg viewBox="0 0 560 438" role="img" aria-labelledby={id+'-title '+id+'-desc'} className="architect-plan-svg" preserveAspectRatio="xMidYMid meet">
   <title id={id+'-title'}>{realPolygon?'Irregular lot boundary from supplied points':'Dimensioned rectangular lot screen'}</title>
   <desc id={id+'-desc'}>{realPolygon?'Actual supplied parcel polygon is drawn to scale. Highlighted edge indicates selected frontage. No irregular setback or building placement is solved.':'Lot dimensions drawn to scale. Dashed inset is a simple rectangular setback estimate, not a surveyed building envelope.'}</desc>
   <defs>
    <pattern id={id+'-grid'} width="18" height="18" patternUnits="userSpaceOnUse"><path d="M18 0H0V18" fill="none" stroke="#577680" strokeWidth=".38" opacity=".28"/></pattern>
    <pattern id={id+'-hatch'} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><path d="M0 0V8" stroke="#7da3ab" strokeWidth="2" opacity=".18"/></pattern>
   </defs>
   <rect x="0" y="0" width="560" height="438" fill={'url(#'+id+'-grid)'}/>
   <g opacity=".55" stroke="#8eb9c1" strokeWidth=".8"><path d="M30 39h31 M45.5 23.5v31 M501 391h28 M515 377v28"/></g>
   <polygon points={path} fill={'url(#'+id+'-hatch)'} stroke="#c3d5d9" strokeWidth="2.2" vectorEffect="non-scaling-stroke"/>
   {rectEnv&&<g><rect x={envelopeX} y={envelopeY} width={envelopeWidth} height={envelopeDepth} fill="#65b2c2" fillOpacity=".09" stroke="#76bfcc" strokeDasharray="7 5" strokeWidth="1.6" vectorEffect="non-scaling-stroke"/>
    {envelopeWidth>94&&envelopeDepth>48&&<text x={envelopeX+envelopeWidth/2} y={envelopeY+envelopeDepth/2} textAnchor="middle" className="plan-label">SETBACK STUDY</text>}</g>}
   {showProgram&&<g data-illustrative-program="not-placed">
    <rect x={programX} y={programY} width={programWidth} height={programDepth} fill="#ba8a5d" fillOpacity=".32" stroke="#e7b984" strokeWidth="1.6" vectorEffect="non-scaling-stroke"/>
    {input.units>=2&&<line x1={programX+programWidth/Math.max(2,Math.min(4,input.units))} y1={programY} x2={programX+programWidth/Math.max(2,Math.min(4,input.units))} y2={programY+programDepth} stroke="#edcaa2" strokeDasharray="3 3" strokeWidth="1.2"/>}
    {programWidth>26&&programDepth>25&&<text x={programX+programWidth/2} y={programY+programDepth/2} textAnchor="middle" fill="#f7d6b0" fontSize="12" fontWeight="800">P</text>}
   </g>}
   {frontagePoints&&<line x1={frontagePoints[0][0]} y1={frontagePoints[0][1]} x2={frontagePoints[1][0]} y2={frontagePoints[1][1]} stroke="#e4ad74" strokeWidth="5" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>}
   {!realPolygon&&<g stroke="#7e9aa4" strokeWidth="1" vectorEffect="non-scaling-stroke">
     <line x1={offX} y1={offY-18} x2={offX+drawW} y2={offY-18}/><line x1={offX} y1={offY-25} x2={offX} y2={offY-11}/><line x1={offX+drawW} y1={offY-25} x2={offX+drawW} y2={offY-11}/>
     <line x1={offX+drawW+18} y1={offY} x2={offX+drawW+18} y2={offY+drawD}/><line x1={offX+drawW+11} y1={offY} x2={offX+drawW+25} y2={offY}/><line x1={offX+drawW+11} y1={offY+drawD} x2={offX+drawW+25} y2={offY+drawD}/>
   </g>}
   {!realPolygon&&<g fill="#d3dfe3" className="plan-dimension">
    <text x={offX+drawW/2} y={offY-27} textAnchor="middle">{rounded(input.lotWidthFt)}′</text>
    <text x={offX+drawW+32} y={offY+drawD/2} textAnchor="middle" transform={'rotate(90 '+(offX+drawW+32)+' '+(offY+drawD/2)+')'}>{rounded(input.lotDepthFt)}′</text>
    <text x={offX+drawW/2} y={offY-7} textAnchor="middle" className="plan-street-label">ASSUMED FRONTAGE</text>
   </g>}
   {realPolygon&&<g fill="#c9dce1" className="plan-dimension"><text x="30" y="37">BOUNDARY · {points.length} VERTICES</text><text x="30" y="53">FRONTAGE EDGE HIGHLIGHTED</text></g>}
   <g className="plan-legend" transform="translate(29 404)"><line x1="0" y1="-4" x2="29" y2="-4" stroke="#c3d5d9" strokeWidth="2"/><text x="37" y="0">PARCEL</text>
   <line x1="130" y1="-4" x2="159" y2="-4" stroke={realPolygon?'#e4ad74':'#76bfcc'} strokeDasharray={realPolygon?'0':'6 3'} strokeWidth="2"/><text x="167" y="0">{realPolygon?'FRONTAGE':'SETBACK INSET'}</text>
   {!realPolygon&&<g><rect x="336" y="-11" width="15" height="12" fill="#ba8a5d" fillOpacity=".42" stroke="#e7b984" strokeWidth="1.2"/><text x="359" y="0">PROGRAM*</text></g>}</g>
   <text x="529" y="35" textAnchor="end" className="plan-north">+Y ↓</text>
  </svg>
  <div className="architect-plan-foot"><span>{realPolygon?rounded(customLot!.areaSqFt)+' SQ FT · SUPPLIED POLYGON':rounded(result.lotAreaSqFt)+' SQ FT · DIMENSIONAL SCREEN'}</span><span>{realPolygon?'CONCEPT / NOT SURVEYED':'* PROGRAM NOT PLACED'}</span></div>
 </div>;
}
