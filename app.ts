'use strict';

import Homey from 'homey';
import { NSPanelDriver } from './drivers/nspanel/driver';

export class NSPanelApp extends Homey.App {

  lastMqttMessage: number | undefined = undefined;
  discoveredDevice: string | undefined = undefined;
  drivers: { [x: string]: Homey.Driver; } = {};
  MQTTClient?: Homey.ApiApp = undefined;

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('MyApp has been initialized');
    this.drivers = this.homey.drivers.getDrivers();    
    this.connectMqttClient();
  }

  connectMqttClient() {

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
            });
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
      const obj = JSON.parse(JSON.stringify(message, null, 2));
      if (obj['t'] !== undefined) {
        
        let found_new = true;
        Object.keys(this.drivers).forEach((driverId) => {
          if (((this.drivers[driverId] as unknown) as NSPanelDriver).deviceFor(obj['t']) !== undefined)
            found_new = false;
        });

        if (found_new) {
          this.discoveredDevice = JSON.stringify(message, null, 2);
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
      message = JSON.stringify(message);
    }

    // this.log('<<', fullTopic, '=>', message);

    Object.keys(this.drivers).forEach((driverId) => {
      ((this.drivers[driverId] as unknown) as NSPanelDriver).onMessage(fullTopic, message);
    });

  }

  sendMessage(topic: string, payload: string) {

    this.log(`>> ${topic}: ${payload}`);

    if (this.MQTTClient === undefined)
      return;

    this.MQTTClient!.post('send', {
      qos: 0,
      retain: false,
      mqttTopic: topic,
      mqttMessage: payload
    }).catch(error => {
      this.log(`Error while sending ${topic} <= "${payload}". ${error}`);
    });
  }

  subscribeTopic(topicName: string) {

    if (this.MQTTClient === undefined)
      return;

    this.log(`Subscribing to topic: ${topicName}`);

    return this.MQTTClient!.post('subscribe', { topic: topicName })
    .catch(error => {
      this.log(`Error while subscribing to ${topicName}. ${error}`);
    });
  }

  unsubscribeTopic(topicName: string) {

    if (this.MQTTClient === undefined)
      return;
       
    this.log(`unsubscribing from topic: ${topicName}`);
      
    return this.MQTTClient!.post('unsubscribe', { topic: topicName })
    .catch(error => {
      this.log(`Error while unsubscribing from ${topicName}. ${error}`);
    });
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
