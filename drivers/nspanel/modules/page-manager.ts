import type NSPanelDevice from '../device';
import { Page } from '../../../lib/page';
import { Weather } from '../../../lib/weather';
import { isMetChart } from '../../../lib/chart-source';
import { formatReading } from '../../../lib/bindings';
import { powerWatts, powerSpeed } from '../../../lib/power';
import type { StoredPage } from '../../../lib/panel/models';

export class PageManager {
  private device: NSPanelDevice;
  private viewRevision = 0;

  constructor(device: NSPanelDevice) {
    this.device = device;
  }

  private dev(): any {
    return this.device as any;
  }

  public initDefaultPage(): StoredPage {
    const dev = this.dev();
    if (!dev.pages) dev.pages = {};
    if (!dev.pages['active']) {
      dev.pages['active'] = {
        type: Page.Type.grid,
        title: 'Home',
        navigation: {
          leading: { target: 'screensaver' }
        },
        slots: {}
      };
    }
    const page = dev.pages['active'];
    if (Object.keys(page.slots).length === 0) {
      page.slots[1] = {
        type: Page.EntityType.switch,
        name: 'slot_1',
        binding: { source: 'relay', relay: 1 },
        title: 'Kytkin 1',
        icon: 'lightbulb',
        color: '#FFAA00',
        value: dev.switch1 ? '1' : '0'
      };
      page.slots[2] = {
        type: Page.EntityType.switch,
        name: 'slot_2',
        binding: { source: 'relay', relay: 2 },
        title: 'Kytkin 2',
        icon: 'power',
        color: '#2696A8',
        value: dev.switch2 ? '1' : '0'
      };
      page.slots[3] = {
        type: Page.EntityType.text,
        name: 'slot_3',
        binding: { source: 'internal' },
        title: 'Lämpötila',
        icon: 'thermometer',
        color: '#10B981',
        value: `${(dev.temp_current || 20.0).toFixed(1)} °C`
      };
      page.slots[4] = {
        type: Page.EntityType.button,
        name: 'screensaver',
        title: 'Kello',
        icon: 'clock-outline',
        color: '#94A3B8',
        value: ''
      };
    }
    return page;
  }

  public getOrCreatePage(pageId: string, type: Page.Type): StoredPage {
    const dev = this.dev();
    if (!dev.pages[pageId]) {
      dev.pages[pageId] = {
        type: type,
        title: 'NSPanel',
        slots: {}
      };
    }
    return dev.pages[pageId];
  }

  public async savePages(): Promise<void> {
    const dev = this.dev();
    try {
      await dev.setStoreValue('pages', dev.pages);
      await dev.refreshBindings();
      await dev.refreshWeatherSource();
      dev.log(`Saved ${Object.keys(dev.pages).length} pages to persistent store`);
    } catch (err) {
      throw err;
    }
  }

  public updateDefaultPageSlots(): void {
    /* Bound slots resolve live values during render. */
  }

  public isCurrentPage(pageId: string, page: StoredPage): boolean {
    const dev = this.dev();
    if (dev.currentPageId === pageId) return true;
    if (!dev.currentPageId && pageId === 'active') return true;
    const cur = dev.pages[dev.currentPageId];
    return cur === page;
  }

  public showScreensaver(): void {
    const dev = this.dev();
    dev.log('Activating screensaver/clock screen');
    // Clear any pending notification timeout so it doesn't fire during screensaver
    if (dev.notificationTimeoutTimer !== undefined) {
      dev.homey.clearTimeout(dev.notificationTimeoutTimer);
      dev.notificationTimeoutTimer = undefined;
    }
    dev.clearPopupEntities();
    dev.popupActive = false;
    const revision = this.viewRevision;
    if (!dev.screensaverActive) {
      dev.homey.setTimeout(() => {
        if (revision !== this.viewRevision) return;
        dev.enterScreensaverTrigger?.trigger(dev, {}, {}).catch((err: Error) => dev.error('enterScreensaver trigger failed:', err));
      }, 150);
    }
    dev.screensaverActive = true;
    dev.currentPageType = Page.Type.screensaver;
    dev.currentHmiScreen = 'screensaver';
    dev.sendCmnd('CustomSend', 'pageType~screensaver');
    dev.updateBrightness();
    const theme = Page.ColorTheme(Page.Type.screensaver);
    if (theme) dev.sendCmnd('CustomSend', theme);
    // Use the actual device methods through the typed reference, so a missing
    // method becomes a compilation error rather than a crash on the panel.
    dev.homey.setTimeout(() => {
      if (revision !== this.viewRevision || !dev.screensaverActive) return;
      this.device.weatherUpdate();
    }, 250);
    if (dev.statusIcon1.icon || dev.statusIcon2.icon) {
      dev.homey.setTimeout(() => {
        if (revision !== this.viewRevision || !dev.screensaverActive) return;
        this.device.sendStatusUpdate();
      }, 350);
    }
    dev.updateSleepTimer();
  }

  public async exitScreensaver(): Promise<void> {
    const dev = this.dev();
    if (!dev.screensaverActive) return;

    dev.screensaverActive = false;
    const revision = this.viewRevision;
    dev.homey.setTimeout(() => {
      if (revision !== this.viewRevision) return;
      dev.exitScreensaverTrigger?.trigger(dev, {}, {}).catch((err: Error) => dev.error('exitScreensaver trigger failed:', err));
    }, 150);

    const pageIds = Object.keys(dev.pages || {});
    if (pageIds.length === 0) {
      // No pages configured: stay on screensaver instead of creating a hidden default
      dev.screensaverActive = true;
      dev.log('[ExitScreensaver] No pages available, returning to screensaver');
      return;
    }

    const alarmEntry = Object.entries(dev.pages as Record<string, StoredPage>).find(([_, p]) => p.type === Page.Type.alarm);
    const wakeToAlarm = dev.getSetting('wake_to_alarm') !== false;

    let targetId = (dev.currentPageId && dev.pages[dev.currentPageId]) ? dev.currentPageId : 'active';
    if (!dev.pages[targetId]) {
      // Current home page was deleted; fall back to first available page
      targetId = pageIds[0];
      dev.log(`[ExitScreensaver] Target page missing, falling back to "${targetId}"`);
    }
    if (wakeToAlarm && alarmEntry) {
      targetId = alarmEntry[0];
    } else if (dev.alarmState && dev.alarmState !== 'disarmed' && alarmEntry) {
      targetId = alarmEntry[0];
    }

    const activePage = dev.pages[targetId];
    if (!activePage) {
      dev.screensaverActive = true;
      dev.log('[ExitScreensaver] Fallback page missing, returning to screensaver');
      return;
    }
    dev.currentPageId = targetId;
    this.updateDefaultPageSlots();
    await this.renderAndDisplayPage(activePage, true);

    dev.updateBrightness();
    dev.updateSleepTimer();
  }

  public async wakeScreen(): Promise<void> {
    const dev = this.dev();
    if (dev.screensaverActive) {
      await this.exitScreensaver();
    } else {
      dev.dimmed = false;
      dev.updateBrightness(false);
      dev.updateSleepTimer();
    }
  }

  public async navigateToPage(targetId: string, skipPinCheck: boolean = false): Promise<void> {
    const dev = this.dev();
    dev.log(`Navigating to page: "${targetId}" (skipPinCheck=${skipPinCheck})`);

    const lowerTarget = (targetId || '').toLowerCase().trim();

    if (lowerTarget === 'screensaver' || lowerTarget === 'clock' || lowerTarget === 'lepotila' || lowerTarget === 'kello') {
      this.showScreensaver();
      return;
    }

    if (lowerTarget === 'home' || lowerTarget === 'koti') {
      targetId = 'active';
    }

    if (dev.getSetting('disable_nav_when_armed') === true && dev.alarmState && dev.alarmState !== 'disarmed') {
      const alarmEntry = Object.entries(dev.pages as Record<string, StoredPage>).find(([_, p]) => p.type === Page.Type.alarm);
      const alarmTarget = alarmEntry ? alarmEntry[0] : undefined;
      if (alarmTarget && targetId !== alarmTarget && lowerTarget !== 'alarm' && lowerTarget !== 'cardalarm') {
        dev.log(`[Navigation] Navigation blocked to "${targetId}": Alarm is armed (${dev.alarmState})`);
        return;
      }
    }

    if (!skipPinCheck) {
      const candidateKey = dev.pages[targetId] ? targetId : Object.keys(dev.pages).find(k => k.toLowerCase() === lowerTarget);
      const targetPage = candidateKey ? dev.pages[candidateKey] : undefined;
      if (targetPage) {
        const targetOpts = typeof targetPage.rawOptions === 'string'
          ? (() => { try { return JSON.parse(targetPage.rawOptions); } catch { return {}; } })()
          : (targetPage.rawOptions || {});
        const pageRequiresPin = (targetPage.require_pin === true || (targetPage as any).pin_required === true || !!targetPage.pin || targetOpts.require_pin === true || targetOpts.pin_required === true || !!targetOpts.pin);
        if (pageRequiresPin) {
          const configuredPin = targetPage.pin || targetOpts.pin || dev.getSetting('global_pin') || dev.getSetting('alarm_pin') || '1234';
          dev.log(`[Navigation] Page "${candidateKey}" requires PIN unlock`);
          dev.pendingUnlock = {
            type: 'page',
            targetPageId: candidateKey,
            pin: configuredPin,
            returnPageId: dev.currentPageId
          };
          await this.showUnlockScreen(targetPage.title || 'PIN-koodi', `page_${candidateKey}`, configuredPin);
          return;
        }
      }
    }

    const showTarget = async (id: string, page: StoredPage): Promise<void> => {
      const previousId = dev.currentPageId;
      dev.currentPageId = id;
      try {
        await this.renderAndDisplayPage(page, true);
      } catch (error) {
        if (dev.currentPageId === id) dev.currentPageId = previousId;
        throw error;
      }
    };
    if (dev.pages[targetId]) {
      await showTarget(targetId, dev.pages[targetId]);
      return;
    }
    const foundKey = Object.keys(dev.pages).find(k => k.toLowerCase() === lowerTarget);
    if (foundKey && dev.pages[foundKey]) {
      await showTarget(foundKey, dev.pages[foundKey]);
      return;
    }
    const pType = Page.stringToPageType(targetId);
    if (pType !== undefined) {
      await showTarget(targetId, this.getOrCreatePage(targetId, pType));
      return;
    }
    dev.log(`Page "${targetId}" not found, falling back to active page.`);
    await showTarget('active', dev.pages['active'] || this.initDefaultPage());
  }

  public async showUnlockScreen(title: string, destination: string, pin: string, returnPageId?: string): Promise<void> {
    const dev = this.dev();
    dev.log(`[Unlock] Showing unlock screen: title="${title}", dest="${destination}"`);
    dev.clearPopupEntities();
    dev.popupActive = true;
    dev.returnPageAfterPopup = returnPageId || dev.currentPageId;
    const lang = (dev.homey.i18n.getLanguage() === 'fi') ? 'fi' : 'en';
    const cmd = Page.GenerateUnlock(title, destination, pin, undefined, lang);
    dev.currentHmiScreen = 'cardUnlock';
    dev.sendCmnd('CustomSend', 'page cardUnlock');
    dev.sendCmnd('CustomSend', cmd);
    dev.updateSleepTimer();
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
    this.viewRevision++;
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

  public async dismissNotification(targetPageId?: string): Promise<void> {
    const dev = this.dev();
    dev.popupActive = false;
    dev.commandNotification = false;
    if (dev.notificationTimeoutTimer) {
      dev.homey.clearTimeout(dev.notificationTimeoutTimer);
      dev.notificationTimeoutTimer = undefined;
    }

    const target = targetPageId || dev.returnPageAfterPopup || dev.currentPageId || 'active';
    dev.log(`[Popup Notification] Dismissing popup, returning to "${target}"`);

    dev.returnPageAfterPopup = undefined;

    if (target === 'screensaver' || target === 'clock' || target === 'lepotila' || target === 'kello') {
      this.showScreensaver();
      return;
    }

    const targetId = dev.pages[target] ? target : 'active';
    const page = dev.pages[targetId] || this.initDefaultPage();
    dev.currentPageId = targetId;
    dev.currentPageType = page.type;

    const transition = dev.setPage(page.type, true);
    const revision = this.viewRevision;
    await transition;
    dev.homey.setTimeout(() => {
      if (revision !== this.viewRevision || dev.popupActive || dev.screensaverActive || dev.currentPageId !== targetId) return;
      this.renderAndDisplayPage(page, false).catch(error => dev.error('Notification return failed:', error));
    }, 150);
  }

  public async renderAndDisplayPage(page: StoredPage, switchPageType: boolean = true): Promise<void> {
    const dev = this.dev();
    if (switchPageType && dev.screensaverActive) {
      dev.screensaverActive = false;
      dev.updateBrightness();
      dev.updateSleepTimer();
    }

    const settings = dev.getSettings();
    const disableNav = settings['disable_nav_when_armed'];
    const isArmed = dev.alarmState && dev.alarmState !== 'disarmed';

    const formatValueDecimals = (val: any): string => {
      if (val === undefined || val === null) return '';
      if (typeof val === 'number') {
        return parseFloat(val.toFixed(1)).toString();
      }
      if (typeof val === 'string') {
        return val.replace(/(\d+\.\d)\d+(\s*°?[CF]?)/g, '$1$2');
      }
      return String(val);
    };

    const entitiesList: Page.Entity[] = [];
    const maxSlots = page.type === Page.Type.grid2 ? 8 : (page.type === Page.Type.grid ? 6 : 4);

    for (let i = 1; i <= maxSlots; i++) {
      const forecastDay = page.rawOptions?.weatherForecast ? (dev.activeWeather() as any)?.[`day${i}`] : undefined;
      const configured = page.rawOptions?.weatherForecast ? (i <= 5 ? { type: 'text', name: `forecast_${i}`, title: forecastDay?.day || `+${i}`, icon: Weather.iconName(forecastDay?.type), color: 'white', value: typeof forecastDay?.temperature === 'number' ? `${(dev.homey.i18n.getUnits() === 'metric' ? forecastDay.temperature : forecastDay.temperature * 1.8 + 32).toFixed(1)} ${dev.homey.i18n.getUnits() === 'metric' ? '°C' : '°F'}` : '—' } : undefined) : (page.slots ? page.slots[i] : undefined);
      const s = configured ? { ...configured } : undefined;
      if (s?.binding && s.binding.source !== 'flow' && s.binding.source !== 'fixed') {
        s.value = formatReading(dev.readSource(s.binding), s.binding, dev.bindingService().unit(s.binding));
        delete s.val;
      }
      if (s) {
        entitiesList.push({
          type: (typeof s.type === 'string' ? Page.stringToEntityType(s.type) : s.type) || Page.EntityType.button,
          name: s.name || s.id || `slot_${i}`,
          id: s.id || s.name || `slot_${i}`,
          target: s.target || s.id || s.name,
          title: s.title || '',
          icon: s.icon || '',
          color: s.color || 'white',
          value: formatValueDecimals(s.val !== undefined ? s.val : (s.value !== undefined ? s.value : ''))
        });
      } else {
        entitiesList.push({ type: Page.EntityType.delete });
      }
    }

    let nav = page.navigation;
    if (disableNav && isArmed) {
      nav = undefined;
    }

    const pageDef: Page.PageDefinition = {
      id: dev.currentPageId || 'active',
      type: page.type,
      title: page.title,
      navigation: nav,
      entities: entitiesList
    };

    let command: string | undefined = undefined;
    if (page.type === Page.Type.grid) {
      command = Page.GenerateGrid(pageDef, false);
    } else if (page.type === Page.Type.grid2) {
      command = Page.GenerateGrid(pageDef, true);
    } else if (page.type === Page.Type.entities) {
      command = Page.GenerateEntities(pageDef);
    } else if (page.type === Page.Type.thermostat) {
      const rawObj = (typeof page.rawOptions === 'object' && page.rawOptions !== null) ? page.rawOptions : (() => { try { return JSON.parse(page.rawOptions as string || '{}'); } catch { return {}; } })();
      let curTemp = dev.temp_current;
      let setTemp = dev.temp_setpoint;
      if (rawObj?.binding?.source === 'homey' && rawObj.binding.deviceId) {
        const liveCur = dev.bindingService().value({ source: 'homey', deviceId: rawObj.binding.deviceId, capabilityId: 'measure_temperature' });
        const liveSet = dev.bindingService().value({ source: 'homey', deviceId: rawObj.binding.deviceId, capabilityId: 'target_temperature' });
        if (typeof liveCur === 'number') curTemp = liveCur;
        if (typeof liveSet === 'number') setTemp = liveSet;
      }
      const thermoOpts = typeof page.rawOptions === 'string' ? page.rawOptions : JSON.stringify({
        title: page.title,
        navigation: nav,
        ...(typeof page.rawOptions === 'object' ? page.rawOptions : {})
      });
      command = Page.GenerateThermo(
        thermoOpts,
        curTemp,
        setTemp,
        rawObj?.min ?? settings['temp_min'],
        rawObj?.max ?? settings['temp_max'],
        rawObj?.step ?? settings['temp_step'],
        dev.homey.i18n.getUnits() === 'metric'
      );
    } else if (page.type === Page.Type.media) {
      const rawObj = (typeof page.rawOptions === 'object' && page.rawOptions !== null) ? page.rawOptions : (() => { try { return JSON.parse(page.rawOptions as string || '{}'); } catch { return {}; } })();
      let dynamicMedia = rawObj?.media ? { ...rawObj.media } : {};
      let dynamicPaused = rawObj?.paused ?? false;
      let dynamicVolume = rawObj?.volume ?? 0;
      if (rawObj?.binding?.source === 'homey' && rawObj.binding.deviceId) {
        const playing = dev.bindingService().value({ source: 'homey', deviceId: rawObj.binding.deviceId, capabilityId: 'speaker_playing' });
        const track = dev.bindingService().value({ source: 'homey', deviceId: rawObj.binding.deviceId, capabilityId: 'speaker_track' });
        const artist = dev.bindingService().value({ source: 'homey', deviceId: rawObj.binding.deviceId, capabilityId: 'speaker_artist' });
        const vol = dev.bindingService().value({ source: 'homey', deviceId: rawObj.binding.deviceId, capabilityId: 'volume_set' });
        if (typeof playing === 'boolean') dynamicPaused = !playing;
        if (track) dynamicMedia.title = String(track);
        if (artist) dynamicMedia.author = String(artist);
        if (typeof vol === 'number') dynamicVolume = Math.round(vol * 100);
      }
      const mediaOpts = JSON.stringify({
        title: page.title,
        navigation: nav,
        entities: entitiesList,
        ...(typeof page.rawOptions === 'object' ? page.rawOptions : {}),
        media: dynamicMedia,
        paused: dynamicPaused,
        volume: dynamicVolume
      });
      command = Page.GenerateMedia(mediaOpts);
    } else if (page.type === Page.Type.alarm) {
      const rawObj: any = (typeof page.rawOptions === 'object' && page.rawOptions !== null)
        ? page.rawOptions
        : (() => { try { return JSON.parse(page.rawOptions as string || '{}'); } catch { return {}; } })();

      if (rawObj?.binding?.source === 'homey' && rawObj.binding.deviceId) {
        const liveVal = dev.bindingService().value({
          source: 'homey',
          deviceId: rawObj.binding.deviceId,
          capabilityId: rawObj.binding.capabilityId || 'homealarm_state'
        });
        if (liveVal !== undefined && liveVal !== null) {
          let mapped = String(liveVal);
          if (mapped === 'armed') mapped = 'armed_away';
          else if (mapped === 'partially_armed') mapped = 'armed_home';
          rawObj.state = mapped;
          dev.alarmState = mapped;
        }
      }

      if (dev.alarmState) {
        rawObj.state = dev.alarmState;
      }

      const isArmed = dev.alarmState && dev.alarmState !== 'disarmed';
      if (isArmed) {
        nav = undefined;
        rawObj.navigation = undefined;
      }

      command = Page.GenerateAlarm(JSON.stringify({
        title: page.title,
        navigation: nav,
        ...rawObj
      }));
    } else if (page.type === Page.Type.qrcode) {
      const rawObj = (typeof page.rawOptions === 'object' && page.rawOptions !== null) ? page.rawOptions : {};
      const qrOpts = typeof page.rawOptions === 'string' ? page.rawOptions : JSON.stringify({
        title: page.title,
        qrcode: rawObj.qrcode || rawObj.text || page.title,
        navigation: nav,
        ...rawObj
      });
      command = Page.GenerateQRCode(qrOpts);
    } else if (page.type === Page.Type.power) {
      let pwrOpts: any;
      if (typeof page.rawOptions === 'string') {
        try {
          pwrOpts = JSON.parse(page.rawOptions);
        } catch {
          pwrOpts = {};
        }
      } else if (typeof page.rawOptions === 'object' && page.rawOptions !== null) {
        pwrOpts = { ...page.rawOptions };
      } else {
        pwrOpts = {};
      }
      pwrOpts.title = page.title;
      pwrOpts.navigation = nav;
      for (const node of [pwrOpts.home, ...(pwrOpts.nodes || [])]) {
        if (!node?.binding || node.binding.source !== 'homey') {
          if (node && (node.autoSpeed !== undefined || node.flowDirection)) node.speed = powerSpeed(powerWatts(node.consumption), node.autoSpeed ? undefined : Math.abs(node.speed || 0), node.flowDirection || 'auto');
          continue;
        }
        const value = dev.readSource(node.binding);
        node.consumption = typeof value === 'number' ? `${Math.abs(value).toFixed(1)} W` : '—';
        if (node !== pwrOpts.home) node.speed = typeof value !== 'number' ? 0 : powerSpeed(value, undefined, node.flowDirection || (node.binding.invert ? 'auto-inverted' : 'auto'));
      }
      command = Page.GeneratePower(pwrOpts);
    } else if (page.type === Page.Type.chart) {
      let chartOpts: any = typeof page.rawOptions === 'string'
        ? (() => { try { return JSON.parse(page.rawOptions as string); } catch { return {}; } })()
        : { ...(page.rawOptions || {}) };

      chartOpts.title = page.title || chartOpts.title || 'Chart';
      chartOpts.navigation = nav;

      if (isMetChart(chartOpts)) {
        chartOpts.yAxisLabel = chartOpts.yAxisLabel || chartOpts.unit || '°C';
        chartOpts.chartType = chartOpts.chartType || 'line';
        chartOpts.values = (dev.metHourly || []).map((point: any) => ({ value: point.value, label: point.label }));
        if (!chartOpts.values.length) chartOpts.title = `${page.title || 'Sääennuste'} – Ei tietoa`;
        else if (dev.weatherStatus.state === 'cached') chartOpts.title = `${page.title || 'Sääennuste'} – välimuisti`;
      } else if (chartOpts?.binding?.source === 'homey' && chartOpts.binding.deviceId) {
        chartOpts.values = [];
        const liveVal = dev.bindingService().value(chartOpts.binding);
        if (Array.isArray(liveVal)) {
          chartOpts.values = liveVal;
        } else if (typeof liveVal === 'string' && (liveVal.startsWith('[') || liveVal.includes(',') || liveVal.includes('~'))) {
          chartOpts.values = liveVal;
        } else {
          const histKey = `${chartOpts.binding.deviceId}:${chartOpts.binding.capabilityId}`;
          let history = dev.chartHistories.get(histKey);

          if (!history || history.length < 2) {
            try {
              const insights = await dev.bindingService().getInsightsHistory(chartOpts.binding.deviceId, chartOpts.binding.capabilityId, 24);
              if (insights && insights.length > 0) {
                const scale = typeof chartOpts.scale === 'number' ? chartOpts.scale :
                  (chartOpts.yAxisLabel === 'c/kWh' || chartOpts.yAxisLabel === '°C' || chartOpts.binding.capabilityId === 'measure_temperature' ? 10 : 1);
                history = insights.map((i: any) => ({
                  value: Math.round(i.value * scale),
                  timestamp: i.timestamp,
                  label: i.label
                }));
                dev.chartHistories.set(histKey, history);
              }
            } catch (err) {
              dev.error('[Chart] Insights lookup failed:', err);
            }
          }

          if (history && history.length > 0) {
            chartOpts.values = history.map((h: any) => ({
              value: h.value,
              label: h.label
            }));
          } else if (typeof liveVal === 'number') {
            const scale = typeof chartOpts.scale === 'number' ? chartOpts.scale : (chartOpts.yAxisLabel === 'c/kWh' || chartOpts.yAxisLabel === '°C' ? 10 : 1);
            chartOpts.values = [{ value: Math.round(liveVal * scale), label: `${new Date().getHours()}:00` }];
          }
        }

        if (!chartOpts.yAxisLabel && !chartOpts.unit) {
          if (chartOpts.binding.capabilityId === 'measure_temperature') {
            chartOpts.yAxisLabel = '°C';
          } else if (chartOpts.binding.capabilityId === 'measure_power') {
            chartOpts.yAxisLabel = 'W';
          } else if (chartOpts.binding.capabilityId === 'measure_humidity') {
            chartOpts.yAxisLabel = '%';
          } else if (chartOpts.binding.capabilityId === 'meter_power') {
            chartOpts.yAxisLabel = 'kWh';
          } else {
            chartOpts.yAxisLabel = dev.bindingService().unit(chartOpts.binding) || '';
          }
        }
      }

      command = Page.GenerateChart(chartOpts);
    }

    if (!command && page.type === Page.Type.weather) {
      const weather = dev.activeWeather?.() ?? undefined;
      const indoor = dev.bindings?.indoorVisible !== false
        ? dev.readSource?.(dev.bindings?.indoor, dev.indoorTemperature)
        : undefined;
      const metric = dev.homey.i18n.getUnits() === 'metric';
      let indoorDisplay: number | undefined;
      if (typeof indoor === 'number') {
        indoorDisplay = metric ? indoor : indoor * 1.8 + 32;
      }
      const unit = metric ? '°C' : '°F';
      command = Page.GenerateWeather(page.rawOptions, weather, indoorDisplay, unit, page.navigation);
    }

    if (command) {
      dev.currentOptions = command;
      const isLineChart = page.type === Page.Type.chart && (
        (typeof page.rawOptions === 'object' && (page.rawOptions?.chartType === 'line' || page.rawOptions?.type === 'line' || page.rawOptions?.type === 'cardLChart')) ||
        (typeof page.rawOptions === 'string' && (page.rawOptions.includes('"line"') || page.rawOptions.includes('"cardLChart"')))
      );
      const targetHmi = isLineChart ? 'cardLChart' : Page.pageTypeToHmiCommand(page.type).replace('pageType~', '');
      const hmiChanged = Boolean(dev.currentHmiScreen && dev.currentHmiScreen !== targetHmi);

      if (switchPageType || dev.currentPageType !== page.type || hmiChanged) {
        dev.currentHmiScreen = targetHmi;
        await dev.setPage(page.type, true);
        const revision = this.viewRevision;
        dev.homey.setTimeout(() => {
          if (revision !== this.viewRevision || dev.popupActive || dev.screensaverActive) return;
          dev.sendCmnd('CustomSend', command!);
        }, 100);
      } else {
        dev.sendCmnd('CustomSend', command);
      }
    }
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
    const dev = this.dev();
    dev.log(`[Popup Notification] Showing notification: heading="${heading}", text="${text}", timeout=${timeout}`);

    if (!dev.popupActive) {
      dev.returnPageAfterPopup = dev.screensaverActive ? 'screensaver' : dev.currentPageId;
    }

    dev.clearPopupEntities();
    if (dev.screensaverActive) {
      dev.screensaverActive = false;
      dev.updateBrightness();
    }
    dev.popupActive = true;
    dev.commandNotification = true;

    if (dev.notificationTimeoutTimer) {
      dev.homey.clearTimeout(dev.notificationTimeoutTimer);
      dev.notificationTimeoutTimer = undefined;
    }

    const cmd = Page.GenerateNotification(heading, text, buttonText, cancelText, 'white', 'white', timeout, entityId);

    dev.currentHmiScreen = 'popupNotify';
    dev.sendCmnd('CustomSend', 'page popupNotify');

    const revision = this.viewRevision;
    dev.homey.setTimeout(() => {
      if (revision !== this.viewRevision || dev.screensaverActive || !dev.popupActive || dev.currentHmiScreen !== 'popupNotify') return;
      dev.sendCmnd('CustomSend', cmd);
      dev.updateSleepTimer();
    }, 120);

    if (timeout > 0) {
      const timer = dev.homey.setTimeout(async () => {
        if (dev.notificationTimeoutTimer !== timer || revision !== this.viewRevision || !dev.popupActive || dev.currentHmiScreen !== 'popupNotify') return;
        dev.notificationTimeoutTimer = undefined;
        try {
          dev.log(`[Popup Notification] Timeout reached (${timeout}s), auto-dismissing`);
          await this.dismissNotification();
        } catch (err) {
          dev.error('Notification auto-dismiss failed:', err);
        }
      }, timeout * 1000);
      dev.notificationTimeoutTimer = timer;
    }
  }

  public async showAlarmPage(): Promise<void> {
    const dev = this.dev();
    const alarmEntry = Object.entries(dev.pages as Record<string, StoredPage>).find(([_, p]) => p.type === Page.Type.alarm);
    if (alarmEntry) {
      dev.currentPageId = alarmEntry[0];
      await this.renderAndDisplayPage(alarmEntry[1], true);
    }
  }

  public async setAlarmState(newState: string): Promise<void> {
    const dev = this.dev();
    dev.alarmState = newState;
    dev.log(`[Alarm] Alarm state set to "${newState}"`);

    const alarmEntry = Object.entries(dev.pages as Record<string, StoredPage>).find(([_, p]) => p.type === Page.Type.alarm);
    if (alarmEntry) {
      const alarmId = alarmEntry[0];
      const alarmPage = alarmEntry[1];

      const opts = typeof alarmPage.rawOptions === 'string'
        ? (() => { try { return JSON.parse(alarmPage.rawOptions); } catch { return {}; } })()
        : (alarmPage.rawOptions || {});
      opts.state = newState;
      alarmPage.rawOptions = JSON.stringify(opts);

      if (newState !== 'disarmed' && dev.currentPageId !== alarmId) {
        dev.currentPageId = alarmId;
        await this.renderAndDisplayPage(alarmPage, true);
      } else if (dev.currentPageId === alarmId) {
        await this.renderAndDisplayPage(alarmPage, true);
      }
    }

    if (newState === 'triggered') {
      await this.wakeScreen();
      dev.playBuzzer(10, 2, 2);
    }

    if (dev.checkNightMode) dev.checkNightMode();
  }

  public async handleAlarmAction(action: string, pin?: string): Promise<void> {
    const dev = this.dev();
    dev.log(`[Alarm Action] Action: "${action}", PIN: "${pin ? '****' : '(none)'}"`);
    const alarmEntry = Object.entries(dev.pages as Record<string, StoredPage>).find(([_, p]) => p.type === Page.Type.alarm);
    const alarmPage = alarmEntry ? alarmEntry[1] : undefined;
    const opts = typeof alarmPage?.rawOptions === 'string'
      ? (() => { try { return JSON.parse(alarmPage.rawOptions); } catch { return {}; } })()
      : (alarmPage?.rawOptions || {});

    const configuredPin = opts.pin || dev.getSetting('alarm_pin');
    const pinRequired = opts.pin_required !== false;
    const pinForArm = !!opts.pin_for_arm;

    if (action === 'disarm') {
      if (pinRequired && configuredPin) {
        if (pin !== configuredPin) {
          dev.log('[Alarm Action] Disarm rejected: Invalid PIN');
          dev.playBuzzer(2, 2, 1);
          dev.alarmPinFailedTrigger?.trigger(dev, { entered_pin: pin || '' }, {}).catch(dev.error);
          return;
        }
      }

      dev.log('[Alarm Action] Disarm accepted');

      if (opts.binding?.source === 'homey' && opts.binding.deviceId) {
        await dev.setBoundValue(
          opts.binding.deviceId,
          opts.binding.capabilityId || 'homealarm_state',
          'disarmed'
        );
      }

      dev.playBuzzer(1, 1, 1);
      dev.alarmState = 'disarmed';
      if (alarmPage) {
        opts.state = 'disarmed';
        alarmPage.rawOptions = JSON.stringify(opts);
        await this.renderAndDisplayPage(alarmPage, true);
      }

      dev.alarmActionTriggeredTrigger?.trigger(dev, { action: 'disarm', pin: pin || '' }, {}).catch(dev.error);
      if (dev.checkNightMode) dev.checkNightMode();
      return;
    }

    if (action === 'arm_home' || action === 'arm_away' || action === 'arm_night') {
      if (pinForArm && configuredPin) {
        if (pin !== configuredPin) {
          dev.log('[Alarm Action] Arming rejected: Invalid PIN');
          dev.playBuzzer(2, 2, 1);
          dev.alarmPinFailedTrigger?.trigger(dev, { entered_pin: pin || '' }, {}).catch(dev.error);
          return;
        }
      }

      dev.log(`[Alarm Action] Arming accepted: ${action}`);

      if (opts.binding?.source === 'homey' && opts.binding.deviceId) {
        const homeyState = action === 'arm_away' ? 'armed' : 'partially_armed';
        await dev.setBoundValue(
          opts.binding.deviceId,
          opts.binding.capabilityId || 'homealarm_state',
          homeyState
        );
      }

      dev.playBuzzer(1, 1, 1);
      dev.alarmState = action;
      if (alarmPage) {
        opts.state = action;
        alarmPage.rawOptions = JSON.stringify(opts);
        await this.renderAndDisplayPage(alarmPage, true);
      }

      dev.alarmActionTriggeredTrigger?.trigger(dev, { action, pin: pin || '' }, {}).catch(dev.error);
      if (dev.checkNightMode) dev.checkNightMode();
      return;
    }

    dev.alarmActionTriggeredTrigger?.trigger(dev, { action, pin: pin || '' }, {}).catch(dev.error);
  }

  public async onAlarmCapabilityChanged(val: string): Promise<void> {
    const dev = this.dev();
    dev.log(`[Alarm Binding] Alarm capability changed to "${val}"`);
    let mappedState = val;
    if (val === 'armed') mappedState = 'armed_away';
    else if (val === 'partially_armed') mappedState = 'armed_home';

    await this.setAlarmState(mappedState);
  }
}
