/** Derived architectural REVIEW sections, not engineered roof approvals.
 * Every cut comes from a SOLVED, locked source valley and intersects actual
 * roof surface faces. Never synthesize a profile or move the valley to fit.
 */
import type {RoofDrawingHandoff} from '@/packages/roof-geometry/drawing-contract';
import {intersectRoofSection, type SectionLine} from '@/packages/roof-geometry/drawing-spatial';
import type {Point2} from '@/packages/roof-geometry/drawing-projection';

export type ValleySectionCut={
 id:string;label:string;sourceId:string;zoneIds:readonly string[];
 origin:Point2;direction:Point2;planTrace:{a:Point2;b:Point2};
 valleyMidZFt:number;residualFt:number;sourceA:readonly[number,number,number];
 sourceB:readonly[number,number,number];segments:SectionLine[];
 status:'SOURCE_INTERSECTION'|'REVIEW_REQUIRED';reason:string;
};
const near=(a:number,b:number,tol=0.025)=>Math.abs(a-b)<=tol;
const finite=(n:number)=>Number.isFinite(n);

export function deriveValleySectionCuts(roof:RoofDrawingHandoff):ValleySectionCut[]{
 if(roof.status!=='AUTHORITATIVE'||!roof.faces.length)return [];
 const valleys=roof.junctions.filter(j=>j.status==='SOLVED'&&j.kind==='VALLEY')
  .flatMap(j=>j.segments.filter(s=>s.kind==='VALLEY'));
 return valleys.map((valley,index)=>{
  const origin:Point2=[(valley.a[0]+valley.b[0])/2,(valley.a[1]+valley.b[1])/2];
  const dx=valley.b[0]-valley.a[0],dy=valley.b[1]-valley.a[1],length=Math.hypot(dx,dy);
  const direction:Point2=length>1e-8?[-dy/length,dx/length]:[0,0];
  const valleyMidZFt=(valley.zAFt+valley.zBFt)/2;
  const cut=length>1e-8?intersectRoofSection(roof,origin,direction):{status:'WITHHELD' as const,segments:[] as SectionLine[]};
  const segments=cut.status==='DRAWABLE'?cut.segments:[];
  const tValues=segments.flatMap(s=>[s.a[0],s.b[0]]);
  const min=tValues.length?Math.min(...tValues):0,max=tValues.length?Math.max(...tValues):0;
  const planTrace={a:[origin[0]+direction[0]*min,origin[1]+direction[1]*min] as Point2,
   b:[origin[0]+direction[0]*max,origin[1]+direction[1]*max] as Point2};
  // A source-derived 2-plane valley cut must have two distinct roof faces
  // physically meeting at x=0, and each must match the locked junction Z.
  const coincident=segments.filter(s=>([s.a,s.b] as Point2[]).some(p=>near(p[0],0)&&near(p[1],valleyMidZFt)));
  const matchedFaces=new Set(coincident.map(s=>s.faceId));
  const valid=length>1e-8 && finite(valleyMidZFt) && finite(valley.residualFt)
   && valley.residualFt<=0.02 && segments.length>=2 && min<0 && max>0
   && matchedFaces.size>=2
   && [...valley.a,...valley.b,valley.zAFt,valley.zBFt].every(finite)
   && segments.every(s=>[...s.a,...s.b].every(finite));
  return {id:'V'+(index+1),label:'Valley '+(index+1),sourceId:valley.id,zoneIds:valley.zoneIds,
   origin,direction,planTrace,valleyMidZFt,residualFt:valley.residualFt,
   sourceA:[valley.a[0],valley.a[1],valley.zAFt],
   sourceB:[valley.b[0],valley.b[1],valley.zBFt],
   segments,status:valid?'SOURCE_INTERSECTION':'REVIEW_REQUIRED',
   reason:valid?'Two locked face surfaces meet at source valley midpoint; profile is model-derived, not drainage-approved':
    'Unable to prove two locked face surfaces meet at this section; retain for geometry review'};
 });
}
