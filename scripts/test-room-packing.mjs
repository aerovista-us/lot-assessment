import assert from "node:assert/strict";
import { freezeCandidate } from "../packages/canonical/index.ts";
import { evaluateRoomPacking, ROOM_PACKING_SCHEMA } from "../packages/room-packing/index.ts";

const candidate = {
  id: "ROOM-PACK-SELFTEST",
  family: "selftest",
  placements: [
    { id:"HOME-A", kind:"home", x:80, y:5, widthFt:40, depthFt:28, movable:false, integrationGroupId:"unit-A" },
    { id:"GARAGE-A", kind:"garage", x:121, y:7, widthFt:20, depthFt:20, movable:false, integrationGroupId:"unit-A" },
    { id:"HOME-B", kind:"home", x:30, y:5, widthFt:40, depthFt:28, movable:false, integrationGroupId:"unit-B" },
    { id:"GARAGE-B", kind:"garage", x:71, y:7, widthFt:20, depthFt:20, movable:false, integrationGroupId:"unit-B" }
  ],
  drives: [],
  metadata: { intendedLivingA:1800, intendedLivingB:1800 }
};
const freeze=freezeCandidate({projectId:"pondy-lot2",projectRevision:"selftest",scenarioId:"baseline",solverVersion:"selftest",scoringVersion:"selftest",candidate});
const spec={units:["A","B"],stories:2,bedroomsPerUnit:3,fullBathsPerUnit:2,minimumLivingWidthFt:22,minimumBedroomWidthFt:9,minimumStairWidthFt:3,stairFootprintSqFt:90,entryFootprintSqFt:35,mechanicalStorageSqFt:70,circulationAndWallReservePct:0.14,daylightEdgeTargetFt:100};
const result=evaluateRoomPacking(freeze,spec);
assert.equal(result.schemaVersion,ROOM_PACKING_SCHEMA);
assert.equal(result.sourceFreezeHash,freeze.freezeHash);
assert.equal(result.unitResults.length,2);
assert.equal(result.pass,true);
assert.ok(result.score>0);
assert.equal(result.unitResults.every(unit => unit.checks.contiguousMassing), true);
assert.equal(result.unitResults.every(unit => unit.checks.publicZoneCapacity && unit.checks.privateZoneCapacity), true);
const mutated=JSON.parse(JSON.stringify(freeze));
mutated.freezeHash="0".repeat(64);
const derived=evaluateRoomPacking(mutated,spec);
assert.equal(derived.sourceFreezeHash,"0".repeat(64));
console.log(JSON.stringify({schemaVersion:result.schemaVersion,pass:result.pass,score:result.score,freezeBound:true},null,2));
