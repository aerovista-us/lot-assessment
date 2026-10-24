/** Clockwise plan angle in [0, 360), with the placement model's precision. */
export function normalizePlacementRotation(degrees: number): number {
  if (!Number.isFinite(degrees)) throw new Error("Rotation must be a finite number of degrees.");
  const wrapped = (degrees % 360 + 360) % 360;
  return Math.round(wrapped * 1000) / 1000 % 360;
}
