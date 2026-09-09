import type { CanonicalCandidateV1, FrozenCandidate } from "@/packages/canonical";

export const ROOM_PACKING_SCHEMA = "lotscope-room-pack-v1" as const;

export type RoomPackingSpec = {
  units: string[];
  stories: number;
  bedroomsPerUnit: number;
  fullBathsPerUnit: number;
  minimumLivingWidthFt: number;
  minimumBedroomWidthFt: number;
  minimumStairWidthFt: number;
  stairFootprintSqFt: number;
  entryFootprintSqFt: number;
  mechanicalStorageSqFt: number;
  circulationAndWallReservePct: number;
  daylightEdgeTargetFt: number;
};

export type UnitPackingResult = {
  unitId: string;
  pass: boolean;
  score: number;
  grossHomePlateSqFt: number;
  garageOverlapSqFt: number;
  netTwoStoryCapacitySqFt: number;
  effectivePlanningCapacitySqFt: number;
  primaryShortSideFt: number | null;
  primaryAspectRatio: number | null;
  daylightEdgeFt: number;
  checks: {
    roomWidth: boolean;
    stairZone: boolean;
    entryZone: boolean;
    mechanicalStorage: boolean;
    bedrooms: boolean;
    bathrooms: boolean;
    circulationReserve: boolean;
    garageRelationship: boolean;
    daylightOpportunity: boolean;
    contiguousMassing: boolean;
    usableComponents: boolean;
    publicZoneCapacity: boolean;
    privateZoneCapacity: boolean;
    wetCoreAllowance: boolean;
  };
  penalties: string[];
  reasons: string[];
};

export type RoomPackingEvaluation = {
  schemaVersion: typeof ROOM_PACKING_SCHEMA;
  sourceFreezeHash: string;
  pass: boolean;
  score: number;
  unitResults: UnitPackingResult[];
  reasons: string[];
};

type Placement = CanonicalCandidateV1["candidate"]["placements"][number];

function rectGap(a: Placement, b: Placement) {
  const dx = Math.max(b.x - (a.x + a.widthFt), a.x - (b.x + b.widthFt), 0);
  const dy = Math.max(b.y - (a.y + a.depthFt), a.y - (b.y + b.depthFt), 0);
  return Math.hypot(dx, dy);
}

function connectedComponents(items: Placement[]) {
  if (!items.length) return 0;
  const seen = new Set<number>();
  let groups = 0;
  for (let start = 0; start < items.length; start += 1) {
    if (seen.has(start)) continue;
    groups += 1;
    const queue = [start];
    seen.add(start);
    while (queue.length) {
      const current = queue.shift()!;
      for (let next = 0; next < items.length; next += 1) {
        if (seen.has(next)) continue;
        if (rectGap(items[current], items[next]) <= 0.1) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
  }
  return groups;
}

function overlapArea(a: Placement, b: Placement) {
  const width = Math.max(0, Math.min(a.x + a.widthFt, b.x + b.widthFt) - Math.max(a.x, b.x));
  const depth = Math.max(0, Math.min(a.y + a.depthFt, b.y + b.depthFt) - Math.max(a.y, b.y));
  return width * depth;
}

function unitHomes(candidate: CanonicalCandidateV1["candidate"], unitId: string) {
  const primaryId = `HOME-${unitId}`;
  const primary = candidate.placements.find((item) => item.id === primaryId && item.kind === "home");
  const group = primary?.integrationGroupId;
  return {
    primary,
    homes: candidate.placements.filter((item) =>
      item.kind === "home" && group != null && item.integrationGroupId === group &&
      (item.id === primaryId || item.id.startsWith(`${primaryId}-`))
    ),
    garage: candidate.placements.find((item) => item.kind === "garage" && group != null && item.integrationGroupId === group)
  };
}

export function evaluateRoomPacking(frozen: FrozenCandidate, spec: RoomPackingSpec): RoomPackingEvaluation {
  const candidate = frozen.canonical.candidate;
  const unitResults = spec.units.map((unitId): UnitPackingResult => {
    const { primary, homes, garage } = unitHomes(candidate, unitId);
    const reasons: string[] = [];
    const penalties: string[] = [];
    if (!primary || !homes.length) {
      return {
        unitId, pass: false, score: 0, grossHomePlateSqFt: 0, garageOverlapSqFt: 0,
        netTwoStoryCapacitySqFt: 0, effectivePlanningCapacitySqFt: 0,
        primaryShortSideFt: null, primaryAspectRatio: null, daylightEdgeFt: 0,
        checks: { roomWidth:false, stairZone:false, entryZone:false, mechanicalStorage:false, bedrooms:false, bathrooms:false, circulationReserve:false, garageRelationship:false, daylightOpportunity:false, contiguousMassing:false, usableComponents:false, publicZoneCapacity:false, privateZoneCapacity:false, wetCoreAllowance:false },
        penalties, reasons:[`HOME-${unitId} geometry missing from frozen candidate`]
      };
    }

    const plateArea = homes.reduce((sum, home) => sum + home.widthFt * home.depthFt, 0);
    const garageOverlap = garage ? homes.reduce((sum, home) => sum + overlapArea(home, garage), 0) : 0;
    const netTwoStoryCapacity = plateArea * spec.stories - garageOverlap;
    const reserve = netTwoStoryCapacity * spec.circulationAndWallReservePct;
    const fixedProgram = spec.stairFootprintSqFt + spec.entryFootprintSqFt + spec.mechanicalStorageSqFt;
    const effectivePlanningCapacity = netTwoStoryCapacity - reserve - fixedProgram;
    const shortSide = Math.min(primary.widthFt, primary.depthFt);
    const longSide = Math.max(primary.widthFt, primary.depthFt);
    const aspect = longSide / Math.max(shortSide, 0.01);
    const daylightEdge = homes.reduce((sum, home) => sum + 2 * (home.widthFt + home.depthFt), 0);
    const componentGroups = connectedComponents(homes);
    const usableComponents = homes.every((home) => Math.min(home.widthFt, home.depthFt) >= 8 && home.widthFt * home.depthFt >= 96);
    const contiguousMassing = componentGroups === 1;
    const groundPlanningCapacity = Math.max(0, plateArea - garageOverlap - reserve / Math.max(spec.stories, 1) - fixedProgram);
    const upperPlanningCapacity = Math.max(0, plateArea * Math.max(spec.stories - 1, 0) - reserve * Math.max(spec.stories - 1, 0) / Math.max(spec.stories, 1));
    const publicZoneCapacity = groundPlanningCapacity >= 520;
    const privateZoneNeed = spec.bedroomsPerUnit * 100 + spec.fullBathsPerUnit * 45 + 120;
    const privateZoneCapacity = upperPlanningCapacity >= privateZoneNeed;
    const wetCoreAllowance = groundPlanningCapacity + upperPlanningCapacity >= privateZoneNeed + 650;

    const roomWidth = shortSide >= spec.minimumLivingWidthFt;
    const stairZone = shortSide >= spec.minimumStairWidthFt + 8 && effectivePlanningCapacity >= spec.stairFootprintSqFt;
    const entryZone = effectivePlanningCapacity >= spec.entryFootprintSqFt + 600;
    const mechanicalStorage = effectivePlanningCapacity >= spec.mechanicalStorageSqFt + 600;
    const bedroomAllowance = spec.bedroomsPerUnit * Math.max(100, spec.minimumBedroomWidthFt * 10);
    const bedrooms = effectivePlanningCapacity >= bedroomAllowance + 650;
    const bathrooms = effectivePlanningCapacity >= spec.fullBathsPerUnit * 45 + 650;
    const circulationReserve = reserve >= Math.min(180, netTwoStoryCapacity * 0.08);
    const garageRelationship = Boolean(garage);
    const daylightOpportunity = daylightEdge >= spec.daylightEdgeTargetFt;

    if (!roomWidth) reasons.push(`primary short side ${shortSide.toFixed(1)} ft is too tight for robust room packing`);
    if (!stairZone) reasons.push("credible stair zone cannot be reserved");
    if (!bedrooms) reasons.push(`${spec.bedroomsPerUnit}-bedroom allowance does not fit after planning reserves`);
    if (!bathrooms) reasons.push(`${spec.fullBathsPerUnit} full-bath allowance does not fit after planning reserves`);
    if (!garageRelationship) reasons.push("garage relationship is missing");
    if (!contiguousMassing) reasons.push(`home mass breaks into ${componentGroups} disconnected planning pieces`);
    if (!usableComponents) reasons.push("one or more home components are too small/slender to count as useful planning area");
    if (!publicZoneCapacity) reasons.push(`ground-floor public/service capacity ${groundPlanningCapacity.toFixed(0)} SF is too tight`);
    if (!privateZoneCapacity) reasons.push(`upper/private capacity ${upperPlanningCapacity.toFixed(0)} SF is below the bedroom/bath planning allowance`);
    if (!wetCoreAllowance) reasons.push("combined planning capacity leaves insufficient tolerance for wet-core stacking and circulation");
    if (!daylightOpportunity) penalties.push("limited exterior edge reduces daylight/frontage opportunity");
    if (aspect > 1.8) penalties.push(`elongated primary plate ${aspect.toFixed(2)} risks corridor-heavy planning`);
    if (shortSide < 26) penalties.push(`tight ${shortSide.toFixed(1)} ft primary short side reduces room flexibility`);
    if (reserve < 180) penalties.push("low wall/circulation reserve leaves little tolerance for detailed planning");

    const checks = { roomWidth, stairZone, entryZone, mechanicalStorage, bedrooms, bathrooms, circulationReserve, garageRelationship, daylightOpportunity, contiguousMassing, usableComponents, publicZoneCapacity, privateZoneCapacity, wetCoreAllowance };
    const hardPass = roomWidth && stairZone && entryZone && mechanicalStorage && bedrooms && bathrooms && circulationReserve && garageRelationship && contiguousMassing && usableComponents && publicZoneCapacity && privateZoneCapacity && wetCoreAllowance;
    const failedChecks = Object.values(checks).filter((value) => !value).length;
    const score = Math.max(0, Math.min(100, 100 - failedChecks * 12 - penalties.length * 6 - Math.max(0, aspect - 1.6) * 10));

    return { unitId, pass: hardPass, score, grossHomePlateSqFt: plateArea, garageOverlapSqFt: garageOverlap, netTwoStoryCapacitySqFt: netTwoStoryCapacity, effectivePlanningCapacitySqFt: effectivePlanningCapacity, primaryShortSideFt: shortSide, primaryAspectRatio: aspect, daylightEdgeFt: daylightEdge, checks, penalties, reasons };
  });

  const pass = unitResults.every((unit) => unit.pass);
  const score = unitResults.length ? unitResults.reduce((sum, unit) => sum + unit.score, 0) / unitResults.length : 0;
  return {
    schemaVersion: ROOM_PACKING_SCHEMA,
    sourceFreezeHash: frozen.freezeHash,
    pass,
    score,
    unitResults,
    reasons: unitResults.flatMap((unit) => unit.reasons.map((reason) => `Unit ${unit.unitId}: ${reason}`))
  };
}
