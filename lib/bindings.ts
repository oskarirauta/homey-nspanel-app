/** Studio configuration is persistent; live readings stay in the service cache. */
export interface Binding {
  source: 'homey' | 'internal' | 'forecast' | 'flow' | 'fixed' | 'relay' | 'navigate';
  deviceId?: string;
  capabilityId?: string;
  action?: 'toggle' | 'on' | 'off' | 'press';
  relay?: number;
  target?: string;
  value?: number | string | boolean;
  invert?: boolean;
  deviceName?: string;
  relatedCapabilities?: string[];
}
export interface PanelBindings {
  weather?: import('./met-weather').WeatherSource;
  indoor: Binding;
  outdoor: Binding;
  indoorVisible?: boolean;
  outdoorVisible?: boolean;
  buttons: { [key: string]: Binding };
}
export function validateBinding(b: Binding): void {
  if (!b || !['homey', 'internal', 'forecast', 'flow', 'fixed', 'relay', 'navigate'].includes(b.source)) throw new Error('Invalid source');
  if (b.source === 'homey' && (!b.deviceId || !b.capabilityId)) throw new Error('Select device and capability');
  if (b.action && !['toggle', 'on', 'off', 'press'].includes(b.action)) throw new Error('Invalid action');
  if (b.source === 'relay' && b.relay !== 1 && b.relay !== 2) throw new Error('Invalid relay');
}
export function readBinding(b: Binding, values: { internal?: any; flow?: any; forecast?: any; homey: (b: Binding) => any; relay: (n: number) => any }): any {
  let value: any;
  if (b.source === 'homey') value = values.homey(b);
  else if (b.source === 'internal') value = values.internal;
  else if (b.source === 'forecast') value = values.forecast;
  else if (b.source === 'flow') value = values.flow;
  else if (b.source === 'fixed') value = b.value;
  else if (b.source === 'relay') value = values.relay(b.relay!);
  return value === null || (typeof value === 'number' && !Number.isFinite(value)) ? undefined : value;
}
export function formatReading(value: any, b: Binding, unit = ''): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'number') return `${Math.round(value * 10) / 10}${unit ? ' ' + unit : b.source === 'internal' ? ' °C' : ''}`;
  return String(value);
}
interface Watched { device: any; instance: any; value: any; listeners: Set<() => void>; cleanup?: () => void; }
export class BindingService {
  private apiPromise?: Promise<any>;
  private entries = new Map<string, Watched>();
  private pending = new Map<string, Promise<Watched>>();
  private commands = new Map<string, Promise<any>>();
  constructor(private homey: () => any) {}
  private key(b: Binding) { return JSON.stringify([b.deviceId, b.capabilityId]); }
  async api(): Promise<any> {
    if (!this.apiPromise) this.apiPromise = require('homey-api').HomeyAPI.createAppAPI({ homey: this.homey() }).catch((e: any) => { this.apiPromise = undefined; throw e; });
    return this.apiPromise;
  }
  async list(): Promise<any[]> {
    const api = await this.api();
    const [devices, zones] = await Promise.all([api.devices.getDevices(), api.zones.getZones()]);
    return Object.values(devices).map((d: any) => ({
      id: d.id, name: d.name, zone: zones[d.zone]?.name || '', class: d.class,
      available: d.available !== false,
      capabilities: Object.entries(d.capabilitiesObj || {}).map(([id, c]: [string, any]) => ({ id, title: c.title || id, type: c.type, units: c.units || '', getable: c.getable, setable: c.setable, value: c.value, values: c.values })),
      suggestedIcon: d.class === 'light' ? 'lightbulb' : d.class === 'fan' ? 'fan' : d.class === 'sensor' ? 'thermometer' : d.class === 'thermostat' ? 'radiator' : (d.class === 'media' || d.class === 'speaker') ? 'music' : 'power'
    }));
  }
  capability(b: Binding, id: string): any {
    for(const entry of this.entries.values())if(entry.device.id===b.deviceId)return entry.device.capabilitiesObj?.[id];
    return undefined;
  }
  async capabilities(deviceId: string): Promise<Record<string, any>> {const api=await this.api();const device=await api.devices.getDevice({id:deviceId});return device.capabilitiesObj || {};}
  value(b: Binding): any { const e = this.entries.get(this.key(b)); return e?.device.available === false ? undefined : e?.value; }
  unit(b: Binding): string { return this.entries.get(this.key(b))?.device.capabilitiesObj?.[b.capabilityId!]?.units || ''; }
  async watch(b: Binding, listener: () => void): Promise<() => void> {
    validateBinding(b);
    const key = this.key(b);
    let entry = this.entries.get(key);
    if (!entry) {
      let pending = this.pending.get(key);
      if (!pending) {
        pending = (async () => {
          const api = await this.api();
          const device = await api.devices.getDevice({ id: b.deviceId });
          if (!device.capabilitiesObj?.[b.capabilityId!]) throw new Error('Capability no longer exists');
          const e: Watched = { device, instance: undefined, value: device.capabilitiesObj[b.capabilityId!].value, listeners: new Set() };
          let instance:any;
          instance = device.makeCapabilityInstance(b.capabilityId, (value: any) => { if (e.instance !== instance) return; e.value = value; e.listeners.forEach(fn => fn()); });
          e.instance = instance;
          const changed = () => e.listeners.forEach(fn => fn());
          const deleted = () => { e.value = undefined; changed(); };
          device.on?.('update', changed); device.on?.('delete', deleted);
          e.cleanup = () => { device.removeListener?.('update', changed); device.removeListener?.('delete', deleted); };
          this.entries.set(key, e);
          return e;
        })();
        this.pending.set(key, pending);
      }
      try { entry = await pending; } finally { this.pending.delete(key); }
    }
    entry.listeners.add(listener);
    const watched = entry;
    return () => {
      watched.listeners.delete(listener);
      if (!watched.listeners.size && this.entries.get(key) === watched) {
        watched.cleanup?.(); watched.instance?.destroy(); this.entries.delete(key);
      }
    };
  }
  private async refreshAfterFailure(deviceId:string, failedCapability:string):Promise<void> {
    try {
      const api=await this.api();
      const device=await api.devices.getDevice({id:deviceId});
      for(const [key,entry] of this.entries){
        const [id,capabilityId]=JSON.parse(key);
        if(id!==deviceId || capabilityId!==failedCapability)continue;
        const cap=device.capabilitiesObj?.[capabilityId];
        // Create the replacement first: failed refresh must keep the old subscription alive.
        let instance:any;
        instance=cap ? device.makeCapabilityInstance(capabilityId, (value:any) => {
          if (entry.instance !== instance) return;
          entry.value=value;
          entry.listeners.forEach(listener=>listener());
        }) : undefined;
        entry.cleanup?.();
        entry.instance?.destroy?.();
        const changed = () => entry.listeners.forEach(fn => fn());
        const deleted = () => { entry.value = undefined; changed(); };
        device.on?.('update', changed); device.on?.('delete', deleted);
        entry.cleanup = () => { device.removeListener?.('update', changed); device.removeListener?.('delete', deleted); };
        entry.instance=instance;
        entry.value=device.available===false?undefined:cap?.value;
        entry.device=device;
        entry.listeners.forEach(listener=>listener());
      }
    }catch(err) {
      // Keep the last confirmed reading when Homey cannot be reached, but log unexpected errors
      if ((err as any)?.code !== 'ENOTFOUND' && (err as any)?.code !== 'ECONNREFUSED') {
        console.error('BindingService.refreshAfterFailure error:', err);
      }
    }
  }
  async set(deviceId: string, capabilityId: string, value: any): Promise<void> {
    const key = JSON.stringify([deviceId, capabilityId]);
    const previous = this.commands.get(key) || Promise.resolve();
    const command = previous.catch(() => {}).then(async () => {
      const api = await this.api();
      const device = await api.devices.getDevice({ id: deviceId });
      const cap = device.capabilitiesObj?.[capabilityId];
      if (!cap || cap.setable === false || device.available === false) { await this.refreshAfterFailure(deviceId,capabilityId);throw new Error('Device or capability unavailable'); }
      try { await device.setCapabilityValue({ capabilityId, value }); }
      catch(error) { await this.refreshAfterFailure(deviceId,capabilityId);throw error; }
      const entry = this.entries.get(key);
      if (entry) { entry.value = value; entry.listeners.forEach(fn => fn()); }
    }).catch((err) => {
      // Ensure the chain entry is always cleaned up even on unexpected errors
      if (this.commands.get(key) === command) this.commands.delete(key);
      throw err;
    });
    this.commands.set(key, command);
    try { await command; } finally { if (this.commands.get(key) === command) this.commands.delete(key); }
  }
  async control(b: Binding, desired?: boolean): Promise<void> {
    validateBinding(b);
    const key = this.key(b);
    const previous = this.commands.get(key) || Promise.resolve();
    const command = previous.catch(() => {}).then(async () => {
      const api = await this.api();
      const device = await api.devices.getDevice({ id: b.deviceId });
      const cap = device.capabilitiesObj?.[b.capabilityId!];
      if (!cap || cap.setable === false || device.available === false) { await this.refreshAfterFailure(b.deviceId!,b.capabilityId!);throw new Error('Device or capability unavailable'); }
      let value: any;
      if (b.action === 'press') {
        if (cap.type !== 'boolean' || cap.getable !== false) throw new Error('Select a momentary button capability');
        value = true;
      } else {
        if (cap.type !== 'boolean') throw new Error('Select a boolean switch capability');
        const current = this.entries.get(key)?.value ?? cap.value;
        if (desired !== undefined && b.action === 'toggle') value = desired;
        else if (b.action === 'on') value = true;
        else if (b.action === 'off') value = false;
        else if (b.action === 'toggle') { if (typeof current !== 'boolean') throw new Error('Switch state unknown'); value = !current; }
        else throw new Error('Select an action');
      }
      try { await device.setCapabilityValue({ capabilityId: b.capabilityId, value }); }
      catch(error) { await this.refreshAfterFailure(b.deviceId!,b.capabilityId!);throw error; }
      const entry = this.entries.get(key);
      if (entry && b.action !== 'press') { entry.value = value; entry.listeners.forEach(fn => fn()); }
    }).catch((err) => {
      // Ensure the chain entry is always cleaned up even on unexpected errors
      if (this.commands.get(key) === command) this.commands.delete(key);
      throw err;
    });
    this.commands.set(key, command);
    try { await command; } finally { if (this.commands.get(key) === command) this.commands.delete(key); }
  }
  async getInsightsHistory(deviceId: string, capabilityId: string, hours = 24): Promise<{ value: number; timestamp: number; label?: string }[]> {
    try {
      const api = await this.api();
      if (!api.insights) return [];
      const logs = await api.insights.getLogs();
      const targetUri = `homey:device:${deviceId}`;
      const log = Object.values(logs).find((l: any) => 
        (l.ownerUri === targetUri || l.uri === targetUri || l.id?.includes(deviceId)) && 
        (l.id?.endsWith(`:${capabilityId}`) || l.name === capabilityId || l.id === `${targetUri}:${capabilityId}`)
      );
      if (!log) return [];

      const entries = await api.insights.getLogEntries({
        id: (log as any).id,
        resolution: hours <= 6 ? 'last6Hours' : (hours <= 24 ? 'today' : 'last7Days')
      });

      const values = entries?.values || entries;
      if (!Array.isArray(values) || !values.length) return [];

      const cutoff = Date.now() - hours * 3600000;
      const recent = values.filter((e: any) => {
        const t = typeof e.t === 'number' ? e.t : Date.parse(e.t || e.date);
        const v = typeof e.v === 'number' ? e.v : e.value;
        return Number.isFinite(t) && t >= cutoff && typeof v === 'number' && Number.isFinite(v);
      });

      return recent.map((e: any, index: number) => {
        const t = typeof e.t === 'number' ? e.t : Date.parse(e.t || e.date);
        const v = typeof e.v === 'number' ? e.v : e.value;
        const dt = new Date(t);
        const hr = dt.getHours();
        const label = (index === 0 || index === recent.length - 1 || hr % 4 === 0) ? `${hr < 10 ? '0' : ''}${hr}:00` : undefined;
        return {
          value: v,
          timestamp: t,
          label
        };
      });
    } catch {
      return [];
    }
  }
}
