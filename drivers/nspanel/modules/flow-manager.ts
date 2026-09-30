'use strict';

import Homey from 'homey';
import type { NSPanelDevice } from '../device';
import { powerWatts, powerSpeed } from '../../../lib/power';
import { Weather } from '../../../lib/weather';
const { DateTime } = require('luxon');
import { Page } from '../../../lib/page';

export class FlowManager {
  private device: NSPanelDevice;

  constructor(device: NSPanelDevice) {
    this.device = device;
  }

  private registerAction(id: string, handler: (this: NSPanelDevice, args: any) => Promise<any>) {
    try {
      this.device.homey.flow.getActionCard(id).registerRunListener(async (args: any) => {
        if (!args.device) throw new Error('NSPanel device is required');
        return handler.call(args.device, args);
      });
    } catch {
      // Action card not registered in app manifest, skip silently
    }
  }

  public registerTriggersAndConditions(): void {
    const d = this.device as any;
    const flow = d.homey.flow;

    d.switchChangedTrigger = flow.getDeviceTriggerCard('switch_changed');
    d.onlineStatusChangedTrigger = flow.getDeviceTriggerCard('online_status_changed');
    d.pageChangedTrigger = flow.getDeviceTriggerCard('page_changed');
    d.enterScreensaverTrigger = flow.getDeviceTriggerCard('enter_screensaver');
    d.exitScreensaverTrigger = flow.getDeviceTriggerCard('exit_screensaver');

    try { d.screenButtonPressedTrigger = flow.getDeviceTriggerCard('screen_button_pressed'); } catch {}
    try { d.screenSwitchToggledTrigger = flow.getDeviceTriggerCard('screen_switch_toggled'); } catch {}
    try { d.mediaActionPressedTrigger = flow.getDeviceTriggerCard('media_action_pressed'); } catch {}
    try { d.alarmActionTriggeredTrigger = flow.getDeviceTriggerCard('alarm_action_triggered'); } catch {}
    try { d.alarmPinFailedTrigger = flow.getDeviceTriggerCard('alarm_pin_failed'); } catch {}
    try { d.notificationButtonClickedTrigger = flow.getDeviceTriggerCard('notification_button_clicked'); } catch {}
    try { d.thermostatSetpointChangedTrigger = flow.getDeviceTriggerCard('thermostat_setpoint_changed'); } catch {}
    try { d.thermostatModeChangedTrigger = flow.getDeviceTriggerCard('thermostat_mode_changed'); } catch {}
    try { d.screenWokeUpTrigger = flow.getDeviceTriggerCard('screen_woke_up'); } catch {}
    try { d.fanActionTrigger = flow.getDeviceTriggerCard('fan_action_triggered'); } catch {}
    try { d.selectActionTrigger = flow.getDeviceTriggerCard('select_action_triggered'); } catch {}
    try { d.lightActionTrigger = flow.getDeviceTriggerCard('light_action_triggered'); } catch {}
    try { d.timerFinishedTrigger = flow.getDeviceTriggerCard('timer_finished_triggered'); } catch {}
    try { d.timerActionTrigger = flow.getDeviceTriggerCard('timer_action_triggered'); } catch {}
    try { d.shutterActionTrigger = flow.getDeviceTriggerCard('shutter_action_triggered'); } catch {}
    try { d.nightModeChangedTrigger = flow.getDeviceTriggerCard('night_mode_changed'); } catch {}

    try {
      d.physicalButtonPressedTrigger = flow.getDeviceTriggerCard('physical_button_pressed');
      d.physicalButtonPressedTrigger.registerRunListener(async (args: any, state: any) => {
        if (args.button && args.button !== 'any' && String(args.button) !== String(state.button)) {
          return false;
        }
        if (args.action && args.action !== 'any' && args.action.toLowerCase() !== String(state.action).toLowerCase()) {
          return false;
        }
        return true;
      });
    } catch {}

    // Conditions
    try {
      flow.getConditionCard('is_online').registerRunListener(async (args: any) => {
        const dev = (args?.device as NSPanelDevice) || d;
        return dev.getAvailable();
      });
    } catch {}

    try {
      flow.getConditionCard('screensaver_is_active').registerRunListener(async (args: any) => {
        const dev = (args?.device as NSPanelDevice) || d;
        return (dev as any).screensaverActive;
      });
    } catch {}

    try {
      flow.getConditionCard('current_page_is').registerRunListener(async (args: any) => {
        const dev = (args?.device as NSPanelDevice) || d;
        if (!(dev as any).currentPageType) return false;
        return (dev as any).currentPageType === args.page;
      });
    } catch {}

    try {
      flow.getConditionCard('is_night_mode').registerRunListener(async (args: any) => {
        const dev = (args?.device as NSPanelDevice) || d;
        return !!(dev as any).nightModeActive;
      });
    } catch {}
  }

  public registerActions(): void {
    const parse1Decimal = (val: any): number | undefined => {
      if (val === undefined || val === null || val === '') return undefined;
      const num = typeof val === 'number' ? val : parseFloat(String(val));
      return !Number.isFinite(num) ? undefined : parseFloat(num.toFixed(1));
    };


    // 1. Show Grid Page
    this.registerAction('show_grid_page_action', async function (this: NSPanelDevice, args: any) {
      const isGrid2 = args.grid_type === 'grid2';
      const pageType = isGrid2 ? Page.Type.grid2 : Page.Type.grid;
      const nav: Page.Navigation = {
        leading: args.prev_target ? { target: args.prev_target } : undefined,
        trailing: args.next_target ? { target: args.next_target } : undefined,
      };

      const page = this.getOrCreatePage('active', pageType);
      page.type = pageType;
      page.title = args.title || 'Grid';
      page.navigation = nav;

      await this.renderAndDisplayPage(page);
      return true;
    });

    // 2. Set Grid Slot
    this.registerAction('set_grid_slot_action', async function (this: NSPanelDevice, args: any) {
      const slotNum = parseInt(args.slot, 10) || 1;
      const page = this.getOrCreatePage('active', Page.Type.grid);

      page.slots[slotNum] = {
        type: Page.stringToEntityType(args.action_type),
        name: args.entity_id || `slot_${slotNum}`,
        title: args.title || '',
        icon: args.icon || 'lightbulb',
        color: args.color || 'white',
        value: args.value,
        target: args.action_type === 'navigate' ? args.entity_id : undefined
      };

      if (!this.screensaverActive && (this.currentPageType === Page.Type.grid || this.currentPageType === Page.Type.grid2)) {
        await this.renderAndDisplayPage(page, false);
      }
      return true;
    });

    // 3. Show Entities Page
    this.registerAction('show_entities_page_action', async function (this: NSPanelDevice, args: any) {
      const nav: Page.Navigation = {
        leading: args.prev_target ? { target: args.prev_target } : undefined,
        trailing: args.next_target ? { target: args.next_target } : undefined,
      };

      const page = this.getOrCreatePage('active', Page.Type.entities);
      page.type = Page.Type.entities;
      page.title = args.title || 'Entities';
      page.navigation = nav;

      await this.renderAndDisplayPage(page);
      return true;
    });

    // 4. Set Entity Slot
    this.registerAction('set_entity_slot_action', async function (this: NSPanelDevice, args: any) {
      const slotNum = parseInt(args.slot, 10) || 1;
      const page = this.getOrCreatePage('active', Page.Type.entities);

      page.slots[slotNum] = {
        type: Page.stringToEntityType(args.entity_type),
        name: args.entity_id || `slot_${slotNum}`,
        title: args.title || '',
        icon: args.icon || 'circle',
        color: args.color || 'white',
        value: args.value,
      };

      if (!this.screensaverActive && this.currentPageType === Page.Type.entities) {
        await this.renderAndDisplayPage(page, false);
      }
      return true;
    });

    // 5. Update Slot Value
    this.registerAction('update_slot_value_action', async function (this: NSPanelDevice, args: any) {
      const slotNum = parseInt(args.slot, 10) || 1;
      const page = this.getOrCreatePage(args.page || 'active', this.currentPageType);

      if (!page.slots[slotNum]) {
        page.slots[slotNum] = { type: Page.EntityType.text, name: `slot_${slotNum}` };
      }

      if (args.value !== undefined) {
        page.slots[slotNum].value = args.value;
        delete page.slots[slotNum].val;
      }
      if (args.title) {
        page.slots[slotNum].title = args.title;
      }
      if (args.icon) {
        page.slots[slotNum].icon = args.icon;
      }
      if (args.color) {
        page.slots[slotNum].color = args.color;
      }

      if (!this.popupActive && !this.screensaverActive && page === this.pages[this.currentPageId]) {
        await this.renderAndDisplayPage(page, false);
      }
      return true;
    });

    // 6. Show Thermostat Page
    this.registerAction('show_thermostat_page_action', async function (this: NSPanelDevice, args: any) {
      this.temp_current = args.current_temp !== undefined ? args.current_temp : this.temp_current;
      this.temp_setpoint = args.target_temp !== undefined ? args.target_temp : this.temp_setpoint;

      const nav: Page.Navigation = {
        leading: args.prev_target ? { target: args.prev_target } : undefined,
        trailing: args.next_target ? { target: args.next_target } : undefined,
      };

      const metric = this.homey.i18n.getUnits() === 'metric';
      const cmd = Page.GenerateThermo(
        JSON.stringify({ title: args.title || 'Thermostat', navigation: nav }),
        this.temp_current,
        this.temp_setpoint,
        args.min_temp ?? 15,
        args.max_temp ?? 32,
        args.temp_step ?? 0.5,
        metric
      );

      if (cmd) {
        await this.setPage(Page.Type.thermostat);
        this.currentOptions = cmd;
        this.sendCmnd('CustomSend', cmd);
      }
      return true;
    });

    // 7. Show Media Page
    this.registerAction('show_media_page_action', async function (this: NSPanelDevice, args: any) {
      const nav: Page.Navigation = {
        leading: args.prev_target ? { target: args.prev_target } : undefined,
        trailing: args.next_target ? { target: args.next_target } : undefined,
      };

      const mediaOpts = {
        title: args.card_title || 'Media Player',
        navigation: nav,
        media: {
          author: args.artist || '',
          title: args.title || '',
        },
        volume: args.volume !== undefined ? args.volume : 50,
        paused: args.state === 'paused',
        onoff: args.state !== 'off',
        shuffle: args.shuffle === 'on' ? true : (args.shuffle === 'off' ? false : undefined)
      };

      const cmd = Page.GenerateMedia(JSON.stringify(mediaOpts));
      if (cmd) {
        await this.setPage(Page.Type.media);
        this.currentOptions = cmd;
        this.sendCmnd('CustomSend', cmd);
      }
      return true;
    });

    // 8. Show QR Code Page
    this.registerAction('show_qr_page_action', async function (this: NSPanelDevice, args: any) {
      const nav: Page.Navigation = {
        leading: args.prev_target ? { target: args.prev_target } : undefined,
        trailing: args.next_target ? { target: args.next_target } : undefined,
      };

      const entities: Page.Entity[] = [];
      if (args.line1_title || args.line1_val) {
        entities.push({ type: 'text', title: args.line1_title, value: args.line1_val, icon: 'wifi' });
      }
      if (args.line2_title || args.line2_val) {
        entities.push({ type: 'text', title: args.line2_title, value: args.line2_val, icon: 'key' });
      }

      const qrOpts = {
        title: args.title || 'QR Code',
        qrcode: args.qrcode || '',
        navigation: nav,
        entities: entities
      };

      const cmd = Page.GenerateQRCode(JSON.stringify(qrOpts));
      if (cmd) {
        await this.setPage(Page.Type.qrcode);
        this.currentOptions = cmd;
        this.sendCmnd('CustomSend', cmd);
      }
      return true;
    });

    // 9. Show Power Page
    this.registerAction('show_power_page_action', async function (this: NSPanelDevice, args: any) {
      const pageId = 'power';
      const nav: Page.Navigation = {
        leading: args.prev_target ? { target: args.prev_target } : undefined,
        trailing: args.next_target ? { target: args.next_target } : undefined,
      };

      const existingPage = this.pages[pageId] || {
        type: Page.Type.power,
        title: args.title || 'Power Flow',
        navigation: nav,
        slots: {},
        rawOptions: {
          title: args.title || 'Power Flow',
          home: {
            title: args.home_title || 'Home',
            icon: args.home_icon || 'home',
            color: args.home_color || 'white',
            consumption: args.home_power || ''
          },
          nodes: [{}, {}, {}, {}, {}, {}]
        }
      };

      if (!existingPage.rawOptions) existingPage.rawOptions = {};
      let opts: any;
      if (typeof existingPage.rawOptions === 'string') {
        try { opts = JSON.parse(existingPage.rawOptions); } catch { opts = {}; }
      } else {
        opts = existingPage.rawOptions;
      }
      if (args.title) opts.title = args.title;
      opts.navigation = nav;
      if (!opts.home) opts.home = {};
      if (args.home_power !== undefined) opts.home.consumption = args.home_power;
      if (args.home_title) opts.home.title = args.home_title;
      if (args.home_icon) opts.home.icon = args.home_icon;
      if (args.home_color) opts.home.color = args.home_color;
      if (!opts.nodes) opts.nodes = [{}, {}, {}, {}, {}, {}];

      existingPage.title = opts.title;
      existingPage.navigation = nav;
      existingPage.rawOptions = opts;
      this.pages[pageId] = existingPage;

      this.currentPageId = pageId;
      await this.renderAndDisplayPage(existingPage, true);
      return true;
    });

    // 10. Update Power Node
    this.registerAction('update_power_node_action', async function (this: NSPanelDevice, args: any) {
      const pageId = (args.page && args.page.trim()) ? args.page.trim() : (this.pages['power'] ? 'power' : (this.currentPageId || 'active'));
      let page = this.pages[pageId];
      if (!page) {
        page = {
          type: Page.Type.power,
          title: 'Power Flow',
          slots: {},
          rawOptions: {
            title: 'Power Flow',
            home: { title: 'Home', icon: 'home', color: 'white', consumption: '' },
            nodes: [{}, {}, {}, {}, {}, {}]
          }
        };
        this.pages[pageId] = page;
      }

      let opts: any;
      if (typeof page.rawOptions === 'string') {
        try { opts = JSON.parse(page.rawOptions); } catch { opts = {}; }
      } else {
        opts = page.rawOptions || {};
      }
      if (!opts.home) opts.home = { title: 'Home', icon: 'home', color: 'white', consumption: '' };
      if (!opts.nodes || !Array.isArray(opts.nodes)) opts.nodes = [{}, {}, {}, {}, {}, {}];
      while (opts.nodes.length < 6) opts.nodes.push({});

      const targetNode = args.node || 'home';
      const powerStr = args.power_text !== undefined ? String(args.power_text).trim() : '';

      if (targetNode === 'home') {
        opts.home.consumption = powerStr;
        if (args.title) opts.home.title = args.title;
        if (args.icon) opts.home.icon = args.icon;
        if (args.color) opts.home.color = args.color;
      } else {
        const nodeIndex = parseInt(targetNode.replace('node', ''), 10) - 1;
        if (nodeIndex >= 0 && nodeIndex < 6) {
          const node = opts.nodes[nodeIndex] || {};
          node.consumption = powerStr;
          if (args.title) node.title = args.title;
          if (args.icon) node.icon = args.icon;
          if (args.color) node.color = args.color;

          const speedVal = powerSpeed(powerWatts(powerStr), args.speed, args.flow_direction || 'auto');
          node.speed = speedVal;
          node.autoSpeed = typeof args.speed !== 'number' || args.speed === 0;
          node.flowDirection = args.flow_direction || 'auto';
          opts.nodes[nodeIndex] = node;
        }
      }

      page.rawOptions = opts;
      this.pages[pageId] = page;

      if (!this.popupActive && !this.screensaverActive && this.currentPageId === pageId) {
        await this.renderAndDisplayPage(page, false);
      }
      return true;
    });

    // 11. Show Notification
    this.registerAction('show_notification_action', async function (this: NSPanelDevice, args: any) {
      await this.showFlowNotification(args);
      return true;
    });

    // 12. Play Buzzer Beep
    this.registerAction('play_buzzer_action', async function (this: NSPanelDevice, args: any) {
      const type = args.sound_type || 'beep';
      switch (type) {
        case 'double_beep':
          this.playBuzzer(2, 2, 3);
          break;
        case 'triple_beep':
          this.playBuzzer(3, 2, 2);
          break;
        case 'warning':
          this.playBuzzer(5, 1, 1);
          break;
        case 'alarm':
          this.playBuzzer(10, 2, 2);
          break;
        case 'beep':
        default:
          this.playBuzzer(1, 2, 2);
          break;
      }
      return true;
    });

    // 13. Wake Up Screen
    this.registerAction('wake_screen_action', async function (this: NSPanelDevice, args: any) {
      if (this.screensaverActive) {
        await this.exitScreensaver();
      } else {
        this.dimmed = false;
        this.updateBrightness(false);
        this.updateSleepTimer();
      }

      if (args.target_page && args.target_page.trim()) {
        await this.navigateToPage(args.target_page.trim());
      }
      return true;
    });

    // 14. Set Screensaver Weather
    this.registerAction('set_screensaver_weather_action', async function (this: NSPanelDevice, args: any) {
      const wType = Weather.string_toType(args.weather_type) ?? Weather.Type.sunny;
      const tempVal = parse1Decimal(args.temperature);
      this.flowOutdoorTemperature = tempVal;
      if (!this.weather) {
        this.weather = {
          day0: { day: undefined, type: wType, temperature: tempVal },
          day1: undefined,
          day2: undefined,
          day3: undefined
        };
      } else {
        if (!this.weather.day0) {
          this.weather.day0 = { day: undefined, type: wType, temperature: tempVal };
        } else {
          this.weather.day0.type = wType;
          this.weather.day0.temperature = tempVal;
        }
      }

      const inTemp = parse1Decimal(args.indoor_temperature);
      if (inTemp !== undefined) {
        this.indoorTemperature = inTemp;
      }

      this.weatherUpdate();
      return true;
    });

    // 15. Set Screensaver Forecast Day
    this.registerAction('set_screensaver_forecast_day_action', async function (this: NSPanelDevice, args: any) {
      const wType = Weather.string_toType(args.weather_type) ?? Weather.Type.sunny;
      const targetSlot = args.day_index || 'day1';
      let dayName = args.day_name ? args.day_name.trim() : undefined;

      if (!dayName) {
        const offsetDays = /^[1-5]$/.test(targetSlot.slice(3)) ? Number(targetSlot.slice(3)) : 1;
        const dt = DateTime.now().setZone(this.homey.clock.getTimezone()).plus({ days: offsetDays });
        dayName = dt.weekdayShort;
      }

      const dayObj: Weather.Day = {
        day: dayName,
        type: wType,
        temperature: parse1Decimal(args.temperature)
      };

      if (!this.weather) {
        this.weather = { day0: undefined, day1: undefined, day2: undefined, day3: undefined };
      }

      if (targetSlot === 'day1') this.weather.day1 = dayObj;
      else if (targetSlot === 'day2') this.weather.day2 = dayObj;
      else if (targetSlot === 'day3') this.weather.day3 = dayObj;
      else if (targetSlot === 'day4') this.weather.day4 = dayObj;
      else if (targetSlot === 'day5') this.weather.day5 = dayObj;

      this.weatherUpdate();
      return true;
    });

    // 16. Update Forecast (JSON / OWM)
    this.registerAction('update_forecast_action', async function (this: NSPanelDevice, args: any) {
      try {
        const parsed = Weather.parse(args.json, this.homey.clock.getTimezone());
        if (!parsed) throw new Error('Invalid weather JSON');
        this.weather = parsed;
        this.flowOutdoorTemperature = parsed.day0?.temperature;
        this.weatherUpdate();
      } catch (err) {
        throw err;
      }
      return true;
    });

    this.registerAction('update_forecast_owm_action', async function (this: NSPanelDevice, args: any) {
      try {
        const parsed = Weather.parse_owm(args.json, this.homey.clock.getTimezone());
        if (!parsed) throw new Error('Invalid OpenWeather JSON');
        this.weather = parsed;
        this.flowOutdoorTemperature = parsed.day0?.temperature;
        this.weatherUpdate();
      } catch (err) {
        throw err;
      }
      return true;
    });

    // 17. Update Indoor / Outdoor Temp
    this.registerAction('update_indoor_temperature_action', async function (this: NSPanelDevice, args: any) {
      this.indoorTemperature = parse1Decimal(args.temperature);
      this.weatherUpdate();
      return true;
    });

    this.registerAction('update_outdoor_temperature_action', async function (this: NSPanelDevice, args: any) {
      const tempVal = parse1Decimal(args.temperature);
      this.flowOutdoorTemperature = tempVal;
      if (!this.weather) {
        this.weather = { day0: { day: undefined, type: undefined, temperature: tempVal }, day1: undefined, day2: undefined, day3: undefined };
      } else if (!this.weather.day0) {
        this.weather.day0 = { day: undefined, type: undefined, temperature: tempVal };
      } else {
        this.weather.day0.temperature = tempVal;
      }
      this.weatherUpdate();
      return true;
    });

    // 18. Set Page
    this.registerAction('set_page_action', async function (this: NSPanelDevice, args: any) {
      const targetPage = args.page || 'screensaver';
      if (typeof (this as any).navigateToPage === 'function') {
        await (this as any).navigateToPage(targetPage);
      }
      return true;
    });

    // 19. Set Relay
    this.registerAction('set_relay_action', async function (this: NSPanelDevice, args: any) {
      const dev = (args?.device as NSPanelDevice) || this;
      const relayNum = parseInt(args.relay, 10) || 1;
      let cmd = 'TOGGLE';
      if (args.state === 'on') cmd = 'ON';
      else if (args.state === 'off') cmd = 'OFF';
      dev.sendCmnd(`Power${relayNum}`, cmd);
      return true;
    });

    // 20. Update Page Config (Raw JSON)
    this.registerAction('update_page_config_action', async function (this: NSPanelDevice, args: any) {
      if (!args.config) return true;
      let opts = '';

      if (this.currentPageType === Page.Type.qrcode) opts = Page.GenerateQRCode(args.config) ?? '';
      else if (this.currentPageType === Page.Type.media) opts = Page.GenerateMedia(args.config) ?? '';
      else if (this.currentPageType === Page.Type.power) opts = Page.GeneratePower(args.config) ?? '';
      else if (this.currentPageType === Page.Type.entities) opts = Page.GenerateEntities(args.config) ?? '';
      else if (this.currentPageType === Page.Type.grid) opts = Page.GenerateGrid(args.config, false) ?? '';
      else if (this.currentPageType === Page.Type.grid2) opts = Page.GenerateGrid(args.config, true) ?? '';
      else if (this.currentPageType === Page.Type.alarm) opts = Page.GenerateAlarm(args.config) ?? '';
      else if (this.currentPageType === Page.Type.thermostat) {
        const settings = this.getSettings();
        opts = Page.GenerateThermo(args.config, this.temp_current, this.temp_setpoint, settings['temp_min'], settings['temp_max'], settings['temp_step'], this.homey.i18n.getUnits() === 'metric') ?? '';
      }

      if (opts !== '') {
        this.currentOptions = opts;
        if (!this.screensaverActive) {
          this.sendCmnd('CustomSend', opts);
        }
      }
      return true;
    });

    // 21. Set Brightness & Standby
    this.registerAction('set_brightness', async function (this: NSPanelDevice, args: any) {
      if (args.brightness !== undefined && args.brightness !== null && !isNaN(Number(args.brightness))) {
        this.customBrightness = Math.max(1, Math.min(100, Number(args.brightness)));
      }
      if (args.sleep_brightness !== undefined && args.sleep_brightness !== null && !isNaN(Number(args.sleep_brightness))) {
        this.customSleepBrightness = Math.max(0, Math.min(100, Number(args.sleep_brightness)));
      }
      this.updateBrightness(this.dimmed);
      return true;
    });

    // 22. Show Alarm Page
    this.registerAction('show_alarm_page_action', async function (this: NSPanelDevice, args: any) {
      const state = args.state || 'disarmed';
      this.alarmState = state;
      const isArmed = state !== 'disarmed';
      const disableNav = this.getSetting('disable_nav_when_armed');

      const nav: Page.Navigation = {
        leading: (!disableNav || !isArmed) && args.prev_target ? { target: args.prev_target } : undefined,
        trailing: (!disableNav || !isArmed) && args.next_target ? { target: args.next_target } : undefined,
      };

      const alarmOpts = {
        title: args.title || 'Alarm',
        navigation: nav,
        state: state,
        pin_required: args.pin_required === 'yes'
      };

      const cmd = Page.GenerateAlarm(JSON.stringify(alarmOpts));
      if (cmd) {
        this.currentPageType = Page.Type.alarm;
        await this.setPage(Page.Type.alarm, true);
        this.currentOptions = cmd;
        this.sendCmnd('CustomSend', cmd);
      }
      return true;
    });

    // 23. Set Alarm State
    this.registerAction('set_alarm_state_action', async function (this: NSPanelDevice, args: any) {
      if (args.state) {
        await this.setAlarmState(args.state);
      }
      return true;
    });

    // 24. Set Screensaver Status Icon
    this.registerAction('set_screensaver_status_icon_action', async function (this: NSPanelDevice, args: any) {
      const dev = (args?.device as NSPanelDevice) || this;
      const slot = parseInt(args.slot, 10) || 1;
      const icon = args.icon ? String(args.icon).trim() : '';
      const color = args.color ? String(args.color).trim() : 'white';
      if (slot === 1) {
        dev.setStatusIcons(icon, color, undefined, undefined);
      } else {
        dev.setStatusIcons(undefined, undefined, icon, color);
      }
      return true;
    });

    // 25. Show Chart Page
    this.registerAction('show_chart_page_action', async function (this: NSPanelDevice, args: any) {
      const pageId = 'chart';
      const nav: Page.Navigation = {
        leading: args.prev_target ? { target: args.prev_target } : undefined,
        trailing: args.next_target ? { target: args.next_target } : undefined,
      };

      const existingPage = this.pages[pageId] || {
        type: Page.Type.chart,
        title: args.title || 'Chart',
        navigation: nav,
        slots: {},
        rawOptions: {}
      };

      const opts: any = typeof existingPage.rawOptions === 'string'
        ? (() => { try { return JSON.parse(existingPage.rawOptions as string); } catch { return {}; } })()
        : { ...(existingPage.rawOptions || {}) };

      if (args.title) opts.title = args.title;
      opts.navigation = nav;
      if (args.chart_type) opts.chartType = args.chart_type;
      if (args.unit !== undefined) opts.yAxisLabel = args.unit;
      if (args.color) opts.color = args.color;
      if (args.ticks) opts.yAxisTicks = args.ticks;
      if (args.data !== undefined) opts.values = args.data;

      existingPage.title = opts.title || 'Chart';
      existingPage.navigation = nav;
      existingPage.type = Page.Type.chart;
      existingPage.rawOptions = opts;
      this.pages[pageId] = existingPage;

      this.currentPageId = pageId;
      await this.renderAndDisplayPage(existingPage, true);
      return true;
    });

    // 26. Push Chart Value / Update Chart Data
    this.registerAction('push_chart_value_action', async function (this: NSPanelDevice, args: any) {
      const pageId = (args.page && args.page.trim()) ? args.page.trim() : (this.pages['chart'] ? 'chart' : (this.currentPageId || 'active'));
      let page = this.pages[pageId];
      if (!page) {
        page = {
          type: Page.Type.chart,
          title: 'Chart',
          slots: {},
          rawOptions: {}
        };
        this.pages[pageId] = page;
      }

      let opts = typeof page.rawOptions === 'string'
        ? (() => { try { return JSON.parse(page.rawOptions as string); } catch { return {}; } })()
        : { ...(page.rawOptions || {}) };

      const isLineChart = opts.chartType === 'line' || opts.type === 'line' || opts.type === 'cardLChart';
      const isBarChart = !isLineChart;

      const scale = (typeof args.scale === 'number' && args.scale > 0) ? args.scale : 1;
      const rawVal = typeof args.value === 'number' ? args.value : parseFloat(String(args.value || 0));

      const label = (args.label !== undefined && String(args.label).trim() !== '') ? String(args.label).trim() : undefined;
      const x = (args.x !== undefined && args.x !== '' && !isNaN(Number(args.x))) ? Number(args.x) : undefined;

      const currentValues = opts.values ?? opts.data ?? [];
      const updatedValues = Page.shiftChartValues(currentValues, rawVal, { label, x, scale, isBarChart });

      opts.values = updatedValues;
      page.rawOptions = opts;
      this.pages[pageId] = page;

      if (!this.popupActive && !this.screensaverActive && this.currentPageId === pageId) {
        await this.renderAndDisplayPage(page, false);
      }
      return true;
    });

    this.registerAction('update_chart_data_action', async function (this: NSPanelDevice, args: any) {
      const pageId = (args.page && args.page.trim()) ? args.page.trim() : (this.pages['chart'] ? 'chart' : (this.currentPageId || 'active'));
      let page = this.pages[pageId];
      if (!page) {
        page = {
          type: Page.Type.chart,
          title: 'Chart',
          slots: {},
          rawOptions: {}
        };
        this.pages[pageId] = page;
      }

      let opts = typeof page.rawOptions === 'string'
        ? (() => { try { return JSON.parse(page.rawOptions as string); } catch { return {}; } })()
        : { ...(page.rawOptions || {}) };

      if (args.data !== undefined) opts.values = args.data;
      if (args.unit !== undefined) opts.yAxisLabel = args.unit;
      if (args.ticks !== undefined) opts.yAxisTicks = args.ticks;

      page.rawOptions = opts;
      this.pages[pageId] = page;

      if (!this.popupActive && !this.screensaverActive && this.currentPageId === pageId) {
        await this.renderAndDisplayPage(page, false);
      }
      return true;
    });

    // 27. Show Popups (Light, Shutter, Fan, Select, Timer, Thermo)
    this.registerAction('show_light_popup_action', async function (this: NSPanelDevice, args: any) {
      const entityId = (args.entity && args.entity.trim()) ? args.entity.trim() : 'light';
      await this.openLightPopup(entityId, args);
      return true;
    });

    this.registerAction('show_shutter_popup_action', async function (this: NSPanelDevice, args: any) {
      const entityId = (args.entity && args.entity.trim()) ? args.entity.trim() : 'shutter';
      await this.openShutterPopup(entityId, args);
      return true;
    });

    this.registerAction('show_fan_popup_action', async function (this: NSPanelDevice, args: any) {
      const entityId = (args.entity && args.entity.trim()) ? args.entity.trim() : 'fan';
      await this.openFanPopup(entityId, args);
      return true;
    });

    this.registerAction('show_select_popup_action', async function (this: NSPanelDevice, args: any) {
      const entityId = (args.entity && args.entity.trim()) ? args.entity.trim() : 'select';
      await this.openSelectPopup(entityId, args);
      return true;
    });

    this.registerAction('show_timer_popup_action', async function (this: NSPanelDevice, args: any) {
      const entityId = (args.entity && args.entity.trim()) ? args.entity.trim() : 'timer';
      await this.openTimerPopup(entityId, args);
      return true;
    });

    this.registerAction('show_thermo_popup_action', async function (this: NSPanelDevice, args: any) {
      const entityId = (args.entity && args.entity.trim()) ? args.entity.trim() : 'thermo';
      await this.openThermoPopup(entityId, args);
      return true;
    });

    // 28. Set Popups States (Light, Shutter, Fan, Select, Timer, Thermo)
    this.registerAction('set_light_state_action', async function (this: NSPanelDevice, args: any) {
      const entityId = (args.entity && args.entity.trim()) ? args.entity.trim() : 'light';
      await this.setLightState(entityId, args);
      return true;
    });

    this.registerAction('set_shutter_state_action', async function (this: NSPanelDevice, args: any) {
      const entityId = (args.entity && args.entity.trim()) ? args.entity.trim() : 'shutter';
      await this.setShutterState(entityId, args);
      return true;
    });

    this.registerAction('set_fan_state_action', async function (this: NSPanelDevice, args: any) {
      const entity = (args.entity && args.entity.trim()) ? args.entity.trim() : (this.activeFanEntity || 'fan');
      await this.setFanState(entity, args);
      const state = this.fanStates.get(entity);
      const page = this.pages[this.currentPageId || 'active'];
      const slot = Object.values(page?.slots || {}).find(slot => slot && [slot.id, slot.name, slot.target].includes(entity));
      if (slot && state) {
        slot.value = state.currentMode || String(state.speed);
        slot.val = state.onoff ? '1' : '0';
      }
      return true;
    });

    this.registerAction('set_select_state_action', async function (this: NSPanelDevice, args: any) {
      const entity = (args.entity && args.entity.trim()) ? args.entity.trim() : (this.activeSelectEntity || 'select');
      await this.setSelectState(entity, args);
      const state = this.selectStates.get(entity);
      const page = this.pages[this.currentPageId || 'active'];
      const slot = Object.values(page?.slots || {}).find(slot => slot && [slot.id, slot.name, slot.target].includes(entity));
      if (slot && state) {
        slot.value = state.currentMode;
        
      }
      return true;
    });

    this.registerAction('set_timer_action', async function (this: NSPanelDevice, args: any) {
      const entityId = (args.entity && args.entity.trim()) ? args.entity.trim() : 'timer';
      await this.controlTimer(entityId, args.action || 'start', args.minutes, args.seconds);
      return true;
    });

    this.registerAction('set_thermo_mode_action', async function (this: NSPanelDevice, args: any) {
      const entityId = (args.entity && args.entity.trim()) ? args.entity.trim() : (this.activeThermoEntity || 'thermo');
      await this.setThermoState(entityId, args);
      return true;
    });

    // 29. Night Mode
    this.registerAction('set_night_mode', async function (this: NSPanelDevice, args: any) {
      const dev = (args?.device as NSPanelDevice) || this;
      const m = String(args.mode || args.state || '').toLowerCase();
      if (m === 'on' || m === 'true' || args.mode === true || args.state === true) {
        dev.manualNightMode = true;
      } else if (m === 'off' || m === 'false' || args.mode === false || args.state === false) {
        dev.manualNightMode = false;
      } else if (m === 'auto') {
        dev.manualNightMode = undefined;
      }
      if (typeof (dev as any).checkNightMode === 'function') {
        (dev as any).checkNightMode();
      }
      return true;
    });

    // 30. Show Unlock Page
    this.registerAction('show_unlock_page', async function (this: NSPanelDevice, args: any) {
      const title = args.title || 'PIN-koodi';
      const destination = args.destination || 'unlock_action';
      const pin = this.getSetting('global_pin') || this.getSetting('alarm_pin') || '1234';
      this.pendingUnlock = {
        type: 'action',
        entityId: destination,
        pin,
        returnPageId: this.currentPageId
      };
      await this.showUnlockScreen(title, destination, pin);
      return true;
    });
  }
}
