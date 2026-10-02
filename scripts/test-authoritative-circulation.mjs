import assert from "node:assert/strict";
import { CANDIDATE_SCHEMA_VERSION } from "../packages/candidates/index.ts";
import { constantCurvatureConnector, evaluateAuthoritativeCirculation } from "../packages/circulation/authoritative-search.ts";
import { bodyInsidePolygonUnion } from "../packages/circulation/hardened.ts";

const candidate = {
  schemaVersion: CANDIDATE_SCHEMA_VERSION,
  id: "straight-circulation-test",
  projectId: "test",
  lotId: "test-lot",
  designId: "test-design",
  revisionLabel: "Straight test",
  label: "Straight circulation test",
  family: "test",
  topologyKey: "straight",
  source: "STAFF_INTERVENTION",
  status: "PARTIAL_FAIL",
  evidenceState: "STALE",
  classificationReason: "test",
  components: [
    { id: "parcel", kind: "parcel", label: "Parcel", polygon: [[0,0],[100,0],[100,60],[0,60]], locked: true },
    { id: "garage", kind: "garage", label: "Garage", x: 10, y: 20, widthFt: 22, depthFt: 22, rotationDeg: 0, movable: true, resizable: false },
    { id: "garage-opening", kind: "opening", label: "East opening", ownerId: "garage", wall: "east", openingWidthFt: 20, offsetFt: 1 },
    { id: "stall", kind: "stall", label: "Stall", garageId: "garage", axleX: 27.25, axleY: 31, headingDeg: 180, vehicleId: "FS-SUV" },
    { id: "pavement-a", kind: "pavement", label: "Drive pavement A", polygon: [[32,23],[66,23],[66,39],[32,39]] },
    { id: "pavement-b", kind: "pavement", label: "Drive pavement B", polygon: [[66,23],[100,23],[100,39],[66,39]] },
    { id: "route", kind: "driveway", label: "Street route", points: [[100,31],[65,31],[32,31]], widthFt: 16 }
  ],
  evaluationHistory: [],
  currentEvaluationId: null,
  lineage: { parentCandidateId: null, rootCandidateId: "straight-circulation-test", relation: "ROOT" },
  tags: [], staffNotes: [], createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z"
};

const result = evaluateAuthoritativeCirculation(candidate, { maxExpandedStates: 15000, portalWidthFt: 18, portalDepthFt: 32 });
assert.equal(result.summary.stallCount, 1);
assert.equal(result.summary.inboundPass, 1, result.stalls[0]?.inbound.failure ?? "inbound must pass");
assert.equal(result.summary.outboundPass, 1, result.stalls[0]?.outbound.failure ?? "outbound must pass");
assert.equal(result.pass, true, "straight reference geometry must close full independent circulation");
assert.equal(result.policyReady, null, "hard geometry must not invent a comfort-policy decision");
// Historical D4 planners appended the exact stall pose once they were merely nearby.
// B-South's accepted penultimate pose requires lateral translation with no heading change,
// which is not a realizable constant-curvature vehicle connector. Keep this as a regression.
const historicalBSouthConnector = constantCurvatureConnector(
  { x: 22.619, y: 21.803, headingRad: -Math.PI, gear: 1 },
  { x: 22.25, y: 21.5, headingRad: Math.PI, gear: 1 },
  25
);
assert.equal(historicalBSouthConnector, null, "historical B-South endpoint jump must not be accepted as physical motion");
assert(result.stalls[0].inbound.audit?.sampleCount > result.stalls[0].inbound.poses.length, "audit must independently densify the planner path");

const body = [[0,0],[10,0],[10,4],[0,4]];
const adjacent = [[[-1,-1],[5,-1],[5,5],[-1,5]],[[5,-1],[11,-1],[11,5],[5,5]]];
assert.equal(bodyInsidePolygonUnion(body, adjacent, .01, .25), true, "adjacent pavement polygons must act as one union surface");
const gapped = [[[-1,-1],[4.7,-1],[4.7,5],[-1,5]],[[5.3,-1],[11,-1],[11,5],[5.3,5]]];
assert.equal(bodyInsidePolygonUnion(body, gapped, .01, .25), false, "an actual pavement gap must not pass union containment");

console.log(JSON.stringify({
  schemaVersion: result.schemaVersion,
  independentInbound: result.summary.inboundPass,
  independentOutbound: result.summary.outboundPass,
  densifiedAuditSamples: result.stalls[0].inbound.audit?.sampleCount,
  pavementUnion: true,
  comfortPolicyInvented: false,
  rejectsHistoricalEndpointTeleport: true
}, null, 2));
