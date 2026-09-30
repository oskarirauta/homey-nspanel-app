import type { FanState, SelectState, LightState, ShutterState, ThermoState } from './models';

/** Every call creates an independent state; per-slot and per-action overrides stay explicit. */
export function createFanState(overrides: Partial<FanState> = {}): FanState {
  return {
    onoff: true,
    speed: 2,
    maxSpeed: 4,
    label: 'Teho',
    currentMode: 'Kotona',
    modes: 'Poissa?Kotona?Tehostus?Takkatila',
    color: 'white',
    ...overrides,
  };
}

export function createSelectState(overrides: Partial<SelectState> = {}): SelectState {
  return {
    title: 'Tila',
    currentMode: '',
    modes: 'Kotona?Poissa?Nukkumassa?Loma',
    color: 'white',
    ...overrides,
  };
}

export function createLightState(overrides: Partial<LightState> = {}): LightState {
  return {
    onoff: false,
    brightness: 100,
    colorTemp: 50,
    colorMode: true,
    color: 'yellow',
    ...overrides,
  };
}

export function createShutterState(overrides: Partial<ShutterState> = {}): ShutterState {
  return {
    position: 50,
    tilt: 50,
    hasTilt: true,
    color: 'white',
    ...overrides,
  };
}

export function createThermoState(overrides: Partial<ThermoState> = {}): ThermoState {
  return {
    title: 'Termostaatti',
    icon: 'thermometer',
    color: 'climate_heat',
    heading1: 'Toimintatila',
    type1: 'operation_mode',
    currentMode1: 'Lämmitys',
    modeList1: 'Auto?Lämmitys?Viilennys?Pois',
    heading2: 'Esiasetus',
    type2: 'preset_mode',
    currentMode2: 'Koti',
    modeList2: 'Koti?Säästö?Mukavuus?Tehostus',
    heading3: 'Puhallin',
    type3: 'fan_mode',
    currentMode3: 'Auto',
    modeList3: 'Auto?Matala?Keski?Korkea',
    ...overrides,
  };
}

