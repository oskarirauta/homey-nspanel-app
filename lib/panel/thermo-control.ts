import { createThermoState } from './state-defaults';
import type { Binding } from '../bindings';
import type { ThermoState } from './models';

export interface ThermoModeAction {
  entity: string;
  mode_type: string;
  mode: string;
  mode_index: number;
  row: number;
}

export interface ThermoControlContext {
  entity: string;
  states: Map<string, ThermoState>;
  binding?: Binding;
  modeCapability?: { setable?: boolean; options: ReadonlyArray<{ id: string; label: string }> };
  set(deviceId: string, capability: string, value: unknown): Promise<void>;
  emit(tokens: ThermoModeAction): void;
  render(): void;
}

/** The primary row may control Homey; secondary rows remain Flow actions. */
export async function handleThermoControl(context: ThermoControlContext, buttonType: string, value: string): Promise<boolean> {
  if (!buttonType.startsWith('mode-')) return false;
  const { entity } = context;
  const modeType = buttonType.substring(5); // e.g. 'operation_mode', 'preset_mode', 'fan_mode', 'mode'
  const modeIdx = parseInt(value, 10);
  const state = { ...(context.states.get(entity) || createThermoState()) };

  let selectedMode = '';
  let modeRow = 1;
  if (state.type2 === modeType || modeType === 'preset_mode' || modeType === 'preset') {
    modeRow = 2;
    const list = (state.modeList2 || '').split('?');
    selectedMode = (!isNaN(modeIdx) && list[modeIdx]) ? list[modeIdx].trim() : value;
    state.currentMode2 = selectedMode;
  } else if (state.type3 === modeType || modeType === 'fan_mode' || modeType === 'fan') {
    modeRow = 3;
    const list = (state.modeList3 || '').split('?');
    selectedMode = (!isNaN(modeIdx) && list[modeIdx]) ? list[modeIdx].trim() : value;
    state.currentMode3 = selectedMode;
  } else {
    modeRow = 1;
    const list = (state.modeList1 || '').split('?');
    selectedMode = (!isNaN(modeIdx) && list[modeIdx]) ? list[modeIdx].trim() : value;
    state.currentMode1 = selectedMode;
  }

  const modeCapability=context.modeCapability;
  if(modeRow===1 && modeCapability){
    const options=modeCapability.options;
    const index=Number(value);
    if(modeCapability.setable===false || !value.trim() || !Number.isInteger(index) || !options[index])return true;
    selectedMode=options[index].id;
    state.currentMode1=selectedMode;
  }
  context.states.set(entity, state);

  const binding=context.binding;
  if (binding?.source === 'homey' && binding.deviceId) {
    if (modeRow === 1 && modeCapability) {
      await context.set(binding.deviceId, 'thermostat_mode', selectedMode);
    }
  }

  context.emit({
    entity,
    mode_type: modeType,
    mode: selectedMode,
    mode_index: isNaN(modeIdx) ? 0 : modeIdx,
    row: modeRow
  });

  context.render();
  return true;
}
