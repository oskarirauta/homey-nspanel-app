import type { NSPanelDevice } from "../device";
import { Binding, PanelBindings, readBinding, validateBinding } from "../../../lib/bindings";
import { Weather } from "../../../lib/weather";
import { Page } from "../../../lib/page";
import { isMetChart } from "../../../lib/chart-source";
import { MetHourlyPoint } from "../../../lib/met-weather";
import { NSPanelApp } from "../../../app";

export class BindingManager {
  private device: NSPanelDevice;
  public weatherDispose?: () => void;
  public metWeather?: Weather.Forecast;
  public metHourly?: MetHourlyPoint[];
  public weatherStatus?: { state: string; updatedAt?: any; error?: string };

  public bindingDisposers: Array<() => void> = [];
  public bindingRenderTimer?: NodeJS.Timeout;
  public bindingsStopped = false;
  public bindingGeneration = 0;
  public bindingRetryTimer?: NodeJS.Timeout;

  constructor(device: NSPanelDevice) {
    this.device = device;
  }

  public activeWeather(): Weather.Forecast | undefined {
    return this.device.bindings?.weather?.source === 'none'
      ? undefined
      : this.device.bindings?.weather?.source === 'met'
        ? this.metWeather
        : this.device.weather;
  }

  public async refreshWeatherSource(): Promise<void> {
    const usesChart = Object.values(this.device.pages || {}).some(
      page => page.type === Page.Type.chart && isMetChart(typeof page.rawOptions === 'string' ? (() => { try { return JSON.parse(page.rawOptions); } catch { return {}; } })() : page.rawOptions)
    );
    const needed = this.device.bindings?.weather?.source === 'met' || usesChart;
    if (!needed) {
      this.weatherDispose?.();
      this.weatherDispose = undefined;
      this.metWeather = undefined;
      this.metHourly = undefined;
      this.weatherStatus = { state: 'flow' };
      this.scheduleBindingRender();
      return;
    }
    if (this.weatherDispose || this.bindingsStopped) return;
    this.weatherDispose = ((this.device.homey.app as unknown) as NSPanelApp).globalWeather.subscribe(
      this.device,
      snapshot => {
        const forecast = snapshot.forecast;
        this.metWeather = forecast
          ? { day0: forecast.current, day1: forecast.days[0], day2: forecast.days[1], day3: forecast.days[2], day4: forecast.days[3], day5: forecast.days[4] }
          : undefined;
        this.metHourly = snapshot.hourly;
        this.weatherStatus = { state: snapshot.state, updatedAt: snapshot.updatedAt, error: snapshot.error };
        this.scheduleBindingRender();
      },
      this.device.bindings.weather
    );
  }

  public bindingService() {
    return ((this.device.homey.app as unknown) as NSPanelApp).bindingService;
  }

  public readSource(binding: Binding, flowValue?: any): any {
    return readBinding(binding, {
      internal: this.device.temp_current,
      flow: flowValue,
      forecast: this.activeWeather()?.day0?.temperature,
      homey: b => this.bindingService().value(b),
      relay: n => n === 1 ? this.device.switch1 : this.device.switch2
    });
  }

  public disposeBindings() {
    this.bindingDisposers.splice(0).forEach(dispose => dispose());
  }

  public scheduleBindingRender() {
    if (this.bindingsStopped || this.bindingRenderTimer) return;
    this.bindingRenderTimer = this.device.homey.setTimeout(() => {
      this.bindingRenderTimer = undefined;
      if ((this.device as any).panelInteractions?.active) return;
      if (this.device.popupActive) {
        if (this.device.activeFanEntity) this.device.sendBoundFanUpdate(this.device.activeFanEntity);
        if (this.device.activeSelectEntity) this.device.sendBoundSelectUpdate(this.device.activeSelectEntity);
        if (this.device.activeLightEntity) void this.device.openLightPopup(this.device.activeLightEntity, undefined, false).catch(this.device.error);
        else if (this.device.activeShutterEntity) void this.device.openShutterPopup(this.device.activeShutterEntity, undefined, false).catch(this.device.error);
        else if (this.device.activeThermoEntity) void this.device.openThermoPopup(this.device.activeThermoEntity, undefined, false).catch(this.device.error);
        return;
      }
      if (this.device.screensaverActive) this.device.weatherUpdate();
      else if (this.device.pages[this.device.currentPageId]) this.device.renderAndDisplayPage(this.device.pages[this.device.currentPageId], false).catch(this.device.error);
    }, 150);
  }

  public async refreshBindings() {
    const generation = ++this.bindingGeneration;
    if (this.bindingRetryTimer) {
      this.device.homey.clearTimeout(this.bindingRetryTimer);
      this.bindingRetryTimer = undefined;
    }
    this.disposeBindings();
    let failed = false;
    const capabilityRequests = new Map<string, Promise<Record<string, any>>>();
    const bindings: Binding[] = [
      this.device.bindings.indoor,
      this.device.bindings.outdoor,
      ...Object.values(this.device.bindings.buttons || {})
    ];

    for (const page of Object.values(this.device.pages || {})) {
      bindings.push(...Object.values(page.slots || {}).map((slot: any) => slot.binding).filter(Boolean));
      for (const slot of Object.values(page.slots || {}) as any[]) {
        if (['fan', 'light', 'shutter'].includes(slot.type) && slot.binding?.source === 'homey') {
          const fallback = slot.type === 'light'
            ? ['onoff', 'dim', 'light_temperature', 'light_hue', 'light_saturation', 'light_mode']
            : slot.type === 'shutter'
              ? ['windowcoverings_set', 'windowcoverings_tilt_set', 'windowcoverings_state']
              : ['onoff', 'dim'];
          try {
            if (!capabilityRequests.has(slot.binding.deviceId)) {
              capabilityRequests.set(slot.binding.deviceId, this.bindingService().capabilities(slot.binding.deviceId));
            }
            const caps = await capabilityRequests.get(slot.binding.deviceId)!;
            for (const capabilityId of fallback.filter(id => caps[id])) {
              bindings.push({ ...slot.binding, capabilityId });
            }
          } catch (err) {
            failed = true;
            this.device.error('Related capabilities unavailable:', err);
          }
        }
      }
      const opts = typeof page.rawOptions === 'string' ? (() => { try { return JSON.parse(page.rawOptions); } catch { return {}; } })() : page.rawOptions;
      if (opts) {
        bindings.push(...[opts.home, ...(opts.nodes || [])].map(n => n?.binding).filter(Boolean));
        if (opts.binding?.source === 'homey' && opts.binding.deviceId) {
          if (page.type === Page.Type.thermostat) {
            bindings.push({ source: 'homey', deviceId: opts.binding.deviceId, capabilityId: 'target_temperature' });
            bindings.push({ source: 'homey', deviceId: opts.binding.deviceId, capabilityId: 'measure_temperature' });
            try {
              if (!capabilityRequests.has(opts.binding.deviceId)) {
                capabilityRequests.set(opts.binding.deviceId, this.bindingService().capabilities(opts.binding.deviceId));
              }
              const caps = await capabilityRequests.get(opts.binding.deviceId)!;
              if (caps.thermostat_mode) bindings.push({ source: 'homey', deviceId: opts.binding.deviceId, capabilityId: 'thermostat_mode' });
            } catch (err) {
              failed = true;
              this.device.error('Thermostat mode unavailable:', err);
            }
          } else if (page.type === Page.Type.media) {
            bindings.push({ source: 'homey', deviceId: opts.binding.deviceId, capabilityId: 'speaker_playing' });
            bindings.push({ source: 'homey', deviceId: opts.binding.deviceId, capabilityId: 'speaker_track' });
            bindings.push({ source: 'homey', deviceId: opts.binding.deviceId, capabilityId: 'speaker_artist' });
            bindings.push({ source: 'homey', deviceId: opts.binding.deviceId, capabilityId: 'volume_set' });
          } else if (page.type === Page.Type.alarm) {
            bindings.push({ source: 'homey', deviceId: opts.binding.deviceId, capabilityId: opts.binding.capabilityId || 'homealarm_state' });
          } else {
            bindings.push(opts.binding);
          }
        }
      }
    }

    const seenBindings = new Set<string>();
    for (const binding of bindings) {
      if (binding.source === 'homey') {
        const watchKey = JSON.stringify([binding.deviceId, binding.capabilityId]);
        if (seenBindings.has(watchKey)) continue;
        seenBindings.add(watchKey);
        try {
          const dispose = await this.bindingService().watch(binding, () => {
            for (const page of Object.values(this.device.pages || {})) {
              if (page.type === Page.Type.chart) {
                const opts = typeof page.rawOptions === 'string' ? (() => { try { return JSON.parse(page.rawOptions); } catch { return {}; } })() : page.rawOptions;
                if (opts?.binding?.source === 'homey' && opts.binding.deviceId === binding.deviceId && opts.binding.capabilityId === binding.capabilityId) {
                  const histKey = `${binding.deviceId}:${binding.capabilityId}`;
                  const liveNum = this.bindingService().value(binding);
                  if (typeof liveNum === 'number') {
                    const scale = typeof opts.scale === 'number' ? opts.scale : (opts.yAxisLabel === 'c/kWh' || opts.yAxisLabel === '°C' ? 10 : 1);
                    this.device.updateChartHistory(histKey, liveNum, scale);
                  }
                }
              } else if (page.type === Page.Type.alarm) {
                const opts = typeof page.rawOptions === 'string' ? (() => { try { return JSON.parse(page.rawOptions); } catch { return {}; } })() : page.rawOptions;
                if (opts?.binding?.source === 'homey' && opts.binding.deviceId === binding.deviceId) {
                  const liveVal = this.bindingService().value(binding);
                  if (liveVal !== undefined && liveVal !== null) {
                    this.device.onAlarmCapabilityChanged(String(liveVal)).catch(this.device.error);
                  }
                }
              }
            }
            this.scheduleBindingRender();
          });
          if (this.bindingsStopped || generation !== this.bindingGeneration) dispose();
          else this.bindingDisposers.push(dispose);
        } catch (err) {
          failed = true;
          this.device.error('Binding unavailable:', err);
        }
      }
    }

    if (failed && !this.bindingsStopped && generation === this.bindingGeneration) {
      this.bindingRetryTimer = this.device.homey.setTimeout(() => this.refreshBindings().catch(this.device.error), 30000);
    }
    this.scheduleBindingRender();
  }

  public buttonsNeedDecoupling(): boolean {
    return Object.entries(this.device.bindings?.buttons || {}).some(([key, b]) => b.source !== 'relay' || b.relay !== Number(key));
  }

  public async setBindings(bindings: PanelBindings): Promise<void> {
    for (const b of [bindings.indoor, bindings.outdoor, ...Object.values(bindings.buttons || {})]) validateBinding(b);
    if (!['internal', 'homey', 'flow'].includes(bindings.indoor.source) || !['forecast', 'homey', 'flow'].includes(bindings.outdoor.source)) throw new Error('Invalid temperature source');
    for (const b of [bindings.indoor, bindings.outdoor]) if (b.source === 'homey' && b.capabilityId?.split('.')[0] !== 'measure_temperature') throw new Error('Select a temperature capability');
    if (bindings.weather && !['flow', 'met', 'none'].includes(bindings.weather.source)) throw new Error('Invalid weather source');
    await this.device.setStoreValue('bindings', bindings);
    this.device.bindings = bindings;
    this.refreshWeatherSource().catch(this.device.error);
    await this.refreshBindings();
    const detached = this.buttonsNeedDecoupling();
    this.device.sendCmnd('SetOption73', detached || this.device.getSetting('decouple_buttons') ? '1' : '0');
    if (Object.keys(bindings.buttons || {}).length) this.device.sendCmnd('Rule2', '0');
  }

  public stopBindings() {
    this.bindingsStopped = true;
    this.weatherDispose?.();
    this.weatherDispose = undefined;
    if (this.bindingRetryTimer) this.device.homey.clearTimeout(this.bindingRetryTimer);
    this.disposeBindings();
    if (this.bindingRenderTimer) this.device.homey.clearTimeout(this.bindingRenderTimer);
  }
}
