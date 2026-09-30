import { handleMediaControl, MediaControlContext } from '../lib/panel/media-control';
import { createFanState, createSelectState, createLightState, createShutterState, createThermoState } from '../lib/panel/state-defaults';
import { handleThermoControl, ThermoControlContext, ThermoModeAction } from '../lib/panel/thermo-control';
import { handleFanControl, FanAction } from '../lib/panel/fan-control';
import { handleSelectControl, SelectAction, SelectControlContext } from '../lib/panel/select-control';
import type { FanState } from '../lib/panel/models';
import assert from 'assert';
import { handleLightControl, LightAction } from '../lib/panel/light-control';
import { handleShutterControl, ShutterAction, ShutterControlContext } from '../lib/panel/shutter-control';
import { ControlContext } from '../lib/panel/control-context';
import { LightState } from '../lib/panel/models';

async function run() {
  const firstDefaults = createFanState();
  const secondDefaults = createFanState();
  firstDefaults.speed = 99;firstDefaults.currentMode = 'Oma tila';
  assert.equal(secondDefaults.speed, 2);assert.equal(secondDefaults.currentMode, 'Kotona');
  assert.equal(createLightState({ brightness: 0, onoff: false }).brightness, 0);
  assert.equal(createShutterState({ position: 0, hasTilt: false }).hasTilt, false);
  assert.equal(createSelectState({ currentMode: '', modes: '' }).modes, '');
  const firstThermo = createThermoState();firstThermo.modeList1 = 'Oma lista';
  assert.equal(createThermoState().modeList1, 'Auto?Lämmitys?Viilennys?Pois');

  const writes: unknown[][] = [];
  const lightEvents: LightAction[] = [];
  let renders = 0;
  const supported = new Set(['dim', 'onoff', 'light_temperature', 'light_mode', 'light_hue', 'light_saturation']);
  const light: ControlContext<LightState, LightAction> = {
    entity: 'lamp', states: new Map(),
    slot: { binding: { source: 'homey', deviceId: 'light', capabilityId: 'onoff' } },
    supports: capability => supported.has(capability),
    set: async (...args) => { writes.push(args); },
    emit: event => { lightEvents.push(event); },
    render: () => { renders++; },
  };
  assert.equal(await handleLightControl(light, 'bExit', ''), false);
  assert.equal(light.states.size, 0, 'Navigation must not mutate light state');
  // Rejected messages must leave both fresh and existing states untouched.
  for (const source of ['homey', 'flow'] as const) {
    light.slot = { binding: { source, deviceId: 'light', capabilityId: 'onoff' } };
    for (const existing of [false, true]) {
      light.states.clear();
      if (existing) light.states.set('lamp', createLightState({ onoff: true, brightness: 42 }));
      const before = JSON.stringify([...light.states]);
      const slotBefore = JSON.stringify(light.slot);
      for (const [button, invalid] of [
        ['OnOff', ''], ['OnOff', 'true'], ['OnOff', '2'],
        ['brightnessSlider', '50x'], ['colorTempSlider', 'Infinity'],
        ['colorWheel', '1x|2|160'], ['colorWheel', '|2|160'],
        ['colorWheel', '1|2|0'], ['colorWheel', '1|2|Infinity'],
        ['colorWheel', '1|2'], ['colorWheel', '1|2|160|extra'],
        ['colorWheel', '1.5|2|160'],
      ]) {
        assert.equal(await handleLightControl(light, button, invalid), true);
        assert.equal(JSON.stringify([...light.states]), before);
        assert.equal(JSON.stringify(light.slot), slotBefore);
        assert.equal(writes.length, 0);assert.equal(lightEvents.length, 0);assert.equal(renders, 0);
      }
    }
  }
  assert.equal(await handleLightControl(light, 'constructor', ''), false);
  light.slot = { binding: { source: 'homey', deviceId: 'light', capabilityId: 'onoff' } };
  for (const value of ['0', '1']) {
    await handleLightControl(light, 'OnOff', value);
    assert.deepEqual(writes.at(-1), ['light', 'onoff', value === '1']);
  }
  await handleLightControl(light, 'colorWheel', '80|80|160');
  assert.equal(lightEvents.at(-1)!.saturation, 0);
  await handleLightControl(light, 'brightnessSlider', '1e2');
  assert.equal(lightEvents.at(-1)!.brightness, 100, 'Validation and conversion must interpret numbers consistently');
  await handleLightControl(light, 'brightnessSlider', '0');
  assert.deepEqual(writes.at(-1), ['light', 'dim', 0]);
  writes.length = 0;lightEvents.length = 0;renders = 0;light.states.clear();
  await handleLightControl(light, 'brightnessSlider', '65');
  assert.deepEqual(writes, [['light', 'dim', 0.65], ['light', 'onoff', true]]);
  assert.equal(lightEvents[0].action_type, 'brightness');assert.equal(lightEvents[0].brightness, 65);
  assert.equal(renders, 1);
  writes.length = 0;lightEvents.length = 0;renders = 0;
  supported.delete('dim');
  assert.equal(await handleLightControl(light, 'brightnessSlider', '80'), true);
  assert.equal(writes.length, 0);assert.equal(lightEvents.length, 0);assert.equal(renders, 0);
  supported.add('dim');
  const failure = new Error('connection lost');
  light.set = async (_id, capability) => { if (capability === 'onoff') throw failure; };
  await assert.rejects(handleLightControl(light, 'brightnessSlider', '90'), error => error === failure);
  assert.equal(lightEvents.length, 0, 'Failure propagates to the interaction queue before success callbacks');
  assert.equal(renders, 0);
  light.slot = { binding: { source: 'flow' } };
  light.set = async () => { throw new Error('Flow must not write to Homey'); };
  await handleLightControl(light, 'colorTempSlider', '30');
  assert.equal(lightEvents[0].color_temp, 30);

  const shutterEvents: ShutterAction[] = [];
  const moves: string[] = [];
  const shutter: ShutterControlContext = {
    entity: 'blind', states: new Map(),
    slot: { binding: { source: 'homey', deviceId: 'cover', capabilityId: 'windowcoverings_set' } },
    supports: () => true, supportsAction: action => action !== 'tiltStop',
    set: async (...args) => { writes.push(args); },
    move: async direction => { moves.push(direction); },
    emit: event => { shutterEvents.push(event); },
    render: () => { renders++; },
  };
  writes.length = 0;
  assert.equal(await handleShutterControl(shutter, 'bNext', ''), false);
  await handleShutterControl(shutter, 'positionSlider', '35');
  assert.deepEqual(writes, [['cover', 'windowcoverings_set', 0.35]]);
  assert.equal(shutter.slot!.val, '35');assert.equal(shutterEvents[0].position, 35);
  await handleShutterControl(shutter, 'up', '');assert.deepEqual(moves, ['up']);
  const eventCount = shutterEvents.length;
  assert.equal(await handleShutterControl(shutter, 'tiltStop', ''), true);
  await handleShutterControl(shutter, 'positionSlider', 'NaN');
  assert.equal(shutterEvents.length, eventCount);
  shutter.move = async () => { throw failure; };
  await assert.rejects(handleShutterControl(shutter, 'down', ''), error => error === failure);
  assert.equal(shutterEvents.length, eventCount);
  shutter.slot = { binding: { source: 'flow' } };
  shutter.supportsAction = () => true;
  await handleShutterControl(shutter, 'tiltStop', '');
  assert.equal(shutterEvents.at(-1)!.action_type, 'tilt_stop');
  const fanEvents: FanAction[] = [];
  const fan: ControlContext<FanState, FanAction> = {
    entity: 'ventilation', states: new Map(),
    slot: { binding: { source: 'homey', deviceId: 'fan', capabilityId: 'dim' } },
    supports: () => true,
    set: async (...args) => { writes.push(args); },
    emit: event => { fanEvents.push(event); },
    render: () => { renders++; },
  };
  writes.length = 0;
  assert.equal(await handleFanControl(fan, 'bExit', ''), false);
  await handleFanControl(fan, 'number-set', '3');
  assert.deepEqual(writes, [['fan', 'dim', 0.75]]);
  assert.equal(fan.slot!.value, '3 / 4');assert.equal(fanEvents[0].action_type, 'speed');
  writes.length = 0;
  await handleFanControl(fan, 'mode-preset_modes', '2');
  assert.equal(fanEvents.at(-1)!.mode, 'Tehostus');assert.equal(writes.length, 0, 'Fan presets remain Flow actions');
  await handleFanControl(fan, 'OnOff', '0');assert.deepEqual(writes, [['fan', 'onoff', false]]);
  const fanCount = fanEvents.length;
  fan.supports = () => false;
  await handleFanControl(fan, 'number-set', '2');assert.equal(fanEvents.length, fanCount);
  fan.supports = () => true;
  await handleFanControl(fan, 'number-set', 'NaN');assert.equal(fanEvents.length, fanCount);
  fan.set = async () => { throw failure; };
  await assert.rejects(handleFanControl(fan, 'number-set', '1'), error => error === failure);
  assert.equal(fanEvents.length, fanCount);

  const selectEvents: SelectAction[] = [];
  const select: SelectControlContext = {
    entity: 'mode', states: new Map(),
    slot: { binding: { source: 'homey', deviceId: 'mode-device', capabilityId: 'custom_mode' } },
    options: [{ id: 'HomeMode', label: 'Kotona' }, { id: 'AwayMode', label: 'Poissa' }],
    supports: () => true,
    set: async (...args) => { writes.push(args); },
    emit: event => { selectEvents.push(event); },
    render: () => { renders++; },
  };
  writes.length = 0;
  assert.equal(await handleSelectControl(select, 'bNext', ''), false);
  await handleSelectControl(select, 'mode-input_sel', '1');
  assert.deepEqual(writes, [['mode-device', 'custom_mode', 'AwayMode']]);
  assert.equal(selectEvents[0].option, 'AwayMode', 'Flow receives the original Homey ID, not its display label');
  for (const invalid of ['', '-1', '2', '1.5', '1x']) await handleSelectControl(select, 'mode-input_sel', invalid);
  assert.equal(writes.length, 1);assert.equal(selectEvents.length, 1);
  select.options = [];
  await handleSelectControl(select, 'mode-input_sel', '0');assert.equal(writes.length, 1);
  select.options = [{ id: 'HomeMode', label: 'Kotona' }];
  select.set = async () => { throw failure; };
  await assert.rejects(handleSelectControl(select, 'mode-input_sel', '0'), error => error === failure);
  assert.equal(selectEvents.length, 1);
  select.options = undefined;select.slot = { binding: { source: 'flow' } };
  select.states.set('mode', { title: 'Tila', currentMode: 'Koti', modes: 'Koti,Loma' });
  await handleSelectControl(select, 'mode-input_sel', '1');assert.equal(selectEvents.at(-1)!.option, 'Loma');
  await handleSelectControl(select, 'mode-input_sel', 'Oma tila');assert.equal(selectEvents.at(-1)!.option, 'Oma tila');

  const thermoEvents: ThermoModeAction[] = [];
  const thermo: ThermoControlContext = {
    entity: 'climate', states: new Map(),
    binding: { source: 'homey', deviceId: 'climate-device', capabilityId: 'target_temperature' },
    modeCapability: { setable: true, options: [{ id: 'HeatMode', label: 'Lämmitys' }, { id: 'OffMode', label: 'Pois' }] },
    set: async (...args) => { writes.push(args); },
    emit: event => { thermoEvents.push(event); },
    render: () => { renders++; },
  };
  writes.length = 0;
  assert.equal(await handleThermoControl(thermo, 'bExit', ''), false);
  await handleThermoControl(thermo, 'mode-operation_mode', '1');
  assert.deepEqual(writes, [['climate-device', 'thermostat_mode', 'OffMode']]);
  assert.equal(thermoEvents[0].mode, 'OffMode');assert.equal(thermoEvents[0].row, 1);
  for (const invalid of ['', '-1', '2', '1.5', '1x']) await handleThermoControl(thermo, 'mode-operation_mode', invalid);
  assert.equal(thermoEvents.length, 1);assert.equal(thermo.states.get('climate')!.currentMode1, 'OffMode');
  await handleThermoControl(thermo, 'mode-preset_mode', '1');
  await handleThermoControl(thermo, 'mode-fan_mode', '2');
  assert.equal(writes.length, 1, 'Secondary rows must not write thermostat_mode');
  assert.equal(thermoEvents[1].row, 2);assert.equal(thermoEvents[2].row, 3);
  thermo.modeCapability!.setable = false;
  await handleThermoControl(thermo, 'mode-operation_mode', '0');assert.equal(thermoEvents.length, 3);
  thermo.modeCapability!.setable = true;
  thermo.set = async () => { throw failure; };
  await assert.rejects(handleThermoControl(thermo, 'mode-operation_mode', '0'), error => error === failure);
  assert.equal(thermoEvents.length, 3);
  thermo.binding = { source: 'flow' };thermo.modeCapability = undefined;
  await handleThermoControl(thermo, 'mode-operation_mode', 'Oma tila');assert.equal(thermoEvents.at(-1)!.mode, 'Oma tila');

  const mediaEvents: Array<{action:string;value:number}> = [];
  const media: MediaControlContext = {
    binding: { source:'homey', deviceId:'speaker', capabilityId:'speaker_playing' },
    set: async (...args) => { writes.push(args); },
    emit: event => { mediaEvents.push(event); },
  };
  writes.length = 0;
  assert.equal(await handleMediaControl(media,'bExit',''),false);
  for (const invalid of ['', 'NaN', 'Infinity', '50x']) await handleMediaControl(media,'volumeSlider',invalid);
  assert.equal(writes.length,0);assert.equal(mediaEvents.length,0);
  await handleMediaControl(media,'volumeSlider','65');
  await handleMediaControl(media,'media-volume','30');
  await handleMediaControl(media,'volumeSlider','0');
  assert.deepEqual(writes,[['speaker','volume_set',0.65],['speaker','volume_set',0.3],['speaker','volume_set',0]]);
  await handleMediaControl(media,'volumeSlider','150');assert.equal(mediaEvents.at(-1)!.value,100);
  for (const action of ['play','pause','next','prev','back']) await handleMediaControl(media,'media-'+action,'');
  assert.deepEqual(writes.slice(-5),[['speaker','speaker_playing',true],['speaker','speaker_playing',false],['speaker','speaker_next',true],['speaker','speaker_prev',true],['speaker','speaker_prev',true]]);
  const mediaWrites=writes.length;
  await handleMediaControl(media,'media-constructor','');assert.equal(writes.length,mediaWrites);
  const mediaCount=mediaEvents.length;
  media.set=async()=>{throw failure;};
  await assert.rejects(handleMediaControl(media,'media-play',''),error=>error===failure);
  assert.equal(mediaEvents.length,mediaCount);
  media.binding={source:'flow'};
  await handleMediaControl(media,'media-shuffle','');assert.equal(mediaEvents.at(-1)!.action,'shuffle');

  console.log('Control modules: lights, shutters, fans, selectors, navigation, Homey IDs, Flow and failure propagation passed');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
