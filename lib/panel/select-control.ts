import { createSelectState } from './state-defaults';
import type { SelectState } from './models';
import type { ControlContext } from './control-context';

export interface SelectAction {
  entity: string;
  option: string;
  index: number;
}
export interface SelectControlContext extends ControlContext<SelectState, SelectAction> {
  /** Undefined means a Flow list; an empty array means no available Homey options. */
  options?: ReadonlyArray<{ id: string; label: string }>;
}

export async function handleSelectControl(context: SelectControlContext, buttonType: string, value: string): Promise<boolean> {
  if (!buttonType.startsWith('mode-')) return false;
  const { entity, slot: matchedSlot } = context;
  // Select mode choice (popupInSel)
  const modeIdx = Number(value);
  const state: SelectState = context.states.get(entity) || createSelectState();
  const modesList = (state.modes || '').includes('?') ? state.modes.split('?') : state.modes.split(',');
  const options=context.options;
  if(options && (!value.trim() || !Number.isInteger(modeIdx) || !options[modeIdx] || !context.supports(matchedSlot?.binding?.capabilityId || 'homealarm_state')))return true;
  const modeName = options ? options[modeIdx].id : ((!isNaN(modeIdx) && modesList[modeIdx]) ? modesList[modeIdx].trim() : value);
  state.currentMode = modeName;
  state.modeIndex = isNaN(modeIdx) ? -1 : modeIdx;
  context.states.set(entity, state);
  if (matchedSlot) {
    matchedSlot.value = modeName;
    if (matchedSlot.binding?.source === 'homey' && matchedSlot.binding.deviceId) {
      const capId = matchedSlot.binding.capabilityId || 'homealarm_state';
      await context.set(matchedSlot.binding.deviceId, capId, modeName);
    }
  }

  context.emit({
    entity,
    option: modeName,
    index: state.modeIndex
  });

  context.render();
  return true;
}
