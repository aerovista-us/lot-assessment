# LotScope Canonical Candidate Freeze Contract

Status: implementation slice started 2026-09-08

## Purpose

Once a site candidate is selected for finalist development, every downstream representation must derive from one canonical geometry record rather than redrawing or independently editing coordinates.

The freeze contract is intended to stop a common design-workflow failure: a site plan, floor plan, elevation, report and presentation quietly describing different versions of the same concept.

## Schema

Current schema: `lotscope-candidate-v1`

A frozen candidate contains:

- project ID and ProjectSpec revision
- scenario ID
- solver version
- scoring version
- candidate ID and family
- normalized/sorted placements
- normalized/sorted drive paths and control points
- candidate metadata
- SHA-256 freeze hash

Geometry is normalized to four decimal places before hashing. Placement and drive arrays are sorted by stable IDs. Metadata keys are sorted. Point order inside a drive remains significant.

## Immutable after freeze

The following fields are geometry authority after a candidate is frozen:

- parcel/project revision referenced by the freeze context
- candidate identity/family
- placement IDs, kind and dimensions
- placement x/y positions
- integration-group relationships
- circulation-obstacle flags
- drive IDs and garage relationships
- drive point order and coordinates
- solver/scoring version associated with the selected candidate

A downstream drawing may change presentation only. It may not move geometry while retaining the same freeze hash.

## Presentation-only fields

Downstream work may change without invalidating the site-geometry contract when it does not alter canonical candidate data, for example:

- line weights, colors and labels
- sheet composition
- dimension style
- architectural style studies that do not move frozen site masses
- explanatory copy
- camera/view settings

## Controlled geometry revision

If finalist development requires a geometry change:

1. create a new candidate revision;
2. re-run the physical/program/promotion gates that the change can affect;
3. canonicalize the revised candidate;
4. generate a new freeze hash;
5. preserve the prior hash as historical evidence rather than overwriting it.

## Current implementation

`packages/canonical/index.ts` provides:

- `canonicalizeCandidate()`
- `freezeCandidate()`
- `freezeHash()`
- `verifyFrozenCandidate()`

## Acceptance for issue #9

This slice is complete only when:

- finalist candidates are emitted with canonical schema/version and freeze hash;
- freeze hashes are deterministic for identical input geometry;
- a serialized frozen candidate can be reloaded and verified;
- benchmark/provenance output records finalist hashes;
- downstream plan/elevation/section interfaces accept frozen canonical geometry rather than independent coordinates.

Detailed room packing remains a separate refinement layer under issue #3. It must either stay inside the frozen exterior/site geometry or explicitly create a new candidate revision when site geometry changes.
