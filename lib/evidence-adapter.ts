import { assessLot, type LotAssessmentInput } from "@/lib/assessment";
import { assessInformationConfidence, stateLabel, type ConfidenceMap } from "@/lib/confidence";
import type { AssessmentEvidence, EvidenceStatus } from "@/packages/evidence";

function statusFromBoolean(pass: boolean, watch = false): EvidenceStatus {
  if (!pass) return "FAIL";
  return watch ? "WATCH" : "PASS";
}

export function guidedAssessmentEvidence(input: LotAssessmentInput, confidence: ConfidenceMap): AssessmentEvidence {
  const result = assessLot(input);
  const info = assessInformationConfidence(confidence);
  const geometryFail = result.status === "LIKELY NOT FEASIBLE" || result.status === "NEEDS VERIFICATION";
  const constrained = result.status === "CONSTRAINED";
  const accessPass = input.drivewayWidthFt >= input.minimumAccessWidthFt;
  const capacityPass = result.estimatedProjectFootprintSqFt <= result.footprintCapacitySqFt * 1.1;
  const widthPass = result.buildableWidthFt >= 24;

  const verify = info.verify.map((key) => `${String(key)} — ${stateLabel(confidence[key])}`);

  return {
    schemaVersion: "lotscope-assessment-evidence-v1",
    id: "guided-public-assessment",
    title: "Guided LotScope assessment",
    subtitle: `${input.units} unit${input.units === 1 ? "" : "s"} · ${input.livingAreaPerUnitSqFt.toLocaleString()} SF/unit · ${input.garageSpacesPerUnit} garage spaces/unit`,
    lifecycle: "SCREENED",
    geometryVerdict: geometryFail ? "FAIL" : "PASS",
    releaseVerdict: geometryFail ? "BLOCKED" : "CONDITIONAL",
    feasibilityLabel: result.status,
    informationConfidenceLabel: `${info.level} · ${info.score}/100`,
    executiveSummary: geometryFail
      ? "The entered dimensions do not yet support a reliable positive feasibility result. Resolve the failing dimensional gates and verify unknown inputs before moving to detailed Workbench geometry."
      : constrained
        ? "The entered dimensions appear potentially workable, but the project is sensitive to layout, access, or capacity details. A site-specific Workbench study is the next useful step."
        : "The entered dimensions clear the public screening gates. This is a promising early result, not proof of site-specific vehicle movement, zoning approval, or permit readiness.",
    assumptions: [
      "Public guided assessment uses a rectangular lot / envelope screen unless a deeper Workbench study supplies exact irregular geometry.",
      "Garage area is estimated from the requested space count; exact architecture is not packed at this stage.",
      "Driveway evaluation on the public screen is width-based only; turning paths are a Workbench gate.",
      ...verify.map((item) => `Verification needed: ${item}`)
    ],
    gates: [
      {
        id: "setback-envelope",
        label: "Setback envelope",
        status: statusFromBoolean(result.buildableWidthFt > 0 && result.buildableDepthFt > 0),
        summary: result.buildableWidthFt > 0 && result.buildableDepthFt > 0
          ? `Entered setbacks leave an approximate ${result.buildableWidthFt.toFixed(1)} ft × ${result.buildableDepthFt.toFixed(1)} ft rectangular envelope.`
          : "The entered setbacks leave no positive rectangular buildable envelope.",
        metrics: [
          { id: "buildable-width", label: "Buildable width", value: Number(result.buildableWidthFt.toFixed(1)), unit: "ft" },
          { id: "buildable-depth", label: "Buildable depth", value: Number(result.buildableDepthFt.toFixed(1)), unit: "ft" }
        ]
      },
      {
        id: "project-capacity",
        label: "Project footprint capacity",
        status: statusFromBoolean(capacityPass, result.utilizationPct > 75),
        summary: capacityPass
          ? `Estimated project footprint uses about ${Math.round(result.utilizationPct)}% of calculated footprint capacity.`
          : "Estimated project footprint exceeds the public screen's dimensional capacity.",
        metrics: [
          { id: "capacity", label: "Footprint capacity", value: Math.round(result.footprintCapacitySqFt), unit: "sq ft" },
          { id: "estimated-footprint", label: "Estimated project footprint", value: Math.round(result.estimatedProjectFootprintSqFt), unit: "sq ft" },
          { id: "utilization", label: "Utilization", value: Math.round(result.utilizationPct), unit: "%" }
        ]
      },
      {
        id: "buildable-width",
        label: "Buildable width",
        status: statusFromBoolean(widthPass, result.buildableWidthFt < 32),
        summary: widthPass
          ? "Buildable width is not immediately disqualifying, though layout pressure increases as the envelope narrows."
          : "Buildable width is under the public screen's 24 ft warning floor.",
        metrics: [{ id: "width", label: "Available width", value: Number(result.buildableWidthFt.toFixed(1)), unit: "ft" }]
      },
      {
        id: "access-width",
        label: "Access width",
        status: statusFromBoolean(accessPass),
        summary: accessPass
          ? "Entered driveway width meets the assumed minimum width screen. Turning geometry is not yet proven."
          : "Entered driveway width is below the assumed minimum access width.",
        metrics: [
          { id: "driveway", label: "Available driveway", value: input.drivewayWidthFt, unit: "ft" },
          { id: "access-minimum", label: "Assumed minimum", value: input.minimumAccessWidthFt, unit: "ft" }
        ]
      },
      {
        id: "information-confidence",
        label: "Information confidence",
        status: info.level === "HIGH" ? "PASS" : info.level === "MEDIUM" ? "WATCH" : "PROFESSIONAL_REVIEW",
        summary: `${info.level} confidence (${info.score}/100) based on the provenance states assigned to the entered facts.`,
        metrics: [{ id: "confidence-score", label: "Confidence", value: info.score, unit: "/100" }]
      },
      {
        id: "site-specific-geometry",
        label: "Site-specific geometry",
        status: "PROFESSIONAL_REVIEW",
        summary: "Irregular parcel lines, exact building placement, full-body vehicle paths, garage-door crossings, pavement, easements, utilities, and grade remain deeper Workbench / professional checks."
      }
    ],
    findings: [
      ...result.concerns.map((concern, index) => ({ id: `concern-${index + 1}`, title: "Current concern", status: "WATCH" as const, summary: concern })),
      ...result.reasons.map((reason, index) => ({ id: `reason-${index + 1}`, title: "Supporting condition", status: "PASS" as const, summary: reason }))
    ],
    professionalBoundaries: [
      { id: "zoning", label: "Zoning / allowed use", status: "OPEN", note: "Confirm district, use, unit count, setbacks, coverage, and accessory rules with the governing jurisdiction." },
      { id: "survey", label: "Survey / easements", status: "OPEN", note: "Recorded easements and exact boundary geometry are not proven by the public dimensional screen." },
      { id: "vehicle", label: "Vehicle maneuvering", status: "OPEN", note: "Full-body turning, parking sequence, garage-door approach, and departure require scaled geometry." },
      { id: "civil", label: "Civil / drainage / utilities", status: "OPEN", note: "Grades, drainage, fire access, utilities, and site servicing remain outside this screen." },
      { id: "permit", label: "Permit readiness", status: "OPEN", note: "LotScope Public is an early planning aid, not a permit decision or construction document." }
    ],
    trace: {
      sourceProject: "LotScope Public Guided Assessment",
      sourceRevision: "guided-v2-input",
      engineRevision: "lotscope-assessment-evidence-v1",
      generatedAt: new Date().toISOString()
    }
  };
}
