export type LotPoint = [number, number];
export type LotIntakeDraft = {
 schemaVersion: "lotscope-lot-intake-v1";
 name: string;
 polygon: LotPoint[];
 frontageLabel: string;
 accessEdgeIndex: number;
 northRotationDeg: number;
 setbacksFt: {front:number;rear:number;left:number;right:number};
 units: number;
 targetLivingSqFt: [number,number];
 sourceNote: string;
 status: "DRAFT_UNVERIFIED";
};
const EPS=1e-8;
function cross(a:LotPoint,b:LotPoint,c:LotPoint){return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);}
function onSegment(a:LotPoint,b:LotPoint,p:LotPoint){
 return Math.abs(cross(a,b,p))<EPS&&p[0]>=Math.min(a[0],b[0])-EPS&&p[0]<=Math.max(a[0],b[0])+EPS&&p[1]>=Math.min(a[1],b[1])-EPS&&p[1]<=Math.max(a[1],b[1])+EPS;
}
function intersects(a:LotPoint,b:LotPoint,c:LotPoint,d:LotPoint){
 const ab1=cross(a,b,c),ab2=cross(a,b,d),cd1=cross(c,d,a),cd2=cross(c,d,b);
 return (ab1*ab2 < -EPS&&cd1*cd2 < -EPS)||onSegment(a,b,c)||onSegment(a,b,d)||onSegment(c,d,a)||onSegment(c,d,b);
}
export function lotAreaSqFt(polygon:LotPoint[]){
 let area=0;for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length];area+=a[0]*b[1]-b[0]*a[1];}
 return Math.abs(area)/2;
}
export function validateLotIntake(input:LotIntakeDraft):{areaSqFt:number;errors:string[]}{
 const errors:string[]=[];
 if(input.schemaVersion!=="lotscope-lot-intake-v1"||input.status!=="DRAFT_UNVERIFIED")errors.push("Unsupported intake schema or status.");
 if(!input.name.trim()||input.name.length>160)errors.push("Enter a lot name under 160 characters.");
 if(!input.frontageLabel.trim()||input.frontageLabel.length>160)errors.push("Identify the frontage/access road.");
 if(!input.sourceNote.trim())errors.push("Record where parcel measurements came from.");
 const p=input.polygon;
 if(!Array.isArray(p)||p.length<3||p.length>100||p.some(v=>!Array.isArray(v)||v.length!==2||v.some(n=>typeof n!=="number"||!Number.isFinite(n)||Math.abs(n)>1e6))){
  errors.push("Polygon requires 3–100 finite XY vertices in feet.");return {areaSqFt:0,errors};
 }
 if(!Number.isInteger(input.accessEdgeIndex)||input.accessEdgeIndex<0||input.accessEdgeIndex>=p.length)errors.push("Choose an existing frontage edge.");
 if(!Number.isFinite(input.northRotationDeg)||Math.abs(input.northRotationDeg)>360)errors.push("North rotation must be between -360° and 360°.");
 if(!Number.isInteger(input.units)||input.units<1||input.units>100)errors.push("Units must be between 1 and 100.");
 if(!Array.isArray(input.targetLivingSqFt)||input.targetLivingSqFt.length!==2||input.targetLivingSqFt.some(v=>!Number.isFinite(v)||v<=0)||input.targetLivingSqFt[0]>input.targetLivingSqFt[1])errors.push("Living-area range must be positive and ordered.");
 if(Object.values(input.setbacksFt).some(v=>!Number.isFinite(v)||v<0||v>1000))errors.push("Setbacks must be finite nonnegative feet.");
 for(let i=0;i<p.length;i++){
  const a=p[i],b=p[(i+1)%p.length];
  if(Math.hypot(b[0]-a[0],b[1]-a[1])<EPS)errors.push("Duplicate consecutive vertices are not allowed.");
  for(let j=i+1;j<p.length;j++){
   if(j===i+1||(i===0&&j===p.length-1))continue;
   if(intersects(a,b,p[j],p[(j+1)%p.length]))errors.push("Parcel boundary self-intersects or touches itself.");
  }
 }
 const areaSqFt=lotAreaSqFt(p);
 if(areaSqFt<EPS)errors.push("Parcel area must be nonzero.");
 return {areaSqFt,errors:[...new Set(errors)]};
}
