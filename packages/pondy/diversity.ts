import { FamilySearch } from "@/packages/optimizer";
import { PlacementCandidate } from "@/packages/placement";

type Wing = { id: string; x: number; y: number; widthFt: number; depthFt: number };

function unitMass(args: { id: "A" | "B"; plateX: number; plateY: number; plateW: number; plateD: number; garageX: number; garageY: number; wings?: Wing[]; }) {
  const group = `unit-${args.id}`;
  return [
    { id:`HOME-${args.id}`, kind:"home" as const, x:args.plateX,y:args.plateY,widthFt:args.plateW,depthFt:args.plateD,movable:true,movementLimitFt:2,integrationGroupId:group,circulationObstacle:false },
    ...(args.wings ?? []).map(wing => ({ id:`HOME-${args.id}-${wing.id}`,kind:"home" as const,x:wing.x,y:wing.y,widthFt:wing.widthFt,depthFt:wing.depthFt,movable:true,movementLimitFt:2,integrationGroupId:group,circulationObstacle:false })),
    { id:`GARAGE-${args.id}`,kind:"garage" as const,x:args.garageX,y:args.garageY,widthFt:20,depthFt:20,movable:true,movementLimitFt:2,integrationGroupId:group,circulationObstacle:true }
  ];
}

const frontStreetDrive={id:"DRIVE-A",garageId:"GARAGE-A",points:[[151,18],[128,18]] as Array<[number,number]>,movableControlPoints:[] as number[]};
function provenRearDrive(spineY:number,turnX:number,bendX:number,bendY:number,mouthX:number,mouthY:number){return{id:"DRIVE-B",garageId:"GARAGE-B",points:[[151,spineY],[turnX,spineY],[bendX,bendY],[mouthX,mouthY]] as Array<[number,number]>,movableControlPoints:[1,2],controlPointLimitFt:2};}

/**
 * Diversity Run 48.
 * Keep the physically proven north/setback access corridor and vary massing.
 * Previous Run 47 failures were dominated by principal-envelope overflow,
 * <1 ft non-access clearance, and floor-plate capacity below the 8% reserve gate.
 * These families correct geometry; they do not relax promotion thresholds.
 */
export const compactFrontBlock:FamilySearch={
 id:"compact-front-block",
 variables:[
  {id:"spineY",min:36,max:37,step:.5},
  {id:"turnX",min:79,max:82,step:1},
  {id:"bendY",min:26.5,max:27.5,step:.5},
  {id:"frontX",min:81,max:84,step:1},
  {id:"rearWingW",min:16,max:20,step:2},
  {id:"rearWingD",min:10,max:12,step:1}
 ],
 build:(v,serial):PlacementCandidate=>({
  id:`PONDY-CFB-${serial}`,
  family:"compact-front-block",
  placements:[
   ...unitMass({id:"A",plateX:v.frontX,plateY:5,plateW:128-v.frontX,plateD:27,garageX:108,garageY:8}),
   ...unitMass({id:"B",plateX:25,plateY:5,plateW:32,plateD:32.5,garageX:37,garageY:16,wings:[{id:"EAST-WING",x:57,y:5,widthFt:v.rearWingW,depthFt:v.rearWingD}]})
  ],
  drives:[frontStreetDrive,provenRearDrive(v.spineY,v.turnX,68,v.bendY,57,26)],
  metadata:{topology:"compact-front-block-proven-rear-mouth",designGroup:"compact-front-block",designIntent:"deeper-narrower-street-home-with-proven-rear-access",intendedLivingA:1800,intendedLivingB:1800,architectureSearch:"ground-floor-public-zone",diversityPass:"run48-envelope-capacity-correction"}
 })
};

export const deepNarrowRear:FamilySearch={id:"deep-narrow-rear",variables:[{id:"spineY",min:36,max:37,step:.5},{id:"turnX",min:79,max:82,step:1},{id:"bendY",min:26.5,max:27.5,step:.5}],build:(v,serial):PlacementCandidate=>({id:`PONDY-DNR-${serial}`,family:"deep-narrow-rear",placements:[...unitMass({id:"A",plateX:79,plateY:5,plateW:49,plateD:25,garageX:108,garageY:8}),...unitMass({id:"B",plateX:25,plateY:5,plateW:29,plateD:32.5,garageX:34,garageY:16,wings:[{id:"EAST-WING",x:54,y:5,widthFt:20,depthFt:12}]})],drives:[frontStreetDrive,provenRearDrive(v.spineY,v.turnX,66,v.bendY,54,26)],metadata:{topology:"deep-narrow-rear-west-garage",designGroup:"deep-narrow-rear",designIntent:"deep-narrow-rear-home-with-west-shifted-garage-and-proven-corridor",intendedLivingA:1800,intendedLivingB:1800,diversityPass:"run48-envelope-capacity-correction"}})};

export const frontLRearStandard:FamilySearch={id:"front-l-rear-standard",variables:[{id:"spineY",min:36,max:37,step:.5},{id:"turnX",min:79,max:82,step:1},{id:"bendY",min:26.5,max:27.5,step:.5}],build:(v,serial):PlacementCandidate=>({id:`PONDY-FLRS-${serial}`,family:"front-l-rear-standard",placements:[...unitMass({id:"A",plateX:96,plateY:5,plateW:32,plateD:25,garageX:108,garageY:8,wings:[{id:"LOW-WEST",x:78,y:5,widthFt:18,depthFt:23}]}),...unitMass({id:"B",plateX:25,plateY:5,plateW:32,plateD:32.5,garageX:37,garageY:16,wings:[{id:"EAST-WING",x:57,y:5,widthFt:16,depthFt:10}]})],drives:[frontStreetDrive,provenRearDrive(v.spineY,v.turnX,68,v.bendY,57,26)],metadata:{topology:"front-l-low-west-wing",designGroup:"front-l-rear-standard",designIntent:"front-L-massing-with-proven-rear-access",intendedLivingA:1800,intendedLivingB:1800,diversityPass:"run48-clearance-capacity-correction"}})};

export const balancedTwinBlocks:FamilySearch={id:"balanced-twin-blocks",variables:[{id:"spineY",min:36,max:37,step:.5},{id:"turnX",min:79,max:82,step:1},{id:"bendY",min:26.5,max:27.5,step:.5}],build:(v,serial):PlacementCandidate=>({id:`PONDY-BTB-${serial}`,family:"balanced-twin-blocks",placements:[...unitMass({id:"A",plateX:82,plateY:5,plateW:46,plateD:26,garageX:108,garageY:8}),...unitMass({id:"B",plateX:25,plateY:5,plateW:31,plateD:32.5,garageX:36,garageY:16,wings:[{id:"EAST-WING",x:56,y:5,widthFt:17,depthFt:11}]})],drives:[frontStreetDrive,provenRearDrive(v.spineY,v.turnX,67,v.bendY,56,26)],metadata:{topology:"balanced-primary-blocks",designGroup:"balanced-twin-blocks",designIntent:"balanced-massing-with-proven-corridor",intendedLivingA:1800,intendedLivingB:1800,diversityPass:"run48-envelope-capacity-correction"}})};

/**
 * D6 — Accessory Rear Garage Stack + Connected L Duplex.
 * Owner-selected Design #2, now in focused design development.
 *
 * Evidence sequence:
 * - Base pass proved rear-garage-stack circulation.
 * - Run 44 solved Unit B program/capacity with a 22 ft primary depth.
 * - Run 45 produced 10/10 physical + program passes with the legal 28 ft Unit A.
 * - Diagnostic tracing showed its only promotion miss (0.50 ft clearance) came from the
 *   south garage approach at the parcel's y=0 side, not from the north access spine.
 * - Run 46 proved that squaring the approach can create >1 ft clearance, but introduced
 *   artificial short-tangent failures at the last two turns.
 * - Run 47 returned to the physically proven Run 45 maneuver and moved the rear garage
 *   stack/local approach one foot north, proving a conservative 6 ft south buffer.
 */
export const rearGarageStack:FamilySearch={
 id:"rear-garage-stack",
 variables:[
  {id:"spineY",min:37.5,max:38.5,step:.5},
  {id:"turnX",min:70,max:78,step:2},
  {id:"flareX",min:38,max:50,step:2},
  {id:"garageX",min:5,max:8,step:1},
  {id:"garageGap",min:1,max:2,step:1},
  {id:"duplexX",min:52,max:54,step:1},
  {id:"partyX",min:92,max:93,step:1}
 ],
 build:(v,serial):PlacementCandidate=>{
  const garageW=20,garageD=20,garageSouthY=6,garageNorthY=garageSouthY+garageD+v.garageGap;
  const mouthX=v.garageX+garageW,southMouthY=garageSouthY+10,northMouthY=garageNorthY+10;
  const partyGap=.04;
  return{id:`PONDY-RGS-${serial}`,family:"rear-garage-stack",placements:[
   {id:"HOME-B",kind:"home",x:v.duplexX,y:5,widthFt:v.partyX-v.duplexX-partyGap,depthFt:22,movable:false,integrationGroupId:"unit-B",circulationObstacle:false},
   {id:"HOME-B-NORTH-LEG",kind:"home",x:v.partyX-20-partyGap,y:27,widthFt:20,depthFt:6,movable:false,integrationGroupId:"unit-B",circulationObstacle:false},
   {id:"HOME-A",kind:"home",x:v.partyX,y:5,widthFt:128-v.partyX,depthFt:28,movable:false,integrationGroupId:"unit-A",circulationObstacle:false},
   {id:"GARAGE-A",kind:"garage",x:v.garageX,y:garageSouthY,widthFt:garageW,depthFt:garageD,movable:false,integrationGroupId:"unit-A",circulationObstacle:true},
   {id:"GARAGE-B",kind:"garage",x:v.garageX,y:garageNorthY,widthFt:garageW,depthFt:garageD,movable:false,integrationGroupId:"unit-B",circulationObstacle:true}
  ],drives:[
   {id:"DRIVE-A",garageId:"GARAGE-A",points:[[151,v.spineY],[v.turnX,v.spineY],[v.flareX,36],[mouthX+11,28],[mouthX+6,22],[mouthX,southMouthY]],movableControlPoints:[1,2,3,4],controlPointLimitFt:2.5},
   {id:"DRIVE-B",garageId:"GARAGE-B",points:[[151,v.spineY],[v.turnX,v.spineY],[v.flareX,38],[mouthX+8,northMouthY],[mouthX,northMouthY]],movableControlPoints:[1,2,3],controlPointLimitFt:2.5}
  ],metadata:{topology:"accessory-rear-stack-connected-L-duplex",designGroup:"rear-garage-stack",designIntent:"owner-base-shape-accessory-rear-garages-L-duplex",intendedLivingA:1800,intendedLivingB:1800,garagePlacementLockedToRear:true,garageAccessoryHypothesis:true,accessoryRearSetbackFt:5,accessorySideSetbackFt:5,actualSouthGarageSetbackFt:6,minimumGarageDuplexSeparationFt:6,duplexConnected:true,duplexPartyWallIntent:true,baseShapeLocked:true,designDevelopmentPass:"run47-six-foot-side-buffer"}};
 }
};

export const diversityFamilies:FamilySearch[]=[compactFrontBlock,deepNarrowRear,frontLRearStandard,balancedTwinBlocks,rearGarageStack];
