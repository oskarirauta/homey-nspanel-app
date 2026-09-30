import Homey from 'homey';
import { NSPanelDevice } from './drivers/nspanel/device';
import { Icon } from './lib/icon';
import { Page } from './lib/page';
import { validateChartOptions } from './lib/chart-source';
import { validateBinding } from './lib/bindings';

module.exports = {
  async getGlobalWeather({homey}: {homey:any}) { return homey.app.globalWeather.getConfig(); },
  async setGlobalWeather({homey,body}: {homey:any;body:any}) { return homey.app.globalWeather.setConfig(body); },
  async getDevices({ homey }: { homey: any }) {
    try {
      const driver = homey.drivers.getDriver('nspanel');
      const devices = driver.getDevices() as unknown as NSPanelDevice[];

      return devices.map((d) => ({
        id: d.getData().id,
        name: d.getName(),
        available: d.getAvailable(),
        currentPage: d.currentPageType,
        pages: d.pages,
        bindings: d.bindings,
        weatherStatus: d.weatherStatus,
        settings: Object.fromEntries(Object.entries(d.getSettings()).filter(([key]) => key !== 'mqtt_password')),
        statusIcon1: d.statusIcon1,
        statusIcon2: d.statusIcon2
      }));
    } catch (err: any) {
      return [];
    }
  },

  async setDevicePage({ homey, params, body }: { homey: any; params: { id: string }; body: any }) {
    try {
      const driver = homey.drivers.getDriver('nspanel');
      const devices = driver.getDevices() as unknown as NSPanelDevice[];
      const device = devices.find((d) => d.getData().id === params.id);

      if (!device) {
        throw new Error('Device not found');
      }

      const pageType = Page.stringToPageType(body.type) || Page.Type.grid;
      const targetPageId = body.id || 'active';
      if (!/^[\w-]+$/.test(targetPageId) || ['__proto__', 'constructor', 'prototype'].includes(targetPageId)) throw new Error('Invalid page ID');
      for (const slot of Object.values(body.slots || {}) as any[]) if (slot.binding) validateBinding(slot.binding);
      const raw = typeof body.rawOptions === 'string' ? JSON.parse(body.rawOptions) : body.rawOptions;
      if (pageType === Page.Type.chart) {validateChartOptions(raw);body.rawOptions=raw;}
      else if (raw?.binding) validateBinding(raw.binding);
      for (const node of [raw?.home, ...(raw?.nodes || [])]) if (node?.binding) validateBinding(node.binding);

      const renameFrom=body.renameFrom;
      if(renameFrom) {
        if(!/^[\w-]+$/.test(renameFrom)||['active','screensaver','__proto__','constructor','prototype'].includes(renameFrom))throw new Error('Invalid original page ID');
        if(renameFrom!==targetPageId && device.pages[renameFrom] && device.pages[targetPageId])throw new Error('Page ID already exists');
        if(!device.pages[renameFrom] && !device.pages[targetPageId])throw new Error('Original page not found');
        if(device.pages[renameFrom] && renameFrom!==targetPageId) {
          device.pages[targetPageId]=device.pages[renameFrom];delete device.pages[renameFrom];
          if(device.currentPageId===renameFrom)device.currentPageId=targetPageId;
        }
      }

      if (!device.pages[targetPageId]) {
        device.pages[targetPageId] = {
          type: pageType,
          title: body.title || 'Page',
          slots: {}
        };
      }

      const p = device.pages[targetPageId];
      p.type = pageType;
      if(Number.isFinite(body.order))p.order=body.order;
      for(const key of ['require_pin','pin'] as const){if(Object.prototype.hasOwnProperty.call(body,key))p[key]=body[key];else delete p[key];}
      delete (p as any).pin_required;
      p.title = body.title || p.title;
      if (body.navigation) p.navigation = body.navigation;

      if (body.slots && typeof body.slots === 'object') {
        p.slots = body.slots;
      }
      if (body.rawOptions) {
        p.rawOptions = body.rawOptions;
      }

      if(renameFrom) {
          for(const page of Object.values(device.pages)) {
            for(const side of ['leading','trailing'] as const)if(page.navigation?.[side]?.target===renameFrom)page.navigation![side]!.target=targetPageId;
            for(const slot of Object.values(page.slots||{}) as any[]) {
              if(slot.binding?.source==='navigate'&&slot.binding.target===renameFrom)slot.binding.target=targetPageId;
              if(slot.type==='navigate')for(const key of ['id','name','target'])if(slot[key]===renameFrom)slot[key]=targetPageId;
            }
          }
      }

      // Save to persistent storage
      await device.savePages();

      // If active page or switch requested, display it
      if (body.showNow !== false) {
        device.currentPageId = targetPageId;
        await device.renderAndDisplayPage(p, true);
      }

      return { success: true, page: p };
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update device page');
    }
  },

  async deleteDevicePage({ homey, params }: { homey: any; params: { id: string; pageId: string } }) {
    try {
      const driver = homey.drivers.getDriver('nspanel');
      const devices = driver.getDevices() as unknown as NSPanelDevice[];
      const device = devices.find((d) => d.getData().id === params.id);

      if (!device) {
        throw new Error('Device not found');
      }

      const page = device.pages[params.pageId];
      if (page) {
        if (Object.keys(device.pages).length <= 1) throw new Error('Cannot delete the last page');
        delete device.pages[params.pageId];
        try {
          await device.savePages();
        } catch (error) {
          device.pages[params.pageId] = page;
          throw error;
        }
        if (device.currentPageId === params.pageId) {
          device.currentPageId = Object.keys(device.pages)[0];
          await device.renderAndDisplayPage(device.pages[device.currentPageId], true);
        }
      }

      return { success: true };
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete device page');
    }
  },

  async getIcons({ homey, query }: { homey: any; query: { q?: string } }) {
    const q = (query?.q || '').toLowerCase().trim();
    const allKeys = Array.from(Icon.Names.keys());

    if (!q) {
      // Return a curated list of most common icons first
      const popular = [
        'lightbulb', 'lightbulb-outline', 'power', 'fan', 'air-conditioner',
        'home', 'home-outline', 'weather-sunny', 'weather-partly-cloudy',
        'weather-rainy', 'weather-snowy', 'thermometer', 'radiator',
        'music', 'play', 'pause', 'skip-next', 'skip-previous', 'volume-high',
        'lock', 'lock-open', 'shield', 'shield-check', 'shield-alert',
        'bell', 'alarm-light', 'television', 'sofa', 'bed', 'coffee',
        'water', 'solar-power', 'car-electric', 'battery', 'flash'
      ];
      return popular.filter((name) => Icon.Names.has(name));
    }

    // Filter matching icons, max 60 results
    const results: string[] = [];
    for (const name of allKeys) {
      if (name.includes(q)) {
        results.push(name);
        if (results.length >= 60) break;
      }
    }
    return results;
  },

  async testMqtt({ homey, body }: { homey: any; body: any }) {
    const { DirectMqttClient } = require('./lib/mqtt');
    return new Promise((resolve) => {
      const client = new DirectMqttClient((...args: any[]) => homey.app?.log('[TestMqttApi]', ...args));
      let finished = false;

      const timeout = setTimeout(() => {
        if (!finished) {
          finished = true;
          client.disconnect();
          resolve({ success: false, error: 'Connection timed out after 5s' });
        }
      }, 5000);

      client.on('connect', () => {
        if (!finished) {
          finished = true;
          clearTimeout(timeout);
          client.disconnect();
          resolve({ success: true });
        }
      });

      client.on('error', (err: any) => {
        if (!finished) {
          finished = true;
          clearTimeout(timeout);
          client.disconnect();
          resolve({ success: false, error: err.message || 'Connection failed' });
        }
      });

      client.connect({
        host: body.host,
        port: Number(body.port) || 1883,
        username: body.user || undefined,
        password: body.password || undefined,
        clientId: `homey_api_test_${Date.now()}`
      });
    });
  },

  async setDeviceSettings({ homey, params, body }: { homey: any; params: { id: string }; body: any }) {
    try {
      const driver = homey.drivers.getDriver('nspanel');
      const devices = driver.getDevices() as unknown as NSPanelDevice[];
      const device = devices.find((d) => d.getData().id === params.id);

      if (!device) {
        throw new Error('Device not found');
      }

      if (body.settings && typeof body.settings === 'object') {
        const oldSettings = device.getSettings();
        const newSettings = { ...oldSettings, ...body.settings };
        const changedKeys = Object.keys(body.settings).filter(key => oldSettings[key] !== body.settings[key]);
        await device.setSettings(body.settings);
        await device.onSettings({ oldSettings, newSettings, changedKeys });
      }

      if (body.bindings) await device.setBindings(body.bindings);

      if (body.statusIcon1 !== undefined || body.statusIcon2 !== undefined) {
        device.setStatusIcons(
          body.statusIcon1?.icon,
          body.statusIcon1?.color,
          body.statusIcon2?.icon,
          body.statusIcon2?.color
        );
      }

      if (body.showNow) {
        device.showScreensaver();
      }

      return {
        success: true,
        settings: Object.fromEntries(Object.entries(device.getSettings()).filter(([key]) => key !== 'mqtt_password')),
        bindings: device.bindings,
        statusIcon1: device.statusIcon1,
        statusIcon2: device.statusIcon2
      };
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update device settings');
    }
  },

  async getHomeyDevices({ homey }: { homey: any }) {
    return homey.app.bindingService.list();
  },
  async controlHomeyDevice({ homey, params, body }: { homey: any; params: { id: string }; body: any }) {
    await homey.app.bindingService.control({ source: 'homey', deviceId: params.id, capabilityId: body.capability || 'onoff', action: body.action || 'toggle' });
    return { success: true };
  }
};
