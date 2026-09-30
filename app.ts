'use strict';

import Homey from 'homey';
import { GlobalWeather } from './lib/global-weather';
import { MetWeatherService } from './lib/met-weather';
import { BindingService } from './lib/bindings';
import { NSPanelDriver } from './drivers/nspanel/driver';

import { DirectMqttClient } from './lib/mqtt';

export class NSPanelApp extends Homey.App {

  bindingService = new BindingService(() => this.homey);
  private _metWeatherService?: MetWeatherService;
  get metWeatherService(): MetWeatherService {
    if (!this._metWeatherService) this._metWeatherService = new MetWeatherService(() => this.homey);
    return this._metWeatherService;
  }

  private _globalWeather?: GlobalWeather;
  get globalWeather(): GlobalWeather {
    if(!this._globalWeather)this._globalWeather=new GlobalWeather(()=>this.homey,this.metWeatherService);
    return this._globalWeather;
  }

  lastMqttMessage: number | undefined = undefined;
  discoveredDevice: string | undefined = undefined;
  drivers: { [x: string]: Homey.Driver; } = {};
  MQTTClient?: Homey.ApiApp = undefined;
  directMqttClient?: DirectMqttClient = undefined;

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('NSPanelApp has been initialized');
    this.drivers = this.homey.drivers.getDrivers();    
    this.initMqtt();

    this.homey.settings.on('set', (key: string) => {
      if (key.startsWith('mqtt_')) {
        this.log(`MQTT setting '${key}' changed, re-initializing MQTT...`);
        this.initMqtt();
      }
    });
  }

  async onUninit() {
    this._globalWeather?.dispose();
    if (this.directMqttClient) {
      this.directMqttClient.disconnect();
      this.directMqttClient = undefined;
    }
    if (this.MQTTClient) {
      this.MQTTClient.removeAllListeners('install');
      this.MQTTClient.removeAllListeners('uninstall');
      this.MQTTClient.removeAllListeners('realtime');
      this.MQTTClient = undefined;
    }
  }

  initMqtt() {
    const mode = this.homey.settings.get('mqtt_mode') || 'standalone';
    this.log(`Initializing MQTT in mode: ${mode}`);

    if (mode === 'standalone') {
      if (this.MQTTClient) {
        this.unregister();
      }
      this.connectDirectMqtt();
    } else {
      if (this.directMqttClient) {
        this.directMqttClient.disconnect();
        this.directMqttClient = undefined;
      }
      this.connectMqttClient();
    }
  }

  connectDirectMqtt() {
    if (this.directMqttClient) {
      this.directMqttClient.disconnect();
      this.directMqttClient = undefined;
    }

    const host = this.homey.settings.get('mqtt_host');
    if (!host) {
      this.log('Direct MQTT mode active, waiting for broker host in app settings...');
      return;
    }

    const port = Number(this.homey.settings.get('mqtt_port')) || 1883;
    const username = this.homey.settings.get('mqtt_user') || undefined;
    const password = this.homey.settings.get('mqtt_password') || undefined;

    this.log(`Connecting Direct MQTT to ${host}:${port}`);
    this.directMqttClient = new DirectMqttClient((...args) => this.log(...args));

    this.directMqttClient.on('connect', () => {
      this.log('Direct MQTT connected successfully');
      this.lastMqttMessage = Date.now();
      this.directMqttClient?.subscribe('tasmota/discovery/#');
    });

    this.directMqttClient.on('message', (topic: string, message: string) => {
      this.onMessage(topic, message);
    });

    this.directMqttClient.on('error', (err: any) => {
      this.log('Direct MQTT error:', err);
    });

    this.directMqttClient.connect({
      host,
      port,
      username,
      password,
      clientId: `homey_nspanel_app_${Date.now()}`
    });
  }

  connectMqttClient() {
    // Remove any existing listeners before re-registering to prevent duplicate
    // handlers when settings change triggers a reconnect in scanno mode.
    if (this.MQTTClient) {
      try {
        this.MQTTClient.removeAllListeners('install');
        this.MQTTClient.removeAllListeners('uninstall');
        this.MQTTClient.removeAllListeners('realtime');
      } catch { /* API app may not support removeAllListeners on first init */ }
    }

    this.MQTTClient = this.homey.api.getApiApp('nl.scanno.mqtt');
    this.MQTTClient!
      .on('install', () => this.register())
      .on('uninstall', () => this.unregister())
      .on('realtime', (topic, message) => this.onMessage(topic, message));

    try {
      this.MQTTClient.getInstalled()
        .then(installed => {
          this.log(`MQTT client status: installed`);

          if (installed) {
            this.register();
            this.homey.apps.getVersion(this.MQTTClient!).then((version) => {
              this.log(`MQTT client installed, version: ${version}`);
            }).catch((err: Error) => this.error('Failed to get MQTT client version:', err));
          }
        }).catch((error) => {
          this.log(`MQTT client app error: ${error}`);
        });
    } catch (error) {
      this.log(`MQTT client app error: ${error}`);
    }
  }

  onMessage(fullTopic: string, message: string) {

    this.lastMqttMessage = Date.now();

    // This info is only published once at subscription.
    // Keep trace of it for discovery process.

    if ((fullTopic.startsWith('tasmota/discovery/')) && (fullTopic.endsWith('/config')) && (fullTopic.split(/\//).length === 4)) {
      let obj: any;
      try { obj = typeof message === 'string' ? JSON.parse(message) : message; } catch { return; }
      if (obj['t'] !== undefined) {
        
        let found_new = true;
        Object.keys(this.drivers).forEach((driverId) => {
          if (((this.drivers[driverId] as unknown) as NSPanelDriver).deviceFor(obj['t']) !== undefined)
            found_new = false;
        });

        if (found_new) {
          this.discoveredDevice = JSON.stringify(obj);
        }
      }
    }

    if ((fullTopic.endsWith('/LWT')) && (message === 'Offline')) {
      const obj = {state: "Offline"};
      message = JSON.stringify(obj, null, 2);
    } else if ((fullTopic.endsWith('/LWT')) && (message === 'Online')) {
      const obj = {state: 'Online'};
      message = JSON.stringify(obj, null, 2);
    } else {
      message = typeof message === 'string' ? message : JSON.stringify(message);
    }

    // this.log('<<', fullTopic, '=>', message);

    Object.keys(this.drivers).forEach((driverId) => {
      ((this.drivers[driverId] as unknown) as NSPanelDriver).onMessage(fullTopic, message);
    });

  }

  sendMessage(topic: string, payload: string) {
    this.log(`>> ${topic}: ${payload}`);

    if (this.directMqttClient && this.directMqttClient.isConnected()) {
      this.directMqttClient.publish(topic, payload);
      return;
    }

    if (this.MQTTClient) {
      this.MQTTClient.post('send', {
        qos: 0,
        retain: false,
        mqttTopic: topic,
        mqttMessage: payload
      }).catch(error => {
        this.log(`Error while sending ${topic} <= "${payload}". ${error}`);
      });
    }
  }

  subscribeTopic(topicName: string) {
    this.log(`Subscribing to topic: ${topicName}`);

    if (this.directMqttClient) {
      this.directMqttClient.subscribe(topicName);
      return Promise.resolve();
    }

    if (this.MQTTClient) {
      return this.MQTTClient.post('subscribe', { topic: topicName })
      .catch(error => {
        this.log(`Error while subscribing to ${topicName}. ${error}`);
      });
    }

    return Promise.resolve();
  }

  unsubscribeTopic(topicName: string) {
    this.log(`unsubscribing from topic: ${topicName}`);

    if (this.directMqttClient) {
      this.directMqttClient.unsubscribe(topicName);
      return Promise.resolve();
    }

    if (this.MQTTClient) {
      return this.MQTTClient.post('unsubscribe', { topic: topicName })
      .catch(error => {
        this.log(`Error while unsubscribing from ${topicName}. ${error}`);
      });
    }

    return Promise.resolve();
  } 

  register() {
    this.lastMqttMessage = Date.now();

    // Subscribing to system topic to check if connection still alive (update ~10 second for mosquitto)
    this.subscribeTopic("$SYS/broker/uptime");
  }

  unregister() {
    this.lastMqttMessage = undefined;
    this.unsubscribeTopic('tasmota/discovery/#');
    this.log(`${this.constructor.name} unregister called`);
    this.MQTTClient = undefined;
  }

};

module.exports = NSPanelApp;
