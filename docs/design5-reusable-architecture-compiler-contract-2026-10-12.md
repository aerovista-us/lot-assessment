# Design 5 reusable architectural compiler — execution contract (2026-10-12)

Status: **implementation contract, not a completed compiler**. Tracks #94, #86, #90. Do not label concept-level outputs as architectural drawing-grade.

## Immutable input and revision lineage

- Preserve saved `adaptive-front-l` untouched. Create a child Design 5 revision with `sourceCandidateId`, `sourceRevision`, `sourceHash`, `solverVersion`, `coordinateSystemVersion`, and per-owner hashes.
- Positive X goes RIGHT and positive Y goes DOWN in source and report cover/site/elevation index. Record a separate north vector. Never silently mirror, reorient, or swap jogged boundary edges between views.
- Every derived artifact carries source hash, owner hash, solver version, input evidence, generation timestamp, and pass/blocked status. Mutations to any footprint, rotation, floor, or garage ownership invalidate all dependent room, roof, elevation, section and sheet locks.
- Keep browser-private candidate data private. Publishing is an explicit, separately authorized step.

## One engine; no design-specific solvers

1. **Footprint/topology:** arbitrary valid polygon rings (including jogged edges), stable vertices/walls and owner relationships, rotation/translation, holes, intersection and containment checks. Reject self-intersection, zero-length edges, invalid winding or stale owner hashes.
2. **Floor program:** room nodes with type, floor, area bounds and adjacency constraints; solve or author room polygons inside the validated shell. Stairs link specific floors and require landing, clearance and circulation checks. Partition edges are shared wall references, not independent hand-painted lines.
3. **Openings:** door and window objects reference wall ID, normalized offset, width, height and sill/threshold; reject openings off wall, overlapping incompatible joints, or intersecting protected corners.
4. **Vertical:** floor elevations, story heights, slab thickness, ceiling/plate and ridge elevations in one explicit model. No inferred heights in production drawings.
5. **Roof:** owner-bound planes with pitches, fascia/eaves, ridges, hips, valleys, end/gable edges and intersection topology. Roofs are solved from current footprint and plate inputs, never cloned from D4. Validate junction continuity, actual slope directions, ridge support, valley geometry, water flow and stale locks. Flag structural/drainage questions for professional review.
6. **Projection:** derive orthographic plans, cardinal elevations, sections and axon from the same 3D source. Exact edge visibility/depth intervals are required for drawing-grade; sampled-only projections are diagnostics and fail the publish gate. Reject missing/suppressed exterior edges or out-of-footprint ridges.
7. **Sheets:** unified manifest for A-001, A-101/102, roof, A-201–204, A-301+, A-401/402 and access sheet; computed dimensions and explicit scale transforms. Site frontage dimension must be from surveyed edge reference, never bounding-box extent.

## Acceptance states

- `CONCEPT_ONLY`: candidate exists, but architectural source fields or validation are missing. Private preview permitted; show per-sheet missing requirements.
- `GEOMETRY_VERIFIED`: all required geometry locks valid, source-bound and projection checks passed. Software drawing package permitted, still NOT FOR CONSTRUCTION.
- `PUBLISH_READY`: complete 22-category HTML/PDF manifests match; visual/print smoke and rights/capability checks pass. This is **not** AHJ/permit/structural acceptance.
- `PROFESSIONALLY_REVIEWED`: separately evidenced external reviews. Never automatically assigned by software.

## First implementation slice: adaptive-front-l child

- Store a revisioned Design 5 source snapshot with building/garage owners and parcel exactly matched to the saved candidate.
- Add authored floor plates, levels and program nodes; report unsatisfied room adjacency, egress and stair constraints without reshaping the parcel.
- Generate candidate-specific roof surfaces, including actual junctions, and lock them against the owner revision.
- Render one derived site plan, one true floor plan, one roof plan, four elevations, one section through a junction and one axon with provenance.
- Verify all source owner hashes across cross-repo Pondy import; compare cover/site orientation pixel + numeric landmarks.
- Generate HTML/PDF from exactly the same 22-feature manifest. Missing items cause CONCEPT_ONLY with actionable deficits, never empty report sections represented as complete.

## Tests and gates

- Determinism: identical inputs create identical geometry hashes and drawing-space coordinates.
- Rotation/edit invalidates roof, opening and section locks; stale snapshots cannot publish.
- Mirroring regression: east/top jog stays in documented location in cover, site plan and all drawings.
- Roof: valley/roof-plane intersection, height continuity, pitch sign, occlusion order and all finite edge intervals.
- Floor: room containment, shared-wall congruence, opening fit, stairs/landing alignment, upper/ground references.
- Reports: exact 22-category completeness, every required sheet populated from a validated source, HTML/PDF parity.
- Runtime: exact PR head tests, mobile/desktop/print snapshots, 36x24 paper calibration separately verified by physical measurement.
- Security: founder capability and project customer rights checked server-side; no anonymous static source bypass; logout preserves independent Account session.

## External blockers and next PR boundaries

- #90 production founder handoff: Vercel `aerovista-us-projects` API scope returned 403 on Oct 12; remote NXCore offline. Restore authorized Vercel access, inspect *nonsecret metadata* for `IDGW_SERVICE_SECRET_LOTSCOPE_WORKBENCH`, and test authentic founder flow. Never bypass authorization.
- #86 exact hidden-line and Home B roof-junction visual acceptance remains separate; no structural or AHJ approval implied.
- #94 is compiler completion. Follow-on PRs should separate (A) versioned child+floor geometry, (B) roof/junction lock, (C) sheet adapters, (D) HTML/PDF parity, (E) browser/print/security acceptance. Merge each only at exact tested head.
