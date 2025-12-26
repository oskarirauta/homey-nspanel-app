'use strict';

import Homey from 'homey';
import PairSession from 'homey/lib/PairSession';
import { NSPanelDevice } from './device';
import { NSPanelApp } from '../../app';
const uuidv4 = require('uuid').v4;

export class NSPanelDriver extends Homey.Driver {

  async onInit() {
    this.log('NSPanelDriver has been initialized');
  }

  onPair(session: PairSession): Promise<void> {

    this.log(`onPair called`);

    let driver = this;
    let devices: any[] = [];
    let selectedDevices: any[] = [];

    session.setHandler('showView', async (viewId) => {
      driver.log(`onPair current phase: "${viewId}"`);

      if (viewId === 'loading') {
        if (((this.homey.app as unknown) as NSPanelApp) === undefined ) {
          return Promise.reject(new Error(driver.homey.__('mqtt_client.unavailable')));
        }

        this.log("Pairing started");

        ((this.homey.app as unknown) as NSPanelApp).discoveredDevice = undefined;
        ((this.homey.app as unknown) as NSPanelApp).subscribeTopic('tasmota/discovery/#');

        this.sendMessage("cmnd/sonoffs/Status", "0");
        this.sendMessage("cmnd/tasmotas/Status", "0");
        this.sendMessage("sonoffs/cmnd/Status", "0");
        this.sendMessage("tasmotas/cmnd/Status", "0");

        let interval = setInterval((driverArg, sessionArg) => {
          if (((this.homey.app as unknown) as NSPanelApp).discoveredDevice !== undefined) {

            const obj = JSON.parse(((this.homey.app as unknown) as NSPanelApp).discoveredDevice!);
            driverArg.log(`onPairLoading: Discovered device: ${obj.dn}`);
            clearInterval(interval);
            devices = driverArg.pairingFinished(obj);

            ((this.homey.app as unknown) as NSPanelApp).discoveredDevice = undefined;

            sessionArg.emit('list_devices'/*, devices*/, function (error: any, result: any) {
              if (result) {
                sessionArg.nextView()
              } else {
                sessionArg.done()
              }
            });
            sessionArg.nextView();
          }
        }, 2000, driver, session);
      }
    });

    //session.setHandler('list_devices', async (data: any, tmp: any) => {
    session.setHandler('list_devices', async () => {
      if (devices.length === 0) {
        return Promise.reject(new Error(driver.homey.__('mqtt_client.no_new_devices')));
      }
      driver.log(`list_devices: New devices found: ${JSON.stringify(devices)}`);
      return devices;
    });

    session.setHandler("list_devices_selection", async (devices) => {
      selectedDevices = devices;
    });

    session.setHandler('create_devices', async () => {
      return selectedDevices;
    });

    session.setHandler('disconnect', () => {
      this.homey.setTimeout(() => {
        this.log('Pairing aborted or finished');
        ((this.homey.app as unknown) as NSPanelApp).unsubscribeTopic('tasmota/discovery/#');
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
      const format = settings['mqtt_path'];
      const tele = format.replace('%prefix%', 'tele').replace('%topic%', settings['mqtt_topic']) + (format.slice(-1) === '/' ? '' : '/');
      const stat = format.replace('%prefix%', 'stat').replace('%topic%', settings['mqtt_topic']) + (format.slice(-1) === '/' ? '' : '/');

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

