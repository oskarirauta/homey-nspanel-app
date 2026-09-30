import { createLightState } from './state-defaults';
import type { LightState } from './models';
import type { ControlContext } from './control-context';
import { Color } from '../color';

export interface LightAction {
  entity: string;
  action_type: 'onoff' | 'brightness' | 'color_temp' | 'color';
  onoff: boolean;
  brightness: number;
  color_temp: number;
  hue: number;
  saturation: number;
}

/** Returns true for a handled or rejected control event; false lets navigation continue. */
export async function handleLightControl(context: ControlContext<LightState, LightAction>, buttonType: string, value: string): Promise<boolean> {
  const { entity, slot: matchedSlot } = context;
  const needed:Record<string,string[]>={OnOff:['onoff'],brightnessSlider:['dim'],colorTempSlider:['light_temperature'],colorWheel:['light_hue','light_saturation']};
  if (!Object.prototype.hasOwnProperty.call(needed, buttonType)) return false;
  if (needed[buttonType].some(id => !context.supports(id))) return true;
  if (buttonType === 'OnOff' && !['0', '1'].includes(value)) return true;
  if(['brightnessSlider','colorTempSlider'].includes(buttonType) && (value.trim()===''||!Number.isFinite(Number(value))))return true;

  if (buttonType === 'OnOff') {
    const onoff = value === '1';
    let state = context.states.get(entity) || createLightState();
    state.onoff = onoff;
    context.states.set(entity, state);
    if (matchedSlot) {
      matchedSlot.val = onoff ? '1' : '0';
    }
    if (matchedSlot?.binding?.source === 'homey' && matchedSlot.binding.deviceId) {
      await context.set(matchedSlot.binding.deviceId, 'onoff', onoff);
    }

    context.emit({
      entity,
      action_type: 'onoff',
      onoff,
      brightness: typeof state.brightness === 'number' ? state.brightness : (onoff ? 100 : 0),
      color_temp: typeof state.colorTemp === 'number' ? state.colorTemp : 50,
      hue: state.hue !== undefined ? state.hue : 0,
      saturation: state.saturation !== undefined ? state.saturation : 0
    });

    context.render();
    return true;
  }

  if (buttonType === 'brightnessSlider') {
    const bri = Math.max(0, Math.min(100, Math.trunc(Number(value))));
    let state = context.states.get(entity) || createLightState({ onoff: true, brightness: bri });
    state.brightness = bri;
    if (bri > 0 && !state.onoff) {
      state.onoff = true;
    }
    context.states.set(entity, state);
    if (matchedSlot) {
      matchedSlot.value = `${bri} %`;
      if (bri > 0) matchedSlot.val = '1';
    }
    if (matchedSlot?.binding?.source === 'homey' && matchedSlot.binding.deviceId) {
      await context.set(matchedSlot.binding.deviceId, 'dim', bri / 100);
      if (bri > 0 && context.supports('onoff')) await context.set(matchedSlot.binding.deviceId, 'onoff', true);
    }

    context.emit({
      entity,
      action_type: 'brightness',
      onoff: state.onoff,
      brightness: bri,
      color_temp: typeof state.colorTemp === 'number' ? state.colorTemp : 50,
      hue: state.hue !== undefined ? state.hue : 0,
      saturation: state.saturation !== undefined ? state.saturation : 0
    });

    context.render();
    return true;
  }

  if (buttonType === 'colorTempSlider') {
    const ct = Math.max(0, Math.min(100, Math.trunc(Number(value))));
    let state = context.states.get(entity) || createLightState({ onoff: true, colorTemp: ct });
    state.colorTemp = ct;
    context.states.set(entity, state);
    if (matchedSlot?.binding?.source === 'homey' && matchedSlot.binding.deviceId) {
      await context.set(matchedSlot.binding.deviceId, 'light_temperature', ct / 100);
      if(context.supports('light_mode'))await context.set(matchedSlot.binding.deviceId, 'light_mode', 'temperature');
    }

    context.emit({
      entity,
      action_type: 'color_temp',
      onoff: state.onoff,
      brightness: typeof state.brightness === 'number' ? state.brightness : 100,
      color_temp: ct,
      hue: state.hue !== undefined ? state.hue : 0,
      saturation: state.saturation !== undefined ? state.saturation : 0
    });

    context.render();
    return true;
  }

  if (buttonType === 'colorWheel') {
    const cParts = value.split('|');
    if (cParts.length !== 3 || cParts.some(part => !part.trim())) return true;
    {
      const [x, y, wh] = cParts.map(Number);
      if (![x, y, wh].every(Number.isSafeInteger) || wh <= 0) return true;
      const { hue, saturation } = Color.pos_to_hsv(x, y, wh);

      let state = context.states.get(entity) || createLightState({ onoff: true });
      state.hue = hue;
      state.saturation = saturation;
      context.states.set(entity, state);
      if (matchedSlot?.binding?.source === 'homey' && matchedSlot.binding.deviceId) {
        await context.set(matchedSlot.binding.deviceId, 'light_hue', hue);
        await context.set(matchedSlot.binding.deviceId, 'light_saturation', saturation);
        if(context.supports('light_mode'))await context.set(matchedSlot.binding.deviceId, 'light_mode', 'color');
      }

      context.emit({
        entity,
        action_type: 'color',
        onoff: state.onoff,
        brightness: typeof state.brightness === 'number' ? state.brightness : 100,
        color_temp: typeof state.colorTemp === 'number' ? state.colorTemp : 50,
        hue,
        saturation
      });

      context.render();
      return true;
    }
  }
  return false;
}
