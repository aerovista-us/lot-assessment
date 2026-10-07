import { polygonArea, type Point } from "@/packages/geometry";

export type RoofJunctionKind = "VALLEY" | "RIDGE" | "BOX_GUTTER";
export type JunctionZoneInput = {
  zoneId: string; footprint: Point[]; ridgeA: Point; ridgeB: Point;
  ridgeZFt: number; pitchRatio: number;
};
export type RoofJunctionSegment = {
  id: string; kind: RoofJunctionKind; zoneIds: [string,string];
  a: Point; b: Point; zAFt: number; zBFt: number; residualFt: number;
};
export type RoofJunctionSolution = {
  status: "SOLVED" | "NO_JUNCTION" | "UNSUPPORTED";
  kind: RoofJunctionKind | null; segments: RoofJunctionSegment[];
  overlapPolygon: Point[]; overlapAreaSqFt: number; errors: string[];
};

const EPS=1e-8, PLAN_EPS=0.02, Z_EPS=0.02;
const sub=(a:Point,b:Point):Point=>[a[0]-b[0],a[1]-b[1]];
const add=(a:Point,b:Point):Point=>[a[0]+b[0],a[1]+b[1]];
const scale=(a:Point,k:number):Point=>[a[0]*k,a[1]*k];
const dot=(a:Point,b:Point)=>a[0]*b[0]+a[1]*b[1];
const cross=(a:Point,b:Point)=>a[0]*b[1]-a[1]*b[0];
const len=(a:Point)=>Math.hypot(a[0],a[1]);
function norm(a:Point):Point|null{const l=len(a);return l>EPS?[a[0]/l,a[1]/l]:null;}
function signedArea(poly:ReadonlyArray<Point>){return poly.reduce((s,p,i)=>{const q=poly[(i+1)%poly.length];return s+p[0]*q[1]-q[0]*p[1];},0)/2;}
function lineHit(s:Point,e:Point,a:Point,b:Point):Point|null{
  const r=sub(e,s),q=sub(b,a),d=cross(r,q); if(Math.abs(d)<=EPS)return null;
  const t=cross(sub(a,s),q)/d; return add(s,scale(r,t));
}
function insideEdge(p:Point,a:Point,b:Point,ccw:boolean){const v=cross(sub(b,a),sub(p,a));return ccw?v>=-EPS:v<=EPS;}
export function intersectConvexPolygons(subject:ReadonlyArray<Point>,clip:ReadonlyArray<Point>):Point[]{
  if(subject.length<3||clip.length<3)return [];
  let out=subject.map(([x,y])=>[x,y] as Point); const ccw=signedArea(clip)>0;
  for(let i=0;i<clip.length;i++){
    const a=clip[i],b=clip[(i+1)%clip.length],input=out; out=[]; if(!input.length)break;
    for(let j=0;j<input.length;j++){
      const s=input[j],e=input[(j+1)%input.length],si=insideEdge(s,a,b,ccw),ei=insideEdge(e,a,b,ccw);
      if(si&&ei)out.push(e);
      else if(si&&!ei){const h=lineHit(s,e,a,b);if(h)out.push(h);}
      else if(!si&&ei){const h=lineHit(s,e,a,b);if(h)out.push(h);out.push(e);}
    }
  }
  const unique:Point[]=[]; for(const p of out)if(!unique.some(q=>len(sub(p,q))<=EPS))unique.push(p); return unique;
}
function collinearOverlap(a:Point,b:Point,c:Point,d:Point):[Point,Point]|null{
  const axis=norm(sub(b,a));if(!axis)return null;const n:Point=[-axis[1],axis[0]];
  if(Math.abs(dot(sub(c,a),n))>PLAN_EPS||Math.abs(dot(sub(d,a),n))>PLAN_EPS)return null;
  const l=len(sub(b,a)),tc=dot(sub(c,a),axis),td=dot(sub(d,a),axis),lo=Math.max(0,Math.min(tc,td)),hi=Math.min(l,Math.max(tc,td));
  return hi-lo>PLAN_EPS?[add(a,scale(axis,lo)),add(a,scale(axis,hi))]:null;
}
function sharedBoundary(a:ReadonlyArray<Point>,b:ReadonlyArray<Point>){
  const out:Array<[Point,Point]>=[]; for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){const h=collinearOverlap(a[i],a[(i+1)%a.length],b[j],b[(j+1)%b.length]);if(h)out.push(h);}return out;
}
type Facet={zoneId:string;side:-1|1;ridgeA:Point;normal:Point;a:number;b:number;c:number};
function facets(z:JunctionZoneInput):Facet[]{
  const axis=norm(sub(z.ridgeB,z.ridgeA));if(!axis)return [];const n:Point=[-axis[1],axis[0]];
  return ([-1,1] as const).map(side=>({zoneId:z.zoneId,side,ridgeA:z.ridgeA,normal:n,
    a:-z.pitchRatio*side*n[0],b:-z.pitchRatio*side*n[1],
    c:z.ridgeZFt+z.pitchRatio*side*dot(z.ridgeA,n)}));
}
function active(f:Facet,p:Point){return f.side*dot(sub(p,f.ridgeA),f.normal)>=-PLAN_EPS;}
export function gableHeight(z:JunctionZoneInput,p:Point){
  const axis=norm(sub(z.ridgeB,z.ridgeA));if(!axis)return null;const n:Point=[-axis[1],axis[0]];
  return z.ridgeZFt-Math.abs(dot(sub(p,z.ridgeA),n))*z.pitchRatio;
}
function linePoly(A:number,B:number,C:number,poly:ReadonlyArray<Point>):[Point,Point]|null{
  const pts:Point[]=[],v=(p:Point)=>A*p[0]+B*p[1]+C;
  for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],vp=v(p),vq=v(q);
    if(Math.abs(vp)<=EPS)pts.push(p);
    if((vp<-EPS&&vq>EPS)||(vp>EPS&&vq<-EPS)){const t=vp/(vp-vq);pts.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}
  }
  const u:Point[]=[];for(const p of pts)if(!u.some(q=>len(sub(p,q))<=PLAN_EPS/10))u.push(p);if(u.length<2)return null;
  let best:[Point,Point]=[u[0],u[1]],bl=len(sub(u[1],u[0]));for(let i=0;i<u.length;i++)for(let j=i+1;j<u.length;j++){const l=len(sub(u[j],u[i]));if(l>bl){best=[u[i],u[j]];bl=l;}}
  return bl>PLAN_EPS?best:null;
}
function clipFacet(seg:[Point,Point],fa:Facet,fb:Facet):[Point,Point]|null{
  let [p0,p1]=seg;for(const f of [fa,fb]){const f0=f.side*dot(sub(p0,f.ridgeA),f.normal),f1=f.side*dot(sub(p1,f.ridgeA),f.normal);
    if(f0<-PLAN_EPS&&f1<-PLAN_EPS)return null;
    if((f0<-PLAN_EPS)!==(f1<-PLAN_EPS)){const t=f0/(f0-f1),h:Point=[p0[0]+(p1[0]-p0[0])*t,p0[1]+(p1[1]-p0[1])*t];if(f0<-PLAN_EPS)p0=h;else p1=h;}
  }return len(sub(p1,p0))>PLAN_EPS?[p0,p1]:null;
}
function dedupe(xs:RoofJunctionSegment[]){const out:RoofJunctionSegment[]=[];for(const x of xs){if(!out.some(y=>(len(sub(x.a,y.a))<=PLAN_EPS&&len(sub(x.b,y.b))<=PLAN_EPS)||(len(sub(x.a,y.b))<=PLAN_EPS&&len(sub(x.b,y.a))<=PLAN_EPS)))out.push(x);}return out;}

export function solveGableJunction(a:JunctionZoneInput,b:JunctionZoneInput):RoofJunctionSolution{
  const errors:string[]=[];if(!(a.pitchRatio>0)||!(b.pitchRatio>0))errors.push("junction solver requires positive pitch ratios");
  if(!Number.isFinite(a.ridgeZFt)||!Number.isFinite(b.ridgeZFt))errors.push("junction solver requires finite ridge elevations");
  if(errors.length)return{status:"UNSUPPORTED",kind:null,segments:[],overlapPolygon:[],overlapAreaSqFt:0,errors};
  const overlap=intersectConvexPolygons(a.footprint,b.footprint),overlapArea=overlap.length>=3?Math.abs(polygonArea(overlap)):0;
  if(overlapArea<=EPS){
    const shared=sharedBoundary(a.footprint,b.footprint);if(!shared.length)return{status:"NO_JUNCTION",kind:null,segments:[],overlapPolygon:[],overlapAreaSqFt:0,errors:[]};
    const aa=norm(sub(a.ridgeB,a.ridgeA)),bb=norm(sub(b.ridgeB,b.ridgeA));
    const box=Boolean(aa&&bb&&shared.some(([s,e])=>{const edge=norm(sub(e,s));return edge&&Math.abs(cross(edge,aa))<=0.002&&Math.abs(cross(edge,bb))<=0.002;}));
    if(!box)return{status:"UNSUPPORTED",kind:null,segments:[],overlapPolygon:[],overlapAreaSqFt:0,errors:["touching roof zones do not form a supported plane intersection"]};
    const segments=shared.map(([s,e],i)=>{const z1=gableHeight(a,s),z2=gableHeight(b,s),z3=gableHeight(a,e),z4=gableHeight(b,e),res=Math.max(Math.abs((z1??NaN)-(z2??NaN)),Math.abs((z3??NaN)-(z4??NaN)));
      return{id:`${a.zoneId}__${b.zoneId}__box-${i+1}`,kind:"BOX_GUTTER" as const,zoneIds:[a.zoneId,b.zoneId] as [string,string],a:s,b:e,zAFt:z1??NaN,zBFt:z3??NaN,residualFt:res};});
    if(segments.some(s=>!Number.isFinite(s.residualFt)||s.residualFt>Z_EPS))return{status:"UNSUPPORTED",kind:null,segments:[],overlapPolygon:[],overlapAreaSqFt:0,errors:["box-gutter interface is vertically discontinuous"]};
    return{status:"SOLVED",kind:"BOX_GUTTER",segments,overlapPolygon:[],overlapAreaSqFt:0,errors:[]};
  }
  const candidates:RoofJunctionSegment[]=[];
  for(const fa of facets(a))for(const fb of facets(b)){
    const A=fa.a-fb.a,B=fa.b-fb.b,C=fa.c-fb.c;if(Math.hypot(A,B)<=EPS)continue;
    const base=linePoly(A,B,C,overlap);if(!base)continue;const clipped=clipFacet(base,fa,fb);if(!clipped)continue;
    const [s,e]=clipped,mid:Point=[(s[0]+e[0])/2,(s[1]+e[1])/2];if(!active(fa,mid)||!active(fb,mid))continue;
    const z1=gableHeight(a,s),z2=gableHeight(b,s),z3=gableHeight(a,e),z4=gableHeight(b,e);if([z1,z2,z3,z4].some(v=>v==null||!Number.isFinite(v)))continue;
    const residual=Math.max(Math.abs((z1 as number)-(z2 as number)),Math.abs((z3 as number)-(z4 as number)));if(residual>Z_EPS)continue;
    const d=norm(sub(e,s));if(!d)continue;const n:Point=[-d[1],d[0]],sample=Math.min(0.25,Math.max(0.05,len(sub(e,s))*0.05));
    const l=add(mid,scale(n,sample)),r=add(mid,scale(n,-sample));
    const aMid=gableHeight(a,mid) as number,bMid=gableHeight(b,mid) as number;
    const aLeft=gableHeight(a,l) as number,bLeft=gableHeight(b,l) as number;
    const aRight=gableHeight(a,r) as number,bRight=gableHeight(b,r) as number;
    const leftDelta=aLeft-bLeft,rightDelta=aRight-bRight;
    const ownershipSwitch=(leftDelta>1e-5&&rightDelta<-1e-5)||(leftDelta<-1e-5&&rightDelta>1e-5);
    if(!ownershipSwitch)continue;
    const h0=Math.max(aMid,bMid),hl=Math.max(aLeft,bLeft),hr=Math.max(aRight,bRight);
    const valley=hl>h0+1e-5&&hr>h0+1e-5;
    const ridge=hl<h0-1e-5&&hr<h0-1e-5;
    if(!valley&&!ridge)continue;
    const kind:RoofJunctionKind=valley?"VALLEY":"RIDGE";
    candidates.push({id:`${a.zoneId}__${b.zoneId}__${kind.toLowerCase()}-${candidates.length+1}`,kind,zoneIds:[a.zoneId,b.zoneId],a:s,b:e,zAFt:z1 as number,zBFt:z3 as number,residualFt:residual});
  }
  const segments=dedupe(candidates);if(!segments.length)return{status:"UNSUPPORTED",kind:null,segments:[],overlapPolygon:overlap,overlapAreaSqFt:overlapArea,errors:["overlapping gable planes produced no valid clipped junction line"]};
  const kinds=[...new Set(segments.map(s=>s.kind))];return{status:"SOLVED",kind:kinds.length===1?kinds[0]:null,segments,overlapPolygon:overlap,overlapAreaSqFt:overlapArea,errors:[]};
}
