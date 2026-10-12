# LotScope Workbench — from saved design to customer report

**2026-10-12 · Source-bound, concept-only workflow.** [Open Candidate Library](https://lotscope.aerovista.us/workbench/projects/pondy-lot2/candidates). This is the same editor and solver for current/future designs, not a special Design 4 workflow.

## Step 1 — Choose the exact candidate

Open your saved ranked exploration in **Candidate Library**; select its candidate detail and note ID/revision. Choose **Build / Edit Design Shapes**. Confirm the actual owner (home/garage) and floor. Geometry uses model XY; orientation must match the original parcel and may not be mirrored for visual appeal.

## Step 2 — Author room / floor shapes

Choose **ROOM**, **CIRCULATION**, **FLOOR_PLATE**, **GARAGE_AREA** or **STAIR_ZONE**. Use **Create shape from owner footprint** for a full-footprint draft; to create smaller rooms or stair spaces, enter custom model-feet `[x,y]` vertices. The editor checks owner containment and source revision. Adjacent ROOM/CIRCULATION polygons must share a positive-length wall to create an actual shared-wall relationship.

The Floor Solver displays shared wall IDs/lengths, modeled adjacency and warnings on overlaps or disconnected spaces. No framing wall thickness, automatic room packing, entrance approval or room program compliance is yet inferred.

## Step 3 — Add door openings and stairs

Choose a shared wall in the **Floor Solver**, supply door width (feet) and use **Create centered door on shared wall**. It checks same-story/same-owner geometry and that full width fits. Actual swing, handing, clearance and code/egress requirements remain unverified.

Create **STAIR_ZONE** reservation polygons on ground and upper floor; their XY alignment may be checked. Treads, risers, landings, rise/run, headroom and fire/egress certification still require the future 3D solver and professional verification.

## Step 4 — Author a roof from the same geometry

Choose **GABLE_ZONE** under the correct owner. Author its rectangular polygon. For a cross-gable, separately author the two intended gable rectangles. Select ridge direction **long axis** or **short axis**; this is an explicit design decision, not a default approval. Enter sourced plate Z, pitch rise/run, and proposed overhang: these fields begin blank because the system must not invent roof dimensions. Optional fascia depth and thickness are supplied together.

Select **Solve draft roof parameters**. A valid supported rectangle yields a model preview ridge, slope and section cuts. Two compatible overlapping gables may produce valley segments through the same checked roof-junction solver. The wrong ridge orientation, unsupported nonrectangular gable, incomplete zone coverage or inconsistent junction returns **REVIEW_REQUIRED**. Proposed nonzero overhangs are retained as drafts but cannot yet produce validated eave/fascia extensions. A temporary preview does not create or modify a locked roof component.

## Step 5 — Build and read the customer concept report

Save design changes, then choose **Create Customer Report** in the library/detail. It downloads private standalone **HTML** containing attached draft shapes, shared walls/door openings, supported roof/section previews and all **22 mandatory feature slots**. Model previews, authoritative locked-roof source graphics and unavailable evidence must display separately. Open the HTML in a browser or Print → Save as PDF for discussion only; this is NOT a deterministic paper-scale permit set, nor a public PondyFlats deployment.

Drafts are **browser-local**, not yet persisted across devices or collaborators. Export a `.lotscope.json` package for backup/recovery. Any source owner rotation, move, mirror, resize or change makes the previously attached draft stale; reconcile it rather than reusing older geometry silently.

## Troubleshooting

| You see | Action / meaning |
| --- | --- |
| No shared wall | Create two same-story, same-owner ROOM/CIRCULATION polygons with a common positive-length edge |
| Missing roof parameters | Supply source plate height, pitch rise/run, ridge direction and overhang; no fake default values |
| Unsupported gable topology | Use explicit source-contained rectangular zones; if still rejected, retain the review status |
| Roof valley withheld | Verify zone union, overlapping pair and ridge axes; never draw a decorative valley |
| Nonzero fascia withheld | Overhang roof-surface extension is still future work |
| Room plans/elevations absent in report | A draft does not authorize a complete room plan, 3D building section or stamped architectural elevations |
| Report appears flipped | Check candidate source and canonical world-to-page transform, not a local screenshot rotation |
| Draft missing on another browser | Export/import the local candidate package; shared server document storage remains future work |
| 403/login interruption | Use legitimate identity session; do not disable access or bypass broker enforcement |

## What is acceptable to claim?

Early design concepts, provisional geometry relationships and source-bound model previews. **Not construction documentation**, AHJ/permit approval, a structural solution, drainage/snow/fire evaluation, accessibility/egress approval, or a profession-certified complete drawing set. Every missing gate remains visibly open.

More: [docs index](README.md), [master architecture](UNIVERSAL_DESIGN_ENGINE_MASTER.md), [candidate-to-report contract](CANDIDATE_CX_REPORT_WORKFLOW_2026-10-12.md), [PondyFlats 22-feature report standard](https://github.com/aerovista-us/PondyFlats/blob/main/docs/UNIFIED_CUSTOMER_REPORT_STANDARD.md).