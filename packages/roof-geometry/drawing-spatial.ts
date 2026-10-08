/** Exact 3D world-coordinate roof intersections and axonometric projection. */
import type {RoofDrawingHandoff} from '@/packages/roof-geometry/drawing-contract';
import type {Point2} from '@/packages/roof-geometry/drawing-projection';
type P3=readonly[number,number,number];
export type SectionLine={a:Point2;b:Point2;faceId:string};
const EPS=0.000001;
export function projectRoofAxon(roof:RoofDrawingHandoff,azimuthRad:number,elevationRad:number){
 if(roof.status!=='AUTHORITATIVE')return {status:'WITHHELD' as const,faces:[],reason:roof.reason};
 if(![azimuthRad,elevationRad].every(Number.isFinite)||elevationRad<=0||elevationRad>=Math.PI/2)return {status:'WITHHELD' as const,faces:[],reason:'Invalid viewing angles'};
 const ca=Math.cos(azimuthRad),sa=Math.sin(azimuthRad),ce=Math.cos(elevationRad),se=Math.sin(elevationRad);
 const project=(p:P3):Point2=>[p[0]*ca+p[1]*sa,-p[0]*sa*se+p[1]*ca*se+p[2]*ce];
 return {status:'DRAWABLE' as const,faces:roof.faces.map(f=>({id:f.id,zoneId:f.zoneId,points:f.polygon.map(project)}))};
}
export function intersectRoofSection(roof:RoofDrawingHandoff,origin:Point2,direction:Point2){
 if(roof.status!=='AUTHORITATIVE')return {status:'WITHHELD' as const,segments:[],reason:roof.reason};
 if(![...origin,...direction].every(Number.isFinite)||Math.hypot(...direction)<EPS)return {status:'WITHHELD' as const,segments:[],reason:'Invalid section line'};
 const length=Math.hypot(...direction),ux=direction[0]/length,uy=direction[1]/length;
 const normal=(p:P3)=>(p[0]-origin[0])*(-uy)+(p[1]-origin[1])*ux;
 const along=(p:P3):Point2=>[(p[0]-origin[0])*ux+(p[1]-origin[1])*uy,p[2]];
 const segments:SectionLine[]=[];
 for(const face of roof.faces){
  const hits:Point2[]=[];
  for(let i=0;i<face.polygon.length;i++){
   const a=face.polygon[i] as P3,b=face.polygon[(i+1)%face.polygon.length] as P3;
   const da=normal(a),db=normal(b);
   if(Math.abs(da)<EPS)hits.push(along(a));
   if(da*db<-(EPS*EPS)){
    const t=da/(da-db),p:[number,number,number]=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];hits.push(along(p));
   }
  }
  const unique=hits.filter((p,i)=>hits.findIndex(q=>Math.hypot(q[0]-p[0],q[1]-p[1])<EPS)===i);
  if(unique.length===2&&Math.hypot(unique[0][0]-unique[1][0],unique[0][1]-unique[1][1])>EPS)segments.push({a:unique[0],b:unique[1],faceId:face.id});
 }
 return {status:'DRAWABLE' as const,segments};
}
