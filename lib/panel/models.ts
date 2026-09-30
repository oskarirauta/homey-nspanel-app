import type { Page } from '../page';

// Persistent page configuration; legacy card options retain their existing schema.
export interface StoredPage {
  type: Page.Type;
  title: string;
  prevTarget?: string;
  nextTarget?: string;
  navigation?: Page.Navigation;
  slots: { [slot: number]: any };
  rawOptions?: any;
  order?: number;
  require_pin?: boolean;
  pin?: string;
}

export interface LightState {
  onoff: boolean;
  brightness: number | string;
  colorTemp: number | string;
  colorMode: boolean;
  hue?: number;
  saturation?: number;
  color?: string;
}

export interface TimerState {
  minutes: number;
  seconds: number;
  initialMinutes: number;
  initialSeconds: number;
  status: 'idle' | 'running' | 'paused';
  editable: number;
  endsAt?: number;
  color?: string;
  label?: string;
}

export interface ShutterState {
  position: number | string;
  tilt: number | string;
  hasTilt: boolean;
  color?: string;
  label?: string;
}

export interface ThermoState {
  title?: string;
  icon?: string;
  color?: string | number;
  heading1?: string;
  type1?: string;
  currentMode1?: string;
  modeList1?: string;
  heading2?: string;
  type2?: string;
  currentMode2?: string;
  modeList2?: string;
  heading3?: string;
  type3?: string;
  currentMode3?: string;
  modeList3?: string;
}

export interface FanState {
  onoff: boolean;
  speed: number;
  maxSpeed: number;
  label: string;
  currentMode: string;
  modes: string;
  modeIndex?: number;
  color?: string;
}

export interface SelectState {
  title: string;
  currentMode: string;
  modes: string;
  modeIndex?: number;
  color?: string;
}
