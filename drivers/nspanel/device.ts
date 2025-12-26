'use strict';

import Homey from 'homey';
import { NSPanelApp } from '../../app';
import { NSPanelDriver } from './driver';
import { Color } from '../../lib/color';
import { Icon } from '../../lib/icon';
import { Weather } from '../../lib/weather';
import { StatusBarIcon } from '../../lib/statusbar';
import { Page } from '../../lib/page';

const { DateTime } = require('luxon');

export class NSPanelDevice extends Homey.Device {

  values = {};
  updateStatusTimer? : NodeJS.Timer = undefined;
  updateTimeTimer? : NodeJS.Timer = undefined;
  indoorTemperature?: number = undefined;
  weather?: Weather.Forecast = undefined;

  switch1?: boolean = undefined;
  switch2?: boolean = undefined;
  temp_current: number = 0.0;
  temp_setpoint: number = -9999.0;

  switchChangedTrigger?: Homey.FlowCardTriggerDevice = undefined;
  onlineStatusChangedTrigger?: Homey.FlowCardTriggerDevice = undefined;
  pageChangedTrigger?: Homey.FlowCardTriggerDevice = undefined;
  enterScreensaverTrigger?: Homey.FlowCardTriggerDevice = undefined;
  exitScreensaverTrigger?: Homey.FlowCardTriggerDevice = undefined;

  currentPage?: Page.Config = undefined;
  screensaverActive: boolean = true;
  dimmed: boolean = false;
  sleeping: Boolean = false;
  sleepTimer?: NodeJS.Timer = undefined;

  _deviceId? : string = undefined;
  _devicePath? : string = undefined;

  async onInit() {
    let settings = this.getSettings();
    this.log(`Setting: ${JSON.stringify(settings)}`);

    Page.logthis = this.log;

    this.registerCapabilityListener('switch.power1', async (value) => {
      this.switch1 = value;
      this.sendCmnd('Power1', value ? 'ON' : 'OFF'); // Available values contains also TOGGLE
    });

    this.registerCapabilityListener('switch.power2', async (value) => {
      this.switch2 = value;
      this.sendCmnd('Power2', value ? 'ON' : 'OFF'); // Available values contains also TOGGLE
    });

    this.registerCapabilityListener('target_temperature', async (value) => {
      this.temp_setpoint = value;
      this.thermoUpdate();
    });

    this.homey.flow.getConditionCard('is_online').registerRunListener(async (args, state) => {
      return this.getAvailable();
    });

    this.homey.flow.getConditionCard('current_page_is').registerRunListener(async (args, state) => {

      if (this.currentPage === undefined || this.currentPage.page === undefined)
        return false;

      switch(args.page) {
        case 'screensaver': return this.currentPage!.page! === Page.Type.screensaver;
        case "qrcode": return this.currentPage!.page! === Page.Type.qrcode;
        case 'media': return this.currentPage!.page! === Page.Type.media;
        case 'power': return this.currentPage!.page! === Page.Type.power;
        case 'thermo':
        case 'thermostat': return this.currentPage!.page! === Page.Type.thermostat;
      }

      return false;
    });

    this.homey.flow.getConditionCard('screensaver_is_active').registerRunListener(async (args, state) => {
      return this.screensaverActive;
    });

    this.homey.flow.getActionCard('update_indoor_temperature_action').registerRunListener((args, state) => {

      this.indoorTemperature = args.temperature;
      this.weatherUpdate();

      return Promise.resolve(true);
    });

    this.homey.flow.getActionCard('update_outdoor_temperature_action').registerRunListener((args, state) => {

      if (this.weather === undefined)
        this.weather = { day0: { day: undefined, type: Weather.Type.sunny, temperature: undefined }, day1: undefined, day2: undefined, day3: undefined };
      else if (this.weather.day0 === undefined)
        this.weather.day0 = { day: undefined, type: Weather.Type.sunny, temperature: undefined };
      else if (this.weather.day0.type === undefined)
        this.weather.day0.type = Weather.Type.sunny;

      this.weather!.day0!.temperature = args.temperature;

      this.weatherUpdate();
      return Promise.resolve(true);
    });

    this.homey.flow.getActionCard('update_forecast_action').registerRunListener((args, state) => {

      const settings = this.getSettings();

      try {

        const currentOutdoor = this.weather !== undefined && this.weather.day0 !== undefined && this.weather.day0.temperature !== undefined ? this.weather!.day0!.temperature : undefined;
        this.weather = Weather.parse(args.json, this.homey.clock.getTimezone());

        if (settings['outdoor_temperature_from_forecast'] && currentOutdoor !== undefined) {

          if (this.weather === undefined)
            this.weather = { day0: { day: undefined, type: Weather.Type.sunny, temperature: undefined }, day1: undefined, day2: undefined, day3: undefined };
          else if (this.weather.day0 === undefined)
            this.weather.day0 = { day: undefined, type: Weather.Type.sunny, temperature: undefined };
          else if (this.weather.day0.type === undefined)
            this.weather.day0.type = Weather.Type.sunny;

          this.weather!.day0!.temperature = currentOutdoor;
        }

        this.weatherUpdate();

      } catch {
        this.log('failed to parse weather from', args.json);
      }

    });

    this.homey.flow.getActionCard('update_forecast_owm_action').registerRunListener((args, state) => {

      const settings = this.getSettings();
    
      try {
        
        const currentOutdoor = this.weather !== undefined && this.weather.day0 !== undefined && this.weather.day0.temperature !== undefined ? this.weather!.day0!.temperature : undefined;
        this.weather = Weather.parse_owm(args.json, this.homey.clock.getTimezone());
        
        if (settings['outdoor_temperature_from_forecast'] && currentOutdoor !== undefined) {
          
          if (this.weather === undefined)
            this.weather = { day0: { day: undefined, type: Weather.Type.sunny, temperature: undefined }, day1: undefined, day2: undefined, day3: undefined };
          else if (this.weather.day0 === undefined)
            this.weather.day0 = { day: undefined, type: Weather.Type.sunny, temperature: undefined };
          else if (this.weather.day0.type === undefined)
            this.weather.day0.type = Weather.Type.sunny;
          
          this.weather!.day0!.temperature = currentOutdoor;
        }
        
        this.weatherUpdate();
      
      } catch {
        this.log('failed to parse weather from', args.json);
      }

    });

    this.homey.flow.getActionCard('set_page_action').registerRunListener((args, state) => {

      (async () => {
        switch(args.page) {
          case 'screensaver': await this.setPage(Page.Type.screensaver); break;
          case 'qrcode': await this.setPage(Page.Type.qrcode); break;
          case 'media': await this.setPage(Page.Type.media); break;
          case 'power': await this.setPage(Page.Type.power); break;
          case 'thermo':
          case 'thermostat': await this.setPage(Page.Type.thermostat); break;
        }
      })();

    });

    this.homey.flow.getActionCard('start_screensaver_action').registerRunListener((args, state) => {

      (async () => {
        this.showScreensaver();
      })();
    });

    this.homey.flow.getActionCard('update_page_config_action').registerRunListener((args, state) => {

      if (args.config === '')
        return;

      let opts = '';

      if ( this.currentPage !== undefined && this.currentPage!.page !== undefined && this.currentPage!.page! === Page.Type.qrcode)
        opts = Page.GenerateQRCode(args.config) ?? '';
      else if (this.currentPage !== undefined && this.currentPage!.page !== undefined && this.currentPage!.page! === Page.Type.media)
        opts = Page.GenerateMedia(args.config) ?? '';
      else if (this.currentPage !== undefined && this.currentPage!.page !== undefined && this.currentPage!.page! === Page.Type.power)
        opts = Page.GeneratePower(args.config) ?? '';
      else if (this.currentPage !== undefined && this.currentPage!.page !== undefined && this.currentPage!.page! === Page.Type.thermostat) {
        const settings = this.getSettings();
        opts = Page.GenerateThermo(args.config, this.temp_current, this.temp_setpoint, settings['temp_min'], settings['temp_max'], settings['temp_step'], this.homey.i18n.getUnits() === 'metric' ? true : false) ?? '';
        const new_opts = this.thermoUpdate2(opts);
        if (new_opts !== undefined)
          opts = new_opts;
      }

      if (opts !== '') {

        if (!this.screensaverActive)
          this.sendCmnd('CustomSend', opts!);

        this.homey.setTimeout(() => {
          const page = this.currentPage !== undefined && this.currentPage!.page !== undefined ? this.currentPage!.page! : Page.Type.screensaver;
          this.currentPage = { page: page, options: page !== Page.Type.screensaver ? opts : '' };
          if (page !== Page.Type.screensaver)
            this.sendCmnd('CustomSend', opts);
        }, 400);
      }
    });

    const setpoint = await this.getCapabilityValue('target_temperature');
    if (setpoint === null || setpoint === undefined) {
      await this.setCapabilityValue('target_temperature', 20);
      await this.setCapabilityValue('measure_temperature', 20);
      await this.setCapabilityValue('measure_temperature.current', 20);
      this.temp_current = 20;
      this.temp_setpoint = 20;
    } else {
      const current_temp = setpoint;
      await this.setCapabilityValue('measure_temperature', setpoint);
      await this.setCapabilityValue('measure_temperature.current', setpoint);
      this.temp_current = setpoint;
      this.temp_setpoint = setpoint;
    }

    this.switchChangedTrigger = this.homey.flow.getDeviceTriggerCard('switch_changed');
    this.onlineStatusChangedTrigger = this.homey.flow.getDeviceTriggerCard('online_status_changed');
    this.pageChangedTrigger = this.homey.flow.getDeviceTriggerCard('page_changed');
    this.enterScreensaverTrigger = this.homey.flow.getDeviceTriggerCard('enter_screensaver');
    this.exitScreensaverTrigger = this.homey.flow.getDeviceTriggerCard('exit_screensaver');

    this.subscribe(settings['mqtt_path'], settings['mqtt_topic']);
    await this.setUnavailable();
  }

  async postSwitchState(id: number, state: boolean) {

    if (id !== 1 && id !== 2)
      return;

    if (id === 1 && this.switch1 === undefined) {
      this.switch1 = state;
      return;
    } else if (id === 2 && this.switch2 === undefined) {
      this.switch2 = state;
      return;
    }

    if ((id === 1 && this.switch1 === state ) || (id === 2 && this.switch2 === state))
      return;
    
    if (id === 1)
      this.switch1 = state;
    else this.switch2 = state;

    this.switchChangedTrigger?.trigger(this, {"state": state, "button": id}, {});
  }

  deviceId(): string {
    if (this._deviceId !== undefined)
      return this._deviceId;

    const settings = this.getSettings();
    this._deviceId = settings['mqtt_topic'];
    return this._deviceId!;
  }

  mqtt_path(): string {
    if (this._devicePath !== undefined)
      return this._devicePath;

    const settings = this.getSettings();
    this._devicePath = settings['mqtt_path'];
    return this._devicePath!;
  }

  subscribe(format: string, topic: string) {
    const tele = format.replace('%prefix%', 'tele').replace('%topic%', topic) + '#';
    const stat = format.replace('%prefix%', 'stat').replace('%topic%', topic) + '#';
    ((this.homey.app as unknown) as NSPanelApp).subscribeTopic(tele);
    ((this.homey.app as unknown) as NSPanelApp).subscribeTopic(stat);
  }

  unsubscribe(format: string, topic: string) {
    const tele = format.replace('%prefix%', 'tele').replace('%topic%', topic) + '#';
    const stat = format.replace('%prefix%', 'stat').replace('%topic%', topic) + '#';
    ((this.homey.app as unknown) as NSPanelApp).unsubscribeTopic(tele);
    ((this.homey.app as unknown) as NSPanelApp).unsubscribeTopic(stat);
  }

  async ready() {
  }

  async onUninit() {

    const settings = this.getSettings();
    this.unsubscribe(this.mqtt_path(), this.deviceId());
    this.setOffline();
  }

  onDeleted() {
  }

  setOffline() {

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

    if (this.updateStatusTimer !== undefined)
      this.homey.clearInterval(this.updateStatusTimer);
    
    if (this.updateTimeTimer !== undefined)
      this.homey.clearInterval(this.updateTimeTimer);

    this.homey.setTimeout(() => this.requestDriverVersion(), 1000);
    this.homey.setTimeout(() => this.updateTime(), 2000);
    this.homey.setTimeout(() => this.requestStatus(), 4000);

    const settings = this.getSettings();

    this.updateStatusTimer = this.homey.setInterval(() => this.requestStatus(), settings['update_interval'] * 1000);
    this.updateTimeTimer = this.homey.setInterval(() => this.updateTime(), 30000);

    this.homey.setTimeout(() => this.weatherUpdate(), 6000);
  }

  async onSettings(settingsEvent: {
        oldSettings: { [key: string]: boolean | string | number | undefined | null };
        newSettings: { [key: string]: boolean | string | number | undefined | null };
        changedKeys: string[];
    }): Promise<string | void> {

    this.log('changed settings to:', settingsEvent.newSettings);

    if (settingsEvent.changedKeys.includes('mqtt_topic') || settingsEvent.changedKeys.includes('mqtt_path')) {

      this.log('preparing for new mqtt connection setup');
      this.unsubscribe(settingsEvent.oldSettings['mqtt_path'] as string, settingsEvent.oldSettings['mqtt_topic'] as string);

      if (this.getAvailable()) {

        this.setOffline();

        this.homey.setTimeout(() => {
          this.subscribe(settingsEvent.newSettings['mqtt_path'] as string, settingsEvent.newSettings['mqtt_topic'] as string);
          this.setOnline();
        }, 1500);
      }
    } else if (settingsEvent.changedKeys.includes('update_interval')) {

      if (this.getAvailable()) {

        this.setOffline();
        this.homey.setTimeout(() => this.setOnline(), 1500);
      }
    }

    if ((settingsEvent.changedKeys.includes('brightness') || settingsEvent.changedKeys.includes('sleep_brightness') || settingsEvent.changedKeys.includes('background')) && this.getAvailable() && !this.screensaverActive) {
      this.homey.setTimeout(() => this.updateBrightness(), 1750);
    }

  }

  sendMessage(topic: string, message: string) {
    ((this.driver as unknown) as NSPanelDriver).sendMessage(topic, message);
  }

  sendCmnd(topic: string, message: string | undefined) {
    if ( message !== undefined )
      this.sendMessage('cmnd/' + this.deviceId() + '/' + topic, message);
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
    this.sendCmnd('CustomSend', 'time~' + now.toLocaleString(DateTime.TIME_24_SIMPLE) + '~');
    this.sendCmnd('CustomSend', 'date~' + now.toLocaleString(DateTime.DATE_HUGE));
  }

  updateBrightness(dim: boolean = false): void {

    const settings = this.getSettings();
    const backgroundColor = Color.get(settings['background'] === 'black' ? 'background_black' : 'background_dark')!;
    const brightness = settings['brightness'] > 0 ? settings['brightness'] : 1;
    const dimBrightness = settings['sleep_brightness'];

    if (!dim) {
      this.sendCmnd('CustomSend', 'dimmode~' + brightness.toString() + '~' + brightness.toString() + '~' + backgroundColor.toString() + '~~');
    } else {
      let i = brightness;
      while (true) {
        i-=7;
        if (i > dimBrightness)
          this.sendCmnd('CustomSend', 'dimmode~' + i.toString() + '~' + i.toString() + '~' + backgroundColor.toString() + '~~');
        else break;
      }
      this.sendCmnd('CustomSend', 'dimmode~' + dimBrightness.toString() + '~' + dimBrightness.toString() + '~' + backgroundColor.toString() + '~~');
    }

    this.dimmed = dim;
    this.sleeping = false;
  }

  tempConversion(value: string | number | undefined, use_celcius: boolean, reverse: boolean = false): number {
    
    let temp = 0.0;

    if (typeof value === 'string')
      temp = parseFloat(value);
    else if (typeof value === 'number')
      temp = isNaN(value) ? 0.0 : value;
    else temp = 0.0;

    if (isNaN(temp))
      temp = 0.0;

    if (!use_celcius && !reverse) {
      temp -= 32;
      temp /= 1.8;
    } else if (!use_celcius && reverse) {
      temp *= 1.8;
      temp += 32;
    }

    temp = temp === 0.0 ? 0.0 : (Math.round(temp * 10) * 0.1);
    return temp;
  }

  async onMessage(deviceId: string, topic: string, msg: string) {

    const message = JSON.parse(msg);
    const settings = this.getSettings();

    if (topic === 'tele/LWT') {

      if (message['state'] !== undefined && message['state'] === 'Offline') {

        await this.setUnavailable();
        this.setOffline();
        await this.onlineStatusChangedTrigger?.trigger(this, {"state": false }, {});

      } else if (message['state'] !== undefined && message['state'] === 'Online') {

        await this.setAvailable();
        this.setOnline();
        this.homey.setTimeout(() => this.updateBrightness(), 750);
        this.homey.setTimeout(() => {
          this.sendCmnd('SetOption59', '1'); // disable matter?
          this.sendCmnd('CustomSend', 'pageType~pageStartup');
        }, 1500);
        this.homey.setTimeout(() => {
          (async () => {
            await this.setPage(Page.Type.screensaver, true);
            this.homey.setTimeout(() => {
              (async () => {
                await this.onlineStatusChangedTrigger?.trigger(this, {"state": true }, {});
              })();
            }, 1000);
          })();
        }, 3000);
        
      }

      return;
    }

    if (message['StatusSNS'] !== undefined && message['StatusSNS']['ANALOG'] !== undefined && message['StatusSNS']['ANALOG']['Temperature1'] !== undefined) {
      const use_celcius = message['StatusSNS']['TempUnit'] !== undefined && message['StatusSNS']['TempUnit'] !== 'C' ? false : true;
      const temp = this.tempConversion(message['StatusSNS']['ANALOG']['Temperature1'], use_celcius);
      await this.setCapabilityValue('measure_temperature', temp);
      await this.setCapabilityValue('measure_temperature.current', temp);
      this.temp_current = temp;
      if (settings['use_internal_temperature'] === true && this.indoorTemperature !== temp) {
        this.indoorTemperature = temp;
        this.homey.setTimeout(() => this.weatherUpdate(), 1000);
      }
      this.thermoUpdate();
    } else if (topic === 'tele/SENSOR' && message['ANALOG'] !== undefined && message['ANALOG']['Temperature1'] !== undefined) {
      const use_celcius = message['TempUnit'] !== undefined && message['TempUnit'] !== 'C' ? false : true;
      const temp = this.tempConversion(message['ANALOG']['Temperature1'], use_celcius);
      await this.setCapabilityValue('measure_temperature', temp);
      await this.setCapabilityValue('measure_temperature.current', temp);
      this.temp_current = temp;
      if (settings['use_internal_temperature'] === true && this.indoorTemperature !== temp) {
        this.indoorTemperature = temp;
        this.homey.setTimeout(() => this.weatherUpdate(), 1000);
      }
      this.thermoUpdate();
    }

    if (message['StatusSTS'] !== undefined) {

      if (message['StatusSTS']['POWER1'] !== undefined) {
        const state = message['StatusSTS']['POWER1'] === 'ON' ? true : false;
        await this.setCapabilityValue('switch.power1', state);
        await this.postSwitchState(1, state);
      }
      
      if (message['StatusSTS']['POWER2'] !== undefined) {
        const state = message['StatusSTS']['POWER2'] === 'ON' ? true : false;
        await this.setCapabilityValue('switch.power2', state);
        await this.postSwitchState(2, state);
      }

      return;

    } else {

      if (message['POWER1'] !== undefined) {
        const state = message['POWER1'] === 'ON' ? true : false;
        await this.setCapabilityValue('switch.power1', state);
        await this.postSwitchState(1, state);
      }
  
      if (message['POWER2'] !== undefined) {
        const state = message['POWER2'] === 'ON' ? true : false;
        await this.setCapabilityValue('switch.power2', state);
        await this.postSwitchState(2, state);
      }
    }

    if (topic === 'tele/RESULT') {

      if ((message['CustomRecv'] !== undefined) && (message['CustomRecv'].startsWith('event,')) && (!message['CustomRecv'].startsWith('event,sleepReached,')))
        this.updateSleepTimer();

      if ((message['CustomRecv'] !== undefined) && (message['CustomRecv'].startsWith('event,startup,'))) {
        const components = message['CustomRecv'].split(',');
        if (components.length === 4) {
          await this.setCapabilityValue('region', components[3].toUpperCase());
          return;
        }
      } else if ((message['CustomRecv'] !== undefined) && (message['CustomRecv'].startsWith('event,buttonPress2,,tempUpd'))) {
        const parts = message['CustomRecv'].split(',');
        const value = parseInt(parts[4]);
        if (!isNaN(value)) {
          await this.setCapabilityValue('target_temperature', value * 0.1);
          this.temp_setpoint = value * 0.1;
        }

        this.thermoUpdate();

      } else if ((message['CustomRecv'] !== undefined) && (message['CustomRecv'].startsWith('event,sleepReached,'))) {
        const components = message['CustomRecv'].split(',');
        if (components.length === 3) {
          if (components[2] !== 'screensaver')
            this.showScreensaver();
        }
      } else if ((message['CustomRecv'] !== undefined) && (message['CustomRecv'].startsWith('event,buttonPress2,screensaver,'))) {
        this.exitScreensaver();
      }

      if (message['nlui_driver_version'] !== undefined)
        await this.setCapabilityValue('driver_version', message['nlui_driver_version']);

    }
/*
    if (topic === 'tele/STATE') {
    }

    if (topic === 'stat/RESULT') {
    }
*/
    this.log('[' + deviceId + ']', topic, '=>', message);

  }

  weatherUpdate(): void {

    if (this.weather === undefined)
      return;

    this.sendCmnd('CustomSend', Weather.update(this.weather, this.indoorTemperature, '°C', false));
  }

  thermoUpdate2(opts: string | undefined): string | undefined {

    if (opts === undefined || opts === '')
      return undefined;

    const settings = this.getSettings();
    const metric = this.homey.i18n.getUnits() === 'metric' ? true : false;
    const parts = opts!.split('~');

    if (parts === undefined || parts.length < 56)
      return undefined;

    parts[15] = this.tempConversion(this.temp_current, metric, true).toFixed(1) + ' ' + (metric ? '°C' : '°F');
    parts[16] = Math.floor(this.tempConversion(this.temp_setpoint, metric, true) * 10).toString();
    parts[17] = ((this.temp_current ?? 0) < (this.temp_setpoint ?? 0) ? 'Heating' : ((this.temp_current ?? 0) > (this.temp_setpoint ?? 0 ) ? 'Cooling' : '-'));
    parts[18] = Math.floor(this.tempConversion(settings['temp_min'] ?? 15, metric, true) * 10).toString(); 
    parts[19] = Math.floor(this.tempConversion(settings['temp_max'] ?? 32, metric, true) * 10).toString();;
    parts[20] = Math.floor((settings['temp_step'] ?? 0.5) * 10).toString();
    parts[23] = (this.temp_current ?? 0) < (this.temp_setpoint ?? 0) ? '1' : '0';
    parts[27] = (this.temp_current ?? 0) > (this.temp_setpoint ?? 0) ? '1' : '0';
    parts[53] = 'Temperature';
    parts[54] = 'Mode';
    parts[55] = (this.temp_current ?? 0) < (this.temp_setpoint ?? 0) ? 'heating' : ((this.temp_current ?? 0) > (this.temp_setpoint ?? 0) ? 'cooling' : '');

    const new_opts = parts.join('~');
    if (new_opts !== undefined && typeof new_opts === 'string' && new_opts !== '')
      return new_opts;

    return undefined;
  }

  thermoUpdate(): void {
    if (this.currentPage === undefined || this.currentPage!.page === undefined || this.currentPage!.page! !== Page.Type.thermostat || this.currentPage.options === undefined || this.currentPage.options === '')
      return;

    const new_opts = this.thermoUpdate2(this.currentPage!.options);

    if (new_opts !== undefined && typeof new_opts === 'string' && new_opts !== '') {
      this.currentPage.options = new_opts;
      this.sendCmnd('CustomSend', new_opts);
    }
  }

  updateStatus(icon1: StatusBarIcon | undefined, icon2: StatusBarIcon | undefined = undefined): void {

    const icon_1 = icon1 !== undefined && icon1.icon !== undefined ? Icon.get(icon1!.icon!, 'close-box-outline') : undefined;
    const icon_2 = icon2 !== undefined && icon2.icon !== undefined ? Icon.get(icon2!.icon!, 'close-box-outline') : undefined;
  
    const cmnd = 'statusUpdate~' +
      (icon_1 === undefined ? '' : icon_1!) + '~' + (icon_1 !== undefined ? Color.get(icon1!.color ?? 'default', 'default')!.toString() : '') +
      (icon_2 === undefined ? '' : icon_2!) + '~' + (icon_2 !== undefined ? Color.get(icon2!.color ?? 'default', 'default')!.toString() : '') + '~' +
      (icon_1 !== undefined && icon1!.large !== undefined && icon1!.large === true ? '1' : '') + '~' +
      (icon_2 !== undefined && icon2!.large !== undefined && icon2!.large ? '1' : '') + '~';

    this.sendCmnd('CustomSend', cmnd);
  }

  sleepFunc(): void {
    if (!this.screensaverActive) {
      this.log('screensaver is activating');
      this.showScreensaver();
    } else {

      const settings = this.getSettings();

      if (!this.dimmed) {
        this.log('dimming screen');
        this.updateBrightness(true);
        if (settings['sleep_timeout'] > 0) {
          this.sleepTimer = this.homey.setTimeout(() => this.sleepFunc(), settings['sleep_timeout'] * 1000);
        }
      } else if (settings['sleep_timeout'] > 0) {
        this.log('turning screen\'s light off');
        const settings = this.getSettings();
        const backgroundColor = Color.get(settings['background'] === 'black' ? 'background_black' : 'background_dark')!;
        const dimBrightness = settings['sleep_brightness'];
        let i = dimBrightness;
        while (true) {
          i -= 1;
          if (i > 0)
            this.sendCmnd('CustomSend', 'dimmode~' + i.toString() + '~' + i.toString() + '~' + backgroundColor.toString() + '~~');
          else break;
        }
        this.sendCmnd('CustomSend', 'dimmode~0~0~' + backgroundColor.toString() + '~~');
        this.sleeping = true;
      }
    }
  }

  clearSleepTimer() {

    if (this.sleepTimer === undefined)
      return;

    this.homey.clearTimeout(this.sleepTimer);
    this.sleepTimer = undefined;
  }

  updateSleepTimer() {
    const settings = this.getSettings();

    this.clearSleepTimer();
    this.sleepTimer = this.homey.setTimeout(() => this.sleepFunc(), (this.screensaverActive ? settings['dim_timeout'] : settings['screensaver_timeout']) * 1000);
  }

  notifyPageChange(pageName: string): void {

    this.homey.setTimeout(() => {

      (async () => {
        await this.pageChangedTrigger?.trigger(this, {'page': pageName}, {});
      })();

    }, 300);
  }

  switchPage(page: Page.Type): void {

    switch(page) {
      case Page.Type.screensaver: this.showScreensaver(); this.notifyPageChange('screensaver'); break;
      case Page.Type.qrcode: this.sendCmnd('CustomSend', 'pageType~cardQR'); this.notifyPageChange('qrcode'); break; 
      case Page.Type.media: this.sendCmnd('CustomSend', 'pageType~cardMedia'); this.notifyPageChange('media'); break;
      case Page.Type.power: this.sendCmnd('CustomSend', 'pageType~cardPower'); this.notifyPageChange('power'); break;
      case Page.Type.thermostat:
        const settings = this.getSettings();
        this.sendCmnd('CustomSend', 'pageType~cardThermo');
/*
        if (this.currentPage !== undefined && (this.currentPage!.page === undefined || this.currentPage!.page !== Page.Type.thermostat || this.currentPage!.options === undefined || this.currentPage!.options! === ''))
          this.currentPage.options = Page.GenerateThermo('', this.temp_current, this.temp_setpoint, settings['temp_min'], settings['temp_max'], settings['temp_step'], this.homey.i18n.getUnits() === 'metric' ? true : false) ?? '';
        this.thermoUpdate();
*/
        this.notifyPageChange('thermostat');
        break;
    }

    this.updateSleepTimer();
  }

  async setPage(page: Page.Type, forced: boolean = false): Promise<void> {

    if (!forced && (this.currentPage !== undefined && this.currentPage!.page !== undefined && this.currentPage!.page! === page))
      return;

    this.currentPage = {
      page: page,
      options: this.currentPage !== undefined && this.currentPage!.page !== undefined && this.currentPage!.page! == page ? this.currentPage!.options : undefined
    };

    this.switchPage(page);
    this.screensaverActive = page === Page.Type.screensaver ? true : false;

    if (this.screensaverActive)
      return;

    this.updateBrightness();
    this.updateSleepTimer();
  }

  showScreensaver(): void {

    const settings = this.getSettings();

    if (!this.screensaverActive) {
      this.homey.setTimeout(() => {
        (async () => {
          await this.enterScreensaverTrigger?.trigger(this, {}, {});
        })();
      }, 150);
    }

    this.screensaverActive = true;

    this.sendCmnd('CustomSend', 'pageType~screensaver');
    this.updateBrightness();
    this.sendCmnd('CustomSend', Page.ColorTheme(Page.Type.screensaver));
    this.homey.setTimeout(() => {
      this.weatherUpdate();
    }, 250);

    this.updateSleepTimer();
  }

  exitScreensaver(): void {

    if (!this.screensaverActive || this.currentPage === undefined || this.currentPage.page === undefined)
      return;

    this.homey.setTimeout(() => {
   
      (async () => {
        await this.exitScreensaverTrigger?.trigger(this, {}, {});
      })();
    
    }, 300);

    if (this.currentPage === undefined || this.currentPage.page === undefined || this.currentPage.page === Page.Type.screensaver) {

      this.homey.setTimeout(() => {
        this.updateBrightness();   
        this.updateSleepTimer();
      }, 100);

      return;
    }

    this.switchPage(this.currentPage!.page!);
    //this.updateBrightness();
    this.screensaverActive = false;

    if (this.currentPage!.options !== undefined && this.currentPage!.options! !== '') {
      this.homey.setTimeout(() => {
        this.sendCmnd('CustomSend', this.currentPage!.options!);
      }, 50);
    }

    this.homey.setTimeout(() => {
      this.updateBrightness();
      this.updateSleepTimer();
    }, 100);

  }

}

module.exports = NSPanelDevice;
