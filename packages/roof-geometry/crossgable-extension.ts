import {auditRoofSurfaceMesh} from '@/packages/roof-geometry/mesh-audit';
/** Candidate-only cross-gable extension. Never promotes authority or mutates owner locks. */
import { polygonArea, type Point } from '@/packages/geometry';
import {intersectConvexPolygons,solveGableEnvelopeFaces,solveGableJunction,type JunctionZoneInput} from '@/packages/roof-geometry/junctions';
export function previewCrossGableExtension(zones:readonly JunctionZoneInput[],eaveFt:number,rakeFt:number){
 const withheld=(error:string)=>({status:'WITHHELD' as const,errors:[error],faces:[],junction:null});
 if(zones.length!==2)return withheld('Exactly two authored gable zones required');
 if(!Number.isFinite(eaveFt)||!Number.isFinite(rakeFt)||eaveFt<0||rakeFt<0||eaveFt>4||rakeFt>4)return withheld('Invalid extension dimensions');
 const expanded:JunctionZoneInput[]=[];
 for(const zone of zones){
  if(zone.footprint.length!==4||zone.pitchRatio<=0||!Number.isFinite(zone.ridgeZFt))return withheld('Unsupported zone geometry');
  const [ax,ay]=zone.ridgeA,[bx,by]=zone.ridgeB,dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy);
  if(len<.01)return withheld('Degenerate ridge');
  const u:Point=[dx/len,dy/len],n:Point=[-u[1],u[0]];
  const along=(p:Point)=>(p[0]-ax)*u[0]+(p[1]-ay)*u[1];
  const across=(p:Point)=>(p[0]-ax)*n[0]+(p[1]-ay)*n[1];
  const ls=zone.footprint.map(along),ns=zone.footprint.map(across),minL=Math.min(...ls),maxL=Math.max(...ls),minN=Math.min(...ns),maxN=Math.max(...ns);
  if(Math.abs(minL)>0.02||Math.abs(maxL-len)>0.02||Math.abs(minN+maxN)>0.02)return withheld('Noncentered or partial-length gable');
  const corners=zone.footprint.every(p=>[minL,maxL].some(l=>Math.abs(along(p)-l)<.02)&&[minN,maxN].some(nv=>Math.abs(across(p)-nv)<.02));
  if(!corners)return withheld('Footprint is not ridge-aligned rectangle');
  const point=(l:number,v:number):Point=>[ax+l*u[0]+v*n[0],ay+l*u[1]+v*n[1]];
  expanded.push({...zone,footprint:[point(minL-rakeFt,minN-eaveFt),point(maxL+rakeFt,minN-eaveFt),point(maxL+rakeFt,maxN+eaveFt),point(minL-rakeFt,maxN+eaveFt)]});
 }
 const junction=solveGableJunction(expanded[0],expanded[1]);
 if(junction.status!=='SOLVED'||!junction.segments.some(s=>s.kind==='VALLEY'))return withheld('Extended cross-gable valley could not be solved');
 if(junction.segments.some(s=>s.residualFt>.02))return withheld('Extended roof valley is discontinuous');
 const faces=solveGableEnvelopeFaces(expanded[0],expanded[1]);
 if(!faces.length||faces.some(f=>f.polygon.some(p=>p.some(v=>!Number.isFinite(v)))))return withheld('Extended roof face tessellation failed');
 const area=(poly:readonly Point[])=>Math.abs(polygonArea([...poly]));
 const overlap=intersectConvexPolygons(expanded[0].footprint,expanded[1].footprint);
 const expected=area(expanded[0].footprint)+area(expanded[1].footprint)-(overlap.length>=3?area(overlap):0);
 const covered=faces.reduce((sum,f)=>sum+f.projectedAreaSqFt,0);
 if(!Number.isFinite(covered)||Math.abs(covered-expected)>0.0001)return withheld('Extended roof projected coverage differs from footprint union');
 const mesh=auditRoofSurfaceMesh(faces);
 if(!mesh.ok)return withheld('Extended roof mesh topology: '+mesh.errors.join('; '));
 return {status:'CANDIDATE' as const,errors:[],faces,junction};
}
