import { FULL_SIZE_SUV, vehiclePolygon, type Obstacle, type VehicleSpec } from "@/packages/circulation";
import { auditMotionPath, type GarageOpening, type HardenedMobilityResult, type MotionPose } from "@/packages/circulation/hardened";
import type { CandidateRecord, OpeningComponent, PlacementComponent, PolygonComponent, StallComponent } from "@/packages/candidates";
import {
  distancePointToSegment,
  distanceToPolygonBoundary,
  pointInPolygon,
  rectangle,
  rotatePoint,
  rotatePolygon,
  type Point,
  type Polygon
} from "@/packages/geometry";

export const AUTHORITATIVE_CIRCULATION_SCHEMA = "lotscope-authoritative-circulation-v2" as const;

type SearchPose = MotionPose & { gear: -1 | 1 };
type SearchNode = { pose: SearchPose; cost: number; score: number; parent: SearchNode | null; gearChanges: number };

type StreetPortal = {
  boundaryPoint: Point;
  tangent: Point;
  outwardNormal: Point;
  widthFt: number;
  depthFt: number;
  polygon: Polygon;
  clearanceTransitionPolygon: Polygon;
  inboundStart: SearchPose;
  outboundForwardGoal: SearchPose;
  outboundReverseGoal: SearchPose;
};

export type AuthoritativeCirculationSearchOptions = {
  vehicle?: VehicleSpec;
  stepFt?: number;
  primitiveSampleStepFt?: number;
  auditSampleStepFt?: number;
  stallIds?: string[];
  hardClearanceFt?: number;
  maxExpandedStates?: number;
  portalWidthFt?: number;
  portalDepthFt?: number;
  pavementRequired?: boolean;
};

export type DirectionSearchResult = {
  found: boolean;
  expandedStates: number;
  gearChanges: number | null;
  poses: SearchPose[];
  audit: HardenedMobilityResult | null;
  searchHardClearanceFt: number;
  failure: string | null;
};

export type StallAuthoritativeCirculation = {
  stallId: string;
  garageId: string;
  companionStallId: string | null;
  inbound: DirectionSearchResult;
  outbound: DirectionSearchResult;
  fullCirculationPass: boolean;
};

export type AuthoritativeCirculationResult = {
  schemaVersion: typeof AUTHORITATIVE_CIRCULATION_SCHEMA;
  candidateId: string;
  generatedAt: string;
  vehicleId: string;
  portal: { boundaryPoint: Point; widthFt: number; depthFt: number };
  stalls: StallAuthoritativeCirculation[];
  summary: { stallCount: number; inboundPass: number; outboundPass: number; fullCirculationPass: number };
  pass: boolean;
  policyReady: null;
  policyNote: string;
  professionalReviewStillRequired: true;
};

class MinHeap {
  private values: SearchNode[] = [];
  get size() { return this.values.length; }
  push(value: SearchNode) {
    this.values.push(value);
    let index = this.values.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.values[parent].score <= value.score) break;
      this.values[index] = this.values[parent];
      index = parent;
    }
    this.values[index] = value;
  }
  pop(): SearchNode | null {
    if (!this.values.length) return null;
    const root = this.values[0];
    const last = this.values.pop()!;
    if (this.values.length) {
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        if (left >= this.values.length) break;
        const child = right < this.values.length && this.values[right].score < this.values[left].score ? right : left;
        if (this.values[child].score >= last.score) break;
        this.values[index] = this.values[child];
        index = child;
      }
      this.values[index] = last;
    }
    return root;
  }
}

function wrap(angle: number) {
  let value = angle;
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return value;
}

function placementCenter(item: PlacementComponent): Point {
  return [item.x + item.widthFt / 2, item.y + item.depthFt / 2];
}

function placementPolygon(item: PlacementComponent): Point[] {
  const base = item.polygon ?? rectangle(item.x, item.y, item.widthFt, item.depthFt);
  const rotation = ((item.rotationDeg ?? 0) * Math.PI) / 180;
  if (item.polygon || Math.abs(rotation) < 1e-9) return base.map(([x,y]) => [x,y] as Point);
  return rotatePolygon(base, placementCenter(item), rotation);
}

function orientation(a: Point, b: Point, c: Point) {
  const value = (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  return Math.abs(value) < 1e-9 ? 0 : value;
}
function onSegment(a: Point, b: Point, p: Point) {
  return orientation(a,b,p) === 0 && p[0] >= Math.min(a[0],b[0])-1e-9 && p[0] <= Math.max(a[0],b[0])+1e-9 && p[1] >= Math.min(a[1],b[1])-1e-9 && p[1] <= Math.max(a[1],b[1])+1e-9;
}
function segmentsIntersect(a: Point,b: Point,c: Point,d: Point) {
  const o1=orientation(a,b,c),o2=orientation(a,b,d),o3=orientation(c,d,a),o4=orientation(c,d,b);
  if (((o1>0&&o2<0)||(o1<0&&o2>0))&&((o3>0&&o4<0)||(o3<0&&o4>0))) return true;
  return (o1===0&&onSegment(a,b,c))||(o2===0&&onSegment(a,b,d))||(o3===0&&onSegment(c,d,a))||(o4===0&&onSegment(c,d,b));
}
function polygonsOverlap(a: Polygon,b: Polygon) {
  for(let i=0;i<a.length;i++) for(let j=0;j<b.length;j++) if(segmentsIntersect(a[i],a[(i+1)%a.length],b[j],b[(j+1)%b.length])) return true;
  return a.some((point)=>pointInPolygon(point,b,0.01)) || b.some((point)=>pointInPolygon(point,a,0.01));
}
function polygonDistance(a: Polygon,b: Polygon) {
  if(polygonsOverlap(a,b)) return 0;
  let minimum=Infinity;
  for(const point of a) for(let i=0;i<b.length;i++) minimum=Math.min(minimum,distancePointToSegment(point,b[i],b[(i+1)%b.length]));
  for(const point of b) for(let i=0;i<a.length;i++) minimum=Math.min(minimum,distancePointToSegment(point,a[i],a[(i+1)%a.length]));
  return minimum;
}

function parcelComponent(candidate: CandidateRecord): PolygonComponent {
  const parcel = candidate.components.find((item): item is PolygonComponent => item.kind === "parcel");
  if (!parcel) throw new Error("Authoritative circulation requires a parcel polygon.");
  return parcel;
}

function deriveStreetPortal(candidate: CandidateRecord, parcel: Polygon, vehicle: VehicleSpec, options: Required<Pick<AuthoritativeCirculationSearchOptions,"portalWidthFt"|"portalDepthFt">>): StreetPortal {
  const paths = candidate.components.filter((item) => item.kind === "driveway" || item.kind === "route");
  const hints = paths.flatMap((item) => item.kind === "driveway" || item.kind === "route" ? item.points : []);
  if (!hints.length) throw new Error("Authoritative circulation requires at least one driveway/route point to identify the street portal.");
  let best: { point: Point; edgeIndex: number; distance: number } | null = null;
  for (const hint of hints) {
    for (let i=0;i<parcel.length;i++) {
      const d=distancePointToSegment(hint,parcel[i],parcel[(i+1)%parcel.length]);
      if(!best || d<best.distance) best={point:hint,edgeIndex:i,distance:d};
    }
  }
  if(!best) throw new Error("Unable to derive street portal.");
  const a=parcel[best.edgeIndex],b=parcel[(best.edgeIndex+1)%parcel.length];
  const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1;
  const tangent:Point=[dx/length,dy/length];
  const projection=Math.max(0,Math.min(1,((best.point[0]-a[0])*dx+(best.point[1]-a[1])*dy)/(length*length)));
  const boundaryPoint:Point=[a[0]+dx*projection,a[1]+dy*projection];
  const normals:Point[]=[[-tangent[1],tangent[0]],[tangent[1],-tangent[0]]];
  const outwardNormal=normals.find((normal)=>!pointInPolygon([boundaryPoint[0]+normal[0],boundaryPoint[1]+normal[1]],parcel,0.01)) ?? normals[0];
  const half=options.portalWidthFt/2, depth=options.portalDepthFt;
  const p1:Point=[boundaryPoint[0]+tangent[0]*half,boundaryPoint[1]+tangent[1]*half];
  const p2:Point=[boundaryPoint[0]-tangent[0]*half,boundaryPoint[1]-tangent[1]*half];
  const p3:Point=[p2[0]+outwardNormal[0]*depth,p2[1]+outwardNormal[1]*depth];
  const p4:Point=[p1[0]+outwardNormal[0]*depth,p1[1]+outwardNormal[1]*depth];
  const inwardDepth=Math.max(vehicle.lengthFt+2,12);
  const q1:Point=[p1[0]-outwardNormal[0]*inwardDepth,p1[1]-outwardNormal[1]*inwardDepth];
  const q2:Point=[p2[0]-outwardNormal[0]*inwardDepth,p2[1]-outwardNormal[1]*inwardDepth];
  const headingOut=Math.atan2(outwardNormal[1],outwardNormal[0]);
  const headingIn=wrap(headingOut+Math.PI);
  // Put the rear axle far enough into the street transition that the body can
  // be fully represented without inventing parcel beyond the frontage edge.
  const axleOffset=Math.min(depth-1,Math.max(vehicle.rearOverhangFt+2,vehicle.lengthFt*.45));
  const outsidePoint:Point=[boundaryPoint[0]+outwardNormal[0]*axleOffset,boundaryPoint[1]+outwardNormal[1]*axleOffset];
  return {
    boundaryPoint,tangent,outwardNormal,widthFt:options.portalWidthFt,depthFt:depth,polygon:[p1,p2,p3,p4],clearanceTransitionPolygon:[q1,q2,p2,p1],
    inboundStart:{x:outsidePoint[0],y:outsidePoint[1],headingRad:headingIn,gear:1},
    outboundForwardGoal:{x:outsidePoint[0],y:outsidePoint[1],headingRad:headingOut,gear:1},
    outboundReverseGoal:{x:outsidePoint[0],y:outsidePoint[1],headingRad:headingIn,gear:-1}
  };
}

function candidateOpening(candidate: CandidateRecord, garage: PlacementComponent): GarageOpening {
  const opening=candidate.components.find((item):item is OpeningComponent=>item.kind==="opening"&&item.ownerId===garage.id);
  if(!opening) throw new Error(`Garage ${garage.id} has no modeled opening.`);
  const vertical=opening.wall==="east"||opening.wall==="west";
  const base=vertical?garage.y:garage.x;
  return {
    garage:{x:garage.x,y:garage.y,widthFt:garage.widthFt,depthFt:garage.depthFt,rotationRad:((garage.rotationDeg??0)*Math.PI)/180},
    wall:opening.wall,
    openingStartFt:base+opening.offsetFt,
    openingEndFt:base+opening.offsetFt+opening.openingWidthFt,
    hardClearanceFt:0,
    comfortableClearanceFt:0
  };
}

function segmentIntersectionPoint(a: Point,b: Point,c: Point,d: Point): Point | null {
  const r:Point=[b[0]-a[0],b[1]-a[1]], q:Point=[d[0]-c[0],d[1]-c[1]];
  const cross=(u:Point,v:Point)=>u[0]*v[1]-u[1]*v[0];
  const denominator=cross(r,q), ca:Point=[c[0]-a[0],c[1]-a[1]];
  if(Math.abs(denominator)<1e-9) return null;
  const t=cross(ca,q)/denominator, u=cross(ca,r)/denominator;
  if(t<-1e-7||t>1+1e-7||u<-1e-7||u>1+1e-7) return null;
  return [a[0]+r[0]*t,a[1]+r[1]*t];
}

function targetGarageWallPass(body: Polygon, opening: GarageOpening) {
  const g=opening.garage,center:Point=[g.x+g.widthFt/2,g.y+g.depthFt/2],rotation=g.rotationRad??0;
  const local=Math.abs(rotation)<1e-9?body.map(([x,y])=>[x,y] as Point):body.map((point)=>rotatePoint(point,center,-rotation));
  const walls:Array<{wall:GarageOpening["wall"];a:Point;b:Point}>=[
    {wall:"west",a:[g.x,g.y],b:[g.x,g.y+g.depthFt]},
    {wall:"east",a:[g.x+g.widthFt,g.y],b:[g.x+g.widthFt,g.y+g.depthFt]},
    {wall:"north",a:[g.x,g.y],b:[g.x+g.widthFt,g.y]},
    {wall:"south",a:[g.x,g.y+g.depthFt],b:[g.x+g.widthFt,g.y+g.depthFt]}
  ];
  for(let i=0;i<local.length;i++){
    const a=local[i],b=local[(i+1)%local.length];
    for(const wall of walls){
      const hit=segmentIntersectionPoint(a,b,wall.a,wall.b);
      if(!hit) continue;
      // A body edge touching a garage corner is still a real wall crossing. Only
      // the modeled opening wall is traversable, and only inside its finite opening.
      if(wall.wall!==opening.wall) return false;
      const coordinate=wall.wall==="east"||wall.wall==="west"?hit[1]:hit[0];
      if(coordinate<opening.openingStartFt-1e-6||coordinate>opening.openingEndFt+1e-6) return false;
    }
  }
  return true;
}

function advance(pose: SearchPose, gear:-1|1, curvature:number, distanceFt:number): SearchPose {
  const signed=gear*distanceFt;
  if(Math.abs(curvature)<1e-10) return {...pose,x:pose.x+signed*Math.cos(pose.headingRad),y:pose.y+signed*Math.sin(pose.headingRad),gear};
  const nextHeading=wrap(pose.headingRad+signed*curvature);
  return {
    x:pose.x+(Math.sin(nextHeading)-Math.sin(pose.headingRad))/curvature,
    y:pose.y+(-Math.cos(nextHeading)+Math.cos(pose.headingRad))/curvature,
    headingRad:nextHeading,gear
  };
}

function reconstruct(node: SearchNode) {
  const poses:SearchPose[]=[];
  for(let current:SearchNode|null=node;current;current=current.parent) poses.push({...current.pose});
  return poses.reverse();
}

function key(pose:SearchPose) {
  return `${Math.round(pose.x*2)}:${Math.round(pose.y*2)}:${Math.round((wrap(pose.headingRad)+Math.PI)/(5*Math.PI/180))}:${pose.gear}`;
}
function heuristic(a:SearchPose,b:SearchPose) { return Math.hypot(a.x-b.x,a.y-b.y)+Math.abs(wrap(a.headingRad-b.headingRad))*10; }

export function constantCurvatureConnector(from:SearchPose,to:SearchPose,minRadiusFt:number):{gear:-1|1;curvature:number;distanceFt:number}|null {
  const dx=to.x-from.x,dy=to.y-from.y,c=Math.cos(from.headingRad),s=Math.sin(from.headingRad);
  const localX=c*dx+s*dy,localY=-s*dx+c*dy,r2=localX*localX+localY*localY;
  if(r2<1e-6) return Math.abs(wrap(to.headingRad-from.headingRad))<1e-3?{gear:1,curvature:0,distanceFt:0}:null;
  const headingDelta=wrap(to.headingRad-from.headingRad);
  if(Math.abs(localY)<0.03){
    if(Math.abs(headingDelta)>0.03) return null;
    const gear: -1|1=localX>=0?1:-1;
    return {gear,curvature:0,distanceFt:Math.abs(localX)};
  }
  const curvature=2*localY/r2;
  if(Math.abs(curvature)>1/minRadiusFt+1e-6) return null;
  const sinDelta=curvature*localX,cosDelta=1-curvature*localY;
  const geometricDelta=wrap(Math.atan2(sinDelta,cosDelta));
  if(Math.abs(wrap(geometricDelta-headingDelta))>0.035) return null;
  const signedDistance=geometricDelta/curvature;
  const gear:-1|1=signedDistance>=0?1:-1;
  return {gear,curvature,distanceFt:Math.abs(signedDistance)};
}

function poseBounds(parcel:Polygon,portal:StreetPortal,margin=3) {
  const points=[...parcel,...portal.polygon],xs=points.map(([x])=>x),ys=points.map(([,y])=>y);
  return {minX:Math.min(...xs)-margin,maxX:Math.max(...xs)+margin,minY:Math.min(...ys)-margin,maxY:Math.max(...ys)+margin};
}

function searchDirection(args:{
  start:SearchPose;goal:SearchPose;candidate:CandidateRecord;parcel:Polygon;portal:StreetPortal;garage:PlacementComponent;opening:GarageOpening;
  companionPolygon:Polygon|null;vehicle:VehicleSpec;options:Required<Pick<AuthoritativeCirculationSearchOptions,"stepFt"|"primitiveSampleStepFt"|"auditSampleStepFt"|"hardClearanceFt"|"maxExpandedStates"|"pavementRequired">>;
  finalInGarage:boolean;
}):DirectionSearchResult {
  const {candidate,parcel,portal,garage,opening,vehicle,options}=args;
  const otherObstacles:Obstacle[]=candidate.components.flatMap((item)=>{
    if(item.kind!=="home"&&item.kind!=="garage") return [];
    if(item.id===garage.id) return [];
    return [{id:item.id,label:item.label,polygon:placementPolygon(item)}];
  });
  if(args.companionPolygon) otherObstacles.push({id:"companion-parked",label:"Companion parked vehicle",polygon:args.companionPolygon});
  const pavement=candidate.components.filter((item):item is PolygonComponent=>item.kind==="pavement").map((item)=>item.polygon);
  const garagePoly=placementPolygon(garage);
  const bounds=poseBounds(parcel,portal);
  const allowOutside=(point:Point)=>pointInPolygon(point,portal.polygon,0.1);

  const poseValid=(pose:SearchPose)=>{
    if(pose.x<bounds.minX||pose.x>bounds.maxX||pose.y<bounds.minY||pose.y>bounds.maxY) return false;
    const body=vehiclePolygon(vehicle,pose.x,pose.y,pose.headingRad);
    let fullInParcel=true;
    for(const corner of body){
      if(pointInPolygon(corner,parcel,0.08)) continue;
      fullInParcel=false;
      if(!allowOutside(corner)) return false;
    }
    if(fullInParcel && !polygonsOverlap(body,portal.clearanceTransitionPolygon)){
      const boundary=Math.min(...body.map((corner)=>distanceToPolygonBoundary(corner,parcel)));
      if(boundary<options.hardClearanceFt-1e-6) return false;
    }
    for(const obstacle of otherObstacles){
      if(polygonsOverlap(body,obstacle.polygon)||polygonDistance(body,obstacle.polygon)<options.hardClearanceFt-1e-6) return false;
    }
    return targetGarageWallPass(body,opening);
  };

  const primitiveValid=(from:SearchPose,gear:-1|1,curvature:number,distanceFt:number)=>{
    const steps=Math.max(1,Math.ceil(distanceFt/options.primitiveSampleStepFt));
    for(let i=1;i<=steps;i++) if(!poseValid(advance(from,gear,curvature,distanceFt*i/steps))) return false;
    return true;
  };

  const connect=(node:SearchNode)=>{
    const connector=constantCurvatureConnector(node.pose,args.goal,vehicle.minRearAxleRadiusFt);
    if(!connector||connector.distanceFt>8||!primitiveValid(node.pose,connector.gear,connector.curvature,connector.distanceFt)) return null;
    const finalNode:SearchNode={pose:{...args.goal,gear:connector.gear},cost:node.cost+connector.distanceFt,score:0,parent:node,gearChanges:node.gearChanges+(node.pose.gear!==connector.gear?1:0)};
    const poses=reconstruct(finalNode);
    const audit=auditMotionPath({
      parcel,poses,vehicle,obstacles:otherObstacles,pavementZones:options.pavementRequired?pavement:[],allowedNonPavementZones:[garagePoly],allowOutside,garageOpening:opening,
      preferredClearanceFt:options.hardClearanceFt,maximumComfortableGearChanges:Number.MAX_SAFE_INTEGER,maxInterpolationStepFt:options.auditSampleStepFt,turningRadiusToleranceFt:0.1,requireFinalParkedInGarage:args.finalInGarage
    });
    if(!audit.pass) return null;
    return {poses,audit,gearChanges:finalNode.gearChanges};
  };

  if(!poseValid(args.start)||!poseValid(args.goal)) return {found:false,expandedStates:0,gearChanges:null,poses:[],audit:null,searchHardClearanceFt:options.hardClearanceFt,failure:"Start or exact goal pose is invalid under parcel/portal/obstacle/garage-wall constraints."};
  const open=new MinHeap(),best=new Map<string,number>();
  const root:SearchNode={pose:args.start,cost:0,score:heuristic(args.start,args.goal),parent:null,gearChanges:0};
  open.push(root);best.set(key(root.pose),0);
  const curvatures=[-1/vehicle.minRearAxleRadiusFt,0,1/vehicle.minRearAxleRadiusFt];
  let expanded=0;
  while(open.size&&expanded<options.maxExpandedStates){
    const current=open.pop()!,stored=best.get(key(current.pose));
    if(stored!=null&&current.cost>stored+1e-6) continue;
    expanded++;
    if(Math.hypot(current.pose.x-args.goal.x,current.pose.y-args.goal.y)<8){
      const connection=connect(current);
      if(connection) return {found:true,expandedStates:expanded,gearChanges:connection.gearChanges,poses:connection.poses,audit:connection.audit,searchHardClearanceFt:options.hardClearanceFt,failure:null};
    }
    for(const gear of [1,-1] as const) for(const curvature of curvatures){
      if(!primitiveValid(current.pose,gear,curvature,options.stepFt)) continue;
      const next=advance(current.pose,gear,curvature,options.stepFt),change=gear!==current.pose.gear?1:0;
      const cost=current.cost+options.stepFt*(gear<0?1.18:1)+(curvature?0.16:0)+change*18,nextKey=key(next);
      if(cost>=(best.get(nextKey)??Infinity)-1e-6) continue;
      best.set(nextKey,cost);
      open.push({pose:next,cost,score:cost+heuristic(next,args.goal),parent:current,gearChanges:current.gearChanges+change});
    }
  }
  return {found:false,expandedStates:expanded,gearChanges:null,poses:[],audit:null,searchHardClearanceFt:options.hardClearanceFt,failure:`No validated connector reached the exact goal within ${expanded} expanded states.`};
}

export function evaluateAuthoritativeCirculation(candidate:CandidateRecord, options:AuthoritativeCirculationSearchOptions={}):AuthoritativeCirculationResult {
  const vehicle=options.vehicle??FULL_SIZE_SUV;
  const resolved={
    stepFt:options.stepFt??2,
    primitiveSampleStepFt:options.primitiveSampleStepFt??0.5,
    auditSampleStepFt:options.auditSampleStepFt??0.25,
    hardClearanceFt:options.hardClearanceFt??1,
    maxExpandedStates:options.maxExpandedStates??180000,
    portalWidthFt:options.portalWidthFt??Math.max(16,vehicle.widthFt+8),
    portalDepthFt:options.portalDepthFt??Math.max(30,vehicle.lengthFt+8),
    pavementRequired:options.pavementRequired??true
  };
  const parcel=parcelComponent(candidate).polygon;
  const portal=deriveStreetPortal(candidate,parcel,vehicle,resolved);
  const garages=new Map(candidate.components.filter((item):item is PlacementComponent=>item.kind==="garage").map((item)=>[item.id,item]));
  const allStalls=candidate.components.filter((item):item is StallComponent=>item.kind==="stall");
  const selectedIds=options.stallIds?.length?new Set(options.stallIds):null;
  const stalls=selectedIds?allStalls.filter((item)=>selectedIds.has(item.id)):allStalls;
  if(selectedIds){ for(const id of selectedIds) if(!allStalls.some((item)=>item.id===id)) throw new Error(`Unknown stall id: ${id}`); }
  const rows:StallAuthoritativeCirculation[]=[];
  for(const stall of stalls){
    const garage=garages.get(stall.garageId); if(!garage) throw new Error(`Stall ${stall.id} references missing garage ${stall.garageId}.`);
    const opening=candidateOpening(candidate,garage);
    const sameGarage=allStalls.filter((item)=>item.garageId===stall.garageId&&item.id!==stall.id);
    const companion=sameGarage[0]??null;
    const companionPolygon=companion?vehiclePolygon(vehicle,companion.axleX,companion.axleY,companion.headingDeg*Math.PI/180):null;
    const parked:SearchPose={x:stall.axleX,y:stall.axleY,headingRad:stall.headingDeg*Math.PI/180,gear:1};
    const common={candidate,parcel,portal,garage,opening,companionPolygon,vehicle,options:resolved};
    const inbound=searchDirection({...common,start:portal.inboundStart,goal:parked,finalInGarage:true});
    const reverseOutbound=searchDirection({...common,start:parked,goal:portal.outboundReverseGoal,finalInGarage:false});
    let outbound=reverseOutbound;
    if(!reverseOutbound.found){
      const forwardOutbound=searchDirection({...common,start:parked,goal:portal.outboundForwardGoal,finalInGarage:false});
      outbound=forwardOutbound.found ? {...forwardOutbound,expandedStates:reverseOutbound.expandedStates+forwardOutbound.expandedStates} : {
        ...forwardOutbound,
        expandedStates:reverseOutbound.expandedStates+forwardOutbound.expandedStates,
        failure:`Reverse-out: ${reverseOutbound.failure ?? "not found"} Forward-out: ${forwardOutbound.failure ?? "not found"}`
      };
    }
    rows.push({stallId:stall.id,garageId:garage.id,companionStallId:companion?.id??null,inbound,outbound,fullCirculationPass:inbound.found&&outbound.found});
  }
  const summary={stallCount:rows.length,inboundPass:rows.filter((row)=>row.inbound.found).length,outboundPass:rows.filter((row)=>row.outbound.found).length,fullCirculationPass:rows.filter((row)=>row.fullCirculationPass).length};
  return {
    schemaVersion:AUTHORITATIVE_CIRCULATION_SCHEMA,candidateId:candidate.id,generatedAt:new Date().toISOString(),vehicleId:vehicle.id,
    portal:{boundaryPoint:portal.boundaryPoint,widthFt:portal.widthFt,depthFt:portal.depthFt},stalls:rows,summary,
    pass:rows.length>0&&summary.fullCirculationPass===rows.length,policyReady:null,
    policyNote:"Hard geometry only. Practical comfort thresholds and professional/AHJ review remain separate policy gates.",professionalReviewStillRequired:true
  };
}
