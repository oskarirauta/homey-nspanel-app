/** Positive logical speed is towards home, on either side of the screen. */
export function powerWatts(input: unknown): number | undefined {
  if (typeof input === 'number') return Number.isFinite(input) ? input : undefined;
  if (typeof input !== 'string') return undefined;
  const match = input.trim().replace(',', '.').match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*(kW|W)?$/i);
  if (!match) return undefined;
  // Legacy unitless Flow values were interpreted as kW by the speed formula.
  return Number(match[1]) * (!match[2] || match[2].toLowerCase() === 'kw' ? 1000 : 1);
}
export function powerSpeed(watts: number | undefined, override?: number, direction = 'auto'): number {
  if (direction === 'auto-inverted' && watts !== undefined) watts = -watts;
  if (direction === 'none' || watts === 0) return 0;
  const manual = typeof override === 'number' && Number.isFinite(override) && override! > 0;
  if (watts === undefined && !manual) return 0;
  const magnitude = manual ? Math.max(0, Math.min(100, Math.abs(override!))) : Math.max(1, Math.min(100, Math.round(Math.abs(watts!) / 100)));
  const sign = direction === 'inflow' ? 1 : direction === 'outflow' ? -1 : Math.sign(watts ?? override!);
  return sign * magnitude;
}
