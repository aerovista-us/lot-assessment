# LotScope — verified roof-edge intervals (Design 4, 2026-10-11)

## Authority and release boundary

**CONCEPT ONLY · NOT FOR CONSTRUCTION.** Roof validation and locked owner binding remain prerequisites. INTERVAL_VERIFIED describes the model's 2D visible/hidden edge ordering, **not** architectural drawing approval, snow/drainage/structural acceptance, permit readiness, or professional hidden-line certification. Unresolved and edge-on cases retain REVIEW_REQUIRED; malformed or stale geometry remains WITHHELD.

The source is roofDrawingHandoff(validateCandidateRoofs(...)). The new packages/roof-geometry/drawing-verified-intervals.ts is used by the authenticated /workbench/roof-drawings inspector and does not alter roof geometry, Design 4 customer-facing roof locks, or the PondyFlats publication.

## Mathematical contract

For each validated 3D planar polygon, project its corners into camera coordinates (screen x, screen y, camera depth). Each source edge is parameterized on [0,1].

1. Cut each edge at every projected intersection with another face boundary, including collinear projected overlaps. Between consecutive cuts the set of covering faces is constant.
2. For each covering planar face, derive the affine camera-depth function from three noncollinear projected vertices. Solve the difference against the source edge algebraically. Add every interior zero crossing as a cut. There is no per-interval voting.
3. With coverage and relative depth sign constant on the resulting open interval, classify VISIBLE, HIDDEN or UNRESOLVED if depth or projection cannot be distinguished within tolerance. The midpoint selects an already-constant polygon coverage/sign interval; it does not approximate a visibility transition.
4. Exact shared world-space 3D edge comparison allows deterministic suppression of a duplicated physical stroke (DUPLICATE_SHARED). Adjacent provably coplanar faces on opposite projected sides of a shared boundary get INTERNAL_SEAM.
5. Every noncollapsed source edge must be covered from t=0 to t=1 without gaps. Any coverage defect withholds the whole result. Collapsed screen-space edges and unresolved intervals produce REVIEW_REQUIRED, never full verification.

The inspector shows visible edges solid, hidden dashed and unresolved orange dotted. Only proven seams and duplicate shared strokes are suppressed. The inspector explicitly displays CONCEPT ONLY · NOT FOR CONSTRUCTION in the header and SVG.

## Test evidence

- npm run test:roof now includes scripts/test-roof-verified-intervals.mjs plus existing topology, owner binding, valley, occlusion, crossing and degenerate projection suites.
- New cases: partial occlusion, analytic interior depth swap, noncoplanar sloping shared ridge, coplanar seam, coplanar overlapping areas, invalid camera, malformed geometry, and stale roof handoffs.
- All four Design 4 locked roof owners are exercised in four cardinal elevations and four rotated axonometric cameras each (32 roof/view combinations). Every noncollapsed edge's parametric coverage is checked for completeness.
- scripts/test-roof-interval-component.tsx verifies visible/hidden/unresolved rendering, proven seam suppression, withheld content and disclaimers. An isolated Chromium fixture at widths 1440 and 390 pixels showed exactly one each of the three diagnostic stroke classes, and no document horizontal overflow.
- Local Next.js production build and TypeScript compile passed. An unauthenticated browser request to the staff roof inspector showed AeroVista's sign-in gate, as intended. **An authorized-session rendering test remains outstanding**, rather than bypassing staff authentication.

## Open P1 acceptance

1. Resolve or explicitly retain Home B valley depth-tied/edge-on/coincident intervals; do not guess their visibility.
2. Design and review a snapshot-bound PondyFlats customer-facing renderer adapter separately. This PR upgrades LotScope staff QA only; the published Pondy roof elevations/axon are not changed by it.
3. Capture and human-review all four roof owners in cardinal elevations and axon from a legitimate staff session. The isolated fixture cannot substitute for authenticated production visual acceptance.
4. Architect, civil, structural and local authority review remains necessary for junction topology, valley detail, drainage, fascia, loads, setbacks, permit and print scale.
5. Verify production deployment SHA and signed-in browser separately. A merged commit or green unit test is not deployment acceptance.

Related: LotScope issue #86, PondyFlats issue #48 and the integrated Design 4 punch-list audit. Do not remove concept-only labels without independent professional and AHJ signoff.
