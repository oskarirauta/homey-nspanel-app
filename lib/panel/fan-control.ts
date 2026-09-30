import { createFanState } from './state-defaults';
import type { FanState } from './models';
import type { ControlContext } from './control-context';

export interface FanAction {
  entity: string;
  action_type: 'speed' | 'mode' | 'onoff';
  speed: number;
  mode: string;
  mode_index: number;
  onoff: boolean;
}

/** Device routing decides whether a mode or on/off event belongs to this fan. */
export async function handleFanControl(context: ControlContext<FanState, FanAction>, buttonType: string, value: string): Promise<boolean> {
  const { entity, slot: matchedSlot } = context;
  if (buttonType === 'number-set') {
    if(!context.supports('dim') || !value.trim() || !Number.isFinite(Number(value)))return true;
    const numVal = Number(value);
    const state: FanState = context.states.get(entity) || createFanState();
    state.speed = Math.max(0,Math.min(state.maxSpeed,Math.round(numVal)));
    context.states.set(entity, state);
    if (matchedSlot) {
      matchedSlot.value = `${state.speed} / ${state.maxSpeed}`;
    }
    if (matchedSlot?.binding?.source === 'homey' && matchedSlot.binding.deviceId) {
      const dimVal = state.maxSpeed > 0 ? Math.max(0, Math.min(1, state.speed / state.maxSpeed)) : 0;
      await context.set(matchedSlot.binding.deviceId, 'dim', dimVal);
    }

    context.emit({
      entity,
      action_type: 'speed',
      speed: state.speed,
      mode: state.currentMode || '',
      mode_index: state.modeIndex !== undefined ? state.modeIndex : -1,
      onoff: state.onoff
    });

    context.render();
    return true;
  }
  if (buttonType === 'mode-preset_modes') {
    const modeIdx = parseInt(value, 10);
    const state: FanState = context.states.get(entity) || createFanState();
    const modesList = (state.modes || '').split('?');
    const modeName = (!isNaN(modeIdx) && modesList[modeIdx]) ? modesList[modeIdx] : value;
    state.currentMode = modeName;
    state.modeIndex = isNaN(modeIdx) ? -1 : modeIdx;
    context.states.set(entity, state);
    if (matchedSlot) {
      matchedSlot.value = modeName;
    }

    context.emit({
      entity,
      action_type: 'mode',
      speed: state.speed,
      mode: modeName,
      mode_index: state.modeIndex,
      onoff: state.onoff
    });

    context.render();
    return true;
  }
  if (buttonType === 'OnOff') {
    if(!context.supports('onoff') || !['0','1'].includes(value))return true;
    const onoff = value === '1';
    const state: FanState = context.states.get(entity) || createFanState();
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
      speed: state.speed,
      mode: state.currentMode || '',
      mode_index: state.modeIndex !== undefined ? state.modeIndex : -1,
      onoff
    });

    context.render();
    return true;
  }
  return false;
}
