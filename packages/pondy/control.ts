import type { Point } from "@/packages/geometry";

/**
 * Historical R5.1e control copied from the frozen PondyFlats sources, not recreated
 * from memory. It is a comparison reference, not a search family and not an automatic
 * PASS under the current discovery program gate.
 *
 * Source authority:
 * - PondyFlats/js/lot2-r51e-lock.js (plates / living study SF)
 * - PondyFlats/js/lot2-r5-freeze.js (parking / access path freeze)
 */
export const R51E_HISTORICAL_CONTROL = Object.freeze({
  id: "R5.1e",
  sourceRevision: "PondyFlats frozen R5.1e / R5 parking lock",
  comparability: "PARTIAL" as const,
  note: "Known historical circulation/design control. Its frozen parking program is two enclosed spaces plus two covered spaces total; do not silently treat it as satisfying a later two-2-car-garage gate.",
  livingStudySqFt: Object.freeze({ A: 1761, B: 1806 }),
  plates: Object.freeze([
    Object.freeze({ id: "B", role: "rear", x: 28, y: 5, widthFt: 42, depthFt: 28 }),
    Object.freeze({ id: "A", role: "penn", x: 70, y: 5, widthFt: 56, depthFt: 22.5 })
  ]),
  parking: Object.freeze([
    Object.freeze({ id: "CB", x: 28, y: 20, widthFt: 12, depthFt: 14, doorFace: "S", covered: true, enclosed: false, spaces: 1 }),
    Object.freeze({ id: "B", x: 42, y: 20, widthFt: 24, depthFt: 16, doorFace: "E", covered: false, enclosed: true, spaces: 1 }),
    Object.freeze({ id: "CA", x: 86, y: 5, widthFt: 12, depthFt: 14, doorFace: "S", covered: true, enclosed: false, spaces: 1 }),
    Object.freeze({ id: "A", x: 100, y: 5, widthFt: 24, depthFt: 16, doorFace: "E", covered: false, enclosed: true, spaces: 1 })
  ]),
  mainDrive: Object.freeze<Point[]>([[148, 28], [125, 28], [106, 28], [100, 27], [94, 26.5], [86, 27], [80, 28]]),
  accessA: Object.freeze<Point[]>([[148, 13], [140, 13], [130, 13], [126, 13]]),
  accessB: Object.freeze<Point[]>([[148, 28], [125, 28], [100, 28], [80, 28], [68, 28]]),
  outboundB: Object.freeze<Point[]>([[68, 28], [80, 28], [86, 27], [94, 26.5], [100, 27], [106, 28], [125, 28], [148, 28]]),
  historicalBoundaryClearanceFt: 0.75
});
