import { Color } from '../color';
import { Icon } from '../icon';

export interface FanPopupOptions {
  entityId: string;
  iconColor?: number | string | Color.RGB;
  buttonState?: boolean | number;
  speed?: number | string;
  maxSpeed?: number;
  label?: string;
  currentMode?: string;
  modes?: string | string[];
}

export function GenerateFanPopup(options: FanPopupOptions): string {
  const entityId = options.entityId || 'fan';
  const color = options.iconColor !== undefined ? Color.get(options.iconColor, 'white')! : 65535;
  const btn = options.buttonState ? 1 : 0;
  const speed = (options.speed === 'disable' || options.maxSpeed === 0) ? 'disable' : (options.speed ?? 0);
  const maxSpeed = options.maxSpeed !== undefined ? options.maxSpeed : 100;
  const label = options.label || 'Speed';
  const curMode = options.currentMode || '';
  const modes = Array.isArray(options.modes) ? options.modes.join('?') : (options.modes || '');

  return `entityUpdateDetail~${entityId}~~${color}~${btn}~${speed}~${maxSpeed}~${label}~${curMode}~${modes}`;
}

export interface InputSelectPopupOptions {
  entityId: string;
  iconColor?: number | string | Color.RGB;
  title?: string;
  currentMode?: string;
  modes?: string | string[];
}

export function GenerateInputSelectPopup(options: InputSelectPopupOptions): string {
  const entityId = options.entityId || 'select';
  const color = options.iconColor !== undefined ? Color.get(options.iconColor, 'white')! : 65535;
  const title = options.title || 'Valinta';
  const curMode = options.currentMode || '';
  let modes = '';
  if (Array.isArray(options.modes)) {
    modes = options.modes.join('?');
  } else if (typeof options.modes === 'string') {
    modes = options.modes.includes('?') ? options.modes : options.modes.split(',').map(s => s.trim()).join('?');
  }

  return `entityUpdateDetail2~${entityId}~~${color}~${title}~${curMode}~${modes}`;
}

export interface TimerPopupOptions {
  entityId: string;
  iconColor?: number | string | Color.RGB;
  minutes?: number;
  seconds?: number;
  editable?: boolean | number;
  action1?: string;
  action2?: string;
  action3?: string;
  label1?: string;
  label2?: string;
  label3?: string;
}

export function GenerateTimerPopup(options: TimerPopupOptions): string {
  const entityId = options.entityId || 'timer';
  const color = options.iconColor !== undefined ? Color.get(options.iconColor, 'white')! : 65535;
  const min = Math.max(0, Math.min(59, options.minutes ?? 0));
  const sec = Math.max(0, Math.min(59, options.seconds ?? 0));
  const editable = (options.editable === false || options.editable === 0) ? 0 : 1;
  const action1 = options.action1 ?? '';
  const action2 = options.action2 ?? '';
  const action3 = options.action3 ?? '';
  const label1 = options.label1 ?? '';
  const label2 = options.label2 ?? '';
  const label3 = options.label3 ?? '';

  return `entityUpdateDetail~${entityId}~~${color}~${entityId}~${min}~${sec}~${editable}~${action1}~${action2}~${action3}~${label1}~${label2}~${label3}`;
}

export interface LightPopupOptions {
  entityId: string;
  icon?: string;
  iconColor?: number | string | Color.RGB;
  buttonState?: boolean | number;
  brightness?: number | string;
  colorTemp?: number | string;
  colorMode?: boolean | string;
  colorTranslation?: string;
  colorTempTranslation?: string;
  brightnessTranslation?: string;
  effectSupported?: boolean | string;
}

export function GenerateLightPopup(options: LightPopupOptions): string {
  const entityId = options.entityId || 'light';
  const icon = options.icon || '';
  const color = options.iconColor !== undefined ? Color.get(options.iconColor, 'white')! : 65535;
  const btn = options.buttonState ? 1 : 0;

  let br = 'disable';
  if (options.brightness !== undefined && options.brightness !== null && options.brightness !== 'disable') {
    const num = Number(options.brightness);
    br = !isNaN(num) ? String(Math.max(0, Math.min(100, Math.round(num)))) : 'disable';
  }

  let ct = 'disable';
  if (options.colorTemp !== undefined && options.colorTemp !== null && options.colorTemp !== 'disable') {
    if (options.colorTemp === 'unknown') {
      ct = 'unknown';
    } else {
      const num = Number(options.colorTemp);
      ct = !isNaN(num) ? String(Math.max(0, Math.min(100, Math.round(num)))) : 'disable';
    }
  }

  const cm = (options.colorMode === true || options.colorMode === 'enable') ? 'enable' : 'disable';
  const colorTrans = options.colorTranslation || 'Väri';
  const ctTrans = options.colorTempTranslation || 'Lämpötila';
  const brTrans = options.brightnessTranslation || 'Kirkkaus';
  const eff = (options.effectSupported === true || options.effectSupported === 'enable') ? 'enable' : 'disable';

  return `entityUpdateDetail~${entityId}~${icon}~${color}~${btn}~${br}~${ct}~${cm}~${colorTrans}~${ctTrans}~${brTrans}~${eff}`;
}

export interface ShutterPopupOptions {
  entityId: string;
  pos?: number | string;
  infoText?: string;
  posHeading?: string;
  icon?: string;
  iconUp?: string;
  iconStop?: string;
  iconDown?: string;
  statusUp?: boolean | string;
  statusStop?: boolean | string;
  statusDown?: boolean | string;
  tiltHeading?: string;
  iconTiltLeft?: string;
  iconTiltStop?: string;
  iconTiltRight?: string;
  statusTiltLeft?: boolean | string;
  statusTiltStop?: boolean | string;
  statusTiltRight?: boolean | string;
  tilt?: number | string;
}

export function GenerateShutterPopup(options: ShutterPopupOptions): string {
  const entityId = options.entityId || 'shutter';

  let posVal = 'disable';
  if (options.pos !== undefined && options.pos !== null && options.pos !== 'disable') {
    const num = Number(options.pos);
    posVal = !isNaN(num) ? String(Math.max(0, Math.min(100, Math.round(num)))) : 'disable';
  }

  const infoText = options.infoText !== undefined ? options.infoText : (posVal !== 'disable' ? `${posVal} %` : '');
  const posHeading = options.posHeading || 'Asento';

  const icon = options.icon ? (Icon.get(options.icon) || options.icon) : (Icon.get('window-shutter') || '');
  const iconUp = options.iconUp ? (Icon.get(options.iconUp) || options.iconUp) : (Icon.get('arrow-up') || '');
  const iconStop = options.iconStop ? (Icon.get(options.iconStop) || options.iconStop) : (Icon.get('stop') || '');
  const iconDown = options.iconDown ? (Icon.get(options.iconDown) || options.iconDown) : (Icon.get('arrow-down') || '');

  const statusUp = (options.statusUp === false || options.statusUp === 'disable') ? 'disable' : 'enable';
  const statusStop = (options.statusStop === false || options.statusStop === 'disable') ? 'disable' : 'enable';
  const statusDown = (options.statusDown === false || options.statusDown === 'disable') ? 'disable' : 'enable';

  const tiltHeading = options.tiltHeading || 'Säleet';
  const iconTiltLeft = options.iconTiltLeft ? (Icon.get(options.iconTiltLeft) || options.iconTiltLeft) : (Icon.get('arrow-top-right') || '');
  const iconTiltStop = options.iconTiltStop ? (Icon.get(options.iconTiltStop) || options.iconTiltStop) : (Icon.get('stop') || '');
  const iconTiltRight = options.iconTiltRight ? (Icon.get(options.iconTiltRight) || options.iconTiltRight) : (Icon.get('arrow-bottom-left') || '');

  let statusTiltLeft = '';
  let statusTiltStop = '';
  let statusTiltRight = '';
  if (options.statusTiltLeft !== undefined && options.statusTiltLeft !== '') {
    statusTiltLeft = (options.statusTiltLeft === true || options.statusTiltLeft === 'enable') ? 'enable' : 'disable';
  }
  if (options.statusTiltStop !== undefined && options.statusTiltStop !== '') {
    statusTiltStop = (options.statusTiltStop === true || options.statusTiltStop === 'enable') ? 'enable' : 'disable';
  }
  if (options.statusTiltRight !== undefined && options.statusTiltRight !== '') {
    statusTiltRight = (options.statusTiltRight === true || options.statusTiltRight === 'enable') ? 'enable' : 'disable';
  }

  let tiltVal = 'disable';
  if (options.tilt !== undefined && options.tilt !== null && options.tilt !== 'disable') {
    const num = Number(options.tilt);
    tiltVal = !isNaN(num) ? String(Math.max(0, Math.min(100, Math.round(num)))) : 'disable';
    if (!statusTiltLeft) statusTiltLeft = 'enable';
    if (!statusTiltStop) statusTiltStop = 'enable';
    if (!statusTiltRight) statusTiltRight = 'enable';
  }

  return `entityUpdateDetail~${entityId}~${posVal}~${infoText}~${posHeading}~${icon}~${iconUp}~${iconStop}~${iconDown}~${statusUp}~${statusStop}~${statusDown}~${tiltHeading}~${iconTiltLeft}~${iconTiltStop}~${iconTiltRight}~${statusTiltLeft}~${statusTiltStop}~${statusTiltRight}~${tiltVal}`;
}

export interface ThermoPopupMode {
  heading?: string;
  type?: string;
  currentMode?: string;
  modes?: string | string[];
}

export interface ThermoPopupOptions {
  entityId?: string;
  icon?: string;
  iconColor?: number | string | Color.RGB;
  // Row 1 (e.g. Operation mode / Toimintatila)
  heading1?: string;
  type1?: string;
  currentMode1?: string;
  modeList1?: string | string[];
  // Row 2 (e.g. Preset mode / Esiasetus)
  heading2?: string;
  type2?: string;
  currentMode2?: string;
  modeList2?: string | string[];
  // Row 3 (e.g. Fan mode / Puhallin)
  heading3?: string;
  type3?: string;
  currentMode3?: string;
  modeList3?: string | string[];
  // Structured mode objects:
  mode1?: ThermoPopupMode;
  mode2?: ThermoPopupMode;
  mode3?: ThermoPopupMode;
}

export function GenerateThermoPopup(options: ThermoPopupOptions): string {
  const entityId = options.entityId || 'thermo';
  const icon = options.icon ? (Icon.get(options.icon, 'thermometer') || options.icon) : (Icon.get('thermometer') || '');
  const color = options.iconColor !== undefined ? Color.get(options.iconColor, 'climate_heat')! : Color.get('climate_heat')!;

  const formatModes = (modes?: string | string[]): string => {
    if (!modes) return '';
    if (Array.isArray(modes)) return modes.join('?');
    if (typeof modes === 'string') {
      return modes.includes('?') ? modes : modes.split(',').map(s => s.trim()).join('?');
    }
    return '';
  };

  const heading1 = options.heading1 ?? options.mode1?.heading ?? '';
  const type1 = options.type1 ?? options.mode1?.type ?? 'mode';
  const curMode1 = options.currentMode1 ?? options.mode1?.currentMode ?? '';
  const modes1 = formatModes(options.modeList1 ?? options.mode1?.modes);

  const heading2 = options.heading2 ?? options.mode2?.heading ?? '';
  const type2 = options.type2 ?? options.mode2?.type ?? 'preset_mode';
  const curMode2 = options.currentMode2 ?? options.mode2?.currentMode ?? '';
  const modes2 = formatModes(options.modeList2 ?? options.mode2?.modes);

  const heading3 = options.heading3 ?? options.mode3?.heading ?? '';
  const type3 = options.type3 ?? options.mode3?.type ?? 'fan_mode';
  const curMode3 = options.currentMode3 ?? options.mode3?.currentMode ?? '';
  const modes3 = formatModes(options.modeList3 ?? options.mode3?.modes);

  return `entityUpdateDetail~${entityId}~${icon}~${color}~${heading1}~${type1}~${curMode1}~${modes1}~${heading2}~${type2}~${curMode2}~${modes2}~${heading3}~${type3}~${curMode3}~${modes3}`;
}

