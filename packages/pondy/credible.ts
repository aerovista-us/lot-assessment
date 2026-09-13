import type { FamilySearch } from "@/packages/optimizer";
import type { PlacementCandidate } from "@/packages/placement";

type Wing = { id: string; x: number; y: number; widthFt: number; depthFt: number };

const GARAGE_W = 22;
const GARAGE_D = 22;

function unitMass(args: {
  id: "A" | "B";
  plateX: number;
  plateY: number;
  plateW: number;
  plateD: number;
  garageX: number;
  garageY: number;
  wings?: Wing[];
}) {
  const group = `unit-${args.id}`;
  return [
    { id:`HOME-${args.id}`, kind:"home" as const, x:args.plateX, y:args.plateY, widthFt:args.plateW, depthFt:args.plateD, movable:true, movementLimitFt:2, integrationGroupId:group, circulationObstacle:false },
    ...(args.wings ?? []).map(wing => ({ id:`HOME-${args.id}-${wing.id}`, kind:"home" as const, x:wing.x, y:wing.y, widthFt:wing.widthFt, depthFt:wing.depthFt, movable:true, movementLimitFt:2, integrationGroupId:group, circulationObstacle:false })),
    { id:`GARAGE-${args.id}`, kind:"garage" as const, x:args.garageX, y:args.garageY, widthFt:GARAGE_W, depthFt:GARAGE_D, movable:true, movementLimitFt:2, integrationGroupId:group, circulationObstacle:true }
  ];
}

const frontDrive = (y:number) => ({ id:"DRIVE-A", garageId:"GARAGE-A", points:[[151,y],[128,y]] as Array<[number,number]>, movableControlPoints:[] as number[] });
const rearDrive = (spineY:number,turnX:number,bendX:number,bendY:number,mouthX:number,mouthY:number) => ({ id:"DRIVE-B", garageId:"GARAGE-B", points:[[151,spineY],[turnX,spineY],[bendX,bendY],[mouthX,mouthY]] as Array<[number,number]>, movableControlPoints:[1,2], controlPointLimitFt:2 });

/**
 * Credible-garage families are rebuilt from the previously successful massing ideas,
 * but the parking geometry is no longer allowed to rely on 20x20 boxes for a 20.5 ft
 * design vehicle. Each garage is 22x22. The principal masses also receive small,
 * explicit translation ranges so a good access topology is not discarded merely
 * because a house started one or two feet too close to the swept path.
 */
export const credibleCompactFront: FamilySearch = {
  id:"credible-compact-front",
  variables:[
    {id:"spineY",min:36,max:38,step:.5},
    {id:"turnX",min:79,max:82,step:1},
    {id:"bendY",min:25.5,max:27,step:.5},
    {id:"frontX",min:79,max:83,step:1},
    {id:"frontY",min:5,max:7,step:1},
    {id:"rearY",min:5,max:7,step:1},
    {id:"rearWingW",min:16,max:20,step:2},
    {id:"rearWingD",min:10,max:12,step:1}
  ],
  build:(v,serial):PlacementCandidate=>{
    const frontGarageY=v.frontY+2;
    const rearGarageY=v.rearY+10;
    const rearDy=v.rearY-5;
    return {
      id:`PONDY-CCF-${serial}`,
      family:"credible-compact-front",
      placements:[
        ...unitMass({id:"A",plateX:v.frontX,plateY:v.frontY,plateW:128-v.frontX,plateD:27,garageX:106,garageY:frontGarageY}),
        ...unitMass({id:"B",plateX:25,plateY:v.rearY,plateW:32,plateD:32.5,garageX:35,garageY:rearGarageY,wings:[{id:"EAST-WING",x:57,y:v.rearY,widthFt:v.rearWingW,depthFt:v.rearWingD}]})
      ],
      drives:[frontDrive(frontGarageY+11),rearDrive(v.spineY,v.turnX,68,v.bendY+rearDy,57,rearGarageY+11)],
      metadata:{topology:"credible-compact-front-22",designGroup:"credible-compact-front",designIntent:"22x22-garage-compact-front",intendedLivingA:1800,intendedLivingB:1800,garageStandard:"22x22",mobilityRebuild:true,adaptiveBuildingTranslation:true}
    };
  }
};

export const credibleBalancedTwin: FamilySearch = {
  id:"credible-balanced-twin",
  variables:[
    {id:"spineY",min:36,max:38,step:.5},
    {id:"turnX",min:79,max:82,step:1},
    {id:"bendY",min:25.5,max:27,step:.5},
    {id:"frontY",min:5,max:7,step:1},
    {id:"rearY",min:5,max:7,step:1}
  ],
  build:(v,serial):PlacementCandidate=>{
    const frontGarageY=v.frontY+2;
    const rearGarageY=v.rearY+10;
    const rearDy=v.rearY-5;
    return {
      id:`PONDY-CBT-${serial}`,
      family:"credible-balanced-twin",
      placements:[
        ...unitMass({id:"A",plateX:82,plateY:v.frontY,plateW:46,plateD:26,garageX:106,garageY:frontGarageY}),
        ...unitMass({id:"B",plateX:25,plateY:v.rearY,plateW:31,plateD:32.5,garageX:34,garageY:rearGarageY,wings:[{id:"EAST-WING",x:56,y:v.rearY,widthFt:17,depthFt:11}]})
      ],
      drives:[frontDrive(frontGarageY+11),rearDrive(v.spineY,v.turnX,67,v.bendY+rearDy,56,rearGarageY+11)],
      metadata:{topology:"credible-balanced-twin-22",designGroup:"credible-balanced-twin",designIntent:"balanced-massing-22x22-garages",intendedLivingA:1800,intendedLivingB:1800,garageStandard:"22x22",mobilityRebuild:true,adaptiveBuildingTranslation:true}
    };
  }
};

export const credibleFrontL: FamilySearch = {
  id:"credible-front-l",
  variables:[
    {id:"spineY",min:36,max:38,step:.5},
    {id:"turnX",min:79,max:82,step:1},
    {id:"bendY",min:25.5,max:27,step:.5},
    {id:"frontY",min:5,max:7,step:1},
    {id:"rearY",min:5,max:7,step:1}
  ],
  build:(v,serial):PlacementCandidate=>{
    const frontGarageY=v.frontY+2;
    const rearGarageY=v.rearY+10;
    const rearDy=v.rearY-5;
    return {
      id:`PONDY-CFL-${serial}`,
      family:"credible-front-l",
      placements:[
        ...unitMass({id:"A",plateX:96,plateY:v.frontY,plateW:32,plateD:25,garageX:106,garageY:frontGarageY,wings:[{id:"LOW-WEST",x:78,y:v.frontY,widthFt:18,depthFt:23}]}),
        ...unitMass({id:"B",plateX:25,plateY:v.rearY,plateW:32,plateD:32.5,garageX:35,garageY:rearGarageY,wings:[{id:"EAST-WING",x:57,y:v.rearY,widthFt:16,depthFt:10}]})
      ],
      drives:[frontDrive(frontGarageY+11),rearDrive(v.spineY,v.turnX,68,v.bendY+rearDy,57,rearGarageY+11)],
      metadata:{topology:"credible-front-l-22",designGroup:"credible-front-l",designIntent:"front-L-massing-22x22-garages",intendedLivingA:1800,intendedLivingB:1800,garageStandard:"22x22",mobilityRebuild:true,adaptiveBuildingTranslation:true}
    };
  }
};

export const credibleDeepNarrow: FamilySearch = {
  id:"credible-deep-narrow",
  variables:[
    {id:"spineY",min:36,max:38,step:.5},
    {id:"turnX",min:79,max:82,step:1},
    {id:"bendY",min:25.5,max:27,step:.5},
    {id:"frontY",min:5,max:7,step:1},
    {id:"rearY",min:5,max:7,step:1}
  ],
  build:(v,serial):PlacementCandidate=>{
    const frontGarageY=v.frontY+2;
    const rearGarageY=v.rearY+10;
    const rearDy=v.rearY-5;
    return {
      id:`PONDY-CDN-${serial}`,
      family:"credible-deep-narrow",
      placements:[
        ...unitMass({id:"A",plateX:79,plateY:v.frontY,plateW:49,plateD:25,garageX:106,garageY:frontGarageY}),
        ...unitMass({id:"B",plateX:25,plateY:v.rearY,plateW:29,plateD:32.5,garageX:32,garageY:rearGarageY,wings:[{id:"EAST-WING",x:54,y:v.rearY,widthFt:20,depthFt:12}]})
      ],
      drives:[frontDrive(frontGarageY+11),rearDrive(v.spineY,v.turnX,66,v.bendY+rearDy,54,rearGarageY+11)],
      metadata:{topology:"credible-deep-narrow-22",designGroup:"credible-deep-narrow",designIntent:"deep-narrow-22x22-garages",intendedLivingA:1800,intendedLivingB:1800,garageStandard:"22x22",mobilityRebuild:true,adaptiveBuildingTranslation:true}
    };
  }
};

export const credibleStaggered: FamilySearch = {
  id:"credible-staggered",
  variables:[
    {id:"frontX",min:79,max:82,step:1},
    {id:"rearX",min:25,max:26,step:1},
    {id:"rearW",min:31,max:32,step:1},
    {id:"frontY",min:5,max:7,step:1},
    {id:"rearY",min:5,max:7,step:1},
    {id:"wingW",min:14,max:18,step:2},
    {id:"wingD",min:8,max:10,step:1},
    {id:"rearGarageY",min:14,max:18,step:1},
    {id:"spineY",min:36.5,max:39,step:.5},
    {id:"turnX",min:79,max:81,step:1},
    {id:"alignX",min:67,max:71,step:1}
  ],
  build:(v,serial):PlacementCandidate=>{
    const rearEast=v.rearX+v.rearW;
    const frontGarageY=v.frontY+2;
    const mouthY=v.rearGarageY+11;
    return {
      id:`PONDY-CST-${serial}`,
      family:"credible-staggered",
      placements:[
        ...unitMass({id:"A",plateX:v.frontX,plateY:v.frontY,plateW:128-v.frontX,plateD:25,garageX:106,garageY:frontGarageY}),
        ...unitMass({id:"B",plateX:v.rearX,plateY:v.rearY,plateW:v.rearW,plateD:32.5,garageX:rearEast-22,garageY:v.rearGarageY,wings:[{id:"EAST-WING",x:rearEast,y:v.rearY,widthFt:v.wingW,depthFt:v.wingD}]})
      ],
      drives:[frontDrive(frontGarageY+11),rearDrive(v.spineY,v.turnX,v.alignX,mouthY,rearEast,mouthY)],
      metadata:{topology:"credible-staggered-22",designGroup:"credible-staggered",designIntent:"staggered-spine-22x22-garages",intendedLivingA:1800,intendedLivingB:1800,garageStandard:"22x22",mobilityRebuild:true,adaptiveBuildingTranslation:true}
    };
  }
};

/**
 * Owner-selected Design #2 rebuilt for the hardened 20.5 ft vehicle.
 * The previous 20x20 version is intentionally left in diversity.ts as historical
 * evidence, but is not used by the active benchmark. This version makes the entire
 * duplex and rear garage stack translation variables rather than freezing their
 * coordinates. That lets the solver trade a foot of building movement for cleaner
 * circulation before it invents a larger motor court.
 */
export const credibleRearGarageStack: FamilySearch = {
  id:"rear-garage-stack",
  variables:[
    {id:"spineY",min:37.5,max:40,step:.5},
    {id:"turnX",min:70,max:82,step:2},
    {id:"flareX",min:38,max:52,step:2},
    {id:"garageX",min:5,max:9,step:1},
    {id:"garageSouthY",min:5,max:7,step:1},
    {id:"garageGap",min:1,max:2,step:1},
    {id:"duplexX",min:52,max:58,step:1},
    {id:"duplexY",min:5,max:8,step:1},
    {id:"partyX",min:92,max:95,step:1}
  ],
  build:(v,serial):PlacementCandidate=>{
    const garageSouthY=v.garageSouthY;
    const garageNorthY=garageSouthY+GARAGE_D+v.garageGap;
    const mouthX=v.garageX+GARAGE_W;
    const southMouthY=garageSouthY+GARAGE_D/2;
    const northMouthY=garageNorthY+GARAGE_D/2;
    const partyGap=.04;
    return {
      id:`PONDY-RGS22-${serial}`,
      family:"rear-garage-stack",
      placements:[
        {id:"HOME-B",kind:"home",x:v.duplexX,y:v.duplexY,widthFt:v.partyX-v.duplexX-partyGap,depthFt:22,movable:false,integrationGroupId:"unit-B",circulationObstacle:false},
        {id:"HOME-B-NORTH-LEG",kind:"home",x:v.partyX-20-partyGap,y:v.duplexY+22,widthFt:20,depthFt:6,movable:false,integrationGroupId:"unit-B",circulationObstacle:false},
        {id:"HOME-A",kind:"home",x:v.partyX,y:v.duplexY,widthFt:128-v.partyX,depthFt:28,movable:false,integrationGroupId:"unit-A",circulationObstacle:false},
        {id:"GARAGE-A",kind:"garage",x:v.garageX,y:garageSouthY,widthFt:GARAGE_W,depthFt:GARAGE_D,movable:false,integrationGroupId:"unit-A",circulationObstacle:true},
        {id:"GARAGE-B",kind:"garage",x:v.garageX,y:garageNorthY,widthFt:GARAGE_W,depthFt:GARAGE_D,movable:false,integrationGroupId:"unit-B",circulationObstacle:true}
      ],
      drives:[
        {id:"DRIVE-A",garageId:"GARAGE-A",points:[[151,v.spineY],[v.turnX,v.spineY],[v.flareX,36],[mouthX+12,southMouthY+12],[mouthX+6,southMouthY+6],[mouthX,southMouthY]],movableControlPoints:[1,2,3,4],controlPointLimitFt:2.5},
        {id:"DRIVE-B",garageId:"GARAGE-B",points:[[151,v.spineY],[v.turnX,v.spineY],[v.flareX,38],[mouthX+10,northMouthY],[mouthX,northMouthY]],movableControlPoints:[1,2,3],controlPointLimitFt:2.5}
      ],
      metadata:{topology:"accessory-rear-stack-connected-L-duplex-22",designGroup:"rear-garage-stack",designIntent:"owner-base-shape-accessory-rear-garages-L-duplex-22",intendedLivingA:1800,intendedLivingB:1800,garageStandard:"22x22",garagePlacementLockedToRear:true,garageAccessoryHypothesis:true,accessoryRearSetbackFt:5,accessorySideSetbackFt:5,minimumGarageDuplexSeparationFt:6,duplexConnected:true,duplexPartyWallIntent:true,adaptiveBuildingTranslation:true,mobilityRebuild:true,designDevelopmentPass:"hardened-22-adaptive-translation",movementPolicy:"translate buildings/garages before consuming more site with pavement"}
    };
  }
};

export const credibleFamilies: FamilySearch[] = [
  credibleCompactFront,
  credibleBalancedTwin,
  credibleFrontL,
  credibleDeepNarrow,
  credibleStaggered,
  credibleRearGarageStack
];
