/** Analytic depth-exchange parameter for two planar projected roof surfaces.
 * Both faces must contain the edge's projected interval; callers must first partition at face boundaries.
 */
type P3=readonly [number,number,number];
type P2=readonly [number,number];
const EPS=1e-9;
function depthAt(poly:readonly P3[],p:P2):number|null{
 for(let i=1;i<poly.length-1;i++){
  const [a,b,c]=[poly[0],poly[i],poly[i+1]];
  const det=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  if(Math.abs(det)<EPS)continue;
  const u=((p[0]-a[0])*(c[1]-a[1])-(p[1]-a[1])*(c[0]-a[0]))/det;
  const v=((b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]))/det;
  if(u>=-EPS&&v>=-EPS&&u+v<=1+EPS)return a[2]+u*(b[2]-a[2])+v*(c[2]-a[2]);
 }
 return null;
}
export function depthExchangeParameter(edgeStart:P3,edgeEnd:P3,other:readonly P3[]):number|null{
 const at=(t:number):P3=>[edgeStart[0]+t*(edgeEnd[0]-edgeStart[0]),edgeStart[1]+t*(edgeEnd[1]-edgeStart[1]),edgeStart[2]+t*(edgeEnd[2]-edgeStart[2])];
 const a=at(0),b=at(1);
 const da=depthAt(other,[a[0],a[1]]),db=depthAt(other,[b[0],b[1]]);
 if(da===null||db===null)return null;
 const r0=da-a[2],r1=db-b[2],den=r0-r1;
 if(Math.abs(den)<EPS)return null;
 const t=r0/den;
 if(t<=EPS||t>=1-EPS)return null;
 const p=at(t),actual=depthAt(other,[p[0],p[1]]);
 return actual!==null&&Math.abs(actual-p[2])<1e-5?t:null;
}
