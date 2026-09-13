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
 * design vehicle. Each garage is 22x22 and its east-facing mouth remains aligned with
 * the proven approach endpoint. These are new discovery families, not silent edits to
 * frozen historical candidates.
 */
export const credibleCompactFront: FamilySearch = {
  id:"credible-compact-front",
  variables:[
    {id:"spineY",min:36,max:37,step:.5},
    {id:"turnX",min:79,max:82,step:1},
    {id:"bendY",min:25.5,max:26.5,step:.5},
    {id:"frontX",min:79,max:83,step:1},
    {id:"rearWingW",min:16,max:20,step:2},
    {id:"rearWingD",min:10,max:12,step:1}
  ],
  build:(v,serial):PlacementCandidate=>({
    id:`PONDY-CCF-${serial}`,
    family:"credible-compact-front",
    placements:[
      ...unitMass({id:"A",plateX:v.frontX,plateY:5,plateW:128-v.frontX,plateD:27,garageX:106,garageY:7}),
      ...unitMass({id:"B",plateX:25,plateY:5,plateW:32,plateD:32.5,garageX:35,garageY:15,wings:[{id:"EAST-WING",x:57,y:5,widthFt:v.rearWingW,depthFt:v.rearWingD}]})
    ],
    drives:[frontDrive(18),rearDrive(v.spineY,v.turnX,68,v.bendY,57,26)],
    metadata:{topology:"credible-compact-front-22",designGroup:"credible-compact-front",designIntent:"22x22-garage-compact-front",intendedLivingA:1800,intendedLivingB:1800,garageStandard:"22x22",mobilityRebuild:true}
  })
};

export const credibleBalancedTwin: FamilySearch = {
  id:"credible-balanced-twin",
  variables:[
    {id:"spineY",min:36,max:37,step:.5},
    {id:"turnX",min:79,max:82,step:1},
    {id:"bendY",min:25.5,max:26.5,step:.5}
  ],
  build:(v,serial):PlacementCandidate=>({
    id:`PONDY-CBT-${serial}`,
    family:"credible-balanced-twin",
    placements:[
      ...unitMass({id:"A",plateX:82,plateY:5,plateW:46,plateD:26,garageX:106,garageY:7}),
      ...unitMass({id:"B",plateX:25,plateY:5,plateW:31,plateD:32.5,garageX:34,garageY:15,wings:[{id:"EAST-WING",x:56,y:5,widthFt:17,depthFt:11}]})
    ],
    drives:[frontDrive(18),rearDrive(v.spineY,v.turnX,67,v.bendY,56,26)],
    metadata:{topology:"credible-balanced-twin-22",designGroup:"credible-balanced-twin",designIntent:"balanced-massing-22x22-garages",intendedLivingA:1800,intendedLivingB:1800,garageStandard:"22x22",mobilityRebuild:true}
  })
};

export const credibleFrontL: FamilySearch = {
  id:"credible-front-l",
  variables:[
    {id:"spineY",min:36,max:37,step:.5},
    {id:"turnX",min:79,max:82,step:1},
    {id:"bendY",min:25.5,max:26.5,step:.5}
  ],
  build:(v,serial):PlacementCandidate=>({
    id:`PONDY-CFL-${serial}`,
    family:"credible-front-l",
    placements:[
      ...unitMass({id:"A",plateX:96,plateY:5,plateW:32,plateD:25,garageX:106,garageY:7,wings:[{id:"LOW-WEST",x:78,y:5,widthFt:18,depthFt:23}]}),
      ...unitMass({id:"B",plateX:25,plateY:5,plateW:32,plateD:32.5,garageX:35,garageY:15,wings:[{id:"EAST-WING",x:57,y:5,widthFt:16,depthFt:10}]})
    ],
    drives:[frontDrive(18),rearDrive(v.spineY,v.turnX,68,v.bendY,57,26)],
    metadata:{topology:"credible-front-l-22",designGroup:"credible-front-l",designIntent:"front-L-massing-22x22-garages",intendedLivingA:1800,intendedLivingB:1800,garageStandard:"22x22",mobilityRebuild:true}
  })
};

export const credibleDeepNarrow: FamilySearch = {
  id:"credible-deep-narrow",
  variables:[
    {id:"spineY",min:36,max:37,step:.5},
    {id:"turnX",min:79,max:82,step:1},
    {id:"bendY",min:25.5,max:26.5,step:.5}
  ],
  build:(v,serial):PlacementCandidate=>({
    id:`PONDY-CDN-${serial}`,
    family:"credible-deep-narrow",
    placements:[
      ...unitMass({id:"A",plateX:79,plateY:5,plateW:49,plateD:25,garageX:106,garageY:7}),
      ...unitMass({id:"B",plateX:25,plateY:5,plateW:29,plateD:32.5,garageX:32,garageY:15,wings:[{id:"EAST-WING",x:54,y:5,widthFt:20,depthFt:12}]})
    ],
    drives:[frontDrive(18),rearDrive(v.spineY,v.turnX,66,v.bendY,54,26)],
    metadata:{topology:"credible-deep-narrow-22",designGroup:"credible-deep-narrow",designIntent:"deep-narrow-22x22-garages",intendedLivingA:1800,intendedLivingB:1800,garageStandard:"22x22",mobilityRebuild:true}
  })
};

export const credibleStaggered: FamilySearch = {
  id:"credible-staggered",
  variables:[
    {id:"frontX",min:79,max:82,step:1},
    {id:"rearX",min:25,max:26,step:1},
    {id:"rearW",min:31,max:32,step:1},
    {id:"wingW",min:14,max:18,step:2},
    {id:"wingD",min:8,max:10,step:1},
    {id:"rearGarageY",min:14,max:16,step:1},
    {id:"spineY",min:36.5,max:38,step:.5},
    {id:"turnX",min:79,max:81,step:1},
    {id:"alignX",min:67,max:71,step:1}
  ],
  build:(v,serial):PlacementCandidate=>{
    const rearEast=v.rearX+v.rearW;
    const mouthY=v.rearGarageY+10;
    return {
      id:`PONDY-CST-${serial}`,
      family:"credible-staggered",
      placements:[
        ...unitMass({id:"A",plateX:v.frontX,plateY:5,plateW:128-v.frontX,plateD:25,garageX:106,garageY:7}),
        ...unitMass({id:"B",plateX:v.rearX,plateY:5,plateW:v.rearW,plateD:32.5,garageX:rearEast-22,garageY:v.rearGarageY-1,wings:[{id:"EAST-WING",x:rearEast,y:5,widthFt:v.wingW,depthFt:v.wingD}]})
      ],
      drives:[frontDrive(18),rearDrive(v.spineY,v.turnX,v.alignX,mouthY,rearEast,mouthY)],
      metadata:{topology:"credible-staggered-22",designGroup:"credible-staggered",designIntent:"staggered-spine-22x22-garages",intendedLivingA:1800,intendedLivingB:1800,garageStandard:"22x22",mobilityRebuild:true}
    };
  }
};

export const credibleFamilies: FamilySearch[] = [
  credibleCompactFront,
  credibleBalancedTwin,
  credibleFrontL,
  credibleDeepNarrow,
  credibleStaggered
];
