import { rotatePoint, type Point } from "@/packages/geometry";
import {
  CANDIDATE_SCHEMA_VERSION,
  classifyCandidate,
  type CandidateComponent,
  type CandidateEvaluation,
  type CandidateRecord,
  type CandidateRegistry
} from "@/packages/candidates";

const CREATED_AT = "2026-09-13T20:57:07.605Z";
const PARCEL: Point[] = [[0, 0], [148, 0], [148, 50], [125.143, 43.016], [84.813, 43.016], [0, 57.01]];
const PRINCIPAL_ENVELOPE: Point[] = [[25, 5], [128, 5], [128, 30.112], [122.5, 33.016], [84.813, 33.016], [25, 42.886]];

function d4BaseComponents(): CandidateComponent[] {
  return [
    { id: "parcel", kind: "parcel", label: "Lot 2 survey", polygon: PARCEL, locked: true, provenance: "Pondy survey geometry" },
    { id: "principal-envelope", kind: "envelope", label: "Principal buildable envelope", polygon: PRINCIPAL_ENVELOPE, locked: true, provenance: "Current planning setback interpretation" },
    { id: "home-b", kind: "home", label: "Home B", x: 54, y: 5, widthFt: 40.5, depthFt: 26.25, polygon: [[54, 5], [94.5, 5], [94.5, 31.25], [72.5, 31.25], [72.5, 22], [54, 22]], movable: true, resizable: true },
    { id: "home-a", kind: "home", label: "Home A", x: 94.5, y: 5, widthFt: 33.5, depthFt: 26.25, movable: true, resizable: true },
    { id: "garage-b", kind: "garage", label: "Garage B", x: 5, y: 5, widthFt: 22, depthFt: 22, rotationDeg: 0, movable: true, resizable: false, rotationLimitDeg: 45 },
    { id: "garage-a", kind: "garage", label: "Garage A", x: 5, y: 29, widthFt: 22, depthFt: 22, rotationDeg: 0, movable: true, resizable: false, rotationLimitDeg: 45 },
    { id: "garage-b-opening", kind: "opening", label: "Garage B east opening", ownerId: "garage-b", wall: "east", openingWidthFt: 20, offsetFt: 1 },
    { id: "garage-a-opening", kind: "opening", label: "Garage A east opening", ownerId: "garage-a", wall: "east", openingWidthFt: 20, offsetFt: 1 },
    { id: "b-north", kind: "stall", label: "B-North", garageId: "garage-b", axleX: 22.25, axleY: 10.5, headingDeg: 180, vehicleId: "FS-SUV" },
    { id: "b-south", kind: "stall", label: "B-South", garageId: "garage-b", axleX: 22.25, axleY: 21.5, headingDeg: 180, vehicleId: "FS-SUV" },
    { id: "a-north", kind: "stall", label: "A-North", garageId: "garage-a", axleX: 22.25, axleY: 34.5, headingDeg: 180, vehicleId: "FS-SUV" },
    { id: "a-south", kind: "stall", label: "A-South", garageId: "garage-a", axleX: 22.25, axleY: 45.5, headingDeg: 180, vehicleId: "FS-SUV" }
  ];
}

function d4SiteComponents(): CandidateComponent[] {
  return [
    ...d4BaseComponents(),
    { id: "west-maneuver-apron", kind: "pavement", label: "25 ft maneuver apron", polygon: [[27, 6], [52, 6], [52, 47.4], [27, 51.5]] },
    { id: "apron-connector", kind: "pavement", label: "Apron connector", polygon: [[52, 32], [54, 32], [54, 42], [52, 42]] },
    { id: "shared-drive-lane", kind: "pavement", label: "10 ft shared drive lane", polygon: [[54, 32], [148, 32], [148, 42], [54, 42]] },
    { id: "shared-drive-route", kind: "driveway", label: "Pennsylvania shared-drive centerline", points: [[148, 37], [54, 37], [40, 37]], widthFt: 10, movableControlPoints: [1, 2] },
    { id: "outbound-open-note", kind: "annotation", label: "Outbound gate", point: [47, 28], text: "Independent stall-to-Pennsylvania outbound proof remains open." }
  ];
}

const d4Evaluation: CandidateEvaluation = {
  id: "eval-pondy-d4-20260913",
  candidateId: "pondy-d4",
  createdAt: "2026-09-13T16:17:02.958Z",
  engineVersion: "pondy-d4-multitool-repair-v1 / lotscope-evidence-v1",
  rulesVersion: "D4-REAR22-v0.3 planning rules",
  schemaVersion: "lotscope-assessment-evidence-v1",
  status: "PARTIAL_FAIL",
  promotionReady: false,
  summary: "Four inbound stall paths are proven, but independent outbound circulation remains open and B-South is marginal at the current door crossing.",
  gates: [
    { id: "parcel", label: "Parcel / base geometry", status: "PASS", summary: "Current Design 4 components remain inside the modeled site geometry.", blockerClass: "parcel" },
    { id: "program", label: "Two garages / four stalls", status: "PASS", summary: "Two 22x22 detached garages and four enclosed stall poses are retained.", blockerClass: "program" },
    { id: "inbound", label: "Inbound circulation", status: "PASS_TIGHT", summary: "All four inbound paths are demonstrated with companion-vehicle occupancy." },
    { id: "outbound", label: "Independent outbound circulation", status: "FAIL", summary: "No compared repair strategy has yet demonstrated stall-to-Pennsylvania outbound travel.", blockerClass: "circulation", repairClasses: ["reshape-drive", "rotate-garage", "local-pavement-flare", "translate-garage"] },
    { id: "b-south-door", label: "B-South door clearance", status: "WATCH", summary: "Current worst door margin is 0.073 ft.", blockerClass: "clearance", repairClasses: ["reshape-drive", "rotate-garage", "edit-opening"] },
    { id: "accessory-zoning", label: "Accessory zoning", status: "PROFESSIONAL_REVIEW", summary: "Parcel-specific detached-garage interpretation remains open." }
  ]
};

function rotatedGarageBStalls() {
  const garageCenter: Point = [33, 17.5];
  const north = rotatePoint([39.25, 12], garageCenter, 35 * Math.PI / 180);
  const south = rotatePoint([39.25, 23], garageCenter, 35 * Math.PI / 180);
  return { north, south };
}

function d4bComponents(): CandidateComponent[] {
  const stalls = rotatedGarageBStalls();
  const base = d4BaseComponents().filter((item) => !["garage-b", "garage-a", "b-north", "b-south", "a-north", "a-south", "garage-b-opening", "garage-a-opening"].includes(item.id));
  return [
    ...base,
    { id: "garage-b", kind: "garage", label: "Garage B", x: 22, y: 6.5, widthFt: 22, depthFt: 22, rotationDeg: 35, movable: true, resizable: false, rotationLimitDeg: 45 },
    { id: "garage-a", kind: "garage", label: "Garage A", x: 5, y: 29.5, widthFt: 22, depthFt: 22, rotationDeg: 0, movable: true, resizable: false, rotationLimitDeg: 45 },
    { id: "garage-b-opening", kind: "opening", label: "Garage B rotated east-local opening", ownerId: "garage-b", wall: "east", openingWidthFt: 20, offsetFt: 1 },
    { id: "garage-a-opening", kind: "opening", label: "Garage A east opening", ownerId: "garage-a", wall: "east", openingWidthFt: 20, offsetFt: 1 },
    { id: "b-north", kind: "stall", label: "B-North", garageId: "garage-b", axleX: stalls.north[0], axleY: stalls.north[1], headingDeg: 215, vehicleId: "FS-SUV" },
    { id: "b-south", kind: "stall", label: "B-South", garageId: "garage-b", axleX: stalls.south[0], axleY: stalls.south[1], headingDeg: 215, vehicleId: "FS-SUV" },
    { id: "a-north", kind: "stall", label: "A-North", garageId: "garage-a", axleX: 22.25, axleY: 35, headingDeg: 180, vehicleId: "FS-SUV" },
    { id: "a-south", kind: "stall", label: "A-South", garageId: "garage-a", axleX: 22.25, axleY: 46, headingDeg: 180, vehicleId: "FS-SUV" },
    { id: "rot-study-west-pad", kind: "pavement", label: "Rotation study west maneuver pavement (+6 ft)", polygon: [[21, 0], [58, 0], [58, 57.5], [21, 57.5]] },
    { id: "rot-study-connector-pad", kind: "pavement", label: "Rotation study connector pavement (+6 ft)", polygon: [[46, 26], [60, 26], [60, 48], [46, 48]] },
    { id: "rot-study-shared-pad", kind: "pavement", label: "Rotation study shared-lane pavement (+6 ft)", polygon: [[48, 26], [154, 26], [154, 48], [48, 48]] },
    { id: "rot-study-fan", kind: "pavement", label: "Manual fan apron", polygon: [[25, 5], [61, 5], [61, 51], [25, 51]] },
    { id: "shared-drive-route", kind: "driveway", label: "Pennsylvania route search corridor", points: [[148, 37], [61, 37], [45, 28]], widthFt: 10, movableControlPoints: [1, 2] },
    { id: "rotation-note", kind: "annotation", label: "Design 4B study", point: [38, 8], text: "35 deg southeast-biased Garage B study; accessory setbacks require recertification." }
  ];
}

const d4bEvaluation: CandidateEvaluation = {
  id: "eval-pondy-d4b-rot35b-20260913",
  candidateId: "pondy-d4b-rot35b",
  createdAt: CREATED_AT,
  engineVersion: "pondy-d4-manual-rotation-study-v1",
  rulesVersion: "D4-REAR22-v0.3 + rotated-garage exploratory rules",
  schemaVersion: "pondy-d4-manual-rotation-study-v1",
  status: "PARTIAL_FAIL",
  promotionReady: false,
  summary: "The 35 deg southeast-biased Garage B study materially improves B-South door clearance, but independent outbound remains open and rotated accessory setbacks require recertification.",
  gates: [
    { id: "parcel", label: "Rotated garage parcel containment", status: "PASS", summary: "The rotated Garage B footprint remains inside the parcel in the exploratory static audit.", blockerClass: "parcel", metrics: { boundaryClearanceFt: 2.18 } },
    { id: "program", label: "Two homes / four enclosed stalls", status: "PASS", summary: "The Design 4B study preserves the two-home program, two 22x22 detached garages, and four enclosed stall poses.", blockerClass: "program" },
    { id: "structure-separation", label: "Garage / structure separation", status: "PASS_TIGHT", summary: "Garage B clears Garage A by 2.271 ft and Home B by 5.68 ft in the exploratory static audit.", metrics: { garageAClearanceFt: 2.271, homeBClearanceFt: 5.68 } },
    { id: "inbound", label: "B-South inbound", status: "PASS", summary: "B-South inbound passes with the companion stall occupied and 0 gear changes.", metrics: { minimumClearanceFt: 1.092, doorClearanceFt: 1.468 } },
    { id: "outbound", label: "Independent outbound circulation", status: "FAIL", summary: "The explicit stall-to-Pennsylvania search remains open in this study.", blockerClass: "circulation", repairClasses: ["reshape-drive", "local-pavement-flare", "translate-garage", "explore-around-rotation"] },
    { id: "rotated-accessory-setback", label: "Rotated accessory setback", status: "PROFESSIONAL_REVIEW", summary: "The exploratory run does not promote the rotated footprint until the accessory setback envelope is recertified.", blockerClass: "setback", repairClasses: ["translate-garage", "adjust-rotation"] }
  ]
};

const d4Classification = classifyCandidate(d4Evaluation);
const d4Candidate: CandidateRecord = {
  schemaVersion: CANDIDATE_SCHEMA_VERSION,
  id: "pondy-d4",
  projectId: "pondy-flats",
  lotId: "pondy-lot2",
  designId: "design-4",
  revisionLabel: "Design 4",
  label: "Design 4  -  shared-drive baseline",
  family: "rear-22-shared-drive",
  topologyKey: "two-detached-rear-garages/shared-pennsylvania-drive",
  source: "HISTORICAL",
  status: d4Classification.status,
  evidenceState: "CURRENT",
  classificationReason: d4Classification.reason,
  components: d4SiteComponents(),
  evaluationHistory: [d4Evaluation],
  currentEvaluationId: d4Evaluation.id,
  lineage: { parentCandidateId: null, rootCandidateId: "pondy-d4", relation: "ROOT" },
  tags: ["design-4", "shared-drive", "detached-garages", "outbound-open"],
  staffNotes: ["Machine status remains authoritative; this candidate is intervention-worthy but not a circulation PASS."],
  createdAt: "2026-09-13T16:17:02.958Z",
  updatedAt: "2026-09-13T16:17:02.958Z"
};

const d4bClassification = classifyCandidate(d4bEvaluation);
const d4bCandidate: CandidateRecord = {
  schemaVersion: CANDIDATE_SCHEMA_VERSION,
  id: "pondy-d4b-rot35b",
  projectId: "pondy-flats",
  lotId: "pondy-lot2",
  designId: "design-4",
  revisionLabel: "Design 4B",
  label: "Design 4B  -  rotated Garage B",
  family: "rear-22-rotated-garage",
  topologyKey: "two-detached-rear-garages/shared-pennsylvania-drive",
  source: "STAFF_INTERVENTION",
  status: d4bClassification.status,
  evidenceState: "CURRENT",
  classificationReason: d4bClassification.reason,
  components: d4bComponents(),
  evaluationHistory: [d4bEvaluation],
  currentEvaluationId: d4bEvaluation.id,
  lineage: { parentCandidateId: "pondy-d4", rootCandidateId: "pondy-d4", relation: "VARIANT", note: "35 deg southeast-biased rotated Garage B study." },
  tags: ["design-4b", "staff-intervention", "rotated-garage", "outbound-open"],
  staffNotes: ["Retain as an acceptable intervention branch. Do not promote until outbound and rotated setback gates are rerun successfully."],
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT
};

export const pondyCandidateRegistry: CandidateRegistry = {
  schemaVersion: CANDIDATE_SCHEMA_VERSION,
  projects: [{ id: "pondy-flats", label: "Pondy Flats", status: "ACTIVE", lotIds: ["pondy-lot2"] }],
  lots: [{
    id: "pondy-lot2",
    projectId: "pondy-flats",
    label: "Lot 2  -  Pennsylvania Avenue",
    address: "Pennsylvania Avenue, Coeur d'Alene, Idaho",
    jurisdiction: "Coeur d'Alene, Idaho",
    frontage: "Pennsylvania Street",
    parcel: PARCEL,
    rulesVersion: "pondy-baseline-planning-2026-09",
    informationState: "MIXED"
  }],
  candidates: [d4Candidate, d4bCandidate],
  checkpoints: [
    { id: "cp-d4-authoritative-20260913", candidateId: "pondy-d4", label: "Design 4 before rotated-garage intervention", createdAt: "2026-09-13T20:50:00.000Z", componentSnapshot: d4SiteComponents(), currentEvaluationId: d4Evaluation.id },
    { id: "cp-d4b-rot35b-20260913", candidateId: "pondy-d4b-rot35b", label: "Design 4B  -  35 deg southeast-biased study", createdAt: CREATED_AT, componentSnapshot: d4bComponents(), currentEvaluationId: d4bEvaluation.id }
  ]
};

export function getPondyCandidate(candidateId: string) {
  return pondyCandidateRegistry.candidates.find((candidate) => candidate.id === candidateId) ?? null;
}