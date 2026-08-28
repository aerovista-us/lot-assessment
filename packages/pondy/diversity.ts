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
function provenRearDrive(spineY:number,turnX:number,bendX:number,bendY:number,mouthX:number,mouthY:number){return{id:"DRIVE-B",garageId:"GARAGE-B",points:[[151,spineY],[turnX,spineY],[bendX,bendY],[mouthX,mouthY]] as Array<[number,number]>,movableControlPoints:[1,2],controlPointLimitFt:1.5};}

export const compactFrontBlock:FamilySearch={id:"compact-front-block",variables:[{id:"spineY",min:39,max:40,step:.5},{id:"turnX",min:81,max:83,step:1},{id:"bendY",min:27.5,max:28.5,step:.5}],build:(v,serial):PlacementCandidate=>({id:`PONDY-CFB-${serial}`,family:"compact-front-block",placements:[...unitMass({id:"A",plateX:88,plateY:5,plateW:40,plateD:29.3,garageX:108,garageY:8}),...unitMass({id:"B",plateX:25,plateY:5,plateW:32,plateD:32.5,garageX:37,garageY:16,wings:[{id:"EAST-WING",x:57,y:5,widthFt:16,depthFt:10}]})],drives:[frontStreetDrive,provenRearDrive(v.spineY,v.turnX,68,v.bendY,57,26)],metadata:{topology:"compact-front-block-proven-rear-mouth",designGroup:"compact-front-block",designIntent:"deeper-street-home-same-proven-rear-access",intendedLivingA:1800,intendedLivingB:1800}})};
export const deepNarrowRear:FamilySearch={id:"deep-narrow-rear",variables:[{id:"spineY",min:39,max:40,step:.5},{id:"turnX",min:81,max:83,step:1},{id:"bendY",min:28,max:29,step:.5}],build:(v,serial):PlacementCandidate=>({id:`PONDY-DNR-${serial}`,family:"deep-narrow-rear",placements:[...unitMass({id:"A",plateX:88,plateY:5,plateW:40,plateD:29.3,garageX:108,garageY:8}),...unitMass({id:"B",plateX:25,plateY:5,plateW:29,plateD:34,garageX:34,garageY:16,wings:[{id:"EAST-WING",x:54,y:5,widthFt:16,depthFt:12}]})],drives:[frontStreetDrive,provenRearDrive(v.spineY,v.turnX,66,v.bendY,54,26)],metadata:{topology:"deep-narrow-rear-west-garage",designGroup:"deep-narrow-rear",designIntent:"deeper-rear-home-garage-shifted-west",intendedLivingA:1800,intendedLivingB:1800}})};
export const frontLRearStandard:FamilySearch={id:"front-l-rear-standard",variables:[{id:"spineY",min:38.5,max:39.5,step:.5},{id:"turnX",min:78,max:80,step:1},{id:"bendY",min:27,max:28,step:.5}],build:(v,serial):PlacementCandidate=>({id:`PONDY-FLRS-${serial}`,family:"front-l-rear-standard",placements:[...unitMass({id:"A",plateX:96,plateY:5,plateW:32,plateD:25,garageX:108,garageY:8,wings:[{id:"LOW-WEST",x:82,y:5,widthFt:14,depthFt:23}]}),...unitMass({id:"B",plateX:25,plateY:5,plateW:32,plateD:32.5,garageX:37,garageY:16,wings:[{id:"EAST-WING",x:57,y:5,widthFt:16,depthFt:10}]})],drives:[frontStreetDrive,provenRearDrive(v.spineY,v.turnX,68,v.bendY,57,26)],metadata:{topology:"front-l-low-west-wing",designGroup:"front-l-rear-standard",designIntent:"front-L-massing-proven-rear-access",intendedLivingA:1800,intendedLivingB:1800}})};
export const balancedTwinBlocks:FamilySearch={id:"balanced-twin-blocks",variables:[{id:"spineY",min:39,max:40,step:.5},{id:"turnX",min:80,max:82,step:1},{id:"bendY",min:27.5,max:28.5,step:.5}],build:(v,serial):PlacementCandidate=>({id:`PONDY-BTB-${serial}`,family:"balanced-twin-blocks",placements:[...unitMass({id:"A",plateX:88,plateY:5,plateW:40,plateD:29.3,garageX:108,garageY:8}),...unitMass({id:"B",plateX:25,plateY:5,plateW:30,plateD:33,garageX:35,garageY:16,wings:[{id:"EAST-WING",x:55,y:5,widthFt:18,depthFt:11}]})],drives:[frontStreetDrive,provenRearDrive(v.spineY,v.turnX,67,v.bendY,55,26)],metadata:{topology:"balanced-primary-blocks",designGroup:"balanced-twin-blocks",designIntent:"compact-balanced-massing-with-proven-corridor",intendedLivingA:1800,intendedLivingB:1800}})};

/**
 * D6 — Accessory Rear Garage Stack + Connected L Duplex.
 * Garages intentionally use the separate accessory-building rear-yard hypothesis:
 * 5 ft rear/side target, detached from the principal duplex by >=6 ft. This family must
 * be evaluated with the accessory envelope in the Pondy scenario; it is NOT permission
 * to let principal residential mass enter the 25 ft rear yard.
 *
 * Unit B folds north/east and shares a wall with Unit A, creating one duplex building.
 * The north-side access lane remains completely outside residential mass until the rear
 * maneuvering apron. Garage placement is the fixed idea; driveway geometry is the search.
 */
export const rearGarageStack:FamilySearch={
 id:"rear-garage-stack",
 variables:[
  {id:"spineY",min:39,max:41,step:.5},{id:"turnX",min:72,max:84,step:2},{id:"flareX",min:45,max:55,step:2},
  {id:"garageX",min:5,max:8,step:1},{id:"garageGap",min:1,max:3,step:1},{id:"duplexX",min:54,max:60,step:2},{id:"partyX",min:94,max:98,step:2}
 ],
 build:(v,serial):PlacementCandidate=>{
  const garageW=20,garageD=20,garageSouthY=5,garageNorthY=garageSouthY+garageD+v.garageGap;
  const mouthX=v.garageX+garageW,southMouthY=garageSouthY+10,northMouthY=garageNorthY+10;
  return{id:`PONDY-RGS-${serial}`,family:"rear-garage-stack",placements:[
   {id:"HOME-B",kind:"home",x:v.duplexX,y:5,widthFt:v.partyX-v.duplexX,depthFt:20,movable:true,movementLimitFt:2,integrationGroupId:"unit-B",circulationObstacle:false},
   {id:"HOME-B-NORTH-LEG",kind:"home",x:v.partyX-20,y:25,widthFt:20,depthFt:10,movable:true,movementLimitFt:2,integrationGroupId:"unit-B",circulationObstacle:false},
   {id:"HOME-A",kind:"home",x:v.partyX,y:5,widthFt:128-v.partyX,depthFt:30,movable:true,movementLimitFt:2,integrationGroupId:"unit-A",circulationObstacle:false},
   {id:"GARAGE-A",kind:"garage",x:v.garageX,y:garageSouthY,widthFt:garageW,depthFt:garageD,movable:true,movementLimitFt:1,integrationGroupId:"unit-A",circulationObstacle:true},
   {id:"GARAGE-B",kind:"garage",x:v.garageX,y:garageNorthY,widthFt:garageW,depthFt:garageD,movable:true,movementLimitFt:1,integrationGroupId:"unit-B",circulationObstacle:true}
  ],drives:[
   {id:"DRIVE-A",garageId:"GARAGE-A",points:[[151,v.spineY],[v.turnX,v.spineY],[v.flareX,36],[mouthX+12,28],[mouthX,southMouthY]],movableControlPoints:[1,2,3],controlPointLimitFt:2},
   {id:"DRIVE-B",garageId:"GARAGE-B",points:[[151,v.spineY],[v.turnX,v.spineY],[v.flareX,northMouthY],[mouthX,northMouthY]],movableControlPoints:[1,2],controlPointLimitFt:2}
  ],metadata:{topology:"accessory-rear-stack-connected-L-duplex",designGroup:"rear-garage-stack",designIntent:"5ft-accessory-garages-L-duplex-clean-north-access",intendedLivingA:1800,intendedLivingB:1800,garagePlacementLockedToRear:true,garageAccessoryHypothesis:true,accessoryRearSetbackFt:5,accessorySideSetbackFt:5,minimumGarageDuplexSeparationFt:6,duplexConnected:true}};
 }
};

export const diversityFamilies:FamilySearch[]=[compactFrontBlock,deepNarrowRear,frontLRearStandard,balancedTwinBlocks,rearGarageStack];
