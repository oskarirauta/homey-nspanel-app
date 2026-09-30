import { FlowManager } from "./modules/flow-manager";
import { PageManager } from "./modules/page-manager";
import { PopupManager } from "./modules/popup-manager";
import { NightModeManager } from "./modules/nightmode-manager";
import { BindingManager } from "./modules/binding-manager";
import { MqttHandler } from "./modules/mqtt-handler";
import { handleMediaControl } from '../../lib/panel/media-control';
import { applyHomeyPopupValues, filterPopupFlowValues, PopupKind, PopupStates } from '../../lib/panel/value-sources';
import { createFanState, createSelectState, createLightState, createShutterState, createThermoState } from '../../lib/panel/state-defaults';
import { TimerController, createTimerState, handleTimerControl } from '../../lib/panel/timer-control';
import { PopupPresenter, DetailPopup } from '../../lib/panel/popup-presenter';
import { handleThermoControl } from '../../lib/panel/thermo-control';
import { handleFanControl } from '../../lib/panel/fan-control';
import { handleSelectControl } from '../../lib/panel/select-control';
import { handleLightControl } from '../../lib/panel/light-control';
import { handleShutterControl } from '../../lib/panel/shutter-control';
import type { ControlSlot } from '../../lib/panel/control-context';
import type { StoredPage, LightState, TimerState, ShutterState, ThermoState, FanState, SelectState } from '../../lib/panel/models';
import { InteractionQueue } from '../../lib/panel/interaction-queue';
import { captureMapEntries, captureSlotValues } from '../../lib/panel/display-snapshot';
import { isMetChart } from '../../lib/chart-source';
import { MetHourlyPoint } from '../../lib/met-weather';
'use strict';

import Homey from 'homey';
import { NSPanelApp } from '../../app';
import { NSPanelDriver } from './driver';
import { Color } from '../../lib/color';
import { Icon } from '../../lib/icon';
import { Weather } from '../../lib/weather';
import { StatusBarIcon } from '../../lib/statusbar';
import { Page } from '../../lib/page';
import { coordinateKey } from '../../lib/met-weather';
import { powerWatts, powerSpeed } from '../../lib/power';
import { Binding, PanelBindings, readBinding, formatReading, validateBinding } from '../../lib/bindings';
import { DirectMqttClient } from '../../lib/mqtt';

const { DateTime } = require('luxon');


export class NSPanelDevice extends Homey.Device {

  updateStatusTimer?: NodeJS.Timeout = undefined;
  updateTimeTimer?: NodeJS.Timeout = undefined;
  indoorTemperature?: number = undefined;
  weather?: Weather.Forecast = undefined;

  switch1?: boolean = undefined;
  switch2?: boolean = undefined;
  temp_current: number = 20.0;
  temp_setpoint: number = 20.0;

  // Triggers
  switchChangedTrigger?: Homey.FlowCardTriggerDevice = undefined;
  onlineStatusChangedTrigger?: Homey.FlowCardTriggerDevice = undefined;
  public flowManager!: FlowManager;
  public pageManager!: PageManager;
  public popupManager!: PopupManager;
  public nightModeManager!: NightModeManager;
  public bindingManager!: BindingManager;
  public mqttHandler!: MqttHandler;

  public getBindingManager(): BindingManager {
    if (!this.bindingManager) {
      this.bindingManager = new BindingManager(this);
    }
    return this.bindingManager;
  }

  public getMqttHandler(): MqttHandler {
    if (!this.mqttHandler) {
      this.mqttHandler = new MqttHandler(this);
    }
    return this.mqttHandler;
  }

  get directMqtt() { return this.getMqttHandler().directMqtt; }
  set directMqtt(val: any) { this.getMqttHandler().directMqtt = val; }

  get _deviceId() { return this.getMqttHandler()._deviceId; }
  set _deviceId(val: any) { this.getMqttHandler()._deviceId = val; }

  get _devicePath() { return this.getMqttHandler()._devicePath; }
  set _devicePath(val: any) { this.getMqttHandler()._devicePath = val; }

  get metWeather() { return this.getBindingManager().metWeather; }
  set metWeather(val: any) { this.getBindingManager().metWeather = val; }

  get metHourly() { return this.getBindingManager().metHourly; }
  set metHourly(val: any) { this.getBindingManager().metHourly = val; }

  get weatherStatus() { return this.getBindingManager().weatherStatus || { state: 'flow' }; }
  set weatherStatus(val: any) { this.getBindingManager().weatherStatus = val; }

  get weatherDispose() { return this.getBindingManager().weatherDispose; }
  set weatherDispose(val: any) { this.getBindingManager().weatherDispose = val; }

  get bindingDisposers() { return this.getBindingManager().bindingDisposers; }
  set bindingDisposers(val: any) { this.getBindingManager().bindingDisposers = val; }

  get bindingRenderTimer() { return this.getBindingManager().bindingRenderTimer; }
  set bindingRenderTimer(val: any) { this.getBindingManager().bindingRenderTimer = val; }

  get bindingsStopped() { return this.getBindingManager().bindingsStopped; }
  set bindingsStopped(val: any) { this.getBindingManager().bindingsStopped = val; }

  get bindingGeneration() { return this.getBindingManager().bindingGeneration; }
  set bindingGeneration(val: any) { this.getBindingManager().bindingGeneration = val; }

  get bindingRetryTimer() { return this.getBindingManager().bindingRetryTimer; }
  set bindingRetryTimer(val: any) { this.getBindingManager().bindingRetryTimer = val; }

  public getNightModeManager(): NightModeManager {
    if (!this.nightModeManager) {
      this.nightModeManager = new NightModeManager(this);
    }
    return this.nightModeManager;
  }

  public getPageManager(): PageManager {
    if (!this.pageManager) {
      this.pageManager = new PageManager(this);
    }
    return this.pageManager;
  }

  public getPopupManager(): PopupManager {
    if (!this.popupPresenter && this.homey) {
      this.popupPresenter = new PopupPresenter({
        sendPage: (screen) => this.sendCmnd('CustomSend', `page ${screen}`),
        schedule: (fn) => this.homey.setTimeout(fn, 0),
        isCurrent: (screen, entity) => this.popupActive && this.currentHmiScreen === screen && (
          (screen === 'popupFan' && this.activeFanEntity === entity) ||
          (screen === 'popupInSel' && this.activeSelectEntity === entity) ||
          (screen === 'popupTimer' && this.activeTimerEntity === entity) ||
          (screen === 'popupLight' && this.activeLightEntity === entity) ||
          (screen === 'popupShutter' && this.activeShutterEntity === entity) ||
          (screen === 'popupThermo' && this.activeThermoEntity === entity)
        )
      });
    }
    if (!this.popupManager) {
      this.popupManager = new PopupManager(this);
    }
    return this.popupManager;
  }
  pageChangedTrigger?: Homey.FlowCardTriggerDevice = undefined;
  enterScreensaverTrigger?: Homey.FlowCardTriggerDevice = undefined;
  exitScreensaverTrigger?: Homey.FlowCardTriggerDevice = undefined;
  screenButtonPressedTrigger?: Homey.FlowCardTriggerDevice = undefined;
  screenSwitchToggledTrigger?: Homey.FlowCardTriggerDevice = undefined;
  mediaActionPressedTrigger?: Homey.FlowCardTriggerDevice = undefined;
  alarmActionTriggeredTrigger?: Homey.FlowCardTriggerDevice = undefined;
  alarmPinFailedTrigger?: Homey.FlowCardTriggerDevice = undefined;
  notificationButtonClickedTrigger?: Homey.FlowCardTriggerDevice = undefined;
  thermostatSetpointChangedTrigger?: Homey.FlowCardTriggerDevice = undefined;
  screenWokeUpTrigger?: Homey.FlowCardTriggerDevice = undefined;
  physicalButtonPressedTrigger?: Homey.FlowCardTriggerDevice = undefined;
  fanActionTrigger?: Homey.FlowCardTriggerDevice = undefined;
  fanStates: Map<string, FanState> = new Map();
  activeFanEntity?: string = undefined;
  selectActionTrigger?: Homey.FlowCardTriggerDevice = undefined;
  selectStates: Map<string, SelectState> = new Map();
  activeSelectEntity?: string = undefined;
  lightActionTrigger?: Homey.FlowCardTriggerDevice = undefined;
  lightStates: Map<string, LightState> = new Map();
  activeLightEntity?: string = undefined;
  timerFinishedTrigger?: Homey.FlowCardTriggerDevice = undefined;
  timerActionTrigger?: Homey.FlowCardTriggerDevice = undefined;
  timerStates: Map<string, TimerState> = new Map();
  activeTimerEntity?: string = undefined;
  timerInterval?: NodeJS.Timeout = undefined;
  shutterActionTrigger?: Homey.FlowCardTriggerDevice = undefined;
  shutterStates: Map<string, ShutterState> = new Map();
  activeShutterEntity?: string = undefined;
  thermostatModeChangedTrigger?: Homey.FlowCardTriggerDevice = undefined;
  thermoStates: Map<string, ThermoState> = new Map();
  activeThermoEntity?: string = undefined;
  popupPresenter: any = undefined;

  currentPageType: Page.Type = Page.Type.screensaver;
  currentHmiScreen: string = '';
  currentPageId: string = 'active';
  currentOptions: string = '';
  screensaverActive: boolean = true;
  dimmed: boolean = false;
  sleeping: boolean = false;
  sleepTimer?: NodeJS.Timeout = undefined;
  popupActive: boolean = false;
  returnPageAfterPopup?: string = undefined;
  alarmState?: string = undefined;
  notificationTimeoutTimer?: NodeJS.Timeout = undefined;
  statusIcon1: { icon?: string; color?: string } = {};
  statusIcon2: { icon?: string; color?: string } = {};

  nightModeActive: boolean = false;
  manualNightMode?: boolean = undefined;
  customBrightness?: number = undefined;
  customSleepBrightness?: number = undefined;
  pendingUnlock?: {
    type: 'slot' | 'page' | 'action';
    targetPageId?: string;
    slotId?: number;
    entityId?: string;
    pin: string;
    returnPageId?: string;
    actionFn?: () => Promise<void>;
  } = undefined;
  nightModeChangedTrigger?: Homey.FlowCardTriggerDevice = undefined;

  // In-memory page store for stateful multi-page rendering
  pages: { [pageId: string]: StoredPage } = {};
  chartHistories: Map<string, { value: number; timestamp: number; label?: string }[]> = new Map();

  updateChartHistory(histKey: string, value: number, scale = 1): void {
    if (!Number.isFinite(value)) return;
    let history = this.chartHistories.get(histKey);
    if (!history) {
      history = [];
      this.chartHistories.set(histKey, history);
    }

    const now = new Date();
    const hour = now.getHours();
    const scaledVal = Math.round(value * scale);
    const label = (hour % 4 === 0) ? `${hour < 10 ? '0' : ''}${hour}:00` : undefined;

    if (history.length > 0) {
      const last = history[history.length - 1];
      const lastDate = new Date(last.timestamp);
      if (lastDate.getHours() === hour && (now.getTime() - last.timestamp) < 3600000) {
        last.value = scaledVal;
        last.timestamp = now.getTime();
        return;
      }
    }

    history.push({
      value: scaledVal,
      timestamp: now.getTime(),
      label
    });

    while (history.length > 24) {
      history.shift();
    }
  }

  public registerFlowActions() {
    if (!this.flowManager) {
      this.flowManager = new FlowManager(this);
    }
    this.flowManager.registerActions();
  }

  getSettings(): any {
    if (typeof super.getSettings === 'function') {
      try {
        return super.getSettings() || {};
      } catch {}
    }
    return {};
  }

  async onInit() {
    this.lifecycleStopped = false;
    Page.logthis = this.log;
    const settings = this.getSettings();
    this.log('Device initializing');
    this.bindings = this.getStoreValue('bindings') || { indoor: { source: settings.use_internal_temperature !== false ? 'internal' : 'flow' }, outdoor: { source: settings.outdoor_temperature_from_forecast !== false ? 'forecast' : 'flow' }, indoorVisible: true, outdoorVisible: true, buttons: {} };
    const icons = this.getStoreValue('statusIcons');
    if (icons) { this.statusIcon1 = icons.first || {}; this.statusIcon2 = icons.second || {}; }

    // Load stored pages from persistent device store
    try {
      const stored = await this.getStoreValue('pages');
      if (stored && typeof stored === 'object' && Object.keys(stored).length > 0) {
        this.pages = stored;
        if (this.pages['active'] && (!this.pages['active'].navigation || !this.pages['active'].navigation.leading)) {
          if (!this.pages['active'].navigation) this.pages['active'].navigation = {};
          this.pages['active'].navigation.leading = { target: 'screensaver' };
        }
        this.log(`Loaded ${Object.keys(this.pages).length} pages from persistent store:`, Object.keys(this.pages));
      } else {
        this.initDefaultPage();
        await this.savePages();
      }
    } catch {
      this.initDefaultPage();
    }

    if (!this.getStoreValue('bindingsVersion')) {
      const page = this.pages.active;
      if (page?.title === 'Home') for (const [key, source] of [['1', 'relay'], ['2', 'relay'], ['3', 'internal']]) {
        const slot = page.slots[Number(key)];
        if (slot && !slot.binding && slot.name === `slot_${key}`) slot.binding = source === 'relay' ? { source, relay: Number(key) } : { source };
      }
      await this.setStoreValue('pages', this.pages);
      await this.setStoreValue('bindingsVersion', 1);
    }

    // Initialize Flow Manager
    this.flowManager = new FlowManager(this);
    this.flowManager.registerTriggersAndConditions();
    this.flowManager.registerActions();

    // Register capabilities
    this.registerCapabilityListener('switch.power1', async (value) => {
      this.switch1 = value;
      this.sendCmnd('Power1', value ? 'ON' : 'OFF');
    });

    this.registerCapabilityListener('switch.power2', async (value) => {
      this.switch2 = value;
      this.sendCmnd('Power2', value ? 'ON' : 'OFF');
    });

    this.registerCapabilityListener('target_temperature', async (value) => {
      this.temp_setpoint = value;
      this.thermoUpdate();
    });

    // Initialize Flow triggers
    this.switchChangedTrigger = this.homey.flow.getDeviceTriggerCard('switch_changed');
    this.onlineStatusChangedTrigger = this.homey.flow.getDeviceTriggerCard('online_status_changed');
    this.pageChangedTrigger = this.homey.flow.getDeviceTriggerCard('page_changed');
    this.enterScreensaverTrigger = this.homey.flow.getDeviceTriggerCard('enter_screensaver');
    this.exitScreensaverTrigger = this.homey.flow.getDeviceTriggerCard('exit_screensaver');

    try { this.screenButtonPressedTrigger = this.homey.flow.getDeviceTriggerCard('screen_button_pressed'); } catch {}
    try { this.screenSwitchToggledTrigger = this.homey.flow.getDeviceTriggerCard('screen_switch_toggled'); } catch {}
    try { this.mediaActionPressedTrigger = this.homey.flow.getDeviceTriggerCard('media_action_pressed'); } catch {}
    try { this.alarmActionTriggeredTrigger = this.homey.flow.getDeviceTriggerCard('alarm_action_triggered'); } catch {}
    try { this.alarmPinFailedTrigger = this.homey.flow.getDeviceTriggerCard('alarm_pin_failed'); } catch {}
    try { this.notificationButtonClickedTrigger = this.homey.flow.getDeviceTriggerCard('notification_button_clicked'); } catch {}
    try { this.thermostatSetpointChangedTrigger = this.homey.flow.getDeviceTriggerCard('thermostat_setpoint_changed'); } catch {}
    try { this.thermostatModeChangedTrigger = this.homey.flow.getDeviceTriggerCard('thermostat_mode_changed'); } catch {}
    try { this.screenWokeUpTrigger = this.homey.flow.getDeviceTriggerCard('screen_woke_up'); } catch {}
    try { this.fanActionTrigger = this.homey.flow.getDeviceTriggerCard('fan_action_triggered'); } catch {}
    try { this.selectActionTrigger = this.homey.flow.getDeviceTriggerCard('select_action_triggered'); } catch {}
    try { this.lightActionTrigger = this.homey.flow.getDeviceTriggerCard('light_action_triggered'); } catch {}
    try { this.timerFinishedTrigger = this.homey.flow.getDeviceTriggerCard('timer_finished_triggered'); } catch {}
    try { this.timerActionTrigger = this.homey.flow.getDeviceTriggerCard('timer_action_triggered'); } catch {}
    try { this.shutterActionTrigger = this.homey.flow.getDeviceTriggerCard('shutter_action_triggered'); } catch {}
    try { this.nightModeChangedTrigger = this.homey.flow.getDeviceTriggerCard('night_mode_changed'); } catch {}
    try {
      this.physicalButtonPressedTrigger = this.homey.flow.getDeviceTriggerCard('physical_button_pressed');
      this.physicalButtonPressedTrigger.registerRunListener(async (args, state) => {
        if (args.button && args.button !== 'any' && String(args.button) !== String(state.button)) {
          return false;
        }
        if (args.action && args.action !== 'any' && args.action.toLowerCase() !== String(state.action).toLowerCase()) {
          return false;
        }
        return true;
      });
    } catch {}

    // Register Flow Conditions
    this.homey.flow.getConditionCard('is_online').registerRunListener(async (args, state) => {
      const dev = (args?.device as NSPanelDevice) || this;
      return dev.getAvailable();
    });

    this.homey.flow.getConditionCard('screensaver_is_active').registerRunListener(async (args, state) => {
      const dev = (args?.device as NSPanelDevice) || this;
      return dev.screensaverActive;
    });

    this.homey.flow.getConditionCard('current_page_is').registerRunListener(async (args, state) => {
      const dev = (args?.device as NSPanelDevice) || this;
      if (!dev.currentPageType) return false;
      return dev.currentPageType === args.page;
    });

    try {
      this.homey.flow.getConditionCard('is_night_mode').registerRunListener(async (args, state) => {
        const dev = (args?.device as NSPanelDevice) || this;
        return !!dev.nightModeActive;
      });
    } catch {}

    // Setup initial temperatures
    const setpoint = await this.getCapabilityValue('target_temperature');
    if (setpoint === null || setpoint === undefined) {
      await this.setCapabilityValue('target_temperature', 20);


      this.temp_current = NaN;
      this.temp_setpoint = 20;
    } else {
      this.temp_current = this.getCapabilityValue('measure_temperature');
      this.temp_setpoint = setpoint;
    }

    // Start unavailable before connecting: a fast MQTT connection may become
    // available while refreshBindings is still waiting for Homey devices.
    await this.setUnavailable();
    // Connect via Standalone MQTT or Scanno MQTT
    this.setupMqttConnection(settings);
    await this.refreshBindings();
    this.refreshWeatherSource().catch(this.error);
  }

  bindings: PanelBindings = { indoor: { source: 'internal' }, outdoor: { source: 'forecast' }, buttons: {} };
  flowOutdoorTemperature?: number;

  public bindingService() {
    return this.getBindingManager().bindingService();
  }

  public activeWeather(): Weather.Forecast | undefined {
    return this.getBindingManager().activeWeather();
  }

  public async refreshWeatherSource(): Promise<void> {
    return this.getBindingManager().refreshWeatherSource();
  }

  public readSource(binding: Binding, flowValue?: any): any {
    return this.getBindingManager().readSource(binding, flowValue);
  }

  public disposeBindings() {
    return this.getBindingManager().disposeBindings();
  }

  public scheduleBindingRender() {
    return this.getBindingManager().scheduleBindingRender();
  }

  public async refreshBindings() {
    return this.getBindingManager().refreshBindings();
  }

  public buttonsNeedDecoupling(): boolean {
    return this.getBindingManager().buttonsNeedDecoupling();
  }

  public async setBindings(bindings: PanelBindings): Promise<void> {
    return this.getBindingManager().setBindings(bindings);
  }

  public initDefaultPage(): StoredPage {
    return this.getPageManager().initDefaultPage();
  }

  public updateDefaultPageSlots(): void {
    return this.getPageManager().updateDefaultPageSlots();
  }

  public async savePages(): Promise<void> {
    return this.getPageManager().savePages();
  }

  public isCurrentPage(pageId: string, page: StoredPage): boolean {
    return this.getPageManager().isCurrentPage(pageId, page);
  }

  public showScreensaver(): void {
    this.getPageManager().showScreensaver();
  }

  public async exitScreensaver(): Promise<void> {
    return this.getPageManager().exitScreensaver();
  }

  public async wakeScreen(): Promise<void> {
    return this.getPageManager().wakeScreen();
  }

  public async navigateToPage(targetId: string, skipPinCheck: boolean = false): Promise<void> {
    return this.getPageManager().navigateToPage(targetId, skipPinCheck);
  }

  public async showUnlockScreen(title: string, destination: string, pin: string, returnPageId?: string): Promise<void> {
    return this.getPageManager().showUnlockScreen(title, destination, pin, returnPageId);
  }

  public presentDetailPopup(screen: string, entityId: string, sendPageCmd: boolean, updateFn: () => void): void {
    this.getPageManager().presentDetailPopup(screen, entityId, sendPageCmd, updateFn);
  }

  public clearPopupEntities(): void {
    this.getPageManager().clearPopupEntities();
  }

  public getOrCreatePage(pageId: string, type: Page.Type): StoredPage {
    return this.getPageManager().getOrCreatePage(pageId, type);
  }

  public async dismissNotification(targetPageId?: string): Promise<void> {
    return this.getPageManager().dismissNotification(targetPageId);
  }

  public async renderAndDisplayPage(page: StoredPage, switchPageType: boolean = true): Promise<void> {
    return this.getPageManager().renderAndDisplayPage(page, switchPageType);
  }

  public async showNotification(
    entityId: string = 'notify',
    heading: string = 'Ilmoitus',
    text: string = '',
    buttonText: string = 'OK',
    timeout: number = 0,
    cancelText: string = '',
    action: string = ''
  ): Promise<void> {
    return this.getPageManager().showNotification(entityId, heading, text, buttonText, timeout, cancelText, action);
  }

  public async showAlarmPage(): Promise<void> {
    return this.getPageManager().showAlarmPage();
  }

  // --- MQTT Connectivity (Standalone vs Scanno) ---

  setupMqttConnection(settings: { [key: string]: any }) {
    return this.getMqttHandler().setupMqttConnection(settings);
  }

  subscribeDirectMqtt(format: string, topic: string) {
    return this.getMqttHandler().subscribeDirectMqtt(format, topic);
  }

  unsubscribeDirectMqtt(format: string, topic: string) {
    return this.getMqttHandler().unsubscribeDirectMqtt(format, topic);
  }

  handleRawMqttMessage(topic: string, message: string) {
    return this.getMqttHandler().handleRawMqttMessage(topic, message);
  }

  // --- End MQTT Connectivity ---

  async postSwitchState(id: number, state: boolean) {
    return this.getMqttHandler().postSwitchState(id, state);
  }

  deviceId(): string {
    return this.getMqttHandler().deviceId();
  }

  mqtt_path(): string {
    return this.getMqttHandler().mqtt_path();
  }

  subscribe(format: string, topic: string) {
    return this.getMqttHandler().subscribe(format, topic);
  }

  unsubscribe(format: string, topic: string) {
    return this.getMqttHandler().unsubscribe(format, topic);
  }

  private lifecycleStopped = false;
  private lifecycleTimers = new Map<string, NodeJS.Timeout>();

  private cancelDeviceTimer(key: string): void {
    const timer = this.lifecycleTimers.get(key);
    if (timer !== undefined) this.homey.clearTimeout(timer);
    this.lifecycleTimers.delete(key);
  }

  private scheduleDeviceTimer(key: string, callback: () => void, delay: number): void {
    this.cancelDeviceTimer(key);
    if (this.lifecycleStopped) return;
    const timer = this.homey.setTimeout(() => {
      if (this.lifecycleStopped || this.lifecycleTimers.get(key) !== timer) return;
      this.lifecycleTimers.delete(key);
      try { callback(); } catch (error) { this.error('Device timer failed:', error); }
    }, delay);
    this.lifecycleTimers.set(key, timer);
  }

  async onUninit() {
    this.lifecycleStopped = true;
    for (const key of this.lifecycleTimers.keys()) this.cancelDeviceTimer(key);
    this.getMqttHandler().cancelPending();
    this.clearPopupEntities();
    // Evict unbounded state maps to free memory on device removal
    this.fanStates.clear();
    this.selectStates.clear();
    this.lightStates.clear();
    this.timerStates.clear();
    this.shutterStates.clear();
    this.thermoStates.clear();
    this.chartHistories.clear();
    this.getBindingManager().stopBindings();
    if (this.sleepTimer) this.homey.clearTimeout(this.sleepTimer);
    if (this.notificationTimeoutTimer) this.homey.clearTimeout(this.notificationTimeoutTimer);
    if (this.timerInterval !== undefined) {
      this.homey.clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
    const settings = this.getSettings();
    if (this.directMqtt) {
      this.getMqttHandler().stop();
    } else {
      this.unsubscribe(this.mqtt_path(), this.deviceId());
    }
    this.setOffline();
  }

  setOffline() {
    for (const key of ['startup-time', 'startup-driver', 'startup-status', 'startup-weather', 'settings-online', 'settings-brightness']) this.cancelDeviceTimer(key);
    if (this.timerInterval !== undefined) {
      this.homey.clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
    if (this.updateStatusTimer !== undefined) {
      this.homey.clearInterval(this.updateStatusTimer);
      this.updateStatusTimer = undefined;
    }
    if (this.updateTimeTimer !== undefined) {
      this.homey.clearInterval(this.updateTimeTimer);
      this.updateTimeTimer = undefined;
    }
    this._deviceId = undefined;
    this._devicePath = undefined;
  }

  setOnline() {
    if (this.lifecycleStopped) return;
    this.log('Device is now ONLINE. Sending screen initialization commands...');
    if (this.updateStatusTimer !== undefined) this.homey.clearInterval(this.updateStatusTimer);
    if (this.updateTimeTimer !== undefined) this.homey.clearInterval(this.updateTimeTimer);

    // Clear any stale popup state from before disconnection
    this.clearPopupEntities();
    this.popupActive = false;

    // 1. Immediately configure Tasmota real-time telemetry and wake display
    this.sendCmnd('SetOption59', '1');
    this.sendCmnd('CustomSend', 'pageType~screensaver');
    this.screensaverActive = true;

    // 2. Immediate time, brightness and status
    this.updateTime();
    this.updateBrightness();

    // 3. Staggered initial requests
    this.scheduleDeviceTimer('startup-time', () => this.updateTime(), 1000);
    this.scheduleDeviceTimer('startup-driver', () => this.requestDriverVersion(), 1500);
    this.scheduleDeviceTimer('startup-status', () => this.requestStatus(), 2500);
    this.scheduleDeviceTimer('startup-weather', () => this.weatherUpdate(), 3500);

    const settings = this.getSettings();
    if (settings['decouple_buttons'] || this.buttonsNeedDecoupling()) {
      this.sendCmnd('SetOption73', '1');
    } else {
      this.sendCmnd('SetOption73', '0');
    }
    if (Object.keys(this.bindings.buttons || {}).length) this.sendCmnd('Rule2', '0');
    if (settings['button_navigation'] && !Object.keys(this.bindings.buttons || {}).length) {
      this.sendCmnd('Rule2', 'on Button1#state do Publish tele/%topic%/RESULT {"CustomRecv":"event,buttonPress2,bPrev,bPrev"} endon on Button2#state do Publish tele/%topic%/RESULT {"CustomRecv":"event,buttonPress2,bNext,bNext"} endon');
      this.sendCmnd('Rule2', '1');
    }
    if (settings['buzzer_pwm'] !== undefined) {
      this.sendCmnd('SetOption111', settings['buzzer_pwm'] ? '1' : '0');
    }

    this.updateStatusTimer = this.homey.setInterval(() => this.requestStatus(), (settings['update_interval'] || 50) * 1000);
    this.updateTimeTimer = this.homey.setInterval(() => this.updateTime(), 30000);

    try {
      this.onlineStatusChangedTrigger?.trigger(this, { state: true }, {});
    } catch {}
  }

  async onSettings(settingsEvent: {
    oldSettings: { [key: string]: boolean | string | number | undefined | null };
    newSettings: { [key: string]: boolean | string | number | undefined | null };
    changedKeys: string[];
  }): Promise<string | void> {
    if (this.lifecycleStopped) return;
    this.log('Settings changed:', settingsEvent.changedKeys);

    if (
      settingsEvent.changedKeys.includes('mqtt_mode') ||
      settingsEvent.changedKeys.includes('mqtt_host') ||
      settingsEvent.changedKeys.includes('mqtt_port') ||
      settingsEvent.changedKeys.includes('mqtt_user') ||
      settingsEvent.changedKeys.includes('mqtt_password') ||
      settingsEvent.changedKeys.includes('mqtt_topic') ||
      settingsEvent.changedKeys.includes('mqtt_path')
    ) {
      this.log('Reconfiguring MQTT connection...');
      this.getMqttHandler().cancelPending();
      if (settingsEvent.oldSettings['mqtt_mode'] === 'standalone') {
        this.unsubscribeDirectMqtt(settingsEvent.oldSettings['mqtt_path'] as string, settingsEvent.oldSettings['mqtt_topic'] as string);
      } else {
        this.unsubscribe(settingsEvent.oldSettings['mqtt_path'] as string, settingsEvent.oldSettings['mqtt_topic'] as string);
      }

      this.setOffline();
      const nextSettings = { ...settingsEvent.newSettings };
      this.scheduleDeviceTimer('settings-mqtt', () => {
        this.setupMqttConnection(nextSettings);
      }, 1500);
    } else if (settingsEvent.changedKeys.includes('update_interval')) {
      if (this.getAvailable()) {
        this.setOffline();
        this.scheduleDeviceTimer('settings-online', () => this.setOnline(), 1500);
      }
    }

    if (
      (settingsEvent.changedKeys.includes('brightness') ||
       settingsEvent.changedKeys.includes('sleep_brightness') ||
       settingsEvent.changedKeys.includes('background_color')) &&
      this.getAvailable()
    ) {
      this.scheduleDeviceTimer('settings-brightness', () => this.updateBrightness(), 1750);
    }

    if (settingsEvent.changedKeys.includes('decouple_buttons')) {
      const decouple = !!settingsEvent.newSettings['decouple_buttons'];
      this.sendCmnd('SetOption73', decouple || this.buttonsNeedDecoupling() ? '1' : '0');
      this.log(`SetOption73 set to ${decouple ? '1' : '0'} (decouple_buttons)`);
    }

    if (settingsEvent.changedKeys.includes('button_navigation')) {
      const btnNav = !!settingsEvent.newSettings['button_navigation'];
      if (btnNav && !Object.keys(this.bindings.buttons || {}).length) {
        this.sendCmnd('Rule2', 'on Button1#state do Publish tele/%topic%/RESULT {"CustomRecv":"event,buttonPress2,bPrev,bPrev"} endon on Button2#state do Publish tele/%topic%/RESULT {"CustomRecv":"event,buttonPress2,bNext,bNext"} endon');
        this.sendCmnd('Rule2', '1');
        this.log('Rule2 enabled for physical button navigation');
      } else {
        this.sendCmnd('Rule2', '0');
        this.log('Rule2 disabled');
      }
    }

    if (settingsEvent.changedKeys.includes('buzzer_pwm')) {
      const buzzerPwm = !!settingsEvent.newSettings['buzzer_pwm'];
      this.sendCmnd('SetOption111', buzzerPwm ? '1' : '0');
      this.log(`SetOption111 set to ${buzzerPwm ? '1' : '0'} (buzzer_pwm)`);
    }

    const nightKeys = [
      'night_mode_enabled', 'night_mode_start', 'night_mode_end',
      'night_brightness', 'night_sleep_brightness', 'night_sleep_timeout',
      'night_theme_black', 'night_follow_alarm'
    ];
    if (settingsEvent.changedKeys.some(k => nightKeys.includes(k))) {
      this.checkNightMode();
    }
  }

  sendMessage(topic: string, message: string) {
    return this.getMqttHandler().sendMessage(topic, message);
  }

  sendCmnd(topic: string, message: string | undefined) {
    return this.getMqttHandler().sendCmnd(topic, message);
  }

  requestDriverVersion(): void {
    this.sendCmnd('GetDriverVersion', 'x');
  }

  requestStatus(): void {
    this.sendCmnd('Status', '10');
    this.sendCmnd('Status', '11');
  }

  updateTime(): void {
    const now = DateTime.now().setZone(this.homey.clock.getTimezone());
    this.sendCmnd('CustomSend', `time~${now.toLocaleString(DateTime.TIME_24_SIMPLE)}~`);
    this.sendCmnd('CustomSend', `date~${now.toLocaleString(DateTime.DATE_HUGE)}`);
    this.checkNightMode();
  }

  checkNightMode(): void {
    this.getNightModeManager().checkNightMode();
  }

  updateNightMode(): void {
    this.getNightModeManager().updateNightMode();
  }

  public isNightMode(): boolean {
    return this.getNightModeManager().isNightMode();
  }

  updateBrightness(dim: boolean = false): void {
    this.getNightModeManager().updateBrightness(dim);
  }

  tempConversion(value: string | number | undefined, use_celcius: boolean, reverse: boolean = false): number {
    let temp = 0.0;
    if (typeof value === 'string') temp = parseFloat(value);
    else if (typeof value === 'number') temp = isNaN(value) ? 0.0 : value;

    if (isNaN(temp)) temp = 0.0;

    if (!use_celcius && !reverse) {
      temp -= 32;
      temp /= 1.8;
    } else if (!use_celcius && reverse) {
      temp *= 1.8;
      temp += 32;
    }

    return temp === 0.0 ? 0.0 : parseFloat((Math.round(temp * 10) / 10).toFixed(1));
  }

  async onMessage(deviceId: string, topic: string, msg: string) {
    return this.getMqttHandler().onMessage(deviceId, topic, msg);
  }

  private isSlotOnPage(page: StoredPage, slotId: string): boolean {
    if (!page.slots) return false;
    return Object.values(page.slots).some(s => s.id === slotId || s.name === slotId);
  }

  public async showFlowNotification(args: any): Promise<void> {
      const previousReturn = this.popupActive && this.currentPageType === Page.Type.notification
        ? this.returnPageAfterPopup : undefined;
      if (this.notificationTimeoutTimer !== undefined) {
        this.homey.clearTimeout(this.notificationTimeoutTimer);
        this.notificationTimeoutTimer = undefined;
      }
      this.clearPopupEntities();
      this.commandNotification=false;
      // Automatically wake up screen if dimmed or in screensaver
      const wasInScreensaver = this.screensaverActive;
      if (this.screensaverActive || this.dimmed) {
        this.screensaverActive = false;
        this.dimmed = false;
        this.updateBrightness(false);
      }

      if (args.beep) {
        this.playBuzzer(1, 2, 2);
      }

      const timeout = typeof args.timeout === 'number' ? args.timeout : 0;
      const cmd = Page.GenerateNotification(
        args.heading || 'Notification',
        args.message || '',
        args.button1 || 'OK',
        args.button2 || '',
        args.color1 || 'white',
        args.color2 || 'white',
        timeout
      );

      this.popupActive = true;
      this.returnPageAfterPopup = previousReturn || (wasInScreensaver ? 'screensaver' : (this.currentPageId || 'active'));
      this.currentPageType = Page.Type.notification;

      this.sendCmnd('CustomSend', 'pageType~popupNotify');
      this.sendCmnd('CustomSend', cmd);
      this.updateSleepTimer();

      if (timeout > 0) {
        if (this.notificationTimeoutTimer) {
          this.homey.clearTimeout(this.notificationTimeoutTimer);
        }
        const timer = this.homey.setTimeout(async () => {
          try {
            if (this.notificationTimeoutTimer === timer && this.popupActive && this.currentPageType === Page.Type.notification) {
              this.notificationTimeoutTimer = undefined;
              this.log('[Popup Notification] Timeout expired in Homey fallback timer, dismissing popup');
              this.notificationButtonClickedTrigger?.trigger(this, { button: 'exit' }, {}).catch((err: Error) => this.error('Notification timeout trigger failed:', err));
              await this.dismissNotification();
            }
          } catch (err) {
            this.error('Notification timeout handler failed:', err);
          }
        }, (timeout + 1) * 1000);
        this.notificationTimeoutTimer = timer;
      }
  }

  private commandNotification = false;
  private readonly panelInteractions = new InteractionQueue({
    canRun: event => {
      if (this.currentPageType !== Page.Type.notification || /^event,(startup|sleepReached),?/.test(event)) {
        this.commandNotification = false;
      }
      return !this.commandNotification || /^event,buttonPress2,(popupNotify|notify),/.test(event);
    },
    capture: event => this.captureInteractionDisplay(event),
    onFailure: error => this.showCommandFailure(error),
    afterCommand: () => this.scheduleBindingRender(),
  });

  private setBoundValue(deviceId: string, capabilityId: string, value: any): Promise<void> {
    return this.panelInteractions.command(() => this.bindingService().set(deviceId, capabilityId, value));
  }

  private controlBoundValue(binding: Binding, desired?: boolean): Promise<void> {
    return this.panelInteractions.command(() => this.bindingService().control(binding, desired));
  }

  private captureInteractionDisplay(event: string): () => void {
    const ids = new Set([
      event.split(',')[2], this.activeFanEntity, this.activeSelectEntity,
      this.activeLightEntity, this.activeShutterEntity, this.activeThermoEntity,
    ].filter((id): id is string => !!id));
    const page = this.pages[this.currentPageId || 'active'];
    const restore = [
      captureMapEntries(this.fanStates, ids),
      captureMapEntries(this.selectStates, ids),
      captureMapEntries(this.lightStates, ids),
      captureMapEntries(this.shutterStates, ids),
      captureMapEntries(this.thermoStates, ids),
      captureSlotValues(page?.slots || {}, ids),
    ];
    return () => restore.forEach(reset => reset());
  }

  private showCommandFailure(error:unknown):void {
    this.error('Homey device command failed',error);
    this.clearPopupEntities();
    if(this.notificationTimeoutTimer){this.homey.clearTimeout(this.notificationTimeoutTimer);this.notificationTimeoutTimer=undefined;}
    this.commandNotification=true;
    this.returnPageAfterPopup=this.screensaverActive?'screensaver':(this.currentPageId || 'active');
    const wake=this.screensaverActive || this.dimmed || this.sleeping;
    this.screensaverActive=false;
    this.clearSleepTimer();
    if(wake){this.dimmed=false;this.sleeping=false;this.updateBrightness(false);}
    this.popupActive=true;
    this.currentPageType=Page.Type.notification;
    this.sendCmnd('CustomSend','pageType~popupNotify');
    this.sendCmnd('CustomSend',Page.GenerateNotification('Ohjaus epäonnistui','Homey ei vahvistanut ohjausta. Tarkista laitteen yhteys ja tila ennen uutta yritystä.','OK','','white','white',0));
  }

  async handleNextionEvent(eventStr:string, verifiedDetail:boolean=false):Promise<void> {
    // Verified detail requests run within the PIN event already being handled.
    if(verifiedDetail)return this.processNextionEvent(eventStr,true);
    return this.runPanelInteraction(()=>this.processNextionEvent(eventStr,false),eventStr);
  }

  private runPanelInteraction(action: () => Promise<void>, event = ''): Promise<void> {
    return this.panelInteractions.run(action, event);
  }

  private async processNextionEvent(eventStr: string, verifiedDetail: boolean = false) {
    this.log('Received Nextion event');
    const parts = eventStr.split(',');
    const eventType = parts[1]; // startup, buttonPress2, sleepReached, pageOpenDetail

    if (eventType !== 'sleepReached') {
      this.updateSleepTimer();
    }

    // 0. Nextion render request (Nextion requests content for currently open page)
    if (eventType === 'renderCurrentPage') {
      this.log(`Nextion requested renderCurrentPage, currentPageId="${this.currentPageId}"`);
      if (!this.screensaverActive) {
        const targetPage = this.pages[this.currentPageId || 'active'] || this.initDefaultPage();
        this.updateDefaultPageSlots();
        await this.renderAndDisplayPage(targetPage, false);
      }
      return;
    }

    // A. Startup
    if (eventType === 'startup') {
      if (parts.length >= 4) {
        await this.setCapabilityValue('region', parts[3].toUpperCase());
      }
      return;
    }

    // B. Sleep timeout reached
    if (eventType === 'sleepReached') {
      if (parts.length >= 3 && parts[2] !== 'screensaver') {
        this.showScreensaver();
      }
      return;
    }

    // B2. Popup Open Detail request (e.g. event,pageOpenDetail,popupFan,slot_1)
    if (eventType === 'pageOpenDetail') {
      const popupType = parts[2];
      const entityId = parts[3] || 'fan';
      this.log(`[Nextion Event] pageOpenDetail: popupType="${popupType}", entityId="${entityId}"`);

      const detailPage=this.pages[this.currentPageId || 'active'];
      const detailSlot=Object.values(detailPage?.slots || {}).find((slot:any)=>slot && [slot.id,slot.name,slot.target].includes(entityId)) as any;
      if(!verifiedDetail && detailSlot && (detailSlot.require_pin || detailSlot.pin_required || detailSlot.pin)) {
        const pin=detailSlot.pin || this.getSetting('global_pin') || this.getSetting('alarm_pin') || '1234';
        this.pendingUnlock={type:'slot',entityId,pin,returnPageId:this.currentPageId,actionFn:async()=>{await this.handleNextionEvent(eventStr,true);}};
        await this.showUnlockScreen(detailSlot.title || 'PIN-koodi',entityId,pin);
        return;
      }
      this.clearPopupEntities();
      switch (popupType) {
        case 'popupFan': await this.openFanPopup(entityId, undefined, false); break;
        case 'popupInSel': await this.openSelectPopup(entityId, undefined, false); break;
        case 'popupTimer': await this.openTimerPopup(entityId, undefined, false); break;
        case 'popupLight':
        case 'popupLightNew': await this.openLightPopup(entityId, undefined, false); break;
        case 'popupShutter': await this.openShutterPopup(entityId, undefined, false); break;
        case 'popupThermo': await this.openThermoPopup(entityId || 'thermo', undefined, false); break;
      }
      return;
    }

    // C. Button Presses & Interactions
    if (eventType === 'buttonPress2') {
      const entityId = parts[2] || '';
      const buttonType = parts[3] || '';
      const value = parts[4] !== undefined ? parts[4] : '';

      this.log(`[Nextion Event] buttonPress2: entityId="${entityId}", buttonType="${buttonType}", value=[redacted] (screensaverActive=${this.screensaverActive})`);

      // 1. Screensaver tap to wake up (when screensaver is currently ACTIVE)
      if (this.screensaverActive) {
        this.log(`Waking up from screensaver`);
        await this.exitScreensaver();
        this.screenWokeUpTrigger?.trigger(this, {}, {});
        return;
      }

      // If user tapped a button/slot explicitly configured to activate screensaver
      const lowerEntityId = entityId.toLowerCase().trim();
      const lowerButtonType = buttonType.toLowerCase().trim();
      if (
        ['screensaver', 'clock', 'lepotila', 'kello'].includes(lowerEntityId) ||
        ['screensaver', 'clock', 'lepotila', 'kello'].includes(lowerButtonType)
      ) {
        this.log(`Screensaver triggered by entityId/buttonType: ${entityId}/${buttonType}`);
        this.showScreensaver();
        return;
      }

      // 2. Thermostat setpoint adjustments
      if (buttonType === 'tempUpd') {
        // HMI transmits whole tenths of a degree, not a free-form temperature.
        if (!/^-?\d+$/.test(value)) return;
        const val = Number(value);
        if (Number.isSafeInteger(val)) {
          const newSetpoint = val / 10;
          const curPage = this.pages[this.currentPageId || 'active'] || this.pages['active'];
          const rawObj = (typeof curPage?.rawOptions === 'object' && curPage.rawOptions !== null) ? curPage.rawOptions : (() => { try { return JSON.parse(curPage?.rawOptions as string || '{}'); } catch { return {}; } })();
          if (curPage?.type === Page.Type.thermostat && rawObj?.binding?.source === 'homey' && rawObj.binding.deviceId) {
            await this.setBoundValue(rawObj.binding.deviceId, 'target_temperature', newSetpoint);
          } else {
            await this.setCapabilityValue('target_temperature', newSetpoint);
            this.temp_setpoint = newSetpoint;
            this.thermoUpdate();
          }
          this.thermostatSetpointChangedTrigger?.trigger(this, { temperature: newSetpoint }, {});
        }
        return;
      }

      // 3. Media player controls
      if (buttonType.startsWith('media-') || buttonType === 'volumeSlider') {
        const page = this.pages[this.currentPageId || 'active'] || this.pages.active;
        let options = page?.rawOptions;
        if (typeof options === 'string') { try { options = JSON.parse(options); } catch { options = {}; } }
        await handleMediaControl({
          binding: page?.type === Page.Type.media ? options?.binding : undefined,
          set: (deviceId, capability, next) => this.setBoundValue(deviceId, capability, next),
          emit: tokens => { this.mediaActionPressedTrigger?.trigger(this, tokens, {}).catch(this.error); },
        }, buttonType, value);
        return;
      }

      // 3b. Fan / Ventilation controls
      if (buttonType === 'number-set') {
        await this.handleFanInteraction(entityId || this.activeFanEntity || 'fan', buttonType, value);
        return;
      }

      if (buttonType.startsWith('mode-')) {
        if (buttonType === 'mode-preset_modes' && (entityId === this.activeFanEntity || this.activeFanEntity)) {
          await this.handleFanInteraction(entityId || this.activeFanEntity || 'fan', buttonType, value);
          return;
        } else if (this.activeThermoEntity || entityId === this.activeThermoEntity || entityId === 'thermo' || (this.currentPageType === Page.Type.thermostat && !buttonType.startsWith('mode-preset_modes'))) {
          await this.handleThermoInteraction(entityId || this.activeThermoEntity || 'thermo', buttonType, value);
          return;
        } else {
          await this.handleSelectInteraction(entityId || this.activeSelectEntity || 'select', buttonType, value);
          return;
        }
      }

      if (buttonType === 'OnOff' && (this.popupActive && this.activeFanEntity !== undefined) && (entityId === this.activeFanEntity || !entityId)) {
        await this.handleFanInteraction(entityId || this.activeFanEntity || 'fan', buttonType, value);
        return;
      }

      if (buttonType.startsWith('timer-')) {
        const entity = entityId || this.activeTimerEntity || 'timer';
        const slot = Object.values(this.pages[this.currentPageId]?.slots || {}).find(slot => slot.id === entity || slot.name === entity);
        await handleTimerControl(this.timerStates, entity, slot, buttonType, value, action => this.controlTimer(entity, action));
        return;
      }

      if (this.popupActive && this.activeLightEntity) {
        const entity = this.activeLightEntity;
        if (await handleLightControl({
          entity,
          states: this.lightStates,
          slot: this.controlSlot(entity),
          supports: capability => this.slotSupports(entity, capability),
          set: (deviceId, capability, next) => this.setBoundValue(deviceId, capability, next),
          emit: tokens => { this.lightActionTrigger?.trigger(this, tokens, {}).catch(this.error); },
          render: () => this.sendLightUpdate(entity),
        }, buttonType, value)) return;
      }

      if (this.popupActive && this.activeShutterEntity) {
        const entity = this.activeShutterEntity;
        if (await handleShutterControl({
          entity,
          states: this.shutterStates,
          slot: this.controlSlot(entity),
          supports: capability => this.slotSupports(entity, capability),
          supportsAction: action => this.shutterSupports(entity, action),
          set: (deviceId, capability, next) => this.setBoundValue(deviceId, capability, next),
          move: direction => this.moveShutter(entity, direction),
          emit: tokens => { this.shutterActionTrigger?.trigger(this, tokens, {}).catch(this.error); },
          render: () => this.sendShutterUpdate(entity),
        }, buttonType, value)) return;
      }

      if ((entityId === 'popupInSel' || entityId === 'popupFan' || entityId === 'popupTimer' || entityId === 'popupLight' || entityId === 'popupLightNew' || entityId === 'popupShutter' || entityId === 'popupThermo' || entityId === 'popup' || entityId === 'cardUnlock' || this.currentHmiScreen === 'cardUnlock' || this.pendingUnlock !== undefined) && buttonType === 'bExit') {
        this.popupActive = false;
        this.pendingUnlock = undefined;
        this.currentHmiScreen = '';
        this.activeFanEntity = undefined;
        this.activeSelectEntity = undefined;
        this.activeTimerEntity = undefined;
        this.activeLightEntity = undefined;
        this.activeShutterEntity = undefined;
        this.activeThermoEntity = undefined;
        const returnTarget = this.returnPageAfterPopup || this.currentPageId || 'active';
        this.returnPageAfterPopup = undefined;
        if (returnTarget === 'screensaver' || returnTarget === 'clock' || returnTarget === 'lepotila' || returnTarget === 'kello') {
          this.showScreensaver();
          return;
        }
        const targetPage = this.pages[returnTarget] || this.initDefaultPage();
        await this.renderAndDisplayPage(targetPage, true);
        return;
      }

      // Handle cardUnlock PIN entry
      if (buttonType === 'cardUnlock-unlock') {
        const enteredPin = value || '';
        this.log(`[Unlock Event] cardUnlock-unlock received: destination="${entityId}", enteredPin="${enteredPin ? '****' : '(empty)'}"`);

        if (this.pendingUnlock) {
          const expectedPin = this.pendingUnlock.pin;
          if (expectedPin && enteredPin !== expectedPin) {
            this.log('[Unlock Event] PIN verification failed');
            this.playBuzzer(2, 2, 1);
            this.alarmPinFailedTrigger?.trigger(this, { entered_pin: enteredPin }, {}).catch(this.error);
            return;
          }

          this.log('[Unlock Event] PIN verified successfully');
          this.playBuzzer(1, 1, 1);
          const pending = this.pendingUnlock;
          this.pendingUnlock = undefined;
          this.popupActive=false;
          this.currentHmiScreen = '';

          if (pending.type === 'page' && pending.targetPageId) {
            await this.navigateToPage(pending.targetPageId, true);
            return;
          } else if (pending.actionFn) {
            const returnTarget = pending.returnPageId || this.currentPageId || 'active';
            this.currentPageId = returnTarget;
            const page = this.pages[returnTarget] || this.initDefaultPage();
            await this.renderAndDisplayPage(page, true);
            await pending.actionFn();
            return;
          } else if (pending.type === 'action') {
            const returnTarget = pending.returnPageId || this.currentPageId || 'active';
            this.currentPageId = returnTarget;
            const page = this.pages[returnTarget] || this.initDefaultPage();
            await this.renderAndDisplayPage(page, true);
            return;
          }
        }

        await this.handleAlarmAction('disarm', enteredPin);
        return;
      }

      // 4. Alarm actions and PIN entry
      if (
        ['disarm', 'arm_home', 'arm_away', 'arm_night', 'arm_vacation'].includes(buttonType) ||
        entityId.startsWith('alarm_')
      ) {
        const action = buttonType;
        const pin = value;
        await this.handleAlarmAction(action, pin);
        return;
      }

      // 5. Popup notification button clicked or dismissed
      if (entityId === 'popupNotify' || entityId === 'notify') {
        let btn = 'button1';
        if (buttonType === 'bExit') {
          btn = 'exit';
        } else if (buttonType === 'notifyAction') {
          // Nextion Lovelace UI HMI mapping:
          // Left button (Button 1) sends 'no'
          // Right button (Button 2) sends 'yes'
          btn = value === 'no' ? 'button1' : (value === 'yes' ? 'button2' : (value || 'button1'));
        } else if (value) {
          btn = value;
        } else if (buttonType) {
          btn = buttonType;
        }

        this.log(`[Popup Notification] Event: entityId="${entityId}", buttonType="${buttonType}", value="${value}" => triggering "${btn}"`);
        if(!this.commandNotification)this.notificationButtonClickedTrigger?.trigger(this, { button: btn }, {});

        // Dismiss the popup notification cleanly and return to the previous page/screensaver
        await this.dismissNotification();
        return;
      }

      // 5b. Swipe navigation (mSwipeNext/mSwipePrev hotspots on card pages send swipeLeft/swipeRight)
      if (buttonType === 'swipeLeft' || buttonType === 'swipeRight' || buttonType === 'swipeUp' || buttonType === 'swipeDown') {
        this.log(`[Swipe] ${buttonType} detected on page "${this.currentPageId}"`);
        if (this.getSetting('disable_nav_when_armed') === true && this.alarmState && this.alarmState !== 'disarmed') {
          this.log('[Swipe] Navigation ignored: Alarm is armed');
          return;
        }
        // Map swipe directions to existing navigation targets
        if (buttonType === 'swipeLeft' || buttonType === 'swipeUp') {
          // Swipe left/up = next page (same as bNext)
          const curPage = this.pages[this.currentPageId || 'active'] || this.pages['active'];
          const target = curPage?.navigation?.trailing?.target;
          if (target === 'screensaver') {
            this.showScreensaver();
          } else if (target) {
            await this.navigateToPage(target);
          }
        } else if (buttonType === 'swipeRight' || buttonType === 'swipeDown') {
          // Swipe right/down = previous page (same as bPrev)
          const curPage = this.pages[this.currentPageId || 'active'] || this.pages['active'];
          const target = curPage?.navigation?.leading?.target || 'screensaver';
          if (target === 'screensaver') {
            this.showScreensaver();
          } else {
            await this.navigateToPage(target);
          }
        }
        return;
      }

      // 6. Navigation: bPrev (Top-left button)
      if (buttonType === 'bPrev' || entityId === 'bPrev' || entityId === 'Nav.Button.prev') {
        if (this.getSetting('disable_nav_when_armed') === true && this.alarmState && this.alarmState !== 'disarmed') {
          this.log('[Navigation] bPrev ignored: Alarm is armed');
          return;
        }

        const curPage = this.pages[this.currentPageId || 'active'] || this.pages['active'];
        let target = curPage?.navigation?.leading?.target || 'screensaver';

        if (entityId && entityId.startsWith('navigate.')) {
          target = entityId.substring(9);
        } else if (entityId && this.pages[entityId] && entityId !== this.currentPageId && entityId !== curPage?.title) {
          target = entityId;
        }

        this.log(`[Navigation] bPrev: navigating to "${target}"`);
        if (target === 'screensaver') {
          this.showScreensaver();
        } else {
          await this.navigateToPage(target);
        }
        return;
      }

      // Navigation: bNext (Top-right button)
      if (buttonType === 'bNext' || entityId === 'bNext' || entityId === 'Nav.Button.next') {
        if (this.getSetting('disable_nav_when_armed') === true && this.alarmState && this.alarmState !== 'disarmed') {
          this.log('[Navigation] bNext ignored: Alarm is armed');
          return;
        }

        const curPage = this.pages[this.currentPageId || 'active'] || this.pages['active'];
        let target = curPage?.navigation?.trailing?.target;

        if (entityId && entityId.startsWith('navigate.')) {
          target = entityId.substring(9);
        } else if (entityId && this.pages[entityId] && entityId !== this.currentPageId && entityId !== curPage?.title) {
          target = entityId;
        }

        this.log(`[Navigation] bNext: navigating to "${target}"`);
        if (target === 'screensaver') {
          this.showScreensaver();
        } else if (target) {
          await this.navigateToPage(target);
        }
        return;
      }

      // Navigation: bExit
      if (buttonType === 'bExit') {
        if (this.getSetting('disable_nav_when_armed') === true && this.alarmState && this.alarmState !== 'disarmed') {
          this.log('[Navigation] bExit ignored: Alarm is armed');
          return;
        }

        const curPage = this.pages[this.currentPageId || 'active'] || this.pages['active'];
        const target = curPage?.navigation?.leading?.target || 'screensaver';
        this.log(`[Navigation] bExit: navigating to "${target}"`);
        if (target === 'screensaver') {
          this.showScreensaver();
        } else {
          await this.navigateToPage(target);
        }
        return;
      }

      // Generic navigate.TARGET
      if (entityId.startsWith('navigate.')) {
        const target = entityId.substring(9);
        if (target) {
          await this.navigateToPage(target);
          return;
        }
      }

      // 7. Click on Slots (slot_1 .. slot_8) or named entities
      let slotNum = 0;
      const match = entityId.match(/slot_(\d+)/);
      if (match) slotNum = parseInt(match[1], 10);

      const curPage = this.pages[this.currentPageId || 'active'] || this.pages['active'];
      const matched = Object.entries(curPage?.slots || {}).find(([key, slot]: [string, any]) => slot.name === entityId || slot.id === entityId);
      if (matched) slotNum = Number(matched[0]);
      const slotEntity = curPage?.slots ? curPage.slots[slotNum] : undefined;

      const slotTarget = slotEntity?.target || slotEntity?.id || slotEntity?.name || entityId;

      this.log(`[Slot Click] slotNum=${slotNum}, entityId="${entityId}", slotTarget="${slotTarget}", slotType="${slotEntity?.type}"`);

      // Check slot-level PIN protection
      const slotRequiresPin = (slotEntity?.require_pin === true || slotEntity?.pin_required === true || !!slotEntity?.pin);
      if (slotRequiresPin) {
        const configuredPin = slotEntity.pin || this.getSetting('global_pin') || this.getSetting('alarm_pin') || '1234';
        this.log(`[Slot Click] Slot ${slotNum} ("${slotEntity?.title || entityId}") requires PIN unlock`);
        this.pendingUnlock = {
          type: 'slot',
          slotId: slotNum,
          entityId,
          pin: configuredPin,
          returnPageId: this.currentPageId,
          actionFn: async () => {
            await this.processSlotInteraction(slotNum, slotEntity, entityId, buttonType, value, curPage);
          }
        };
        await this.showUnlockScreen(slotEntity?.title || 'PIN-koodi', `slot_${slotNum}`, configuredPin);
        return;
      }

      await this.processSlotInteraction(slotNum, slotEntity, entityId, buttonType, value, curPage);
    }
  }

  private async processSlotInteraction(
    slotNum: number,
    slotEntity: any,
    entityId: string,
    buttonType: string,
    value: string,
    curPage: StoredPage
  ): Promise<void> {
    const slotTarget = slotEntity?.target || slotEntity?.id || slotEntity?.name || entityId;
    const lowerSlotTarget = (slotTarget || '').toLowerCase().trim();
    const lowerEntityId = (entityId || '').toLowerCase().trim();

    // Check if slot or entity targets screensaver / clock
    if (
      ['screensaver', 'clock', 'lepotila', 'kello'].includes(lowerSlotTarget) ||
      ['screensaver', 'clock'].includes(lowerEntityId)
    ) {
      this.log(`Screensaver triggered by slot/entity: slotNum=${slotNum}, target=${slotTarget}`);
      this.showScreensaver();
      return;
    }

    // Check if slot is a navigation button or targets another page
    const isNavigate = slotEntity?.type === 'navigate' ||
                       slotEntity?.type === Page.EntityType.navigate ||
                       (slotTarget && this.pages[slotTarget]) ||
                       lowerSlotTarget === 'home' ||
                       lowerSlotTarget === 'koti' ||
                       slotTarget.startsWith('navigate.');

    if (isNavigate && slotTarget) {
      const finalTarget = slotTarget.startsWith('navigate.') ? slotTarget.substring(9) : slotTarget;
      this.log(`Navigating to target "${finalTarget}" from slot ${slotNum}`);
      await this.navigateToPage(finalTarget);
      return;
    }

    // Check if slot or entity is a fan / popupFan
    const isFan = slotEntity?.type === 'fan' ||
                  slotEntity?.type === Page.EntityType.fan ||
                  lowerSlotTarget === 'popupfan' ||
                  lowerSlotTarget === 'fan';
    if (isFan) {
      this.log(`Opening fan popup from slot ${slotNum}: ${slotTarget}`);
      await this.openFanPopup(slotEntity?.id || slotEntity?.name || entityId || 'fan');
      return;
    }

    // Check if slot or entity is input_sel / popupInSel
    const isInputSel = slotEntity?.type === 'input_sel' ||
                       slotEntity?.type === Page.EntityType.input_sel ||
                       lowerSlotTarget === 'popupinsel' ||
                       lowerSlotTarget === 'input_sel' ||
                       lowerSlotTarget === 'select';
    if (isInputSel) {
      this.log(`Opening input_sel popup from slot ${slotNum}: ${slotTarget}`);
      await this.openSelectPopup(slotEntity?.id || slotEntity?.name || entityId || 'select');
      return;
    }

    // Check if slot or entity is timer / popupTimer
    const isTimer = slotEntity?.type === 'timer' ||
                    slotEntity?.type === Page.EntityType.timer ||
                    lowerSlotTarget === 'popuptimer' ||
                    lowerSlotTarget === 'timer';
    if (isTimer) {
      this.log(`Opening timer popup from slot ${slotNum}: ${slotTarget}`);
      await this.openTimerPopup(slotEntity?.id || slotEntity?.name || entityId || 'timer');
      return;
    }

    // Check if slot or entity is light / popupLight (clicked directly or targeted)
    const isLight = slotEntity?.type === 'light' ||
                    slotEntity?.type === Page.EntityType.light ||
                    lowerSlotTarget === 'popuplight' ||
                    lowerSlotTarget === 'popuplightnew' ||
                    lowerSlotTarget === 'light';
    if (isLight && buttonType !== 'OnOff') {
      this.log(`Opening light popup from slot ${slotNum}: ${slotTarget}`);
      await this.openLightPopup(slotEntity?.id || slotEntity?.name || entityId || 'light');
      return;
    }

    // Check if slot or entity is shutter / popupShutter
    const isShutter = slotEntity?.type === 'shutter' ||
                      slotEntity?.type === 'cover' ||
                      slotEntity?.type === Page.EntityType.shutter ||
                      slotEntity?.type === Page.EntityType.cover ||
                      lowerSlotTarget === 'popupshutter' ||
                      lowerSlotTarget === 'shutter' ||
                      lowerSlotTarget === 'cover';
    if (isShutter) {
      if (['up', 'stop', 'down'].includes(buttonType)) {
        const entity = slotEntity?.id || slotEntity?.name || entityId || 'shutter';
        if(!this.shutterSupports(entity,buttonType))return;
        let state = this.shutterStates.get(entity) || createShutterState();
        if (buttonType === 'up') {
          state.position = 100;
          slotEntity.value = '100 %';
          slotEntity.val = '100';
          if (slotEntity?.binding?.source === 'homey' && slotEntity.binding.deviceId) {
            await this.moveShutter(entity,'up');
          }
          this.shutterActionTrigger?.trigger(this, { entity, action_type: 'up', position: 100, tilt: state.tilt }, {}).catch(this.error);
        } else if (buttonType === 'down') {
          state.position = 0;
          slotEntity.value = '0 %';
          slotEntity.val = '0';
          if (slotEntity?.binding?.source === 'homey' && slotEntity.binding.deviceId) {
            await this.moveShutter(entity,'down');
          }
          this.shutterActionTrigger?.trigger(this, { entity, action_type: 'down', position: 0, tilt: state.tilt }, {}).catch(this.error);
        } else if (buttonType === 'stop') {
          if (slotEntity?.binding?.source === 'homey' && slotEntity.binding.deviceId) {
            await this.setBoundValue(slotEntity.binding.deviceId, 'windowcoverings_state', 'idle');
          }
          this.shutterActionTrigger?.trigger(this, { entity, action_type: 'stop', position: state.position, tilt: state.tilt }, {}).catch(this.error);
        }
        this.shutterStates.set(entity, state);
        return;
      }

      this.log(`Opening shutter popup from slot ${slotNum}: ${slotTarget}`);
      await this.openShutterPopup(slotEntity?.id || slotEntity?.name || entityId || 'shutter');
      return;
    }

    // Check if slot or entity is thermostat / popupThermo
    const isThermo = slotEntity?.type === 'thermo' ||
                     slotEntity?.type === 'thermostat' ||
                     slotEntity?.type === Page.EntityType.thermo ||
                     slotEntity?.type === Page.EntityType.thermostat ||
                     lowerSlotTarget === 'popupthermo' ||
                     lowerSlotTarget === 'thermo' ||
                     lowerSlotTarget === 'thermostat';
    if (isThermo && buttonType !== 'OnOff') {
      this.log(`Opening thermo popup from slot ${slotNum}: ${slotTarget}`);
      await this.openThermoPopup(slotEntity?.id || slotEntity?.name || entityId || 'thermo');
      return;
    }

    if (slotEntity?.binding?.source === 'homey') {
      if (slotEntity.binding.action) {
        await this.controlBoundValue(slotEntity.binding, buttonType === 'OnOff' ? value === '1' : undefined);
        if (slotEntity.binding.action === 'press') this.screenButtonPressedTrigger?.trigger(this, { page: this.currentPageId, slot: slotNum, entity: entityId, button_type: 'button', value }, {}).catch(this.error);
        else this.screenSwitchToggledTrigger?.trigger(this, { page: this.currentPageId, slot: slotNum, entity: entityId, state: !!this.bindingService().value(slotEntity.binding) }, {}).catch(this.error);
      }
      return;
    }
    const relay = slotEntity?.binding?.source === 'relay'
      ? Number(slotEntity.binding.relay)
      : (slotTarget === 'power1' || entityId === 'power1' ? 1 : (slotTarget === 'power2' || entityId === 'power2' ? 2 : 0));
    // Check if slot or entity is a switch / relay (handles both 'OnOff' and 'button' events)
    const isSwitch = buttonType === 'OnOff' ||
                     slotEntity?.type === Page.EntityType.switch ||
                     slotTarget === 'power1' ||
                     slotTarget === 'power2' ||
                     entityId === 'power1' ||
                     entityId === 'power2' ||
                     relay > 0;

    if (isSwitch) {
      let newState: boolean;
      if (buttonType === 'OnOff' && (value === '1' || value === '0')) {
        newState = value === '1';
      } else if (relay === 1) {
        newState = !this.switch1;
      } else if (relay === 2) {
        newState = !this.switch2;
      } else {
        newState = (slotEntity?.value ?? slotEntity?.val) !== '1';
      }

      if (relay === 1) {
        this.switch1 = newState;
        await this.setCapabilityValue('switch.power1', newState);
        this.sendCmnd('Power1', newState ? 'ON' : 'OFF');
      } else if (relay === 2) {
        this.switch2 = newState;
        await this.setCapabilityValue('switch.power2', newState);
        this.sendCmnd('Power2', newState ? 'ON' : 'OFF');
      }

      if (slotEntity) {
        slotEntity.value = newState ? '1' : '0';
        delete slotEntity.val;
      }

      this.screenSwitchToggledTrigger?.trigger(this, {
        page: this.currentPageId || 'active',
        slot: slotNum,
        entity: entityId,
        state: newState
      }, {}).catch((err: Error) => this.error('screenSwitchToggled trigger failed:', err));

      // Refresh screen state without switching page
      if (curPage) {
        await this.renderAndDisplayPage(curPage, false);
      }
      return;
    }

    // 8. General Button presses
    if (buttonType === 'button' || buttonType === '') {
      const targetType = Page.stringToPageType(entityId);
      if (targetType) {
        await this.navigateToPage(entityId);
        return;
      }

      this.screenButtonPressedTrigger?.trigger(this, {
        page: this.currentPageId || 'active',
        slot: slotNum,
        entity: entityId,
        button_type: buttonType || 'button',
        value: value
      }, {});
    }
  }

  weatherUpdate(): void {
    if(this.popupActive)return;
    if (!this.screensaverActive && this.currentPageId && this.pages[this.currentPageId]?.rawOptions?.weatherForecast) {
      this.renderAndDisplayPage(this.pages[this.currentPageId], false).catch(this.error);
      return;
    }
    const indoor = this.bindings.indoorVisible === false ? undefined : this.readSource(this.bindings.indoor, this.indoorTemperature);
    const weather = JSON.parse(JSON.stringify(this.activeWeather() || {}));
    const outdoor = this.bindings.outdoorVisible === false ? undefined : this.readSource(this.bindings.outdoor, this.flowOutdoorTemperature);
    weather.day0 = { ...(weather.day0 || {}), temperature: outdoor };
    const metric = this.homey.i18n.getUnits() === 'metric';
    if (!metric) for (const day of Object.values(weather) as any[]) if (typeof day?.temperature === 'number') day.temperature = day.temperature * 1.8 + 32;
    const indoorDisplay = typeof indoor === 'number' ? (metric ? indoor : indoor * 1.8 + 32) : undefined;
    const cmd = Weather.update(weather, indoorDisplay, metric ? '°C' : '°F', false);
    if (cmd) this.sendCmnd('CustomSend', cmd);
  }

  thermoUpdate(): void {
    if(this.popupActive)return;
    if (this.currentPageType !== Page.Type.thermostat || !this.currentOptions) return;
    const settings = this.getSettings();
    const metric = this.homey.i18n.getUnits() === 'metric';
    const parts = this.currentOptions.split('~');
    if (!parts || parts.length < 21) return;

    parts[15] = `${this.tempConversion(this.temp_current, metric, true).toFixed(1)} ${metric ? '°C' : '°F'}`;
    parts[16] = Math.floor(this.tempConversion(this.temp_setpoint, metric, true) * 10).toString();
    parts[17] = this.temp_current < this.temp_setpoint ? 'Heating' : (this.temp_current > this.temp_setpoint ? 'Cooling' : '-');

    const newOpts = parts.join('~');
    if (newOpts) {
      this.currentOptions = newOpts;
      this.sendCmnd('CustomSend', newOpts);
    }
  }

  sleepFunc(): void {
    if (!this.screensaverActive) {
      this.log('screensaver is activating');
      this.showScreensaver();
    } else {
      const settings = this.getSettings();
      const isNight = this.nightModeActive;
      const sleepTimeout = isNight && settings['night_sleep_timeout'] !== undefined
        ? Number(settings['night_sleep_timeout'])
        : (settings['sleep_timeout'] !== undefined ? Number(settings['sleep_timeout']) : 45);

      if (!this.dimmed) {
        this.log('dimming screen');
        this.updateBrightness(true);
        if (sleepTimeout > 0) {
          this.sleepTimer = this.homey.setTimeout(() => this.sleepFunc(), sleepTimeout * 1000);
        }
      } else if (sleepTimeout > 0) {
        this.log("turning screen's light off");
        const defaultBg = settings['background_color'] === 'black' ? 'background_black' : 'background_dark';
        const nightBg = settings['night_theme_black'] !== false ? 'background_black' : defaultBg;
        const backgroundColor = Color.get(isNight ? nightBg : defaultBg)!;
        const dimBrightness = isNight && settings['night_sleep_brightness'] !== undefined
          ? Number(settings['night_sleep_brightness'])
          : (settings['sleep_brightness'] || 20);

        let i = dimBrightness;
        while (i > 0) {
          i -= 1;
          this.sendCmnd('CustomSend', `dimmode~${i}~${i}~${backgroundColor}~~`);
        }
        this.sendCmnd('CustomSend', `dimmode~0~0~${backgroundColor}~~`);
        this.sleeping = true;
      }
    }
  }

  clearSleepTimer() {
    if (this.sleepTimer !== undefined) {
      this.homey.clearTimeout(this.sleepTimer);
      this.sleepTimer = undefined;
    }
  }

  updateSleepTimer() {
    const settings = this.getSettings();
    this.clearSleepTimer();
    const timeoutSec = this.screensaverActive
      ? (settings['dim_timeout'] || 45)
      : (settings['screensaver_timeout'] || 45);
    this.sleepTimer = this.homey.setTimeout(() => this.sleepFunc(), timeoutSec * 1000);
  }

  notifyPageChange(pageName: string): void {
    this.homey.setTimeout(() => {
      this.pageChangedTrigger?.trigger(this, { page: pageName }, {});
    }, 300);
  }

  switchPage(page: Page.Type): void {
    this.clearPopupEntities();
    this.popupActive = false;
    let hmiCmd = Page.pageTypeToHmiCommand(page);
    if (page === Page.Type.chart) {
      const curPage = this.pages[this.currentPageId];
      const rawObj = typeof curPage?.rawOptions === 'string'
        ? (() => { try { return JSON.parse(curPage.rawOptions); } catch { return {}; } })()
        : (curPage?.rawOptions || {});
      if (rawObj?.chartType === 'line' || rawObj?.type === 'line' || rawObj?.type === 'cardLChart') {
        hmiCmd = 'pageType~cardLChart';
      }
    }
    this.currentHmiScreen = hmiCmd.replace('pageType~', '');
    this.sendCmnd('CustomSend', hmiCmd);
    this.notifyPageChange(page);
    this.updateSleepTimer();
  }

  async setPage(page: Page.Type, forced: boolean = false): Promise<void> {
    if (!forced && this.currentPageType === page && !this.screensaverActive) return;

    this.currentPageType = page;
    this.screensaverActive = page === Page.Type.screensaver;

    if (this.screensaverActive) {
      this.showScreensaver();
      return;
    }

    this.switchPage(page);
    this.updateBrightness();
    this.updateSleepTimer();
  }



  sendStatusUpdate(): void {
    const ic1 = this.statusIcon1.icon ? (Icon.get(this.statusIcon1.icon, '') || '') : '';
    const col1 = this.statusIcon1.color ? String(Color.get(this.statusIcon1.color, 'white')!) : '65535';
    const ic2 = this.statusIcon2.icon ? (Icon.get(this.statusIcon2.icon, '') || '') : '';
    const col2 = this.statusIcon2.color ? String(Color.get(this.statusIcon2.color, 'white')!) : '65535';

    this.sendCmnd('CustomSend', `statusUpdate~${ic1}~${col1}~${ic2}~${col2}~1~1`);
  }

  setStatusIcons(icon1?: string, color1?: string, icon2?: string, color2?: string): void {
    if (icon1 !== undefined) this.statusIcon1.icon = icon1;
    if (color1 !== undefined) this.statusIcon1.color = color1;
    if (icon2 !== undefined) this.statusIcon2.icon = icon2;
    if (color2 !== undefined) this.statusIcon2.color = color2;
    this.setStoreValue('statusIcons', { first: this.statusIcon1, second: this.statusIcon2 }).catch(this.error);
    this.sendStatusUpdate();
  }

  controlSlot(entityId: string): ControlSlot | undefined {
    const page = (this.pages as any)[this.currentPageId || 'active'];
    const slot = Object.values(page?.slots || {}).find((s: any) => s && [s.id, s.name, s.target].includes(entityId)) as any;
    return slot;
  }

  slotBinding(entityId: string): Binding | undefined {
    const page = (this.pages as any)[this.currentPageId || 'active'];
    const slot = Object.values(page?.slots || {}).find((s: any) => s && [s.id, s.name, s.target].includes(entityId)) as any;
    return slot?.binding;
  }

  slotSupports(entityId: string, capabilityId: string): boolean {
    const binding = this.slotBinding(entityId);
    if (!binding || binding.source !== 'homey') return true;
    return !!this.bindingService().capability?.(binding, capabilityId);
  }

  playBuzzer(count: number = 1, duration: number = 1, pause: number = 1): void {
    this.sendCmnd('Buzzer', `${count},${duration},${pause}`);
  }

  handleAlarmAction(action: string, pin?: string): Promise<void> {
    return this.getPageManager().handleAlarmAction(action, pin);
  }

  flowPopupState(entityId: string, popupKind: PopupKind, customState?: any): any {
    return this.getPopupManager().flowPopupState(entityId, popupKind, customState);
  }

  popupBinding(entityId: string, kind: PopupKind): Binding | undefined {
    return this.getPopupManager().popupBinding(entityId, kind);
  }

  applyPopupSource<K extends PopupKind>(kind: K, state: PopupStates[K], binding?: Binding): void {
    this.getPopupManager().applyPopupSource(kind, state, binding);
  }

  enumOptions(binding: Binding, capabilityId: string): { id: string; label: string }[] {
    return this.getPopupManager().enumOptions(binding, capabilityId);
  }

  thermoBinding(entityId: string): Binding | undefined {
    return this.getPopupManager().thermoBinding(entityId);
  }

  selectOptions(entityId: string): { id: string; label: string }[] | undefined {
    return this.getPopupManager().selectOptions(entityId);
  }

  generateFanPopup(options: Page.FanPopupOptions): string {
    return this.getPopupManager().generateFanPopup(options);
  }

  generateSelectPopup(options: Page.InputSelectPopupOptions): string {
    return this.getPopupManager().generateSelectPopup(options);
  }

  sendBoundSelectUpdate(entityId: string): void {
    this.getPopupManager().sendBoundSelectUpdate(entityId);
  }

  sendBoundFanUpdate(entityId: string): void {
    this.getPopupManager().sendBoundFanUpdate(entityId);
  }

  async onAlarmCapabilityChanged(value: string): Promise<void> {
    return this.getPageManager().onAlarmCapabilityChanged(value);
  }

  async setAlarmState(state: string): Promise<void> {
    return this.getPageManager().setAlarmState(state);
  }

  async handleFanInteraction(entityId: string, buttonType: string, value: string): Promise<boolean> {
    return this.getPopupManager().handleFanInteraction(entityId, buttonType, value);
  }

  async handleThermoInteraction(entityId: string, buttonType: string, value: string): Promise<boolean> {
    return this.getPopupManager().handleThermoInteraction(entityId, buttonType, value);
  }

  async handleSelectInteraction(entityId: string, buttonType: string, value: string): Promise<boolean> {
    return this.getPopupManager().handleSelectInteraction(entityId, buttonType, value);
  }

  get timerController(): any {
    return this.getPopupManager().timerController;
  }

  ensureTimerTicking(): void {
    if (this.timerInterval !== undefined) return;
    this.timerInterval = this.homey.setInterval(() => {
      this.getPopupManager().timerController.tick();
    }, 1000);
  }

  stopTimerTicking(): void {
    if (this.timerInterval !== undefined) {
      this.homey.clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
  }

  tickTimer(): void {
    this.getPopupManager().timerController.tick();
  }

  shutterSupports(entityId: string, action: string): boolean {
    return this.getPopupManager().shutterSupports(entityId, action);
  }

  async moveShutter(entityId: string, action: 'up' | 'down'): Promise<void> {
    return this.getPopupManager().moveShutter(entityId, action);
  }

  async openLightPopup(entityId: string = 'light', customState?: any, sendPageCmd: boolean = true): Promise<void> {
    return this.getPopupManager().openLightPopup(entityId, customState, sendPageCmd);
  }

  sendLightUpdate(entityId: string): void {
    this.getPopupManager().sendLightUpdate(entityId);
  }

  async setLightState(entityId: string, customState: any): Promise<void> {
    return this.getPopupManager().setLightState(entityId, customState);
  }

  async openShutterPopup(entityId: string = 'shutter', customState?: any, sendPageCmd: boolean = true): Promise<void> {
    return this.getPopupManager().openShutterPopup(entityId, customState, sendPageCmd);
  }

  sendShutterUpdate(entityId: string): void {
    this.getPopupManager().sendShutterUpdate(entityId);
  }

  async setShutterState(entityId: string, customState: any): Promise<void> {
    return this.getPopupManager().setShutterState(entityId, customState);
  }

  async openFanPopup(entityId: string = 'fan', customState?: any, sendPageCmd: boolean = true): Promise<void> {
    return this.getPopupManager().openFanPopup(entityId, customState, sendPageCmd);
  }

  sendFanUpdate(entityId: string): void {
    this.getPopupManager().sendFanUpdate(entityId);
  }

  async setFanState(entityId: string, customState: any): Promise<void> {
    return this.getPopupManager().setFanState(entityId, customState);
  }

  async openSelectPopup(entityId: string = 'select', customState?: any, sendPageCmd: boolean = true): Promise<void> {
    return this.getPopupManager().openSelectPopup(entityId, customState, sendPageCmd);
  }

  sendSelectUpdate(entityId: string): void {
    this.getPopupManager().sendSelectUpdate(entityId);
  }

  async setSelectState(entityId: string, customState: any): Promise<void> {
    return this.getPopupManager().setSelectState(entityId, customState);
  }

  async openTimerPopup(entityId: string = 'timer', customState?: any, sendPageCmd: boolean = true): Promise<void> {
    return this.getPopupManager().openTimerPopup(entityId, customState, sendPageCmd);
  }

  sendTimerUpdate(entityId: string): void {
    this.getPopupManager().sendTimerUpdate(entityId);
  }

  async controlTimer(entityId: string, action: string, minutes?: number | string, seconds?: number | string): Promise<void> {
    return this.getPopupManager().controlTimer(entityId, action, minutes, seconds);
  }

  updateTimerSlotDisplay(entityId: string, state: TimerState, customText?: string): void {
    this.getPopupManager().updateTimerSlotDisplay(entityId, state, customText);
  }

  async openThermoPopup(entityId: string = 'thermo', customState?: any, sendPageCmd: boolean = true): Promise<void> {
    return this.getPopupManager().openThermoPopup(entityId, customState, sendPageCmd);
  }

  sendThermoUpdate(entityId: string): void {
    this.getPopupManager().sendThermoUpdate(entityId);
  }

  async setThermoState(entityId: string, customState: any): Promise<void> {
    return this.getPopupManager().setThermoState(entityId, customState);
  }
}

export default NSPanelDevice;
module.exports = NSPanelDevice;
