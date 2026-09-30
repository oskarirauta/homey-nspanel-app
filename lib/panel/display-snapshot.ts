/** Popup states contain scalar display fields; shallow copies preserve their values. */
export function captureMapEntries<T extends object>(map: Map<string, T>, ids: ReadonlySet<string>): () => void {
  const snapshot = new Map(Array.from(ids, id => [id, map.has(id) ? { ...map.get(id)! } : undefined] as const));
  return () => {
    snapshot.forEach((state, id) => {
      if (state === undefined) map.delete(id);
      else map.set(id, state);
    });
  };
}

interface DisplaySlot {
  id?: string;
  name?: string;
  target?: string;
  val?: unknown;
  value?: unknown;
}

/** Restore only display values belonging to this interaction, never page configuration. */
export function captureSlotValues(slots: Record<string, DisplaySlot>, ids: ReadonlySet<string>): () => void {
  const snapshot = Object.entries(slots)
    .filter(([number, slot]) => [slot.id, slot.name, slot.target, 'slot_' + number].some(id => id !== undefined && ids.has(id)))
    .map(([, slot]) => ({ slot, val: slot.val, value: slot.value }));
  return () => {
    snapshot.forEach(({ slot, val, value }) => {
      if (val === undefined) delete slot.val;
      else slot.val = val;
      if (value === undefined) delete slot.value;
      else slot.value = value;
    });
  };
}
