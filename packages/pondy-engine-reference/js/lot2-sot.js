/**
 * Lot 2 — Source of Truth (SOT)
 * FROZEN — no concept may alter parcel geometry, compass, Pennsylvania frontage, or boundary.
 *
 * Pennsylvania = RIGHT (x = 148), vertical 50.00′ frontage, SOUTH / FRONT.
 * North / Rear = LEFT. Compass points LEFT. Do not rotate north-up.
 * +X toward Pennsylvania (right), +Y down toward irregular bottom. Origin = rear-left.
 */
const Lot2SOT = Object.freeze({
  FROZEN: true,
  VERSION: '2026-08-19',
  SURVEY: Object.freeze([
    [0, 0],
    [148, 0],
    [148, 50],
    [125.143, 43.016],
    [84.813, 43.016],
    [0, 57.01],
  ]),
  SURVEY_AREA: 7023.43,
  PLAT_AREA: 7028,
  SETBACKS: Object.freeze({ front: 20, rear: 25, west: 5, east: 10 }),
  /** Boundary segment index → setback key (see docs/lot2-survey-orientation.md) */
  SEGMENT_SETBACK: Object.freeze(['west', 'front', 'east', 'east', 'east', 'rear']),
  PENN_X: 148,
  DEPTH: 148,
  FRONTAGE: 50,
  REAR: 57.01,
  DRIVE_WIDTH: 12,
  GARAGE: Object.freeze({ w: 22, h: 22, sf: 484 }),
  SUV: Object.freeze({ length: 19, width: 7.5, turnRadius: 24, doorWidth: 16 }),
  /** Pass 2 over-test: F-150 SuperCrew / Tahoe class — do not use compact cars. */
  SUV_FS: Object.freeze({
    id: 'FS-SUV',
    label: 'Full-size SUV / pickup (F-150 SuperCrew / Tahoe class)',
    length: 20.5,
    width: 8.0,
    wheelbase: 13.1,
    frontOverhang: 3.4,
    rearOverhang: 4.0,
    minRearAxleRadius: 25,
    outerFrontRadius: 28.2,
    doorWidth: 16,
    apronDepth: 24,
  }),
  FUNNEL: Object.freeze(['sot', 'geometry-lab', 'viable', 'finalist', 'pass2-architecture']),
});

if (typeof module !== 'undefined') module.exports = Lot2SOT;
