/** Restricted extension solver for exactly one rectangular, axis-aligned gable.
 * Cross-gables and unequal roof planes deliberately fail closed.
 */
import type {Face3,Point3} from '@/packages/roof-geometry/boundary-audit';
import {auditRoofBoundary} from '@/packages/roof-geometry/boundary-audit';
export type ExtensionResult={status:'AUTHORITATIVE';faces:Face3[];source:string}|{status:'WITHHELD';errors:string[]};
const close=(a:number,b:number)=>Math.abs(a-b)<0.00001;
const fail=(why:string):ExtensionResult=>({status:'WITHHELD',errors:[why]});
export function solveSimpleGableExtension(faces:readonly Face3[], eaveFt:number,rakeFt:number,source:string):ExtensionResult {
  if(!source?.trim())return fail('Approved specification provenance required');
  if(!Number.isFinite(eaveFt)||!Number.isFinite(rakeFt)||eaveFt<0||rakeFt<0||eaveFt>4||rakeFt>4)return fail('Invalid overhang dimensions');
  if(faces.length!==2||auditRoofBoundary(faces).status!=='VALID')return fail('Exactly two manifold gable surface faces required');
  const plate=Math.min(...faces.flatMap(f=>f.polygon.map(p=>p[2])));
  const peak=Math.max(...faces.flatMap(f=>f.polygon.map(p=>p[2])));
  if(peak-plate<=0.01)return fail('Positive gable rise required');
  const rows=faces.map(face=>({face,ridge:face.polygon.filter(p=>close(p[2],peak)),eave:face.polygon.filter(p=>close(p[2],plate))}));
  if(rows.some(r=>r.face.polygon.length!==4||r.ridge.length!==2||r.eave.length!==2))return fail('Only two quadrilateral pitch planes supported');
  const a=rows[0].ridge,b=rows[1].ridge;
  if(!a.every(p=>b.some(q=>p.every((v,i)=>close(v,q[i])))))return fail('Both roof planes must share one precise ridge');
  const axis=close(a[0][0],a[1][0])?1:close(a[0][1],a[1][1])?0:-1;
  if(axis<0)return fail('Rotated ridge requires generalized plane extension solver');
  const along:0|1=axis as 0|1;
  const cross:0|1=along===0?1:0;
  const ridgeCross=a[0][cross];
  const low=[Math.min(a[0][along],a[1][along]),Math.max(a[0][along],a[1][along])];
  const leftRun=rows[0].eave[0][cross]-ridgeCross;
  const rightRun=rows[1].eave[0][cross]-ridgeCross;
  if(leftRun*rightRun>=0||!close(Math.abs(leftRun),Math.abs(rightRun)))return fail('Opposing gable pitches and equal half-runs required');
  if(rows.some(row=>!close(row.eave[0][cross],row.eave[1][cross])))return fail('Each eave must be a level axis-aligned edge');
  const output:Face3[]=[];
  for(const row of rows){
    const e=row.eave;
    if(!close(e[0][cross],e[1][cross])||!close(Math.min(e[0][along],e[1][along]),low[0])||!close(Math.max(e[0][along],e[1][along]),low[1]))return fail('Eave line must span the same gable ends as the ridge');
    const run=Math.abs(e[0][cross]-ridgeCross);
    if(run<0.01)return fail('Zero horizontal run');
    const sign=Math.sign(e[0][cross]-ridgeCross);
    const z=plate-(peak-plate)/run*eaveFt;
    if(z<0)return fail('Extended eave falls below model datum');
    const point=(long:number,short:number,height:number):Point3=>along===0?[long,short,height]:[short,long,height];
    output.push({id:row.face.id+'-extended',polygon:[point(low[0]-rakeFt,ridgeCross,peak),point(low[1]+rakeFt,ridgeCross,peak),point(low[1]+rakeFt,e[0][cross]+sign*eaveFt,z),point(low[0]-rakeFt,e[0][cross]+sign*eaveFt,z)]});
  }
  if(auditRoofBoundary(output).status!=='VALID')return fail('Extended roof mesh fails topology audit');
  return {status:'AUTHORITATIVE',faces:output,source};
}
