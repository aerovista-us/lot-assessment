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
6. Redundant values are verification checks only and disagreement outside tolerance fails the lock.
7. Centered-gable v1 requires each authoritative zone to be a true rectangle; the ridge must bisect the cross-span, align to a zone axis, terminate on the zone boundary, and span the full distance between gable ends.
8. Irregular buildings use multiple explicit rectangular roof zones rather than stretching one generic gable over the footprint.
9. Multiple zones must tile the exact owner footprint with no area gaps or interior overlaps.
10. Touching roof zones must agree in solved Z along their shared interface within tolerance; discontinuous roof surfaces fail closed.
11. Every locked zone records its geometry source/provenance.
12. Any building footprint edit automatically unlocks roofs owned by that building.
13. Unsupported roof types remain concept-only until a validated solver exists.
## Workbench behavior

The Intervention Editor now treats roof geometry as an editable candidate component.

A roof draft may contain:
- one or more rectangular gable zones,
- an explicit 4-corner zone footprint when the owner footprint is irregular,
- plate/bearing elevation,
- ridge endpoint A and B,
- vertical authority,
- pitch rise/run or ridge elevation,
- geometry source/provenance.

The plan displays entered ridge lines:
- dashed purple = unlocked / concept-only,
- green = geometry-locked.

**Validate + lock roof geometry** runs the shared solver. Locking fails when:
- ridge data is incomplete,
- the roof zone is not rectangular,
- ridge endpoints are outside the zone or do not terminate on the zone boundary,
- the ridge does not span the full gable end-to-end distance,
- a centered-gable ridge is off center or not parallel to a zone axis,
- pitch/ridge elevation is invalid,
- an optional verification value disagrees beyond tolerance,
- multiple zones leave gaps, overlap in plan, or are not edge-connected,
- touching zones disagree in solved height along their shared interface,
- geometry provenance is missing,
- owner footprint geometry changed after the last lock.

## Building edits

For accuracy, the first implementation is conservative:

Any move, rotation, mirror, resize, wall-length edit, corner edit, point insertion, or point removal unlocks the owning roof.

The roof draft is preserved for reference, but it is no longer authoritative until it is revalidated and locked against the new footprint.

This is intentionally stricter than silently transforming or scaling roof geometry.

## Canonical behavior

Roof components are part of canonical Intervention Geometry v3.

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

Not yet authoritative:
- hip roofs,
- shed roofs,
- intersecting gables/valleys,
- crickets,
- dormers,
- curved or warped roof surfaces.

Those forms must remain CONCEPT ONLY until a corresponding solver and tests are added.

## Pondy Design 4

Pondy Design 4 is the first regression fixture.

Its four roof components are intentionally present but **UNLOCKED**. No Design 4 pitch, ridge direction, ridge elevation, or plate/bearing datum is currently borrowed from older Pondy designs.

That means Design 4 can show schematic roof overlays, but LotScope/Workbench will not call them geometry-locked until exact roof decisions are entered and validated through this contract.
