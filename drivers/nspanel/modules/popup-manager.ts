import type NSPanelDevice from '../device';
import { Page } from '../../../lib/page';
import { Color } from '../../../lib/color';
import { Icon } from '../../../lib/icon';
import { Binding } from '../../../lib/bindings';
import { applyHomeyPopupValues, filterPopupFlowValues, PopupKind, PopupStates } from '../../../lib/panel/value-sources';
import { createFanState, createSelectState, createLightState, createShutterState, createThermoState } from '../../../lib/panel/state-defaults';
import { createTimerState, TimerController } from '../../../lib/panel/timer-control';
import type { LightState, TimerState, ShutterState, ThermoState, FanState, SelectState } from '../../../lib/panel/models';
import { handleFanControl } from '../../../lib/panel/fan-control';
import { handleThermoControl } from '../../../lib/panel/thermo-control';
import { handleSelectControl } from '../../../lib/panel/select-control';

export class PopupManager {
  private device: NSPanelDevice;
  public timerController: TimerController;

  constructor(device: NSPanelDevice) {
    this.device = device;
    this.timerController = new TimerController({
      states: (device as any).timerStates,
      now: () => Date.now(),
      ensureTicking: () => (device as any).ensureTimerTicking?.(),
      stopTicking: () => (device as any).stopTimerTicking?.(),
      emit: tokens => { (device as any).timerActionTrigger?.trigger(device, tokens, {}).catch((device as any).error); },
      finished: ({ entity, label }) => {
        (device as any).playBuzzer(5, 2, 2);
        (device as any).timerFinishedTrigger?.trigger(device, { entity, label }, {}).catch((device as any).error);
      },
      update: (entity, state, text) => this.updateTimerSlotDisplay(entity, state, text),
    });
  }

  private dev(): any {
    return this.device as any;
  }

  public popupBinding(entityId: string, kind: PopupKind): Binding | undefined {
    const dev = this.dev();
    const page = dev.pages[dev.currentPageId || 'active'];
    const slot = Object.values(page?.slots || {}).find((s: any) => s && [s.id, s.name, s.target].includes(entityId)) as any;
    let binding = slot?.binding;
    if (kind === 'thermo' && page?.type === Page.Type.thermostat) {
      const raw = typeof page?.rawOptions === 'string' ? (() => { try { return JSON.parse(page.rawOptions); } catch { return {}; } })() : page?.rawOptions;
      binding = binding || raw?.binding;
    }
    return binding;
  }

  public flowPopupState(entityId: string, popupKind: PopupKind, customState?: any): any {
    if (!customState) return customState;
    const dev = this.dev();
    const binding = this.popupBinding(entityId, popupKind);
    return filterPopupFlowValues(
      popupKind,
      customState,
      binding?.source === 'homey',
      binding?.source === 'homey' && popupKind === 'thermo' && !!dev.bindingService().capability?.(binding, 'thermostat_mode')
    );
  }

  public applyPopupSource<K extends PopupKind>(kind: K, state: PopupStates[K], binding?: Binding): void {
    const dev = this.dev();
    applyHomeyPopupValues(kind, state, {
      bound: binding?.source === 'homey' && !!binding.deviceId,
      capabilityId: binding?.capabilityId,
      read: capabilityId => dev.bindingService().value({ source: 'homey', deviceId: binding?.deviceId, capabilityId }),
    });
  }

  public enumOptions(binding: Binding, capabilityId: string): { id: string; label: string }[] {
    const dev = this.dev();
    const capability = dev.bindingService().capability?.(binding, capabilityId);
    const language = dev.homey.i18n?.getLanguage?.() || 'en';
    return (Array.isArray(capability?.values) ? capability.values : []).flatMap((value: any) => {
      const id = typeof value === 'string' ? value : value?.id;
      if (typeof id !== 'string') return [];
      const title = value?.title;
      const label = typeof title === 'string' ? title : (title?.[language] || title?.en || id);
      return [{ id, label: String(label).replace(/[~?\r\n]/g, ' ') }];
    });
  }

  public thermoBinding(entityId: string): Binding | undefined {
    const dev = this.dev();
    const slot = dev.slotBinding(entityId);
    if (slot) return slot;
    const page = dev.pages[dev.currentPageId || 'active'];
    let raw: any = page?.rawOptions;
    if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch { return undefined; } }
    return raw?.binding?.source === 'homey' ? raw.binding : undefined;
  }

  public selectOptions(entityId: string): { id: string; label: string }[] | undefined {
    const dev = this.dev();
    const binding = dev.slotBinding(entityId);
    if (!binding) return undefined;
    return this.enumOptions(binding, binding.capabilityId || 'homealarm_state');
  }

  public generateFanPopup(options: Page.FanPopupOptions): string {
    const dev = this.dev();
    return Page.GenerateFanPopup({ ...options, speed: dev.slotSupports(options.entityId, 'dim') ? options.speed : 'disable' });
  }

  public generateSelectPopup(options: Page.InputSelectPopupOptions): string {
    const values = this.selectOptions(options.entityId);
    if (values) {
      options = {
        ...options,
        modes: values.map(value => value.label),
        currentMode: values.find(value => value.id === options.currentMode)?.label || options.currentMode
      };
    }
    return Page.GenerateInputSelectPopup(options);
  }

  public shutterSupports(entityId: string, action: string): boolean {
    const dev = this.dev();
    const binding = dev.slotBinding(entityId);
    if (!binding || binding.source !== 'homey') return true;
    if (action === 'up' || action === 'down') return dev.slotSupports(entityId, 'windowcoverings_state') || dev.slotSupports(entityId, 'windowcoverings_set');
    if (action === 'stop') return dev.slotSupports(entityId, 'windowcoverings_state');
    if (action === 'positionSlider') return dev.slotSupports(entityId, 'windowcoverings_set');
    if (['tiltSlider', 'tiltOpen', 'tiltClose'].includes(action)) return dev.slotSupports(entityId, 'windowcoverings_tilt_set');
    return action !== 'tiltStop';
  }

  public async moveShutter(entityId: string, action: 'up' | 'down'): Promise<void> {
    const dev = this.dev();
    const binding = dev.slotBinding(entityId);
    if (!binding) return;
    if (dev.slotSupports(entityId, 'windowcoverings_state')) await dev.setBoundValue(binding.deviceId!, 'windowcoverings_state', action);
    else if (dev.slotSupports(entityId, 'windowcoverings_set')) await dev.setBoundValue(binding.deviceId!, 'windowcoverings_set', action === 'up' ? 1 : 0);
  }

  public presentDetailPopup(screen: string, entityId: string, sendPageCmd: boolean, updateFn: () => void): void {
    const dev = this.dev();
    if (dev.screensaverActive) {
      dev.screensaverActive = false;
      dev.updateBrightness();
    }
    dev.currentHmiScreen = screen;
    if (dev.popupPresenter) {
      dev.popupPresenter.show(screen as any, entityId, sendPageCmd, updateFn);
    } else {
      if (sendPageCmd) {
        dev.sendCmnd('CustomSend', `page ${screen}`);
      }
      updateFn();
      dev.updateSleepTimer();
    }
  }

  public clearPopupEntities(): void {
    const dev = this.dev();
    if (dev.popupPresenter) {
      dev.popupPresenter.invalidate();
    }
    dev.activeLightEntity = undefined;
    dev.activeShutterEntity = undefined;
    dev.activeFanEntity = undefined;
    dev.activeSelectEntity = undefined;
    dev.activeTimerEntity = undefined;
    dev.activeThermoEntity = undefined;
  }

  // --- Light Popup ---
  public async openLightPopup(entityId: string = 'light', customState?: any, sendPageCmd: boolean = true): Promise<void> {
    const dev = this.dev();
    customState = this.flowPopupState(entityId, 'light', customState);
    dev.clearPopupEntities();
    dev.activeLightEntity = entityId;
    dev.popupActive = true;

    const curPage = dev.pages[dev.currentPageId || 'active'] || dev.pages['active'];
    let matchedSlot: any = undefined;
    if (curPage?.slots) {
      matchedSlot = Object.values(curPage.slots).find((s: any) => s && (s.id === entityId || s.name === entityId || s.target === entityId));
    }

    let state = dev.lightStates.get(entityId) || createLightState({
      onoff: matchedSlot ? (matchedSlot.val === '1' || matchedSlot.value === '1') : false,
      color: matchedSlot?.color || 'yellow',
      hue: undefined as number | undefined,
      saturation: undefined as number | undefined,
    });

    if (customState) {
      if (customState.onoff !== undefined) {
        if (customState.onoff === 'on' || customState.onoff === true) state.onoff = true;
        else if (customState.onoff === 'off' || customState.onoff === false) state.onoff = false;
      }
      if (customState.brightness !== undefined && customState.brightness !== null && customState.brightness !== '') {
        const b = Number(customState.brightness);
        if (!isNaN(b)) state.brightness = Math.max(0, Math.min(100, b));
      }
      if (customState.color_temp !== undefined || customState.colorTemp !== undefined) {
        const ct = Number(customState.color_temp ?? customState.colorTemp);
        if (!isNaN(ct)) state.colorTemp = Math.max(0, Math.min(100, ct));
      }
      if (customState.color) state.color = customState.color;
      if (customState.hue !== undefined) state.hue = Number(customState.hue);
      if (customState.saturation !== undefined) state.saturation = Number(customState.saturation);
    }

    this.applyPopupSource('light', state, matchedSlot?.binding);
    dev.lightStates.set(entityId, state);

    dev.presentDetailPopup('popupLight', entityId, sendPageCmd, () => this.sendLightUpdate(entityId));
  }

  public sendLightUpdate(entityId: string): void {
    const dev = this.dev();
    const state = dev.lightStates.get(entityId);
    if (!state) return;

    let iconColor: string | number = state.color || 'yellow';
    if (state.onoff) {
      const binding = dev.slotBinding(entityId);
      const useColour = !binding || dev.bindingService().value({ ...binding, capabilityId: 'light_mode' }) !== 'temperature';
      if (useColour && state.hue !== undefined && state.saturation !== undefined) {
        iconColor = Color.hsv_to_565(state.hue, state.saturation, 1.0);
      } else if (typeof state.colorTemp === 'number') {
        iconColor = Color.kelvin_fraction_to_565(state.colorTemp / 100);
      }
    } else {
      iconColor = 'gray';
    }

    const cmd = Page.GenerateLightPopup({
      entityId,
      iconColor,
      buttonState: state.onoff,
      brightness: dev.slotSupports(entityId, 'dim') ? state.brightness : 'disable',
      colorTemp: dev.slotSupports(entityId, 'light_temperature') ? state.colorTemp : 'disable',
      colorMode: dev.slotSupports(entityId, 'light_hue') && dev.slotSupports(entityId, 'light_saturation') && state.colorMode !== false,
      colorTranslation: 'Väri',
      colorTempTranslation: 'Lämpötila',
      brightnessTranslation: 'Kirkkaus'
    });
    dev.sendCmnd('CustomSend', cmd);
  }

  public async setLightState(entityId: string, customState: any): Promise<void> {
    const dev = this.dev();
    customState = this.flowPopupState(entityId, 'light', customState);
    let state = dev.lightStates.get(entityId) || createLightState({
      hue: undefined as number | undefined,
      saturation: undefined as number | undefined,
    });

    if (customState.onoff !== undefined) {
      if (customState.onoff === 'on' || customState.onoff === true) state.onoff = true;
      else if (customState.onoff === 'off' || customState.onoff === false) state.onoff = false;
    }
    if (customState.brightness !== undefined && customState.brightness !== null && customState.brightness !== '') {
      const b = Number(customState.brightness);
      if (!isNaN(b)) state.brightness = Math.max(0, Math.min(100, b));
    }
    if (customState.color_temp !== undefined || customState.colorTemp !== undefined) {
      const ct = Number(customState.color_temp ?? customState.colorTemp);
      if (!isNaN(ct)) state.colorTemp = Math.max(0, Math.min(100, ct));
    }
    if (customState.color) state.color = customState.color;
    if (customState.hue !== undefined) state.hue = Number(customState.hue);
    if (customState.saturation !== undefined) state.saturation = Number(customState.saturation);

    this.applyPopupSource('light', state, dev.popupBinding(entityId, 'light'));
    dev.lightStates.set(entityId, state);

    const curPage = dev.pages[dev.currentPageId || 'active'] || dev.pages['active'];
    if (curPage?.slots) {
      const matchedSlot = Object.values(curPage.slots).find((s: any) => s && (s.id === entityId || s.name === entityId || s.target === entityId)) as any;
      if (matchedSlot) {
        matchedSlot.val = state.onoff ? '1' : '0';
        matchedSlot.value = `${state.brightness} %`;
      }
    }

    if (dev.popupActive && dev.activeLightEntity === entityId) {
      this.sendLightUpdate(entityId);
    }
  }

  // --- Shutter Popup ---
  public async openShutterPopup(entityId: string = 'shutter', customState?: any, sendPageCmd: boolean = true): Promise<void> {
    const dev = this.dev();
    customState = this.flowPopupState(entityId, 'shutter', customState);
    dev.clearPopupEntities();
    dev.activeShutterEntity = entityId;
    dev.popupActive = true;

    const curPage = dev.pages[dev.currentPageId || 'active'] || dev.pages['active'];
    let matchedSlot: any = undefined;
    if (curPage?.slots) {
      matchedSlot = Object.values(curPage.slots).find((s: any) => s && (s.id === entityId || s.name === entityId || s.target === entityId));
    }

    let state = dev.shutterStates.get(entityId) || createShutterState({
      position: matchedSlot?.val !== undefined && !isNaN(Number(matchedSlot.val)) ? Number(matchedSlot.val) : 50,
      color: matchedSlot?.color || 'white',
      label: matchedSlot?.title || matchedSlot?.name || 'Verho',
    });

    if (customState) {
      if (customState.position !== undefined && customState.position !== null && customState.position !== '') {
        const p = Number(customState.position);
        if (!isNaN(p)) state.position = Math.max(0, Math.min(100, p));
      }
      if (customState.tilt !== undefined && customState.tilt !== null && customState.tilt !== '') {
        const t = Number(customState.tilt);
        if (!isNaN(t)) state.tilt = Math.max(0, Math.min(100, t));
      }
      if (customState.hasTilt !== undefined) {
        state.hasTilt = Boolean(customState.hasTilt);
      }
      if (customState.color) state.color = customState.color;
      if (customState.label) state.label = String(customState.label).trim();
    }

    this.applyPopupSource('shutter', state, matchedSlot?.binding);
    dev.shutterStates.set(entityId, state);

    dev.presentDetailPopup('popupShutter', entityId, sendPageCmd, () => this.sendShutterUpdate(entityId));
  }

  public sendShutterUpdate(entityId: string): void {
    const dev = this.dev();
    const state = dev.shutterStates.get(entityId);
    if (!state) return;

    const hasTilt = state.hasTilt && dev.slotSupports(entityId, 'windowcoverings_tilt_set');
    const cmd = Page.GenerateShutterPopup({
      entityId,
      pos: dev.slotSupports(entityId, 'windowcoverings_set') ? state.position : 'disable',
      infoText: dev.slotSupports(entityId, 'windowcoverings_set') ? `${state.position} %` : '',
      statusUp: this.shutterSupports(entityId, 'up'),
      statusStop: this.shutterSupports(entityId, 'stop'),
      statusDown: this.shutterSupports(entityId, 'down'),
      posHeading: 'Asento',
      icon: 'window-shutter',
      tiltHeading: 'Säleet',
      tilt: hasTilt ? state.tilt : 'disable',
      statusTiltLeft: hasTilt ? 'enable' : '',
      statusTiltStop: hasTilt ? (this.shutterSupports(entityId, 'tiltStop') ? 'enable' : 'disable') : '',
      statusTiltRight: hasTilt ? 'enable' : ''
    });
    dev.sendCmnd('CustomSend', cmd);
  }

  public async setShutterState(entityId: string, customState: any): Promise<void> {
    const dev = this.dev();
    customState = this.flowPopupState(entityId, 'shutter', customState);
    let state = dev.shutterStates.get(entityId) || createShutterState({ label: 'Verho' });

    if (customState.position !== undefined && customState.position !== null && customState.position !== '') {
      const p = Number(customState.position);
      if (!isNaN(p)) state.position = Math.max(0, Math.min(100, p));
    }
    if (customState.tilt !== undefined && customState.tilt !== null && customState.tilt !== '') {
      const t = Number(customState.tilt);
      if (!isNaN(t)) state.tilt = Math.max(0, Math.min(100, t));
    }
    if (customState.hasTilt !== undefined) {
      state.hasTilt = Boolean(customState.hasTilt);
    }
    if (customState.color) state.color = customState.color;
    if (customState.label) state.label = String(customState.label).trim();

    this.applyPopupSource('shutter', state, dev.popupBinding(entityId, 'shutter'));
    dev.shutterStates.set(entityId, state);

    const curPage = dev.pages[dev.currentPageId || 'active'] || dev.pages['active'];
    if (curPage?.slots) {
      const matchedSlot = Object.values(curPage.slots).find((s: any) => s && (s.id === entityId || s.name === entityId || s.target === entityId)) as any;
      if (matchedSlot) {
        matchedSlot.value = `${state.position} %`;
        matchedSlot.val = String(state.position);
      }
    }

    if (dev.popupActive && dev.activeShutterEntity === entityId) {
      this.sendShutterUpdate(entityId);
    }
  }

  // --- Fan Popup ---
  public async openFanPopup(entityId: string = 'fan', customState?: any, sendPageCmd: boolean = true): Promise<void> {
    const dev = this.dev();
    customState = this.flowPopupState(entityId, 'fan', customState);
    dev.clearPopupEntities();
    dev.activeSelectEntity = undefined;
    dev.activeTimerEntity = undefined;
    dev.activeFanEntity = entityId;
    dev.popupActive = true;

    const curPage = dev.pages[dev.currentPageId || 'active'] || dev.pages['active'];
    let matchedSlot: any = undefined;
    if (curPage?.slots) {
      matchedSlot = Object.values(curPage.slots).find((s: any) => s && (s.id === entityId || s.name === entityId || s.target === entityId));
    }

    const state: FanState = dev.fanStates.get(entityId) || createFanState({
      onoff: (matchedSlot?.val ?? matchedSlot?.value) !== '0',
      color: matchedSlot?.color || 'white',
    });

    if (customState) {
      if (customState.onoff !== undefined) state.onoff = Boolean(customState.onoff);
      if (customState.speed !== undefined && customState.speed !== null && customState.speed !== '') {
        const num = Number(customState.speed);
        if (!isNaN(num)) state.speed = num;
      }
      if (customState.maxSpeed !== undefined && customState.maxSpeed !== null && customState.maxSpeed !== '') {
        const maxNum = Number(customState.maxSpeed);
        if (!isNaN(maxNum)) state.maxSpeed = maxNum;
      }
      if (customState.label) state.label = String(customState.label).trim();
      if (customState.mode !== undefined && customState.mode !== null && customState.mode !== '') {
        state.currentMode = String(customState.mode).trim();
      }
      if (customState.modes !== undefined && customState.modes !== null && customState.modes !== '') {
        state.modes = String(customState.modes).trim();
      }
      if (customState.color) state.color = customState.color;
    }

    this.applyPopupSource<'fan'>('fan', state, matchedSlot?.binding);
    dev.fanStates.set(entityId, state);

    dev.presentDetailPopup('popupFan', entityId, sendPageCmd, () => this.sendFanUpdate(entityId));
  }

  public sendFanUpdate(entityId: string): void {
    const dev = this.dev();
    const state = dev.fanStates.get(entityId);
    if (!state) return;

    dev.sendCmnd('CustomSend', this.generateFanPopup({
      entityId, iconColor: state.color || 'white', buttonState: state.onoff,
      speed: state.speed, maxSpeed: state.maxSpeed, label: state.label || 'Teho',
      currentMode: state.currentMode, modes: state.modes,
    }));
  }

  public async setFanState(entityId: string, customState: any): Promise<void> {
    const dev = this.dev();
    customState = this.flowPopupState(entityId, 'fan', customState);
    const state = dev.fanStates.get(entityId) || createFanState();

    if (customState.onoff !== undefined) state.onoff = Boolean(customState.onoff);
    if (customState.speed !== undefined && customState.speed !== null && customState.speed !== '') {
      const num = Number(customState.speed);
      if (!isNaN(num)) state.speed = num;
    }
    if (customState.maxSpeed !== undefined && customState.maxSpeed !== null && customState.maxSpeed !== '') {
      const maxNum = Number(customState.maxSpeed);
      if (!isNaN(maxNum)) state.maxSpeed = maxNum;
    }
    if (customState.label) state.label = String(customState.label).trim();
    if (customState.mode !== undefined && customState.mode !== null && customState.mode !== '') {
      state.currentMode = String(customState.mode).trim();
    }
    if (customState.modes !== undefined && customState.modes !== null && customState.modes !== '') {
      state.modes = String(customState.modes).trim();
    }
    if (customState.color) state.color = customState.color;

    this.applyPopupSource('fan', state, dev.popupBinding(entityId, 'fan'));
    dev.fanStates.set(entityId, state);

    if (dev.popupActive && dev.activeFanEntity === entityId) {
      this.sendFanUpdate(entityId);
    }
  }

  // --- Select Popup ---
  public async openSelectPopup(entityId: string = 'select', customState?: any, sendPageCmd: boolean = true): Promise<void> {
    const dev = this.dev();
    dev.clearPopupEntities();
    customState = this.flowPopupState(entityId, 'select', customState);
    dev.activeFanEntity = undefined;
    dev.activeTimerEntity = undefined;
    dev.activeSelectEntity = entityId;
    dev.popupActive = true;

    const curPage = dev.pages[dev.currentPageId || 'active'] || dev.pages['active'];
    let matchedSlot: any = undefined;
    if (curPage?.slots) {
      matchedSlot = Object.values(curPage.slots).find((s: any) => s && (s.id === entityId || s.name === entityId || s.target === entityId));
    }

    const state: SelectState = dev.selectStates.get(entityId) || createSelectState({
      title: matchedSlot?.title || matchedSlot?.name || 'Tila',
      currentMode: matchedSlot?.value || matchedSlot?.val || '',
      modes: matchedSlot?.modes || 'Kotona?Poissa?Nukkumassa?Loma',
      color: matchedSlot?.color || 'white',
    });

    if (customState) {
      if (customState.title) state.title = String(customState.title).trim();
      if (customState.current !== undefined && customState.current !== null && customState.current !== '') {
        state.currentMode = String(customState.current).trim();
      }
      if (customState.mode !== undefined && customState.mode !== null && customState.mode !== '') {
        state.currentMode = String(customState.mode).trim();
      }
      if (customState.options !== undefined && customState.options !== null && customState.options !== '') {
        state.modes = String(customState.options).trim();
      }
      if (customState.modes !== undefined && customState.modes !== null && customState.modes !== '') {
        state.modes = String(customState.modes).trim();
      }
      if (customState.color) state.color = customState.color;
    }

    this.applyPopupSource<'select'>('select', state, matchedSlot?.binding);
    dev.selectStates.set(entityId, state);

    dev.presentDetailPopup('popupInSel', entityId, sendPageCmd, () => this.sendSelectUpdate(entityId));
  }

  public sendSelectUpdate(entityId: string): void {
    const dev = this.dev();
    const state = dev.selectStates.get(entityId);
    if (!state) return;

    dev.sendCmnd('CustomSend', this.generateSelectPopup({
      entityId,
      iconColor: state.color || 'white',
      title: state.title || 'Valinta',
      currentMode: state.currentMode,
      modes: state.modes
    }));
  }

  public async setSelectState(entityId: string, customState: any): Promise<void> {
    const dev = this.dev();
    customState = this.flowPopupState(entityId, 'select', customState);
    const state = dev.selectStates.get(entityId) || createSelectState();

    if (customState.title) state.title = String(customState.title).trim();
    if (customState.current !== undefined && customState.current !== null && customState.current !== '') {
      state.currentMode = String(customState.current).trim();
    }
    if (customState.mode !== undefined && customState.mode !== null && customState.mode !== '') {
      state.currentMode = String(customState.mode).trim();
    }
    if (customState.options !== undefined && customState.options !== null && customState.options !== '') {
      state.modes = String(customState.options).trim();
    }
    if (customState.modes !== undefined && customState.modes !== null && customState.modes !== '') {
      state.modes = String(customState.modes).trim();
    }
    if (customState.color) state.color = customState.color;

    this.applyPopupSource('select', state, dev.popupBinding(entityId, 'select'));
    dev.selectStates.set(entityId, state);

    if (dev.popupActive && dev.activeSelectEntity === entityId) {
      this.sendSelectUpdate(entityId);
    }
  }

  // --- Timer Popup ---
  public async openTimerPopup(entityId: string = 'timer', customState?: any, sendPageCmd: boolean = true): Promise<void> {
    const dev = this.dev();
    dev.clearPopupEntities();
    dev.activeFanEntity = undefined;
    dev.activeSelectEntity = undefined;
    dev.activeTimerEntity = entityId;
    dev.popupActive = true;

    const curPage = dev.pages[dev.currentPageId || 'active'] || dev.pages['active'];
    let matchedSlot: any = undefined;
    if (curPage?.slots) {
      matchedSlot = Object.values(curPage.slots).find((s: any) => s && (s.id === entityId || s.name === entityId || s.target === entityId));
    }

    let state = dev.timerStates.get(entityId);
    if (!state) {
      state = createTimerState(matchedSlot);
    }

    if (customState) {
      if (customState.minutes !== undefined && customState.minutes !== null && customState.minutes !== '') {
        const m = Number(customState.minutes);
        if (!isNaN(m)) {
          state.minutes = Math.max(0, Math.min(59, m));
          state.initialMinutes = state.minutes;
        }
      }
      if (customState.seconds !== undefined && customState.seconds !== null && customState.seconds !== '') {
        const s = Number(customState.seconds);
        if (!isNaN(s)) {
          state.seconds = Math.max(0, Math.min(59, s));
          state.initialSeconds = state.seconds;
        }
      }
      if (customState.color) state.color = customState.color;
      if (customState.label || customState.title) state.label = String(customState.label || customState.title).trim();
    }

    dev.timerStates.set(entityId, state);

    dev.presentDetailPopup('popupTimer', entityId, sendPageCmd, () => this.sendTimerUpdate(entityId));
  }

  public sendTimerUpdate(entityId: string): void {
    const dev = this.dev();
    const state = dev.timerStates.get(entityId);
    if (!state) return;

    let action1 = '';
    let label1 = '';
    let action2 = '';
    let label2 = '';
    let action3 = '';
    let label3 = '';
    let editable = 1;

    if (state.status === 'idle') {
      editable = 1;
      action1 = '';
      label1 = '';
      action2 = 'start';
      label2 = 'START';
      action3 = '';
      label3 = '';
    } else if (state.status === 'running') {
      editable = 0;
      action1 = 'pause';
      label1 = 'PAUSE';
      action2 = 'cancel';
      label2 = 'CANCEL';
      action3 = 'finish';
      label3 = 'STOP';
    } else if (state.status === 'paused') {
      editable = 1;
      action1 = 'start';
      label1 = 'START';
      action2 = 'cancel';
      label2 = 'CANCEL';
      action3 = '';
      label3 = '';
    }

    const cmd = Page.GenerateTimerPopup({
      entityId,
      iconColor: state.color || 'white',
      minutes: state.minutes,
      seconds: state.seconds,
      editable,
      action1,
      action2,
      action3,
      label1,
      label2,
      label3
    });
    dev.sendCmnd('CustomSend', cmd);
  }

  public async controlTimer(entityId: string, action: string, minutes?: number | string, seconds?: number | string): Promise<void> {
    const dev = this.dev();
    await dev.timerController.control(entityId, action, minutes, seconds);
  }

  public updateTimerSlotDisplay(entityId: string, state: TimerState, customText?: string): void {
    const dev = this.dev();
    let visibleChanged = false;
    for (const [pageId, page] of Object.entries(dev.pages as Record<string, any>)) {
      for (const slot of Object.values(page.slots || {}) as any[]) {
        if (slot && (slot.id === entityId || slot.name === entityId || slot.target === entityId)) {
          const text = customText || `${String(state.minutes).padStart(2, '0')}:${String(state.seconds).padStart(2, '0')}`;
          visibleChanged ||= pageId === dev.currentPageId && slot.val !== text;
          slot.value = text; slot.val = text;
        }
      }
    }
    if (visibleChanged && !dev.popupActive && !dev.screensaverActive) dev.scheduleBindingRender();
  }

  // --- Thermo Popup ---
  public async openThermoPopup(entityId: string = 'thermo', customState?: any, sendPageCmd: boolean = true): Promise<void> {
    const dev = this.dev();
    customState = this.flowPopupState(entityId, 'thermo', customState);
    dev.clearPopupEntities();
    dev.activeThermoEntity = entityId;
    dev.popupActive = true;

    const curPage = dev.pages[dev.currentPageId || 'active'] || dev.pages['active'];
    let matchedSlot: any = undefined;
    if (curPage?.slots) {
      matchedSlot = Object.values(curPage.slots).find((s: any) => s && (s.id === entityId || s.name === entityId || s.target === entityId));
    }

    const rawObj = (typeof curPage?.rawOptions === 'object' && curPage.rawOptions !== null)
      ? curPage.rawOptions
      : (() => { try { return JSON.parse(curPage?.rawOptions as string || '{}'); } catch { return {}; } })();

    let state = dev.thermoStates.get(entityId);
    if (!state) {
      state = createThermoState();
      state.title = curPage?.title || state.title;
      const fields = [
        'heading1', 'type1', 'currentMode1', 'modeList1',
        'heading2', 'type2', 'currentMode2', 'modeList2',
        'heading3', 'type3', 'currentMode3', 'modeList3',
      ] as const;
      for (const key of fields) if (rawObj?.[key]) state[key] = rawObj[key];
    }

    if (customState) {
      if (customState.heading1) state.heading1 = String(customState.heading1).trim();
      if (customState.type1) state.type1 = String(customState.type1).trim();
      if (customState.mode1 !== undefined && customState.mode1 !== null && customState.mode1 !== '') {
        state.currentMode1 = String(customState.mode1).trim();
      }
      if (customState.modes1 !== undefined && customState.modes1 !== null && customState.modes1 !== '') {
        state.modeList1 = String(customState.modes1).trim();
      }

      if (customState.heading2) state.heading2 = String(customState.heading2).trim();
      if (customState.type2) state.type2 = String(customState.type2).trim();
      if (customState.mode2 !== undefined && customState.mode2 !== null && customState.mode2 !== '') {
        state.currentMode2 = String(customState.mode2).trim();
      }
      if (customState.modes2 !== undefined && customState.modes2 !== null && customState.modes2 !== '') {
        state.modeList2 = String(customState.modes2).trim();
      }

      if (customState.heading3) state.heading3 = String(customState.heading3).trim();
      if (customState.type3) state.type3 = String(customState.type3).trim();
      if (customState.mode3 !== undefined && customState.mode3 !== null && customState.mode3 !== '') {
        state.currentMode3 = String(customState.mode3).trim();
      }
      if (customState.modes3 !== undefined && customState.modes3 !== null && customState.modes3 !== '') {
        state.modeList3 = String(customState.modes3).trim();
      }

      if (customState.icon) state.icon = customState.icon;
      if (customState.color) state.color = customState.color;
    }

    const binding = matchedSlot?.binding || rawObj?.binding;
    this.applyPopupSource('thermo', state, binding);

    dev.thermoStates.set(entityId, state);

    dev.presentDetailPopup('popupThermo', entityId, sendPageCmd, () => this.sendThermoUpdate(entityId));
  }

  public sendThermoUpdate(entityId: string): void {
    const dev = this.dev();
    const state = dev.thermoStates.get(entityId);
    if (!state) return;

    const iconColor = state.color !== undefined ? Color.get(state.color, 'climate_heat')! : Color.get('climate_heat')!;
    const iconStr = state.icon ? (Icon.get(state.icon, 'thermometer') || '') : (Icon.get('thermometer') || '');

    const binding = this.thermoBinding(entityId);
    const options = binding && dev.bindingService().capability?.(binding, 'thermostat_mode') ? this.enumOptions(binding, 'thermostat_mode') : undefined;
    const cmd = Page.GenerateThermoPopup({
      entityId,
      icon: iconStr,
      iconColor,
      heading1: state.heading1 || '',
      type1: state.type1 || 'mode',
      currentMode1: options?.find(option => option.id === state.currentMode1)?.label || state.currentMode1 || '',
      modeList1: options ? options.map(option => option.label) : state.modeList1 || '',
      heading2: state.heading2 || '',
      type2: state.type2 || 'preset_mode',
      currentMode2: state.currentMode2 || '',
      modeList2: state.modeList2 || '',
      heading3: state.heading3 || '',
      type3: state.type3 || 'fan_mode',
      currentMode3: state.currentMode3 || '',
      modeList3: state.modeList3 || ''
    });

    dev.sendCmnd('CustomSend', cmd);
  }

  public async setThermoState(entityId: string, customState: any): Promise<void> {
    const dev = this.dev();
    customState = this.flowPopupState(entityId, 'thermo', customState);
    const state = dev.thermoStates.get(entityId) || createThermoState();

    if (customState.mode_row === 'mode2' || customState.mode_row === 'preset' || customState.mode_row === 'row2') {
      if (customState.mode) state.currentMode2 = String(customState.mode).trim();
      if (customState.modes) state.modeList2 = String(customState.modes).trim();
    } else if (customState.mode_row === 'mode3' || customState.mode_row === 'fan' || customState.mode_row === 'row3') {
      if (customState.mode) state.currentMode3 = String(customState.mode).trim();
      if (customState.modes) state.modeList3 = String(customState.modes).trim();
    } else {
      if (customState.mode) state.currentMode1 = String(customState.mode).trim();
      if (customState.modes) state.modeList1 = String(customState.modes).trim();
    }

    if (customState.mode1) state.currentMode1 = String(customState.mode1).trim();
    if (customState.mode2) state.currentMode2 = String(customState.mode2).trim();
    if (customState.mode3) state.currentMode3 = String(customState.mode3).trim();

    this.applyPopupSource('thermo', state, dev.popupBinding(entityId, 'thermo'));
    dev.thermoStates.set(entityId, state);

    if (dev.popupActive && dev.activeThermoEntity === entityId) {
      this.sendThermoUpdate(entityId);
    }
  }

  public sendBoundSelectUpdate(entityId: string): void {
    const dev = this.dev();
    if (dev.slotBinding(entityId)) void this.openSelectPopup(entityId, undefined, false).catch(dev.error);
  }

  public sendBoundFanUpdate(entityId: string): void {
    const dev = this.dev();
    if (dev.slotBinding(entityId)) void this.openFanPopup(entityId, undefined, false).catch(dev.error);
  }

  public thermoModeCapability(entityId: string): { setable?: boolean; options: { id: string; label: string }[] } | undefined {
    const dev = this.dev();
    const binding = this.thermoBinding(entityId);
    if (!binding) return undefined;
    const capability = dev.bindingService().capability?.(binding, 'thermostat_mode');
    if (!capability) return undefined;
    return {
      setable: capability.setable !== false,
      options: this.enumOptions(binding, 'thermostat_mode'),
    };
  }

  public async handleFanInteraction(entityId: string, buttonType: string, value: string): Promise<boolean> {
    const dev = this.dev();
    return handleFanControl({
      entity: entityId,
      states: dev.fanStates,
      slot: dev.controlSlot(entityId),
      supports: capability => dev.slotSupports(entityId, capability),
      set: (deviceId, capability, next) => dev.setBoundValue(deviceId, capability, next),
      emit: tokens => { (dev.fanActionTrigger || dev.fanActionPressedTrigger)?.trigger(dev, tokens, {}).catch(dev.error); },
      render: () => this.sendFanUpdate(entityId),
    }, buttonType, value);
  }

  public async handleThermoInteraction(entityId: string, buttonType: string, value: string): Promise<boolean> {
    const dev = this.dev();
    return handleThermoControl({
      entity: entityId,
      states: dev.thermoStates,
      binding: this.thermoBinding(entityId),
      modeCapability: this.thermoModeCapability(entityId),
      set: (deviceId, capability, next) => dev.setBoundValue(deviceId, capability, next),
      emit: tokens => { (dev.thermoActionTrigger || dev.thermostatModeChangedTrigger)?.trigger(dev, tokens, {}).catch(dev.error); },
      render: () => this.sendThermoUpdate(entityId),
    }, buttonType, value);
  }

  public async handleSelectInteraction(entityId: string, buttonType: string, value: string): Promise<boolean> {
    const dev = this.dev();
    return handleSelectControl({
      entity: entityId,
      states: dev.selectStates,
      slot: dev.controlSlot(entityId),
      options: this.selectOptions(entityId),
      supports: capability => dev.slotSupports(entityId, capability),
      set: (deviceId, capability, next) => dev.setBoundValue(deviceId, capability, next),
      emit: tokens => { dev.selectActionTrigger?.trigger(dev, tokens, {}).catch(dev.error); },
      render: () => this.sendSelectUpdate(entityId),
    }, buttonType, value);
  }
}
