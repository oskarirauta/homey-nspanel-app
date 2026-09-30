import { createShutterState } from './state-defaults';
import type { ShutterState } from './models';
import type { ControlContext } from './control-context';

export interface ShutterAction {
  entity: string;
  action_type: 'position' | 'tilt' | 'up' | 'down' | 'stop' | 'tilt_open' | 'tilt_close' | 'tilt_stop';
  position: number;
  tilt: number;
}
export interface ShutterControlContext extends ControlContext<ShutterState, ShutterAction> {
  supportsAction(action: string): boolean;
  move(direction: 'up' | 'down'): Promise<void>;
}

/** Returns true for a handled or rejected control event; false lets navigation continue. */
export async function handleShutterControl(context: ShutterControlContext, buttonType: string, value: string): Promise<boolean> {
  const { entity, slot: matchedSlot } = context;
  if(!context.supportsAction(buttonType))return true;
  let state = context.states.get(entity) || createShutterState();

  if(['positionSlider','tiltSlider'].includes(buttonType) && (!value.trim() || !Number.isFinite(Number(value))))return true;

  if (buttonType === 'positionSlider') {
    const pos = Math.max(0, Math.min(100, Number(value)));
    state.position = pos;
    context.states.set(entity, state);

    if (matchedSlot) {
      matchedSlot.value = `${pos} %`;
      matchedSlot.val = String(pos);
    }
    if (matchedSlot?.binding?.source === 'homey' && matchedSlot.binding.deviceId) {
      await context.set(matchedSlot.binding.deviceId, 'windowcoverings_set', pos / 100);
    }

    context.emit({
      entity,
      action_type: 'position',
      position: pos,
      tilt: typeof state.tilt === 'number' ? state.tilt : 50
    });

    context.render();
    return true;
  }

  if (buttonType === 'tiltSlider') {
    const tilt = Math.max(0, Math.min(100, Number(value)));
    state.tilt = tilt;
    context.states.set(entity, state);

    if (matchedSlot?.binding?.source === 'homey' && matchedSlot.binding.deviceId) {
      await context.set(matchedSlot.binding.deviceId, 'windowcoverings_tilt_set', tilt / 100);
    }

    context.emit({
      entity,
      action_type: 'tilt',
      position: typeof state.position === 'number' ? state.position : 50,
      tilt
    });

    context.render();
    return true;
  }

  if (buttonType === 'up') {
    state.position = 100;
    context.states.set(entity, state);

    if (matchedSlot) {
      matchedSlot.value = '100 %';
      matchedSlot.val = '100';
    }
    if (matchedSlot?.binding?.source === 'homey' && matchedSlot.binding.deviceId) {
      await context.move('up');
    }

    context.emit({
      entity,
      action_type: 'up',
      position: 100,
      tilt: typeof state.tilt === 'number' ? state.tilt : 50
    });

    context.render();
    return true;
  }

  if (buttonType === 'down') {
    state.position = 0;
    context.states.set(entity, state);

    if (matchedSlot) {
      matchedSlot.value = '0 %';
      matchedSlot.val = '0';
    }
    if (matchedSlot?.binding?.source === 'homey' && matchedSlot.binding.deviceId) {
      await context.move('down');
    }

    context.emit({
      entity,
      action_type: 'down',
      position: 0,
      tilt: typeof state.tilt === 'number' ? state.tilt : 50
    });

    context.render();
    return true;
  }

  if (buttonType === 'stop') {
    if (matchedSlot?.binding?.source === 'homey' && matchedSlot.binding.deviceId) {
      await context.set(matchedSlot.binding.deviceId, 'windowcoverings_state', 'idle');
    }

    context.emit({
      entity,
      action_type: 'stop',
      position: typeof state.position === 'number' ? state.position : 50,
      tilt: typeof state.tilt === 'number' ? state.tilt : 50
    });

    context.render();
    return true;
  }

  if (buttonType === 'tiltOpen') {
    state.tilt = 100;
    context.states.set(entity, state);

    if (matchedSlot?.binding?.source === 'homey' && matchedSlot.binding.deviceId) {
      await context.set(matchedSlot.binding.deviceId, 'windowcoverings_tilt_set', 1.0);
    }

    context.emit({
      entity,
      action_type: 'tilt_open',
      position: typeof state.position === 'number' ? state.position : 50,
      tilt: 100
    });

    context.render();
    return true;
  }

  if (buttonType === 'tiltClose') {
    state.tilt = 0;
    context.states.set(entity, state);

    if (matchedSlot?.binding?.source === 'homey' && matchedSlot.binding.deviceId) {
      await context.set(matchedSlot.binding.deviceId, 'windowcoverings_tilt_set', 0.0);
    }

    context.emit({
      entity,
      action_type: 'tilt_close',
      position: typeof state.position === 'number' ? state.position : 50,
      tilt: 0
    });

    context.render();
    return true;
  }

  if (buttonType === 'tiltStop') {
    context.emit({
      entity,
      action_type: 'tilt_stop',
      position: typeof state.position === 'number' ? state.position : 50,
      tilt: typeof state.tilt === 'number' ? state.tilt : 50
    });

    context.render();
    return true;
  }
  return false;
}
