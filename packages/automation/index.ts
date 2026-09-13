import type { PlacementCandidate, RepairAction } from "@/packages/placement";
import type { CandidateMobilityAudit } from "@/packages/placement/mobility-audit";
import type { ProgramEvaluation } from "@/packages/program";

export type SiteStrategyId =
  | "translate-building"
  | "reproportion-building"
  | "translate-garage"
  | "resize-garage"
  | "rotate-garage"
  | "reshape-drive"
  | "local-pavement-flare"
  | "gear-maneuver";

export type SiteStrategyTool = {
  id: SiteStrategyId;
  label: string;
  category: "MASSING" | "GARAGE" | "ACCESS" | "MANEUVER";
  availability: "ACTIVE" | "EXPERIMENTAL" | "PLANNED";
  defaultPriority: number;
  description: string;
  tradeoff: string;
};

/**
 * Strategy catalog used by the Workbench automation layer. Priority is a default
 * search order, not a prohibition. Local pavement remains an active repair tool
 * whenever it produces a cleaner legal solution than moving structures.
 */
export const SITE_STRATEGY_TOOLBOX: SiteStrategyTool[] = [
  {
    id: "translate-building",
    label: "Move building mass",
    category: "MASSING",
    availability: "ACTIVE",
    defaultPriority: 10,
    description: "Translate residential mass within its legal principal-building envelope.",
    tradeoff: "Preserves driveway area but may affect yards, daylight, and room planning."
  },
  {
    id: "reproportion-building",
    label: "Re-proportion building",
    category: "MASSING",
    availability: "ACTIVE",
    defaultPriority: 20,
    description: "Change local plate proportions or L/step components while preserving the unit program.",
    tradeoff: "Can recover circulation clearance at the cost of a more constrained floor-plan shape."
  },
  {
    id: "translate-garage",
    label: "Move garage",
    category: "GARAGE",
    availability: "ACTIVE",
    defaultPriority: 30,
    description: "Translate a garage inside the applicable principal or accessory envelope.",
    tradeoff: "Useful when a small garage shift removes a forced steering correction."
  },
  {
    id: "resize-garage",
    label: "Resize garage",
    category: "GARAGE",
    availability: "ACTIVE",
    defaultPriority: 35,
    description: "Test credible garage dimensions against the locked design vehicle instead of assuming one standard box.",
    tradeoff: "Consumes buildable area, but can materially improve parking and door comfort."
  },
  {
    id: "rotate-garage",
    label: "Rotate garage",
    category: "GARAGE",
    availability: "EXPERIMENTAL",
    defaultPriority: 40,
    description: "Orient a detached garage toward the arriving vehicle path using true rotated geometry.",
    tradeoff: "Can remove a final steering correction but consumes setback margin at the rotated corners."
  },
  {
    id: "reshape-drive",
    label: "Reshape access path",
    category: "ACCESS",
    availability: "ACTIVE",
    defaultPriority: 50,
    description: "Move bounded driveway control points while preserving the access side and vehicle radius.",
    tradeoff: "Low structural impact, but may increase pavement or create a less direct route."
  },
  {
    id: "local-pavement-flare",
    label: "Add local pavement / apron",
    category: "ACCESS",
    availability: "ACTIVE",
    defaultPriority: 60,
    description: "Add only the local paved width or apron actually required by the full vehicle sweep.",
    tradeoff: "Spends site area and impervious surface, but can be the cleanest solution and remains a first-class option."
  },
  {
    id: "gear-maneuver",
    label: "Use bounded forward/reverse maneuver",
    category: "MANEUVER",
    availability: "PLANNED",
    defaultPriority: 70,
    description: "Generate an explicit low-gear-change parking maneuver when a continuous-forward path is not practical.",
    tradeoff: "Can save site area, but daily usability falls as gear changes increase."
  }
];

export type CandidateAutomation = {
  policy: "MULTI_TOOL_SITE_REPAIR_V1";
  appliedTools: SiteStrategyId[];
  recommendedNext: Array<{ id: SiteStrategyId; reason: string }>;
  optionStates: Array<SiteStrategyTool & { state: "APPLIED" | "AVAILABLE" | "NEXT" | "PLANNED" }>;
  decisionSummary: string;
};

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function metadataFlag(candidate: PlacementCandidate, key: string) {
  return candidate.metadata?.[key] === true;
}

function addRecommendation(
  output: Array<{ id: SiteStrategyId; reason: string }>,
  id: SiteStrategyId,
  reason: string
) {
  if (!output.some((item) => item.id === id)) output.push({ id, reason });
}

export function evaluateCandidateAutomation(args: {
  candidate: PlacementCandidate;
  repairActions: RepairAction[];
  mobilityAudit: CandidateMobilityAudit;
  program: ProgramEvaluation;
  promotionBoundaryClearanceFt: number | null;
  promotionClearanceFt: number;
}): CandidateAutomation {
  const { candidate, repairActions, mobilityAudit, program } = args;
  const applied: SiteStrategyId[] = [];

  if (metadataFlag(candidate, "adaptiveBuildingTranslation") || repairActions.some((action) => action.kind === "shift-placement" && action.targetId.startsWith("HOME"))) {
    applied.push("translate-building");
  }
  if (metadataFlag(candidate, "adaptiveBuildingReproportioning") || metadataFlag(candidate, "corridorAwareMassing")) {
    applied.push("reproportion-building");
  }
  if (repairActions.some((action) => action.kind === "shift-placement" && action.targetId.startsWith("GARAGE"))) {
    applied.push("translate-garage");
  }
  const garageSizes = candidate.placements
    .filter((item) => item.kind === "garage")
    .map((item) => `${item.widthFt.toFixed(2)}x${item.depthFt.toFixed(2)}`);
  if (garageSizes.some((size) => size !== "20.00x20.00")) applied.push("resize-garage");
  if (candidate.placements.some((item) => item.kind === "garage" && Math.abs(item.rotationDeg ?? 0) > 0.05)) {
    applied.push("rotate-garage");
  }
  if (repairActions.some((action) => action.kind === "shift-drive-point")) applied.push("reshape-drive");
  if (mobilityAudit.turningPavementWidthFt > mobilityAudit.driveWidthFt + 0.05) applied.push("local-pavement-flare");
  if (mobilityAudit.drives.some((drive) => (drive.result?.gearChanges ?? 0) > 0)) applied.push("gear-maneuver");

  const recommendations: Array<{ id: SiteStrategyId; reason: string }> = [];
  const issueText = [
    ...mobilityAudit.failures,
    ...mobilityAudit.warnings,
    ...mobilityAudit.drives.flatMap((drive) => [...drive.pathIssues, ...drive.failures, ...drive.warnings])
  ].join(" ").toLowerCase();

  if (!program.pass) {
    addRecommendation(recommendations, "reproportion-building", "Program or capacity gate is still open; recover usable plate before consuming more site area.");
  }
  if (issueText.includes("pavement")) {
    addRecommendation(recommendations, "local-pavement-flare", "The full-body sweep leaves the modeled pavement; a localized apron/flare is a direct repair option.");
    addRecommendation(recommendations, "reshape-drive", "Re-route the centerline to test whether the pavement expansion can be reduced or avoided.");
  }
  if (issueText.includes("short tangent") || issueText.includes("turning radius") || issueText.includes("curvature")) {
    addRecommendation(recommendations, "rotate-garage", "The final approach is steering-limited; aligning the garage with arrival can remove the forced last turn.");
    addRecommendation(recommendations, "reshape-drive", "A longer tangent or earlier bend may satisfy the locked vehicle radius.");
    addRecommendation(recommendations, "gear-maneuver", "If continuous-forward geometry stays constrained, test one bounded forward/reverse maneuver rather than forcing a larger site move.");
  }
  if (issueText.includes("collid") || issueText.includes("obstacle") || issueText.includes("clearance")) {
    addRecommendation(recommendations, "translate-building", "Move residential mass away from the measured swept corridor where the principal envelope permits it.");
    addRecommendation(recommendations, "translate-garage", "A small garage shift may improve approach or fixed-obstacle clearance without changing the whole concept.");
    addRecommendation(recommendations, "rotate-garage", "A garage angle can trade corner/setback margin for a cleaner vehicle envelope.");
  }
  if (issueText.includes("garage-door") || issueText.includes("door clearance") || issueText.includes("garage wall")) {
    addRecommendation(recommendations, "rotate-garage", "Door crossing is tight; orient the opening toward the arriving heading.");
    addRecommendation(recommendations, "resize-garage", "A wider/deeper credible garage can improve door and parked-body comfort.");
  }
  if (issueText.includes("final full vehicle") || issueText.includes("not enclosed") || issueText.includes("cannot enclose")) {
    addRecommendation(recommendations, "resize-garage", "The final parked body does not fit comfortably; test a credible larger garage before weakening the vehicle gate.");
  }
  if ((args.promotionBoundaryClearanceFt ?? Infinity) < args.promotionClearanceFt) {
    addRecommendation(recommendations, "reshape-drive", "The non-access boundary margin is below promotion target; shift the vehicle corridor before changing the hard boundary rule.");
    addRecommendation(recommendations, "local-pavement-flare", "If the route is otherwise strong, a local apron can support a different centerline while keeping the straight aisle compact.");
  }

  const appliedTools = unique(applied);
  const recommendedNext = recommendations
    .filter((item) => !appliedTools.includes(item.id) || item.id === "local-pavement-flare")
    .slice(0, 5);
  const nextIds = new Set(recommendedNext.map((item) => item.id));
  const optionStates = SITE_STRATEGY_TOOLBOX.map((tool) => ({
    ...tool,
    state: appliedTools.includes(tool.id)
      ? "APPLIED" as const
      : nextIds.has(tool.id)
        ? "NEXT" as const
        : tool.availability === "PLANNED"
          ? "PLANNED" as const
          : "AVAILABLE" as const
  }));

  const decisionSummary = mobilityAudit.pass
    ? program.pass
      ? "Physical and program gates pass; keep multiple repair tools available for margin, architecture, and site-efficiency tradeoffs."
      : "Vehicle geometry works; concentrate on building re-proportioning while retaining garage, route, and pavement alternatives."
    : recommendedNext.length
      ? `Physical gate remains open; compare ${recommendedNext.slice(0, 3).map((item) => SITE_STRATEGY_TOOLBOX.find((tool) => tool.id === item.id)?.label ?? item.id).join(", ")} rather than forcing one repair type.`
      : "Physical gate remains open; preserve all active strategy tools for the next search pass.";

  return {
    policy: "MULTI_TOOL_SITE_REPAIR_V1",
    appliedTools,
    recommendedNext,
    optionStates,
    decisionSummary
  };
}
