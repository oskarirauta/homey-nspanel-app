import type { NSPanelDevice } from "../device";
import { DirectMqttClient } from "../../../lib/mqtt";
import { NSPanelApp } from "../../../app";
import { NSPanelDriver } from "../driver";
import { Page } from "../../../lib/page";
import { handleMediaControl } from "../../../lib/panel/media-control";
import { handleTimerControl } from "../../../lib/panel/timer-control";
import { handleLightControl } from "../../../lib/panel/light-control";
import { handleShutterControl } from "../../../lib/panel/shutter-control";
import { createShutterState } from "../../../lib/panel/state-defaults";

const { DateTime } = require('luxon');

export class MqttHandler {
  private device: NSPanelDevice;
  private generation = 0;
  private pending = new Set<NodeJS.Timeout>();

  public cancelPending(): void {
    this.generation++;
    for (const timer of this.pending) this.device.homey.clearTimeout(timer);
    this.pending.clear();
  }

  public stop(): void {
    this.cancelPending();
    const client = this.directMqtt;
    this.directMqtt = undefined;
    client?.disconnect();
  }

  private later(callback: () => void | Promise<void>, delay: number): void {
    const generation = this.generation;
    const timer = this.device.homey.setTimeout(() => {
      this.pending.delete(timer);
      if (generation !== this.generation) return;
      Promise.resolve().then(() => { if (generation === this.generation) return callback(); }).catch(error => this.device.error('MQTT delayed operation failed:', error));
    }, delay);
    this.pending.add(timer);
  }

  public directMqtt?: DirectMqttClient = undefined;
  public _deviceId?: string = undefined;
  public _devicePath?: string = undefined;

  constructor(device: NSPanelDevice) {
    this.device = device;
  }

  public deviceId(): string {
    if (this._deviceId !== undefined) return this._deviceId;
    const settings = this.device.getSettings();
    const topic = settings['mqtt_topic'];
    this._deviceId = String(topic ?? '');
    if (!this._deviceId) this.device.error('MQTT topic setting is missing');
    return this._deviceId;
  }

  public mqtt_path(): string {
    if (this._devicePath !== undefined) return this._devicePath;
    const settings = this.device.getSettings();
    const path = settings['mqtt_path'];
    this._devicePath = String(path ?? '%prefix%/%topic%/');
    return this._devicePath;
  }

  public setupMqttConnection(settings: { [key: string]: any }) {
    this.cancelPending();
    const mode = settings['mqtt_mode'] || 'scanno';
    const topic = settings['mqtt_topic'];
    const path = settings['mqtt_path'] || '%prefix%/%topic%/';

    if (mode === 'standalone' && settings['mqtt_host']) {
      this.device.log('Connecting using Direct Standalone MQTT Client');
      if (this.directMqtt) {
        const previous = this.directMqtt;
        this.directMqtt = undefined;
        previous.disconnect();
      }

      this.directMqtt = new DirectMqttClient((...args: any[]) => this.device.log(...args));
      const client = this.directMqtt;
      this.directMqtt.on('connect', async () => {
        try {
          if (this.directMqtt !== client) return;
          const generation = this.generation;
          await this.device.setAvailable();
          if (this.directMqtt !== client || generation !== this.generation) return;
          this.device.setOnline();
          this.subscribeDirectMqtt(path, topic);
        } catch (err) {
          this.device.error('MQTT connect handler failed:', err);
        }
      });

      this.directMqtt.on('error', (err: Error) => this.device.error('MQTT error:', err.message));
      this.directMqtt.on('message', (topicName: string, message: string) => {
        if (this.directMqtt === client) this.handleRawMqttMessage(topicName, message);
      });

      this.directMqtt.on('close', async () => {
        try {
          if (this.directMqtt !== client) return;
          this.cancelPending();
          await this.device.setUnavailable();
          if (this.directMqtt === client) this.device.setOffline();
        } catch (err) {
          this.device.error('MQTT close handler failed:', err);
        }
      });

      this.directMqtt.connect({
        host: settings['mqtt_host'],
        port: settings['mqtt_port'] || 1883,
        username: settings['mqtt_user'] || undefined,
        password: settings['mqtt_password'] || undefined,
        clientId: `homey_nspanel_${topic || 'dev'}`
      });
    } else {
      if (this.directMqtt) {
        const previous = this.directMqtt;
        this.directMqtt = undefined;
        previous.disconnect();
        this.directMqtt = undefined;
      }
      this.device.log('Using Scanno MQTT client via driver');
      this.subscribe(path, topic);
      const generation = this.generation;
      this.later(async () => {
        await this.device.setAvailable();
        if (generation !== this.generation) return;
        this.device.setOnline();
      }, 1500);
    }
  }

  public subscribeDirectMqtt(format: string, topic: string) {
    if (!this.directMqtt) return;
    const tele = format.replace('%prefix%', 'tele').replace('%topic%', topic) + '#';
    const stat = format.replace('%prefix%', 'stat').replace('%topic%', topic) + '#';
    this.directMqtt.subscribe(tele);
    this.directMqtt.subscribe(stat);
  }

  public unsubscribeDirectMqtt(format: string, topic: string) {
    if (!this.directMqtt) return;
    const tele = format.replace('%prefix%', 'tele').replace('%topic%', topic) + '#';
    const stat = format.replace('%prefix%', 'stat').replace('%topic%', topic) + '#';
    this.directMqtt.unsubscribe(tele);
    this.directMqtt.unsubscribe(stat);
  }

  public handleRawMqttMessage(topic: string, message: string) {
    const settings = this.device.getSettings();
    const format = settings['mqtt_path'] || '%prefix%/%topic%/';
    const tele = format.replace('%prefix%', 'tele').replace('%topic%', settings['mqtt_topic']) + (format.slice(-1) === '/' ? '' : '/');
    const stat = format.replace('%prefix%', 'stat').replace('%topic%', settings['mqtt_topic']) + (format.slice(-1) === '/' ? '' : '/');

    if (topic.startsWith(tele) || topic.startsWith(stat)) {
      const components = topic.split('/').filter(Boolean);
      const trimmed = (topic.startsWith(tele) ? 'tele' : 'stat') + '/' + components[components.length - 1];
      this.onMessage(settings['mqtt_topic'], trimmed, message).catch((err) => this.device.error('Error handling message:', err));
    }
  }

  public subscribe(format: string, topic: string) {
    const tele = format.replace('%prefix%', 'tele').replace('%topic%', topic) + '#';
    const stat = format.replace('%prefix%', 'stat').replace('%topic%', topic) + '#';
    ((this.device.homey.app as unknown) as NSPanelApp).subscribeTopic(tele);
    ((this.device.homey.app as unknown) as NSPanelApp).subscribeTopic(stat);
  }

  public unsubscribe(format: string, topic: string) {
    const tele = format.replace('%prefix%', 'tele').replace('%topic%', topic) + '#';
    const stat = format.replace('%prefix%', 'stat').replace('%topic%', topic) + '#';
    ((this.device.homey.app as unknown) as NSPanelApp).unsubscribeTopic(tele);
    ((this.device.homey.app as unknown) as NSPanelApp).unsubscribeTopic(stat);
  }

  public sendMessage(topic: string, message: string) {
    if (this.directMqtt && this.directMqtt.isConnected()) {
      this.directMqtt.publish(topic, message);
    } else if (this.device.driver && typeof (this.device.driver as any).sendMessage === 'function') {
      ((this.device.driver as unknown) as NSPanelDriver).sendMessage(topic, message);
    }
  }

  public sendCmnd(topic: string, message: string | undefined) {
    if (message !== undefined) {
      const path = (this.mqtt_path() || '%prefix%/%topic%/').replace('%prefix%', 'cmnd').replace('%topic%', this.deviceId());
      this.sendMessage(`${path.replace(/\/?$/, '/')}${topic}`, message);
    }
  }

  public async postSwitchState(id: number, state: boolean) {
    if (id !== 1 && id !== 2) return;
    if (id === 1 && this.device.switch1 === undefined) { this.device.switch1 = state; return; }
    if (id === 2 && this.device.switch2 === undefined) { this.device.switch2 = state; return; }
    if ((id === 1 && this.device.switch1 === state) || (id === 2 && this.device.switch2 === state)) return;

    if (id === 1) this.device.switch1 = state;
    else this.device.switch2 = state;

    this.device.switchChangedTrigger?.trigger(this.device, { state: state, button: id }, {});
  }

  public async onMessage(deviceId: string, topic: string, msg: string) {
    let message: any;
    try {
      message = typeof msg === 'string' ? JSON.parse(msg) : msg;
    } catch {
      message = msg;
    }

    const settings = this.device.getSettings();

    // Every LWT supersedes delayed initialization from the previous state.
    if (topic === 'tele/LWT') {
      const state = message?.state || message;
      if (state !== 'Offline' && state !== 'Online') return;
      this.cancelPending();
      const generation = this.generation;
      if (state === 'Offline') {
        await this.device.setUnavailable();
        if (generation !== this.generation) return;
        this.device.setOffline();
        await this.device.onlineStatusChangedTrigger?.trigger(this.device, { state: false }, {});
      } else {
        await this.device.setAvailable();
        if (generation !== this.generation) return;
        this.device.setOnline();
        this.later(() => this.device.updateBrightness(), 750);
        this.later(() => {
          this.sendCmnd('SetOption59', '1');
          this.sendCmnd('CustomSend', 'pageType~pageStartup');
        }, 1500);
        this.later(async () => {
          await this.device.setPage(Page.Type.screensaver, true);
          if (generation !== this.generation) return;
          this.later(async () => {
            await this.device.onlineStatusChangedTrigger?.trigger(this.device, { state: true }, {});
          }, 1000);
        }, 3000);
      }
      return;
    }

    // 2. Sensors (Internal temperature)
    if (message['StatusSNS']?.['ANALOG']?.['Temperature1'] !== undefined) {
      const use_celcius = message['StatusSNS']['TempUnit'] !== 'F';
      const temp = this.device.tempConversion(message['StatusSNS']['ANALOG']['Temperature1'], use_celcius);
      await this.device.setCapabilityValue('measure_temperature', temp);
      await this.device.setCapabilityValue('measure_temperature.current', temp);
      this.device.temp_current = temp;
      // Sync indoorTemperature so weatherUpdate and Flow fallback use the latest internal sensor reading
      this.device.indoorTemperature = temp;
      this.device.scheduleBindingRender();
      if (!this.device.screensaverActive && this.device.currentPageId === 'active') {
        this.device.renderAndDisplayPage(this.device.pages['active'], false).catch(() => {});
      }
      if (this.device.bindings.indoor.source === 'internal') {
        this.device.homey.setTimeout(() => { if (!this.device.popupActive) this.device.weatherUpdate(); }, 500);
      }
      this.device.thermoUpdate();
    } else if (topic === 'tele/SENSOR' && message['ANALOG']?.['Temperature1'] !== undefined) {
      const use_celcius = message['TempUnit'] !== 'F';
      const temp = this.device.tempConversion(message['ANALOG']['Temperature1'], use_celcius);
      await this.device.setCapabilityValue('measure_temperature', temp);
      await this.device.setCapabilityValue('measure_temperature.current', temp);
      this.device.temp_current = temp;
      // Sync indoorTemperature so weatherUpdate and Flow fallback use the latest internal sensor reading
      this.device.indoorTemperature = temp;
      this.device.scheduleBindingRender();
      if (!this.device.screensaverActive && this.device.currentPageId === 'active') {
        this.device.renderAndDisplayPage(this.device.pages['active'], false).catch(() => {});
      }
      if (this.device.bindings.indoor.source === 'internal') {
        this.device.homey.setTimeout(() => { if (!this.device.popupActive) this.device.weatherUpdate(); }, 500);
      }
      this.device.thermoUpdate();
    }

    // 3. Relays (POWER1 / POWER2)
    const sts = message['StatusSTS'] || message;
    if (sts['POWER1'] !== undefined) {
      const state = sts['POWER1'] === 'ON';
      if (this.device.switch1 !== state) {
        await this.postSwitchState(1, state);
        await this.device.setCapabilityValue('switch.power1', state);
        this.device.scheduleBindingRender();
        if (!this.device.screensaverActive) {
          const curPage = this.device.pages[this.device.currentPageId || 'active'];
          if (curPage && (this.device.currentPageId === 'active' || this.isSlotOnPage(curPage, 'slot_1'))) {
            this.device.renderAndDisplayPage(curPage, false).catch(() => {});
          }
        }
      }
    }
    if (sts['POWER2'] !== undefined) {
      const state = sts['POWER2'] === 'ON';
      if (this.device.switch2 !== state) {
        await this.postSwitchState(2, state);
        await this.device.setCapabilityValue('switch.power2', state);
        this.device.scheduleBindingRender();
        if (!this.device.screensaverActive) {
          const curPage = this.device.pages[this.device.currentPageId || 'active'];
          if (curPage && (this.device.currentPageId === 'active' || this.isSlotOnPage(curPage, 'slot_2'))) {
            this.device.renderAndDisplayPage(curPage, false).catch(() => {});
          }
        }
      }
    }

    // 3b. Physical Buttons
    let pressedButton: number | undefined;
    let buttonAction: string | undefined;

    if (message['Button1'] !== undefined) {
      pressedButton = 1;
      buttonAction = typeof message['Button1'] === 'object' && message['Button1'] !== null
        ? (message['Button1']['Action'] || 'SINGLE')
        : String(message['Button1']);
    } else if (message['Button2'] !== undefined) {
      pressedButton = 2;
      buttonAction = typeof message['Button2'] === 'object' && message['Button2'] !== null
        ? (message['Button2']['Action'] || 'SINGLE')
        : String(message['Button2']);
    } else if (topic.endsWith('/BUTTON1') || topic === 'stat/BUTTON1' || topic === 'tele/BUTTON1') {
      pressedButton = 1;
      buttonAction = typeof message === 'object' && message !== null ? (message['Action'] || 'SINGLE') : String(message);
    } else if (topic.endsWith('/BUTTON2') || topic === 'stat/BUTTON2' || topic === 'tele/BUTTON2') {
      pressedButton = 2;
      buttonAction = typeof message === 'object' && message !== null ? (message['Action'] || 'SINGLE') : String(message);
    }

    if (pressedButton !== undefined && buttonAction) {
      const act = String(buttonAction).toUpperCase();
      const binding = this.device.bindings.buttons?.[String(pressedButton)];
      if (binding && act === 'SINGLE') {
        if (binding.source === 'homey') {
          await (this.device as any).runPanelInteraction(() => (this.device as any).controlBoundValue(binding));
        }
        else if (binding.source === 'relay' && (this.device.getSetting('decouple_buttons') || this.device.buttonsNeedDecoupling())) this.sendCmnd(`Power${binding.relay}`, 'TOGGLE');
        else if (binding.source === 'navigate') await this.device.navigateToPage(binding.target || 'screensaver');
      }
      this.device.log(`[Physical Button] Button ${pressedButton} pressed with action ${act}`);
      this.device.physicalButtonPressedTrigger?.trigger(
        this.device,
        { button: pressedButton, action: act },
        { button: pressedButton, action: act }
      ).catch((err) => this.device.error('Failed to trigger physical_button_pressed:', err));
    }

    // 4. Nextion Events (CustomRecv)
    if (topic === 'tele/RESULT' || topic === 'stat/RESULT') {
      const customRecv = message['CustomRecv'];
      if (typeof customRecv === 'string' && customRecv.startsWith('event,')) {
        await this.device.handleNextionEvent(customRecv);
      }

      if (message['nlui_driver_version'] !== undefined) {
        await this.device.setCapabilityValue('driver_version', message['nlui_driver_version'].toString());
      }
    }

    this.device.log(`[${deviceId}] ${topic} =>`, message);
  }

  private isSlotOnPage(page: any, slotId: string): boolean {
    if (!page?.slots) return false;
    return Object.values(page.slots).some((s: any) => s.id === slotId || s.name === slotId);
  }
}
