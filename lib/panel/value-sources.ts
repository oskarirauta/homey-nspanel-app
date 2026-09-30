import type { FanState, SelectState, LightState, ShutterState, ThermoState } from './models';

export interface PopupStates {
  fan: FanState;
  select: SelectState;
  light: LightState;
  shutter: ShutterState;
  thermo: ThermoState;
}
export type PopupKind = keyof PopupStates;
export interface PopupValueSource {
  bound: boolean;
  capabilityId?: string;
  read(capabilityId: string): unknown;
}

const protectedFields: Record<PopupKind, readonly string[]> = {
  fan: ['onoff', 'speed'],
  select: ['current', 'mode'],
  light: ['onoff', 'brightness', 'color_temp', 'colorTemp', 'hue', 'saturation'],
  shutter: ['position', 'tilt', 'hasTilt'],
  thermo: ['mode1'],
};

/** Flow metadata is allowed; a bound device remains the owner of its primary values. */
export function filterPopupFlowValues<T extends Record<string, unknown>>(
  kind: PopupKind, values: T, bound: boolean, hasThermostatMode = false,
): T {
  if (!values || !bound || (kind === 'thermo' && !hasThermostatMode)) return values;
  const result = { ...values };
  for (const key of protectedFields[kind]) delete result[key];
  if (kind === 'thermo' && !['mode2', 'preset', 'row2', 'mode3', 'fan', 'row3'].includes(String(values.mode_row))) delete result.mode;
  return result;
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** Missing readings retain the last display value. They never become zero or the text "null". */
export function applyHomeyPopupValues<K extends PopupKind>(kind: K, state: PopupStates[K], source: PopupValueSource): void {
  if (!source.bound) return;
  const read = source.read;
  switch (kind) {
    case 'fan': {
      const target = state as FanState;
      const onoff = read('onoff'), speed = read('dim');
      if (typeof onoff === 'boolean') target.onoff = onoff;
      if (finite(speed)) target.speed = Math.round(speed * (target.maxSpeed || 4));
      break;
    }
    case 'select': {
      const value = read(source.capabilityId || 'homealarm_state');
      if (value !== undefined && value !== null && (typeof value !== 'number' || finite(value))) (state as SelectState).currentMode = String(value);
      break;
    }
    case 'light': {
      const target = state as LightState;
      const onoff = read('onoff'), dim = read('dim'), temperature = read('light_temperature');
      const hue = read('light_hue'), saturation = read('light_saturation');
      if (typeof onoff === 'boolean') target.onoff = onoff;
      if (finite(dim)) target.brightness = Math.round(dim * 100);
      if (finite(temperature)) target.colorTemp = Math.round(temperature * 100);
      if (finite(hue)) target.hue = hue;
      if (finite(saturation)) target.saturation = saturation;
      break;
    }
    case 'shutter': {
      const target = state as ShutterState;
      const position = read('windowcoverings_set'), tilt = read('windowcoverings_tilt_set');
      if (finite(position)) target.position = Math.round(position * 100);
      if (finite(tilt)) { target.tilt = Math.round(tilt * 100); target.hasTilt = true; }
      break;
    }
    case 'thermo': {
      const mode = read('thermostat_mode');
      if (typeof mode === 'string' && mode) (state as ThermoState).currentMode1 = mode;
      break;
    }
  }
}
