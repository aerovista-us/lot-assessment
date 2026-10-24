# Full-circle manual placement rotation

Homes and garages can rotate through the full 360° in the manual/intervention
editor. Both the round drag handle and the precision Rotation deg field use the
same angle normalization. Negative values and values greater than 360° wrap;
360° is the same orientation as 0°. The drag begins relative to the pointer's
actual grab point, so a previously rotated building does not jump on pickup.

Solver template `rotationLimitDeg` values remain in source records but no longer
clamp an explicit manual placement edit. Locked components remain protected.
Real geometry changes retain recovery checkpoints, move a garage's dependent
stalls, stale prior evidence, and unlock owner-bound roofs for revalidation.
An equivalent full turn does not change geometry, evidence, or checkpoints.

Custom polygon footprints retain their existing geometry contract: rotation is
baked into authoritative vertices, stable vertex IDs remain attached, and the
angle field resets to 0° after applying. The precision controls explain this.
Rectangular placements retain a normalized angle in [0, 360). No workspace schema
migration is needed.

## Verification

- `npm run test:intervention`: independent rotated-vertex and stall oracles for
  all quadrants, 359°, fractional angles, negative/multiple turns, full-turn
  no-ops, nonfinite input rejection, polygon identity, roof staleness, and
  source/report footprint fidelity after browser storage serialization.
- `npm run test:customer-journey-ui`: production React components, precision
  edits, drag previews across both sides of 0°/360°, save on release, Escape,
  checkpoint Undo/Redo, reload, negative/multiple turns, and the rotated custom
  footprint in a regenerated report. SVG coordinate mapping is a DOM test double.
- Responsive Chrome QA extends the existing 390/768/1440 px component fixture
  checks with real pointer capture, real SVG screen coordinate conversion,
  full-circle dragging, a nonzero resumed angle, reload, and negative precision
  entry. Evidence records the tested source SHA and a rotation screenshot at
  each width. This is fixture-based browser evidence, separate from hosted auth.
- Existing workspace, customer report, circulation, roof, type, and production
  build checks remain release gates in the applicable CI workflows.

Physical/professional acceptance and complete architectural package readiness
remain separate from this editor capability.
