# LotScope Roof Geometry Source of Truth

**Status:** Active Workbench geometry contract  
**Core solver:** `packages/roof-geometry/index.ts`  
**Candidate component:** `kind: "roof"`  
**Canonical intervention schema:** `lotscope-intervention-geometry-v3`

## Purpose

LotScope must never allow an elevation, section, axon, render, export, or customer report to invent or independently adjust ridge line or roof slope.

Roof geometry is a first-class candidate dependency. If the roof model is missing, incomplete, stale, unsupported, or inconsistent, the system fails closed to **CONCEPT ONLY**.

## Core rules

1. One shared roof source of truth feeds every representation.
2. Ridge lines are world-coordinate XY lines in the same feet-based coordinate system as the building footprint.
3. Plate/bearing and ridge heights are Z elevations in feet, not drawing pixels.
4. A roof zone chooses exactly one vertical authority:
   - **PITCH** → derive ridge Z from horizontal run.
   - **RIDGE_Z** → derive pitch from horizontal run.
5. Pitch and ridge Z may never both be independent authorities.
6. Redundant values are verification checks only and disagreement outside tolerance fails the lock. If any optional pitch-check field is supplied, the check must be complete and finite; zero values are explicit data and are never skipped by truthiness.
7. Centered-gable v1 requires each authoritative zone to be a true rectangle; the ridge must bisect the cross-span, align to a zone axis, terminate on the zone boundary, and span the full distance between gable ends.
8. Irregular buildings use multiple explicit rectangular roof zones rather than stretching one generic gable over the footprint.
9. Every roof-zone edge must remain inside or on the owner footprint for its full length using numerical precision, not drawing/display tolerance. A zone may not bridge a concave cutout or protrude beyond the owner, even by a sub-display-tolerance amount. Zone union area must match the owner to numerical precision: no positive uncovered area and no positive interior overlap.
10. Touching roof zones must agree in solved Z along their shared interface within tolerance; discontinuous roof surfaces fail closed.
11. Every locked zone records its geometry source/provenance.
12. Every home/garage placement is roof-accounted: a missing roof component forces CONCEPT ONLY.
13. More than one roof component for the same owner, or a roof whose owner placement is missing, fails closed as invalid geometry.
14. Any building footprint edit automatically unlocks roofs owned by that building.
15. Unsupported roof types remain concept-only until a validated solver exists.
## Workbench behavior

The Intervention Editor now treats roof geometry as an editable candidate component.

A roof draft may contain:
- one or more rectangular gable zones,
- an explicit 4-corner zone footprint when the owner footprint is irregular (clear all four corners to return to owner-derived geometry); malformed imported/restored explicit footprints fail closed rather than falling back to the owner,
- plate/bearing elevation,
- ridge endpoint A and B,
- vertical authority,
- pitch rise/run or ridge elevation,
- geometry source/provenance; explicitly clearing a source keeps it cleared and prevents authoritative locking until a valid source is entered.

The plan displays entered ridge lines from validation, not the stored status flag alone:
- dashed purple = unlocked / concept-only,
- green = solver-validated geometry-locked,
- dashed red = stored/imported roof data that fails the current roof contract.

**Validate + lock roof geometry** runs the shared solver. Locking fails when:
- ridge data is incomplete,
- the roof zone is not rectangular,
- ridge endpoints are outside the zone or do not terminate on the zone boundary,
- the ridge does not span the full gable end-to-end distance,
- a centered-gable ridge is off center or not parallel to a zone axis,
- pitch/ridge elevation is invalid,
- an optional verification value is incomplete/invalid or disagrees beyond tolerance,
- a zone edge leaves the owner footprint or bridges a concave cutout,
- multiple zones leave gaps, overlap in plan, or are not edge-connected,
- touching zones disagree in solved height along their shared interface,
- geometry provenance is missing,
- owner footprint geometry changed after the last lock.

## Building edits

For accuracy, the first implementation is conservative:

Any move, rotation, mirror, resize, wall-length edit, corner edit, point insertion, or point removal that actually changes the owner geometry unlocks the owning roof. Zero-delta/no-op saves return the untouched candidate and preserve a valid roof lock.

The roof draft is preserved for reference, but it is no longer authoritative until it is revalidated and locked against the new footprint.

This is intentionally stricter than silently transforming or scaling roof geometry.

## Canonical behavior

Roof components are part of canonical Intervention Geometry v3. The legacy `packages/canonical/intervention-v2.ts` entry point remains pinned to the original v2 schema and hash shape so serialized v2 geometry remains hash-compatible.

Changing:
- ridge endpoints,
- roof-zone footprints,
- plate/bearing Z,
- pitch,
- ridge Z,
- vertical authority,
- lock state,
- owner geometry dependency

changes the canonical geometry revision used by Workbench evidence-staleness logic.

Therefore a roof edit cannot hide behind an unchanged site-plan hash.
## Current solver scope

Validated:
- rectangular centered-gable roof zones,
- full-span / boundary-terminated ridge validation,
- pitch-authoritative solve,
- ridge-Z-authoritative solve,
- exact owner-footprint dependency,
- multiple explicit zones that exactly tile the owner footprint,
- shared-interface vertical continuity between adjacent roof zones,
- geometry provenance requirement.

Additional scoped authoritative implementation:
- Pondy Design 4 Home B's explicitly authored **two-gable plane-envelope** junction is supported by the derived-valley solver, finite surface-mesh audit, exact owner-footprint coverage and continuity checks. This does NOT support arbitrary intersecting-gable topology.

Not yet authoritative:
- hip roofs,
- shed roofs,
- arbitrary or more complex intersecting gables/valleys beyond the audited Home B plane-envelope contract,
- crickets,
- dormers,
- curved or warped roof surfaces.

Those forms must remain CONCEPT ONLY until a corresponding solver and tests are added.

## Pondy Design 4 — current October 11, 2026 authority

The current `pondy-d4` fixture validates **4/4 roof components geometry-locked**: Home A, Home B, Garage A and Garage B. Home B uses the audited `PLANE_ENVELOPE` two-gable junction with two derived valleys, not a fabricated tiled low seam. The exported Pondy consumer handoff is source-pinned; do not substitute a roof lock from an earlier candidate or a rotated owner.

**Rotation and edits are deliberately fail-closed.** Regression tests require the rotated Design 4 Garage B owner to report `NO_MODEL`, rather than inherit a baseline roof lock; owner footprint changes must invalidate the old lock and force fresh roof validation/export.

**Internal roof geometry authority is NOT professional approval.** Eaves/valley drainage, structural capacity, roof snow loading, local code, AHJ approval and construction documents remain external review gates. Customer output remains **CONCEPT ONLY / NOT FOR CONSTRUCTION**.

### Projection and hidden-line boundary

The projection test suite covers cardinal depth crossings, rotations and near-parallel edges; the axon edge sampler deliberately yields `SAMPLED_ONLY`, not a final hidden-line architectural certification. Unresolved, coplanar or near-degenerate projected edges must stay conservative until tested as display-ready visible/hidden linework. The near-degenerate regression was merged in PR #82; rendering acceptance remains distinct from solved roof surface geometry.
