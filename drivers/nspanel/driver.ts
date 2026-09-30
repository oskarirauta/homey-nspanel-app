'use strict';

import Homey from 'homey';
import PairSession from 'homey/lib/PairSession';
import { NSPanelDevice } from './device';
import { NSPanelApp } from '../../app';
const uuidv4 = require('uuid').v4;

import { DirectMqttClient } from '../../lib/mqtt';

export class NSPanelDriver extends Homey.Driver {

  async onInit() {
    this.log('NSPanelDriver has been initialized');
  }

  onPair(session: PairSession): Promise<void> {
    this.log(`onPair called`);

    let driver = this;
    let devices: any[] = [];
    let selectedDevices: any[] = [];

    // 0. Get app default MQTT settings
    session.setHandler('get_default_settings', async () => {
      const mode = driver.homey.settings.get('mqtt_mode') || 'standalone';
      const host = driver.homey.settings.get('mqtt_host') || '';
      const port = driver.homey.settings.get('mqtt_port') || 1883;
      const user = driver.homey.settings.get('mqtt_user') || '';
      const password = driver.homey.settings.get('mqtt_password') || '';
      return { mode, host, port, user, password };
    });

    // 1. Test Broker Connection handler
    session.setHandler('test_broker', async (data: { host: string; port: number; user?: string; password?: string }) => {
      driver.log('Testing broker connection to:', data.host, data.port);
      return new Promise((resolve) => {
        const client = new DirectMqttClient((...args) => driver.log('[TestBroker]', ...args));
        let finished = false;

        const timeout = setTimeout(() => {
          if (!finished) {
            finished = true;
            client.disconnect();
            resolve({ success: false, error: 'Yhteys aikakatkaistiin (5s). Tarkista IP ja portti.' });
          }
        }, 5000);

        client.on('connect', () => {
          if (!finished) {
            finished = true;
            clearTimeout(timeout);
            client.disconnect();
            driver.log('Broker test connection successful!');
            resolve({ success: true });
          }
        });

        client.on('error', (err: any) => {
          if (!finished) {
            finished = true;
            clearTimeout(timeout);
            client.disconnect();
            driver.log('Broker test error:', err);
            resolve({ success: false, error: err.message || 'Yhteysvirhe' });
          }
        });

        client.connect({
          host: data.host,
          port: data.port || 1883,
          username: data.user || undefined,
          password: data.password || undefined,
          clientId: `homey_pair_test_${Date.now()}`
        });
      });
    });

    // 2. Discover devices on MQTT
    session.setHandler('discover', async (data: { mode: string; host?: string; port?: number; user?: string; password?: string }) => {
      driver.log('Discovering devices, mode:', data.mode);
      const foundDevices: { topic: string; name: string }[] = [];
      const seenTopics = new Set<string>();

      if (data.mode === 'standalone' && data.host) {
        return new Promise((resolve) => {
          const client = new DirectMqttClient((...args) => driver.log('[Discover]', ...args));
          let finished = false;

          const finish = () => {
            if (!finished) {
              finished = true;
              client.disconnect();
              resolve(foundDevices);
            }
          };

          const timeout = setTimeout(finish, 3500);

          client.on('connect', () => {
            client.subscribe('tasmota/discovery/#');
            client.subscribe('stat/+/#');
            client.subscribe('tele/+/LWT');
            client.subscribe('tele/+/STATE');

            // Broadcast status requests
            client.publish('cmnd/sonoffs/Status', '0');
            client.publish('cmnd/tasmotas/Status', '0');
            client.publish('cmnd/nspanels/Status', '0');
          });

          client.on('message', (topicName: string, message: string) => {
            try {
              // 1. Tasmota discovery config
              if (topicName.startsWith('tasmota/discovery/') && topicName.endsWith('/config')) {
                const parsed = JSON.parse(message);
                if (parsed.t && !seenTopics.has(parsed.t)) {
                  seenTopics.add(parsed.t);
                  foundDevices.push({ topic: parsed.t, name: parsed.dn || parsed.fn?.[0] || parsed.t });
                }
              }
              // 2. Tele LWT or STATE: tele/<topic>/LWT
              const teleParts = topicName.split('/');
              if (teleParts.length >= 3 && teleParts[0] === 'tele') {
                const t = teleParts[1];
                if (!seenTopics.has(t) && t !== 'sonoffs' && t !== 'tasmotas') {
                  seenTopics.add(t);
                  foundDevices.push({ topic: t, name: t });
                }
              }
            } catch (err) { driver.error('Failed to parse discovery message:', err); }
          });

          client.on('error', (err) => { driver.error('Discovery MQTT error:', err); finish(); });

          client.connect({
            host: data.host!,
            port: data.port || 1883,
            username: data.user || undefined,
            password: data.password || undefined,
            clientId: `homey_pair_disc_${Date.now()}`
          });
        });
      } else {
        // Scanno or fallback: check app's discoveredDevice
        const app = (this.homey.app as unknown) as NSPanelApp;
        if (app && app.discoveredDevice) {
          try {
            const parsed = JSON.parse(app.discoveredDevice);
            if (parsed.t) {
              foundDevices.push({ topic: parsed.t, name: parsed.dn || parsed.t });
            }
          } catch (err) { driver.error('Failed to parse discovered device:', err); }
        }
        return Promise.resolve(foundDevices);
      }
    });

    // 3. Add Device handler (creates device payload)
    session.setHandler('add_device', async (data: {
      name: string;
      mode: string;
      host: string;
      port: number;
      user?: string;
      password?: string;
      topic: string;
      path: string;
    }) => {
      driver.log('Adding NSPanel:', data.name);
      const devicePayload = {
        name: data.name || 'NSPanel',
        data: {
          id: uuidv4(),
        },
        settings: {
          mqtt_mode: data.mode || 'standalone',
          mqtt_host: data.host || '',
          mqtt_port: Number(data.port) || 1883,
          mqtt_user: data.user || '',
          mqtt_password: data.password || '',
          mqtt_topic: data.topic,
          mqtt_path: data.path || '%prefix%/%topic%/',
        }
      };
      return devicePayload;
    });

    // Pairing interval state shared across handlers
    let pairingInterval: NodeJS.Timeout | undefined;
    const clearPairingInterval = () => {
      if (pairingInterval !== undefined) {
        clearInterval(pairingInterval);
        pairingInterval = undefined;
      }
    };

    // Backward-compatible handlers
    session.setHandler('showView', async (viewId) => {
      driver.log(`onPair current phase: "${viewId}"`);

      if (viewId === 'loading') {
        const app = (this.homey.app as unknown) as NSPanelApp;
        if (!app) {
          return Promise.reject(new Error(driver.homey.__('mqtt_client.unavailable')));
        }

        app.discoveredDevice = undefined;
        app.subscribeTopic('tasmota/discovery/#');
        this.sendMessage("cmnd/sonoffs/Status", "0");
        this.sendMessage("cmnd/tasmotas/Status", "0");

        let elapsed = 0;
        // Clear any previous interval before starting a new one
        clearPairingInterval();
        pairingInterval = setInterval((driverArg, sessionArg) => {
          elapsed += 1;
          if (app.discoveredDevice !== undefined) {
            try {
              const obj = JSON.parse(app.discoveredDevice!);
              clearPairingInterval();
              devices = driverArg.pairingFinished(obj);
              app.discoveredDevice = undefined;
              sessionArg.nextView();
            } catch {
              clearPairingInterval();
            }
          } else if (elapsed > 4) {
            // Safety timeout after 8 seconds - never hang forever
            clearPairingInterval();
            sessionArg.nextView();
          }
        }, 2000, driver, session);
      }
    });

    session.setHandler('list_devices', async () => {
      return devices;
    });

    session.setHandler("list_devices_selection", async (devs) => {
      selectedDevices = devs;
    });

    session.setHandler('create_devices', async () => {
      return selectedDevices;
    });

    session.setHandler('disconnect', () => {
      // Clear pairing interval if still running when session is aborted
      if (typeof pairingInterval !== 'undefined') {
        clearInterval(pairingInterval);
        pairingInterval = undefined;
      }
      this.homey.setTimeout(() => {
        this.log('Pairing aborted or finished');
        try {
          ((this.homey.app as unknown) as NSPanelApp).unsubscribeTopic('tasmota/discovery/#');
        } catch {}
      }, 2500);
      return Promise.resolve(true);
    });

    return Promise.resolve();
  }

  pairingFinished(discoveredDevice: {[index: string]:any}) {

    return [{
      name: discoveredDevice.dn,
      data: {
        id: uuidv4(),
      },
      settings: {
        mqtt_topic: discoveredDevice.t,
        mqtt_path: discoveredDevice.ft,
      }
    }];
  }

  onMessage(topic: string, message: string) {

    for (const device of this.getDevices()) {

      const settings = device.getSettings();
      const format = settings['mqtt_path'] || '%prefix%/%topic%/';
      const mqttTopic = settings['mqtt_topic'];
      if (!mqttTopic) continue;
      const tele = format.replace('%prefix%', 'tele').replace('%topic%', mqttTopic) + (format.slice(-1) === '/' ? '' : '/');
      const stat = format.replace('%prefix%', 'stat').replace('%topic%', mqttTopic) + (format.slice(-1) === '/' ? '' : '/');

      if (topic.startsWith(tele) || topic.startsWith(stat)) {

        const components = topic.split('/').filter(segment => segment) 
        const trimmed = ( topic.startsWith(tele) ? 'tele' : 'stat' ) + '/' + components[components.length - 1];
        ((device as unknown) as NSPanelDevice).onMessage(settings['mqtt_topic'], trimmed, message).catch(this.error);
        break;
      }
    }
  }

  sendMessage(topic: string, payload: string) {
    ((this.homey.app as unknown) as NSPanelApp).sendMessage(topic, payload);
  }

  deviceFor(topicId: string) {
    for (const device of this.getDevices()) {
      const settings = device.getSettings();
      if (settings['mqtt_topic'] === topicId) {
        return device;
      }
    }
    return undefined;
  }

}

module.exports = NSPanelDriver;

