import type { AssessmentEvidence } from "@/packages/evidence";
import { gate } from "@/packages/audit";

export const pondyDesign4Evidence: AssessmentEvidence = {
  schemaVersion: "lotscope-assessment-evidence-v1",
  id: "pondy-lot2-design4",
  title: "Pondy Flats · Lot 2 · Design 4",
  subtitle: "Two 22×22 detached rear garages · four enclosed stalls · Pennsylvania-only access",
  lifecycle: "PRESENTABLE",
  geometryVerdict: "PASS",
  releaseVerdict: "CONDITIONAL",
  feasibilityLabel: "Strong geometry fit",
  informationConfidenceLabel: "Moderate · professional confirmation remains",
  executiveSummary: "The current Design 4 geometry supports the locked two-garage / four-stall program under the modeled assumptions. All four exact full-size vehicle paths reach their stalls while preserving the companion parked vehicle. Two practical mobility items remain worth refinement, and zoning / building / civil items remain outside the geometry proof.",
  assumptions: [
    "Full-size design vehicle is modeled at 20.5 ft × 8.0 ft with a 25 ft minimum rear-axle turning radius.",
    "Both detached garage plates remain exactly 22 ft × 22 ft with 20 ft concept overhead openings.",
    "Pennsylvania Street is the only modeled vehicle-access origin.",
    "Accessory setbacks are planning assumptions and not parcel-specific zoning approval.",
    "The modeled pavement envelope is a design-development concept, not civil certification."
  ],
  gates: [
    gate({
      id: "garage-program",
      label: "Locked garage program",
      status: "PASS",
      summary: "Two separate 22×22 garages and four exact enclosed stall poses are preserved.",
      publicSummary: "The requested two-garage / four-stall program fits in the current concept.",
      metrics: [
        { id: "garage-count", label: "Detached garages", value: 2 },
        { id: "stall-count", label: "Enclosed stalls", value: 4 },
        { id: "garage-size", label: "Garage size", value: "22 × 22", unit: "ft" },
        { id: "garage-opening", label: "Concept opening", value: 20, unit: "ft" }
      ]
    }),
    gate({
      id: "vehicle-paths",
      label: "Full-body vehicle paths",
      status: "PASS_TIGHT",
      summary: "All four exact stall paths pass the current full-body geometry audit with a companion vehicle already parked.",
      publicSummary: "All four modeled stalls are reachable with the full-size design vehicle, but two paths deserve refinement for everyday comfort.",
      metrics: [
        { id: "B-NORTH-clearance", label: "B-North minimum clearance", value: 1.042, unit: "ft" },
        { id: "B-NORTH-gears", label: "B-North gear changes", value: 4 },
        { id: "B-SOUTH-clearance", label: "B-South minimum clearance", value: 1.044, unit: "ft" },
        { id: "B-SOUTH-door", label: "B-South door margin", value: 0.073, unit: "ft", note: "Geometry-pass margin; practical-use watch item." },
        { id: "A-NORTH-clearance", label: "A-North minimum clearance", value: 1.346, unit: "ft" },
        { id: "A-SOUTH-clearance", label: "A-South minimum clearance", value: 1.118, unit: "ft" }
      ]
    }),
    gate({
      id: "plan-connectivity",
      label: "Plan circulation",
      status: "PASS",
      summary: "Room / stair adjacency and upper-floor connectivity pass the current Workbench graph checks.",
      publicSummary: "The current planning diagrams maintain connected circulation between the major residential zones."
    }),
    gate({
      id: "architecture-consistency",
      label: "Architecture consistency",
      status: "PASS",
      summary: "Shared-world openings and polygon-derived exterior faces pass the current architectural consistency checks.",
      publicSummary: "Plans, openings, elevations, and axon are using coordinated geometry rather than separate hand-drawn assumptions."
    }),
    gate({
      id: "pavement-envelope",
      label: "Pavement envelope",
      status: "WATCH",
      summary: "The concept includes a 10 ft shared lane and 25 ft local maneuver apron; full swept-body containment inside the final civil pavement remains a promotion hardening item.",
      publicSummary: "The concept includes a workable access lane and maneuver area, but final driveway geometry still needs civil-level refinement.",
      metrics: [
        { id: "shared-lane", label: "Shared lane", value: 10, unit: "ft" },
        { id: "maneuver-apron", label: "Local maneuver apron", value: 25, unit: "ft" }
      ]
    }),
    gate({
      id: "accessory-zoning",
      label: "Accessory zoning",
      status: "PROFESSIONAL_REVIEW",
      summary: "Accessory setbacks and detached-garage interpretation require parcel-specific jurisdiction confirmation.",
      publicSummary: "The rear-garage strategy still needs zoning confirmation for this specific parcel."
    }),
    gate({
      id: "garage-separation",
      label: "Garage-to-garage separation",
      status: "PROFESSIONAL_REVIEW",
      summary: "The approximately 2 ft clear condition between detached garages requires building / fire / eave / drainage review.",
      publicSummary: "The close spacing between the rear garages needs building and fire review before it can be treated as resolved."
    })
  ],
  findings: [
    {
      id: "b-north-maneuver",
      title: "B-North is a multi-point maneuver",
      status: "WATCH",
      summary: "The current path passes geometry but uses four gear changes with the companion stall occupied.",
      recommendation: "Continue path / apron refinement before calling this the preferred daily-use stall."
    },
    {
      id: "b-south-door",
      title: "B-South door crossing is mathematically tight",
      status: "WATCH",
      summary: "The modeled garage-door crossing margin is 0.073 ft (about 0.9 in).",
      recommendation: "Improve approach alignment or local geometry and promote only after a more comfortable operational margin is demonstrated."
    },
    {
      id: "forward-turnaround",
      title: "No forward turnaround claim",
      status: "PASS",
      summary: "The evidence does not claim a full forward turnaround inside the site; the outbound logic is reverse-equivalent to the validated inbound path.",
      audience: ["WORKBENCH"]
    }
  ],
  professionalBoundaries: [
    { id: "zoning", label: "Zoning interpretation", status: "OPEN", note: "Parcel-specific accessory-structure interpretation remains AHJ / professional confirmation work." },
    { id: "building-fire", label: "Building / fire separation", status: "OPEN", note: "Garage spacing, eaves, drainage, and fire-separation implications remain unresolved." },
    { id: "civil", label: "Civil / drainage / grades", status: "OPEN", note: "Driveway grades, drainage, snow storage, and final pavement are not certified by this geometry proof." },
    { id: "structure-mep", label: "Structure / MEP / energy", status: "OPEN", note: "Not evaluated by this assessment." },
    { id: "permit", label: "Permit readiness", status: "OPEN", note: "This is design-development evidence, not a permit or construction document." }
  ],
  trace: {
    sourceProject: "aerovista-us/PondyFlats",
    sourceRevision: "aa126f74482bab55d4a117bebb94a6110a0c9855",
    engineRevision: "pondy-workbench-v2 / lotscope-evidence-v1-port",
    generatedAt: "2026-09-12T19:00:00-07:00",
    workflowRunId: 34685165467,
    artifactId: 10295137846,
    artifactSha256: "3394044282bff68c1d5188c4a5970642d796916b3a49ce60de6bb71cc91ed1ba"
  }
};
