export const CASE_STRATEGIES = {
  conservative: { label: "Conservative", density: .72, access: .88, risk: .16, copy: "More buffer and fewer edge conditions." },
  front_garage: { label: "Front garage", density: .82, access: .91, risk: .27, copy: "Direct street access; frontage carries the tradeoff." },
  side_drive: { label: "Side drive", density: .79, access: .84, risk: .31, copy: "Protects the front elevation; verify side clearance." },
  rear_access: { label: "Rear access", density: .86, access: .72, risk: .39, copy: "Strong frontage; conditional on verified rear access." },
  max_fit: { label: "Max fit", density: .96, access: .66, risk: .54, copy: "Highest program yield; most evidence-sensitive." },
  preferred: { label: "Preferred", density: .85, access: .83, risk: .25, copy: "Balanced starting point from stated priorities." },
} as const;

export type CaseStrategy = keyof typeof CASE_STRATEGIES;
export type FindingStatus = "unknown" | "tentative" | "verified" | "rejected";
export type EvidenceItem = { id: string; label: string; status: FindingStatus; source: string; required: boolean };
export type CaseRoom = { id: string; label: string; area: number; include: boolean };
export type CaseRisk = { id: string; text: string; severity: "low" | "medium" | "high"; status: "open" | "closed"; nextCheck: string };
export type CaseAlternative = {
  id: string; fingerprint: string; axis: "X" | "Y" | "BEST"; name: string; strategy: CaseStrategy;
  score: number; fit: number; circulation: number; riskScore: number; coverage: number;
  footprint: { width: number; depth: number }; warnings: string[];
};
export type CaseProject = {
  id: string; name: string; address: string; revision: number; updatedAt: string;
  lot: { shape: string; width: number; depth: number; setbackFront: number; setbackRear: number; setbackLeft: number; setbackRight: number; slope: string; frontage: string };
  program: { targetArea: number; rooms: CaseRoom[] };
  constraints: { id: string; text: string; status: FindingStatus }[];
  assumptions: { id: string; text: string; status: FindingStatus }[];
  circulationNotes: string; strategy: CaseStrategy; alternatives: CaseAlternative[];
  savedLayout: CaseAlternative | null; baselineLayout: CaseAlternative | null;
  evidence: EvidenceItem[]; risks: CaseRisk[]; nextBoundedCheck: string; acceptedAt: string | null;
};

const roomSeed: Array<[string, string, number, boolean]> = [
  ["primary", "Primary suite", 420, true], ["bed2", "Bedroom 2", 160, true], ["bed3", "Bedroom 3", 150, true],
  ["office", "Office / flex", 120, false], ["great", "Great room", 360, true], ["kitchen", "Kitchen", 220, true],
  ["pantry", "Walk-in pantry", 65, false], ["laundry", "Laundry", 80, true], ["garage", "2-car garage", 520, true],
  ["mud", "Mud room", 70, false], ["porch", "Covered outdoor", 180, false], ["adu", "ADU / guest suite", 480, false],
];
const evidenceSeed: Array<[string, string]> = [
  ["survey", "Lot geometry / survey"], ["zoning", "Zoning & setbacks"], ["access", "Vehicle / fire access"],
  ["structure", "Structural feasibility"], ["circulation", "Circulation & egress"], ["approval", "Authority / client approval"],
];

export function createCaseProject(index = 1): CaseProject {
  const now = new Date().toISOString();
  return {
    id: `HZ-${String(index).padStart(3, "0")}`, name: index === 1 ? "Riverside infill study" : `Untitled site study ${index}`,
    address: index === 1 ? "2148 W Riverside Ave · Coeur d’Alene, ID" : "Address not confirmed", revision: 1, updatedAt: now,
    lot: { shape: "rectangular", width: 72, depth: 128, setbackFront: 20, setbackRear: 25, setbackLeft: 8, setbackRight: 8, slope: "unknown", frontage: "south" },
    program: { targetArea: 2480, rooms: roomSeed.map(([id, label, area, include]) => ({ id, label, area, include })) },
    constraints: [{ id: "constraint-easement", text: "Confirm utility easement location", status: "unknown" }],
    assumptions: [{ id: "assumption-curb", text: "Street curb cut is feasible in the shown location", status: "tentative" }],
    circulationNotes: "", strategy: "preferred", alternatives: [], savedLayout: null, baselineLayout: null,
    evidence: evidenceSeed.map(([id, label]) => ({ id, label, status: "unknown", source: "", required: true })),
    risks: [
      { id: "risk-survey", text: "Survey not attached", severity: "high", status: "open", nextCheck: "Obtain boundary/topographic survey" },
      { id: "risk-fire", text: "Fire access turning path untested", severity: "high", status: "open", nextCheck: "Run apparatus path check in the source Workbench" },
    ],
    nextBoundedCheck: "Confirm survey dimensions and easements before refining setbacks.", acceptedAt: null,
  };
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value);
}
function hash(value: string) { let h = 2166136261; for (let i = 0; i < value.length; i += 1) { h ^= value.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, "0"); }
function model(project: CaseProject) {
  return { lot: project.lot, program: { ...project.program, rooms: project.program.rooms.map(room => ({ label: room.label, area: room.area, include: room.include })) }, constraints: project.constraints.map(({ text, status }) => ({ text, status })), assumptions: project.assumptions.map(({ text, status }) => ({ text, status })) };
}
export function caseFingerprint(project: CaseProject, strategy = project.strategy) { return `LS-${hash(stable({ engine: "case-compare-1.0", model: model(project), strategy })).toUpperCase()}`; }
function randomFrom(seed: string) { let value = parseInt(hash(seed), 16) || 1; return () => { value |= 0; value = value + 0x6d2b79f5 | 0; let t = Math.imul(value ^ value >>> 15, 1 | value); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export function generateCaseAlternatives(project: CaseProject, strategyKey = project.strategy): CaseAlternative[] {
  const strategy = CASE_STRATEGIES[strategyKey]; const fingerprint = caseFingerprint(project, strategyKey); const random = randomFrom(fingerprint);
  const programArea = project.program.rooms.filter(room => room.include).reduce((sum, room) => sum + room.area, 0);
  const lotArea = Math.max(1, project.lot.width * project.lot.depth);
  const envelopeWidth = Math.max(20, project.lot.width - project.lot.setbackLeft - project.lot.setbackRight);
  const envelopeDepth = Math.max(20, project.lot.depth - project.lot.setbackFront - project.lot.setbackRear);
  const variants = [["X", "Linear court", .96, 1.04], ["Y", "Split wing", 1.05, .96], ["BEST", "Best fit X/Y", 1.01, 1.01]] as const;
  return variants.map(([axis, name, widthFactor, depthFactor], index) => {
    const coverage = Math.min(78, Math.max(18, programArea / lotArea * 100 * strategy.density + (random() - .5) * 6));
    const fit = Math.max(20, Math.min(98, 94 - Math.max(0, coverage - 42) * 1.05 + strategy.access * 7 - index * .7));
    const circulation = Math.max(20, Math.min(98, strategy.access * 83 + random() * 12 + (axis === "BEST" ? 4 : 0)));
    const riskScore = Math.max(8, Math.min(94, strategy.risk * 100 + coverage * .22 + random() * 8 + project.evidence.filter(item => item.status !== "verified").length * 2.7));
    const warnings = [project.evidence.find(item => item.id === "survey")?.status !== "verified" ? "Envelope uses unverified lot geometry." : "", strategyKey === "rear_access" ? "Rear access remains conditional until rights and fire access are verified." : "", strategyKey === "side_drive" ? "Side-drive clearance requires field and code verification." : "", strategyKey === "max_fit" || coverage > 48 ? "High coverage compresses open-space and drainage tolerance." : "", axis === "BEST" ? "Combined X/Y is a synthesized comparison, not a verified drawing." : ""].filter(Boolean);
    return { id: `${fingerprint}-${axis}`, fingerprint, axis, name, strategy: strategyKey, score: Math.round(.45 * fit + .3 * circulation + .25 * (100 - riskScore)), fit: Math.round(fit), circulation: Math.round(circulation), riskScore: Math.round(riskScore), coverage: Number(coverage.toFixed(1)), footprint: { width: Number((envelopeWidth * strategy.density * widthFactor).toFixed(1)), depth: Number((envelopeDepth * strategy.density * depthFactor).toFixed(1)) }, warnings };
  });
}

export function caseGate(project: CaseProject) {
  const missingEvidence = project.evidence.filter(item => item.required && item.status !== "verified");
  const rejected = project.evidence.filter(item => item.status === "rejected");
  const openRisks = project.risks.filter(item => item.status !== "closed");
  const state = rejected.length ? "blocked" : missingEvidence.length || openRisks.length || !project.savedLayout ? "conditional" : "evidence-ready";
  return { state, label: state === "evidence-ready" ? "Evidence ready" : state === "blocked" ? "Blocked" : "Conditional", missingEvidence, openRisks };
}

export function tradeoffSummary(project: CaseProject) {
  const alternative = project.savedLayout; const gate = caseGate(project);
  if (!alternative) return "Generate alternatives and save a working layout before drafting a tradeoff summary.";
  return `${alternative.name} using the ${CASE_STRATEGIES[alternative.strategy].label.toLowerCase()} strategy shows ${alternative.fit >= 80 ? "strong" : "moderate"} preliminary program fit and ${alternative.circulation >= 80 ? "clear" : "unresolved"} circulation. Its ${alternative.coverage}% modeled coverage and ${alternative.riskScore}/100 risk indicator are comparison inputs only. The case remains ${gate.label.toLowerCase()} with ${gate.missingEvidence.length} evidence gate${gate.missingEvidence.length === 1 ? "" : "s"} open. Next bounded check: ${project.nextBoundedCheck}`;
}
